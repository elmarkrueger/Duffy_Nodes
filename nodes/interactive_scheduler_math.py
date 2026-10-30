"""Pure mathematical and tensor schedule operations for DuffyInteractiveScheduler.

Implements ComfyUI-compatible baseline noise schedule generation (model-aware via
``comfy.samplers.calculate_sigmas`` and standalone analytical fallbacks), partial
denoise tail-truncation matching stock ``BasicScheduler``, Fritsch-Carlson
monotonic cubic Hermite (PCHIP) curve resampling, and strict ``SIGMAS`` tensor
validation invariants.
"""

from __future__ import annotations

import json
import math
from typing import Any

import numpy as np
import torch

SCHEMA_VERSION = "1.0"
MIN_STEPS = 1
MAX_STEPS = 1000
MAX_SIGMA_CAP = 10000.0

DEFAULT_SCHEDULERS: tuple[str, ...] = (
    "normal",
    "karras",
    "exponential",
    "sgm_uniform",
    "simple",
    "ddim_uniform",
    "beta",
    "linear_quadratic",
    "kl_optimal",
)


def get_available_schedulers() -> list[str]:
    """Return available scheduler names from ComfyUI or fallback defaults."""
    try:
        import comfy.samplers

        schedulers = list(getattr(comfy.samplers.KSampler, "SCHEDULERS", []))
        if schedulers:
            return schedulers
        scheduler_names = list(getattr(comfy.samplers, "SCHEDULER_NAMES", []))
        if scheduler_names:
            return scheduler_names
    except Exception:
        pass
    return list(DEFAULT_SCHEDULERS)


def clamp_float(value: Any, minimum: float, maximum: float, fallback: float) -> float:
    """Safely parse and clamp a floating-point value."""
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    if not math.isfinite(parsed):
        return fallback
    return max(minimum, min(maximum, parsed))


def clamp_int(value: Any, minimum: int, maximum: int, fallback: int) -> int:
    """Safely parse and clamp an integer value."""
    try:
        parsed = int(round(float(value)))
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(maximum, parsed))


class StandaloneModelSampling:
    """Lightweight model_sampling stub for unconnected standalone scheduler calculations.

    Provides the exact interface expected by ``comfy.samplers.calculate_sigmas``
    (``sigma_max``, ``sigma_min``, ``sigmas``, ``timestep(sigma)``, ``sigma(timestep)``).
    """

    def __init__(
        self,
        sigma_max: float = 1.0,
        sigma_min: float = 0.01,
        num_timesteps: int = 1000,
    ) -> None:
        s_max = max(1e-4, float(sigma_max))
        s_min = max(1e-6, min(float(sigma_min), s_max * 0.999))
        self._sigma_max = torch.tensor(s_max, dtype=torch.float32)
        self._sigma_min = torch.tensor(s_min, dtype=torch.float32)
        self.num_timesteps = int(max(10, num_timesteps))
        # Log-linear discretization across [sigma_min, sigma_max]
        self.sigmas = torch.exp(
            torch.linspace(
                math.log(s_min),
                math.log(s_max),
                self.num_timesteps,
                dtype=torch.float32,
            )
        )
        self.log_sigmas = self.sigmas.log()

    @property
    def sigma_max(self) -> torch.Tensor:
        return self._sigma_max

    @property
    def sigma_min(self) -> torch.Tensor:
        return self._sigma_min

    def timestep(self, sigma: torch.Tensor | float) -> torch.Tensor:
        sigma_t = torch.as_tensor(sigma, dtype=torch.float32)
        log_sigma = sigma_t.clamp(min=1e-6).log()
        dists = log_sigma.unsqueeze(-1) - self.log_sigmas
        return dists.abs().argmin(dim=-1).to(dtype=torch.float32)

    def sigma(self, timestep: torch.Tensor | float) -> torch.Tensor:
        t = torch.as_tensor(timestep, dtype=torch.float32).clamp(
            min=0.0, max=float(self.num_timesteps - 1)
        )
        low_idx = t.floor().long()
        high_idx = t.ceil().long()
        w = t - low_idx.float()
        log_s = (1.0 - w) * self.log_sigmas[low_idx] + w * self.log_sigmas[high_idx]
        return log_s.exp()


