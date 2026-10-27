"""On-disk project workspace, manifest state machine, fast tensor hashing, and cache I/O for MiniMax-H3."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import shutil
import struct
import wave
from typing import Any, Optional

import numpy as np
import torch
from PIL import Image as PILImage
from safetensors.torch import load_file as safetensors_load
from safetensors.torch import save_file as safetensors_save

logger = logging.getLogger(__name__)


def sanitize_project_name(name: str) -> str:
    """Sanitize a user-provided project name for safe filesystem directory creation."""
    if not name or not isinstance(name, str):
        return "My_H3_Project"
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name.strip())
    cleaned = re.sub(r"\.+", "_", cleaned)
    cleaned = re.sub(r"\s+", "_", cleaned).strip("_")
    return cleaned or "My_H3_Project"


def get_default_comfy_output_dir() -> str:
    """Resolve ComfyUI's output directory, falling back to a local output folder during standalone tests."""
    try:
        import folder_paths  # type: ignore

        out_dir = folder_paths.get_output_directory()
        if out_dir:
            return os.path.abspath(out_dir)
    except Exception:
        pass
    fallback = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "output"))
    os.makedirs(fallback, exist_ok=True)
    return fallback


def fast_tensor_digest(tensor: Optional[torch.Tensor], extra_meta: str = "") -> str:
    """Compute a fast, deterministic SHA-256 digest of a tensor without serializing multi-MB arrays."""
    h = hashlib.sha256()
    if extra_meta:
        h.update(extra_meta.encode("utf-8"))
    if tensor is None:
        h.update(b"NONE")
        return h.hexdigest()[:24]

    t = tensor.detach().cpu()
    meta = f"shape={tuple(t.shape)}|dtype={t.dtype}"
    h.update(meta.encode("utf-8"))

    numel = t.numel()
    if numel == 0:
        h.update(b"EMPTY")
        return h.hexdigest()[:24]

    flat = t.reshape(-1).to(torch.float32)
    mean_val = float(flat.mean().item())
    std_val = float(flat.std().item()) if numel > 1 else 0.0
    stats_str = f"|mean={mean_val:.6f}|std={std_val:.6f}"
    h.update(stats_str.encode("utf-8"))

    # Sample up to 1024 float32 values (~4KB) uniformly strided across the tensor
    max_samples = 1024
    if numel <= max_samples:
        sample = flat.contiguous().numpy().tobytes()
    else:
        indices = torch.linspace(0, numel - 1, steps=max_samples, dtype=torch.long)
        sample = flat[indices].contiguous().numpy().tobytes()
    h.update(sample)
    return h.hexdigest()[:24]


def fast_audio_digest(audio: Optional[dict[str, Any]]) -> str:
    """Compute a fast SHA-256 digest for a ComfyUI AUDIO dictionary."""
    if not audio or not isinstance(audio, dict):
        return "NONE"
    waveform = audio.get("waveform")
    sr = audio.get("sample_rate", audio.get("sampler_rate", 0))
    return fast_tensor_digest(waveform, extra_meta=f"sr={sr}")


