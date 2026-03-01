import hashlib
import math
import os

import comfy.utils
import folder_paths
import node_helpers
import numpy as np
import torch
from comfy_api.latest import io
from PIL import Image, ImageOps, ImageSequence

# Predefined aspect ratios as width/height floats
ASPECT_RATIOS = {
    "original": None,
    "1:1": 1.0,
    "4:3": 4.0 / 3.0,
    "3:2": 3.0 / 2.0,
    "16:9": 16.0 / 9.0,
    "21:9": 21.0 / 9.0,
    "3:4": 3.0 / 4.0,
    "2:3": 2.0 / 3.0,
    "9:16": 9.0 / 16.0,
    "9:21": 9.0 / 21.0,
}


def _center_crop_to_ratio(image_tensor: torch.Tensor, target_ar: float) -> torch.Tensor:
    """Center-crop image tensor [B, H, W, C] to match target aspect ratio."""
    _, h, w, _ = image_tensor.shape
    current_ar = w / h

    if current_ar > target_ar:
        # Image is wider than target — crop width
        new_w = int(round(h * target_ar))
        offset = (w - new_w) // 2
        return image_tensor[:, :, offset:offset + new_w, :]
    else:
        # Image is taller than target — crop height
        new_h = int(round(w / target_ar))
        offset = (h - new_h) // 2
        return image_tensor[:, offset:offset + new_h, :, :]


def _center_crop_mask(mask_tensor: torch.Tensor, target_ar: float, orig_w: int, orig_h: int) -> torch.Tensor:
    """Center-crop mask tensor [B, H, W] to match target aspect ratio."""
    _, mh, mw = mask_tensor.shape

    # Placeholder 64×64 mask — leave as-is, it will be resized later
    if mh == 64 and mw == 64 and (orig_h != 64 or orig_w != 64):
        return mask_tensor

    current_ar = mw / mh
    if abs(current_ar - target_ar) < 0.001:
        return mask_tensor

    if current_ar > target_ar:
        new_w = int(round(mh * target_ar))
        offset = (mw - new_w) // 2
        return mask_tensor[:, :, offset:offset + new_w]
    else:
        new_h = int(round(mw / target_ar))
        offset = (mh - new_h) // 2
        return mask_tensor[:, offset:offset + new_h, :]


def _aspect_ratio_string(w: int, h: int) -> str:
    """Return a human-readable aspect ratio like '16:9' or '1.78:1' for large ratios."""
    g = math.gcd(w, h)
    rw, rh = w // g, h // g
    if rw > 100 or rh > 100:
        return f"{w / h:.2f}:1"
    return f"{rw}:{rh}"


