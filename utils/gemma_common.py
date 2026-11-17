"""Shared GGUF discovery, path sanitization, KV/batch tuning, caching, and inference helpers for Gemma-4 nodes."""

from __future__ import annotations

import hashlib
import logging
import math
import os
import re
import threading
from typing import Any, Optional

import folder_paths  # type: ignore  — provided by ComfyUI runtime

from .media import ESTIMATED_TOKENS_PER_IMAGE
from .memory import preflight_vram_check, unload_llm

logger = logging.getLogger(__name__)

MMPROJ_NONE = "None"
KV_CACHE_TYPES: list[str] = ["f16", "q8_0", "q4_0"]
_KV_TYPE_FALLBACKS: dict[str, int] = {
    "f16": 1,   # GGML_TYPE_F16
    "q4_0": 2,  # GGML_TYPE_Q4_0
    "q8_0": 8,  # GGML_TYPE_Q8_0
}

_IMPORT_ERROR_MSG = (
    "You have an outdated or incompatible version of the llama-cpp-python library. "
    "Gemma-4 multimodal GGUF models require a compatible llama-cpp-python build with Gemma4ChatHandler support."
)


# ---------------------------------------------------------------------------
# Path safety & LLM folder discovery
# ---------------------------------------------------------------------------

def is_safe_relpath(relpath: str) -> bool:
    """Return True if ``relpath`` is a valid relative filename inside ``models/LLM``."""
    if not isinstance(relpath, str):
        return False
    stripped = relpath.strip()
    if not stripped:
        return False
    if stripped == MMPROJ_NONE:
        return True
    if "\x00" in stripped:
        return False
    if os.path.isabs(stripped) or stripped.startswith(("/", "\\")):
        return False
    drive, _ = os.path.splitdrive(stripped)
    if drive or ":" in stripped:
        return False
    parts = stripped.replace("\\", "/").split("/")
    if any(part in ("..", "") for part in parts):
        return False
    return True


def _get_llm_folders() -> list[str]:
    """Return configured ComfyUI LLM folders safely."""
    try:
        folders = folder_paths.get_folder_paths("LLM")
        if folders:
            return [f for f in folders if isinstance(f, str) and f]
    except Exception:
        pass
    models_dir = getattr(folder_paths, "models_dir", None)
    if models_dir:
        return [os.path.join(models_dir, "LLM")]
    return []


def resolve_llm_subpath(relpath: str) -> Optional[str]:
    """Safely resolve a relative file path inside ComfyUI's ``LLM`` model folders.

    Returns ``None`` when ``relpath`` is ``None``, empty, or ``"None"`` (text-only mode),
    or when the file cannot be located. Raises ``ValueError`` on traversal attempts.
    """
    if not relpath or relpath == MMPROJ_NONE:
        return None
    if not is_safe_relpath(relpath):
        raise ValueError(f"Unsafe relative LLM path blocked: {relpath!r}")

    folders = _get_llm_folders()
    for base in folders:
        base_real = os.path.realpath(base)
        candidate_real = os.path.realpath(os.path.join(base_real, relpath))
        if os.path.commonpath([base_real, candidate_real]) != base_real:
            raise ValueError(f"Path traversal blocked for LLM path: {relpath!r}")
        if os.path.isfile(candidate_real):
            return candidate_real

    full = folder_paths.get_full_path("LLM", relpath)
    if full:
        full_real = os.path.realpath(full)
        if folders and not any(
            os.path.commonpath([os.path.realpath(base), full_real]) == os.path.realpath(base)
            for base in folders
        ):
            raise ValueError(f"Resolved path escapes models/LLM directory: {relpath!r}")
        return full_real
    return None


def get_gguf_models() -> list[str]:
    """Return sorted ``.gguf`` filenames from ``models/LLM``, excluding ``mmproj`` files."""
    try:
        files = folder_paths.get_filename_list("LLM")
    except Exception:
        return []
    return sorted(
        f for f in files
        if f.lower().endswith(".gguf") and "mmproj" not in f.lower()
    )


def get_mmproj_models(include_none: bool = True) -> list[str]:
    """Return sorted ``mmproj*.gguf`` filenames from ``models/LLM`` (plus ``None``)."""
    try:
        files = folder_paths.get_filename_list("LLM")
    except Exception:
        files = []
    projectors = sorted(
        f for f in files
        if f.lower().endswith(".gguf") and "mmproj" in f.lower()
    )
    if include_none:
        projectors.append(MMPROJ_NONE)
    return projectors


# ---------------------------------------------------------------------------
# Projector warnings & schema validation
# ---------------------------------------------------------------------------

