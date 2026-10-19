"""Pure color grading and post-processing shader math for Duffy_RealTimeGradingProcessor.

This module intentionally has no dependency on the ComfyUI server so it can be
unit-tested in isolation. All mathematical operations mirror the WebGL2 fragment
shader in ``src/RealTimeGradingProcessor.vue``.
"""

from __future__ import annotations

import hashlib
import json
import math
from typing import Any

import numpy as np
import torch
import torch.nn.functional as F

STATE_VERSION = 1
GRADIENT_BLEND_MODES = ["Normal", "Overlay", "Soft Light", "Multiply", "Screen"]
CURVE_CHANNELS = ("rgb", "r", "g", "b")
MAX_CURVE_POINTS = 64
MAX_GRADIENT_STOPS = 32


# ---------------------------------------------------------------------------
# Default state & validation
# ---------------------------------------------------------------------------

def default_curves() -> dict[str, list[list[float]]]:
    return {
        "rgb": [[0.0, 0.0], [1.0, 1.0]],
        "r": [[0.0, 0.0], [1.0, 1.0]],
        "g": [[0.0, 0.0], [1.0, 1.0]],
        "b": [[0.0, 0.0], [1.0, 1.0]],
    }


def default_params() -> dict[str, Any]:
    return {
        "version": STATE_VERSION,
        "curves": default_curves(),
        "white_balance": {
            "temperature": 0.0,
            "tint": 0.0,
        },
        "exposure_contrast_saturation": {
            "exposure": 0.0,
            "contrast": 1.0,
            "saturation": 1.0,
            "vibrance": 0.0,
            "hue_shift": 0.0,
        },
        "shadows_highlights": {
            "shadows": 0.0,
            "highlights": 0.0,
        },
        "lift_gamma_gain": {
            "lift": 0.0,
            "gamma": 1.0,
            "gain": 1.0,
        },
        "gradient_map": {
            "enabled": False,
            "stops": [
                {"offset": 0.0, "color": "#000000"},
                {"offset": 1.0, "color": "#ffffff"},
            ],
            "blending_mode": "Normal",
            "opacity": 1.0,
        },
        "bloom": {
            "intensity": 0.0,
            "threshold": 0.8,
            "radius": 2.0,
        },
        "chromatic_aberration": 0.0,
        "sharpen": 0.0,
        "vignette_intensity": 0.0,
        "film_grain": 0.0,
    }