def extract_model_sampling(model: Any) -> Any | None:
    """Safely extract the ``model_sampling`` object from a connected ComfyUI MODEL."""
    if model is None:
        return None
    try:
        if hasattr(model, "get_model_object"):
            ms = model.get_model_object("model_sampling")
            if ms is not None:
                return ms
    except Exception:
        pass
    try:
        inner = getattr(model, "model", None)
        if inner is not None and hasattr(inner, "model_sampling"):
            return inner.model_sampling
    except Exception:
        pass
    return None


def extract_model_bounds(
    model: Any,
    sigma_max_fallback: float = 1.0,
    sigma_min_fallback: float = 0.01,
) -> tuple[float, float, bool]:
    """Return ``(sigma_max, sigma_min, from_model)`` for a connected or unconnected model."""
    s_max_fb = clamp_float(sigma_max_fallback, 1e-4, MAX_SIGMA_CAP, 1.0)
    s_min_fb = clamp_float(sigma_min_fallback, 1e-6, s_max_fb, 0.01)
    if s_min_fb >= s_max_fb:
        s_min_fb = max(1e-6, s_max_fb * 0.01)

    ms = extract_model_sampling(model)
    if ms is not None:
        try:
            raw_max = getattr(ms, "sigma_max", None)
            raw_min = getattr(ms, "sigma_min", None)
            if raw_max is not None and raw_min is not None:
                s_max = float(raw_max.item() if hasattr(raw_max, "item") else raw_max)
                s_min = float(raw_min.item() if hasattr(raw_min, "item") else raw_min)
                if math.isfinite(s_max) and math.isfinite(s_min) and s_max > 0.0:
                    s_min = max(1e-6, min(s_min, s_max))
                    return s_max, s_min, True
        except Exception:
            pass
        try:
            sigmas_buf = getattr(ms, "sigmas", None)
            if sigmas_buf is not None and len(sigmas_buf) >= 2:
                positive = sigmas_buf[sigmas_buf > 0]
                if len(positive) >= 1:
                    s_max = float(positive.max().item())
                    s_min = float(positive.min().item())
                    return s_max, max(1e-6, min(s_min, s_max)), True
        except Exception:
            pass

    return s_max_fb, s_min_fb, False