def warn_on_projector_choice(gguf_filename: str, mmproj_filename: str) -> None:
    """Log non-blocking advisories for quantized or mismatched projectors."""
    if not mmproj_filename or mmproj_filename == MMPROJ_NONE:
        return

    gguf_lower = (gguf_filename or "").lower()
    mmproj_lower = mmproj_filename.lower()

    if "12b" in gguf_lower and ("e4b" in mmproj_lower or "e2b" in mmproj_lower):
        logger.warning(
            "Model '%s' appears to be Gemma-4 12B, but projector '%s' is named for E2B/E4B. "
            "Pair 12B GGUF weights with a 12B mmproj (e.g. mmproj-gemma-4-12B-it-BF16.gguf).",
            gguf_filename,
            mmproj_filename,
        )

    if "bf16" not in mmproj_lower and "f16" not in mmproj_lower:
        logger.warning(
            "Selected mmproj '%s' does not appear to be BF16/F16. Quantized projectors can "
            "degrade multimodal/audio fidelity compared to BF16/F16.",
            mmproj_filename,
        )


def validate_gemma_inputs(
    gguf_model: str,
    mmproj_model: str,
    image_min_tokens: int = 128,
    image_max_tokens: int = 1120,
) -> bool | str:
    """Validate path safety and visual token bounds without blocking F16/None mmproj."""
    if not is_safe_relpath(gguf_model):
        return f"Invalid gguf_model path: '{gguf_model}'. Relative paths inside models/LLM only."
    if not is_safe_relpath(mmproj_model):
        return f"Invalid mmproj_model path: '{mmproj_model}'. Relative paths inside models/LLM only."
    if image_min_tokens > 0 and image_max_tokens > 0 and image_min_tokens > image_max_tokens:
        return f"image_min_tokens ({image_min_tokens}) cannot exceed image_max_tokens ({image_max_tokens})."

    warn_on_projector_choice(gguf_model, mmproj_model)
    return True


# ---------------------------------------------------------------------------
# Batching, Flash Attention, and KV cache parameterization
# ---------------------------------------------------------------------------

def resolve_kv_and_batch_params(
    n_ctx: int,
    n_batch: int = 2048,
    n_ubatch: int = 2048,
    image_min_tokens: int = 128,
    image_max_tokens: int = 1120,
    flash_attn: bool = True,
    kv_cache_type_k: str = "f16",
    kv_cache_type_v: str = "f16",
) -> dict[str, Any]:
    """Compute safe ``llama.cpp`` batch/micro-batch bounds and FA-safe KV dtypes.

    Gemma-4 vision chunks use non-causal attention, which asserts in ``llama.cpp``:
    ``cparams.causal_attn || cparams.n_ubatch >= n_tokens_all``.
    Enforcing ``effective_n_ubatch >= max(image_max_tokens, 1120)`` and matching
    ``batch_max_tokens`` eliminates ``GGML_ASSERT`` aborts on >0.5 MP images.
    """
    ctx = max(512, int(n_ctx))
    safe_img_max = int(image_max_tokens) if int(image_max_tokens) > 0 else ESTIMATED_TOKENS_PER_IMAGE
    safe_img_min = min(max(64, int(image_min_tokens)), safe_img_max) if int(image_min_tokens) > 0 else -1

    effective_n_ubatch = min(ctx, max(int(n_ubatch), safe_img_max, ESTIMATED_TOKENS_PER_IMAGE))
    effective_n_batch = min(ctx, max(int(n_batch), effective_n_ubatch))

    kv_k = kv_cache_type_k if kv_cache_type_k in KV_CACHE_TYPES else "f16"
    kv_v = kv_cache_type_v if kv_cache_type_v in KV_CACHE_TYPES else "f16"
    if not flash_attn and kv_v != "f16":
        logger.warning(
            "kv_cache_type_v='%s' requires flash_attn=True; falling back to 'f16'.",
            kv_v,
        )
        kv_v = "f16"

    return {
        "effective_n_batch": effective_n_batch,
        "effective_n_ubatch": effective_n_ubatch,
        "batch_max_tokens": effective_n_ubatch,
        "image_min_tokens": safe_img_min,
        "image_max_tokens": int(image_max_tokens),
        "flash_attn": bool(flash_attn),
        "flash_attn_type": 1 if flash_attn else 0,
        "kv_cache_type_k": kv_k,
        "kv_cache_type_v": kv_v,
        "swa_full": False,
    }


def resolve_ggml_type(llama_cpp_mod: Any, cache_type: str) -> int:
    """Resolve a KV cache dtype name ('f16', 'q8_0', 'q4_0') to a ggml enum int."""
    normalized = cache_type if cache_type in _KV_TYPE_FALLBACKS else "f16"
    fallback = _KV_TYPE_FALLBACKS[normalized]
    attr_name = f"GGML_TYPE_{normalized.upper()}"
    return int(getattr(llama_cpp_mod, attr_name, fallback))


# ---------------------------------------------------------------------------
# Prompt, context budget, fingerprinting, and inference helpers
# ---------------------------------------------------------------------------