def clamp_float(value: Any, minimum: float, maximum: float, fallback: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    if not math.isfinite(parsed):
        return fallback
    return max(minimum, min(maximum, parsed))


def normalize_hex_color(hex_str: Any, fallback: str = "#000000") -> str:
    if not isinstance(hex_str, str):
        return fallback
    cleaned = hex_str.strip().lstrip("#")
    if len(cleaned) == 3:
        cleaned = "".join(c * 2 for c in cleaned)
    if len(cleaned) != 6:
        return fallback
    try:
        int(cleaned, 16)
    except ValueError:
        return fallback
    return f"#{cleaned.lower()}"


def parse_hex_color(hex_str: str) -> list[float]:
    normalized = normalize_hex_color(hex_str, "#000000").lstrip("#")
    return [int(normalized[i : i + 2], 16) / 255.0 for i in (0, 2, 4)]


def _sanitize_curve_points(raw_points: Any) -> list[list[float]]:
    if not isinstance(raw_points, list) or len(raw_points) < 2:
        return [[0.0, 0.0], [1.0, 1.0]]
    cleaned: list[list[float]] = []
    for item in raw_points[:MAX_CURVE_POINTS]:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            x = clamp_float(item[0], 0.0, 1.0, 0.0)
            y = clamp_float(item[1], 0.0, 1.0, 0.0)
            cleaned.append([x, y])
    if len(cleaned) < 2:
        return [[0.0, 0.0], [1.0, 1.0]]
    cleaned.sort(key=lambda pt: pt[0])
    return cleaned


def _sanitize_gradient_stops(raw_stops: Any) -> list[dict[str, Any]]:
    default_stops = [
        {"offset": 0.0, "color": "#000000"},
        {"offset": 1.0, "color": "#ffffff"},
    ]
    if not isinstance(raw_stops, list) or len(raw_stops) < 2:
        return default_stops
    cleaned: list[dict[str, Any]] = []
    for item in raw_stops[:MAX_GRADIENT_STOPS]:
        if isinstance(item, dict):
            offset = clamp_float(item.get("offset", 0.0), 0.0, 1.0, 0.0)
            color = normalize_hex_color(item.get("color", "#ffffff"), "#ffffff")
            cleaned.append({"offset": offset, "color": color})
    if len(cleaned) < 2:
        return default_stops
    cleaned.sort(key=lambda s: s["offset"])
    return cleaned


def validate_params(raw: Any) -> dict[str, Any]:
    """Validate and sanitize a grading parameter dictionary."""
    if not isinstance(raw, dict):
        raise ValueError("Grading parameters must be a JSON object.")

    raw_curves = raw.get("curves") if isinstance(raw.get("curves"), dict) else {}
    curves = {
        ch: _sanitize_curve_points(raw_curves.get(ch))
        for ch in CURVE_CHANNELS
    }

    raw_wb = raw.get("white_balance") if isinstance(raw.get("white_balance"), dict) else {}
    white_balance = {
        "temperature": clamp_float(raw_wb.get("temperature", 0.0), -1.0, 1.0, 0.0),
        "tint": clamp_float(raw_wb.get("tint", 0.0), -1.0, 1.0, 0.0),
    }

    raw_ecs = (
        raw.get("exposure_contrast_saturation")
        if isinstance(raw.get("exposure_contrast_saturation"), dict)
        else {}
    )
    ecs = {
        "exposure": clamp_float(raw_ecs.get("exposure", 0.0), -2.0, 2.0, 0.0),
        "contrast": clamp_float(raw_ecs.get("contrast", 1.0), 0.0, 3.0, 1.0),
        "saturation": clamp_float(raw_ecs.get("saturation", 1.0), 0.0, 3.0, 1.0),
        "vibrance": clamp_float(raw_ecs.get("vibrance", 0.0), -1.0, 1.0, 0.0),
        "hue_shift": clamp_float(raw_ecs.get("hue_shift", 0.0), -180.0, 180.0, 0.0),
    }

    raw_sh = (
        raw.get("shadows_highlights")
        if isinstance(raw.get("shadows_highlights"), dict)
        else {}
    )
    shadows_highlights = {
        "shadows": clamp_float(raw_sh.get("shadows", 0.0), -1.0, 1.0, 0.0),
        "highlights": clamp_float(raw_sh.get("highlights", 0.0), -1.0, 1.0, 0.0),
    }

    raw_lgg = raw.get("lift_gamma_gain") if isinstance(raw.get("lift_gamma_gain"), dict) else {}
    lgg = {
        "lift": clamp_float(raw_lgg.get("lift", 0.0), -1.0, 1.0, 0.0),
        "gamma": clamp_float(raw_lgg.get("gamma", 1.0), 0.1, 4.0, 1.0),
        "gain": clamp_float(raw_lgg.get("gain", 1.0), 0.0, 3.0, 1.0),
    }

    raw_grad = raw.get("gradient_map") if isinstance(raw.get("gradient_map"), dict) else {}
    blend_mode = raw_grad.get("blending_mode", "Normal")
    if blend_mode not in GRADIENT_BLEND_MODES:
        blend_mode = "Normal"
    gradient_map = {
        "enabled": bool(raw_grad.get("enabled", False)),
        "stops": _sanitize_gradient_stops(raw_grad.get("stops")),
        "blending_mode": blend_mode,
        "opacity": clamp_float(raw_grad.get("opacity", 1.0), 0.0, 1.0, 1.0),
    }

    raw_bloom = raw.get("bloom") if isinstance(raw.get("bloom"), dict) else {}
    bloom = {
        "intensity": clamp_float(raw_bloom.get("intensity", 0.0), 0.0, 2.0, 0.0),
        "threshold": clamp_float(raw_bloom.get("threshold", 0.8), 0.0, 1.0, 0.8),
        "radius": clamp_float(raw_bloom.get("radius", 2.0), 0.5, 8.0, 2.0),
    }

    state: dict[str, Any] = {
        "version": STATE_VERSION,
        "curves": curves,
        "white_balance": white_balance,
        "exposure_contrast_saturation": ecs,
        "shadows_highlights": shadows_highlights,
        "lift_gamma_gain": lgg,
        "gradient_map": gradient_map,
        "bloom": bloom,
        "chromatic_aberration": clamp_float(raw.get("chromatic_aberration", 0.0), 0.0, 0.05, 0.0),
        "sharpen": clamp_float(raw.get("sharpen", 0.0), 0.0, 2.0, 0.0),
        "vignette_intensity": clamp_float(raw.get("vignette_intensity", 0.0), 0.0, 1.5, 0.0),
        "film_grain": clamp_float(raw.get("film_grain", 0.0), 0.0, 0.1, 0.0),
    }

    if "overall_strength" in raw:
        state["overall_strength"] = clamp_float(raw.get("overall_strength"), 0.0, 1.0, 1.0)
    if isinstance(raw.get("input_signature"), str) and len(raw["input_signature"]) <= 128:
        state["input_signature"] = raw["input_signature"]

    return state


def parse_saved_params(value: Any) -> dict[str, Any] | None:
    """Leniently parse saved JSON widget state. Returns ``None`` if empty or invalid."""
    if value is None:
        return None
    data = value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped or stripped == "{}":
            return None
        try:
            data = json.loads(stripped)
        except (json.JSONDecodeError, TypeError):
            return None
    if not isinstance(data, dict) or not data:
        return None
    try:
        return validate_params(data)
    except (ValueError, TypeError):
        return None


def is_default_curve(points: list[list[float]] | None) -> bool:
    if not points or len(points) != 2:
        return False
    return (
        abs(points[0][0] - 0.0) < 1e-5
        and abs(points[0][1] - 0.0) < 1e-5
        and abs(points[1][0] - 1.0) < 1e-5
        and abs(points[1][1] - 1.0) < 1e-5
    )


def is_identity_params(params: dict[str, Any]) -> bool:
    """Return True if all grading parameters are at their neutral/identity values."""
    curves = params.get("curves", {})
    if not all(is_default_curve(curves.get(ch)) for ch in CURVE_CHANNELS):
        return False

    wb = params.get("white_balance", {})
    if abs(wb.get("temperature", 0.0)) > 1e-6 or abs(wb.get("tint", 0.0)) > 1e-6:
        return False

    ecs = params.get("exposure_contrast_saturation", {})
    if (
        abs(ecs.get("exposure", 0.0)) > 1e-6
        or abs(ecs.get("contrast", 1.0) - 1.0) > 1e-6
        or abs(ecs.get("saturation", 1.0) - 1.0) > 1e-6
        or abs(ecs.get("vibrance", 0.0)) > 1e-6
        or abs(ecs.get("hue_shift", 0.0)) > 1e-6
    ):
        return False

    sh = params.get("shadows_highlights", {})
    if abs(sh.get("shadows", 0.0)) > 1e-6 or abs(sh.get("highlights", 0.0)) > 1e-6:
        return False

    lgg = params.get("lift_gamma_gain", {})
    if (
        abs(lgg.get("lift", 0.0)) > 1e-6
        or abs(lgg.get("gamma", 1.0) - 1.0) > 1e-6
        or abs(lgg.get("gain", 1.0) - 1.0) > 1e-6
    ):
        return False

    grad = params.get("gradient_map", {})
    if grad.get("enabled", False) and grad.get("opacity", 1.0) > 1e-6:
        return False

    bloom = params.get("bloom", {})
    if bloom.get("intensity", 0.0) > 1e-6:
        return False

    if (
        params.get("chromatic_aberration", 0.0) > 1e-6
        or params.get("sharpen", 0.0) > 1e-6
        or params.get("vignette_intensity", 0.0) > 1e-6
        or params.get("film_grain", 0.0) > 1e-6
    ):
        return False

    return True


# ---------------------------------------------------------------------------
# Splines, LUTs, and Gaussian Kernels
# ---------------------------------------------------------------------------

def interpolate_monotone_cubic(points: list[list[float]] | None) -> np.ndarray:
    """Evaluate Fritsch-Carlson monotone cubic spline at 256 uniform steps in [0, 1]."""
    if not points or len(points) < 2 or is_default_curve(points):
        return np.linspace(0.0, 1.0, 256, dtype=np.float32)

    sorted_pts = sorted(points, key=lambda p: p[0])
    xs = np.array([p[0] for p in sorted_pts], dtype=np.float32)
    ys = np.array([p[1] for p in sorted_pts], dtype=np.float32)

    for i in range(1, len(xs)):
        if xs[i] <= xs[i - 1]:
            xs[i] = xs[i - 1] + 1e-5

    n = len(xs)
    ms = np.zeros(n - 1, dtype=np.float32)
    for i in range(n - 1):
        ms[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])

    ds = np.zeros(n, dtype=np.float32)
    ds[0] = ms[0]
    ds[-1] = ms[-1]
    for i in range(1, n - 1):
        ds[i] = (ms[i - 1] + ms[i]) / 2.0

    for i in range(n - 1):
        if ms[i] == 0.0:
            ds[i] = 0.0
            ds[i + 1] = 0.0
        else:
            alpha = ds[i] / ms[i]
            beta = ds[i + 1] / ms[i]
            val = alpha * alpha + beta * beta
            if val > 9.0:
                tau = 3.0 / math.sqrt(float(val))
                ds[i] = tau * alpha * ms[i]
                ds[i + 1] = tau * beta * ms[i]

    out_x = np.linspace(0.0, 1.0, 256, dtype=np.float32)
    out_y = np.zeros(256, dtype=np.float32)

    for idx, x in enumerate(out_x):
        if x <= xs[0]:
            out_y[idx] = ys[0]
            continue
        if x >= xs[-1]:
            out_y[idx] = ys[-1]
            continue

        i = 0
        while i < n - 1 and x > xs[i + 1]:
            i += 1

        h = xs[i + 1] - xs[i]
        t = (x - xs[i]) / h

        h00 = 2.0 * t**3 - 3.0 * t**2 + 1.0
        h10 = t**3 - 2.0 * t**2 + t
        h01 = -2.0 * t**3 + 3.0 * t**2
        h11 = t**3 - t**2

        out_y[idx] = h00 * ys[i] + h10 * h * ds[i] + h01 * ys[i + 1] + h11 * h * ds[i + 1]

    return np.clip(out_y, 0.0, 1.0)


