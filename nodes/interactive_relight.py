import torch
import numpy as np
from comfy_api.latest import io
import server
from aiohttp import web
import threading
import uuid
import base64
import json
from PIL import Image
import io as py_io
import math

# Dictionary to hold thread synchronization objects
PENDING_RELIGHTS = {}

@server.PromptServer.instance.routes.post("/duffy/relight/continue")
async def interactive_relight_continue(request):
    try:
        data = await request.json()
        session_id = data.get("session_id")
        lights = data.get("lights", [])
        
        if session_id in PENDING_RELIGHTS:
            PENDING_RELIGHTS[session_id]["lights"] = lights
            PENDING_RELIGHTS[session_id]["event"].set()
            return web.json_response({"status": "success"})
        else:
            return web.json_response({"status": "error", "message": "Session not found"}, status=404)
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

class DuffyInteractiveRelight(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_InteractiveRelight",
            display_name="Interactive Relighting",
            category="Duffy/Image",
            description="Interactively add 2D artificial lights to an image during workflow execution.",
            inputs=[
                io.Image.Input("image", display_name="Image"),
                io.String.Input("saved_lights", default="[]", socketless=True),
                io.Boolean.Input("pause_execution", default=True, display_name="Pause for Interaction", socketless=True),
            ],
            outputs=[
                io.Image.Output("image", display_name="Image"),
            ],
        )

    @classmethod
    def execute(cls, image: torch.Tensor, saved_lights: str, pause_execution: bool, **kwargs) -> io.NodeOutput:
        lights = []
        try:
            lights = json.loads(saved_lights)
        except:
            lights = []

        if pause_execution:
            session_id = str(uuid.uuid4())
            
            # Encode first frame for preview
            img_tensor = image[0].clone().cpu().numpy()
            img_tensor = (img_tensor * 255).clip(0, 255).astype(np.uint8)
            pil_img = Image.fromarray(img_tensor)
            
            buffered = py_io.BytesIO()
            pil_img.save(buffered, format="JPEG", quality=85)
            img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            PENDING_RELIGHTS[session_id] = {
                "event": threading.Event(),
                "lights": lights
            }
            
            # Send message to frontend
            server.PromptServer.instance.send_sync("duffy-relight-pause", {
                "session_id": session_id,
                "image_b64": f"data:image/jpeg;base64,{img_b64}"
            })
            
            # Wait for user interaction
            PENDING_RELIGHTS[session_id]["event"].wait(timeout=600)  # 10 min timeout
            
            if session_id in PENDING_RELIGHTS:
                lights = PENDING_RELIGHTS[session_id].get("lights", [])
                del PENDING_RELIGHTS[session_id]

        # Apply PyTorch 2D lighting math to the batch
        B, H, W, C = image.shape
        device = image.device
        
        # Grid coordinates for distance/angle calculations
        y_grid, x_grid = torch.meshgrid(torch.linspace(0, 1, H, device=device), torch.linspace(0, 1, W, device=device), indexing='ij')
        
        total_light = torch.zeros_like(image)
        
        for light in lights:
            l_type = light.get("type", "point")
            color = light.get("color", {"r": 255, "g": 255, "b": 255})
            
            # Handle alpha channel if C > 3
            if C >= 3:
                color_list = [color["r"]/255.0, color["g"]/255.0, color["b"]/255.0]
                if C == 4:
                    color_list.append(1.0) # alpha channel for light
            else:
                gray = (color["r"]*0.299 + color["g"]*0.587 + color["b"]*0.114) / 255.0
                color_list = [gray]

            l_color = torch.tensor(color_list, device=device).view(1, 1, 1, C)
            intensity = float(light.get("intensity", 1.0))
            
            if l_type == "point":
                x = float(light.get("x", 0.5))
                y = float(light.get("y", 0.5))
                radius = float(light.get("radius", 0.5))
                
                # Calculate Euclidean distance from light center
                # Scale x to account for aspect ratio if desired, but we'll use normalized coords
                dist = torch.sqrt((x_grid - x)**2 + (y_grid - y)**2)
                
                # Simple linear falloff mask: 1.0 at center, 0.0 at radius
                mask = torch.clamp(1.0 - (dist / (radius + 1e-5)), 0.0, 1.0).unsqueeze(-1)
                
                # Apply light
                total_light += l_color * intensity * mask
                
            elif l_type == "directional":
                angle = float(light.get("angle", 0.0))  # degrees
                rad = math.radians(angle)
                
                # Direction vector
                dx = math.cos(rad)
                dy = math.sin(rad)
                
                # Project coordinates onto direction vector
                proj = x_grid * dx + y_grid * dy
                
                # Normalize projection to 0-1
                min_p = torch.min(proj)
                max_p = torch.max(proj)
                if max_p > min_p:
                    mask = ((proj - min_p) / (max_p - min_p)).unsqueeze(-1)
                else:
                    mask = torch.ones_like(proj).unsqueeze(-1)
                
                # Apply light
                total_light += l_color * intensity * mask
                
            elif l_type == "ambient":
                total_light += l_color * intensity

        # Additive blending and clamp
        out_image = torch.clamp(image + total_light, 0.0, 1.0)
        
        return io.NodeOutput(out_image)
