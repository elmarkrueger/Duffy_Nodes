import json
import logging
import os

import folder_paths
import numpy as np
import torch
from aiohttp import web
from comfy_api.latest import io
from PIL import Image
from server import PromptServer

logger = logging.getLogger(__name__)


class DuffySAM3MaskEditor(io.ComfyNode):
    """Unified CLIP encoder + interactive SAM3 mask editor with image loading.

    Load an image via the modal mask editor, enter a text prompt in the
    textarea, and place positive/negative points and bounding boxes on the
    image. Outputs the loaded image, CLIP CONDITIONING, and coordinate data
    for the SAM3 Detect node.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_SAM3MaskEditor",
            display_name="SAM3 Mask Editor",
            category="Duffy/SAM3",
            description=(
                "Load an image in the mask editor, enter a text prompt, "
                "and place positive/negative points and bounding boxes. "
                "Outputs the image, CLIP CONDITIONING, and coordinate data "
                "for SAM3 Detect."
            ),
            inputs=[
                io.Clip.Input("clip"),
                io.String.Input(
                    "image_file",
                    default="",
                    socketless=True,
                    optional=True,
                ),
                io.String.Input(
                    "prompt_text",
                    default="",
                    multiline=True,
                ),
                io.String.Input(
                    "internal_bboxes",
                    default="[]",
                    socketless=True,
                    optional=True,
                ),
                io.String.Input(
                    "internal_coords",
                    default="[]",
                    socketless=True,
                    optional=True,
                ),
                io.String.Input(
                    "internal_negative_coords",
                    default="[]",
                    socketless=True,
                    optional=True,
                ),
                io.String.Input(
                    "internal_resize_meta",
                    default="{}",
                    socketless=True,
                    optional=True,
                ),
            ],
            outputs=[
                io.Conditioning.Output(
                    "CONDITIONING",
                ),
                io.String.Output(
                    "positive_coords",
                ),
                io.String.Output(
                    "negative_coords",
                ),
                io.BoundingBox.Output(
                    "bboxes",
                ),
                io.Image.Output(
                    "image",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        clip,
        image_file: str = "",
        prompt_text: str = "",
        internal_bboxes: str = "[]",
        internal_coords: str = "[]",
        internal_negative_coords: str = "[]",
        internal_resize_meta: str = "{}",
        **kwargs,
    ) -> io.NodeOutput:
        if not image_file:
            raise ValueError(
                "DuffySAM3MaskEditor: No image loaded. "
                "Open the mask editor and click 'Load Image'."
            )

        image_path = folder_paths.get_annotated_filepath(image_file)
        pil_img = Image.open(image_path).convert("RGB")
        img_np = np.array(pil_img).astype(np.float32) / 255.0
        img_tensor = torch.from_numpy(img_np).unsqueeze(0)
        h, w = img_tensor.shape[1], img_tensor.shape[2]

        tokens = clip.tokenize(prompt_text)
        cond, pooled = clip.encode_from_tokens(
            tokens, return_pooled=True
        )
        conditioning = [[cond, {"pooled_output": pooled}]]

        parsed_coords = _parse_json(internal_coords, "internal_coords")
        parsed_negative_coords = _parse_json(
            internal_negative_coords,
            "internal_negative_coords",
        )
        parsed_bboxes = _parse_json(internal_bboxes, "internal_bboxes")

        _validate_coords(parsed_coords, w, h)
        _validate_coords(parsed_negative_coords, w, h)
        _validate_bboxes(parsed_bboxes, w, h)

        bbox_output = _bboxes_to_output_format(parsed_bboxes)

        return io.NodeOutput(
            conditioning,
            internal_coords,
            internal_negative_coords,
            bbox_output if bbox_output else None,
            img_tensor,
        )


def _parse_json(raw: str, field_name: str) -> list:
    if not raw or not raw.strip():
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"DuffySAM3MaskEditor: Invalid JSON in {field_name}. "
            f"Mask editor data is corrupted. Re-open the mask editor "
            f"and save again. Parse error: {exc}"
        ) from exc
    if not isinstance(parsed, list):
        raise ValueError(
            f"DuffySAM3MaskEditor: Expected a JSON array in "
            f"{field_name}, got {type(parsed).__name__}."
        )
    return parsed


def _validate_coords(coords: list, w: int, h: int) -> None:
    for i, pt in enumerate(coords):
        if not isinstance(pt, dict):
            raise ValueError(
                f"DuffySAM3MaskEditor: Point {i} is not a dict. "
                f'Expected {{"x": int, "y": int}}.'
            )
        x = pt.get("x", -1)
        y = pt.get("y", -1)
        if not (0 <= x < w and 0 <= y < h):
            raise ValueError(
                f"DuffySAM3MaskEditor: Point {i} at ({x}, {y}) is "
                f"outside image bounds ({w}x{h}). Adjust in the mask editor."
            )


def _validate_bboxes(bboxes: list, w: int, h: int) -> None:
    for i, box in enumerate(bboxes):
        if not isinstance(box, list) or len(box) != 4:
            raise ValueError(
                f"DuffySAM3MaskEditor: BBox {i} must be "
                f"[x_min, y_min, x_max, y_max], got {box}."
            )
        x0, y0, x1, y1 = box
        if not (0 <= x0 < w and 0 <= y0 < h):
            raise ValueError(
                f"DuffySAM3MaskEditor: BBox {i} origin ({x0}, {y0}) "
                f"is outside image bounds ({w}x{h})."
            )
        if x1 > w or y1 > h:
            raise ValueError(
                f"DuffySAM3MaskEditor: BBox {i} extends to ({x1}, {y1}) "
                f"exceeding image bounds ({w}x{h})."
            )


def _bboxes_to_output_format(bboxes: list) -> list:
    """Convert [[x0,y0,x1,y1], ...] to SAM3 Detect format.

    SAM3 Detect expects [{"x": int, "y": int, "width": int, "height": int}, ...].
    """
    result = []
    for box in bboxes:
        x0, y0, x1, y1 = box
        result.append({
            "x": int(x0),
            "y": int(y0),
            "width": int(x1 - x0),
            "height": int(y1 - y0),
        })
    return result


def _sanitize_filename(raw: str) -> str:
    """Strip directory components and reject dangerous patterns."""
    name = os.path.basename(raw).strip()
    if not name:
        return ""
    if ".." in name or "/" in name or "\\" in name or "\0" in name:
        return ""
    return name


def _get_unique_filepath(directory: str, desired: str) -> tuple:
    """Return (actual_filename, full_path), appending a counter if the
    desired name already exists in *directory*."""
    full = os.path.join(directory, desired)
    if not os.path.exists(full):
        return desired, full

    stem, ext = os.path.splitext(desired)
    counter = 1
    while True:
        candidate_name = f"{stem}_{counter}{ext}"
        candidate_path = os.path.join(directory, candidate_name)
        if not os.path.exists(candidate_path):
            return candidate_name, candidate_path
        counter += 1


try:
    @PromptServer.instance.routes.post("/duffy/sam3/upload_image")
    async def upload_sam3_image(request: web.Request) -> web.Response:
        """Accept a multipart image upload, save it to ComfyUI's input/
        directory, and return the server-confirmed filename."""
        content_type = request.content_type or ""
        if not content_type.startswith("multipart/"):
            return web.json_response(
                {"status": "error", "message": "Expected multipart upload."},
                status=415,
            )

        try:
            data = await request.post()
        except Exception:
            return web.json_response(
                {"status": "error", "message": "Failed to parse upload."},
                status=400,
            )

        image_field = data.get("image")
        if image_field is None:
            return web.json_response(
                {"status": "error", "message": "Missing 'image' field."},
                status=400,
            )

        raw_name = getattr(image_field, "filename", "") or ""
        safe_name = _sanitize_filename(raw_name)
        if not safe_name:
            return web.json_response(
                {"status": "error", "message": "Invalid or unsafe filename."},
                status=400,
            )

        input_dir = folder_paths.get_input_directory()
        actual_name, save_path = _get_unique_filepath(input_dir, safe_name)

        try:
            file_content = image_field.file.read()
            with open(save_path, "wb") as f:
                f.write(file_content)
        except (IOError, OSError) as exc:
            logger.error("SAM3 upload: failed to write %s: %s", save_path, exc)
            return web.json_response(
                {"status": "error", "message": "Failed to save file on server."},
                status=500,
            )

        return web.json_response(
            {"status": "ok", "filename": actual_name}
        )
except Exception:
    pass