def _analytical_schedule(
    scheduler: str,
    total_steps: int,
    sigma_max: float,
    sigma_min: float,
) -> torch.Tensor:
    """Analytical PyTorch schedule generator used when comfy.samplers is unavailable or custom."""
    n = max(1, int(total_steps))
    s_max = max(1e-4, float(sigma_max))
    s_min = max(1e-6, min(float(sigma_min), s_max))
    name = (scheduler or "normal").strip().lower()

    if n == 1:
        return torch.tensor([s_max, 0.0], dtype=torch.float32)

    if name == "karras":
        rho = 7.0
        ramp = torch.linspace(0.0, 1.0, n, dtype=torch.float32)
        min_inv_rho = s_min ** (1.0 / rho)
        max_inv_rho = s_max ** (1.0 / rho)
        sigmas = (max_inv_rho + ramp * (min_inv_rho - max_inv_rho)) ** rho
    elif name == "exponential":
        sigmas = torch.linspace(
            math.log(s_max), math.log(s_min), n, dtype=torch.float32
        ).exp()
    elif name in ("simple", "sgm_uniform"):
        # Uniform in discrete index space from s_max down toward s_min
        if name == "sgm_uniform":
            t = torch.linspace(1.0, 0.0, n + 1, dtype=torch.float32)[:-1]
            sigmas = s_min + t * (s_max - s_min)
        else:
            # Simple uniform step sampling
            t = torch.linspace(1.0, s_min / s_max, n, dtype=torch.float32)
            sigmas = t * s_max
    elif name == "beta":
        # Beta-like smooth S-curve concentration (alpha=0.6, beta=0.6 approximation)
        t = torch.linspace(0.0, 1.0, n, dtype=torch.float32)
        # Smooth regularized incomplete beta shape via power-sigmoid mapping
        alpha, beta_p = 0.6, 0.6
        u = torch.clamp(1.0 - t, 0.0, 1.0)
        u_a = u.pow(alpha)
        inv_b = (1.0 - u).pow(beta_p)
        w = u_a / (u_a + inv_b + 1e-8)
        log_s = math.log(s_min) + w * (math.log(s_max) - math.log(s_min))
        sigmas = log_s.exp()
    elif name == "linear_quadratic":
        # First half linear from s_max, second half quadratic easing into s_min
        t = torch.linspace(0.0, 1.0, n, dtype=torch.float32)
        threshold = 0.5
        sigmas = torch.empty(n, dtype=torch.float32)
        for i in range(n):
            ti = float(t[i].item())
            if ti <= threshold:
                val = 1.0 - ti
            else:
                # Quadratic transition from 0.5 at ti=0.5 to 0.0 at ti=1.0
                rem = (ti - threshold) / (1.0 - threshold)
                val = 0.5 * (1.0 - rem * rem * 0.5 - rem * 0.5)
            sigmas[i] = s_min + val * (s_max - s_min)
    elif name == "kl_optimal":
        t = torch.linspace(0.0, 1.0, n, dtype=torch.float32)
        atan_max = math.atan(s_max)
        atan_min = math.atan(s_min)
        sigmas = torch.tan((1.0 - t) * atan_max + t * atan_min)
    elif name == "ddim_uniform":
        t = torch.linspace(1.0, 0.0, n + 1, dtype=torch.float32)[:-1]
        log_s = math.log(s_min) + t * (math.log(s_max) - math.log(s_min))
        sigmas = log_s.exp()
    else:
        # "normal" default log-linear / discrete schedule
        t = torch.linspace(1.0, 0.0, n, dtype=torch.float32)
        log_s = math.log(s_min) + t * (math.log(s_max) - math.log(s_min))
        sigmas = log_s.exp()

    return torch.cat([sigmas, sigmas.new_zeros([1])])


def calculate_baseline_sigmas(
    scheduler: str,
    steps: int,
    denoise: float = 1.0,
    model: Any = None,
    sigma_max_fallback: float = 1.0,
    sigma_min_fallback: float = 0.01,
) -> tuple[torch.Tensor, dict[str, Any]]:
    """Calculate the baseline ``SIGMAS`` schedule and model bounds metadata.

    Implements exact parity with ComfyUI's stock ``BasicScheduler``:
    - When ``denoise < 1.0``, expands ``total_steps = int(steps / denoise)``,
      calls ``comfy.samplers.calculate_sigmas(model_sampling, scheduler, total_steps).cpu()``,
      and slices ``sigmas[-(steps + 1):]``.
    - Guarantees output is a 1D ``torch.float32`` CPU tensor of shape ``(steps + 1,)``
      with ``sigmas[-1] == 0.0``.
    """
    eff_steps = clamp_int(steps, MIN_STEPS, MAX_STEPS, 20)
    eff_denoise = clamp_float(denoise, 0.01, 1.0, 1.0)
    s_max, s_min, from_model = extract_model_bounds(
        model, sigma_max_fallback=sigma_max_fallback, sigma_min_fallback=sigma_min_fallback
    )

    if eff_denoise < 0.9999:
        total_steps = max(eff_steps, int(eff_steps / eff_denoise))
    else:
        total_steps = eff_steps

    ms = extract_model_sampling(model)
    sigmas: torch.Tensor | None = None

    # 1. Try ComfyUI native calculate_sigmas with the connected model_sampling or standalone stub
    try:
        import comfy.samplers

        target_ms = ms if ms is not None else StandaloneModelSampling(s_max, s_min)
        raw_sigmas = comfy.samplers.calculate_sigmas(target_ms, scheduler, total_steps)
        if isinstance(raw_sigmas, torch.Tensor) and raw_sigmas.numel() >= 2:
            sigmas = raw_sigmas.detach().to(device="cpu", dtype=torch.float32)
    except Exception:
        sigmas = None

    # 2. Fallback to analytical schedule generator if native call was unavailable or failed
    if sigmas is None or sigmas.numel() < 2:
        sigmas = _analytical_schedule(scheduler, total_steps, s_max, s_min)

    # 3. Apply partial denoise tail-slicing matching stock BasicScheduler
    if eff_denoise < 0.9999 and sigmas.shape[0] > (eff_steps + 1):
        sigmas = sigmas[-(eff_steps + 1) :]

    # Ensure exact length eff_steps + 1 if a custom scheduler returned an unexpected length
    if sigmas.shape[0] != eff_steps + 1:
        sigmas = resample_curve_pchip(sigmas, eff_steps, enforce_monotonic=True)

    # Sanitize NaN/Inf and enforce terminal 0.0
    sigmas = torch.nan_to_num(sigmas, nan=0.0, posinf=s_max, neginf=0.0).clamp(min=0.0)
    sigmas = sigmas.clone()
    sigmas[-1] = 0.0

    bounds_meta = {
        "sigma_max": float(max(s_max, float(sigmas.max().item()) if sigmas.numel() > 0 else s_max)),
        "sigma_min": float(s_min),
        "from_model": bool(from_model),
    }
    return sigmas, bounds_meta


