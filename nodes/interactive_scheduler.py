"""DuffyInteractiveScheduler -- Interactive 2D noise schedule (SIGMAS) custom node.

Combines model-aware baseline schedule calculation (``comfy.samplers.calculate_sigmas``
via the connected model's ``model_sampling`` object or standalone fallback bounds)
with an interactive 2D Vue 3 + Canvas curve editor. Outputs a validated 1D
``SIGMAS`` tensor, synchronized ``steps`` integer, and comma-separated
``sigmas_string``.
"""

from __future__ import annotations

import hashlib
import json
import logging
import threading
from typing import Any

import comfy.model_management as model_management
import server
import torch
from aiohttp import web
from comfy_api.latest import io

try:  # Support both package-relative and direct (test) imports.
    from . import interactive_scheduler_math as sm
except ImportError:  # pragma: no cover - exercised by direct file loading in tests
    import interactive_scheduler_math as sm  # type: ignore

NODE_ID = "Duffy_InteractiveScheduler"
BASELINE_ROUTE = "/duffy/interactive_scheduler/calculate_baseline"
MAX_JSON_BYTES = 512 * 1024

# node_id -> {"sigma_max": float, "sigma_min": float, "from_model": bool}
_MODEL_BOUNDS_CACHE: dict[str, dict[str, Any]] = {}
_CACHE_LOCK = threading.Lock()


def get_cached_model_bounds(node_id: str | None) -> dict[str, Any] | None:
    """Retrieve cached model_sampling bounds for a given node instance."""
    if not node_id:
        return None
    with _CACHE_LOCK:
        entry = _MODEL_BOUNDS_CACHE.get(str(node_id))
        return dict(entry) if entry is not None else None


def set_cached_model_bounds(node_id: str | None, bounds: dict[str, Any]) -> None:
    """Store model_sampling bounds for a given node instance."""
    if not node_id:
        return
    with _CACHE_LOCK:
        _MODEL_BOUNDS_CACHE[str(node_id)] = {
            "sigma_max": float(bounds.get("sigma_max", 1.0)),
            "sigma_min": float(bounds.get("sigma_min", 0.01)),
            "from_model": bool(bounds.get("from_model", False)),
        }


def compute_baseline_response(data: Any) -> tuple[int, dict[str, Any]]:
    """Synchronous payload processor for the baseline calculation endpoint."""
    if not isinstance(data, dict):
        return 400, {"status": "error", "message": "Request body must be a JSON object."}

    node_id = str(data.get("node_id", "")).strip() or None
    scheduler = str(data.get("scheduler", "normal")).strip() or "normal"
    steps = sm.clamp_int(data.get("steps", 20), sm.MIN_STEPS, sm.MAX_STEPS, 20)
    denoise = sm.clamp_float(data.get("denoise", 1.0), 0.01, 1.0, 1.0)
    sigma_max_fb = sm.clamp_float(
        data.get("sigma_max_fallback", 1.0), 1e-4, sm.MAX_SIGMA_CAP, 1.0
    )
    sigma_min_fb = sm.clamp_float(
        data.get("sigma_min_fallback", 0.01), 1e-6, sigma_max_fb, 0.01
    )
    use_cached = bool(data.get("use_cached_model_bounds", True))

    cached = get_cached_model_bounds(node_id) if use_cached else None
    if cached and cached.get("from_model"):
        eff_max = float(cached["sigma_max"])
        eff_min = float(cached["sigma_min"])
        from_model = True
    else:
        eff_max = sigma_max_fb
        eff_min = sigma_min_fb
        from_model = False

    sigmas, bounds_meta = sm.calculate_baseline_sigmas(
        scheduler=scheduler,
        steps=steps,
        denoise=denoise,
        model=None,
        sigma_max_fallback=eff_max,
        sigma_min_fallback=eff_min,
    )
    bounds_meta["from_model"] = from_model

    response_payload: dict[str, Any] = {
        "status": "ok",
        "scheduler": scheduler,
        "steps": int(sigmas.shape[0] - 1),
        "denoise": denoise,
        "baseline_sigmas": [round(float(v), 6) for v in sigmas.tolist()],
        "model_bounds": bounds_meta,
    }

    # Optional server-side PCHIP resampling when custom_sigmas is supplied
    resample_points = data.get("resample_custom_sigmas")
    if isinstance(resample_points, list) and len(resample_points) >= 2:
        enforce_mono = bool(data.get("enforce_monotonic", True))
        resampled = sm.resample_curve_pchip(
            resample_points, new_steps=steps, enforce_monotonic=enforce_mono
        )
        response_payload["resampled_sigmas"] = [
            round(float(v), 6) for v in resampled.tolist()
        ]

    return 200, response_payload


