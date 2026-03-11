import base64
import io as py_io
import json
import threading
import uuid

import numpy as np
import server
import torch
from aiohttp import web
from comfy_api.latest import io, ui
from PIL import Image

# Dictionary to hold thread synchronization objects
PENDING_ADJUSTMENTS = {}

# Wrap route registration to avoid potential issues if PromptServer.instance is None at import time
try:
    @server.PromptServer.instance.routes.post("/duffy/adjust/continue")
    async def advanced_image_adjust_continue(request):
        try:
            data = await request.json()
            session_id = data.get("session_id")
            adjustments = data.get("adjustments", {})
            
            if session_id in PENDING_ADJUSTMENTS:
                PENDING_ADJUSTMENTS[session_id]["adjustments"] = adjustments
                PENDING_ADJUSTMENTS[session_id]["event"].set()
                return web.json_response({"status": "success"})
            else:
                return web.json_response({"status": "error", "message": "Session not found"}, status=404)
        except Exception as e:
            return web.json_response({"status": "error", "message": str(e)}, status=500)
except Exception:
    # Fallback or log if PromptServer is not yet initialized
    pass

class DuffyAdvancedImageAdjuster(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_AdvancedImageAdjuster",
            display_name="Advanced Image Adjuster",
            category="Duffy/Image",
            description="Interactively adjust image brightness, contrast, saturation, and hue with a live preview.",
            inputs=[
                io.Image.Input("image", display_name="Image"),
                io.String.Input("saved_adjustments", default='{"brightness": 1.0, "contrast": 1.0, "saturation": 1.0, "hue": 0.0}', socketless=True),
                io.Boolean.Input("pause_execution", default=True, display_name="Pause for Interaction", socketless=True),
            ],
            outputs=[
                io.Image.Output("image", display_name="Image"),
            ],
        )

    @classmethod
    def execute(cls, image: torch.Tensor, saved_adjustments: str, pause_execution: bool, **kwargs) -> io.NodeOutput:
        try:
            adjustments = json.loads(saved_adjustments)
        except Exception:
            adjustments = {"brightness": 1.0, "contrast": 1.0, "saturation": 1.0, "hue": 0.0}

        if pause_execution:
            session_id = str(uuid.uuid4())
            
            # Encode first frame for preview
            img_tensor = image[0].clone().cpu().numpy()
            img_tensor = (img_tensor * 255).clip(0, 255).astype(np.uint8)
            pil_img = Image.fromarray(img_tensor)
            
            buffered = py_io.BytesIO()
            pil_img.save(buffered, format="JPEG", quality=85)
            img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            PENDING_ADJUSTMENTS[session_id] = {
                "event": threading.Event(),
                "adjustments": adjustments
            }
            
            # Send message to frontend
            server.PromptServer.instance.send_sync("duffy-adjust-pause", {
                "session_id": session_id,
                "image_b64": f"data:image/jpeg;base64,{img_b64}"
            })
            
            # Wait for user interaction
            # Use a slightly more robust waiting mechanism
            success = PENDING_ADJUSTMENTS[session_id]["event"].wait(timeout=600)  # 10 min timeout
            
            if session_id in PENDING_ADJUSTMENTS:
                if success:
                    adjustments = PENDING_ADJUSTMENTS[session_id].get("adjustments", adjustments)
                del PENDING_ADJUSTMENTS[session_id]

        brightness = float(adjustments.get("brightness", 1.0))
        contrast = float(adjustments.get("contrast", 1.0))
        saturation = float(adjustments.get("saturation", 1.0))
        hue = float(adjustments.get("hue", 0.0))

        # Apply adjustments using native PyTorch to avoid torchvision dependency
        # image is [B, H, W, C]
        
        # 1. Brightness
        if brightness != 1.0:
            image = image * brightness

        # 2. Contrast
        if contrast != 1.0:
            image = (image - 0.5) * contrast + 0.5

        # 3. Saturation
        if saturation != 1.0:
            # Grayscale using Rec. 709 coefficients
            # image is [B, H, W, 3] usually. Handle arbitrary channels by averaging if not 3.
            if image.shape[-1] == 3:
                grayscale = 0.2989 * image[..., 0] + 0.5870 * image[..., 1] + 0.1140 * image[..., 2]
                grayscale = grayscale.unsqueeze(-1).repeat(1, 1, 1, 3)
            else:
                grayscale = image.mean(dim=-1, keepdim=True).repeat(1, 1, 1, image.shape[-1])
            
            image = torch.lerp(grayscale, image, saturation)

        # 4. Hue (Approximation via rotation in YIQ or similar is complex in pure torch, 
        # but for small adjustments we can use a simpler approach or skip if hue is 0)
        if hue != 0.0:
            # Hue rotation is complex without torchvision. 
            # If torchvision is absolutely needed for Hue, we could try to import it locally.
            try:
                import torchvision.transforms.functional as TF

                # Permute to [B, C, H, W] for torchvision
                image = image.permute(0, 3, 1, 2)
                image = TF.adjust_hue(image, hue)
                image = image.permute(0, 2, 3, 1)
            except ImportError:
                # If torchvision is missing, we just skip hue adjustment
                pass

        # Clamp to valid [0.0, 1.0] range
        image = torch.clamp(image, 0.0, 1.0)

        return io.NodeOutput(image, ui=ui.PreviewImage(image, cls=cls))