def strip_thinking_blocks(text: str) -> str:
    """Remove Gemma-4 and generic ``<think>`` reasoning blocks from response text."""
    cleaned = re.sub(r"<\|channel>thought\n.*?<channel\|>", "", text, flags=re.DOTALL)
    cleaned = re.sub(r"<\|thought\|>.*?<\|thought\|>", "", cleaned, flags=re.DOTALL)
    cleaned = re.sub(r"<think>.*?</think>", "", cleaned, flags=re.DOTALL)
    return cleaned.strip()


def fingerprint_file_signature(path_str: Optional[str]) -> tuple[str, int, int]:
    """Return ``(path, mtime_ns, size)`` signature for cache invalidation."""
    if path_str and os.path.isfile(path_str):
        stat = os.stat(path_str)
        return (path_str, stat.st_mtime_ns, stat.st_size)
    return (path_str or "", -1, -1)


def fingerprint_tensor_value(value: Any) -> Any:
    """Compute a fast deterministic content fingerprint for IMAGE/VIDEO/AUDIO inputs."""
    if value is None:
        return None
    if isinstance(value, dict) and "waveform" in value:
        return (int(value.get("sample_rate", 0)), fingerprint_tensor_value(value["waveform"]))

    if hasattr(value, "detach") and hasattr(value, "reshape"):
        detached = value.detach()
        flat = detached.reshape(-1)
        numel = flat.numel()
        if numel == 0:
            return (tuple(detached.shape), str(detached.dtype), "empty")
        step = max(1, numel // 4096)
        sample_bytes = flat[::step][:4096].cpu().contiguous().numpy().tobytes()
        digest = hashlib.sha256(sample_bytes).hexdigest()[:16]
        return (tuple(detached.shape), str(detached.dtype), digest)

    return repr(value)


def estimate_image_tokens(image_tensor: Any, image_max_tokens: int = 1120) -> int:
    """Estimate Gemma-4 visual tokens for a 3D [H, W, C] or 4D [B, H, W, C] tensor."""
    cap = int(image_max_tokens) if int(image_max_tokens) > 0 else ESTIMATED_TOKENS_PER_IMAGE
    if image_tensor is None or not hasattr(image_tensor, "shape"):
        return cap

    shape = tuple(image_tensor.shape)
    if len(shape) == 4:
        batch, height, width = shape[0], shape[1], shape[2]
    elif len(shape) == 3:
        batch, height, width = 1, shape[0], shape[1]
    else:
        return cap

    # Gemma-4 patch_size=48 (~2304 px/token); lower-bounded at 64 tokens per image
    per_image = min(cap, max(64, math.ceil(height / 48) * math.ceil(width / 48)))
    return max(1, int(batch)) * per_image


def guard_context_budget(
    n_ctx: int,
    image_max_tokens: int,
    system_prompt: str,
    user_prompt: str,
    media_tensors: list[Any],
    video_frame_count: int = 0,
    audio_present: bool = False,
) -> None:
    """Raise an informative ``ValueError`` before ``llama_decode`` if inputs exceed ``n_ctx``."""
    estimated_media = sum(
        estimate_image_tokens(tensor, image_max_tokens=image_max_tokens)
        for tensor in media_tensors
        if tensor is not None
    )
    if video_frame_count > 0:
        cap = int(image_max_tokens) if int(image_max_tokens) > 0 else ESTIMATED_TOKENS_PER_IMAGE
        estimated_media += video_frame_count * cap
    if audio_present:
        estimated_media += 256

    approx_text = max(32, (len(system_prompt or "") + len(user_prompt or "")) // 3)
    estimated_total = estimated_media + approx_text + 128

    if estimated_total > int(n_ctx):
        raise ValueError(
            f"Estimated prompt input (~{estimated_total} tokens: ~{estimated_media} media + "
            f"~{approx_text} text) exceeds configured n_ctx={n_ctx}. Increase n_ctx, lower "
            f"image_max_tokens (currently {image_max_tokens}), or reduce batch/video frames."
        )


def _check_comfy_interrupt() -> None:
    """Abort promptly if the user cancelled execution in the ComfyUI UI."""
    try:
        import comfy.model_management  # type: ignore

        comfy.model_management.throw_exception_if_processing_interrupted()
    except ImportError:
        pass


def run_chat_completion_with_interrupt(model_instance: Any, **completion_kwargs) -> str:
    """Run ``create_chat_completion`` with streaming interrupt checks when supported."""
    _check_comfy_interrupt()
    response = model_instance.create_chat_completion(stream=True, **completion_kwargs)

    # Mocked or non-streaming backends may return a dict directly even with stream=True
    if isinstance(response, dict):
        choices = response.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            return message.get("content") or ""
        return ""

    parts: list[str] = []
    for chunk in response:
        _check_comfy_interrupt()
        if not isinstance(chunk, dict):
            continue
        choices = chunk.get("choices") or []
        if not choices:
            continue
        delta = choices[0].get("delta")
        if isinstance(delta, dict):
            token = delta.get("content")
            if token:
                parts.append(token)
        else:
            message = choices[0].get("message")
            if isinstance(message, dict) and message.get("content"):
                parts.append(message["content"])
    return "".join(parts)


# ---------------------------------------------------------------------------
# Thread-safe module-level model cache
# ---------------------------------------------------------------------------

class _GemmaModelCache:
    """Thread-safe model cache storing loaded Llama + chat_handler state across stateless V3 calls."""

    def __init__(self, cache_name: str = "gemma_cache") -> None:
        self.cache_name = cache_name
        self._lock = threading.RLock()
        self.model_instance: Any = None
        self.chat_handler: Any = None
        self.current_model_path: Optional[str] = None
        self.current_mmproj_path: Optional[str] = None
        self.current_n_gpu_layers: Optional[int] = None
        self.current_n_ctx: Optional[int] = None
        self.current_enable_thinking: Optional[bool] = None
        self.current_preserve_thinking: Optional[bool] = None
        self._current_hw_config: Optional[tuple[Any, ...]] = None

    @staticmethod
    def _build_hw_config(
        model_path: str,
        mmproj_path: Optional[str],
        n_gpu_layers: int,
        n_ctx: int,
        params: dict[str, Any],
        mmproj_offload: bool,
    ) -> tuple[Any, ...]:
        return (
            model_path,
            mmproj_path or None,
            int(n_gpu_layers),
            int(n_ctx),
            params["effective_n_batch"],
            params["effective_n_ubatch"],
            params["image_min_tokens"],
            params["image_max_tokens"],
            params["flash_attn"],
            params["kv_cache_type_k"],
            params["kv_cache_type_v"],
            bool(mmproj_offload),
        )

    def sync_thinking(self, enable_thinking: bool) -> None:
        """Update ``enable_thinking`` on the cached ``Gemma4ChatHandler`` without reloading weights."""
        with self._lock:
            flag = bool(enable_thinking)
            self.current_enable_thinking = flag
            handler = self.chat_handler
            if handler is None and self.model_instance is not None:
                handler = getattr(self.model_instance, "chat_handler", None)
            if handler is not None:
                if hasattr(handler, "enable_thinking"):
                    handler.enable_thinking = flag
                extra_args = getattr(handler, "extra_template_arguments", None)
                if isinstance(extra_args, dict):
                    extra_args["enable_thinking"] = flag

    def needs_reload(
        self,
        model_path: str,
        mmproj_path: Optional[str],
        n_gpu_layers: int,
        n_ctx: int,
        enable_thinking: Optional[bool] = None,
        preserve_thinking: bool = False,
        *,
        n_batch: int = 2048,
        n_ubatch: int = 2048,
        image_min_tokens: int = 128,
        image_max_tokens: int = 1120,
        flash_attn: bool = True,
        kv_cache_type_k: str = "f16",
        kv_cache_type_v: str = "f16",
        mmproj_offload: bool = True,
    ) -> bool:
        """Return True only when weight paths or backend runtime configs require reloading."""
        with self._lock:
            if self.model_instance is None:
                return True

            params = resolve_kv_and_batch_params(
                n_ctx=n_ctx,
                n_batch=n_batch,
                n_ubatch=n_ubatch,
                image_min_tokens=image_min_tokens,
                image_max_tokens=image_max_tokens,
                flash_attn=flash_attn,
                kv_cache_type_k=kv_cache_type_k,
                kv_cache_type_v=kv_cache_type_v,
            )
            normalized_mmproj = mmproj_path if (mmproj_path and mmproj_path != MMPROJ_NONE) else None
            desired_hw = self._build_hw_config(
                model_path,
                normalized_mmproj,
                n_gpu_layers,
                n_ctx,
                params,
                mmproj_offload,
            )
            if self._current_hw_config != desired_hw:
                return True

            if enable_thinking is not None:
                self.sync_thinking(enable_thinking)
            self.current_preserve_thinking = bool(preserve_thinking)
            return False

    def load_model(
        self,
        model_path: str,
        mmproj_path: Optional[str],
        n_gpu_layers: int,
        n_ctx: int,
        enable_thinking: bool = True,
        preserve_thinking: bool = False,
        *,
        n_batch: int = 2048,
        n_ubatch: int = 2048,
        image_min_tokens: int = 128,
        image_max_tokens: int = 1120,
        flash_attn: bool = True,
        kv_cache_type_k: str = "f16",
        kv_cache_type_v: str = "f16",
        mmproj_offload: bool = True,
    ) -> None:
        """Load GGUF model + optional multimodal projector with safe micro-batch & VRAM settings."""
        with self._lock:
            try:
                import llama_cpp  # type: ignore
                from llama_cpp import Llama  # type: ignore
                from llama_cpp.llama_chat_format import Gemma4ChatHandler  # type: ignore
            except ImportError as exc:
                raise ImportError(_IMPORT_ERROR_MSG) from exc

            try:
                from llama_cpp.llama_chat_format import Llava16ChatHandler  # type: ignore
            except ImportError:
                Llava16ChatHandler = None  # type: ignore

            if self.model_instance is not None or self.chat_handler is not None:
                logger.info("[%s] Unloading previous model before reload", self.cache_name)
                self.unload()

            preflight_vram_check(model_path=model_path, n_gpu_layers=n_gpu_layers)

            params = resolve_kv_and_batch_params(
                n_ctx=n_ctx,
                n_batch=n_batch,
                n_ubatch=n_ubatch,
                image_min_tokens=image_min_tokens,
                image_max_tokens=image_max_tokens,
                flash_attn=flash_attn,
                kv_cache_type_k=kv_cache_type_k,
                kv_cache_type_v=kv_cache_type_v,
            )
            type_k = resolve_ggml_type(llama_cpp, params["kv_cache_type_k"])
            type_v = resolve_ggml_type(llama_cpp, params["kv_cache_type_v"])

            normalized_mmproj = mmproj_path if (mmproj_path and mmproj_path != MMPROJ_NONE) else None
            llama_kwargs: dict[str, Any] = {
                "model_path": model_path,
                "n_gpu_layers": n_gpu_layers,
                "n_ctx": int(n_ctx),
                "n_batch": params["effective_n_batch"],
                "n_ubatch": params["effective_n_ubatch"],
                "flash_attn_type": params["flash_attn_type"],
                "type_k": type_k,
                "type_v": type_v,
                "offload_kqv": True,
                "swa_full": params["swa_full"],
                "verbose": False,
            }

            logger.info(
                "[%s] Loading model: %s (n_ctx=%d, n_batch=%d, n_ubatch=%d, fa=%s, kv=%s/%s, swa_full=False)",
                self.cache_name,
                model_path,
                n_ctx,
                params["effective_n_batch"],
                params["effective_n_ubatch"],
                params["flash_attn"],
                params["kv_cache_type_k"],
                params["kv_cache_type_v"],
            )

            chat_handler: Any = None
            if normalized_mmproj is None:
                logger.info("[%s] Loading in text-only mode (mmproj=None)", self.cache_name)
                self.model_instance = Llama(**llama_kwargs)
            else:
                logger.info(
                    "[%s] Loading mmproj: %s (use_gpu=%s, img_tokens=[%d, %d], batch_max_tokens=%d)",
                    self.cache_name,
                    normalized_mmproj,
                    mmproj_offload,
                    params["image_min_tokens"],
                    params["image_max_tokens"],
                    params["batch_max_tokens"],
                )
                try:
                    chat_handler = Gemma4ChatHandler(
                        clip_model_path=normalized_mmproj,
                        enable_thinking=enable_thinking,
                        use_gpu=mmproj_offload,
                        flash_attn=params["flash_attn"],
                        image_min_tokens=params["image_min_tokens"],
                        image_max_tokens=params["image_max_tokens"],
                        batch_max_tokens=params["batch_max_tokens"],
                        verbose=False,
                    )
                    self.model_instance = Llama(chat_handler=chat_handler, **llama_kwargs)
                except Exception as exc1:
                    self._safe_close_handler(chat_handler)
                    chat_handler = None
                    logger.warning("Gemma4ChatHandler failed: %s — trying Llava16ChatHandler", exc1)

                    if Llava16ChatHandler is not None:
                        try:
                            chat_handler = Llava16ChatHandler(
                                clip_model_path=normalized_mmproj,
                                verbose=False,
                            )
                            self.model_instance = Llama(chat_handler=chat_handler, **llama_kwargs)
                            logger.info("Model loaded with Llava16ChatHandler (fallback)")
                        except Exception as exc2:
                            self._safe_close_handler(chat_handler)
                            chat_handler = None
                            logger.warning("Llava16ChatHandler failed: %s — loading text-only", exc2)
                            self._load_text_only(Llama, llama_kwargs)
                    else:
                        logger.warning("Llava16ChatHandler not available — loading text-only")
                        self._load_text_only(Llama, llama_kwargs)

            self.chat_handler = chat_handler
            self.current_model_path = model_path
            self.current_mmproj_path = normalized_mmproj
            self.current_n_gpu_layers = n_gpu_layers
            self.current_n_ctx = int(n_ctx)
            self.current_enable_thinking = bool(enable_thinking)
            self.current_preserve_thinking = bool(preserve_thinking)
            self._current_hw_config = self._build_hw_config(
                model_path,
                normalized_mmproj,
                n_gpu_layers,
                n_ctx,
                params,
                mmproj_offload,
            )
            self.sync_thinking(enable_thinking)

    @staticmethod
    def _safe_close_handler(handler: Any) -> None:
        if handler is not None and callable(getattr(handler, "close", None)):
            try:
                handler.close()
            except Exception:
                pass

    def _load_text_only(self, llama_cls: Any, llama_kwargs: dict[str, Any]) -> None:
        """Fallback: load model without multimodal projector."""
        self.model_instance = llama_cls(**llama_kwargs)
        logger.warning(
            "Model loaded WITHOUT multimodal projector. Image/video/audio inputs will not work."
        )

    def unload(self, evict_comfy_models: bool = False) -> None:
        """Close and release cached LLM and multimodal projector handles cleanly."""
        with self._lock:
            unload_llm(
                self.model_instance,
                chat_handler=self.chat_handler,
                evict_comfy_models=evict_comfy_models,
            )
            self.model_instance = None
            self.chat_handler = None
            self.current_model_path = None
            self.current_mmproj_path = None
            self.current_n_gpu_layers = None
            self.current_n_ctx = None
            self.current_enable_thinking = None
            self.current_preserve_thinking = None
            self._current_hw_config = None


# ---------------------------------------------------------------------------
# Shared V3 node helpers (eliminating duplication across Gemma analyzer nodes)
# ---------------------------------------------------------------------------

def build_gemma_inputs(
    gguf_options: list[str],
    mmproj_options: list[str],
    preset_options: list[str],
    default_preset: str,
    default_n_ctx: int,
    n_ctx_tooltip: str,
    video_timing_input: Any,
    include_legacy_preserve_thinking: bool = False,
) -> list[Any]:
    """Return ordered ComfyUI V3 inputs shared across Gemma-4 multimodal analyzer nodes."""
    from comfy_api.latest import io  # lazy inside helper for unit-test isolation

    inputs: list[Any] = [
        io.Combo.Input("gguf_model", options=gguf_options, tooltip="GGUF model file from models/LLM (excludes mmproj files)"),
        io.Combo.Input("mmproj_model", options=mmproj_options, tooltip="Multimodal projector file (mmproj-*.gguf) or None for text-only inference."),
        io.Boolean.Input("use_custom_prompt", default=True, tooltip="When enabled, the custom system_prompt text is used. When disabled, the selected preset_prompt is used instead."),
        io.Combo.Input("preset_prompt", options=preset_options, default=default_preset, tooltip="Built-in system prompt preset. Only active when use_custom_prompt is disabled."),
        io.String.Input("system_prompt", multiline=True, default="You are a helpful multimodal analyzer.", tooltip="Custom system prompt. Only active when use_custom_prompt is enabled."),
        io.String.Input("user_prompt", multiline=True, default="Analyze the provided input."),
        io.Boolean.Input("enable_thinking", default=True, tooltip="Enable model reasoning / thinking mode"),
    ]
    if include_legacy_preserve_thinking:
        inputs.append(
            io.Boolean.Input(
                "preserve_thinking",
                default=False,
                tooltip="Legacy compatibility slot (no-op in single-turn Gemma-4 analysis; preserved so saved workflows keep widget alignment)",
            )
        )
    inputs.extend([
        io.Boolean.Input("strip_thinking_tags", default=True, tooltip="Remove thinking blocks from output"),
        io.Boolean.Input("unload_model", default=False, tooltip="Unload cached GGUF/mmproj handles from VRAM/RAM after inference"),
        io.Int.Input("max_tokens", default=1024, min=1, max=128000, step=1),
        io.Float.Input("temperature", default=0.8, min=0.0, max=2.0, step=0.05),
        io.Int.Input("top_k", default=40, min=0, max=500, step=1),
        io.Float.Input("top_p", default=0.95, min=0.0, max=1.0, step=0.01),
        io.Float.Input("min_p", default=0.05, min=0.0, max=1.0, step=0.01),
        io.Float.Input("repeat_penalty", default=1.1, min=0.0, max=3.0, step=0.05),
        io.Float.Input("presence_penalty", default=0.0, min=-2.0, max=2.0, step=0.1),
        io.Float.Input("frequency_penalty", default=0.0, min=-2.0, max=2.0, step=0.1),
        io.Int.Input("mirostat_mode", default=0, min=0, max=2, step=1),
        io.Float.Input("mirostat_tau", default=5.0, min=0.0, max=20.0, step=0.1),
        io.Float.Input("mirostat_eta", default=0.1, min=0.0, max=1.0, step=0.01),
        io.Int.Input("seed", default=-1, min=-1, max=0x7FFFFFFFFFFFFFFF),
        io.Int.Input("n_gpu_layers", default=-1, min=-1, max=200, step=1, tooltip="-1 = offload all layers to GPU"),
        io.Int.Input("n_ctx", default=default_n_ctx, min=512, max=131072, step=512, tooltip=n_ctx_tooltip),
        video_timing_input,
        io.Boolean.Input("mmproj_offload", default=True, tooltip="Offload the multimodal projector (mmproj) to GPU when available"),
        io.Boolean.Input("flash_attn", default=True, tooltip="Enable Flash Attention for lower VRAM and faster high-resolution inference"),
        io.Combo.Input("kv_cache_type_k", options=KV_CACHE_TYPES, default="f16", tooltip="Key KV cache quantization (q8_0/q4_0 save VRAM)"),
        io.Combo.Input("kv_cache_type_v", options=KV_CACHE_TYPES, default="f16", tooltip="Value KV cache quantization (requires flash_attn=True; falls back to f16 otherwise)"),
        io.Int.Input("n_batch", default=2048, min=512, max=16384, step=256, tooltip="Logical batch size for prompt and vision processing"),
        io.Int.Input("n_ubatch", default=2048, min=512, max=16384, step=256, tooltip="Physical micro-batch size (auto-raised to >= max(image_max_tokens, 1120) to prevent non-causal GGML_ASSERT crashes)"),
        io.Int.Input("image_min_tokens", default=128, min=64, max=2048, step=64, tooltip="Minimum visual tokens per image"),
        io.Int.Input("image_max_tokens", default=1120, min=128, max=4096, step=64, tooltip="Maximum visual tokens per image (1120 matches Gemma-4 projector cap)"),
        io.Image.Input("image", optional=True),
        io.Image.Input("reference_image", optional=True, tooltip="Reference image for style transfer"),
        io.Image.Input("video", optional=True, tooltip="Video frames as image batch [F, H, W, 3]"),
        io.Audio.Input("audio", optional=True),
    ])
    return inputs


def build_gemma_fingerprint(
    *,
    gguf_model: str,
    mmproj_model: str,
    seed: int,
    scalars: tuple[Any, ...],
    image: Any = None,
    reference_image: Any = None,
    video: Any = None,
    audio: Any = None,
) -> tuple | float:
    """Return ``NaN`` when ``seed == -1`` or a content/param hash tuple otherwise."""
    if int(seed) == -1:
        return float("nan")

    try:
        model_path = resolve_llm_subpath(gguf_model)
    except ValueError:
        model_path = None
    try:
        mmproj_path = resolve_llm_subpath(mmproj_model)
    except ValueError:
        mmproj_path = None

    return (
        fingerprint_file_signature(model_path),
        fingerprint_file_signature(mmproj_path),
        *scalars,
        fingerprint_tensor_value(image),
        fingerprint_tensor_value(reference_image),
        fingerprint_tensor_value(video),
        fingerprint_tensor_value(audio),
    )


def run_gemma_inference(
    *,
    cache: _GemmaModelCache,
    preset_prompts: dict[str, str],
    audio_encoder: Any,
    gguf_model: str,
    mmproj_model: str,
    use_custom_prompt: bool,
    preset_prompt: str,
    system_prompt: str,
    user_prompt: str,
    enable_thinking: bool,
    strip_thinking_tags: bool,
    max_tokens: int,
    temperature: float,
    top_k: int,
    top_p: float,
    min_p: float,
    repeat_penalty: float,
    presence_penalty: float,
    frequency_penalty: float,
    mirostat_mode: int,
    mirostat_tau: float,
    mirostat_eta: float,
    seed: int,
    n_gpu_layers: int,
    n_ctx: int,
    target_fps: float,
    mmproj_offload: bool = True,
    flash_attn: bool = True,
    kv_cache_type_k: str = "f16",
    kv_cache_type_v: str = "f16",
    n_batch: int = 2048,
    n_ubatch: int = 2048,
    image_min_tokens: int = 128,
    image_max_tokens: int = 1120,
    image: Any = None,
    reference_image: Any = None,
    video: Any = None,
    audio: Any = None,
) -> str:
    """Execute validated, context-budgeted, interruptible Gemma-4 multimodal inference."""
    from .media import (
        compute_effective_image_max_tokens,
        image_tensor_batch_to_data_uris,
        video_tensor_to_frame_list,
    )

    model_path = resolve_llm_subpath(gguf_model)
    if not model_path or not os.path.isfile(model_path):
        raise FileNotFoundError(
            f"GGUF model not found: '{gguf_model}'. Ensure it is placed in ComfyUI/models/LLM/"
        )

    use_mmproj = bool(mmproj_model) and mmproj_model != MMPROJ_NONE
    mmproj_path = resolve_llm_subpath(mmproj_model) if use_mmproj else None
    if use_mmproj and (not mmproj_path or not os.path.isfile(mmproj_path)):
        raise FileNotFoundError(
            f"Multimodal projector not found: '{mmproj_model}'. "
            "Both the model .gguf and its mmproj-*.gguf must reside together in ComfyUI/models/LLM/"
        )

    warn_on_projector_choice(gguf_model, mmproj_model)

    if use_custom_prompt:
        effective_system_prompt = system_prompt
        logger.info("Using custom system prompt")
    else:
        effective_system_prompt = preset_prompts.get(preset_prompt, system_prompt)
        logger.info("Using preset system prompt: %s", preset_prompt)
        if preset_prompt == "Style Transfer Prompt" and reference_image is None:
            logger.warning(
                "Style Transfer Prompt selected but no reference_image connected. "
                "The style transfer prompt expects both an input image and a reference image."
            )

    if cache.needs_reload(
        model_path,
        mmproj_path,
        n_gpu_layers,
        n_ctx,
        enable_thinking=enable_thinking,
        n_batch=n_batch,
        n_ubatch=n_ubatch,
        image_min_tokens=image_min_tokens,
        image_max_tokens=image_max_tokens,
        flash_attn=flash_attn,
        kv_cache_type_k=kv_cache_type_k,
        kv_cache_type_v=kv_cache_type_v,
        mmproj_offload=mmproj_offload,
    ):
        cache.load_model(
            model_path,
            mmproj_path,
            n_gpu_layers,
            n_ctx,
            enable_thinking=enable_thinking,
            n_batch=n_batch,
            n_ubatch=n_ubatch,
            image_min_tokens=image_min_tokens,
            image_max_tokens=image_max_tokens,
            flash_attn=flash_attn,
            kv_cache_type_k=kv_cache_type_k,
            kv_cache_type_v=kv_cache_type_v,
            mmproj_offload=mmproj_offload,
        )

    user_content: list[dict[str, Any]] = [
        {"type": "text", "text": user_prompt},
    ]

    has_media_inputs = any(x is not None for x in (image, reference_image, video, audio))
    video_frames: list[dict[str, Any]] = []
    if has_media_inputs and mmproj_path is None:
        logger.warning("mmproj_model is 'None' (text-only mode); connected media inputs are ignored.")
    else:
        img_count = 0
        if image is not None:
            img_count += int(image.shape[0]) if image.ndim == 4 else 1
        if reference_image is not None:
            img_count += int(reference_image.shape[0]) if reference_image.ndim == 4 else 1

        per_img_budget = compute_effective_image_max_tokens(
            image_max_tokens,
            media_count=max(1, img_count),
            n_ctx=n_ctx,
            reserved_text_tokens=max(1024, (len(effective_system_prompt) + len(user_prompt)) // 3 + 256),
        )

        if image is not None:
            if reference_image is not None:
                user_content.append({"type": "text", "text": "Input Image:"})
            user_content.extend(
                image_tensor_batch_to_data_uris(image, effective_image_max_tokens=per_img_budget)
            )

        if reference_image is not None:
            user_content.append({"type": "text", "text": "Reference Image:"})
            user_content.extend(
                image_tensor_batch_to_data_uris(reference_image, effective_image_max_tokens=per_img_budget)
            )

        if video is not None:
            video_frames = video_tensor_to_frame_list(
                video,
                target_fps=target_fps,
                n_ctx=n_ctx,
                image_max_tokens=image_max_tokens,
            )
            user_content.extend(video_frames)

        if audio is not None:
            try:
                user_content.append(audio_encoder(audio))
            except Exception as e:
                logger.warning("Audio encoding failed: %s — adding text fallback", e)
                user_content.append({
                    "type": "text",
                    "text": f"[Attached unsupported audio file — could not be processed. Error: {e}]",
                })

        guard_context_budget(
            n_ctx=n_ctx,
            image_max_tokens=image_max_tokens,
            system_prompt=effective_system_prompt,
            user_prompt=user_prompt,
            media_tensors=[image, reference_image],
            video_frame_count=len(video_frames),
            audio_present=(audio is not None),
        )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": effective_system_prompt},
        {"role": "user", "content": user_content},
    ]

    if not enable_thinking:
        if temperature == 0.8:
            temperature = 0.7
            logger.info("Thinking disabled: temperature auto-adjusted to 0.7")
        if presence_penalty == 0.0:
            presence_penalty = 1.5
            logger.info("Thinking disabled: presence_penalty auto-adjusted to 1.5")

    response_text = run_chat_completion_with_interrupt(
        cache.model_instance,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        top_k=top_k,
        top_p=top_p,
        min_p=min_p,
        repeat_penalty=repeat_penalty,
        present_penalty=presence_penalty,
        frequency_penalty=frequency_penalty,
        mirostat_mode=mirostat_mode,
        mirostat_tau=mirostat_tau,
        mirostat_eta=mirostat_eta,
        seed=seed if seed >= 0 else None,
    )

    if strip_thinking_tags:
        response_text = strip_thinking_blocks(response_text)

    return response_text


def execute_gemma_node(node_tag: str, cache: _GemmaModelCache, unload_model: bool, **inference_kwargs) -> Any:
    """Shared ComfyUI V3 ``execute`` wrapper handling interrupts, errors, and unloading."""
    from comfy_api.latest import io

    try:
        result = run_gemma_inference(cache=cache, **inference_kwargs)
        return io.NodeOutput(result)
    except FileNotFoundError as e:
        error_msg = f"[{node_tag}] File not found: {e}"
        logger.error(error_msg)
        return io.NodeOutput(error_msg)
    except ValueError as e:
        error_msg = f"[{node_tag}] Validation error: {e}"
        logger.error(error_msg)
        return io.NodeOutput(error_msg)
    except Exception as e:
        if type(e).__name__ == "InterruptProcessingException":
            raise
        error_msg = f"[{node_tag}] Inference failed: {e}"
        logger.error(error_msg, exc_info=True)
        return io.NodeOutput(error_msg)
    finally:
        if unload_model:
            logger.info("Unloading model (unload_model=True)")
            cache.unload()
