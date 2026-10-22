"""
Omni Model Node (Qwen2.5-Omni GGUF) — ComfyUI Nodes 2.0 Schema V3.

Provides local, hardware-accelerated multimodal LLM inference across Text,
Image (up to 10 slots), Audio (up to 2 slots), and Video (up to 2 slots)
using Qwen2.5-Omni GGUF weights and llama.cpp's native libmtmd vision/audio
projector pipeline.
"""

from __future__ import annotations

import base64
import gc
import hashlib
import inspect
import io as stdlib_io
import logging
import os
import threading
import wave
from typing import Any, Optional

import folder_paths  # type: ignore  — provided by ComfyUI runtime
import numpy as np
import torch
import torch.nn.functional as F
from comfy_api.latest import io
from PIL import Image

logger = logging.getLogger(__name__)

MAX_IMAGE_SLOTS = 10
MAX_AUDIO_SLOTS = 2
MAX_VIDEO_SLOTS = 2
TARGET_AUDIO_SAMPLE_RATE = 16000

DEFAULT_SYSTEM_PROMPT = (
    "You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, "
    "capable of perceiving auditory and visual inputs, as well as generating "
    "text and speech."
)
DEFAULT_USER_PROMPT = "Describe the provided media in comprehensive detail."
NO_MODELS_PLACEHOLDER = "No GGUF models found in models/LLM"


# ============================================================================
# 1. Folder Registration & Recursive GGUF / MMPROJ Discovery
# ============================================================================

def _ensure_llm_folder_registered() -> None:
    """Ensure `models/LLM` is registered with ComfyUI's `folder_paths`."""
    llm_base_dir = os.path.join(folder_paths.models_dir, "LLM")
    os.makedirs(llm_base_dir, exist_ok=True)
    if "LLM" not in folder_paths.folder_names_and_paths:
        folder_paths.add_model_folder_path("LLM", llm_base_dir)
    else:
        existing_paths = folder_paths.get_folder_paths("LLM")
        if llm_base_dir not in existing_paths:
            folder_paths.add_model_folder_path("LLM", llm_base_dir)


_ensure_llm_folder_registered()


def _omni_sort_key(rel_path: str) -> tuple[int, str]:
    """Sort `Omni_Modal/` models first so Qwen2.5-Omni is the default option."""
    norm = rel_path.replace("\\", "/").lower()
    is_omni = 0 if ("omni_modal/" in norm or "omni" in norm) else 1
    return (is_omni, norm)


def get_llm_And_mmproj_lists() -> tuple[list[str], list[str]]:
    """Recursively scan `models/LLM` for `.gguf` models and `mmproj` projectors.

    Rules:
      - Excludes `.imatrix.gguf` calibration data files.
      - Routes files containing `mmproj` in their basename to `mmproj_list`.
      - Routes all remaining `.gguf` files to `models_list`.
      - Prioritizes `Omni_Modal/` entries so Qwen2.5-Omni is selected by default.
    """
    _ensure_llm_folder_registered()
    try:
        all_files = folder_paths.get_filename_list("LLM")
    except Exception:
        all_files = []

    models_list: list[str] = []
    mmproj_list: list[str] = []

    for f in all_files:
        norm_f = f.replace("\\", "/")
        lower_f = norm_f.lower()
        if not lower_f.endswith(".gguf"):
            continue
        basename = os.path.basename(lower_f)
        if "imatrix" in basename:
            continue
        if "mmproj" in basename:
            mmproj_list.append(norm_f)
        else:
            models_list.append(norm_f)

    models_list.sort(key=_omni_sort_key)
    mmproj_list.sort(key=_omni_sort_key)

    if not models_list:
        models_list = [NO_MODELS_PLACEHOLDER]
    if "none" not in mmproj_list:
        mmproj_list.append("none")

    return models_list, mmproj_list


# Standard snake_case alias for callers
get_llm_and_mmproj_lists = get_llm_And_mmproj_lists


def _is_safe_relpath(rel_path: str) -> bool:
    """Validate that a relative model path contains no traversal or drive segments."""
    if not rel_path or not isinstance(rel_path, str):
        return False
    if ":" in rel_path:
        return False
    if rel_path.startswith(("/", "\\")):
        return False
    norm = rel_path.replace("\\", "/")
    parts = [p for p in norm.split("/") if p]
    if not parts or any(p == ".." for p in parts):
        return False
    return True