def apply_1d_lut(channel: torch.Tensor, lut: torch.Tensor) -> torch.Tensor:
    """Linearly interpolate a 256-entry 1D LUT on a float tensor in [0, 1]."""
    pos = (channel.clamp(0.0, 1.0) * 255.0)
    idx0 = pos.floor().long().clamp(0, 255)
    idx1 = (idx0 + 1).clamp(0, 255)
    frac = pos - idx0.to(dtype=channel.dtype)
    return torch.lerp(lut[idx0], lut[idx1], frac)


def generate_gradient_lut(
    stops: list[dict[str, Any]],
    device: torch.device,
    dtype: torch.dtype,
) -> torch.Tensor:
    """Generate a ``[256, 3]`` gradient map LUT tensor from color stops."""
    sanitized = _sanitize_gradient_stops(stops)
    sorted_stops = [dict(s) for s in sanitized]

    if sorted_stops[0]["offset"] > 0.0:
        sorted_stops.insert(0, {"offset": 0.0, "color": sorted_stops[0]["color"]})
    if sorted_stops[-1]["offset"] < 1.0:
        sorted_stops.append({"offset": 1.0, "color": sorted_stops[-1]["color"]})

    lut = np.zeros((256, 3), dtype=np.float32)
    offsets = [float(s["offset"]) for s in sorted_stops]
    colors = [parse_hex_color(s["color"]) for s in sorted_stops]

    for i in range(256):
        t = i / 255.0
        idx = 0
        while idx < len(offsets) - 1 and t > offsets[idx + 1]:
            idx += 1

        t0 = offsets[idx]
        t1 = offsets[idx + 1]
        c0 = np.array(colors[idx], dtype=np.float32)
        c1 = np.array(colors[idx + 1], dtype=np.float32)

        if abs(t1 - t0) < 1e-7:
            c = c0
        else:
            factor = (t - t0) / (t1 - t0)
            c = c0 + factor * (c1 - c0)

        lut[i] = c

    return torch.tensor(lut, device=device, dtype=dtype)


