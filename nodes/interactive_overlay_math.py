"""Pure transform and compositing math for the Interactive Overlay Compositor.

This module intentionally has no dependency on the ComfyUI server so it can be
unit-tested in isolation. The transform contract is shared with the frontend
(``src/utils/overlay_transform.ts``) and pinned by
``tests/fixtures/overlay_transform_cases.json``.

Coordinate conventions (screen space, y axis pointing down):

* ``translation_norm`` -- position of the anchor on the background, ``(x / W, y / H)``.
* ``scale_factors``    -- overlay size relative to its native pixel size, in background pixels.
* ``rotation_deg``     -- positive values rotate counter-clockwise *on screen*.
* ``anchor_point``     -- pivot in overlay-local normalized coordinates (0.5, 0.5 = center).

Forward mapping (overlay pixel ``p_o`` -> background pixel ``p_b``)::

    p_b = T + R(theta) @ S @ (p_o - A)
    R(theta) = [[cos, sin], [-sin, cos]]
"""

from __future__ import annotations

import hashlib
import json
import math
from typing import Any

import torch
import torch.nn.functional as F

BLEND_MODES = ["normal", "multiply", "screen", "overlay", "add"]
STATE_VERSION = 1

MIN_SCALE = 0.01
MAX_SCALE = 100.0
ANCHOR_MIN = -1.0
ANCHOR_MAX = 2.0
TRANSLATION_MIN = -10.0
TRANSLATION_MAX = 11.0
DEFAULT_FIT_RATIO = 0.5


# ---------------------------------------------------------------------------
# State handling
# ---------------------------------------------------------------------------

def default_scale(bg_wh: tuple[int, int], ov_wh: tuple[int, int]) -> float:
    """Fit the overlay to 50% of the background without upscaling it."""
    bg_w, bg_h = bg_wh
    ov_w, ov_h = ov_wh
    if ov_w <= 0 or ov_h <= 0 or bg_w <= 0 or bg_h <= 0:
        return 1.0
    ratio = min(DEFAULT_FIT_RATIO * bg_w / ov_w, DEFAULT_FIT_RATIO * bg_h / ov_h, 1.0)
    return float(max(MIN_SCALE, ratio))


def default_state(bg_wh: tuple[int, int] | None = None, ov_wh: tuple[int, int] | None = None) -> dict:
    scale = default_scale(bg_wh, ov_wh) if bg_wh and ov_wh else 1.0
    return {
        "version": STATE_VERSION,
        "translation_norm": [0.5, 0.5],
        "scale_factors": [scale, scale],
        "rotation_deg": 0.0,
        "anchor_point": [0.5, 0.5],
    }


def _finite(value: Any) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("non-finite number")
    return number


def _pair(value: Any, name: str) -> tuple[float, float]:
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise ValueError(f"{name} must be an array of two numbers")
    return _finite(value[0]), _finite(value[1])


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _clamp_scale(value: float) -> float:
    sign = -1.0 if value < 0 else 1.0
    return sign * _clamp(abs(value), MIN_SCALE, MAX_SCALE)


def validate_transform(raw: Any) -> dict:
    """Strictly validate a client-supplied transform. Raises ``ValueError`` on bad input."""
    if not isinstance(raw, dict):
        raise ValueError("transform must be an object")

    tx, ty = _pair(raw.get("translation_norm", [0.5, 0.5]), "translation_norm")
    sx, sy = _pair(raw.get("scale_factors", [1.0, 1.0]), "scale_factors")
    ax, ay = _pair(raw.get("anchor_point", [0.5, 0.5]), "anchor_point")
    rotation = _finite(raw.get("rotation_deg", 0.0))

    if sx == 0 or sy == 0:
        raise ValueError("scale_factors must be non-zero")

    state = {
        "version": STATE_VERSION,
        "translation_norm": [_clamp(tx, TRANSLATION_MIN, TRANSLATION_MAX), _clamp(ty, TRANSLATION_MIN, TRANSLATION_MAX)],
        "scale_factors": [_clamp_scale(sx), _clamp_scale(sy)],
        "rotation_deg": ((rotation + 180.0) % 360.0) - 180.0,
        "anchor_point": [_clamp(ax, ANCHOR_MIN, ANCHOR_MAX), _clamp(ay, ANCHOR_MIN, ANCHOR_MAX)],
    }

    if "blend_mode" in raw:
        blend = raw.get("blend_mode")
        if blend not in BLEND_MODES:
            raise ValueError(f"blend_mode must be one of {BLEND_MODES}")
        state["blend_mode"] = blend
    if "opacity" in raw:
        state["opacity"] = _clamp(_finite(raw.get("opacity")), 0.0, 1.0)
    if isinstance(raw.get("input_signature"), str) and len(raw["input_signature"]) <= 128:
        state["input_signature"] = raw["input_signature"]
    return state


def parse_saved_state(value: Any) -> dict | None:
    """Lenient parse of the hidden widget value. Returns ``None`` when nothing usable is saved."""
    if value is None:
        return None
    data = value
    if isinstance(value, str):
        if not value.strip():
            return None
        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return None
    if not isinstance(data, dict) or "translation_norm" not in data:
        return None
    try:
        return validate_transform(data)
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Matrices
# ---------------------------------------------------------------------------

