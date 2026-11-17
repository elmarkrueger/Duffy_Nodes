import base64
import logging
from io import BytesIO
from typing import Any

import numpy as np
import torch
from PIL import Image

logger = logging.getLogger(__name__)

ESTIMATED_TOKENS_PER_IMAGE = 1120  # Gemma-4 12B upper visual token ceiling per image
MAX_VIDEO_FRAMES = 30
MAX_AUDIO_DURATION_SECONDS = 60


def compute_effective_image_max_tokens(
    requested_max_tokens: int,
    media_count: int = 1,
    n_ctx: int = 8192,
    reserved_text_tokens: int = 1024,
) -> int:
    """Compute a safe per-image token budget that fits within ``n_ctx``."""
    requested = max(64, int(requested_max_tokens)) if requested_max_tokens > 0 else 1120
    count = max(1, int(media_count))
    available = max(64, int(n_ctx) - max(256, int(reserved_text_tokens)))
    per_media_cap = max(64, available // count)
    return min(requested, per_media_cap)


def _normalize_image_hwc(image: torch.Tensor) -> np.ndarray:
    """Convert a single [H, W, C] or [H, W] torch tensor to a uint8 RGB ndarray."""
    if image.ndim == 2:
        image = image.unsqueeze(-1)
    if image.ndim != 3:
        raise ValueError(f"Expected 3D [H, W, C] image tensor, got shape {tuple(image.shape)}")

    channels = image.shape[-1]
    if channels == 1:
        image = image.repeat(1, 1, 3)
    elif channels >= 4:
        image = image[..., :3]
    elif channels != 3:
        raise ValueError(f"Unsupported image channel count {channels}; expected 1, 3, or 4")

    safe_tensor = torch.nan_to_num(image.detach().float(), nan=0.0, posinf=1.0, neginf=0.0)
    return (safe_tensor.clamp(0.0, 1.0).cpu().numpy() * 255.0).round().astype(np.uint8)


def image_tensor_to_data_uri(
    image: torch.Tensor,
    max_long_edge: int = 2048,
    effective_image_max_tokens: int = 1120,
) -> dict[str, Any]:
    """Convert a ComfyUI image tensor to an OpenAI-compatible PNG image_url dict.

    Args:
        image: Tensor of shape [N, H, W, C] or [H, W, C], float32 in [0.0, 1.0].
        max_long_edge: Soft pixel cap when ``effective_image_max_tokens <= 1536``.
        effective_image_max_tokens: Target visual token budget used to bound extreme inputs.

    Returns:
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
    """
    if image.ndim == 4:
        image = image[0]

    image_np = _normalize_image_hwc(image)
    pil_image = Image.fromarray(image_np, mode="RGB")

    edge_cap = max_long_edge
    if 0 < effective_image_max_tokens < 600 and max_long_edge > 0:
        edge_cap = min(max_long_edge, max(384, int((effective_image_max_tokens ** 0.5) * 48)))

    if max_long_edge > 0 and 0 < effective_image_max_tokens <= 1536:
        long_edge = max(pil_image.width, pil_image.height)
        if long_edge > edge_cap:
            scale = edge_cap / float(long_edge)
            new_w = max(1, int(round(pil_image.width * scale)))
            new_h = max(1, int(round(pil_image.height * scale)))
            resampling = getattr(getattr(Image, "Resampling", Image), "LANCZOS", Image.LANCZOS)
            pil_image = pil_image.resize((new_w, new_h), resample=resampling)

    buffer = BytesIO()
    pil_image.save(buffer, format="PNG", compress_level=1)
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "type": "image_url",
        "image_url": {"url": f"data:image/png;base64,{b64}"},
    }


def image_tensor_batch_to_data_uris(
    image: torch.Tensor,
    max_long_edge: int = 2048,
    effective_image_max_tokens: int = 1120,
) -> list[dict[str, Any]]:
    """Convert all images in a [B, H, W, C] or [H, W, C] batch to PNG image_url dicts."""
    if image.ndim <= 3:
        return [
            image_tensor_to_data_uri(
                image,
                max_long_edge=max_long_edge,
                effective_image_max_tokens=effective_image_max_tokens,
            )
        ]
    if image.ndim != 4:
        raise ValueError(f"Expected 3D or 4D image tensor, got shape {tuple(image.shape)}")

    return [
        image_tensor_to_data_uri(
            image[i],
            max_long_edge=max_long_edge,
            effective_image_max_tokens=effective_image_max_tokens,
        )
        for i in range(image.shape[0])
    ]