def validate_custom_sigmas(
    points: list[float] | torch.Tensor | np.ndarray,
    enforce_monotonic: bool = True,
    sigma_max_cap: float = MAX_SIGMA_CAP,
    fallback_sigma_max: float = 1.0,
) -> torch.Tensor:
    """Convert user-edited points to a validated 1D SIGMAS tensor.

    Enforces four sequential invariants (PRD Section 3.3.2 & Section 7):
    1. Minimum Step Floor (N >= 1 -> at least 2 elements).
    2. NaN and Infinity Sanitization & non-negative clamping (>= 0.0).
    3. Monotonicity Clamping (when ``enforce_monotonic=True``): sigmas[i] <= sigmas[i - 1].
    4. Terminal Zero Enforcement: sigmas[-1] = 0.0.
    """
    cap = max(1.0, float(sigma_max_cap))
    fb_max = clamp_float(fallback_sigma_max, 1e-4, cap, 1.0)

    if isinstance(points, torch.Tensor):
        sigmas = points.detach().to(device="cpu", dtype=torch.float32).flatten().clone()
    elif isinstance(points, np.ndarray):
        sigmas = torch.as_tensor(points, dtype=torch.float32, device="cpu").flatten().clone()
    elif isinstance(points, (list, tuple)):
        cleaned: list[float] = []
        for item in points:
            try:
                cleaned.append(float(item))
            except (TypeError, ValueError):
                cleaned.append(0.0)
        sigmas = torch.tensor(cleaned, dtype=torch.float32, device="cpu")
    else:
        sigmas = torch.tensor([fb_max, 0.0], dtype=torch.float32, device="cpu")

    # Minimum Step Floor (N = 1 -> 2 vertices)
    if sigmas.numel() < 2:
        first_val = float(sigmas[0].item()) if sigmas.numel() == 1 else fb_max
        sigmas = torch.tensor([first_val, 0.0], dtype=torch.float32, device="cpu")

    # Cap maximum length to MAX_STEPS + 1
    if sigmas.numel() > MAX_STEPS + 1:
        sigmas = sigmas[: MAX_STEPS + 1].clone()

    # Invariant 1: NaN & Infinity Sanitization + non-negative clamping
    sigmas = torch.nan_to_num(sigmas, nan=0.0, posinf=cap, neginf=0.0)
    sigmas = torch.clamp(sigmas, min=0.0, max=cap)

    # Invariant 2: Monotonicity Clamping (sigmas[0] >= sigmas[1] >= ... >= sigmas[N-1] >= 0.0)
    if enforce_monotonic and sigmas.numel() > 2:
        for i in range(1, sigmas.numel() - 1):
            if sigmas[i] > sigmas[i - 1]:
                sigmas[i] = sigmas[i - 1]

    # Invariant 3: Terminal Zero Enforcement
    sigmas[-1] = 0.0
    return sigmas


