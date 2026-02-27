import hashlib
import os

import folder_paths
import numpy as np
import torch
from comfy_api.latest import io, ui
from PIL import Image, ImageOps


class DuffyDirectoryImageIterator(io.ComfyNode):
    """
    Loads a sorted slice of images from a directory and forwards them one-by-one
    to downstream nodes via ComfyUI's list-iteration paradigm.
    Supports mixed resolutions, displays thumbnail previews, and invalidates
    the execution cache only when the target directory slice changes.
    """

    VALID_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".tiff")

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_DirectoryImageIterator",
            display_name="Directory Image Iterator",
            category="Duffy/Image",
            description=(
                "Loads images from a directory in sorted order and emits them as a list. "
                "Supports start index and limit controls. Cache is invalidated only when "
                "the file slice actually changes."
            ),
            inputs=[
                io.String.Input(
                    "folder_path",
                    display_name="Folder Path",
                    default="",
                    multiline=False,
                    tooltip="Absolute path to the image directory",
                ),
                io.Int.Input(
                    "start_index",
                    display_name="Start Index",
                    default=0,
                    min=0,
                    max=100000,
                    step=1,
                    tooltip="Zero-based index of the first image to load",
                ),
                io.Int.Input(
                    "image_limit",
                    display_name="Image Limit",
                    default=0,
                    min=0,
                    max=100000,
                    step=1,
                    tooltip="Maximum number of images to load (0 = all)",
                ),
            ],
            outputs=[
                io.Image.Output(
                    "image",
                    display_name="Image",
                    tooltip="Loaded image tensors (one per file)",
                    is_output_list=True,
                ),
                io.String.Output(
                    "filename",
                    display_name="Filename",
                    tooltip="Original filename of each loaded image",
                    is_output_list=True,
                ),
            ],
        )

    @classmethod
    def _get_target_files(cls, folder_path: str, start_index: int, image_limit: int) -> list[str]:
        """Returns the deterministically sorted slice of valid image filenames."""
        files = sorted(
            f for f in os.listdir(folder_path)
            if f.lower().endswith(cls.VALID_EXTENSIONS)
        )
        end_idx = start_index + image_limit if image_limit > 0 else len(files)
        return files[start_index:end_idx]

    @classmethod
    def fingerprint_inputs(cls, folder_path: str, start_index: int, image_limit: int) -> str:
        """
        Cryptographic hash of the target slice — re-executes only when the
        selected files or their modification times change.
        """
        folder_path = os.path.realpath(os.path.abspath(folder_path))
        if not os.path.isdir(folder_path):
            return "invalid_directory"

        m = hashlib.sha256()
        for filename in cls._get_target_files(folder_path, start_index, image_limit):
            file_path = os.path.join(folder_path, filename)
            m.update(filename.encode("utf-8"))
            m.update(str(os.path.getmtime(file_path)).encode("utf-8"))
        return m.hexdigest()

    @classmethod
    def execute(
        cls,
        folder_path: str,
        start_index: int,
        image_limit: int,
    ) -> io.NodeOutput:
        folder_path = os.path.realpath(os.path.abspath(folder_path))
        if not os.path.isdir(folder_path):
            raise ValueError(f"Directory does not exist: {folder_path}")

        target_files = cls._get_target_files(folder_path, start_index, image_limit)
        if not target_files:
            raise ValueError("No valid images found in the specified range.")

        out_images: list[torch.Tensor] = []
        out_filenames: list[str] = []

        for filename in target_files:
            img_path = os.path.join(folder_path, filename)
            img = Image.open(img_path)
            img = ImageOps.exif_transpose(img)
            if img.mode != "RGB":
                img = img.convert("RGB")

            img_array = np.array(img).astype(np.float32) / 255.0
            out_images.append(torch.from_numpy(img_array).unsqueeze(0))
            out_filenames.append(filename)

        return io.NodeOutput(out_images, out_filenames)