def video_tensor_to_frame_list(
    video: torch.Tensor,
    target_fps: float = 1.0,
    source_fps: float = 30.0,
    n_ctx: int = 8192,
    image_max_tokens: int = ESTIMATED_TOKENS_PER_IMAGE,
    max_long_edge: int = 2048,
) -> list[dict[str, Any]]:
    """Extract temporally sub-sampled frames from a video tensor within the token budget.

    Args:
        video: Tensor of shape [F, H, W, C], float32 in [0.0, 1.0].
        target_fps: Desired sampling rate in frames per second.
        source_fps: Original video frame rate (assumed 30 FPS if unknown).
        n_ctx: Current context window size, used to bound per-frame tokens and frame count.
        image_max_tokens: Requested visual token limit per frame.
        max_long_edge: Long edge cap applied before encoding.

    Returns:
        List of image_url dicts, one per sampled frame.
    """
    total_frames = video.shape[0]
    if total_frames == 0:
        return []
    duration_seconds = total_frames / max(1e-6, float(source_fps))

    desired_count = max(1, int(duration_seconds * target_fps))
    frame_count = min(desired_count, MAX_VIDEO_FRAMES, total_frames)

    requested_tokens = max(64, int(image_max_tokens)) if image_max_tokens > 0 else ESTIMATED_TOKENS_PER_IMAGE
    available_tokens = max(256, int(n_ctx * 0.7))
    if frame_count * requested_tokens > available_tokens:
        per_frame_budget = compute_effective_image_max_tokens(
            requested_tokens,
            media_count=frame_count,
            n_ctx=n_ctx,
            reserved_text_tokens=max(1024, int(n_ctx * 0.25)),
        )
        if frame_count * per_frame_budget > available_tokens or per_frame_budget < 128:
            old_count = frame_count
            safe_token_step = max(128, min(requested_tokens, ESTIMATED_TOKENS_PER_IMAGE))
            frame_count = max(1, min(old_count, int((n_ctx * 0.65) // safe_token_step)))
            per_frame_budget = compute_effective_image_max_tokens(
                requested_tokens,
                media_count=frame_count,
                n_ctx=n_ctx,
                reserved_text_tokens=max(1024, int(n_ctx * 0.25)),
            )
            logger.warning(
                "Video frame count adjusted from %d to %d (per-frame budget=%d tokens) to fit n_ctx=%d",
                old_count,
                frame_count,
                per_frame_budget,
                n_ctx,
            )
    else:
        per_frame_budget = requested_tokens

    indices = np.linspace(0, total_frames - 1, frame_count, dtype=int)
    logger.info(
        "Video: %.1fs duration, %d total frames, sampling %d frames (%.1f FPS, ~%d tok/frame cap)",
        duration_seconds,
        total_frames,
        frame_count,
        target_fps,
        per_frame_budget,
    )

    frames = []
    for frame_tensor in video[indices]:
        frames.append(
            image_tensor_to_data_uri(
                frame_tensor,
                max_long_edge=max_long_edge,
                effective_image_max_tokens=per_frame_budget,
            )
        )
    return frames


def _resample_mono_16k(waveform: torch.Tensor, sample_rate: int) -> torch.Tensor:
    """Resample a [1, T] waveform tensor to 16 kHz without hard-requiring torchaudio."""
    if sample_rate == 16000:
        return waveform
    try:
        import torchaudio  # type: ignore

        resampler = torchaudio.transforms.Resample(int(sample_rate), 16000)
        return resampler(waveform)
    except Exception:
        pass

    try:
        from math import gcd
        from scipy.signal import resample_poly  # type: ignore

        sr = int(sample_rate)
        g = gcd(sr, 16000)
        up = 16000 // g
        down = sr // g
        resampled = resample_poly(waveform.squeeze(0).cpu().numpy(), up, down)
        return torch.from_numpy(np.asarray(resampled, dtype=np.float32)).unsqueeze(0)
    except Exception:
        target_len = max(1, int(round(waveform.shape[-1] * 16000.0 / float(sample_rate))))
        return torch.nn.functional.interpolate(
            waveform.unsqueeze(0), size=target_len, mode="linear", align_corners=False
        ).squeeze(0)


def _encode_wav_bytes(audio_np: np.ndarray, sample_rate: int = 16000) -> bytes:
    """Encode a 1D float32 [-1, 1] mono array into WAV bytes."""
    buffer = BytesIO()
    try:
        import soundfile as sf  # type: ignore

        sf.write(buffer, audio_np, sample_rate, format="WAV")
        return buffer.getvalue()
    except Exception:
        import wave

        pcm16 = (np.clip(audio_np, -1.0, 1.0) * 32767.0).astype(np.int16)
        with wave.open(buffer, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm16.tobytes())
        return buffer.getvalue()


def _process_audio_to_wav(audio: dict) -> bytes:
    """Shared audio processing: resample to 16 kHz mono, encode as WAV bytes.

    Args:
        audio: {"waveform": torch.Tensor, "sample_rate": int}

    Returns:
        Raw WAV file bytes.

    Raises:
        ValueError: If audio exceeds MAX_AUDIO_DURATION_SECONDS or lacks valid fields.
    """
    if not isinstance(audio, dict) or "waveform" not in audio or "sample_rate" not in audio:
        raise ValueError("Invalid AUDIO payload: expected dict with 'waveform' and 'sample_rate'.")

    waveform = audio["waveform"]
    sample_rate = int(audio["sample_rate"])
    if sample_rate <= 0:
        raise ValueError(f"Invalid audio sample_rate: {sample_rate}")

    if not isinstance(waveform, torch.Tensor):
        waveform = torch.as_tensor(waveform)

    waveform = torch.nan_to_num(waveform.detach().float(), nan=0.0, posinf=1.0, neginf=-1.0)

    # Normalize shape to [C, T]
    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)
    elif waveform.ndim == 3:
        waveform = waveform[0]
    elif waveform.ndim != 2:
        raise ValueError(f"Expected 1D, 2D, or 3D audio waveform tensor, got shape {tuple(waveform.shape)}")

    # Mixdown to mono
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    waveform = _resample_mono_16k(waveform.cpu(), sample_rate).clamp(-1.0, 1.0)

    duration = waveform.shape[-1] / 16000.0
    if duration > MAX_AUDIO_DURATION_SECONDS:
        raise ValueError(
            f"Audio duration ({duration:.1f}s) exceeds the maximum of "
            f"{MAX_AUDIO_DURATION_SECONDS}s. Please trim the audio input."
        )

    logger.info("Audio: %.1fs duration, resampled to 16 kHz mono", duration)
    return _encode_wav_bytes(waveform.squeeze(0).cpu().numpy(), 16000)


def audio_to_data_uri(audio: dict) -> dict[str, Any]:
    """Convert a ComfyUI AUDIO dict to an OpenAI-compatible audio_url dict.

    The audio is resampled to 16 kHz mono WAV as required by the Gemma-4 audio
    projector.

    Args:
        audio: {"waveform": torch.Tensor, "sample_rate": int}

    Returns:
        {"type": "audio_url", "audio_url": {"url": "data:audio/wav;base64,..."}}

    Raises:
        ValueError: If audio exceeds 60 seconds.
    """
    wav_bytes = _process_audio_to_wav(audio)
    b64 = base64.b64encode(wav_bytes).decode("utf-8")

    return {
        "type": "audio_url",
        "audio_url": {"url": f"data:audio/wav;base64,{b64}"},
    }


def audio_to_data_uri_omni(audio: dict) -> dict[str, Any]:
    """Convert a ComfyUI AUDIO dict to an Omni MultiModal input_audio dict.

    Uses the same processing pipeline as audio_to_data_uri (resample to
    16 kHz mono WAV), but emits the Omni MultiModal payload format
    required by the Gemma4ChatHandler for the unified gemma4uv projector.

    Args:
        audio: {"waveform": torch.Tensor, "sample_rate": int}

    Returns:
        {"type": "input_audio", "input_audio": {"data": "<base64>", "format": "wav"}}

    Raises:
        ValueError: If audio exceeds 60 seconds.
    """
    wav_bytes = _process_audio_to_wav(audio)
    b64 = base64.b64encode(wav_bytes).decode("utf-8")

    return {
        "type": "input_audio",
        "input_audio": {"data": b64, "format": "wav"},
    }