def make_gaussian_kernel_1d(sigma: float, device: torch.device, dtype: torch.dtype) -> torch.Tensor:
    sigma = max(float(sigma), 1e-3)
    radius = max(1, int(math.ceil(sigma * 3.0)))
    coords = torch.arange(-radius, radius + 1, device=device, dtype=dtype)
    kernel = torch.exp(-(coords * coords) / (2.0 * sigma * sigma))
    return kernel / torch.sum(kernel)


def apply_separable_gaussian_blur(image_bchw: torch.Tensor, sigma: float) -> torch.Tensor:
    if sigma <= 0.0:
        return image_bchw

    _, channels, _, _ = image_bchw.shape
    device = image_bchw.device
    dtype = image_bchw.dtype

    kernel_1d = make_gaussian_kernel_1d(sigma, device=device, dtype=dtype)
    kernel_x = kernel_1d.view(1, 1, 1, -1).repeat(channels, 1, 1, 1)
    kernel_y = kernel_1d.view(1, 1, -1, 1).repeat(channels, 1, 1, 1)

    pad_x = kernel_x.shape[-1] // 2
    pad_y = kernel_y.shape[-2] // 2

    blurred = F.conv2d(F.pad(image_bchw, (pad_x, pad_x, 0, 0), mode="replicate"), kernel_x, groups=channels)
    blurred = F.conv2d(F.pad(blurred, (0, 0, pad_y, pad_y), mode="replicate"), kernel_y, groups=channels)
    return blurred