class DuffyLoadImageResize(io.ComfyNode):
    """
    Loads an image with upload support, exposes image metadata
    (filename, dimensions, aspect ratio, megapixels), and resizes to a
    target megapixel count with optional aspect ratio override.
    Dimensions are snapped to multiples of 8 for VAE compatibility.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        input_dir = folder_paths.get_input_directory()
        files = [
            f for f in os.listdir(input_dir)
            if os.path.isfile(os.path.join(input_dir, f))
        ]
        files = folder_paths.filter_files_content_types(files, ["image"])

        return io.Schema(
            node_id="Duffy_LoadImageResize",
            display_name="Load Image & Resize",
            category="Duffy/Image",
            description=(
                "Loads an image, exposes its properties (filename, dimensions, "
                "aspect ratio, megapixels), and resizes to a target megapixel "
                "count with optional aspect ratio override. When a non-original "
                "aspect ratio is selected the image is center-cropped first. "
                "All dimensions are snapped to multiples of 8."
            ),
            inputs=[
                io.Combo.Input(
                    "image",
                    options=sorted(files),
                    upload=io.UploadType.image,
                    display_name="Image",
                    tooltip="Select or upload an image",
                ),
                io.Float.Input(
                    "target_megapixels",
                    display_name="Target Megapixels",
                    default=1.0,
                    min=0.01,
                    max=16.0,
                    step=0.01,
                    tooltip="Target size in megapixels (e.g. 1.0 ≈ 1024×1024)",
                ),
                io.Combo.Input(
                    "aspect_ratio",
                    options=list(ASPECT_RATIOS.keys()),
                    display_name="Aspect Ratio",
                    default="original",
                    tooltip="Keep the original aspect ratio or pick a preset. "
                            "Non-original ratios center-crop the source first.",
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
                io.Mask.Output(
                    "mask",
                    display_name="Mask",
                    tooltip="Alpha-channel mask (inverted, black = opaque)",
                ),
                io.Int.Output(
                    "width",
                    display_name="Width",
                    tooltip="Width of the resized image",
                ),
                io.Int.Output(
                    "height",
                    display_name="Height",
                    tooltip="Height of the resized image",
                ),
                io.Int.Output(
                    "original_width",
                    display_name="Orig Width",
                    tooltip="Original image width before resize",
                ),
                io.Int.Output(
                    "original_height",
                    display_name="Orig Height",
                    tooltip="Original image height before resize",
                ),
                io.String.Output(
                    "filename",
                    display_name="Filename",
                    tooltip="Source image filename",
                ),
                io.Float.Output(
                    "megapixels",
                    display_name="Megapixels",
                    tooltip="Megapixel count of the resized image",
                ),
                io.String.Output(
                    "aspect_ratio_str",
                    display_name="Aspect Ratio",
                    tooltip="Aspect ratio of the resized image (e.g. '16:9')",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        image: str,
        target_megapixels: float,
        aspect_ratio: str,
        method: str,
    ) -> io.NodeOutput:
        # ── Load the image from disk ──────────────────────────────────
        image_path = folder_paths.get_annotated_filepath(image)
        img = node_helpers.pillow(Image.open, image_path)

        filename = os.path.basename(image_path)

        output_images: list[torch.Tensor] = []
        output_masks: list[torch.Tensor] = []
        orig_w: int = 0
        orig_h: int = 0

        for frame in ImageSequence.Iterator(img):
            frame = node_helpers.pillow(ImageOps.exif_transpose, frame)

            if frame.mode == "I":
                frame = frame.point(lambda px: px * (1 / 255))
            rgb = frame.convert("RGB")

            if not output_images:
                orig_w, orig_h = rgb.size

            # Skip frames that don't match the first frame's dimensions
            if rgb.size[0] != orig_w or rgb.size[1] != orig_h:
                continue

            img_np = np.array(rgb).astype(np.float32) / 255.0
            img_tensor = torch.from_numpy(img_np)[None,]

            # Extract alpha mask
            if "A" in frame.getbands():
                mask_np = np.array(frame.getchannel("A")).astype(np.float32) / 255.0
                mask = 1.0 - torch.from_numpy(mask_np)
            elif frame.mode == "P" and "transparency" in frame.info:
                mask_np = (
                    np.array(frame.convert("RGBA").getchannel("A")).astype(np.float32) / 255.0
                )
                mask = 1.0 - torch.from_numpy(mask_np)
            else:
                mask = torch.zeros((64, 64), dtype=torch.float32, device="cpu")

            output_images.append(img_tensor)
            output_masks.append(mask.unsqueeze(0))

            if img.format == "MPO":
                break

        loaded_image = (
            torch.cat(output_images, dim=0) if len(output_images) > 1 else output_images[0]
        )
        loaded_mask = (
            torch.cat(output_masks, dim=0) if len(output_masks) > 1 else output_masks[0]
        )

        # ── Aspect-ratio handling ─────────────────────────────────────
        if aspect_ratio == "original":
            target_ar = orig_w / orig_h
        else:
            target_ar = ASPECT_RATIOS[aspect_ratio]
            current_ar = orig_w / orig_h
            # Center-crop to the chosen aspect ratio when it differs
            if abs(current_ar - target_ar) > 0.001:
                loaded_image = _center_crop_to_ratio(loaded_image, target_ar)
                loaded_mask = _center_crop_mask(loaded_mask, target_ar, orig_w, orig_h)

        # ── Megapixel resize ──────────────────────────────────────────
        target_pixels = target_megapixels * 1_000_000
        new_h_f = math.sqrt(target_pixels / target_ar)
        new_w_f = new_h_f * target_ar

        new_w = max(int(round(new_w_f / 8.0) * 8), 8)
        new_h = max(int(round(new_h_f / 8.0) * 8), 8)

        # Resize image  [B, H, W, C] → [B, C, H, W]
        img_bchw = loaded_image.movedim(-1, 1)
        resized = comfy.utils.common_upscale(img_bchw, new_w, new_h, method, crop="disabled")
        result_image = resized.movedim(1, -1)

        # Resize mask to match output dimensions
        if loaded_mask.shape[-2:] != (new_h, new_w):
            mask_4d = loaded_mask.unsqueeze(1)  # [B, 1, H, W]
            mask_resized = comfy.utils.common_upscale(mask_4d, new_w, new_h, method, crop="disabled")
            result_mask = mask_resized.squeeze(1)
        else:
            result_mask = loaded_mask

        # ── Compute metadata ──────────────────────────────────────────
        megapixels = round((new_w * new_h) / 1_000_000, 4)
        ar_str = _aspect_ratio_string(new_w, new_h)

        return io.NodeOutput(
            result_image,
            result_mask,
            new_w,
            new_h,
            orig_w,
            orig_h,
            filename,
            megapixels,
            ar_str,
        )

    @classmethod
    def fingerprint_inputs(cls, image, **kwargs):
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, "rb") as f:
            m.update(f.read())
        return m.digest().hex()

    @classmethod
    def validate_inputs(cls, image, **kwargs):
        if not folder_paths.exists_annotated_filepath(image):
            return "Invalid image file: {}".format(image)
        return True
