import base64
import io as python_io
import json

import numpy as np
import torch
from comfy_api.latest import io
from PIL import Image

DEFAULT_WIDTH = 512
DEFAULT_HEIGHT = 512
DEFAULT_BG_COLOR = "#ffffff"


class DuffyPainterNode(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_PainterNode",
            display_name="Advanced Painter",
            category="Duffy/Image",
            description="Vue 3 + Fabric.js powered advanced painting node.",
            inputs=[
                io.String.Input("json_data", default="{}", socketless=True),
            ],
            outputs=[
                io.Image.Output("image", display_name="Image"),
                io.Mask.Output("mask", display_name="Mask"),
            ],
        )

    @classmethod
    def execute(cls, json_data: str, **kwargs) -> io.NodeOutput:
        width = DEFAULT_WIDTH
        height = DEFAULT_HEIGHT
        bg_color = DEFAULT_BG_COLOR

        try:
            data = json.loads(json_data)
            image_b64 = data.get("image")
            width = int(data.get("width", width))
            height = int(data.get("height", height))
            bg_color = str(data.get("bgColor", bg_color))
        except json.JSONDecodeError:
            image_b64 = None
        except (TypeError, ValueError):
            image_b64 = None
            width = DEFAULT_WIDTH
            height = DEFAULT_HEIGHT
            bg_color = DEFAULT_BG_COLOR

        width = max(64, min(4096, width))
        height = max(64, min(4096, height))

        if image_b64:
            if "," in image_b64:
                image_b64 = image_b64.split(",")[1]

            try:
                img_bytes = base64.b64decode(image_b64)
                img = Image.open(python_io.BytesIO(img_bytes)).convert("RGBA")
            except Exception:
                img = Image.new("RGBA", (width, height), bg_color)
        else:
            img = Image.new("RGBA", (width, height), bg_color)

        img_np = np.array(img).astype(np.float32) / 255.0
        img_tensor = torch.from_numpy(img_np).unsqueeze(0)

        rgb_output = img_tensor[:, :, :, :3]
        mask_output = 1.0 - img_tensor[:, :, :, 3]

        return io.NodeOutput(rgb_output, mask_output)
