import os
import random
import torch
import numpy as np
from PIL import Image
import folder_paths
from comfy_api.latest import io

class DuffyImagePreview(io.ComfyNode):
    """Simple image preview node."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_ImagePreview",
            display_name="Image Preview",
            category="Duffy/Image",
            description="Preview an image natively within the node.",
            is_output_node=True,
            inputs=[
                io.Image.Input("image", display_name="Image"),
            ],
            outputs=[],
        )

    @classmethod
    def execute(cls, image: torch.Tensor, **kwargs) -> io.NodeOutput:
        temp_dir = folder_paths.get_temp_directory()
        rand_prefix = f"preview_{random.randint(0, 99999999)}"
        
        images_info = []
        for i, img_tensor in enumerate(image):
            # ComfyUI image tensors are [H, W, C], float32 in [0.0, 1.0]
            # When processing batches, image is [B, H, W, C]
            img_np = (img_tensor.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np)
            filename = f"{rand_prefix}_{i}.png"
            path = os.path.join(temp_dir, filename)
            pil_img.save(path, compress_level=1)
            images_info.append({"filename": filename, "subfolder": "", "type": "temp"})

        return io.NodeOutput(ui={"images": images_info})
