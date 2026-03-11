import base64
import io as py_io
import json
import os
import platform
import threading
import uuid
from pathlib import Path

import numpy as np
import server
import torch
from aiohttp import web
from comfy_api.latest import io, ui
from PIL import Image, ImageDraw, ImageFont

# Base fonts directory for custom fonts
FONTS_DIR = Path(__file__).parent.parent / "fonts"

def get_available_fonts() -> list[str]:
    """Retrieve standard cross-platform fonts and any custom fonts in the fonts folder."""
    fonts = ["Arial", "Courier New", "Times New Roman", "Impact", "Comic Sans MS", "Trebuchet MS"]
    try:
        if FONTS_DIR.exists() and FONTS_DIR.is_dir():
            for f in FONTS_DIR.iterdir():
                if f.suffix.lower() in [".ttf", ".otf", ".ttc"]:
                    fonts.append(f.name)
    except Exception:
        pass
    return sorted(list(set(fonts)))

def resolve_font_path(font_name: str) -> str:
    """Robustly resolve font name to a full file path for Windows, Mac, and custom fonts."""
    # 1. Check custom fonts directory first
    try:
        if FONTS_DIR.exists() and FONTS_DIR.is_dir():
            # Try exact name
            p = FONTS_DIR / font_name
            if p.is_file():
                return str(p)
            # Try appending .ttf if missing
            if not font_name.lower().endswith(('.ttf', '.otf', '.ttc')):
                p_ttf = FONTS_DIR / (font_name + ".ttf")
                if p_ttf.is_file():
                    return str(p_ttf)
    except Exception:
        pass

    # 2. System Font Resolution
    sys_type = platform.system()
    
    if sys_type == "Windows":
        fonts_dir = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")
        # Common Windows font display names to filenames
        win_map = {
            "Arial": "arial.ttf",
            "Courier New": "cour.ttf",
            "Times New Roman": "times.ttf",
            "Impact": "impact.ttf",
            "Comic Sans MS": "comic.ttf",
            "Trebuchet MS": "trebuc.ttf"
        }
        fname = win_map.get(font_name, font_name)
        if not fname.lower().endswith(('.ttf', '.otf', '.ttc')):
            fname += ".ttf"
        
        full_path = os.path.join(fonts_dir, fname)
        if os.path.exists(full_path):
            return full_path

    elif sys_type == "Darwin":  # macOS
        mac_dirs = ["/System/Library/Fonts", "/Library/Fonts", os.path.expanduser("~/Library/Fonts")]
        for d in mac_dirs:
            if not os.path.isdir(d):
                continue
            # Mac fonts often use the display name as filename
            base_path = os.path.join(d, font_name)
            if os.path.exists(base_path):
                return base_path
            for ext in [".ttf", ".otf", ".ttc"]:
                if os.path.exists(base_path + ext):
                    return base_path + ext
    
    # 3. Last resort: Return as-is and hope ImageFont.truetype can find it
    return font_name

# Dictionary to hold thread synchronization objects
PENDING_TEXT_OVERLAYS = {}

try:
    @server.PromptServer.instance.routes.post("/duffy/text_overlay/continue")
    async def advanced_text_overlay_continue(request):
        try:
            data = await request.json()
            session_id = data.get("session_id")
            overlays = data.get("overlays", [])
            
            if session_id in PENDING_TEXT_OVERLAYS:
                PENDING_TEXT_OVERLAYS[session_id]["overlays"] = overlays
                PENDING_TEXT_OVERLAYS[session_id]["event"].set()
                return web.json_response({"status": "success"})
            else:
                return web.json_response({"status": "error", "message": "Session not found"}, status=404)
        except Exception as e:
            return web.json_response({"status": "error", "message": str(e)}, status=500)

    @server.PromptServer.instance.routes.get("/duffy/fonts/{name}")
    async def get_font(request):
        try:
            name = request.match_info['name']
            font_path = FONTS_DIR / name
            if font_path.exists() and font_path.is_file():
                return web.FileResponse(font_path)
            
            # Also check system fonts if requested by name (though usually browser handles these)
            # This is primarily for our custom fonts in the fonts/ directory
            return web.Response(status=404)
        except Exception:
            return web.Response(status=500)