async def _handle_calculate_baseline(request: web.Request) -> web.Response:
    """REST endpoint for live frontend curve initialization, preset switching, and Reset."""
    try:
        raw_body = await request.read()
        if len(raw_body) > MAX_JSON_BYTES:
            return web.json_response(
                {"status": "error", "message": "Payload exceeds maximum size."},
                status=413,
            )
        data = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        status, payload = compute_baseline_response(data)
        return web.json_response(payload, status=status)
    except Exception as exc:
        logging.warning("[Duffy_InteractiveScheduler] Baseline route error: %s", exc)
        return web.json_response(
            {"status": "error", "message": str(exc)},
            status=500,
        )


def _register_routes() -> None:
    prompt_server = getattr(server, "PromptServer", None)
    instance = getattr(prompt_server, "instance", None) if prompt_server else None
    routes = getattr(instance, "routes", None) if instance else None
    if routes is not None:
        routes.post(BASELINE_ROUTE)(_handle_calculate_baseline)


_register_routes()


class DuffyInteractiveScheduler(io.ComfyNode):
    """Interactive 2D Sigma Scheduler node for ComfyUI Nodes 2.0 (V3 Schema)."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        available_schedulers = sm.get_available_schedulers()
        default_scheduler = (
            "normal" if "normal" in available_schedulers else available_schedulers[0]
        )

        return io.Schema(
            node_id=NODE_ID,
            display_name="Interactive Sigma Scheduler",
            category="Duffy/Sampling",
            description=(
                "Interactive 2D noise schedule (SIGMAS) editor. Visualizes and manipulates "
                "per-step denoising trajectories with draggable control points, step insertion/deletion, "
                "monotonicity protection, and model-aware baseline presets."
            ),
            inputs=[
                io.Combo.Input(
                    "scheduler",
                    options=available_schedulers,
                    default=default_scheduler,
                    display_name="Scheduler",
                    tooltip="Baseline mathematical noise schedule preset prior to custom graph edits or on Reset.",
                ),
                io.Int.Input(
                    "steps",
                    default=20,
                    min=sm.MIN_STEPS,
                    max=sm.MAX_STEPS,
                    step=1,
                    display_name="Steps",
                    tooltip="Number of denoising steps (synchronized bidirectionally with points on the graph).",
                ),
                io.Float.Input(
                    "denoise",
                    default=1.0,
                    min=0.01,
                    max=1.0,
                    step=0.01,
                    round=0.01,
                    display_mode=io.NumberDisplay.slider,
                    display_name="Denoise",
                    tooltip="Tail-truncation factor (steps / denoise) for partial denoising passes.",
                ),
                io.Float.Input(
                    "sigma_max_fallback",
                    default=1.0,
                    min=0.01,
                    max=1000.0,
                    step=0.001,
                    round=0.0001,
                    display_name="Sigma Max (Fallback)",
                    tooltip=(
                        "Upper noise bound used when no Model is connected "
                        "(1.0 for flow-matching models, ~14.6 for SDXL/SD1.5)."
                    ),
                ),
                io.Float.Input(
                    "sigma_min_fallback",
                    default=0.01,
                    min=0.0001,
                    max=100.0,
                    step=0.0001,
                    round=0.0001,
                    display_name="Sigma Min (Fallback)",
                    tooltip="Lower positive noise bound prior to terminal 0.0 used when no Model is connected.",
                ),
                io.Boolean.Input(
                    "enforce_monotonic",
                    default=True,
                    label_on="Monotonic",
                    label_off="Freeform",
                    display_name="Enforce Monotonic",
                    tooltip=(
                        "When enabled, clamps user-edited points so sigmas[0] >= sigmas[1] >= ... >= 0.0, "
                        "preventing reversed noise schedules."
                    ),
                ),
                io.String.Input(
                    "custom_sigmas_json",
                    default="{}",
                    display_name="Custom Sigmas JSON",
                    socketless=True,
                    tooltip="Serialized JSON state managed by the interactive 2D graph widget.",
                ),
                io.Model.Input(
                    "model",
                    optional=True,
                    display_name="Model (Optional)",
                    tooltip=(
                        "Optional model connection used to query native model_sampling "
                        "noise schedule and sigma bounds."
                    ),
                ),
            ],
            outputs=[
                io.Sigmas.Output(
                    "sigmas",
                    display_name="Sigmas",
                    tooltip="Validated 1D SIGMAS tensor of shape (steps + 1,) terminating at 0.0.",
                ),
                io.Int.Output(
                    "steps",
                    display_name="Steps",
                    tooltip="Effective step count (len(sigmas) - 1), updated when steps are added or removed.",
                ),
                io.String.Output(
                    "sigmas_string",
                    display_name="Sigmas String",
                    tooltip="Comma-separated string representation of the output SIGMAS tensor.",
                ),
            ],
            hidden=[io.Hidden.unique_id],
        )

    @classmethod
    def validate_inputs(cls, **kwargs: Any) -> bool | str:
        available_schedulers = sm.get_available_schedulers()
        scheduler = kwargs.get("scheduler")
        if scheduler is not None and scheduler not in available_schedulers:
            return f"scheduler must be one of {available_schedulers}."

        steps = kwargs.get("steps")
        if steps is not None:
            try:
                steps_val = int(steps)
            except (TypeError, ValueError):
                return "steps must be an integer."
            if not (sm.MIN_STEPS <= steps_val <= sm.MAX_STEPS):
                return f"steps must be between {sm.MIN_STEPS} and {sm.MAX_STEPS}."

        denoise = kwargs.get("denoise")
        if denoise is not None:
            try:
                denoise_val = float(denoise)
            except (TypeError, ValueError):
                return "denoise must be a float."
            if not (0.01 <= denoise_val <= 1.0):
                return "denoise must be within [0.01, 1.0]."

        sigma_max = kwargs.get("sigma_max_fallback")
        if sigma_max is not None:
            try:
                s_max = float(sigma_max)
            except (TypeError, ValueError):
                return "sigma_max_fallback must be a number."
            if not (0.0001 <= s_max <= sm.MAX_SIGMA_CAP):
                return f"sigma_max_fallback must be within [0.0001, {sm.MAX_SIGMA_CAP}]."

        sigma_min = kwargs.get("sigma_min_fallback")
        if sigma_min is not None:
            try:
                s_min = float(sigma_min)
            except (TypeError, ValueError):
                return "sigma_min_fallback must be a number."
            if not (0.000001 <= s_min <= sm.MAX_SIGMA_CAP):
                return f"sigma_min_fallback must be within [0.000001, {sm.MAX_SIGMA_CAP}]."

        custom_json = kwargs.get("custom_sigmas_json")
        if custom_json is not None:
            if not isinstance(custom_json, str):
                return "custom_sigmas_json must be a JSON string."
            if len(custom_json) > MAX_JSON_BYTES:
                return "custom_sigmas_json exceeds maximum allowed size."
            stripped = custom_json.strip()
            if stripped:
                try:
                    parsed = json.loads(stripped)
                except json.JSONDecodeError:
                    return "custom_sigmas_json must be valid JSON."
                if not isinstance(parsed, dict):
                    return "custom_sigmas_json must decode to a JSON object."

        return True

    @classmethod
    def fingerprint_inputs(cls, **kwargs: Any) -> float | str:
        scheduler = kwargs.get("scheduler", "normal")
        steps = kwargs.get("steps", 20)
        denoise = kwargs.get("denoise", 1.0)
        sigma_max_fb = kwargs.get("sigma_max_fallback", 1.0)
        sigma_min_fb = kwargs.get("sigma_min_fallback", 0.01)
        enforce_mono = kwargs.get("enforce_monotonic", True)
        custom_json = kwargs.get("custom_sigmas_json", "{}")
        model = kwargs.get("model")

        parsed = sm.parse_custom_sigmas_json(custom_json)
        try:
            canonical_json = json.dumps(parsed, sort_keys=True, separators=(",", ":"))
        except Exception:
            canonical_json = str(custom_json)

        model_tag = "none"
        if model is not None:
            s_max, s_min, from_model = sm.extract_model_bounds(
                model, sigma_max_fb, sigma_min_fb
            )
            model_tag = f"{id(model)}:{s_max:.6f}:{s_min:.6f}:{from_model}"

        raw_key = (
            f"{scheduler}:{steps}:{denoise}:{sigma_max_fb}:{sigma_min_fb}:"
            f"{enforce_mono}:{model_tag}:{canonical_json}"
        )
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    @classmethod
    def execute(
        cls,
        scheduler: str = "normal",
        steps: int = 20,
        denoise: float = 1.0,
        sigma_max_fallback: float = 1.0,
        sigma_min_fallback: float = 0.01,
        enforce_monotonic: bool = True,
        custom_sigmas_json: str = "{}",
        model: Any = None,
        **kwargs: Any,
    ) -> io.NodeOutput:
        del kwargs

        eff_steps = sm.clamp_int(steps, sm.MIN_STEPS, sm.MAX_STEPS, 20)
        eff_denoise = sm.clamp_float(denoise, 0.01, 1.0, 1.0)

        baseline_sigmas, bounds_meta = sm.calculate_baseline_sigmas(
            scheduler=scheduler,
            steps=eff_steps,
            denoise=eff_denoise,
            model=model,
            sigma_max_fallback=sigma_max_fallback,
            sigma_min_fallback=sigma_min_fallback,
        )

        node_id = getattr(getattr(cls, "hidden", None), "unique_id", None)
        if node_id is not None:
            set_cached_model_bounds(str(node_id), bounds_meta)

        parsed = sm.parse_custom_sigmas_json(custom_sigmas_json)
        is_modified = bool(parsed.get("is_modified", False))

        raw_points = parsed.get("custom_sigmas")
        if raw_points is None:
            raw_points = parsed.get("points")

        if is_modified and isinstance(raw_points, list) and len(raw_points) >= 2:
            sigmas = sm.validate_custom_sigmas(
                raw_points,
                enforce_monotonic=bool(enforce_monotonic),
                sigma_max_cap=sm.MAX_SIGMA_CAP,
                fallback_sigma_max=float(bounds_meta.get("sigma_max", sigma_max_fallback)),
            )
            # If baseline_sigmas length differs from modified step count, recalculate
            # reference baseline at the modified step count for UI display consistency
            active_steps = int(sigmas.shape[0] - 1)
            if active_steps != eff_steps:
                baseline_sigmas, _ = sm.calculate_baseline_sigmas(
                    scheduler=scheduler,
                    steps=active_steps,
                    denoise=eff_denoise,
                    model=model,
                    sigma_max_fallback=sigma_max_fallback,
                    sigma_min_fallback=sigma_min_fallback,
                )
        else:
            sigmas = sm.validate_custom_sigmas(
                baseline_sigmas,
                enforce_monotonic=bool(enforce_monotonic),
                sigma_max_cap=sm.MAX_SIGMA_CAP,
                fallback_sigma_max=float(bounds_meta.get("sigma_max", sigma_max_fallback)),
            )

        out_device = model_management.intermediate_device()
        sigmas_out = sigmas.to(device=out_device, dtype=torch.float32)
        # Ensure terminal zero invariant after device/dtype cast
        sigmas_out[-1] = 0.0

        steps_out = int(sigmas_out.shape[0] - 1)
        sigmas_str = sm.format_sigmas_string(sigmas_out)

        ui_payload = {
            "scheduler_state": [
                {
                    "is_modified": is_modified,
                    "steps": steps_out,
                    "scheduler": scheduler,
                    "denoise": eff_denoise,
                    "model_bounds": bounds_meta,
                    "baseline_sigmas": [
                        round(float(v), 6) for v in baseline_sigmas.tolist()
                    ],
                    "effective_sigmas": [
                        round(float(v), 6) for v in sigmas_out.detach().cpu().tolist()
                    ],
                }
            ]
        }

        return io.NodeOutput(sigmas_out, steps_out, sigmas_str, ui=ui_payload)