def apply_hue_rotation_bchw(rgb_bchw: torch.Tensor, hue_degrees: float) -> torch.Tensor:
    """Rotate hue in RGB space around the neutral axis (1, 1, 1)/sqrt(3)."""
    if abs(hue_degrees) < 1e-6:
        return rgb_bchw
    angle = math.radians(float(hue_degrees))
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    one_third = 1.0 / 3.0
    sqrt_third = math.sqrt(one_third)

    m00 = cos_a + (1.0 - cos_a) * one_third
    m01 = one_third * (1.0 - cos_a) - sqrt_third * sin_a
    m02 = one_third * (1.0 - cos_a) + sqrt_third * sin_a

    m10 = one_third * (1.0 - cos_a) + sqrt_third * sin_a
    m11 = cos_a + one_third * (1.0 - cos_a)
    m12 = one_third * (1.0 - cos_a) - sqrt_third * sin_a

    m20 = one_third * (1.0 - cos_a) - sqrt_third * sin_a
    m21 = one_third * (1.0 - cos_a) + sqrt_third * sin_a
    m22 = cos_a + one_third * (1.0 - cos_a)

    r = rgb_bchw[:, 0:1]
    g = rgb_bchw[:, 1:2]
    b = rgb_bchw[:, 2:3]

    out_r = m00 * r + m01 * g + m02 * b
    out_g = m10 * r + m11 * g + m12 * b
    out_b = m20 * r + m21 * g + m22 * b
    return torch.cat([out_r, out_g, out_b], dim=1)


# ---------------------------------------------------------------------------
# Full-resolution grading pipeline
# ---------------------------------------------------------------------------

