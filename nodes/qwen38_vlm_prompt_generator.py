"""
Duffy_Qwen38_VLM_PromptGenerator — ComfyUI V3 Custom Node for Qwen3.8-27B Vision-Language Prompt Generation.

Integrates Alibaba's dense multimodal Qwen3.8-27B GGUF model and its native vision
projector (mmproj) via JamePeng/llama-cpp-python (v0.4.5+cu130) with hardware-conscious
VRAM management tailored for 16 GB consumer GPUs (such as NVIDIA RTX 4060 Ti).

Supported capabilities:
  - Single-image, multi-frame video batch, and pure text-to-prompt generation
  - Native Multi-Token Prediction (MTP) speculative decoding (SpeculativeType.DRAFT_MTP)
  - Dynamic resolution token budgeting (image_min_tokens, image_max_tokens) with
    automatic batch frame scaling and Lanczos 1536px long-edge downscaling
  - Quantized KV cache (f16, q8_0, q4_0) with Flash Attention safety guard
  -Controllable <think>...</think> reasoning mode and token budget enforcement
"""

from __future__ import annotations

import base64
import gc
import hashlib
import io as std_io
import logging
import os
import re
import threading
import time
from typing import Any, Optional

import comfy.model_management
import folder_paths
import numpy as np
import torch
from comfy_api.latest import io
from PIL import Image

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants & Defaults
# ---------------------------------------------------------------------------

_EMPTY_MODEL_PLACEHOLDER = "(no .gguf models in models/LLM)"
_NONE_OPTION = "None"
_VRAM_PREFLIGHT_THRESHOLD_BYTES = int(13.5 * (1024 ** 3))  # 13.5 GB
_LANCZOS_MAX_LONG_EDGE = 1536
_LANCZOS_TRIGGER_EDGE = 2048
_LANCZOS_TOKEN_THRESHOLD = 2048

_DEFAULT_SYSTEM_PROMPT = (
    "You are an expert visual analyst and prompt engineer for state-of-the-art "
    "diffusion models. Analyze the provided visual input in extreme detail—covering "
    "subject anatomy, composition, lighting, color palette, lens characteristics, "
    "surface textures, atmosphere, and artistic style—and synthesize a cohesive, "
    "vivid, production-ready generation prompt. Output ONLY the final prompt text "
    "after your reasoning phase."
)

_DEFAULT_USER_PROMPT = (
    "Analyze this image and generate a highly detailed text-to-image prompt."
)

_UNCLOSED_THINK_WARNING = (
    "[Warning: Generation exhausted max_new_tokens inside <think> block before reaching "
    "the final prompt. Increase max_new_tokens, reduce reasoning_budget, or set "
    "thinking_mode to 'disable'.]"
)


# Standard ggml_type enum values in llama.cpp (F16=1, Q4_0=2, Q8_0=8)
_GGML_TYPE_F16 = 1
_GGML_TYPE_Q4_0 = 2
_GGML_TYPE_Q8_0 = 8
_KV_CACHE_TYPE_MAP: dict[str, int] = {
    "f16": _GGML_TYPE_F16,
    "q8_0": _GGML_TYPE_Q8_0,
    "q4_0": _GGML_TYPE_Q4_0,
}

# ---------------------------------------------------------------------------
# Folder Registration & Discovery Helpers
# ---------------------------------------------------------------------------

def _ensure_llm_folder_registered() -> str:
    """Register ``models/LLM`` with ComfyUI's ``folder_paths`` and return its path."""
    llm_dir = os.path.join(folder_paths.models_dir, "LLM")
    os.makedirs(llm_dir, exist_ok=True)
    if "LLM" not in folder_paths.folder_names_and_paths:
        folder_paths.folder_names_and_paths["LLM"] = ([llm_dir], {".gguf"})
    else:
        paths, exts = folder_paths.folder_names_and_paths["LLM"]
        if llm_dir not in paths:
            paths.append(llm_dir)
        if isinstance(exts, set):
            exts.add(".gguf")
    return llm_dir


def _is_safe_relpath(name: str) -> bool:
    """Reject empty strings, absolute paths, drive letters, and ``..`` traversal."""
    if not name or name in (_NONE_OPTION, _EMPTY_MODEL_PLACEHOLDER):
        return False
    norm = name.replace("\\", "/")
    if os.path.isabs(name) or os.path.isabs(norm) or norm.startswith("/"):
        return False
    if ":" in norm:
        return False
    parts = [p for p in norm.split("/") if p]
    if not parts or any(p in (".", "..") for p in parts):
        return False
    return True


def _get_search_roots() -> list[str]:
    """Return candidate directories for LLM GGUF discovery (`models/LLM` and `models/text_encoders`)."""
    llm_dir = _ensure_llm_folder_registered()
    roots = [llm_dir]
    try:
        for p in folder_paths.get_folder_paths("LLM"):
            if p not in roots and os.path.isdir(p):
                roots.append(p)
    except Exception:
        pass
    text_encoders_dir = os.path.join(folder_paths.models_dir, "text_encoders")
    if os.path.isdir(text_encoders_dir) and text_encoders_dir not in roots:
        roots.append(text_encoders_dir)
    return roots


def resolve_llm_subpath(rel_path: str) -> Optional[str]:
    """Resolve a relative path inside ``models/LLM`` (or ``models/text_encoders``) safely."""
    if not _is_safe_relpath(rel_path):
        return None
    norm = rel_path.replace("\\", "/")
    for root in _get_search_roots():
        root_real = os.path.realpath(root)
        candidate = os.path.realpath(os.path.join(root_real, *norm.split("/")))
        try:
            common = os.path.commonpath([root_real, candidate])
        except ValueError:
            continue
        if common == root_real and os.path.isfile(candidate):
            return candidate
    return None


