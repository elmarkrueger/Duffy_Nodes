import math

import comfy.utils
import torch
from comfy_api.latest import io


class DuffyMegapixelResize(io.ComfyNode):
    """
    Resizes images to a target megapixel count while preserving aspect ratio.
    Output dimensions are rounded to the nearest multiple of 8 for VAE compatibility.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_MegapixelResize",
            display_name="Megapixel Resize",
            category="Duffy/Image",
            description=(
                "Resizes an image to a target megapixel count while maintaining aspect ratio. "
                "Dimensions are snapped to multiples of 8 for clean VAE encoding."
            ),
            inputs=[
                io.Image.Input(
                    "image",
                    display_name="Image",
                    tooltip="The input image batch",
                ),
                io.Float.Input(
                    "target_megapixels",
                    display_name="Target Megapixels",
                    default=1.0,
                    min=0.1,
                    max=4.0,
                    step=0.01,
                    tooltip="Target size in megapixels (e.g. 1.0 ≈ 1024×1024)",
                ),
                io.Combo.Input(
                    "method",
                    options=["lanczos", "bicubic", "bilinear", "nearest-exact", "area"],
                    display_name="Resample Method",
                    default="lanczos",
                    tooltip="Interpolation algorithm used for resizing",
                ),
            ],
            outputs=[
                io.Image.Output(
                    "image",
                    display_name="Image",
                    tooltip="The resized image",
                ),
                io.Int.Output(
                    "width",
                    display_name="Width",
                    tooltip="Width of the resized image in pixels",
                ),
                io.Int.Output(
                    "height",
                    display_name="Height",
                    tooltip="Height of the resized image in pixels",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        image: torch.Tensor,
        target_megapixels: float,
        method: str,
    ) -> io.NodeOutput:
        # Image tensor is [B, H, W, C]
        _, current_h, current_w, _ = image.shape

        aspect_ratio = current_w / current_h
        target_pixel_count = target_megapixels * 1_000_000

        # Derive new dimensions preserving aspect ratio
        new_h_float = math.sqrt(target_pixel_count / aspect_ratio)
        new_w_float = new_h_float * aspect_ratio

        # Snap to nearest multiple of 8
        new_w = max(int(round(new_w_float / 8.0) * 8), 8)
        new_h = max(int(round(new_h_float / 8.0) * 8), 8)

        # comfy.utils.common_upscale expects [B, C, H, W]
        image_bchw = image.movedim(-1, 1)
        resized_bchw = comfy.utils.common_upscale(image_bchw, new_w, new_h, method, crop="disabled")
        result_image = resized_bchw.movedim(1, -1)

        return io.NodeOutput(result_image, new_w, new_h)
