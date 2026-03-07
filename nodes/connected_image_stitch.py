"""
Connected Image Stitch Node (V3 Schema)
Receive up to 9 images via connections and stitch them into a single
output image — horizontally, vertically, or in a 3×3 grid layout.
"""

import hashlib

import comfy.utils
import torch
from comfy_api.latest import io

SLOTS = 9


# ---------------------------------------------------------------------------
# Stitching helpers
# ---------------------------------------------------------------------------

def _stitch_horizontal(tensors: list[torch.Tensor]) -> torch.Tensor:
    """
    Stitch images side-by-side. All images are scaled to the height of
    the tallest image (preserving aspect ratio), then concatenated along width.
    """
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
    return torch.cat(resized, dim=2)  # cat along W


def _stitch_vertical(tensors: list[torch.Tensor]) -> torch.Tensor:
    """
    Stack images vertically. All images are center-cropped to the width of
    the narrowest image, then concatenated along height.
    """
    min_w = min(t.shape[2] for t in tensors)
    cropped = []
    for t in tensors:
        _, h, w, _ = t.shape
        if w == min_w:
            cropped.append(t)
        else:
            offset = (w - min_w) // 2
            cropped.append(t[:, :, offset:offset + min_w, :])
    return torch.cat(cropped, dim=1)  # cat along H


def _scale_to_cell(t: torch.Tensor, cell_h: int, cell_w: int) -> torch.Tensor:
    """Scale a [1,H,W,C] tensor to exactly (cell_h, cell_w) using lanczos."""
    bchw = t.movedim(-1, 1)
    scaled = comfy.utils.common_upscale(bchw, cell_w, cell_h, "lanczos", crop="disabled")
    return scaled.movedim(1, -1)


def _stitch_layout(grid: list[list[torch.Tensor | None]]) -> torch.Tensor:
    """
    Stitch images preserving their 3×3 grid positions.

    - Rows and columns that contain zero images are excluded.
    - All images are scaled to a uniform cell size (max_h × max_w).
    - Empty cells within active rows/columns are filled with black.
    """
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
        row_tensors.append(torch.cat(cells, dim=2))  # cat along W

    return torch.cat(row_tensors, dim=1)  # cat along H


# ---------------------------------------------------------------------------
# Node
# ---------------------------------------------------------------------------

class DuffyConnectedImageStitch(io.ComfyNode):
    """
    Connect up to 9 images and stitch them into a single output image —
    horizontally, vertically, or in a 3×3 grid layout with custom mapping.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        image_inputs = [
            io.Image.Input(
                f"image_{i}",
                display_name=f"Image {i}",
                optional=True,
                tooltip=f"Image connection slot {i}",
            )
            for i in range(1, SLOTS + 1)
        ]

        layout_options = ["none"] + [str(j) for j in range(1, SLOTS + 1)]
        layout_inputs = [
            io.Combo.Input(
                f"layout_pos_{i}",
                options=layout_options,
                default=str(i),
                display_name=f"Layout Position {i}",
                socketless=True,
                optional=True,
                tooltip=f"Which image input to place at grid position {i}",
            )
            for i in range(1, SLOTS + 1)
        ]

        return io.Schema(
            node_id="Duffy_ConnectedImageStitch",
            display_name="Duffy Connected Image Stitch",
            category="Duffy/Image",
            description=(
                "Connect up to 9 images and stitch them together horizontally, "
                "vertically, or in a grid layout preserving their 3×3 positions. "
                "Horizontal mode scales all images to the tallest height. "
                "Vertical mode center-crops all images to the narrowest width. "
                "Layout mode arranges images in the grid pattern you set."
            ),
            inputs=[
                io.Combo.Input(
                    "orientation",
                    options=["Horizontal", "Vertical", "Layout"],
                    default="Horizontal",
                    display_name="Orientation",
                    tooltip="Stitch direction: side-by-side, stacked, or grid layout",
                ),
                *image_inputs,
                *layout_inputs,
            ],
            outputs=[
                io.Image.Output(
                    "stitched_image",
                    display_name="Stitched Image",
                    tooltip="The combined output image",
                ),
            ],
            is_output_node=False,
        )

    @classmethod
    def execute(cls, orientation: str, **kwargs) -> io.NodeOutput:
        # Collect connected image tensors keyed by slot number
        images: dict[int, torch.Tensor] = {}
        for i in range(1, SLOTS + 1):
            t = kwargs.get(f"image_{i}")
            if t is not None:
                images[i] = t

        if not images:
            return io.NodeOutput(torch.zeros((1, 64, 64, 3), dtype=torch.float32))

        if orientation == "Layout":
            # Build 3×3 grid using layout_pos mapping
            grid: list[list[torch.Tensor | None]] = [[None] * 3 for _ in range(3)]
            for pos in range(1, SLOTS + 1):
                mapping = kwargs.get(f"layout_pos_{pos}", "none")
                if mapping and mapping != "none":
                    img_idx = int(mapping)
                    if img_idx in images:
                        r, c = divmod(pos - 1, 3)
                        grid[r][c] = images[img_idx]
            result = _stitch_layout(grid)
            return io.NodeOutput(result)

        # Horizontal / Vertical — collect as ordered list
        tensors = [images[i] for i in sorted(images)]

        if len(tensors) == 1:
            return io.NodeOutput(tensors[0])

        if orientation == "Horizontal":
            result = _stitch_horizontal(tensors)
        else:
            result = _stitch_vertical(tensors)

        return io.NodeOutput(result)

    @classmethod
    def fingerprint_inputs(cls, **kwargs):
        m = hashlib.sha256()
        m.update(kwargs.get("orientation", "Horizontal").encode())
        for i in range(1, SLOTS + 1):
            t = kwargs.get(f"image_{i}")
            # Hash the shape so reconnecting a different image invalidates cache
            if t is not None:
                m.update(f"img{i}:{list(t.shape)}".encode())
            else:
                m.update(f"img{i}:none".encode())
            m.update(kwargs.get(f"layout_pos_{i}", "none").encode())
        return m.digest().hex()