def resample_curve_pchip(
    points: list[float] | torch.Tensor | np.ndarray,
    new_steps: int,
    enforce_monotonic: bool = True,
) -> torch.Tensor:
    """Resample a custom schedule curve to ``new_steps + 1`` points using Fritsch-Carlson PCHIP.

    Preserves monotonicity and exact endpoint values when the user adjusts ``steps``
    while ``is_modified`` is True.
    """
    target_steps = clamp_int(new_steps, MIN_STEPS, MAX_STEPS, 20)
    src = validate_custom_sigmas(points, enforce_monotonic=enforce_monotonic)
    n_src = int(src.numel())
    n_dst = target_steps + 1

    if n_src == n_dst:
        return src

    if target_steps == 1:
        return torch.tensor([float(src[0].item()), 0.0], dtype=torch.float32)

    y = src.numpy().astype(np.float64)
    x = np.linspace(0.0, 1.0, n_src, dtype=np.float64)
    x_new = np.linspace(0.0, 1.0, n_dst, dtype=np.float64)

    if n_src == 2:
        y_new = y[0] * (1.0 - x_new) + y[1] * x_new
        return validate_custom_sigmas(y_new, enforce_monotonic=enforce_monotonic)

    # Compute secant slopes
    h = np.diff(x)
    delta = np.diff(y) / np.maximum(h, 1e-12)

    # Fritsch-Carlson tangent initialization
    d = np.zeros_like(y)
    for k in range(1, n_src - 1):
        if delta[k - 1] * delta[k] <= 0.0:
            d[k] = 0.0
        else:
            w1 = 2.0 * h[k] + h[k - 1]
            w2 = h[k] + 2.0 * h[k - 1]
            d[k] = (w1 + w2) / (w1 / delta[k - 1] + w2 / delta[k])

    # Endpoints
    d0 = ((2.0 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1])
    if d0 * delta[0] <= 0.0:
        d0 = 0.0
    elif (delta[0] * delta[1] <= 0.0) and (abs(d0) > abs(3.0 * delta[0])):
        d0 = 3.0 * delta[0]
    d[0] = d0

    dn = (
        (2.0 * h[-1] + h[-2]) * delta[-1] - h[-1] * delta[-2]
    ) / (h[-1] + h[-2])
    if dn * delta[-1] <= 0.0:
        dn = 0.0
    elif (delta[-1] * delta[-2] <= 0.0) and (abs(dn) > abs(3.0 * delta[-1])):
        dn = 3.0 * delta[-1]
    d[-1] = dn

    # Evaluate piecewise cubic Hermite polynomial at x_new
    y_new = np.empty(n_dst, dtype=np.float64)
    y_new[0] = y[0]
    y_new[-1] = 0.0

    idx = np.clip(np.searchsorted(x, x_new[1:-1], side="right") - 1, 0, n_src - 2)
    hk = h[idx]
    t = (x_new[1:-1] - x[idx]) / np.maximum(hk, 1e-12)
    t2 = t * t
    t3 = t2 * t

    h00 = 2.0 * t3 - 3.0 * t2 + 1.0
    h10 = t3 - 2.0 * t2 + t
    h01 = -2.0 * t3 + 3.0 * t2
    h11 = t3 - t2

    y_new[1:-1] = (
        h00 * y[idx]
        + h10 * hk * d[idx]
        + h01 * y[idx + 1]
        + h11 * hk * d[idx + 1]
    )

    return validate_custom_sigmas(y_new, enforce_monotonic=enforce_monotonic)


def parse_custom_sigmas_json(raw_json: Any) -> dict[str, Any]:
    """Safely parse the serialized frontend JSON state."""
    if not isinstance(raw_json, str):
        return {}
    stripped = raw_json.strip()
    if not stripped:
        return {}
    try:
        parsed = json.loads(stripped)
        return parsed if isinstance(parsed, dict) else {}
    except (json.JSONDecodeError, TypeError, ValueError):
        return {}


def format_sigmas_string(sigmas: torch.Tensor) -> str:
    """Format a 1D SIGMAS tensor as a comma-separated string with 4 decimal places."""
    if not isinstance(sigmas, torch.Tensor) or sigmas.numel() == 0:
        return "0.0000"
    vals = sigmas.detach().cpu().flatten().tolist()
    return ", ".join(f"{float(v):.4f}" for v in vals)
