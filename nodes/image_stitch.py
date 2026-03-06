"""
Image Stitch Node (V3 Schema)
Upload up to 9 images via a 3×3 grid, reorder via drag-and-drop,
and stitch them into a single output image (horizontally or vertically).
"""

import hashlib
import os

import comfy.utils
import folder_paths
import node_helpers
import numpy as np
import torch
from comfy_api.latest import io
from PIL import Image, ImageOps


def _get_image_files() -> list[str]:
    """Return sorted list of image files from the ComfyUI input directory."""
    input_dir = folder_paths.get_input_directory()
    files = [
        f for f in os.listdir(input_dir)
        if os.path.isfile(os.path.join(input_dir, f))
    ]
    return sorted(folder_paths.filter_files_content_types(files, ["image"]))


def _load_image_tensor(image_name: str) -> torch.Tensor:
    """
    Load a single image from ComfyUI input directory and return as
    a float32 tensor in [1, H, W, 3] format, normalized 0.0–1.0.
    """
    image_path = folder_paths.get_annotated_filepath(image_name)
    img = node_helpers.pillow(Image.open, image_path)
    img = node_helpers.pillow(ImageOps.exif_transpose, img)

    if img.mode == "I":
        img = img.point(lambda px: px * (1 / 255))
    img = img.convert("RGB")

    img_np = np.array(img).astype(np.float32) / 255.0
    return torch.from_numpy(img_np).unsqueeze(0)  # [1, H, W, C]


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
            # common_upscale expects [B, C, H, W]
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
    # Determine active rows and columns
    active_rows = [r for r in range(3) if any(grid[r][c] is not None for c in range(3))]
    active_cols = [c for c in range(3) if any(grid[r][c] is not None for r in range(3))]

    if not active_rows or not active_cols:
        return torch.zeros((1, 64, 64, 3), dtype=torch.float32)

    # Collect all present tensors to determine uniform cell size
    all_tensors = [grid[r][c] for r in active_rows for c in active_cols if grid[r][c] is not None]
    if not all_tensors:
        return torch.zeros((1, 64, 64, 3), dtype=torch.float32)

    cell_h = max(t.shape[1] for t in all_tensors)
    cell_w = max(t.shape[2] for t in all_tensors)

    # Build each active row
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


class DuffyImageStitch(io.ComfyNode):
    """
    Upload up to 9 images, reorder them via drag-and-drop in a 3×3 grid,
    and stitch them into a single output image — horizontally or vertically.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        files = _get_image_files()
        options = ["none"] + files

        image_inputs = [
            io.Combo.Input(
                f"image_{i}",
                options=options,
                default="none",
                upload=io.UploadType.image,
                display_name=f"Image {i}",
                optional=True,
                tooltip=f"Image slot {i}",
            )
            for i in range(1, 10)
        ]

        return io.Schema(
            node_id="Duffy_ImageStitch",
            display_name="Duffy Image Stitch",
            category="Duffy/Image",
            description=(
                "Upload up to 9 images and stitch them together horizontally, "
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
        if orientation == "Layout":
            # Build a 3×3 grid preserving slot positions
            grid: list[list[torch.Tensor | None]] = [[None] * 3 for _ in range(3)]
            has_any = False
            for i in range(1, 10):
                name = kwargs.get(f"image_{i}", "none")
                if name and name != "none":
                    r, c = divmod(i - 1, 3)
                    grid[r][c] = _load_image_tensor(name)
                    has_any = True
            if not has_any:
                return io.NodeOutput(torch.zeros((1, 64, 64, 3), dtype=torch.float32))
            result = _stitch_layout(grid)
            return io.NodeOutput(result)

        # Horizontal / Vertical — collect images as flat list
        tensors: list[torch.Tensor] = []
        for i in range(1, 10):
            name = kwargs.get(f"image_{i}", "none")
            if name and name != "none":
                tensors.append(_load_image_tensor(name))

        if not tensors:
            placeholder = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return io.NodeOutput(placeholder)

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
        for i in range(1, 10):
            name = kwargs.get(f"image_{i}", "none")
            if name and name != "none":
                try:
                    image_path = folder_paths.get_annotated_filepath(name)
                    with open(image_path, "rb") as f:
                        m.update(f.read())
                except Exception:
                    m.update(name.encode())
        return m.digest().hex()

    @classmethod
    def validate_inputs(cls, **kwargs):
        for i in range(1, 10):
            name = kwargs.get(f"image_{i}", "none")
            if name and name != "none":
                if not folder_paths.exists_annotated_filepath(name):
                    return f"Invalid image file for slot {i}: {name}"
        return True
