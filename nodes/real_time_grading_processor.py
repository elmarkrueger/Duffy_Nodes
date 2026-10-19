"""Real-Time Grading & Shader Processor -- interactive human-in-the-loop color grading node.

When execution reaches this node it can pause the workflow, show a compact
interactive preview card on the node (with a button to launch the full-screen
WebGL2 Studio Editor), and resume once the user clicks "Continue". The final
graded image batch is rendered on the GPU from the full-resolution tensors.

Protocol:
* WS event  ``duffy-grading-pause``       (server -> executing client)
* POST      ``/duffy/grading/resume``     (client -> server)
* GET       ``/duffy/grading/pending``    (rehydrate after page reload)
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
import uuid
from typing import Any

import numpy as np
import torch
from PIL import Image

import comfy.model_management as model_management
import folder_paths
import server
from comfy_api.latest import io

try:  # Support both package-relative and direct (test) imports.
    from . import real_time_grading_math as gm
except ImportError:  # pragma: no cover - exercised by direct file loading in tests
    import real_time_grading_math as gm  # type: ignore

NODE_ID = "Duffy_RealTimeGradingProcessor"
PAUSE_EVENT = "duffy-grading-pause"
PAUSE_MODES = ["always", "on_input_change", "never"]
PREVIEW_MAX_EDGE = 1536
PREVIEW_SUBFOLDER = "duffy_grading"
RESULT_SUBFOLDER = "duffy_grading_results"
RESULT_MAX_EDGE = 1024
POLL_INTERVAL_SECONDS = 0.05
MAX_BODY_BYTES = 256 * 1024

# session_id -> session dict. Guarded by _SESSION_LOCK.
PENDING_GRADING_SESSIONS: dict[str, dict[str, Any]] = {}
_SESSION_LOCK = threading.Lock()


# ---------------------------------------------------------------------------
# Preview & Thumbnail Helpers
# ---------------------------------------------------------------------------

def _frame_to_pil(frame_hwc: torch.Tensor) -> Image.Image:
    tensor = frame_hwc.detach().to("cpu", torch.float32).clamp(0.0, 1.0)
    if tensor.ndim == 2:
        tensor = tensor.unsqueeze(-1)
    channels = int(tensor.shape[-1])
    if channels == 1:
        rgb = tensor.repeat(1, 1, 3)
    elif channels >= 3:
        rgb = tensor[:, :, :3]
    else:
        rgb = torch.cat([tensor, tensor[:, :, :1]], dim=-1)
    array = (rgb.numpy() * 255.0).round().astype(np.uint8)
    return Image.fromarray(array, mode="RGB")


def _write_preview(frame_hwc: torch.Tensor, filename: str, subfolder: str = PREVIEW_SUBFOLDER) -> str:
    image = _frame_to_pil(frame_hwc)
    longest = max(image.width, image.height)
    if longest > PREVIEW_MAX_EDGE:
        ratio = PREVIEW_MAX_EDGE / longest
        image = image.resize(
            (max(1, round(image.width * ratio)), max(1, round(image.height * ratio))),
            resample=Image.Resampling.LANCZOS,
        )
    directory = os.path.join(folder_paths.get_temp_directory(), subfolder)
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, filename)
    image.save(path, format="WEBP", quality=92, method=4)
    return path


def _view_url(filename: str, subfolder: str = PREVIEW_SUBFOLDER) -> str:
    return f"/view?filename={filename}&subfolder={subfolder}&type=temp&rand={uuid.uuid4().hex[:8]}"


def _write_result_thumbnail(frame_hwc: torch.Tensor, stem: str) -> dict[str, str]:
    """Fast node thumbnail of the frame (area downsample in torch + JPEG)."""
    frame = frame_hwc.detach().to("cpu", torch.float32).clamp(0.0, 1.0)
    if frame.ndim == 2:
        frame = frame.unsqueeze(-1)
    height, width, channels = int(frame.shape[0]), int(frame.shape[1]), int(frame.shape[2])
    if channels == 1:
        rgb = frame.repeat(1, 1, 3)
    else:
        rgb = frame[:, :, :3]

    ratio = min(1.0, RESULT_MAX_EDGE / max(height, width, 1))
    chw = rgb.permute(2, 0, 1).unsqueeze(0)
    if ratio < 1.0:
        size = (max(1, round(height * ratio)), max(1, round(width * ratio)))
        chw = torch.nn.functional.interpolate(chw, size=size, mode="area")
    array = (chw[0].permute(1, 2, 0).clamp(0.0, 1.0) * 255.0).round().to(torch.uint8).numpy()

    image = Image.fromarray(array, mode="RGB")
    directory = os.path.join(folder_paths.get_temp_directory(), RESULT_SUBFOLDER)
    os.makedirs(directory, exist_ok=True)
    filename = f"{stem}.jpg"
    image.save(os.path.join(directory, filename), format="JPEG", quality=92)
    return {
        "filename": filename,
        "subfolder": RESULT_SUBFOLDER,
        "type": "temp",
    }


def _warm_up_kernels() -> None:
    """Warm up PyTorch conv2d/grid_sample kernels on the compute device during pause."""
    try:
        device = model_management.get_torch_device()
        tiny = torch.zeros(1, 8, 8, 3, device=device)
        params = gm.default_params()
        params["sharpen"] = 0.1
        params["chromatic_aberration"] = 0.005
        gm.apply_grading_batch(tiny, params, 1.0, device=device, output_device=device)
    except Exception as exc:  # pragma: no cover - purely an optimization
        logging.debug("[Duffy Grading] Kernel warm-up skipped: %s", exc)


def _delete_files(paths: list[str]) -> None:
    for path in paths:
        try:
            if path and os.path.isfile(path):
                os.remove(path)
        except OSError as exc:  # pragma: no cover
            logging.debug("[Duffy Grading] Could not delete preview %s: %s", path, exc)


# ---------------------------------------------------------------------------
# Session Handling & REST Endpoints
# ---------------------------------------------------------------------------

def _client_connected() -> bool:
    instance = getattr(server, "PromptServer", None)
    srv = getattr(instance, "instance", None) if instance else None
    if srv is None:
        return False
    client_id = getattr(srv, "client_id", None)
    sockets = getattr(srv, "sockets", None) or {}
    return client_id is not None and client_id in sockets


def handle_resume(data: Any) -> tuple[int, dict[str, Any]]:
    """Validate a resume request and unblock the waiting worker. Returns ``(status, body)``."""
    if not isinstance(data, dict):
        return 400, {"status": "error", "message": "Body must be a JSON object."}

    session_id = data.get("session_id")
    node_id = data.get("node_id")
    if not isinstance(session_id, str) or not isinstance(node_id, (str, int)):
        return 400, {"status": "error", "message": "session_id and node_id are required."}

    try:
        params = gm.validate_params(data.get("params"))
    except (ValueError, TypeError) as exc:
        return 400, {"status": "error", "message": f"Invalid grading params: {exc}"}

    with _SESSION_LOCK:
        session = PENDING_GRADING_SESSIONS.get(session_id)
        if session is None or str(session["node_id"]) != str(node_id):
            return 404, {"status": "error", "message": "Session not found."}
        session["params"] = params
        session["event"].set()
    return 200, {"status": "success"}


def pending_payloads() -> list[dict[str, Any]]:
    with _SESSION_LOCK:
        return [dict(session["payload"]) for session in PENDING_GRADING_SESSIONS.values()]


try:
    routes = server.PromptServer.instance.routes

    @routes.post("/duffy/grading/resume")
    async def duffy_grading_resume(request):
        from aiohttp import web

        if request.content_length is not None and request.content_length > MAX_BODY_BYTES:
            return web.json_response({"status": "error", "message": "Payload too large."}, status=413)
        try:
            data = await request.json()
        except Exception:
            return web.json_response({"status": "error", "message": "Invalid JSON."}, status=400)
        status, body = handle_resume(data)
        return web.json_response(body, status=status)

    @routes.get("/duffy/grading/pending")
    async def duffy_grading_pending(request):
        from aiohttp import web

        return web.json_response({"sessions": pending_payloads()})
except Exception as exc:  # pragma: no cover - server not available during isolated testing
    logging.debug("[Duffy Grading] Route registration skipped: %s", exc)


def _run_interactive_session(
    node_id: str,
    image: torch.Tensor,
    params: dict[str, Any],
    overall_strength: float,
    signature: str,
) -> dict[str, Any]:
    """Emit the pause event and block (interrupt-aware) until the client resumes."""
    session_id = uuid.uuid4().hex
    img_h, img_w = int(image.shape[1]), int(image.shape[2])

    files: list[str] = []
    try:
        src_name = f"{session_id}_src.webp"
        files.append(_write_preview(image[0], src_name))

        initial_hist = gm.compute_histogram(image[0])
        payload = {
            "session_id": session_id,
            "node_id": str(node_id),
            "source_preview_url": _view_url(src_name),
            "image_size": [img_w, img_h],
            "params": params,
            "default_params": gm.default_params(),
            "overall_strength": float(overall_strength),
            "histogram": initial_hist,
            "input_signature": signature,
            "created": time.time(),
        }
        event = threading.Event()
        with _SESSION_LOCK:
            PENDING_GRADING_SESSIONS[session_id] = {
                "event": event,
                "node_id": str(node_id),
                "params": None,
                "payload": payload,
            }

        model_management.soft_empty_cache()

        instance = server.PromptServer.instance
        instance.send_sync(PAUSE_EVENT, payload, getattr(instance, "client_id", None))
        _warm_up_kernels()

        while not event.wait(POLL_INTERVAL_SECONDS):
            model_management.throw_exception_if_processing_interrupted()

        with _SESSION_LOCK:
            result = PENDING_GRADING_SESSIONS.get(session_id, {}).get("params")
        return result or params
    finally:
        with _SESSION_LOCK:
            PENDING_GRADING_SESSIONS.pop(session_id, None)
        _delete_files(files)


# ---------------------------------------------------------------------------
# Node Definition
# ---------------------------------------------------------------------------

class DuffyRealTimeGradingProcessor(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id=NODE_ID,
            display_name="Real-Time Grading & Shader Processor",
            category="Duffy/Image/PostProcessing",
            description=(
                "Interactive real-time color grading and post-processing shader suite. "
                "Pauses the workflow so you can pass the image through or open the full-screen "
                "WebGL2 Studio Editor to manipulate RGB curves, white balance, exposure/contrast/saturation, "
                "shadows/highlights, lift/gamma/gain, gradient maps, bloom, chromatic aberration, "
                "sharpening, vignette, and film grain."
            ),
            inputs=[
                io.Image.Input(
                    "image",
                    display_name="Image",
                    tooltip="Input image batch [B, H, W, C] to grade.",
                ),
                io.Combo.Input(
                    "pause_mode",
                    options=PAUSE_MODES,
                    default="always",
                    display_name="Pause Mode",
                    tooltip=(
                        "always: pause on every run so you can open the editor or click Continue. "
                        "on_input_change: pause only when the input image changes. "
                        "never: apply saved grading settings without pausing."
                    ),
                ),
                io.Float.Input(
                    "overall_strength",
                    default=1.0,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    display_name="Overall Strength",
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Master blend factor between original ungraded image (0.0) and graded output (1.0).",
                ),
                io.String.Input(
                    "shader_params",
                    default="{}",
                    socketless=True,
                    tooltip="Serialized JSON payload containing curve control points and grading parameters.",
                ),
                io.Mask.Input(
                    "mask",
                    optional=True,
                    display_name="Mask (Optional)",
                    tooltip="Optional mask [H, W] or [B, H, W] restricting where grading is applied.",
                ),
            ],
            outputs=[
                io.Image.Output(
                    "IMAGE",
                    display_name="Image",
                    tooltip="Full-resolution graded image batch.",
                ),
                io.String.Output(
                    "GRADING_DATA",
                    display_name="Grading JSON",
                    tooltip="Serialized JSON of the active grading parameters.",
                ),
            ],
            hidden=[io.Hidden.unique_id],
        )

    @classmethod
    def validate_inputs(cls, **kwargs) -> bool | str:
        pause_mode = kwargs.get("pause_mode")
        if pause_mode is not None and pause_mode not in PAUSE_MODES:
            return f"pause_mode must be one of {PAUSE_MODES}."

        overall_strength = kwargs.get("overall_strength")
        if overall_strength is not None:
            try:
                val = float(overall_strength)
            except (TypeError, ValueError):
                return "overall_strength must be a number."
            if not (0.0 <= val <= 1.0):
                return "overall_strength must be within [0.0, 1.0]."

        shader_params = kwargs.get("shader_params")
        if shader_params is not None:
            if not isinstance(shader_params, str):
                return "shader_params must be a JSON string."
            if len(shader_params) > 500_000:
                return "shader_params exceeds maximum size limit."
            stripped = shader_params.strip()
            if stripped:
                try:
                    parsed = json.loads(stripped)
                except json.JSONDecodeError:
                    return "shader_params must be valid JSON."
                if not isinstance(parsed, dict):
                    return "shader_params must be a JSON object."

        return True

    @classmethod
    def fingerprint_inputs(cls, **kwargs) -> float | str:
        pause_mode = kwargs.get("pause_mode", "always")
        if pause_mode == "always":
            return float("nan")

        shader_params = kwargs.get("shader_params", "{}")
        overall_strength = kwargs.get("overall_strength", 1.0)
        try:
            parsed = json.loads(shader_params) if isinstance(shader_params, str) else {}
            canonical = json.dumps(parsed, sort_keys=True, separators=(",", ":"))
        except (json.JSONDecodeError, ValueError, TypeError):
            canonical = str(shader_params)

        raw_key = f"{pause_mode}:{overall_strength}:{canonical}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    @classmethod
    def execute(
        cls,
        image: torch.Tensor,
        pause_mode: str = "always",
        overall_strength: float = 1.0,
        shader_params: str = "{}",
        mask: torch.Tensor | None = None,
        **kwargs,
    ) -> io.NodeOutput:
        del kwargs

        if image is None or not isinstance(image, torch.Tensor):
            return io.NodeOutput(block_execution="Duffy_RealTimeGradingProcessor: missing IMAGE input.")

        if image.ndim == 3:
            image = image.unsqueeze(0)
        if image.ndim != 4 or image.shape[0] == 0:
            return io.NodeOutput(
                block_execution=(
                    "Duffy_RealTimeGradingProcessor: expected non-empty IMAGE tensor in [B,H,W,C] format, "
                    f"got shape {tuple(image.shape)}."
                )
            )

        saved = gm.parse_saved_params(shader_params)
        params = saved or gm.default_params()
        signature = gm.tensor_signature(image, mask)

        if pause_mode == "always":
            wants_pause = True
        elif pause_mode == "on_input_change":
            wants_pause = saved is None or saved.get("input_signature") != signature
        else:
            wants_pause = False

        node_id = getattr(getattr(cls, "hidden", None), "unique_id", None)
        paused = False
        if wants_pause and node_id is not None and _client_connected():
            result = _run_interactive_session(
                str(node_id), image, params, float(overall_strength), signature
            )
            params = result
            if "overall_strength" in result:
                overall_strength = float(result["overall_strength"])
            paused = True
        elif wants_pause:
            logging.info("[Duffy Grading] No interactive client connected; applying saved grading params.")

        params["input_signature"] = signature
        params["overall_strength"] = float(overall_strength)

        graded = gm.apply_grading_batch(
            image,
            params,
            overall_strength=float(overall_strength),
            mask=mask,
            device=model_management.get_torch_device(),
            output_device=model_management.intermediate_device(),
            output_dtype=model_management.intermediate_dtype(),
        )

        grading_data = json.dumps(
            {
                **params,
                "paused": paused,
                "image_size": [int(image.shape[2]), int(image.shape[1])],
            }
        )

        histogram = gm.compute_histogram(graded[0])
        ui_payload: dict[str, Any] = {
            "grading_state": [json.dumps(params)],
            "histogram": [histogram],
        }
        try:
            uid = uuid.uuid4().hex
            orig_thumb = _write_result_thumbnail(image[0], f"orig_{uid}")
            res_thumb = _write_result_thumbnail(graded[0], f"graded_{uid}")
            ui_payload["original_thumbnail"] = [orig_thumb]
            ui_payload["processed_thumbnail"] = [res_thumb]
            ui_payload["grading_result"] = [res_thumb]
        except Exception as exc:  # pragma: no cover - preview must never break execution
            logging.warning("[Duffy Grading] Could not write result preview: %s", exc)

        return io.NodeOutput(graded, grading_data, ui=ui_payload)
