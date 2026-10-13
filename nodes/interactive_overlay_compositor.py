"""Interactive Overlay Compositor -- human-in-the-loop overlay placement node.

When execution reaches this node it can pause the workflow, show an interactive
transform canvas inside the node, and resume once the user clicks "Continue".
The final composite is rendered on the GPU from the full-resolution tensors.

Protocol:
* WS event  ``duffy-interactive-overlay-pause``  (server -> executing client)
* POST      ``/duffy/interactive_overlay/resume`` (client -> server)
* GET       ``/duffy/interactive_overlay/pending`` (rehydrate after page reload)
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
import uuid

import numpy as np
import torch
from PIL import Image

import comfy.model_management as model_management
import folder_paths
import server
from comfy_api.latest import io

try:  # Support both package-relative and direct (test) imports.
    from . import interactive_overlay_math as om
except ImportError:  # pragma: no cover - exercised by direct file loading in tests
    import interactive_overlay_math as om  # type: ignore

NODE_ID = "Duffy_InteractiveOverlayCompositor"
PAUSE_EVENT = "duffy-interactive-overlay-pause"
PAUSE_MODES = ["always", "on_input_change", "never"]
PREVIEW_MAX_EDGE = 1280
PREVIEW_SUBFOLDER = "duffy_overlay"
RESULT_SUBFOLDER = "duffy_overlay_results"
RESULT_MAX_EDGE = 1024
POLL_INTERVAL_SECONDS = 0.05
MAX_BODY_BYTES = 64 * 1024

# session_id -> session dict. Guarded by _SESSION_LOCK.
PENDING_OVERLAY_SESSIONS: dict[str, dict] = {}
_SESSION_LOCK = threading.Lock()


# ---------------------------------------------------------------------------
# Preview helpers
# ---------------------------------------------------------------------------

def _frame_to_pil(frame_hwc: torch.Tensor, keep_alpha: bool) -> Image.Image:
    rgba = om.to_rgba_chw(frame_hwc.detach().to("cpu", torch.float32)).clamp(0.0, 1.0)
    array = (rgba.permute(1, 2, 0).numpy() * 255.0).round().astype(np.uint8)
    image = Image.fromarray(array, mode="RGBA")
    return image if keep_alpha else image.convert("RGB")


def _write_preview(frame_hwc: torch.Tensor, filename: str, keep_alpha: bool, subfolder: str = PREVIEW_SUBFOLDER) -> str:
    image = _frame_to_pil(frame_hwc, keep_alpha)
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
    # Served by ComfyUI's built-in /view endpoint -- no custom file route needed.
    return f"/view?filename={filename}&subfolder={subfolder}&type=temp&rand={uuid.uuid4().hex[:8]}"


def _write_result_thumbnail(frame_hwc: torch.Tensor, stem: str) -> str:
    """Fast node thumbnail of the composite (area downsample in torch + JPEG, PNG if alpha).

    This runs on the critical path after "Continue", so it avoids slow WebP encoding.
    Returns the written filename (inside ``RESULT_SUBFOLDER``).
    """
    frame = frame_hwc.detach().to("cpu", torch.float32)
    height, width = int(frame.shape[0]), int(frame.shape[1])
    ratio = min(1.0, RESULT_MAX_EDGE / max(height, width))
    chw = frame.permute(2, 0, 1).unsqueeze(0)
    if ratio < 1.0:
        size = (max(1, round(height * ratio)), max(1, round(width * ratio)))
        chw = torch.nn.functional.interpolate(chw, size=size, mode="area")
    array = (chw[0].permute(1, 2, 0).clamp(0.0, 1.0) * 255.0).round().to(torch.uint8).numpy()

    channels = array.shape[-1]
    if channels == 1:
        image, ext = Image.fromarray(array[..., 0], mode="L"), "jpg"
    elif channels >= 4:
        image, ext = Image.fromarray(array[..., :4], mode="RGBA"), "png"
    else:
        image, ext = Image.fromarray(array[..., :3], mode="RGB"), "jpg"

    directory = os.path.join(folder_paths.get_temp_directory(), RESULT_SUBFOLDER)
    os.makedirs(directory, exist_ok=True)
    filename = f"{stem}.{ext}"
    if ext == "png":
        image.save(os.path.join(directory, filename), format="PNG", compress_level=1)
    else:
        image.save(os.path.join(directory, filename), format="JPEG", quality=90)
    return filename


def _warm_up_kernels() -> None:
    """Run a tiny composite on the compute device while the user is interacting.

    The first bicubic ``grid_sample`` call initializes CUDA kernels (~100+ ms); doing
    it during the pause keeps the post-"Continue" latency low.
    """
    try:
        device = model_management.get_torch_device()
        tiny = torch.zeros(1, 8, 8, 3)
        om.composite_batch(tiny, tiny, om.default_state(), "normal", 1.0, device=device, output_device=device)
    except Exception as exc:  # pragma: no cover - purely an optimization
        logging.debug("[Duffy Overlay] Kernel warm-up skipped: %s", exc)


def _delete_files(paths: list[str]) -> None:
    for path in paths:
        try:
            if path and os.path.isfile(path):
                os.remove(path)
        except OSError as exc:  # pragma: no cover - best effort cleanup
            logging.debug("[Duffy Overlay] Could not delete preview %s: %s", path, exc)


# ---------------------------------------------------------------------------
# Session handling
# ---------------------------------------------------------------------------

def _client_connected() -> bool:
    instance = server.PromptServer.instance
    client_id = getattr(instance, "client_id", None)
    sockets = getattr(instance, "sockets", None) or {}
    return client_id is not None and client_id in sockets


def handle_resume(data) -> tuple[int, dict]:
    """Validate a resume request and unblock the waiting worker. Returns ``(status, body)``."""
    if not isinstance(data, dict):
        return 400, {"status": "error", "message": "Body must be a JSON object."}

    session_id = data.get("session_id")
    node_id = data.get("node_id")
    if not isinstance(session_id, str) or not isinstance(node_id, (str, int)):
        return 400, {"status": "error", "message": "session_id and node_id are required."}

    try:
        transform = om.validate_transform(data.get("transform"))
    except (ValueError, TypeError) as exc:
        return 400, {"status": "error", "message": f"Invalid transform: {exc}"}

    with _SESSION_LOCK:
        session = PENDING_OVERLAY_SESSIONS.get(session_id)
        if session is None or str(session["node_id"]) != str(node_id):
            return 404, {"status": "error", "message": "Session not found."}
        session["transform"] = transform
        session["event"].set()
    return 200, {"status": "success"}


def pending_payloads() -> list[dict]:
    with _SESSION_LOCK:
        return [dict(session["payload"]) for session in PENDING_OVERLAY_SESSIONS.values()]


try:
    routes = server.PromptServer.instance.routes

    @routes.post("/duffy/interactive_overlay/resume")
    async def duffy_interactive_overlay_resume(request):
        from aiohttp import web

        if request.content_length is not None and request.content_length > MAX_BODY_BYTES:
            return web.json_response({"status": "error", "message": "Payload too large."}, status=413)
        try:
            data = await request.json()
        except Exception:
            return web.json_response({"status": "error", "message": "Invalid JSON."}, status=400)
        status, body = handle_resume(data)
        return web.json_response(body, status=status)

    @routes.get("/duffy/interactive_overlay/pending")
    async def duffy_interactive_overlay_pending(request):
        from aiohttp import web

        return web.json_response({"sessions": pending_payloads()})
except Exception as exc:  # pragma: no cover - server not available (e.g. tooling)
    logging.debug("[Duffy Overlay] Route registration skipped: %s", exc)


def _run_interactive_session(
    node_id: str,
    background: torch.Tensor,
    overlay: torch.Tensor,
    state: dict,
    blend_mode: str,
    opacity: float,
    signature: str,
) -> dict:
    """Emit the pause event and block (interrupt-aware) until the client resumes."""
    session_id = uuid.uuid4().hex
    bg_h, bg_w = int(background.shape[1]), int(background.shape[2])
    ov_h, ov_w = int(overlay.shape[1]), int(overlay.shape[2])

    files: list[str] = []
    try:
        bg_name = f"{session_id}_bg.webp"
        ov_name = f"{session_id}_ov.webp"
        files.append(_write_preview(background[0], bg_name, keep_alpha=False))
        files.append(_write_preview(overlay[0], ov_name, keep_alpha=True))

        payload = {
            "session_id": session_id,
            "node_id": str(node_id),
            "bg_preview_url": _view_url(bg_name),
            "ov_preview_url": _view_url(ov_name),
            "bg_size": [bg_w, bg_h],
            "overlay_size": [ov_w, ov_h],
            "state": state,
            "default_state": om.default_state((bg_w, bg_h), (ov_w, ov_h)),
            "blend_mode": blend_mode,
            "opacity": float(opacity),
            "input_signature": signature,
            "created": time.time(),
        }
        event = threading.Event()
        with _SESSION_LOCK:
            PENDING_OVERLAY_SESSIONS[session_id] = {
                "event": event,
                "node_id": str(node_id),
                "transform": None,
                "payload": payload,
            }

        # Free transient buffers while the user interacts; model weights stay resident.
        model_management.soft_empty_cache()

        instance = server.PromptServer.instance
        instance.send_sync(PAUSE_EVENT, payload, getattr(instance, "client_id", None))
        _warm_up_kernels()

        while not event.wait(POLL_INTERVAL_SECONDS):
            model_management.throw_exception_if_processing_interrupted()

        with _SESSION_LOCK:
            result = PENDING_OVERLAY_SESSIONS.get(session_id, {}).get("transform")
        return result or state
    finally:
        with _SESSION_LOCK:
            PENDING_OVERLAY_SESSIONS.pop(session_id, None)
        _delete_files(files)


# ---------------------------------------------------------------------------
# Node
# ---------------------------------------------------------------------------

class DuffyInteractiveOverlayCompositor(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id=NODE_ID,
            display_name="Interactive Overlay Compositor",
            category="Duffy/Image/Compositing",
            description=(
                "Pause the workflow to position, scale and rotate an overlay over a background "
                "directly inside the node, then composite at full resolution on the GPU."
            ),
            inputs=[
                io.Image.Input("background_image", display_name="Background Image"),
                io.Image.Input("overlay_image", display_name="Overlay Image"),
                io.Combo.Input("blend_mode", options=om.BLEND_MODES, default="normal", display_name="Blend Mode"),
                io.Float.Input(
                    "opacity", default=1.0, min=0.0, max=1.0, step=0.01, display_name="Opacity",
                    display_mode=io.NumberDisplay.slider,
                ),
                io.Combo.Input(
                    "pause_mode", options=PAUSE_MODES, default="always", display_name="Pause Mode",
                    tooltip=(
                        "always: pause on every run. on_input_change: pause only when the input images "
                        "change. never: apply the saved transform without pausing."
                    ),
                ),
                io.String.Input("transform_state", default="{}", socketless=True),
            ],
            outputs=[
                io.Image.Output("IMAGE", display_name="IMAGE"),
                io.Mask.Output("MASK", display_name="MASK"),
                io.String.Output("TRANSFORM_DATA", display_name="TRANSFORM_DATA"),
            ],
            hidden=[io.Hidden.unique_id],
        )

    @classmethod
    def validate_inputs(cls, **kwargs):
        blend_mode = kwargs.get("blend_mode")
        if blend_mode is not None and blend_mode not in om.BLEND_MODES:
            return f"blend_mode must be one of {om.BLEND_MODES}."
        pause_mode = kwargs.get("pause_mode")
        if pause_mode is not None and pause_mode not in PAUSE_MODES:
            return f"pause_mode must be one of {PAUSE_MODES}."
        opacity = kwargs.get("opacity")
        if opacity is not None and not (0.0 <= float(opacity) <= 1.0):
            return "opacity must be within [0, 1]."
        return True

    @classmethod
    def fingerprint_inputs(cls, **kwargs):
        # "always" must re-execute even when inputs are cached; other modes rely on
        # ComfyUI's regular input-based caching.
        pause_mode = kwargs.get("pause_mode", "always")
        if pause_mode == "always":
            return float("nan")
        return pause_mode

    @classmethod
    def execute(
        cls,
        background_image: torch.Tensor,
        overlay_image: torch.Tensor,
        blend_mode: str = "normal",
        opacity: float = 1.0,
        pause_mode: str = "always",
        transform_state: str = "{}",
        **kwargs,
    ) -> io.NodeOutput:
        bg_batch, ov_batch = int(background_image.shape[0]), int(overlay_image.shape[0])
        if ov_batch not in (1, bg_batch):
            raise ValueError(
                f"Overlay Image batch size must be 1 or match Background Image ({bg_batch}); received {ov_batch}."
            )

        bg_wh = (int(background_image.shape[2]), int(background_image.shape[1]))
        ov_wh = (int(overlay_image.shape[2]), int(overlay_image.shape[1]))
        saved = om.parse_saved_state(transform_state)
        state = saved or om.default_state(bg_wh, ov_wh)
        signature = om.tensor_signature(background_image, overlay_image)

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
                str(node_id), background_image, overlay_image, state, blend_mode, opacity, signature
            )
            state = result
            blend_mode = result.get("blend_mode", blend_mode)
            opacity = float(result.get("opacity", opacity))
            paused = True
        elif wants_pause:
            logging.info("[Duffy Overlay] No interactive client connected; applying saved transform.")

        image, mask = om.composite_batch(
            background_image,
            overlay_image,
            state,
            blend_mode,
            float(opacity),
            device=model_management.get_torch_device(),
            output_device=model_management.intermediate_device(),
        )
        transform_data = om.build_transform_data(state, bg_wh, ov_wh, blend_mode, float(opacity), paused)

        # The interactive widget occupies the node body, so the result preview is delivered
        # under a custom UI key (rendered by the widget) instead of the stock image preview.
        ui_payload = {"overlay_state": [json.dumps(state)]}
        try:
            filename = _write_result_thumbnail(image[0], f"result_{uuid.uuid4().hex}")
            ui_payload["overlay_result"] = [{"filename": filename, "subfolder": RESULT_SUBFOLDER, "type": "temp"}]
        except Exception as exc:  # pragma: no cover - preview must never break the output
            logging.warning("[Duffy Overlay] Could not write result preview: %s", exc)
        return io.NodeOutput(image, mask, transform_data, ui=ui_payload)