def _is_qwen38_preferred(rel_path: str) -> tuple[int, str]:
    """Sort key that prioritizes `Qwen3.8-27B/` subfolder and Qwen3.8 GGUF files at the top of dropdown lists."""
    norm_lower = rel_path.replace("\\", "/").lower()
    if norm_lower.startswith("qwen3.8-27b/") or norm_lower.startswith("qwen3_8-27b/"):
        return (0, norm_lower)
    if "qwen3.8" in norm_lower or "qwen3_8" in norm_lower or "qwen38" in norm_lower:
        return (1, norm_lower)
    if "qwen" in norm_lower:
        return (2, norm_lower)
    return (3, norm_lower)


def get_qwen38_model_lists() -> tuple[list[str], list[str]]:
    """
    Scan ``models/LLM`` (and fallback ``models/text_encoders``) for GGUF models and mmproj files.

    Returns:
        (main_models, mmproj_models) where Qwen3.8-27B entries are sorted first.
    """
    _ensure_llm_folder_registered()
    raw_files: set[str] = set()

    try:
        for f in folder_paths.get_filename_list("LLM"):
            if f.lower().endswith(".gguf"):
                raw_files.add(f.replace("\\", "/"))
    except Exception:
        pass

    for root in _get_search_roots():
        if not os.path.isdir(root):
            continue
        for dirpath, _, filenames in os.walk(root):
            for fn in filenames:
                if fn.lower().endswith(".gguf"):
                    rel = os.path.relpath(os.path.join(dirpath, fn), root)
                    raw_files.add(rel.replace("\\", "/"))

    main_models: list[str] = []
    mmproj_models: list[str] = []

    for rel in raw_files:
        base_lower = os.path.basename(rel).lower()
        # Exclude importance matrix data files
        if base_lower.endswith(".imatrix.gguf") or "imatrix" in base_lower:
            continue
        if "mmproj" in base_lower:
            mmproj_models.append(rel)
        else:
            main_models.append(rel)

    main_models.sort(key=_is_qwen38_preferred)
    mmproj_models.sort(key=_is_qwen38_preferred)

    if not main_models:
        main_models = [_EMPTY_MODEL_PLACEHOLDER]
    mmproj_options = mmproj_models + [_NONE_OPTION] if mmproj_models else [_NONE_OPTION]
    return main_models, mmproj_options


# ---------------------------------------------------------------------------
# Image Pre-Processing & Token Scaling Helpers
# ---------------------------------------------------------------------------

def compute_effective_image_max_tokens(image_max_tokens: int, batch_size: int) -> int:
    """
    Dynamically scale ``image_max_tokens`` per frame when processing multi-frame batches
    so total visual tokens stay within the 16 GB VRAM budget.
    """
    if batch_size <= 1:
        return int(image_max_tokens)
    return max(256, int(image_max_tokens) // int(batch_size))


def tensor_frame_to_png_data_uri(
    frame_tensor: torch.Tensor,
    effective_image_max_tokens: int,
) -> tuple[str, tuple[int, int], tuple[int, int]]:
    """
    Convert a single ``[H, W, C]`` float32 ``[0.0, 1.0]`` ComfyUI frame tensor to an
    in-memory base64 PNG DataURI.

    If the input frame's longest edge exceeds 2048 px and ``effective_image_max_tokens <= 2048``,
    downscales the longest edge to 1536 px via Lanczos in Python RAM before PNG encoding
    to avoid PCIe transfer bottlenecks and temporary C++ MTMD allocation spikes.

    Returns:
        (data_uri, (orig_w, orig_h), (final_w, final_h))
    """
    clean = torch.nan_to_num(frame_tensor.detach().cpu(), nan=0.0, posinf=1.0, neginf=0.0)
    clean = torch.clamp(clean, 0.0, 1.0)
    arr = (clean.numpy() * 255.0).round().astype(np.uint8)

    if arr.ndim == 3 and arr.shape[2] == 4:
        arr = arr[:, :, :3]
    elif arr.ndim == 3 and arr.shape[2] == 1:
        arr = np.repeat(arr, 3, axis=2)

    pil_img = Image.fromarray(arr, mode="RGB")
    orig_w, orig_h = pil_img.size
    long_edge = max(orig_w, orig_h)

    if long_edge > _LANCZOS_TRIGGER_EDGE and effective_image_max_tokens <= _LANCZOS_TOKEN_THRESHOLD:
        scale = _LANCZOS_MAX_LONG_EDGE / float(long_edge)
        new_w = max(1, int(round(orig_w * scale)))
        new_h = max(1, int(round(orig_h * scale)))
        resample_filter = getattr(Image, "Resampling", Image).LANCZOS
        pil_img = pil_img.resize((new_w, new_h), resample=resample_filter)

    final_w, final_h = pil_img.size
    buf = std_io.BytesIO()
    pil_img.save(buf, format="PNG", compress_level=1)
    b64_str = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64_str}", (orig_w, orig_h), (final_w, final_h)


# ---------------------------------------------------------------------------
# Thinking Trace & Output Post-Processing
# ---------------------------------------------------------------------------