def compute_clip_config_hash(
    clip_spec: dict[str, Any],
    fps: int,
    resolution: tuple[int, int],
    sample_rate: int,
) -> str:
    """Compute SHA-256 strictly from clip-level creative parameters (excluding upstream model/LoRA/attention)."""
    payload = {
        "prompt": str(clip_spec.get("prompt", "")),
        "negative_prompt": str(clip_spec.get("negative_prompt", "")),
        "duration_sec": round(float(clip_spec.get("duration_sec", 5.0)), 4),
        "target_frames": int(clip_spec.get("target_frames", round(5.0 * fps))),
        "fps": int(fps),
        "resolution": [int(resolution[0]), int(resolution[1])],
        "sample_rate": int(sample_rate),
        "seed": int(clip_spec.get("seed", 0)),
        "overlap_frames_N": int(clip_spec.get("overlap_frames_N", 0)),
        "global_image_tags": list(clip_spec.get("global_image_tags", [])),
        "global_audio_tags": list(clip_spec.get("global_audio_tags", [])),
        "slice_from_master_audio": bool(clip_spec.get("slice_from_master_audio", False)),
        "local_ref_image_hash": str(clip_spec.get("local_ref_image_hash", "NONE")),
        "local_ref_audio_hash": str(clip_spec.get("local_ref_audio_hash", "NONE")),
        "clip_sampler_overrides": clip_spec.get("clip_sampler_overrides") or {},
    }
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def save_wav_float32(path: str, waveform: torch.Tensor, sample_rate: int) -> None:
    """Save a waveform tensor [B, C, Samples] or [C, Samples] to a WAV file without requiring torchaudio."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    w = waveform.detach().cpu().to(torch.float32)
    if w.ndim == 3:
        w = w[0]
    elif w.ndim == 1:
        w = w.unsqueeze(0)

    # w is [C, Samples], transpose to [Samples, C] for soundfile/wave
    np_data = w.transpose(0, 1).contiguous().numpy()
    np_data = np.clip(np_data, -1.0, 1.0)

    try:
        import soundfile as sf  # type: ignore

        sf.write(path, np_data, int(sample_rate), subtype="FLOAT")
        return
    except Exception:
        pass

    # Stdlib wave fallback (16-bit PCM)
    pcm16 = (np_data * 32767.0).round().astype(np.int16)
    channels = pcm16.shape[1] if pcm16.ndim == 2 else 1
    with wave.open(path, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(int(sample_rate))
        wf.writeframes(pcm16.tobytes())


def load_wav_tensor(path: str) -> tuple[torch.Tensor, int]:
    """Load a WAV file into a float32 tensor [1, C, Samples] and sample_rate."""
    try:
        import soundfile as sf  # type: ignore

        data, sr = sf.read(path, dtype="float32", always_2d=True)
        # data is [Samples, C] -> [1, C, Samples]
        tensor = torch.from_numpy(data.T.copy()).unsqueeze(0).to(torch.float32)
        return tensor, int(sr)
    except Exception:
        pass

    with wave.open(path, "rb") as wf:
        channels = wf.getnchannels()
        sr = wf.getframerate()
        sampwidth = wf.getsampwidth()
        nframes = wf.getnframes()
        raw = wf.readframes(nframes)

    if sampwidth == 2:
        arr = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32767.0
    elif sampwidth == 4:
        # Check if IEEE float or int32
        arr = np.frombuffer(raw, dtype=np.int32).astype(np.float32) / 2147483647.0
    else:
        arr = np.frombuffer(raw, dtype=np.uint8).astype(np.float32) / 128.0 - 1.0

    arr = arr.reshape(-1, channels).T.copy()
    return torch.from_numpy(arr).unsqueeze(0).to(torch.float32), int(sr)


def save_image_png(path: str, image_tensor: torch.Tensor) -> None:
    """Save a single image tensor [1, H, W, C] or [H, W, C] in [0, 1] as PNG."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    t = image_tensor.detach().cpu()
    if t.ndim == 4:
        t = t[0]
    arr = np.clip(t[..., :3].numpy() * 255.0, 0, 255).round().astype(np.uint8)
    PILImage.fromarray(arr).save(path)


def load_image_png(path: str) -> torch.Tensor:
    """Load a PNG image into a float32 tensor [1, H, W, 3] in [0, 1]."""
    img = PILImage.open(path).convert("RGB")
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