def forward_matrix(state: dict, bg_wh: tuple[int, int], ov_wh: tuple[int, int]) -> torch.Tensor:
    """3x3 float64 matrix mapping overlay pixels to background pixels."""
    bg_w, bg_h = bg_wh
    ov_w, ov_h = ov_wh
    tx, ty = state["translation_norm"]
    sx, sy = state["scale_factors"]
    ax, ay = state["anchor_point"]
    theta = math.radians(state["rotation_deg"])
    c, s = math.cos(theta), math.sin(theta)

    translate = torch.tensor([[1, 0, tx * bg_w], [0, 1, ty * bg_h], [0, 0, 1]], dtype=torch.float64)
    rotate = torch.tensor([[c, s, 0], [-s, c, 0], [0, 0, 1]], dtype=torch.float64)
    scale = torch.tensor([[sx, 0, 0], [0, sy, 0], [0, 0, 1]], dtype=torch.float64)
    anchor = torch.tensor([[1, 0, -ax * ov_w], [0, 1, -ay * ov_h], [0, 0, 1]], dtype=torch.float64)
    return translate @ rotate @ scale @ anchor


def transformed_corners(state: dict, bg_wh: tuple[int, int], ov_wh: tuple[int, int]) -> list[list[float]]:
    """Corners (TL, TR, BR, BL) of the overlay in background pixel space."""
    ov_w, ov_h = ov_wh
    matrix = forward_matrix(state, bg_wh, ov_wh)
    points = torch.tensor([[0, 0, 1], [ov_w, 0, 1], [ov_w, ov_h, 1], [0, ov_h, 1]], dtype=torch.float64).T
    mapped = (matrix @ points)[:2].T
    return [[float(x), float(y)] for x, y in mapped.tolist()]


def inverse_theta(state: dict, bg_wh: tuple[int, int], ov_wh: tuple[int, int]) -> torch.Tensor:
    """``[1, 2, 3]`` theta for ``affine_grid`` (align_corners=False).

    The inverse is computed in *pixel* space and only then converted into the
    normalized space expected by ``affine_grid``. This keeps rotations rigid on
    non-square backgrounds and overlays.
    """
    bg_w, bg_h = bg_wh
    ov_w, ov_h = ov_wh
    inverse = torch.linalg.inv(forward_matrix(state, bg_wh, ov_wh))
    bg_denorm = torch.tensor([[bg_w / 2, 0, bg_w / 2], [0, bg_h / 2, bg_h / 2], [0, 0, 1]], dtype=torch.float64)
    ov_norm = torch.tensor([[2 / ov_w, 0, -1], [0, 2 / ov_h, -1], [0, 0, 1]], dtype=torch.float64)
    theta = ov_norm @ inverse @ bg_denorm
    return theta[:2].unsqueeze(0)


# ---------------------------------------------------------------------------
# Raster operations
# ---------------------------------------------------------------------------

def to_rgba_chw(frame_hwc: torch.Tensor) -> torch.Tensor:
    """Convert an ``[H, W, C]`` frame into ``[4, H, W]`` (solid alpha for RGB / gray)."""
    chw = frame_hwc.permute(2, 0, 1)
    channels = chw.shape[0]
    if channels >= 4:
        return chw[:4]
    if channels == 3:
        return torch.cat([chw, torch.ones_like(chw[:1])], 0)
    if channels == 1:
        return torch.cat([chw.repeat(3, 1, 1), torch.ones_like(chw)], 0)
    if channels == 2:  # gray + alpha
        return torch.cat([chw[:1].repeat(3, 1, 1), chw[1:2]], 0)
    raise ValueError(f"Unsupported channel count: {channels}")


def warp_overlay(ov_rgba: torch.Tensor, theta: torch.Tensor, out_hw: tuple[int, int]) -> torch.Tensor:
    """Bicubic, premultiplied-alpha affine warp of ``[4, h, w]`` into ``[4, H, W]``."""
    out_h, out_w = out_hw
    alpha = ov_rgba[3:4].clamp(0.0, 1.0)
    premultiplied = torch.cat([ov_rgba[:3].clamp(0.0, 1.0) * alpha, alpha], 0)
    grid = F.affine_grid(theta.to(device=ov_rgba.device, dtype=ov_rgba.dtype), [1, 4, out_h, out_w], align_corners=False)
    sampled = F.grid_sample(premultiplied.unsqueeze(0), grid, mode="bicubic", padding_mode="zeros", align_corners=False)[0]

    warped_alpha = sampled[3:4].clamp(0.0, 1.0)
    rgb = torch.minimum(sampled[:3].clamp(min=0.0), warped_alpha)
    rgb = torch.where(warped_alpha > 1e-6, rgb / warped_alpha.clamp(min=1e-6), torch.zeros_like(rgb))
    return torch.cat([rgb.clamp(0.0, 1.0), warped_alpha], 0)


