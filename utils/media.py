import base64
import logging
from io import BytesIO
from typing import Any

import numpy as np
import torch
from PIL import Image

logger = logging.getLogger(__name__)

ESTIMATED_TOKENS_PER_IMAGE = 258  # Approximate token cost per image in Gemma-4
MAX_VIDEO_FRAMES = 30
MAX_AUDIO_DURATION_SECONDS = 60


def image_tensor_to_data_uri(image: torch.Tensor) -> dict[str, Any]:
    """Convert a ComfyUI image tensor to an OpenAI-compatible image_url dict.

    Args:
        image: Tensor of shape [N, H, W, 3] or [H, W, 3], float32 in [0.0, 1.0].

    Returns:
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
    """
    if image.ndim == 4:
        image = image[0]

    image_np = (image.cpu().numpy() * 255).clip(0, 255).astype(np.uint8)
    pil_image = Image.fromarray(image_np, mode="RGB")

    buffer = BytesIO()
    pil_image.save(buffer, format="JPEG", quality=95)
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "type": "image_url",
        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
    }


def video_tensor_to_frame_list(
    video: torch.Tensor,
    target_fps: float = 1.0,
    source_fps: float = 30.0,
    n_ctx: int = 8192,
) -> list[dict[str, Any]]:
    """Extract temporally sub-sampled frames from a video tensor.

    Args:
        video: Tensor of shape [F, H, W, 3], float32 in [0.0, 1.0].
        target_fps: Desired sampling rate in frames per second.
        source_fps: Original video frame rate (assumed 30 FPS if unknown).
        n_ctx: Current context window size, used to warn about token budget.

    Returns:
        List of image_url dicts, one per sampled frame.
    """
    total_frames = video.shape[0]
    duration_seconds = total_frames / source_fps

    # Calculate how many frames to sample
    desired_count = max(1, int(duration_seconds * target_fps))
    frame_count = min(desired_count, MAX_VIDEO_FRAMES, total_frames)

    # Warn if token budget is tight
    estimated_tokens = frame_count * ESTIMATED_TOKENS_PER_IMAGE
    if estimated_tokens > n_ctx * 0.7:
        old_count = frame_count
        frame_count = max(1, int((n_ctx * 0.5) / ESTIMATED_TOKENS_PER_IMAGE))
        frame_count = min(frame_count, old_count)
        logger.warning(
            "Video frame count reduced from %d to %d to fit context window (%d tokens)",
            old_count, frame_count, n_ctx,
        )

    indices = np.linspace(0, total_frames - 1, frame_count, dtype=int)
    logger.info(
        "Video: %.1fs duration, %d total frames, sampling %d frames (%.1f FPS)",
        duration_seconds, total_frames, frame_count, target_fps,
    )

    frames = []
    for frame_tensor in video[indices]:
        frames.append(image_tensor_to_data_uri(frame_tensor.unsqueeze(0)))
    return frames


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
    import soundfile as sf
    import torchaudio

    waveform = audio["waveform"]
    sample_rate = audio["sample_rate"]

    # Squeeze batch dimension if present: [B, C, T] -> [C, T]
    if waveform.ndim == 3:
        waveform = waveform.squeeze(0)

    # Mixdown to mono
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    # Resample to 16 kHz
    if sample_rate != 16000:
        resampler = torchaudio.transforms.Resample(sample_rate, 16000)
        waveform = resampler(waveform)

    # Validate duration
    duration = waveform.shape[-1] / 16000
    if duration > MAX_AUDIO_DURATION_SECONDS:
        raise ValueError(
            f"Audio duration ({duration:.1f}s) exceeds the maximum of "
            f"{MAX_AUDIO_DURATION_SECONDS}s. Please trim the audio input."
        )

    logger.info("Audio: %.1fs duration, resampled to 16 kHz mono", duration)

    # Encode to WAV in memory
    audio_np = waveform.squeeze(0).cpu().numpy()
    buffer = BytesIO()
    sf.write(buffer, audio_np, 16000, format="WAV")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "type": "audio_url",
        "audio_url": {"url": f"data:audio/wav;base64,{b64}"},
    }