class H3ProjectWorkspace:
    """Manages the persistent on-disk workspace `<base_dir>/H3_Projects/<project_name>/`."""

    def __init__(self, project_name: str, base_output_dir: Optional[str] = None) -> None:
        self.project_name = sanitize_project_name(project_name)
        base_dir = os.path.abspath(base_output_dir or get_default_comfy_output_dir())
        projects_root = os.path.join(base_dir, "H3_Projects")
        self.project_dir = os.path.abspath(os.path.join(projects_root, self.project_name))

        # Guard against path traversal
        if not self.project_dir.startswith(os.path.abspath(projects_root)):
            raise ValueError(f"Invalid project path resolved: {self.project_dir}")

        self.vault_dir = os.path.join(self.project_dir, "vault")
        self.cache_dir = os.path.join(self.project_dir, "cache")
        self.exports_dir = os.path.join(self.project_dir, "exports")
        self.manifest_path = os.path.join(self.project_dir, "manifest.json")

    def ensure_dirs(self) -> None:
        """Create workspace directories if they do not exist."""
        os.makedirs(self.vault_dir, exist_ok=True)
        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs(self.exports_dir, exist_ok=True)

    def load_manifest(self) -> dict[str, Any]:
        """Load `manifest.json` from disk, or return a fresh manifest dictionary."""
        if os.path.isfile(self.manifest_path):
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    data.setdefault("project_name", self.project_name)
                    data.setdefault("clips", {})
                    return data
            except Exception as exc:
                logger.warning("[H3ProjectWorkspace] Corrupt manifest.json, re-initializing: %s", exc)
        return {
            "project_name": self.project_name,
            "fps": 24,
            "sample_rate": 48000,
            "resolution": [1344, 768],
            "clips": {},
        }

    def save_manifest(self, manifest: dict[str, Any]) -> None:
        """Atomically write `manifest.json` to disk using a temporary file and `os.replace`."""
        self.ensure_dirs()
        tmp_path = f"{self.manifest_path}.tmp.{os.getpid()}"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, sort_keys=True)
        os.replace(tmp_path, self.manifest_path)

    def get_manifest_mtime(self) -> float:
        """Return the modification timestamp of `manifest.json`, or 0.0 if absent."""
        if os.path.isfile(self.manifest_path):
            try:
                return os.path.getmtime(self.manifest_path)
            except OSError:
                return 0.0
        return 0.0

    def cache_vault_image(self, tag: str, image: torch.Tensor) -> tuple[str, str]:
        """Save a global or local reference image into `vault/` and return `(abs_path, digest)`."""
        self.ensure_dirs()
        safe_tag = sanitize_project_name(tag)
        digest = fast_tensor_digest(image, extra_meta=safe_tag)
        filename = f"ref_img_{safe_tag}_{digest[:12]}.png"
        abs_path = os.path.join(self.vault_dir, filename)
        if not os.path.isfile(abs_path):
            save_image_png(abs_path, image)
        return abs_path, digest

    def cache_vault_audio(self, tag: str, audio: dict[str, Any]) -> tuple[str, str]:
        """Save a global or local reference audio into `vault/` and return `(abs_path, digest)`."""
        self.ensure_dirs()
        safe_tag = sanitize_project_name(tag)
        digest = fast_audio_digest(audio)
        filename = f"ref_audio_{safe_tag}_{digest[:12]}.wav"
        abs_path = os.path.join(self.vault_dir, filename)
        if not os.path.isfile(abs_path):
            waveform = audio["waveform"]
            sr = int(audio.get("sample_rate", audio.get("sampler_rate", 48000)))
            save_wav_float32(abs_path, waveform, sr)
        return abs_path, digest

    def clip_cache_paths(self, clip_id: str) -> tuple[str, str, str]:
        """Return `(frames_safetensors_path, tail_safetensors_path, audio_wav_path)`."""
        safe_id = sanitize_project_name(clip_id)
        frames_path = os.path.join(self.cache_dir, f"{safe_id}_frames.safetensors")
        tail_path = os.path.join(self.cache_dir, f"{safe_id}_tail.safetensors")
        audio_path = os.path.join(self.cache_dir, f"{safe_id}_audio.wav")
        return frames_path, tail_path, audio_path

    def has_valid_clip_cache(self, clip_id: str) -> bool:
        """Check whether both frame and audio cache files exist on disk for `clip_id`."""
        frames_path, _, audio_path = self.clip_cache_paths(clip_id)
        return os.path.isfile(frames_path) and os.path.isfile(audio_path)

    def save_clip_cache(
        self,
        clip_id: str,
        frames: torch.Tensor,
        waveform: torch.Tensor,
        sample_rate: int,
        max_tail_frames: int = 64,
    ) -> dict[str, Any]:
        """Write rendered clip frames (.safetensors), fast-access tail slice, and audio (.wav) to `cache/`."""
        self.ensure_dirs()
        frames_path, tail_path, audio_path = self.clip_cache_paths(clip_id)

        frames_cpu = frames.detach().cpu().to(torch.float16).contiguous()
        tail_count = min(int(frames_cpu.shape[0]), max(1, int(max_tail_frames)))
        tail_cpu = frames_cpu[-tail_count:].contiguous()

        safetensors_save({"frames": frames_cpu}, frames_path)
        safetensors_save({"tail": tail_cpu}, tail_path)
        save_wav_float32(audio_path, waveform, sample_rate)

        w_cpu = waveform.detach().cpu()
        num_samples = int(w_cpu.shape[-1])
        return {
            "actual_frames": int(frames_cpu.shape[0]),
            "actual_audio_samples": num_samples,
            "frame_cache_path": os.path.relpath(frames_path, self.project_dir),
            "tail_cache_path": os.path.relpath(tail_path, self.project_dir),
            "audio_cache_path": os.path.relpath(audio_path, self.project_dir),
        }

    def load_clip_frames(self, clip_id: str) -> torch.Tensor:
        """Load cached clip frames `[F, H, W, C]` in `float32`."""
        frames_path, _, _ = self.clip_cache_paths(clip_id)
        tensors = safetensors_load(frames_path, device="cpu")
        return tensors["frames"].to(torch.float32)

    def load_clip_tail(self, clip_id: str, n_frames: int) -> torch.Tensor:
        """Load the last `n_frames` `[N, H, W, C]` from the fast tail cache (or full frame cache)."""
        if n_frames <= 0:
            return torch.empty((0, 1, 1, 3), dtype=torch.float32)
        frames_path, tail_path, _ = self.clip_cache_paths(clip_id)
        if os.path.isfile(tail_path):
            tensors = safetensors_load(tail_path, device="cpu")
            tail = tensors["tail"].to(torch.float32)
            if tail.shape[0] >= n_frames:
                return tail[-n_frames:]
        full = safetensors_load(frames_path, device="cpu")["frames"].to(torch.float32)
        return full[-n_frames:]

    def load_clip_audio(self, clip_id: str) -> tuple[torch.Tensor, int]:
        """Load cached clip audio `(waveform [1, C, Samples], sample_rate)`."""
        _, _, audio_path = self.clip_cache_paths(clip_id)
        return load_wav_tensor(audio_path)

    def compute_tail_hash(self, clip_id: str, n_frames: int) -> Optional[str]:
        """Compute a deterministic SHA-256 hash of the last `n_frames` of `clip_id`."""
        if n_frames <= 0 or not self.has_valid_clip_cache(clip_id):
            return None
        tail_frames = self.load_clip_tail(clip_id, n_frames)
        return fast_tensor_digest(tail_frames, extra_meta=f"{clip_id}_tail_{n_frames}")

    def evaluate_clip_dirty_state(
        self,
        clip_spec: dict[str, Any],
        manifest: dict[str, Any],
        prev_tail_hash: Optional[str],
        cascade_rerender: bool,
    ) -> tuple[bool, str, str]:
        """Evaluate whether a clip needs rendering according to Section 4 (Node 3) of the PRD.

        Returns `(is_dirty, reason, continuity_status)`.
        """
        clip_id = clip_spec["clip_id"]
        clip_idx = int(clip_spec["clip_index"])
        render_mode = clip_spec.get("render_mode", "Smart_Auto")
        overlap_n = int(clip_spec.get("overlap_frames_N", 0))
        cached_entry = manifest.get("clips", {}).get(clip_id)
        cache_exists = self.has_valid_clip_cache(clip_id) and cached_entry is not None

        if not cache_exists:
            return True, "Cache missing on disk", "DIRTY"

        if render_mode == "Lock_Cache":
            # Never re-renders if valid cache exists on disk
            status = cached_entry.get("continuity_status", "SYNCED")
            if clip_idx > 1 and overlap_n > 0:
                used_tail = cached_entry.get("input_tail_hash_used")
                if used_tail != prev_tail_hash:
                    status = "OUT_OF_SYNC"
            return False, "Locked to existing cache (Lock_Cache)", status

        if render_mode == "Force_ReRender":
            return True, "Forced re-render requested (Force_ReRender)", "DIRTY"

        # Smart_Auto mode
        if clip_spec["config_hash"] != cached_entry.get("config_hash"):
            return True, "Clip creative parameters changed (config_hash mismatch)", "DIRTY"

        if clip_idx > 1 and overlap_n > 0:
            used_tail = cached_entry.get("input_tail_hash_used")
            if used_tail != prev_tail_hash:
                if cascade_rerender:
                    return True, "Upstream tail frames changed (Cascade Re-Render ON)", "DIRTY"
                return False, "Upstream tail frames changed (Cascade OFF - using cache)", "OUT_OF_SYNC"

        return False, "Up-to-date cache hit", "SYNCED"

    def purge_project_caches(self) -> None:
        """Delete temporary `cache/` and `vault/` folders upon project finalization."""
        for folder in (self.cache_dir, self.vault_dir):
            if os.path.isdir(folder):
                shutil.rmtree(folder, ignore_errors=True)