def blend(mode: str, overlay_rgb: torch.Tensor, background_rgb: torch.Tensor) -> torch.Tensor:
    a, b = overlay_rgb, background_rgb
    if mode == "normal":
        return a
    if mode == "multiply":
        return a * b
    if mode == "screen":
        return 1.0 - (1.0 - a) * (1.0 - b)
    if mode == "overlay":
        return torch.where(b < 0.5, 2.0 * a * b, 1.0 - 2.0 * (1.0 - a) * (1.0 - b))
    if mode == "add":
        return (a + b).clamp(max=1.0)
    raise ValueError(f"Unknown blend mode: {mode}")


def composite_frame(
    bg_hwc: torch.Tensor,
    ov_hwc: torch.Tensor,
    state: dict,
    blend_mode: str,
    opacity: float,
) -> tuple[torch.Tensor, torch.Tensor]:
    """Composite one frame. Returns ``(image [H, W, C_bg], mask [H, W])``."""
    bg_h, bg_w, bg_c = bg_hwc.shape
    ov_h, ov_w = int(ov_hwc.shape[0]), int(ov_hwc.shape[1])

    theta = inverse_theta(state, (bg_w, bg_h), (ov_w, ov_h))
    warped = warp_overlay(to_rgba_chw(ov_hwc), theta, (bg_h, bg_w))

    bg_rgba = to_rgba_chw(bg_hwc).clamp(0.0, 1.0)
    alpha = warped[3:4] * float(opacity)
    blended = blend(blend_mode, warped[:3], bg_rgba[:3])
    rgb = bg_rgba[:3] * (1.0 - alpha) + blended * alpha

    if bg_c >= 4:
        out_alpha = bg_rgba[3:4] + alpha * (1.0 - bg_rgba[3:4])
        out = torch.cat([rgb, out_alpha], 0)
    elif bg_c == 1:
        out = rgb.mean(0, keepdim=True)
    else:
        out = rgb
    return out.permute(1, 2, 0).clamp(0.0, 1.0), alpha[0].clamp(0.0, 1.0)


def composite_batch(
    background: torch.Tensor,
    overlay: torch.Tensor,
    state: dict,
    blend_mode: str,
    opacity: float,
    device: torch.device | None = None,
    output_device: torch.device | None = None,
) -> tuple[torch.Tensor, torch.Tensor]:
    """Composite ``[B, H, W, C]`` batches frame by frame to bound memory use."""
    bg_batch = int(background.shape[0])
    ov_batch = int(overlay.shape[0])
    if ov_batch not in (1, bg_batch):
        raise ValueError(
            f"overlay_image batch size must be 1 or match background_image ({bg_batch}); received {ov_batch}."
        )
    if blend_mode not in BLEND_MODES:
        raise ValueError(f"Unknown blend mode: {blend_mode}")

    device = device or background.device
    output_device = output_device or background.device
    images, masks = [], []
    for index in range(bg_batch):
        bg_frame = background[index].to(device=device, dtype=torch.float32)
        ov_frame = overlay[index if ov_batch > 1 else 0].to(device=device, dtype=torch.float32)
        image, mask = composite_frame(bg_frame, ov_frame, state, blend_mode, opacity)
        images.append(image.to(output_device))
        masks.append(mask.to(output_device))
    return torch.stack(images, 0), torch.stack(masks, 0)


# ---------------------------------------------------------------------------
# Helpers for outputs and caching
# ---------------------------------------------------------------------------

def tensor_signature(*tensors: torch.Tensor) -> str:
    """Cheap, deterministic content signature (shape + strided subsample)."""
    digest = hashlib.sha1()
    for tensor in tensors:
        digest.update(str(tuple(tensor.shape)).encode())
        if tensor.dim() >= 3:
            h, w = int(tensor.shape[1]), int(tensor.shape[2])
            step = max(1, int(math.sqrt(max(1, h * w) / 65536)))
            sample = tensor[:, ::step, ::step]
        else:
            sample = tensor
        digest.update(sample.detach().to("cpu", torch.float32).contiguous().numpy().tobytes())
    return digest.hexdigest()


def build_transform_data(
    state: dict,
    bg_wh: tuple[int, int],
    ov_wh: tuple[int, int],
    blend_mode: str,
    opacity: float,
    paused: bool,
) -> str:
    matrix = forward_matrix(state, bg_wh, ov_wh)
    payload = {
        "version": STATE_VERSION,
        "translation_norm": list(state["translation_norm"]),
        "scale_factors": list(state["scale_factors"]),
        "rotation_deg": float(state["rotation_deg"]),
        "anchor_point": list(state["anchor_point"]),
        "blend_mode": blend_mode,
        "opacity": float(opacity),
        "bg_size": [int(bg_wh[0]), int(bg_wh[1])],
        "overlay_size": [int(ov_wh[0]), int(ov_wh[1])],
        "matrix_px": [[round(float(v), 6) for v in row] for row in matrix[:2].tolist()],
        "corners_px": [[round(x, 4), round(y, 4)] for x, y in transformed_corners(state, bg_wh, ov_wh)],
        "interactive": bool(paused),
    }
    return json.dumps(payload)
