import base64
import io as py_io
import json
import threading
import uuid

import numpy as np
import server
import torch
from aiohttp import web
from comfy_api.latest import io, ui
from PIL import Image, ImageOps

LAYER_IDS = [f"object_{index}" for index in range(1, 6)]
DEFAULT_STATE = {"version": 1, "layers": {}}
PENDING_LAYER_CONTROLS = {}
MAX_WAIT_SECONDS = 600


def _default_position(slot_id: str) -> tuple[float, float]:
    positions = {
        "object_1": (0.5, 0.5),
        "object_2": (0.32, 0.42),
        "object_3": (0.68, 0.42),
        "object_4": (0.4, 0.68),
        "object_5": (0.6, 0.68),
    }
    return positions.get(slot_id, (0.5, 0.5))


def _fit_scale(
    source_width: int | None,
    source_height: int | None,
    background_width: int | None,
    background_height: int | None,
) -> float:
    if not source_width or not source_height or not background_width or not background_height:
        return 1.0

    width_ratio = (background_width * 0.45) / max(1, source_width)
    height_ratio = (background_height * 0.45) / max(1, source_height)
    return float(max(0.05, min(1.0, width_ratio, height_ratio)))


def _default_layer_transform(
    slot_id: str,
    source_width: int | None = None,
    source_height: int | None = None,
    background_width: int | None = None,
    background_height: int | None = None,
) -> dict:
    pos_x, pos_y = _default_position(slot_id)
    scale = _fit_scale(source_width, source_height, background_width, background_height)
    return {
        "enabled": True,
        "x": pos_x,
        "y": pos_y,
        "scaleX": scale,
        "scaleY": scale,
        "angle": 0.0,
        "flipX": False,
        "flipY": False,
        "zIndex": LAYER_IDS.index(slot_id),
        "sourceWidth": int(source_width or 0),
        "sourceHeight": int(source_height or 0),
    }