def grade_frame_rgb(
    rgb_hwc: torch.Tensor,
    params: dict[str, Any],
    frame_index: int = 0,
) -> torch.Tensor:
    """Grade a single ``[H, W, 3]`` float32 tensor in ``[0, 1]``."""
    if is_identity_params(params):
        return rgb_hwc.clamp(0.0, 1.0)

    H, W, _ = rgb_hwc.shape
    device = rgb_hwc.device
    dtype = rgb_hwc.dtype

    # Work in [1, 3, H, W]
    x = rgb_hwc.permute(2, 0, 1).unsqueeze(0).clone()

    sharpen = float(params.get("sharpen", 0.0))
    chromatic_aberration = float(params.get("chromatic_aberration", 0.0))
    vignette_intensity = float(params.get("vignette_intensity", 0.0))
    film_grain = float(params.get("film_grain", 0.0))

    wb = params.get("white_balance", {})
    temperature = float(wb.get("temperature", 0.0))
    tint = float(wb.get("tint", 0.0))

    ecs = params.get("exposure_contrast_saturation", {})
    exposure = float(ecs.get("exposure", 0.0))
    contrast = float(ecs.get("contrast", 1.0))
    saturation = float(ecs.get("saturation", 1.0))
    vibrance = float(ecs.get("vibrance", 0.0))
    hue_shift = float(ecs.get("hue_shift", 0.0))

    sh = params.get("shadows_highlights", {})
    shadows = float(sh.get("shadows", 0.0))
    highlights = float(sh.get("highlights", 0.0))

    lgg = params.get("lift_gamma_gain", {})
    lift = float(lgg.get("lift", 0.0))
    gamma = float(lgg.get("gamma", 1.0))
    gain = float(lgg.get("gain", 1.0))

    curves = params.get("curves", {})

    grad_map = params.get("gradient_map", {})
    grad_enabled = bool(grad_map.get("enabled", False))
    grad_stops = grad_map.get("stops", [])
    grad_mode = grad_map.get("blending_mode", "Normal")
    grad_opacity = float(grad_map.get("opacity", 1.0))

    bloom = params.get("bloom", {})
    bloom_intensity = float(bloom.get("intensity", 0.0))
    bloom_threshold = float(bloom.get("threshold", 0.8))
    bloom_radius = float(bloom.get("radius", 2.0))

    need_grid = chromatic_aberration > 0.0 or vignette_intensity > 0.0
    grid: torch.Tensor | None = None
    if need_grid:
        grid_y = torch.linspace(-1.0, 1.0, H, device=device, dtype=dtype)
        grid_x = torch.linspace(-1.0, 1.0, W, device=device, dtype=dtype)
        mesh_y, mesh_x = torch.meshgrid(grid_y, grid_x, indexing="ij")
        grid = torch.stack([mesh_x, mesh_y], dim=-1)  # [H, W, 2]

    # 1. Sharpening (Laplacian filter)
    if sharpen > 0.0:
        kernel = torch.tensor(
            [[0.0, -1.0, 0.0], [-1.0, 4.0, -1.0], [0.0, -1.0, 0.0]],
            device=device,
            dtype=dtype,
        ).view(1, 1, 3, 3).repeat(3, 1, 1, 1)
        padded = F.pad(x, (1, 1, 1, 1), mode="replicate")
        laplacian = F.conv2d(padded, kernel, groups=3)
        x = torch.clamp(x + sharpen * laplacian, 0.0, 1.0)

    # 2. Chromatic Aberration
    if chromatic_aberration > 0.0 and grid is not None:
        dist = torch.norm(grid, dim=-1, keepdim=True)  # [H, W, 1]
        norm_grid = grid / (dist + 1e-8)
        offset = norm_grid * (dist * dist) * chromatic_aberration

        grid_red = (grid + offset).unsqueeze(0)
        grid_blue = (grid - offset).unsqueeze(0)

        r_chan = F.grid_sample(
            x[:, 0:1], grid_red, mode="bilinear", padding_mode="border", align_corners=True
        )
        g_chan = x[:, 1:2]
        b_chan = F.grid_sample(
            x[:, 2:3], grid_blue, mode="bilinear", padding_mode="border", align_corners=True
        )
        x = torch.cat([r_chan, g_chan, b_chan], dim=1)

    # 3. White Balance (Temperature & Tint)
    if abs(temperature) > 1e-6 or abs(tint) > 1e-6:
        r_mult = 1.0 + temperature * 0.25 + tint * 0.12
        g_mult = 1.0 - tint * 0.24
        b_mult = 1.0 - temperature * 0.25 + tint * 0.12
        wb_scale = torch.tensor([r_mult, g_mult, b_mult], device=device, dtype=dtype).view(1, 3, 1, 1)
        x = torch.clamp(x * wb_scale, 0.0, 1.0)

    # 4. Exposure & Contrast
    if abs(exposure) > 1e-6:
        x = x * (2.0 ** exposure)

    if abs(contrast - 1.0) > 1e-6:
        x = (x - 0.5) * contrast + 0.5

    x = torch.clamp(x, 0.0, 1.0)

    # 5. Shadows & Highlights Recovery
    if abs(shadows) > 1e-6 or abs(highlights) > 1e-6:
        lum_sh = 0.2126 * x[:, 0:1] + 0.7152 * x[:, 1:2] + 0.0722 * x[:, 2:3]
        shadow_weight = (1.0 - lum_sh) ** 2
        highlight_weight = lum_sh ** 2
        delta = shadows * 0.35 * shadow_weight + highlights * 0.35 * highlight_weight
        x = torch.clamp(x + delta, 0.0, 1.0)

    # 6. Hue Shift, Saturation & Vibrance
    if abs(hue_shift) > 1e-6:
        x = torch.clamp(apply_hue_rotation_bchw(x, hue_shift), 0.0, 1.0)

    if abs(saturation - 1.0) > 1e-6 or abs(vibrance) > 1e-6:
        lum = 0.2126 * x[:, 0:1] + 0.7152 * x[:, 1:2] + 0.0722 * x[:, 2:3]
        if abs(saturation - 1.0) > 1e-6:
            x = lum + (x - lum) * saturation
        if abs(vibrance) > 1e-6:
            max_c = torch.amax(x, dim=1, keepdim=True)
            min_c = torch.amin(x, dim=1, keepdim=True)
            sat_amt = (max_c - min_c).clamp(0.0, 1.0)
            vib_boost = 1.0 + vibrance * (1.0 - sat_amt)
            x = lum + (x - lum) * vib_boost
        x = torch.clamp(x, 0.0, 1.0)

    # 7. Lift / Gamma / Gain
    if abs(lift) > 1e-6:
        x = x + lift
    if abs(gamma - 1.0) > 1e-6:
        x = torch.pow(torch.clamp(x, 1e-6, 1.0), 1.0 / max(gamma, 1e-3))
    if abs(gain - 1.0) > 1e-6:
        x = x * gain
    x = torch.clamp(x, 0.0, 1.0)

    # 8. Monotone Cubic Tonal Curves (with linear fractional LUT interpolation)
    if not all(is_default_curve(curves.get(ch)) for ch in CURVE_CHANNELS):
        lut_rgb = torch.tensor(interpolate_monotone_cubic(curves.get("rgb")), device=device, dtype=dtype)
        lut_r = torch.tensor(interpolate_monotone_cubic(curves.get("r")), device=device, dtype=dtype)
        lut_g = torch.tensor(interpolate_monotone_cubic(curves.get("g")), device=device, dtype=dtype)
        lut_b = torch.tensor(interpolate_monotone_cubic(curves.get("b")), device=device, dtype=dtype)

        r_mapped = apply_1d_lut(x[:, 0], lut_r)
        g_mapped = apply_1d_lut(x[:, 1], lut_g)
        b_mapped = apply_1d_lut(x[:, 2], lut_b)

        r_final = apply_1d_lut(r_mapped, lut_rgb)
        g_final = apply_1d_lut(g_mapped, lut_rgb)
        b_final = apply_1d_lut(b_mapped, lut_rgb)

        x = torch.stack([r_final, g_final, b_final], dim=1).clamp(0.0, 1.0)

    # 9. Gradient Map Color Balancing
    if grad_enabled and grad_opacity > 1e-6:
        luminance = 0.2126 * x[:, 0:1] + 0.7152 * x[:, 1:2] + 0.0722 * x[:, 2:3]
        grad_lut = generate_gradient_lut(grad_stops, device=device, dtype=dtype)
        idx_lum = (luminance * 255.0).clamp(0.0, 255.0).round().long().squeeze(1)
        grad_mapped = grad_lut[idx_lum].permute(0, 3, 1, 2)  # [1, 3, H, W]

        if grad_mode == "Normal":
            blended = grad_mapped
        elif grad_mode == "Overlay":
            mask = x < 0.5
            blended = torch.where(mask, 2.0 * x * grad_mapped, 1.0 - 2.0 * (1.0 - x) * (1.0 - grad_mapped))
        elif grad_mode == "Soft Light":
            blended = (1.0 - 2.0 * grad_mapped) * (x * x) + 2.0 * grad_mapped * x
        elif grad_mode == "Multiply":
            blended = x * grad_mapped
        elif grad_mode == "Screen":
            blended = 1.0 - (1.0 - x) * (1.0 - grad_mapped)
        else:
            blended = grad_mapped

        x = torch.clamp((1.0 - grad_opacity) * x + grad_opacity * blended, 0.0, 1.0)

    # 10. Bloom (highlight threshold + downsampled separable Gaussian blur)
    if bloom_intensity > 0.0:
        bloom_threshold_scale = max(1e-6, 1.0 - bloom_threshold)
        bloom_lum = 0.2126 * x[:, 0:1] + 0.7152 * x[:, 1:2] + 0.0722 * x[:, 2:3]
        bloom_mask = torch.clamp((bloom_lum - bloom_threshold) / bloom_threshold_scale, 0.0, 1.0)
        bloom_source = x * bloom_mask

        down_h = max(1, H // 2)
        down_w = max(1, W // 2)
        bloom_small = F.interpolate(bloom_source, size=(down_h, down_w), mode="bilinear", align_corners=False)
        bloom_blurred = apply_separable_gaussian_blur(bloom_small, sigma=max(0.5, bloom_radius * 0.5))
        bloom_full = F.interpolate(bloom_blurred, size=(H, W), mode="bilinear", align_corners=False)

        x = torch.clamp(x + bloom_full * bloom_intensity, 0.0, 1.0)

    # 11. Vignette Falloff
    if vignette_intensity > 0.0 and grid is not None:
        dist_v = torch.norm(grid, dim=-1, keepdim=True).permute(2, 0, 1).unsqueeze(0)  # [1, 1, H, W]
        vignette = torch.clamp(1.0 - (dist_v * dist_v * vignette_intensity), 0.0, 1.0)
        x = x * vignette

    # 12. Cinematic Film Grain (deterministic generator per frame)
    if film_grain > 0.0:
        gen = torch.Generator(device="cpu")
        gen.manual_seed(1337 + int(frame_index))
        noise = torch.randn((1, 1, H, W), generator=gen, dtype=torch.float32).to(device=device, dtype=dtype)
        x = torch.clamp(x + noise * film_grain, 0.0, 1.0)

    out_hwc = x[0].permute(1, 2, 0).contiguous()
    return torch.nan_to_num(out_hwc, nan=0.0, posinf=1.0, neginf=0.0).clamp(0.0, 1.0)


def apply_grading_batch(
    image: torch.Tensor,
    params: dict[str, Any],
    overall_strength: float = 1.0,
    mask: torch.Tensor | None = None,
    device: torch.device | None = None,
    output_device: torch.device | None = None,
    output_dtype: torch.dtype = torch.float32,
) -> torch.Tensor:
    """Apply full-resolution grading to an ``IMAGE`` batch ``[B, H, W, C]``."""
    if image.ndim == 3:
        image = image.unsqueeze(0)
    if image.ndim != 4:
        raise ValueError(f"Expected IMAGE tensor in [B, H, W, C] format, got {tuple(image.shape)}.")

    batch_size, height, width, channels = image.shape
    if batch_size == 0:
        raise ValueError("Input IMAGE batch is empty.")

    sanitized_params = validate_params(params)
    strength = clamp_float(overall_strength, 0.0, 1.0, 1.0)

    compute_device = device or image.device
    target_device = output_device or image.device

    # Prepare optional mask in [B, H, W, 1]
    mask_bhw1: torch.Tensor | None = None
    if mask is not None:
        m = mask.detach().to(device=compute_device, dtype=torch.float32)
        if m.ndim == 2:
            m = m.unsqueeze(0)
        elif m.ndim == 4 and m.shape[-1] == 1:
            m = m.squeeze(-1)
        if m.shape[1] != height or m.shape[2] != width:
            m = F.interpolate(
                m.unsqueeze(1), size=(height, width), mode="bilinear", align_corners=False
            ).squeeze(1)
        mask_bhw1 = m.clamp(0.0, 1.0).unsqueeze(-1)

    if strength <= 1e-6 or is_identity_params(sanitized_params):
        clean = torch.nan_to_num(image.detach(), nan=0.0, posinf=1.0, neginf=0.0).clamp(0.0, 1.0)
        return clean.to(device=target_device, dtype=output_dtype)

    output_frames: list[torch.Tensor] = []
    for idx in range(batch_size):
        frame = image[idx].detach().to(device=compute_device, dtype=torch.float32).clamp(0.0, 1.0)
        if channels == 1:
            rgb_in = frame.repeat(1, 1, 3)
            alpha_in = None
        elif channels >= 4:
            rgb_in = frame[:, :, :3]
            alpha_in = frame[:, :, 3:4]
        else:
            rgb_in = frame[:, :, :3]
            alpha_in = None

        graded_rgb = grade_frame_rgb(rgb_in, sanitized_params, frame_index=idx)

        # Blend with original according to overall_strength and optional mask
        if mask_bhw1 is not None:
            m_frame = mask_bhw1[idx if mask_bhw1.shape[0] > 1 else 0]
            blend_weight = m_frame * strength
            graded_rgb = torch.lerp(rgb_in, graded_rgb, blend_weight)
        elif strength < 1.0:
            graded_rgb = torch.lerp(rgb_in, graded_rgb, strength)

        if channels == 1:
            out_frame = graded_rgb.mean(dim=-1, keepdim=True)
        elif alpha_in is not None:
            out_frame = torch.cat([graded_rgb, alpha_in], dim=-1)
        else:
            out_frame = graded_rgb

        out_frame = torch.nan_to_num(out_frame, nan=0.0, posinf=1.0, neginf=0.0).clamp(0.0, 1.0)
        output_frames.append(out_frame.to(device=target_device, dtype=output_dtype))

    return torch.stack(output_frames, dim=0)


# ---------------------------------------------------------------------------
# Telemetry & signatures
# ---------------------------------------------------------------------------

def compute_histogram(frame_hwc: torch.Tensor) -> dict[str, list[float]]:
    """Compute 256-bin RGB and Rec.709 luminance histograms for a single frame."""
    rgb = frame_hwc.detach().to(device="cpu", dtype=torch.float32).clamp(0.0, 1.0)
    if rgb.ndim == 4:
        rgb = rgb[0]
    if rgb.shape[-1] == 1:
        rgb = rgb.repeat(1, 1, 3)

    out_r = rgb[:, :, 0].flatten()
    out_g = rgb[:, :, 1].flatten()
    out_b = rgb[:, :, 2].flatten()
    out_lum = 0.2126 * out_r + 0.7152 * out_g + 0.0722 * out_b

    try:
        hist_r = torch.histc(out_r, bins=256, min=0.0, max=1.0).tolist()
        hist_g = torch.histc(out_g, bins=256, min=0.0, max=1.0).tolist()
        hist_b = torch.histc(out_b, bins=256, min=0.0, max=1.0).tolist()
        hist_lum = torch.histc(out_lum, bins=256, min=0.0, max=1.0).tolist()
    except Exception:
        hist_r = [0.0] * 256
        hist_g = [0.0] * 256
        hist_b = [0.0] * 256
        hist_lum = [0.0] * 256

    return {
        "r": hist_r,
        "g": hist_g,
        "b": hist_b,
        "lum": hist_lum,
    }


def tensor_signature(*tensors: torch.Tensor | None) -> str:
    """Cheap, deterministic content signature (shape + strided subsample)."""
    digest = hashlib.sha1()
    for tensor in tensors:
        if tensor is None:
            digest.update(b"none")
            continue
        digest.update(str(tuple(tensor.shape)).encode())
        if tensor.dim() >= 3:
            h, w = int(tensor.shape[1]), int(tensor.shape[2])
            step = max(1, int(math.sqrt(max(1, h * w) / 65536)))
            sample = tensor[:, ::step, ::step]
        else:
            sample = tensor
        digest.update(sample.detach().to("cpu", torch.float32).contiguous().numpy().tobytes())
    return digest.hexdigest()