def resolve_llm_subpath(rel_path: str) -> str:
    """Safely resolve a relative path under `models/LLM` with path-traversal protection."""
    if not rel_path or rel_path in ("none", "None", NO_MODELS_PLACEHOLDER):
        return ""

    if not _is_safe_relpath(rel_path):
        raise ValueError(
            f"[Duffy_OmniModelNode] Unsafe or invalid model path rejected: '{rel_path}'"
        )

    _ensure_llm_folder_registered()
    base_dirs = [os.path.realpath(b) for b in folder_paths.get_folder_paths("LLM")]

    os_rel_path = os.path.normpath(rel_path)
    try:
        direct = folder_paths.get_full_path("LLM", os_rel_path)
    except Exception:
        direct = None

    candidates: list[str] = []
    if direct:
        candidates.append(direct)
    for base in base_dirs:
        candidates.append(os.path.join(base, os_rel_path))

    for candidate in candidates:
        real_candidate = os.path.realpath(candidate)
        for real_base in base_dirs:
            try:
                common = os.path.commonpath([real_base, real_candidate])
            except ValueError:
                continue
            if common == real_base and os.path.isfile(real_candidate):
                return real_candidate

    raise FileNotFoundError(
        f"[Duffy_OmniModelNode] Could not locate GGUF file '{rel_path}' inside models/LLM."
    )


# ============================================================================
# 2. GGUF Header Inspection & Thread-Safe Runtime Model Cache
# ============================================================================

def _inspect_and_sanitize_mmproj(mmproj_path: str) -> tuple[bool, bool]:
    """Inspect an `mmproj` GGUF file's tensors and repair broken `clip.has_audio_encoder` metadata.

    Some community quantizations (e.g. `mradermacher/Qwen2.5-Omni-7B-abliterated-i1-GGUF`)
    set `clip.has_audio_encoder = True` in the GGUF header while exporting only the vision
    tensors (`v.*` and `mm.*`) and zero audio encoder tensors (`a.*`). When `mtmd_init_from_file`
    reads `clip.has_audio_encoder = True`, it aborts with:
        `unable to find tensor a.blk.0.attn_out.weight`
    even for image/video inference.

    This helper detects that exact mismatch and safely flips the 1-byte boolean flag
    `clip.has_audio_encoder` to `False` (`0x00`) so `libmtmd` can load the vision projector.

    Returns:
        `(has_vision_tensors, has_audio_tensors)`
    """
    if not mmproj_path or not os.path.isfile(mmproj_path):
        return (False, False)

    try:
        import gguf  # type: ignore

        reader = gguf.GGUFReader(mmproj_path, mode="r")
        prefixes = {t.name.split(".", 1)[0] for t in reader.tensors}
        has_vision = "v" in prefixes
        has_audio = "a" in prefixes

        audio_field = reader.fields.get("clip.has_audio_encoder")
        if audio_field is not None:
            claimed_audio = bool(audio_field.parts[-1][0])
            del reader
            if claimed_audio and not has_audio:
                # Verify exact byte signature before patching the 1-byte GGUF bool
                sig = b"clip.has_audio_encoder\x07\x00\x00\x00"
                with open(mmproj_path, "r+b") as fp:
                    header_chunk = fp.read(65536)
                    idx = header_chunk.find(sig)
                    if idx != -1:
                        bool_offset = idx + len(sig)
                        if header_chunk[bool_offset : bool_offset + 1] == b"\x01":
                            fp.seek(bool_offset)
                            fp.write(b"\x00")
                            fp.flush()
                            logger.warning(
                                "[Duffy_OmniModelNode] Repaired mismatched GGUF metadata in '%s': "
                                "'clip.has_audio_encoder' was True, but the file contains no 'a.*' "
                                "audio encoder tensors (found prefixes: %s).",
                                os.path.basename(mmproj_path),
                                sorted(prefixes),
                            )
        else:
            del reader

        return (has_vision, has_audio)
    except Exception as exc:
        logger.debug("[Duffy_OmniModelNode] GGUF mmproj inspection skipped: %s", exc)
        return (True, True)


def _soft_empty_cache() -> None:
    """Release cached allocator blocks via ComfyUI's device-agnostic memory manager."""
    try:
        import comfy.model_management  # type: ignore

        comfy.model_management.soft_empty_cache()
    except Exception as exc:
        logger.debug("comfy.model_management.soft_empty_cache skipped: %s", exc)


def _configure_mtmd_chat_handler(llm: Any) -> None:
    """Ensure `GenericMTMDChatHandler` recognizes Qwen2.5-Omni uppercase media tags
    (`<|IMAGE|>`, `<|AUDIO|>`, `<|VIDEO|>`) and `input_audio` content blocks.
    """
    handler = getattr(llm, "chat_handler", None)
    if handler is None:
        return

    extra_tags = ("<|IMAGE|>", "<|AUDIO|>", "<|VIDEO|>")
    known = list(getattr(handler, "KNOWN_MEDIA_TAGS", []))
    for tag in extra_tags:
        if tag not in known:
            known.append(tag)
    handler.KNOWN_MEDIA_TAGS = known

    chat_fmt = getattr(handler, "chat_format", None)
    if isinstance(chat_fmt, str):
        if "'audio_url' in content" in chat_fmt and "input_audio" not in chat_fmt:
            chat_fmt = chat_fmt.replace(
                "'audio_url' in content",
                "'audio_url' in content or 'input_audio' in content",
            )
            handler.chat_format = chat_fmt
            if hasattr(handler, "_change_chat_template"):
                handler._change_chat_template(chat_fmt)
        parser_tags = list(getattr(handler, "_chat_format_parser_tags", []))
        for tag in extra_tags:
            if tag in chat_fmt and tag not in parser_tags:
                parser_tags.append(tag)
        handler._chat_format_parser_tags = parser_tags
        handler._template_initialized = False