def _to_bool(value, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    if isinstance(value, (int, float)):
        return bool(value)
    return default


def _to_float(value, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _coerce_saved_state(value) -> dict:
    if value is None:
        data = DEFAULT_STATE
    elif isinstance(value, str):
        try:
            data = json.loads(value)
        except json.JSONDecodeError:
            data = DEFAULT_STATE
    elif isinstance(value, dict):
        data = value
    else:
        data = DEFAULT_STATE

    layers_data = data.get("layers") if isinstance(data, dict) else None
    if not isinstance(layers_data, dict):
        if isinstance(data, dict):
            layers_data = {slot_id: data.get(slot_id) for slot_id in LAYER_IDS if isinstance(data.get(slot_id), dict)}
        else:
            layers_data = {}

    normalized_layers = {}
    for slot_id in LAYER_IDS:
        raw_layer = layers_data.get(slot_id)
        if not isinstance(raw_layer, dict):
            continue

        default_layer = _default_layer_transform(slot_id)
        scale_x = abs(_to_float(raw_layer.get("scaleX"), default_layer["scaleX"]))
        scale_y = abs(_to_float(raw_layer.get("scaleY"), default_layer["scaleY"]))

        normalized_layers[slot_id] = {
            "enabled": _to_bool(raw_layer.get("enabled"), True),
            "x": _to_float(raw_layer.get("x"), default_layer["x"]),
            "y": _to_float(raw_layer.get("y"), default_layer["y"]),
            "scaleX": max(0.01, scale_x),
            "scaleY": max(0.01, scale_y),
            "angle": _to_float(raw_layer.get("angle"), 0.0),
            "flipX": _to_bool(raw_layer.get("flipX"), False),
            "flipY": _to_bool(raw_layer.get("flipY"), False),
            "zIndex": _to_int(raw_layer.get("zIndex"), default_layer["zIndex"]),
            "sourceWidth": max(0, _to_int(raw_layer.get("sourceWidth"), 0)),
            "sourceHeight": max(0, _to_int(raw_layer.get("sourceHeight"), 0)),
        }

    return {
        "version": _to_int(data.get("version") if isinstance(data, dict) else 1, 1),
        "layers": normalized_layers,
    }


def _tensor_frame_to_numpy(frame: torch.Tensor) -> np.ndarray:
    image = frame.detach().cpu().numpy()
    image = (image * 255.0).clip(0, 255).astype(np.uint8)
    return image


def _tensor_frame_to_pil_rgba(frame: torch.Tensor) -> Image.Image:
    image = _tensor_frame_to_numpy(frame)
    channels = image.shape[-1] if image.ndim == 3 else 1

    if channels == 4:
        return Image.fromarray(image, mode="RGBA")
    if channels == 3:
        return Image.fromarray(image, mode="RGB").convert("RGBA")
    if channels == 1:
        return Image.fromarray(image[..., 0], mode="L").convert("RGBA")

    return Image.fromarray(image[..., :3], mode="RGB").convert("RGBA")


def _tensor_frame_to_data_url(frame: torch.Tensor) -> str:
    image = _tensor_frame_to_pil_rgba(frame)
    buffered = py_io.BytesIO()
    image.save(buffered, format="PNG")
    encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def _select_frame(image: torch.Tensor, frame_index: int) -> torch.Tensor:
    if image.shape[0] == 1:
        return image[0]
    return image[frame_index]


def _transform_overlay(
    overlay: Image.Image,
    layer_state: dict,
) -> Image.Image:
    result = overlay
    if layer_state.get("flipX"):
        result = ImageOps.mirror(result)
    if layer_state.get("flipY"):
        result = ImageOps.flip(result)

    scale_x = max(0.01, float(layer_state.get("scaleX", 1.0)))
    scale_y = max(0.01, float(layer_state.get("scaleY", 1.0)))
    scaled_width = max(1, round(result.width * scale_x))
    scaled_height = max(1, round(result.height * scale_y))
    result = result.resize((scaled_width, scaled_height), resample=Image.Resampling.LANCZOS)

    angle = float(layer_state.get("angle", 0.0))
    if angle % 360:
        # Fabric renders positive angles clockwise in the canvas coordinate system.
        result = result.rotate(-angle, resample=Image.Resampling.BICUBIC, expand=True)

    return result


def _overlay_onto_background(
    background: Image.Image,
    overlay: Image.Image,
    layer_state: dict,
) -> None:
    center_x = float(layer_state.get("x", 0.5)) * background.width
    center_y = float(layer_state.get("y", 0.5)) * background.height
    left = int(round(center_x - overlay.width / 2))
    top = int(round(center_y - overlay.height / 2))

    layer_canvas = Image.new("RGBA", background.size, (0, 0, 0, 0))
    layer_canvas.paste(overlay, (left, top), overlay)
    background.alpha_composite(layer_canvas)


def _pil_rgba_to_tensor(image: Image.Image, channels: int) -> torch.Tensor:
    if channels == 4:
        converted = image.convert("RGBA")
    elif channels == 1:
        converted = image.convert("L")
    else:
        converted = image.convert("RGB")

    array = np.array(converted).astype(np.float32) / 255.0
    if array.ndim == 2:
        array = array[..., None]
    return torch.from_numpy(array)


def _get_layer_state(
    saved_state: dict,
    slot_id: str,
    source_width: int,
    source_height: int,
    background_width: int,
    background_height: int,
) -> dict:
    existing = saved_state.get("layers", {}).get(slot_id)
    if not isinstance(existing, dict):
        existing = _default_layer_transform(
            slot_id,
            source_width=source_width,
            source_height=source_height,
            background_width=background_width,
            background_height=background_height,
        )
        saved_state.setdefault("layers", {})[slot_id] = existing
        return existing

    merged = _default_layer_transform(
        slot_id,
        source_width=source_width,
        source_height=source_height,
        background_width=background_width,
        background_height=background_height,
    )
    merged.update(existing)
    merged["scaleX"] = max(0.01, abs(_to_float(merged.get("scaleX"), 1.0)))
    merged["scaleY"] = max(0.01, abs(_to_float(merged.get("scaleY"), 1.0)))
    merged["sourceWidth"] = source_width
    merged["sourceHeight"] = source_height
    saved_state.setdefault("layers", {})[slot_id] = merged
    return merged


def _composite_batch(background_image: torch.Tensor, object_images: dict[str, torch.Tensor], saved_state: dict) -> torch.Tensor:
    batch_size = background_image.shape[0]
    background_channels = background_image.shape[-1]
    frames = []

    for frame_index in range(batch_size):
        background_frame = _select_frame(background_image, frame_index)
        composed = _tensor_frame_to_pil_rgba(background_frame)
        layer_entries = []

        for slot_id in LAYER_IDS:
            tensor = object_images.get(slot_id)
            if tensor is None:
                continue

            object_frame = _select_frame(tensor, frame_index)
            source_height = int(object_frame.shape[0])
            source_width = int(object_frame.shape[1])
            layer_state = _get_layer_state(
                saved_state,
                slot_id,
                source_width=source_width,
                source_height=source_height,
                background_width=composed.width,
                background_height=composed.height,
            )
            if not layer_state.get("enabled", True):
                continue

            layer_entries.append((
                int(layer_state.get("zIndex", 0)),
                LAYER_IDS.index(slot_id),
                slot_id,
                object_frame,
                layer_state,
            ))

        layer_entries.sort(key=lambda item: (item[0], item[1]))

        for _, _, _, object_frame, layer_state in layer_entries:
            overlay = _tensor_frame_to_pil_rgba(object_frame)
            transformed = _transform_overlay(overlay, layer_state)
            _overlay_onto_background(composed, transformed, layer_state)

        frames.append(_pil_rgba_to_tensor(composed, background_channels))

    return torch.stack(frames, dim=0).to(dtype=background_image.dtype)


try:
    @server.PromptServer.instance.routes.post("/duffy/layer_control/continue")
    async def advanced_layer_control_continue(request):
        try:
            data = await request.json()
            session_id = data.get("session_id")
            saved_state = data.get("state", DEFAULT_STATE)

            if session_id in PENDING_LAYER_CONTROLS:
                PENDING_LAYER_CONTROLS[session_id]["state"] = saved_state
                PENDING_LAYER_CONTROLS[session_id]["event"].set()
                return web.json_response({"status": "success"})

            return web.json_response({"status": "error", "message": "Session not found"}, status=404)
        except Exception as error:
            return web.json_response({"status": "error", "message": str(error)}, status=500)
except Exception:
    pass


class DuffyAdvancedLayerControl(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        object_inputs = [
            io.Image.Input(slot_id, display_name=slot_id, optional=True)
            for slot_id in LAYER_IDS
        ]

        return io.Schema(
            node_id="Duffy_AdvancedLayerControl",
            display_name="Advanced Layer Control",
            category="Duffy/Image",
            description="Pause the workflow to position, resize, rotate, mirror, and reorder up to five object layers over a background image.",
            inputs=[
                io.Image.Input("background_image", display_name="Background Image"),
                *object_inputs,
                io.String.Input("saved_layers", default='{"version": 1, "layers": {}}', socketless=True),
                io.Boolean.Input("pause_execution", default=True, display_name="Pause for Interaction", socketless=True),
            ],
            outputs=[
                io.Image.Output("image", display_name="Image"),
            ],
        )

    @classmethod
    def validate_inputs(cls, **kwargs):
        saved_layers = kwargs.get("saved_layers")
        if saved_layers is not None:
            try:
                _coerce_saved_state(saved_layers)
            except Exception:
                return "saved_layers contains invalid JSON."

        background_image = kwargs.get("background_image")
        if background_image is None or not hasattr(background_image, "shape"):
            return True

        background_batch = int(background_image.shape[0])
        for slot_id in LAYER_IDS:
            object_image = kwargs.get(slot_id)
            if object_image is None or not hasattr(object_image, "shape"):
                continue

            object_batch = int(object_image.shape[0])
            if object_batch not in {1, background_batch}:
                return (
                    f"{slot_id} batch size must be 1 or match Background Image batch size "
                    f"({background_batch}); received {object_batch}."
                )

        return True

    @classmethod
    def execute(
        cls,
        background_image: torch.Tensor,
        saved_layers: str,
        pause_execution: bool,
        **kwargs,
    ) -> io.NodeOutput:
        saved_state = _coerce_saved_state(saved_layers)
        connected_objects = {
            slot_id: kwargs.get(slot_id)
            for slot_id in LAYER_IDS
            if kwargs.get(slot_id) is not None
        }

        if pause_execution and connected_objects:
            session_id = str(uuid.uuid4())
            preview_background = background_image[0]
            preview_height = int(preview_background.shape[0])
            preview_width = int(preview_background.shape[1])
            objects_payload = []

            for slot_id in LAYER_IDS:
                object_tensor = connected_objects.get(slot_id)
                if object_tensor is None:
                    continue

                preview_object = object_tensor[0]
                object_height = int(preview_object.shape[0])
                object_width = int(preview_object.shape[1])
                layer_state = _get_layer_state(
                    saved_state,
                    slot_id,
                    source_width=object_width,
                    source_height=object_height,
                    background_width=preview_width,
                    background_height=preview_height,
                )
                objects_payload.append({
                    "slotId": slot_id,
                    "label": slot_id,
                    "image_b64": _tensor_frame_to_data_url(preview_object),
                    "state": layer_state,
                })

            PENDING_LAYER_CONTROLS[session_id] = {
                "event": threading.Event(),
                "state": saved_state,
            }

            server.PromptServer.instance.send_sync("duffy-layer-control-pause", {
                "session_id": session_id,
                "background_image": _tensor_frame_to_data_url(preview_background),
                "objects": objects_payload,
                "saved_state": saved_state,
            })

            success = PENDING_LAYER_CONTROLS[session_id]["event"].wait(timeout=MAX_WAIT_SECONDS)

            if session_id in PENDING_LAYER_CONTROLS:
                if success:
                    saved_state = _coerce_saved_state(PENDING_LAYER_CONTROLS[session_id].get("state"))
                del PENDING_LAYER_CONTROLS[session_id]

        if not connected_objects:
            return io.NodeOutput(background_image, ui=ui.PreviewImage(background_image, cls=cls))

        composited = _composite_batch(background_image, connected_objects, saved_state)
        return io.NodeOutput(composited, ui=ui.PreviewImage(composited, cls=cls))
