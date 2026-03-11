import base64
import io as py_io
import json
import threading
import uuid

import comfy.utils
import numpy as np
import server
import torch
from aiohttp import web
from comfy_api.latest import io, ui
from PIL import Image

# Dictionary to hold thread synchronization objects
PENDING_STITCHES = {}

try:
    @server.PromptServer.instance.routes.post("/duffy/stitch/continue")
    async def advanced_image_stitch_continue(request):
        try:
            data = await request.json()
            session_id = data.get("session_id")
            layout = data.get("layout", {})
            
            if session_id in PENDING_STITCHES:
                PENDING_STITCHES[session_id]["layout"] = layout
                PENDING_STITCHES[session_id]["event"].set()
                return web.json_response({"status": "success"})
            else:
                return web.json_response({"status": "error", "message": "Session not found"}, status=404)
        except Exception as e:
            return web.json_response({"status": "error", "message": str(e)}, status=500)
except Exception:
    pass

SLOTS = 9

def _stitch_horizontal(tensors: list[torch.Tensor]) -> torch.Tensor:
    max_h = max(t.shape[1] for t in tensors)
    resized = []
    for t in tensors:
        _, h, w, _ = t.shape
        if h == max_h:
            resized.append(t)
        else:
            new_w = max(1, round(w * (max_h / h)))
            bchw = t.movedim(-1, 1)
            scaled = comfy.utils.common_upscale(bchw, new_w, max_h, "lanczos", crop="disabled")
            resized.append(scaled.movedim(1, -1))
    return torch.cat(resized, dim=2)

def _stitch_vertical(tensors: list[torch.Tensor]) -> torch.Tensor:
    min_w = min(t.shape[2] for t in tensors)
    cropped = []
    for t in tensors:
        _, h, w, _ = t.shape
        if w == min_w:
            cropped.append(t)
        else:
            offset = (w - min_w) // 2
            cropped.append(t[:, :, offset:offset + min_w, :])
    return torch.cat(cropped, dim=1)

def _scale_to_cell(t: torch.Tensor, cell_h: int, cell_w: int) -> torch.Tensor:
    bchw = t.movedim(-1, 1)
    scaled = comfy.utils.common_upscale(bchw, cell_w, cell_h, "lanczos", crop="disabled")
    return scaled.movedim(1, -1)

def _stitch_layout(grid: list[list[torch.Tensor | None]]) -> torch.Tensor:
    active_rows = [r for r in range(3) if any(grid[r][c] is not None for c in range(3))]
    active_cols = [c for c in range(3) if any(grid[r][c] is not None for r in range(3))]

    if not active_rows or not active_cols:
        return torch.zeros((1, 64, 64, 3), dtype=torch.float32)

    all_tensors = [grid[r][c] for r in active_rows for c in active_cols if grid[r][c] is not None]
    if not all_tensors:
        return torch.zeros((1, 64, 64, 3), dtype=torch.float32)

    cell_h = max(t.shape[1] for t in all_tensors)
    cell_w = max(t.shape[2] for t in all_tensors)

    row_tensors = []
    for r in active_rows:
        cells = []
        for c in active_cols:
            t = grid[r][c]
            if t is not None:
                cells.append(_scale_to_cell(t, cell_h, cell_w))
            else:
                cells.append(torch.zeros((1, cell_h, cell_w, 3), dtype=torch.float32))
        row_tensors.append(torch.cat(cells, dim=2))

    return torch.cat(row_tensors, dim=1)

class DuffyAdvancedConnectedImageStitch(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        image_inputs = [
            io.Image.Input(f"image_{i}", display_name=f"Image {i}", optional=True)
            for i in range(1, SLOTS + 1)
        ]

        return io.Schema(
            node_id="Duffy_AdvancedConnectedImageStitch",
            display_name="Advanced Connected Image Stitch",
            category="Duffy/Image",
            description="Interactively map up to 9 images and stitch them horizontally, vertically, or in a 3x3 layout.",
            inputs=[
                *image_inputs,
                io.String.Input("saved_layout", default='{"orientation": "Horizontal", "layout_pos": {}}', socketless=True),
                io.Boolean.Input("pause_execution", default=True, display_name="Pause for Interaction", socketless=True),
            ],
            outputs=[
                io.Image.Output("stitched_image", display_name="Stitched Image"),
            ],
        )

    @classmethod
    def execute(cls, saved_layout: str, pause_execution: bool, **kwargs) -> io.NodeOutput:
        try:
            layout_data = json.loads(saved_layout)
        except Exception:
            layout_data = {"orientation": "Horizontal", "layout_pos": {}}

        images: dict[int, torch.Tensor] = {}
        for i in range(1, SLOTS + 1):
            t = kwargs.get(f"image_{i}")
            if t is not None:
                images[i] = t

        if not images:
            return io.NodeOutput(torch.zeros((1, 64, 64, 3), dtype=torch.float32))

        if pause_execution:
            session_id = str(uuid.uuid4())
            
            # Encode first frame for preview for each connected image
            b64_images = {}
            for i, img_tensor in images.items():
                img_np = img_tensor[0].clone().cpu().numpy()
                img_np = (img_np * 255).clip(0, 255).astype(np.uint8)
                pil_img = Image.fromarray(img_np)
                
                buffered = py_io.BytesIO()
                pil_img.save(buffered, format="JPEG", quality=85)
                img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
                b64_images[str(i)] = f"data:image/jpeg;base64,{img_b64}"
            
            PENDING_STITCHES[session_id] = {
                "event": threading.Event(),
                "layout": layout_data
            }
            
            server.PromptServer.instance.send_sync("duffy-stitch-pause", {
                "session_id": session_id,
                "images": b64_images
            })
            
            success = PENDING_STITCHES[session_id]["event"].wait(timeout=600)
            
            if session_id in PENDING_STITCHES:
                if success:
                    layout_data = PENDING_STITCHES[session_id].get("layout", layout_data)
                del PENDING_STITCHES[session_id]

        orientation = layout_data.get("orientation", "Horizontal")

        if orientation == "Layout":
            layout_pos = layout_data.get("layout_pos", {})
            grid: list[list[torch.Tensor | None]] = [[None] * 3 for _ in range(3)]
            for pos in range(1, SLOTS + 1):
                mapping = str(layout_pos.get(str(pos), "none"))
                if mapping and mapping != "none":
                    img_idx = int(mapping)
                    if img_idx in images:
                        r, c = divmod(pos - 1, 3)
                        grid[r][c] = images[img_idx]
            result = _stitch_layout(grid)
            return io.NodeOutput(result)

        tensors = [images[i] for i in sorted(images)]

        if len(tensors) == 1:
            return io.NodeOutput(tensors[0])

        if orientation == "Horizontal":
            result = _stitch_horizontal(tensors)
        else:
            result = _stitch_vertical(tensors)

        return io.NodeOutput(result, ui=ui.PreviewImage(result, cls=cls))
