import os
import platform
from pathlib import Path

import numpy as np
import torch
from comfy_api.latest import io
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

class DuffyImageTextOverlay(io.ComfyNode):
    """A Node 2.0 V3 stateless node to overlay text onto an image."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_ImageTextOverlay",
            display_name="Image Text Overlay",
            category="Duffy/Image",
            description="Overlays text onto an image with custom font, size, and color.",
            inputs=[
                io.Image.Input("image", display_name="Image", tooltip="Input image batch [B, H, W, C]"),
                io.String.Input("text", display_name="Text", multiline=True, default="Overlay Text"),
                io.String.Input("font_color", display_name="Font Color", default="#FFFFFF"),
                io.Int.Input("font_size", display_name="Font Size", default=64, min=8, max=1024, display_mode=io.NumberDisplay.slider),
                io.Combo.Input("font_name", display_name="Font Name", options=get_available_fonts(), default="Arial"),
                io.Int.Input("position_x", display_name="Position X", default=50, min=0, max=8192, display_mode=io.NumberDisplay.slider),
                io.Int.Input("position_y", display_name="Position Y", default=50, min=0, max=8192, display_mode=io.NumberDisplay.slider),
            ],
            outputs=[
                io.Image.Output("image", display_name="Image", tooltip="Resulting image with text overlay")
            ],
        )

    @classmethod
    def execute(cls, image: torch.Tensor, text: str, font_color: str, font_size: int, font_name: str, position_x: int, position_y: int, **kwargs) -> io.NodeOutput:
        # Resolve font to a full path
        font_path = resolve_font_path(font_name)
        
        try:
            # Load the font. truetype handles full paths correctly.
            font = ImageFont.truetype(font_path, font_size)
        except OSError:
            # If resolution fails, PIL fallback to default (tiny, non-resizable)
            # but let's try one more thing: Arial if on Windows
            try:
                if platform.system() == "Windows":
                    font = ImageFont.truetype("arial.ttf", font_size)
                else:
                    font = ImageFont.load_default()
            except OSError:
                font = ImageFont.load_default()

        # Parse hex color safely
        if not font_color.startswith('#'):
            font_color = '#' + font_color
        try:
            int(font_color[1:], 16)
        except ValueError:
            font_color = "#FFFFFF"

        output_images = []
        # Process each image in batch (B, H, W, C)
        for img in image:
            # Un-normalize from 0.0-1.0 to 0-255. img is [H, W, C]
            img_np = (img.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
            
            # Create PIL image
            pil_img = Image.fromarray(img_np, mode="RGB")
            draw = ImageDraw.Draw(pil_img)
            
            # Draw text
            draw.text((position_x, position_y), text, fill=font_color, font=font)
            
            # Convert back to numpy, normalize, and convert to tensor
            out_np = np.array(pil_img).astype(np.float32) / 255.0
            out_tensor = torch.from_numpy(out_np) # [H, W, C]
            output_images.append(out_tensor)

        # Re-stack into batch (B, H, W, C)
        batch_out = torch.stack(output_images)
        return io.NodeOutput(batch_out)