def parse_qwen38_response(
    raw_content: str,
    thinking_mode: str,
    reasoning_content: Optional[str] = None,
    finish_reason: Optional[str] = None,
) -> tuple[str, str]:
    """
    Separate the internal ``<think>...</think>`` reasoning trace from the clean prompt.

    Handles four cases:
      1. Explicit ``reasoning_content`` field provided by chat handler.
      2. Complete ``<think>...</think>`` block(s) inside ``raw_content``.
      3. Prompt-injected ``<think>`` where ``raw_content`` contains only the closing ``</think>``.
      4. Unclosed ``<think>`` (or missing ``</think>`` when ``thinking_mode == 'enable'``
         and ``finish_reason == 'length'`` truncated mid-thought): isolates the partial
         thought into ``thinking_trace`` and outputs a clear diagnostic warning in
         ``clean_prompt`` so raw chain-of-thought never leaks into downstream CLIP/T5 encoders.
    """
    text = (raw_content or "").strip()
    traces: list[str] = []

    if reasoning_content and reasoning_content.strip():
        traces.append(reasoning_content.strip())

    # Case A: Full <think>...</think> blocks in the text
    think_pattern = re.compile(r"<think>(.*?)</think>", flags=re.DOTALL)
    found_blocks = think_pattern.findall(text)
    if found_blocks:
        for block in found_blocks:
            stripped_block = block.strip()
            if stripped_block:
                traces.append(stripped_block)
        clean_prompt = think_pattern.sub("", text).strip()
        return clean_prompt, "\n\n".join(traces).strip()

    # Case B: Prompt template already opened <think>\n at the end of the prompt,
    # so the generated completion begins directly with the thought and closes with </think>.
    if "</think>" in text:
        before_close, after_close = text.split("</think>", 1)
        before_clean = re.sub(r"^<think>\s*", "", before_close.strip())
        if before_clean:
            traces.append(before_clean)
        clean_prompt = after_close.strip()
        return clean_prompt, "\n\n".join(traces).strip()

    # Case C: Unclosed <think> tag present in the output (exhausted max_new_tokens mid-thought)
    if "<think>" in text:
        _, partial_thought = text.split("<think>", 1)
        if partial_thought.strip():
            traces.append(partial_thought.strip())
        return _UNCLOSED_THINK_WARNING, "\n\n".join(traces).strip()

    # Case D: Prompt template opened <think>\n (so raw_content has no <think> prefix)
    # and generation hit max_new_tokens (finish_reason == "length") before emitting </think>
    if thinking_mode == "enable" and finish_reason == "length" and text and not traces:
        traces.append(text)
        return _UNCLOSED_THINK_WARNING, "\n\n".join(traces).strip()

    return text, "\n\n".join(traces).strip()


# ---------------------------------------------------------------------------
# Thread-Safe Runtime Cache & VRAM Management
# ---------------------------------------------------------------------------