class _OmniRuntimeCache:
    """Thread-safe singleton cache for the loaded `Llama` and `mtmd` projector."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.llm: Optional[Any] = None
        self.chat_handler: Optional[Any] = None
        self.config_key: Optional[tuple[Any, ...]] = None
        self.mmproj_has_vision: bool = False
        self.mmproj_has_audio: bool = False

    def unload(self) -> None:
        """Deterministically free C++ `ggml` / `mtmd` contexts and flush VRAM."""
        with self._lock:
            self._unload_unlocked()

    def _unload_unlocked(self) -> None:
        if self.chat_handler is not None:
            try:
                if hasattr(self.chat_handler, "close"):
                    self.chat_handler.close()
                elif hasattr(self.chat_handler, "_exit_stack"):
                    self.chat_handler._exit_stack.close()
            except Exception as exc:
                logger.debug("Chat handler teardown warning: %s", exc)
            self.chat_handler = None

        if self.llm is not None:
            try:
                if hasattr(self.llm, "close"):
                    self.llm.close()
            except Exception as exc:
                logger.debug("Llama close warning: %s", exc)
            del self.llm
            self.llm = None

        self.config_key = None
        self.mmproj_has_vision = False
        self.mmproj_has_audio = False
        gc.collect()
        _soft_empty_cache()

    def get_or_load(
        self,
        model_path: str,
        mmproj_path: str,
        n_ctx: int,
        n_gpu_layers: int,
        flash_attn: bool,
    ) -> Any:
        """Return a cached `Llama` instance or load a new one if configuration changed."""
        with self._lock:
            target_key = (
                model_path,
                mmproj_path,
                int(n_ctx),
                int(n_gpu_layers),
                bool(flash_attn),
            )
            if self.llm is not None and self.config_key == target_key:
                return self.llm

            # Configuration changed or no model loaded: release previous C++ contexts first
            self._unload_unlocked()

            try:
                import llama_cpp  # type: ignore
                from llama_cpp import Llama  # type: ignore
            except ImportError as exc:
                raise RuntimeError(
                    "[Duffy_OmniModelNode] 'llama_cpp' (llama-cpp-python with mtmd support) "
                    "is not installed in this Python environment."
                ) from exc

            # Resolve flash_attn parameter across llama-cpp-python versions:
            # v0.3.48+ (JamePeng fork) uses `flash_attn_type` (1 = ENABLED, 0 = DISABLED)
            llama_sig = inspect.signature(Llama.__init__).parameters
            flash_kwargs: dict[str, Any] = {}
            if "flash_attn_type" in llama_sig:
                flash_kwargs["flash_attn_type"] = 1 if flash_attn else 0
            else:
                flash_kwargs["flash_attn"] = bool(flash_attn)

            chat_handler = None
            llama_kwargs: dict[str, Any] = {
                "model_path": model_path,
                "n_ctx": int(n_ctx),
                "n_gpu_layers": int(n_gpu_layers),
                "verbose": False,
                **flash_kwargs,
            }

            if mmproj_path and os.path.isfile(mmproj_path):
                has_vision, has_audio = _inspect_and_sanitize_mmproj(mmproj_path)
                self.mmproj_has_vision = has_vision
                self.mmproj_has_audio = has_audio
                if "mmproj_path" in llama_sig:
                    # Modern JamePeng fork (v0.3.48+) natively constructs GenericMTMDChatHandler
                    llama_kwargs["mmproj_path"] = mmproj_path
                    if "chat_handler_kwargs" in llama_sig:
                        llama_kwargs["chat_handler_kwargs"] = {"verbose": False}
                else:
                    # Fallback for older forks exposing explicit chat handlers
                    try:
                        from llama_cpp import llama_chat_format  # type: ignore

                        for handler_attr in (
                            "Qwen25OmniChatHandler",
                            "MtmdChatHandler",
                            "Qwen25VLChatHandler",
                            "Llava15ChatHandler",
                        ):
                            if hasattr(llama_chat_format, handler_attr):
                                handler_cls = getattr(llama_chat_format, handler_attr)
                                chat_handler = handler_cls(
                                    clip_model_path=mmproj_path,
                                    verbose=False,
                                )
                                break
                    except Exception as exc:
                        logger.warning(
                            "[Duffy_OmniModelNode] Explicit chat handler init failed: %s",
                            exc,
                        )
                    if chat_handler is not None:
                        llama_kwargs["chat_handler"] = chat_handler

            try:
                self.llm = Llama(**llama_kwargs)
            except Exception as init_err:
                # Automatic fallback without Flash Attention if driver/quantization rejects it
                if flash_attn:
                    logger.warning(
                        "[Duffy_OmniModelNode] Flash Attention initialization failed (%s); "
                        "retrying with Flash Attention disabled.",
                        init_err,
                    )
                    if "flash_attn_type" in llama_sig:
                        llama_kwargs["flash_attn_type"] = 0
                    else:
                        llama_kwargs["flash_attn"] = False
                    self.llm = Llama(**llama_kwargs)
                else:
                    raise

            _configure_mtmd_chat_handler(self.llm)
            self.chat_handler = getattr(self.llm, "chat_handler", chat_handler)
            self.config_key = target_key
            return self.llm


_RUNTIME_CACHE = _OmniRuntimeCache()


# ============================================================================
# 3. Multimodal Preprocessors (Pure PyTorch + Stdlib — Zero torchaudio)
# ============================================================================

def comfy_image_to_data_uris(image_tensor: torch.Tensor) -> list[str]:
    """Convert a ComfyUI `IMAGE` tensor (`[B, H, W, C]` or `[H, W, C]`, float32 `[0, 1]`)
    into a list of base64-encoded PNG data URIs.
    """
    if image_tensor is None:
        return []

    tensor = image_tensor.detach().cpu()
    if tensor.ndim == 3:
        tensor = tensor.unsqueeze(0)
    if tensor.ndim != 4:
        raise ValueError(
            f"[Duffy_OmniModelNode] Expected 3D or 4D IMAGE tensor, got shape {tuple(tensor.shape)}."
        )

    uris: list[str] = []
    batch_size = tensor.shape[0]
    for b in range(batch_size):
        frame = torch.clamp(tensor[b], 0.0, 1.0)
        arr = (frame * 255.0).round().to(torch.uint8).numpy()
        if arr.ndim == 3 and arr.shape[2] == 1:
            pil_img = Image.fromarray(arr[:, :, 0], mode="L").convert("RGB")
        elif arr.ndim == 3 and arr.shape[2] == 4:
            pil_img = Image.fromarray(arr, mode="RGBA").convert("RGB")
        else:
            pil_img = Image.fromarray(arr, mode="RGB")

        buf = stdlib_io.BytesIO()
        pil_img.save(buf, format="PNG")
        b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
        uris.append(f"data:image/png;base64,{b64_str}")

    return uris


def comfy_audio_to_input_audio_list(
    audio_dict: dict[str, Any],
    target_sr: int = TARGET_AUDIO_SAMPLE_RATE,
) -> list[dict[str, str]]:
    """Convert a ComfyUI `AUDIO` dict (`{"waveform": [B, C, N], "sample_rate": int}`)
    into a list of 16 kHz Mono 16-bit PCM WAV base64 payloads for `input_audio`.

    Uses pure PyTorch (`torch.nn.functional.interpolate`) and stdlib `wave` so no
    `torchaudio` or `soundfile` dependency is required.
    """
    if not audio_dict or "waveform" not in audio_dict:
        return []

    waveform: torch.Tensor = audio_dict["waveform"].detach().cpu().to(torch.float32)
    orig_sr: int = int(audio_dict.get("sample_rate", target_sr))
    if orig_sr <= 0:
        orig_sr = target_sr

    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0).unsqueeze(0)  # [1, 1, N]
    elif waveform.ndim == 2:
        waveform = waveform.unsqueeze(0)  # [1, C, N]
    elif waveform.ndim != 3:
        raise ValueError(
            f"[Duffy_OmniModelNode] Expected AUDIO waveform of shape [B, C, N], got {tuple(waveform.shape)}."
        )

    results: list[dict[str, str]] = []
    batch_size = waveform.shape[0]

    for b in range(batch_size):
        wave_item = waveform[b]  # [C, N]
        if wave_item.numel() == 0:
            continue

        # 1. Downmix multi-channel audio to mono [1, N]
        if wave_item.shape[0] > 1:
            mono = wave_item.mean(dim=0, keepdim=True)
        else:
            mono = wave_item

        # 2. Resample to 16000 Hz using linear interpolation
        if orig_sr != target_sr and mono.shape[-1] > 0:
            target_len = max(1, int(round(mono.shape[-1] * (float(target_sr) / float(orig_sr)))))
            mono_3d = mono.unsqueeze(0)  # [1, 1, N]
            resampled_3d = F.interpolate(
                mono_3d,
                size=target_len,
                mode="linear",
                align_corners=False,
            )
            mono = resampled_3d.squeeze(0)  # [1, target_len]

        # 3. Clamp to [-1.0, 1.0] and quantize to signed 16-bit PCM
        clamped = torch.clamp(mono.squeeze(0), -1.0, 1.0)
        pcm16_np = (clamped * 32767.0).round().to(torch.int16).numpy()

        # 4. Pack RIFF WAV header + little-endian PCM16 frames in memory
        wav_buf = stdlib_io.BytesIO()
        with wave.open(wav_buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 16-bit = 2 bytes
            wf.setframerate(target_sr)
            wf.writeframes(pcm16_np.tobytes())

        b64_wav = base64.b64encode(wav_buf.getvalue()).decode("utf-8")
        results.append({
            "data": b64_wav,
            "format": "wav",
        })

    return results


def extract_comfy_video(
    video_obj: Any,
    max_frames: int,
) -> tuple[list[str], list[dict[str, str]]]:
    """Decompose a ComfyUI `VIDEO` (`VideoInput`) into uniformly sampled frame PNG
    data URIs and optional resampled 16 kHz mono WAV audio payloads.
    """
    if video_obj is None:
        return [], []

    frames_uris: list[str] = []
    audio_payloads: list[dict[str, str]] = []
    max_frames = max(1, int(max_frames))

    if hasattr(video_obj, "get_components"):
        components = video_obj.get_components()
        images_tensor = getattr(components, "images", None)
        audio_dict = getattr(components, "audio", None)

        if images_tensor is not None and images_tensor.shape[0] > 0:
            total_frames = int(images_tensor.shape[0])
            if total_frames > max_frames:
                indices = torch.linspace(0, total_frames - 1, steps=max_frames).long()
                sampled_frames = images_tensor[indices]
            else:
                sampled_frames = images_tensor
            frames_uris = comfy_image_to_data_uris(sampled_frames)

        if audio_dict is not None:
            audio_payloads = comfy_audio_to_input_audio_list(audio_dict)

    elif isinstance(video_obj, dict):
        images_tensor = video_obj.get("images")
        audio_dict = video_obj.get("audio")
        if isinstance(images_tensor, torch.Tensor) and images_tensor.shape[0] > 0:
            total_frames = int(images_tensor.shape[0])
            if total_frames > max_frames:
                indices = torch.linspace(0, total_frames - 1, steps=max_frames).long()
                sampled_frames = images_tensor[indices]
            else:
                sampled_frames = images_tensor
            frames_uris = comfy_image_to_data_uris(sampled_frames)
        if isinstance(audio_dict, dict):
            audio_payloads = comfy_audio_to_input_audio_list(audio_dict)

    elif isinstance(video_obj, torch.Tensor):
        total_frames = int(video_obj.shape[0]) if video_obj.ndim >= 4 else 1
        if video_obj.ndim >= 4 and total_frames > max_frames:
            indices = torch.linspace(0, total_frames - 1, steps=max_frames).long()
            sampled = video_obj[indices]
        else:
            sampled = video_obj
        frames_uris = comfy_image_to_data_uris(sampled)

    return frames_uris, audio_payloads


# ============================================================================
# 4. Fingerprinting Helpers
# ============================================================================

def _file_signature(rel_path: str) -> tuple[str, int, int]:
    """Return `(realpath, mtime_ns, size)` for cache fingerprinting without raising."""
    if not rel_path or rel_path in ("none", "None", NO_MODELS_PLACEHOLDER):
        return ("none", 0, 0)
    try:
        resolved = resolve_llm_subpath(rel_path)
        if resolved and os.path.isfile(resolved):
            st = os.stat(resolved)
            return (resolved, int(st.st_mtime_ns), int(st.st_size))
    except Exception:
        pass
    return (str(rel_path), 0, 0)


def _media_signature(val: Any) -> str:
    """Compute a fast, lightweight summary string for connected media inputs."""
    if val is None:
        return "none"
    if isinstance(val, torch.Tensor):
        t = val.detach()
        mean_val = float(t.float().mean().item()) if t.numel() > 0 else 0.0
        return f"tensor:{tuple(t.shape)}:{t.dtype}:{mean_val:.6f}"
    if isinstance(val, dict) and "waveform" in val:
        wf = val["waveform"]
        sr = val.get("sample_rate", 0)
        if isinstance(wf, torch.Tensor):
            mean_val = float(wf.detach().float().mean().item()) if wf.numel() > 0 else 0.0
            return f"audio:{tuple(wf.shape)}:{sr}:{mean_val:.6f}"
    if hasattr(val, "get_components"):
        try:
            comp = val.get_components()
            imgs = getattr(comp, "images", None)
            aud = getattr(comp, "audio", None)
            return f"video:{_media_signature(imgs)}:{_media_signature(aud)}"
        except Exception:
            return f"video_obj:{id(val)}"
    return str(type(val))


# ============================================================================
# 5. Schema V3 Node Definition
# ============================================================================

class DuffyOmniModelNode(io.ComfyNode):
    """Omni-Modal LLM node supporting Text, Image (up to 10), Audio (up to 2),
    and Video (up to 2) inputs via Qwen2.5-Omni GGUF and `llama.cpp` `mtmd`.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        models_list, mmproj_list = get_llm_And_mmproj_lists()
        default_model = models_list[0] if models_list else NO_MODELS_PLACEHOLDER
        default_mmproj = mmproj_list[0] if mmproj_list else "none"

        image_inputs = [
            io.Image.Input(
                f"image_{i}",
                display_name=f"Image {i}",
                optional=True,
                tooltip=f"Optional image input slot {i} (supports single image or image batch).",
            )
            for i in range(1, MAX_IMAGE_SLOTS + 1)
        ]

        audio_inputs = [
            io.Audio.Input(
                f"audio_{i}",
                display_name=f"Audio {i}",
                optional=True,
                tooltip=f"Optional audio input slot {i} (automatically resampled to 16 kHz mono WAV).",
            )
            for i in range(1, MAX_AUDIO_SLOTS + 1)
        ]

        video_inputs = [
            io.Video.Input(
                f"video_{i}",
                display_name=f"Video {i}",
                optional=True,
                tooltip=(
                    f"Optional video input slot {i} (decomposed into uniformly sampled "
                    "frames and extracted audio track)."
                ),
            )
            for i in range(1, MAX_VIDEO_SLOTS + 1)
        ]

        return io.Schema(
            node_id="Duffy_OmniModelNode",
            display_name="Omni Model Node (Qwen2.5-Omni GGUF)",
            category="Duffy/LLM",
            description=(
                "Local omni-modal LLM inference (Text, Image, Audio, Video) powered by "
                "Qwen2.5-Omni GGUF and llama.cpp's libmtmd vision/audio projector."
            ),
            inputs=[
                io.Combo.Input(
                    "model_name",
                    display_name="Model (GGUF)",
                    options=models_list,
                    default=default_model,
                    tooltip="Primary Qwen2.5-Omni GGUF language model from models/LLM (excludes imatrix and mmproj files).",
                ),
                io.Combo.Input(
                    "mmproj_name",
                    display_name="Multimodal Projector (mmproj)",
                    options=mmproj_list,
                    default=default_mmproj,
                    tooltip="Unified vision + audio multimodal projector (*mmproj*.gguf) required for image, audio, and video inputs.",
                ),
                io.Boolean.Input(
                    "unload_model",
                    display_name="Unload Model After Run",
                    default=False,
                    tooltip="When enabled, deterministically unloads the LLM and mmproj from VRAM immediately after generation.",
                ),
                io.Int.Input(
                    "n_gpu_layers",
                    display_name="GPU Layers",
                    default=-1,
                    min=-1,
                    max=200,
                    step=1,
                    tooltip="Number of transformer layers to offload to GPU (-1 = offload all layers).",
                ),
                io.Int.Input(
                    "n_ctx",
                    display_name="Context Length (n_ctx)",
                    default=8192,
                    min=512,
                    max=131072,
                    step=512,
                    tooltip="Maximum context window in tokens (increase to 8192–16384+ when passing multiple images, audio, or video frames).",
                ),
                io.Boolean.Input(
                    "flash_attn",
                    display_name="Flash Attention",
                    default=True,
                    tooltip="Enable Flash Attention for faster prefill and reduced KV-cache VRAM consumption.",
                ),
                io.String.Input(
                    "system_prompt",
                    display_name="System Prompt",
                    multiline=True,
                    default=DEFAULT_SYSTEM_PROMPT,
                    tooltip="System instruction defining the persona and behavior of Qwen2.5-Omni.",
                ),
                io.String.Input(
                    "user_prompt",
                    display_name="User Prompt",
                    multiline=True,
                    default=DEFAULT_USER_PROMPT,
                    tooltip="User prompt or instruction for analyzing the connected media and generating a response.",
                ),
                io.Int.Input(
                    "max_tokens",
                    display_name="Max New Tokens",
                    default=1024,
                    min=1,
                    max=32768,
                    step=1,
                    tooltip="Maximum number of tokens to generate in the completion.",
                ),
                io.Float.Input(
                    "temperature",
                    display_name="Temperature",
                    default=0.7,
                    min=0.0,
                    max=2.0,
                    step=0.05,
                    tooltip="Sampling temperature (0.0 = deterministic greedy decoding; higher = more creative).",
                ),
                io.Float.Input(
                    "top_p",
                    display_name="Top-P",
                    default=0.9,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    tooltip="Nucleus sampling probability threshold.",
                ),
                io.Int.Input(
                    "top_k",
                    display_name="Top-K",
                    default=40,
                    min=0,
                    max=200,
                    step=1,
                    tooltip="Top-K sampling cutoff (0 disables Top-K filtering).",
                ),
                io.Float.Input(
                    "repeat_penalty",
                    display_name="Repeat Penalty",
                    default=1.10,
                    min=0.5,
                    max=2.0,
                    step=0.05,
                    tooltip="Multiplicative penalty applied to repeated tokens.",
                ),
                io.Float.Input(
                    "presence_penalty",
                    display_name="Presence Penalty",
                    default=0.0,
                    min=-2.0,
                    max=2.0,
                    step=0.05,
                    tooltip="Flat additive penalty applied to tokens that have appeared at least once.",
                ),
                io.Float.Input(
                    "frequency_penalty",
                    display_name="Frequency Penalty",
                    default=0.0,
                    min=-2.0,
                    max=2.0,
                    step=0.05,
                    tooltip="Additive penalty proportional to how often a token has already appeared.",
                ),
                io.Int.Input(
                    "seed",
                    display_name="Seed",
                    default=42,
                    min=0,
                    max=0xFFFFFFFFFFFFFFFF,
                    step=1,
                    control_after_generate=True,
                    tooltip="Random seed for reproducible token sampling.",
                ),
                io.Int.Input(
                    "max_video_frames",
                    display_name="Max Video Frames",
                    default=8,
                    min=1,
                    max=64,
                    step=1,
                    tooltip="Maximum number of uniformly sampled keyframes extracted from each connected video input.",
                ),
                *image_inputs,
                *audio_inputs,
                *video_inputs,
            ],
            outputs=[
                io.String.Output(
                    display_name="response_text",
                    tooltip="Generated text response from Qwen2.5-Omni.",
                ),
            ],
        )

    @classmethod
    def validate_inputs(
        cls,
        model_name: str = "",
        mmproj_name: str = "",
        **kwargs: Any,
    ) -> bool | str:
        """Validate model paths against traversal attacks and check projector requirements."""
        if not model_name or model_name == NO_MODELS_PLACEHOLDER:
            return "No valid GGUF model selected. Place a Qwen2.5-Omni .gguf model in models/LLM."

        if not _is_safe_relpath(model_name):
            return f"Invalid model path '{model_name}': path traversal or absolute paths are not allowed."

        if mmproj_name and mmproj_name not in ("none", "None"):
            if not _is_safe_relpath(mmproj_name):
                return f"Invalid mmproj path '{mmproj_name}': path traversal or absolute paths are not allowed."

        has_media = any(
            kwargs.get(key) is not None
            for key in (
                *[f"image_{i}" for i in range(1, MAX_IMAGE_SLOTS + 1)],
                *[f"audio_{i}" for i in range(1, MAX_AUDIO_SLOTS + 1)],
                *[f"video_{i}" for i in range(1, MAX_VIDEO_SLOTS + 1)],
            )
        )
        if has_media and (not mmproj_name or mmproj_name in ("none", "None")):
            return (
                "Media inputs (Image, Audio, or Video) are connected, but 'mmproj_name' is set to 'none'. "
                "Please select a matching *mmproj*.gguf projector file."
            )

        return True

    @classmethod
    def fingerprint_inputs(cls, **kwargs: Any) -> str:
        """Return a deterministic SHA-256 hex digest over all node inputs and file signatures."""
        hasher = hashlib.sha256()

        model_name = str(kwargs.get("model_name", ""))
        mmproj_name = str(kwargs.get("mmproj_name", ""))
        hasher.update(repr(_file_signature(model_name)).encode("utf-8"))
        hasher.update(repr(_file_signature(mmproj_name)).encode("utf-8"))

        scalar_keys = (
            "unload_model",
            "n_gpu_layers",
            "n_ctx",
            "flash_attn",
            "system_prompt",
            "user_prompt",
            "max_tokens",
            "temperature",
            "top_p",
            "top_k",
            "repeat_penalty",
            "presence_penalty",
            "frequency_penalty",
            "seed",
            "max_video_frames",
        )
        for k in scalar_keys:
            hasher.update(f"{k}={kwargs.get(k)!r};".encode("utf-8"))

        media_keys = (
            *[f"image_{i}" for i in range(1, MAX_IMAGE_SLOTS + 1)],
            *[f"audio_{i}" for i in range(1, MAX_AUDIO_SLOTS + 1)],
            *[f"video_{i}" for i in range(1, MAX_VIDEO_SLOTS + 1)],
        )
        for mk in media_keys:
            if mk in kwargs and kwargs[mk] is not None:
                hasher.update(f"{mk}={_media_signature(kwargs[mk])};".encode("utf-8"))

        return hasher.hexdigest()

    @classmethod
    def execute(
        cls,
        model_name: str,
        mmproj_name: str,
        unload_model: bool,
        n_gpu_layers: int,
        n_ctx: int,
        flash_attn: bool,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float,
        top_p: float,
        top_k: int,
        repeat_penalty: float,
        presence_penalty: float,
        frequency_penalty: float,
        seed: int,
        max_video_frames: int,
        **kwargs: Any,
    ) -> io.NodeOutput:
        model_path = resolve_llm_subpath(model_name)
        if not model_path or not os.path.isfile(model_path):
            raise FileNotFoundError(
                f"[Duffy_OmniModelNode] Primary GGUF model not found: '{model_name}'"
            )

        mmproj_path = resolve_llm_subpath(mmproj_name)

        # 1. Collect and encode all connected multimodal inputs in deterministic slot order
        image_uris: list[str] = []
        explicit_audio_payloads: list[dict[str, str]] = []
        video_audio_payloads: list[dict[str, str]] = []

        for i in range(1, MAX_IMAGE_SLOTS + 1):
            img_tensor = kwargs.get(f"image_{i}")
            if img_tensor is not None:
                image_uris.extend(comfy_image_to_data_uris(img_tensor))

        for i in range(1, MAX_AUDIO_SLOTS + 1):
            aud_dict = kwargs.get(f"audio_{i}")
            if aud_dict is not None:
                explicit_audio_payloads.extend(comfy_audio_to_input_audio_list(aud_dict))

        for i in range(1, MAX_VIDEO_SLOTS + 1):
            vid_obj = kwargs.get(f"video_{i}")
            if vid_obj is not None:
                v_frames, v_audios = extract_comfy_video(
                    vid_obj,
                    max_frames=int(max_video_frames),
                )
                image_uris.extend(v_frames)
                video_audio_payloads.extend(v_audios)

        has_any_media = bool(image_uris or explicit_audio_payloads or video_audio_payloads)
        if has_any_media and not mmproj_path:
            raise ValueError(
                "[Duffy_OmniModelNode] Media inputs (Image, Audio, or Video) were connected, "
                "but 'mmproj_name' is set to 'none' or missing. Please select the matching "
                "Qwen2.5-Omni *mmproj*.gguf projector."
            )

        # 2. Acquire or initialize the Llama + mtmd instance
        llm = _RUNTIME_CACHE.get_or_load(
            model_path=model_path,
            mmproj_path=mmproj_path,
            n_ctx=int(n_ctx),
            n_gpu_layers=int(n_gpu_layers),
            flash_attn=bool(flash_attn),
        )

        audio_payloads: list[dict[str, str]] = []
        if explicit_audio_payloads:
            if mmproj_path and not _RUNTIME_CACHE.mmproj_has_audio:
                raise ValueError(
                    f"[Duffy_OmniModelNode] Audio input was connected, but the selected projector "
                    f"'{os.path.basename(mmproj_path)}' contains only vision ('v.*') tensors and "
                    f"no audio ('a.*') encoder tensors."
                )
            audio_payloads.extend(explicit_audio_payloads)

        if video_audio_payloads:
            if not mmproj_path or _RUNTIME_CACHE.mmproj_has_audio:
                audio_payloads.extend(video_audio_payloads)
            else:
                logger.warning(
                    "[Duffy_OmniModelNode] Projector '%s' has no audio encoder ('a.*') tensors; "
                    "ignoring embedded video audio track and analyzing video keyframes only.",
                    os.path.basename(mmproj_path),
                )

        # 3. Assemble OpenAI-compatible multimodal chat message payload
        messages: list[dict[str, Any]] = []
        if system_prompt and system_prompt.strip():
            messages.append({
                "role": "system",
                "content": system_prompt.strip(),
            })

        user_content: list[dict[str, Any]] = []
        for uri in image_uris:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": uri},
            })

        for aud in audio_payloads:
            user_content.append({
                "type": "input_audio",
                "input_audio": aud,
            })

        user_content.append({
            "type": "text",
            "text": user_prompt if user_prompt else "",
        })

        messages.append({
            "role": "user",
            "content": user_content if (image_uris or audio_payloads) else (user_prompt or ""),
        })

        # Clamp seed to 32-bit signed integer range expected by llama.cpp's C sampler
        clamped_seed = int(seed) & 0x7FFFFFFF

        # Resolve `present_penalty` (JamePeng v0.3.48) vs `presence_penalty` parameter name
        completion_sig = inspect.signature(llm.create_chat_completion).parameters
        penalty_kwargs: dict[str, Any] = {}
        if "present_penalty" in completion_sig:
            penalty_kwargs["present_penalty"] = float(presence_penalty)
        elif "presence_penalty" in completion_sig:
            penalty_kwargs["presence_penalty"] = float(presence_penalty)

        output_text = ""
        try:
            response = llm.create_chat_completion(
                messages=messages,
                max_tokens=int(max_tokens),
                temperature=float(temperature),
                top_p=float(top_p),
                top_k=int(top_k),
                repeat_penalty=float(repeat_penalty),
                frequency_penalty=float(frequency_penalty),
                seed=clamped_seed,
                **penalty_kwargs,
            )
            choices = response.get("choices", []) if isinstance(response, dict) else []
            if choices:
                msg = choices[0].get("message", {})
                content = msg.get("content") or ""
                output_text = str(content).strip()
        finally:
            if unload_model:
                _RUNTIME_CACHE.unload()

        return io.NodeOutput(output_text)