except Exception:
    pass

class DuffyAdvancedTextOverlay(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_AdvancedTextOverlay",
            display_name="Advanced Text Overlay",
            category="Duffy/Image",
            description="Interactively add and arrange multiple text layers on an image.",
            inputs=[
                io.Image.Input("image", display_name="Image"),
                io.String.Input("saved_overlays", default="[]", socketless=True),
                io.Boolean.Input("pause_execution", default=True, display_name="Pause for Interaction", socketless=True),
            ],
            outputs=[
                io.Image.Output("image", display_name="Image"),
            ],
        )

    @classmethod
    def execute(cls, image: torch.Tensor, saved_overlays: str, pause_execution: bool, **kwargs) -> io.NodeOutput:
        try:
            overlays = json.loads(saved_overlays)
        except Exception:
            overlays = []

        if pause_execution:
            session_id = str(uuid.uuid4())
            
            # Encode first frame for preview
            img_tensor = image[0].clone().cpu().numpy()
            img_tensor = (img_tensor * 255).clip(0, 255).astype(np.uint8)
            pil_img = Image.fromarray(img_tensor)
            
            buffered = py_io.BytesIO()
            pil_img.save(buffered, format="JPEG", quality=85)
            img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            PENDING_TEXT_OVERLAYS[session_id] = {
                "event": threading.Event(),
                "overlays": overlays
            }
            
            # Send message to frontend, we must send available fonts too
            server.PromptServer.instance.send_sync("duffy-text-overlay-pause", {
                "session_id": session_id,
                "image_b64": f"data:image/jpeg;base64,{img_b64}",
                "fonts": get_available_fonts()
            })
            
            # Wait for user interaction
            success = PENDING_TEXT_OVERLAYS[session_id]["event"].wait(timeout=600)  # 10 min timeout
            
            if session_id in PENDING_TEXT_OVERLAYS:
                if success:
                    overlays = PENDING_TEXT_OVERLAYS[session_id].get("overlays", overlays)
                del PENDING_TEXT_OVERLAYS[session_id]

        output_images = []
        # Process each image in batch (B, H, W, C)
        for img in image:
            # Un-normalize from 0.0-1.0 to 0-255. img is [H, W, C]
            img_np = (img.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
            
            # Create PIL image
            pil_img = Image.fromarray(img_np, mode="RGB")
            draw = ImageDraw.Draw(pil_img)
            
            img_width, img_height = pil_img.size

            for layer in overlays:
                text = layer.get("text", "")
                if not text:
                    continue
                
                font_name = layer.get("font", "Arial")
                font_size = int(layer.get("size", 64))
                font_color = layer.get("hexColor", "#FFFFFF")
                pos_x = float(layer.get("x", 0.5))
                pos_y = float(layer.get("y", 0.5))

                # Normalize pos back to pixels
                pixel_x = int(pos_x * img_width)
                pixel_y = int(pos_y * img_height)

                # Resolve font
                font_path = resolve_font_path(font_name)
                
                try:
                    font = ImageFont.truetype(font_path, font_size)
                except OSError:
                    try:
                        if platform.system() == "Windows":
                            font = ImageFont.truetype("arial.ttf", font_size)
                        else:
                            font = ImageFont.load_default()
                    except OSError:
                        font = ImageFont.load_default()

                if not font_color.startswith('#'):
                    font_color = '#' + font_color
                try:
                    int(font_color[1:], 16)
                except ValueError:
                    font_color = "#FFFFFF"

                draw.text((pixel_x, pixel_y), text, fill=font_color, font=font)
            
            # Convert back to numpy, normalize, and convert to tensor
            out_np = np.array(pil_img).astype(np.float32) / 255.0
            out_tensor = torch.from_numpy(out_np) # [H, W, C]
            output_images.append(out_tensor)

        batch_out = torch.stack(output_images)
        return io.NodeOutput(batch_out, ui=ui.PreviewImage(batch_out, cls=cls))