class _Qwen38RuntimeCache:
    """
    Process-local, thread-safe cache holding at most one loaded ``Llama`` instance
    for ``Duffy_Qwen38_VLM_PromptGenerator``.
    """

    _lock = threading.Lock()
    _instance: Any = None
    _config_key: Optional[tuple] = None
    _mtp_active: bool = False

    @classmethod
    def _preflight_vram_check(cls) -> None:
        """
        Check available VRAM via ComfyUI's device-agnostic ``model_management`` API.
        If free memory is below 13.5 GB, proactively evict cached ComfyUI models.
        """
        try:
            device = comfy.model_management.get_torch_device()
            free_bytes = comfy.model_management.get_free_memory(device)
            if free_bytes < _VRAM_PREFLIGHT_THRESHOLD_BYTES:
                free_gb = free_bytes / (1024 ** 3)
                logger.info(
                    "[Duffy Qwen3.8 VLM] Free VRAM (%.2f GB) is below 13.50 GB threshold; "
                    "unloading cached ComfyUI models before GGUF initialization.",
                    free_gb,
                )
                comfy.model_management.unload_all_models()
                gc.collect()
                comfy.model_management.soft_empty_cache()
        except Exception as exc:
            logger.debug("[Duffy Qwen3.8 VLM] Pre-flight VRAM check skipped: %s", exc)

    @classmethod
    def get_or_load(
        cls,
        *,
        model_path: str,
        mmproj_path: Optional[str],
        n_gpu_layers: int,
        mmproj_offload: bool,
        n_ctx: int,
        flash_attn: bool,
        kv_cache_type_k: str,
        kv_cache_type_v: str,
        n_batch: int,
        n_ubatch: int,
        image_min_tokens: int,
        effective_image_max_tokens: int,
        enable_mtp: bool,
        mtp_draft_max: int,
        is_thinking: bool,
    ) -> tuple[Any, bool, str]:
        """
        Return ``(llm_instance, mtp_active, effective_v_cache_str)``, loading or
        reloading only when the hardware/context configuration key changes.
        """
        try:
            import llama_cpp
            from llama_cpp import Llama
        except ImportError as exc:
            raise RuntimeError(
                "Duffy_Qwen38_VLM_PromptGenerator requires `llama-cpp-python` (v0.4.5+cu130 or newer) "
                "with MTMD and Qwen3.8 support. Install the wheel into the active Python environment."
            ) from exc

        ggml_map = {
            "f16": int(getattr(llama_cpp, "GGML_TYPE_F16", _GGML_TYPE_F16)),
            "q8_0": int(getattr(llama_cpp, "GGML_TYPE_Q8_0", _GGML_TYPE_Q8_0)),
            "q4_0": int(getattr(llama_cpp, "GGML_TYPE_Q4_0", _GGML_TYPE_Q4_0)),
        }

        # Safety guard: Quantizing V-cache requires Flash Attention enabled in llama.cpp
        effective_kv_v_str = kv_cache_type_v
        if not flash_attn and kv_cache_type_v != "f16":
            logger.warning(
                "[Duffy Qwen3.8 VLM] kv_cache_type_v='%s' requires flash_attn=True in llama.cpp. "
                "Automatically overriding kv_cache_type_v to 'f16' to prevent a backend assertion crash.",
                kv_cache_type_v,
            )
            effective_kv_v_str = "f16"

        type_k = ggml_map.get(kv_cache_type_k, _GGML_TYPE_Q8_0)
        type_v = ggml_map.get(effective_kv_v_str, _GGML_TYPE_Q8_0)

        # LLAMA_FLASH_ATTN_TYPE_ENABLED = 1, LLAMA_FLASH_ATTN_TYPE_DISABLED = 0
        flash_attn_type = 1 if flash_attn else 0

        desired_key = (
            model_path,
            mmproj_path,
            int(n_gpu_layers),
            bool(mmproj_offload),
            int(n_ctx),
            bool(flash_attn),
            int(type_k),
            int(type_v),
            int(n_batch),
            int(n_ubatch),
            int(image_min_tokens),
            int(effective_image_max_tokens),
            bool(enable_mtp),
            int(mtp_draft_max) if enable_mtp else 0,
        )

        with cls._lock:
            if cls._instance is not None and cls._config_key == desired_key:
                # Update dynamic per-call template arguments on the cached handler
                if getattr(cls._instance, "chat_handler", None) is not None:
                    extra_args = getattr(cls._instance.chat_handler, "extra_template_arguments", None)
                    if isinstance(extra_args, dict):
                        extra_args["enable_thinking"] = bool(is_thinking)
                return cls._instance, cls._mtp_active, effective_kv_v_str

            cls._unload_locked()
            cls._preflight_vram_check()

            # Configure native Multi-Token Prediction (MTP) speculative decoding if requested
            spec_config = None
            load_mtp = False
            if enable_mtp:
                try:
                    from llama_cpp.llama_speculative import SpecConfig, SpeculativeType
                    spec_config = SpecConfig(
                        spec_type=SpeculativeType.DRAFT_MTP,
                        draft_n_max=int(mtp_draft_max),
                    )
                    load_mtp = True
                except Exception as exc:
                    logger.warning(
                        "[Duffy Qwen3.8 VLM] SpecConfig(DRAFT_MTP) unavailable in installed "
                        "llama_cpp (%s); continuing with standard decoding.",
                        exc,
                    )
                    spec_config = None
                    load_mtp = False

            chat_handler_kwargs: dict[str, Any] = {}
            if mmproj_path is not None:
                chat_handler_kwargs = {
                    "use_gpu": bool(mmproj_offload),
                    "flash_attn": bool(flash_attn),
                    "image_min_tokens": int(image_min_tokens),
                    "image_max_tokens": int(effective_image_max_tokens),
                    "batch_max_tokens": int(n_ubatch),
                    "extra_template_arguments": {"enable_thinking": bool(is_thinking)},
                    "verbose": False,
                }

            init_kwargs: dict[str, Any] = {
                "model_path": model_path,
                "mmproj_path": mmproj_path,
                "n_gpu_layers": int(n_gpu_layers),
                "n_ctx": int(n_ctx),
                "n_batch": int(n_batch),
                "n_ubatch": int(n_ubatch),
                "flash_attn_type": flash_attn_type,
                "type_k": type_k,
                "type_v": type_v,
                "offload_kqv": True,
                "swa_full": False,
                "verbose": False,
            }
            if mmproj_path is not None:
                init_kwargs["chat_handler_kwargs"] = chat_handler_kwargs

            logger.info(
                "[Duffy Qwen3.8 VLM] Loading model='%s' mmproj='%s' (n_ctx=%d, ngl=%d, "
                "fa=%s, kv=%s/%s, mtp=%s, draft_max=%d, img_tokens=%d..%d)",
                os.path.basename(model_path),
                os.path.basename(mmproj_path) if mmproj_path else "None",
                n_ctx,
                n_gpu_layers,
                flash_attn,
                kv_cache_type_k,
                effective_kv_v_str,
                load_mtp,
                mtp_draft_max if load_mtp else 0,
                image_min_tokens,
                effective_image_max_tokens,
            )

            mtp_active = False
            try:
                if load_mtp and spec_config is not None:
                    cls._instance = Llama(
                        **init_kwargs,
                        load_mtp=True,
                        speculative=spec_config,
                    )
                    mtp_active = getattr(cls._instance, "speculative", None) is not None
                else:
                    cls._instance = Llama(**init_kwargs)
            except Exception as first_exc:
                if load_mtp:
                    logger.warning(
                        "[Duffy Qwen3.8 VLM] MTP initialization failed (%s). "
                        "Retrying model load without MTP speculative decoding.",
                        first_exc,
                    )
                    cls._instance = Llama(**init_kwargs, load_mtp=False, speculative=None)
                    mtp_active = False
                else:
                    raise

            cls._config_key = desired_key
            cls._mtp_active = mtp_active
            return cls._instance, cls._mtp_active, effective_kv_v_str

    @classmethod
    def _unload_locked(cls) -> None:
        if cls._instance is not None:
            try:
                chat_handler = getattr(cls._instance, "chat_handler", None)
                if chat_handler is not None and hasattr(chat_handler, "close"):
                    chat_handler.close()
            except Exception as exc:
                logger.debug("[Duffy Qwen3.8 VLM] Error closing MTMD chat_handler: %s", exc)
            try:
                if hasattr(cls._instance, "close"):
                    cls._instance.close()
            except Exception as exc:
                logger.debug("[Duffy Qwen3.8 VLM] Error closing Llama instance: %s", exc)
            cls._instance = None
            cls._config_key = None
            cls._mtp_active = False
            gc.collect()
            comfy.model_management.soft_empty_cache()

    @classmethod
    def unload(cls) -> None:
        """Explicitly release the cached ``Llama`` model and flush VRAM."""
        with cls._lock:
            cls._unload_locked()


# ---------------------------------------------------------------------------
# V3 ComfyNode Definition
# ---------------------------------------------------------------------------

