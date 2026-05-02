import os
import random
import torch
import numpy as np
from PIL import Image
import folder_paths
from comfy_api.latest import io

class DuffyImageCompare(io.ComfyNode):
    """Interactively compare two images with a vertical slider."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_ImageCompare",
            display_name="Image Compare",
            category="Duffy/Image",
            description="Interactively compare two images with a vertical or horizontal slider.",
            is_output_node=True,
            inputs=[
                io.String.Input("compare_state", default="{}", socketless=True),
                io.Image.Input("image_a", display_name="image_a", tooltip="Left/Top image"),
                io.Image.Input("image_b", display_name="image_b", tooltip="Right/Bottom image"),
            ],
            outputs=[],
        )

    @classmethod
    def execute(cls, image_a: torch.Tensor, image_b: torch.Tensor, compare_state: str = "{}", **kwargs) -> io.NodeOutput:
        temp_dir = folder_paths.get_temp_directory()
        rand_prefix = f"compare_{random.randint(0, 999999)}"

        def save_tensor(tensor, name):
            img_tensor = tensor[0] # Take first image in batch
            img_np = (img_tensor.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np)
            filename = f"{rand_prefix}_{name}.png"
            path = os.path.join(temp_dir, filename)
            pil_img.save(path, compress_level=1)
            return {"filename": filename, "subfolder": "", "type": "temp"}

        img_a_info = save_tensor(image_a, "A")
        img_b_info = save_tensor(image_b, "B")

        # Use custom UI key 'compare_images' to avoid triggering standard gallery
        return io.NodeOutput(ui={"compare_images": [img_a_info, img_b_info]})