class DuffyQwen38VLMPromptGenerator(io.ComfyNode):
    """
    Qwen3.8-27B Vision Prompt Generator (GGUF) — Schema V3 Node.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        main_models, mmproj_models = get_qwen38_model_lists()
        default_main = main_models[0] if main_models else _EMPTY_MODEL_PLACEHOLDER
        default_mmproj = mmproj_models[0] if mmproj_models else _NONE_OPTION

        return io.Schema(
            node_id="Duffy_Qwen38_VLM_PromptGenerator",
            display_name="Qwen3.8-27B Vision Prompt Generator (GGUF)",
            category="Duffy/LLM",
            description=(
                "High-detail multimodal prompt generator powered by Alibaba's dense Qwen3.8-27B "
                "GGUF model and native MTMD vision projector. Supports single images, video frame "
                "batches, or pure text prompt expansion with Multi-Token Prediction (MTP), quantized "
                "KV cache, dynamic vision token budgeting, and controllable <think> reasoning."
            ),
            inputs=[
                # --- Core Inputs ---
                io.Combo.Input(
                    "model_name",
                    options=main_models,
                    default=default_main,
                    display_name="Model (GGUF)",
                    tooltip=(
                        "Primary Qwen3.8-27B GGUF model file inside ComfyUI/models/LLM "
                        "(e.g., Qwen3.8-27B/Qwen3.8-27B-IQ3_XS-3.01bpw.gguf)."
                    ),
                ),
                io.Combo.Input(
                    "mmproj_name",
                    options=mmproj_models,
                    default=default_mmproj,
                    display_name="MMProj Vision Projector (GGUF)",
                    tooltip=(
                        "Multimodal vision projector GGUF file inside ComfyUI/models/LLM "
                        "(e.g., Qwen3.8-27B/mmproj-Qwen3.8-27B-BF16.gguf). Required when an image is connected."
                    ),
                ),
                io.String.Input(
                    "system_prompt",
                    multiline=True,
                    default=_DEFAULT_SYSTEM_PROMPT,
                    display_name="System Prompt",
                    tooltip=(
                        "System instructions defining the assistant's persona and output format. "
                        "Directly compatible with the Duffy Vision LLM System Prompt Selector node."
                    ),
                ),
                io.String.Input(
                    "user_prompt",
                    multiline=True,
                    default=_DEFAULT_USER_PROMPT,
                    display_name="User Prompt",
                    tooltip="Specific instructions, subject hints, or style directives for prompt generation.",
                ),
                io.Combo.Input(
                    "thinking_mode",
                    options=["enable", "disable"],
                    default="enable",
                    display_name="Thinking Mode",
                    tooltip=(
                        "Controls Qwen3.8's internal <think>...</think> chain-of-thought reasoning phase. "
                        "Set to 'disable' for immediate fast prompt generation without reasoning overhead."
                    ),
                ),
                io.Int.Input(
                    "seed",
                    default=42,
                    min=0,
                    max=0xFFFFFFFFFFFFFFFF,
                    control_after_generate=True,
                    display_name="Seed",
                    tooltip="Deterministic RNG seed for token sampling and ComfyUI cache invalidation.",
                ),
                # --- Hardware & Memory Management (16 GB VRAM Tuned) ---
                io.Int.Input(
                    "n_gpu_layers",
                    default=-1,
                    min=-1,
                    max=128,
                    step=1,
                    display_name="GPU Layers (n_gpu_layers)",
                    tooltip="Number of transformer layers to offload to GPU VRAM (-1 offloads all layers).",
                ),
                io.Boolean.Input(
                    "mmproj_offload",
                    default=True,
                    display_name="Offload MMProj to GPU",
                    tooltip=(
                        "Offload the vision encoder projector (~930 MB) to GPU. Disable to keep the "
                        "vision projector in system RAM if VRAM is constrained."
                    ),
                ),
                io.Int.Input(
                    "n_ctx",
                    default=8192,
                    min=2048,
                    max=65536,
                    step=1024,
                    display_name="Context Length (n_ctx)",
                    tooltip="Maximum context window size in tokens (must accommodate system prompt + vision tokens + output).",
                ),
                io.Boolean.Input(
                    "flash_attn",
                    default=True,
                    display_name="Flash Attention",
                    tooltip="Enable Flash Attention kernels for faster prefill and reduced KV-cache VRAM footprint.",
                ),
                io.Combo.Input(
                    "kv_cache_type_k",
                    options=["f16", "q8_0", "q4_0"],
                    default="q8_0",
                    display_name="KV Cache Type (K)",
                    tooltip="Data type quantization for the Key cache (q8_0 halves KV VRAM with negligible quality loss).",
                ),
                io.Combo.Input(
                    "kv_cache_type_v",
                    options=["f16", "q8_0", "q4_0"],
                    default="q8_0",
                    display_name="KV Cache Type (V)",
                    tooltip=(
                        "Data type quantization for the Value cache (requires Flash Attention enabled; "
                        "automatically falls back to f16 if Flash Attention is disabled)."
                    ),
                ),
                io.Int.Input(
                    "n_batch",
                    default=1024,
                    min=128,
                    max=4096,
                    step=128,
                    display_name="Logical Batch Size (n_batch)",
                    tooltip="Maximum number of tokens processed in a single logical prompt evaluation batch.",
                ),
                io.Int.Input(
                    "n_ubatch",
                    default=512,
                    min=128,
                    max=2048,
                    step=128,
                    display_name="Physical Micro-Batch (n_ubatch)",
                    tooltip=(
                        "Physical micro-batch size for CUDA compute buffers and MTMD vision patch evaluation. "
                        "512 prevents compute buffer spikes on 16 GB GPUs."
                    ),
                ),
                io.Boolean.Input(
                    "keep_model_loaded",
                    default=False,
                    display_name="Keep Model Loaded",
                    tooltip=(
                        "When False (recommended on 16 GB VRAM), immediately unloads the LLM and flushes VRAM "
                        "after generating the prompt so downstream diffusion samplers have full GPU memory."
                    ),
                ),
                # --- Vision Token Budgeting (MTMD) ---
                io.Int.Input(
                    "image_min_tokens",
                    default=256,
                    min=64,
                    max=2048,
                    step=64,
                    display_name="Image Min Tokens",
                    tooltip="Minimum number of visual tokens allocated per input image.",
                ),
                io.Int.Input(
                    "image_max_tokens",
                    default=1536,
                    min=256,
                    max=8192,
                    step=128,
                    display_name="Image Max Tokens",
                    tooltip=(
                        "Maximum number of visual tokens allocated per image (caps dynamic high-res tiling). "
                        "Automatically scaled across frames when a multi-frame video batch is connected."
                    ),
                ),
                # --- Speculative Decoding (MTP) ---
                io.Boolean.Input(
                    "enable_mtp",
                    default=True,
                    display_name="Enable MTP Speculative Decoding",
                    tooltip="Activate Qwen3.8's built-in Multi-Token Prediction (DRAFT_MTP) head for faster generation.",
                ),
                io.Int.Input(
                    "mtp_draft_max",
                    default=4,
                    min=1,
                    max=16,
                    step=1,
                    display_name="MTP Draft Max Tokens",
                    tooltip="Maximum number of draft tokens proposed per MTP verification step.",
                ),
                # --- Reasoning & Sampling ---
                io.Int.Input(
                    "reasoning_budget",
                    default=1024,
                    min=-1,
                    max=8192,
                    step=128,
                    display_name="Reasoning Budget (Tokens)",
                    tooltip=(
                        "Maximum tokens allowed inside <think>...</think> before forcing '</think>' closure "
                        "(-1 = unlimited, 0 = immediate close). Ignored when Thinking Mode is 'disable'."
                    ),
                ),
                io.Int.Input(
                    "max_new_tokens",
                    default=1024,
                    min=64,
                    max=8192,
                    step=64,
                    display_name="Max New Tokens",
                    tooltip="Maximum total tokens to generate (including any thinking tokens).",
                ),
                io.Float.Input(
                    "temperature",
                    default=0.7,
                    min=0.0,
                    max=2.0,
                    step=0.05,
                    display_name="Temperature",
                    tooltip="Sampling temperature (0.7 is Alibaba's recommended value for Qwen3.8 creative description).",
                ),
                io.Float.Input(
                    "top_p",
                    default=0.95,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    display_name="Top-P",
                    tooltip="Nucleus sampling cumulative probability threshold.",
                ),
                io.Int.Input(
                    "top_k",
                    default=20,
                    min=0,
                    max=200,
                    step=1,
                    display_name="Top-K",
                    tooltip="Top-K sampling filter (0 disables Top-K).",
                ),
                io.Float.Input(
                    "min_p",
                    default=0.05,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    display_name="Min-P",
                    tooltip="Minimum token probability relative to the most likely token.",
                ),
                io.Float.Input(
                    "presence_penalty",
                    default=1.5,
                    min=-2.0,
                    max=2.0,
                    step=0.1,
                    display_name="Presence Penalty",
                    tooltip="Penalizes repeated concepts (1.5 prevents repetitive thinking loops in Qwen3.8).",
                ),
                # --- Optional Image / Video Frame Batch Input ---
                io.Image.Input(
                    "image",
                    optional=True,
                    display_name="Image / Video Batch",
                    tooltip=(
                        "Optional input image [1, H, W, C] or multi-frame video batch [B, H, W, C]. "
                        "When connected, the visual content is analyzed via the MMProj vision projector; "
                        "when unconnected, the node operates as a text-only prompt generator."
                    ),
                ),
            ],
            outputs=[
                io.String.Output(
                    "clean_prompt",
                    display_name="clean_prompt",
                    tooltip="Final prompt with all <think>...</think> reasoning stripped—ready for CLIP/T5 text encoders.",
                ),
                io.String.Output(
                    "thinking_trace",
                    display_name="thinking_trace",
                    tooltip="Extracted internal <think>...</think> reasoning trace for inspection.",
                ),
                io.String.Output(
                    "raw_response",
                    display_name="raw_response",
                    tooltip="Complete raw model output plus generation speed, token counts, and hardware telemetry.",
                ),
            ],
        )

    @classmethod
    def validate_inputs(
        cls,
        model_name: str,
        mmproj_name: str,
        image_min_tokens: int,
        image_max_tokens: int,
        **kwargs,
    ) -> bool | str:
        if model_name == _EMPTY_MODEL_PLACEHOLDER:
            return (
                "No GGUF models found in ComfyUI/models/LLM. Place your Qwen3.8-27B GGUF "
                "file under ComfyUI/models/LLM/Qwen3.8-27B/."
            )
        if not _is_safe_relpath(model_name) or resolve_llm_subpath(model_name) is None:
            return f"Invalid or missing GGUF model path: '{model_name}'."

        if mmproj_name and mmproj_name != _NONE_OPTION:
            if not _is_safe_relpath(mmproj_name) or resolve_llm_subpath(mmproj_name) is None:
                return f"Invalid or missing MMProj GGUF path: '{mmproj_name}'."

        if int(image_max_tokens) < int(image_min_tokens):
            return (
                f"image_max_tokens ({image_max_tokens}) cannot be less than "
                f"image_min_tokens ({image_min_tokens})."
            )
        return True

    @classmethod
    def fingerprint_inputs(
        cls,
        model_name: str,
        mmproj_name: str,
        system_prompt: str,
        user_prompt: str,
        thinking_mode: str,
        seed: int,
        n_gpu_layers: int,
        mmproj_offload: bool,
        n_ctx: int,
        flash_attn: bool,
        kv_cache_type_k: str,
        kv_cache_type_v: str,
        n_batch: int,
        n_ubatch: int,
        keep_model_loaded: bool,
        image_min_tokens: int,
        image_max_tokens: int,
        enable_mtp: bool,
        mtp_draft_max: int,
        reasoning_budget: int,
        max_new_tokens: int,
        temperature: float,
        top_p: float,
        top_k: int,
        min_p: float,
        presence_penalty: float,
        image: Optional[torch.Tensor] = None,
        **kwargs,
    ) -> str:
        hasher = hashlib.sha256()
        fields = (
            model_name,
            mmproj_name,
            system_prompt,
            user_prompt,
            thinking_mode,
            int(seed),
            int(n_gpu_layers),
            bool(mmproj_offload),
            int(n_ctx),
            bool(flash_attn),
            kv_cache_type_k,
            kv_cache_type_v,
            int(n_batch),
            int(n_ubatch),
            bool(keep_model_loaded),
            int(image_min_tokens),
            int(image_max_tokens),
            bool(enable_mtp),
            int(mtp_draft_max),
            int(reasoning_budget),
            int(max_new_tokens),
            round(float(temperature), 4),
            round(float(top_p), 4),
            int(top_k),
            round(float(min_p), 4),
            round(float(presence_penalty), 4),
        )
        hasher.update(repr(fields).encode("utf-8"))

        for rel in (model_name, mmproj_name):
            resolved = resolve_llm_subpath(rel) if rel and rel != _NONE_OPTION else None
            if resolved and os.path.isfile(resolved):
                try:
                    hasher.update(str(os.path.getmtime(resolved)).encode("utf-8"))
                except OSError:
                    pass

        if image is not None and isinstance(image, torch.Tensor):
            hasher.update(str(tuple(image.shape)).encode("utf-8"))
            try:
                sample = image.detach().cpu().flatten()
                if sample.numel() > 0:
                    step = max(1, sample.numel() // 64)
                    hasher.update(sample[::step][:64].numpy().tobytes())
            except Exception:
                pass

        return hasher.hexdigest()

    @classmethod
    def execute(
        cls,
        model_name: str,
        mmproj_name: str,
        system_prompt: str,
        user_prompt: str,
        thinking_mode: str,
        seed: int,
        n_gpu_layers: int,
        mmproj_offload: bool,
        n_ctx: int,
        flash_attn: bool,
        kv_cache_type_k: str,
        kv_cache_type_v: str,
        n_batch: int,
        n_ubatch: int,
        keep_model_loaded: bool,
        image_min_tokens: int,
        image_max_tokens: int,
        enable_mtp: bool,
        mtp_draft_max: int,
        reasoning_budget: int,
        max_new_tokens: int,
        temperature: float,
        top_p: float,
        top_k: int,
        min_p: float,
        presence_penalty: float,
        image: Optional[torch.Tensor] = None,
    ) -> io.NodeOutput:
        model_path = resolve_llm_subpath(model_name)
        if not model_path:
            raise ValueError(
                f"[Duffy Qwen3.8 VLM] Could not resolve GGUF model '{model_name}' in ComfyUI/models/LLM."
            )

        has_image = image is not None and isinstance(image, torch.Tensor) and image.numel() > 0
        mmproj_path: Optional[str] = None
        if mmproj_name and mmproj_name != _NONE_OPTION:
            mmproj_path = resolve_llm_subpath(mmproj_name)

        if has_image and not mmproj_path:
            raise ValueError(
                "[Duffy Qwen3.8 VLM] An input image is connected, but no valid MMProj vision projector "
                f"is selected (mmproj_name='{mmproj_name}'). Please select an mmproj GGUF file "
                "(e.g., Qwen3.8-27B/mmproj-Qwen3.8-27B-BF16.gguf)."
            )

        if int(image_max_tokens) < int(image_min_tokens):
            raise ValueError(
                f"[Duffy Qwen3.8 VLM] image_max_tokens ({image_max_tokens}) cannot be smaller "
                f"than image_min_tokens ({image_min_tokens})."
            )

        # Compute batch frame count and per-frame token cap
        batch_size = int(image.shape[0]) if (has_image and image.ndim == 4) else (1 if has_image else 0)
        effective_image_max_tokens = compute_effective_image_max_tokens(
            int(image_max_tokens), max(1, batch_size)
        )
        effective_image_min_tokens = min(int(image_min_tokens), effective_image_max_tokens)

        is_thinking = thinking_mode == "enable"
        effective_budget = int(reasoning_budget) if is_thinking else 0

        try:
            t_start = time.perf_counter()

            # 1. Pre-process connected image(s) to in-memory PNG DataURIs
            user_content: Any
            frame_resolutions: list[str] = []
            if has_image:
                frames = image if image.ndim == 4 else image.unsqueeze(0)
                content_blocks: list[dict[str, Any]] = []
                for idx in range(frames.shape[0]):
                    data_uri, orig_res, final_res = tensor_frame_to_png_data_uri(
                        frames[idx],
                        effective_image_max_tokens=effective_image_max_tokens,
                    )
                    if orig_res != final_res:
                        frame_resolutions.append(
                            f"{orig_res[0]}x{orig_res[1]}->{final_res[0]}x{final_res[1]}"
                        )
                    else:
                        frame_resolutions.append(f"{final_res[0]}x{final_res[1]}")
                    content_blocks.append(
                        {
                            "type": "image_url",
                            "image_url": {"url": data_uri},
                        }
                    )
                prompt_text = (user_prompt or "").strip() or _DEFAULT_USER_PROMPT
                content_blocks.append({"type": "text", "text": prompt_text})
                user_content = content_blocks
            else:
                user_content = (user_prompt or "").strip() or _DEFAULT_USER_PROMPT

            messages: list[dict[str, Any]] = []
            if system_prompt and system_prompt.strip():
                messages.append({"role": "system", "content": system_prompt.strip()})
            messages.append({"role": "user", "content": user_content})

            # 2. Load or retrieve cached Llama instance
            # Always pass mmproj_path when available so GenericMTMDChatHandler is active
            # for both multimodal and text-only requests (supporting extra_template_arguments
            # such as enable_thinking without reloading the model when toggling image input).
            llm, mtp_active, effective_kv_v = _Qwen38RuntimeCache.get_or_load(
                model_path=model_path,
                mmproj_path=mmproj_path,
                n_gpu_layers=int(n_gpu_layers),
                mmproj_offload=bool(mmproj_offload),
                n_ctx=int(n_ctx),
                flash_attn=bool(flash_attn),
                kv_cache_type_k=kv_cache_type_k,
                kv_cache_type_v=kv_cache_type_v,
                n_batch=int(n_batch),
                n_ubatch=int(n_ubatch),
                image_min_tokens=effective_image_min_tokens,
                effective_image_max_tokens=effective_image_max_tokens,
                enable_mtp=bool(enable_mtp),
                mtp_draft_max=int(mtp_draft_max),
                is_thinking=is_thinking,
            )

            # Synchronize Jinja template thinking flag on active chat handler
            chat_handler = getattr(llm, "chat_handler", None)
            if chat_handler is not None:
                extra_args = getattr(chat_handler, "extra_template_arguments", None)
                if isinstance(extra_args, dict):
                    extra_args["enable_thinking"] = is_thinking

            # 3. Execute multimodal / text chat completion
            # Qwen3.8's Jinja template injects `<think>\n` at the end of the prompt when
            # `enable_thinking` is True, so `reasoning_start_in_prompt=is_thinking` allows
            # the native reasoning_budget sampler to count tokens from the start of generation.
            t_gen_start = time.perf_counter()
            completion_kwargs: dict[str, Any] = {
                "messages": messages,
                "max_tokens": int(max_new_tokens),
                "temperature": float(temperature),
                "top_p": float(top_p),
                "top_k": int(top_k),
                "min_p": float(min_p),
                "presence_penalty": float(presence_penalty),
                "seed": int(seed) & 0x7FFFFFFF,
                "reasoning_budget": effective_budget,
                "reasoning_start": "<think>",
                "reasoning_end": "</think>",
                "reasoning_start_in_prompt": bool(is_thinking),
            }
            if not is_thinking and chat_handler is None:
                # Fallback when no MTMD chat_handler is active (e.g., mmproj_name == 'None')
                # and the standard Jinja2ChatFormatter renders `<think>\n` by default:
                # reasoning_budget=0 + reasoning_start_in_prompt=True forces immediate `</think>`.
                completion_kwargs["reasoning_start_in_prompt"] = True

            response = llm.create_chat_completion(**completion_kwargs)
            t_gen_end = time.perf_counter()

            # 4. Extract content & parse <think> trace
            choice_msg = (
                response.get("choices", [{}])[0].get("message", {})
                if isinstance(response, dict)
                else {}
            )
            raw_content = choice_msg.get("content") or ""
            reasoning_content = choice_msg.get("reasoning_content")
            finish_reason = (
                response.get("choices", [{}])[0].get("finish_reason", "unknown")
                if isinstance(response, dict)
                else "unknown"
            )

            clean_prompt, thinking_trace = parse_qwen38_response(
                raw_content=raw_content,
                thinking_mode=thinking_mode,
                reasoning_content=reasoning_content,
                finish_reason=finish_reason,
            )

            # 5. Build Telemetry & Raw Response Output
            usage = response.get("usage", {}) if isinstance(response, dict) else {}
            prompt_tokens = int(usage.get("prompt_tokens", 0))
            completion_tokens = int(usage.get("completion_tokens", 0))
            total_tokens = int(usage.get("total_tokens", prompt_tokens + completion_tokens))
            gen_seconds = max(1e-6, t_gen_end - t_gen_start)
            total_seconds = max(1e-6, t_gen_end - t_start)
            tok_per_sec = completion_tokens / gen_seconds if completion_tokens > 0 else 0.0

            spec_stats = getattr(llm, "last_speculative_stats", None)
            mtp_summary = "disabled"
            if mtp_active and isinstance(spec_stats, dict):
                drafted = int(spec_stats.get("drafted", 0))
                accepted = int(spec_stats.get("accepted_draft_tokens", spec_stats.get("accepted", 0)))
                acc_rate = float(spec_stats.get("draft_token_acceptance_rate", 0.0)) * 100.0
                mtp_summary = f"enabled (draft_max={mtp_draft_max}, accepted={accepted}/{drafted} [{acc_rate:.1f}%])"
            elif mtp_active:
                mtp_summary = f"enabled (draft_max={mtp_draft_max})"

            vision_summary = (
                f"{batch_size} frame(s) [{', '.join(frame_resolutions)}], "
                f"tokens_per_frame={effective_image_min_tokens}..{effective_image_max_tokens}, "
                f"mmproj_gpu={mmproj_offload}"
                if has_image
                else "text-only (no image connected)"
            )

            telemetry_block = (
                "\n\n---\n"
                "[Qwen3.8-27B Telemetry]\n"
                f"Model: {model_name}\n"
                f"MMProj: {mmproj_name if has_image else 'None (text-only)'}\n"
                f"Vision Input: {vision_summary}\n"
                f"Thinking Mode: {thinking_mode} (budget={effective_budget})\n"
                f"KV Cache: K={kv_cache_type_k}, V={effective_kv_v} (flash_attn={flash_attn}, n_ctx={n_ctx})\n"
                f"MTP Speculative Decoding: {mtp_summary}\n"
                f"Tokens: prompt={prompt_tokens}, completion={completion_tokens}, total={total_tokens} (finish={finish_reason})\n"
                f"Timing: generation={gen_seconds:.2f}s ({tok_per_sec:.2f} tok/s), total={total_seconds:.2f}s"
            )

            # Reconstruct full raw representation including <think> if template prefilled it
            if is_thinking and thinking_trace and "<think>" not in raw_content:
                formatted_raw = f"<think>\n{thinking_trace}\n</think>\n\n{clean_prompt}{telemetry_block}"
            else:
                formatted_raw = f"{raw_content.strip()}{telemetry_block}"

            return io.NodeOutput(clean_prompt, thinking_trace, formatted_raw)

        finally:
            if not keep_model_loaded:
                _Qwen38RuntimeCache.unload()
