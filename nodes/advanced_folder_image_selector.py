"""
Advanced Folder Image Selector Node (V3 Schema)
Allows users to browse a directory, view thumbnails, and select up to 5 images for output.
"""

import asyncio
import base64
import json
import os
from io import BytesIO

import numpy as np
import torch
from aiohttp import web
from comfy_api.latest import io
from PIL import Image, ImageOps

# ComfyUI core components - wrapped in try-except for import safety
try:
    from server import PromptServer
    _SERVER_AVAILABLE = True
except ImportError:
    _SERVER_AVAILABLE = False
    PromptServer = None

# ============================================================================
# ASYNCHRONOUS API ENDPOINT FOR THUMBNAIL GENERATION
# ============================================================================

def process_directory_sync(folder_path):
    """
    Synchronously processes a directory to generate thumbnails.
    This function is designed to run in a background thread to avoid blocking.
    """
    valid_extensions = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}
    thumbnails = []

    # Security validation: check if path exists and is a directory
    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        return {"error": "The specified directory does not exist or is invalid."}

    try:
        files = os.listdir(folder_path)
    except PermissionError:
        return {"error": "Security violation: No permission to read the directory."}
    except Exception as e:
        return {"error": f"Error reading directory: {str(e)}"}

    # Process each file in the directory
    for filename in files:
        _, ext = os.path.splitext(filename)
        if ext.lower() in valid_extensions:
            full_path = os.path.join(folder_path, filename)
            try:
                stat = os.stat(full_path)
                creation_time = stat.st_ctime

                # Generate thumbnail
                with Image.open(full_path) as img:
                    # Handle EXIF orientation
                    img = ImageOps.exif_transpose(img)
                    img.thumbnail((256, 256), Image.Resampling.LANCZOS)

                    # Convert to RGB for consistent encoding
                    if img.mode in ("RGBA", "P", "LA"):
                        img = img.convert("RGB")

                    # Encode to base64
                    buffered = BytesIO()
                    img.save(buffered, format="JPEG", quality=75)
                    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

                    thumbnails.append({
                        "filename": filename,
                        "path": full_path,
                        "created": creation_time,
                        "base64": f"data:image/jpeg;base64,{img_str}"
                    })
            except Exception as e:
                # Skip files that can't be processed
                print(f"Warning: Could not process {filename}: {e}")
                continue

    return {"thumbnails": thumbnails}


# Register the API endpoint if server is available
if _SERVER_AVAILABLE and PromptServer is not None:
    # Wrap in a try-except to prevent startup crashes if instance is None
    try:
        # Define the handler function without decorator (to avoid import-time errors)
        async def fetch_thumbnails_api(request):
            """
            Async HTTP endpoint for thumbnail generation.
            """
            data = await request.json()
            folder_path = data.get("folder_path", "")

            # Run the blocking I/O operation in a background thread
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, process_directory_sync, folder_path)

            if "error" in result:
                return web.json_response(result, status=400)

            return web.json_response(result)
        
        # Manually register the route (avoids decorator evaluation at import time)
        if PromptServer.instance is not None and hasattr(PromptServer.instance, 'routes'):
            PromptServer.instance.routes.post("/advanced_selector/refresh_folder")(fetch_thumbnails_api)
    except Exception as e:
        print(f"Warning: Could not register API route or PromptServer not ready. {e}")


# ============================================================================
# V3 CUSTOM NODE DEFINITION
# ============================================================================

class DuffyAdvancedFolderImageSelector(io.ComfyNode):
    """
    Advanced Folder Image Selector - Browse, paginate, and select up to 5 images from a directory.
    
    Features:
    - Directory browsing with thumbnail preview
    - Pagination and sorting (by name or date)
    - Selection of up to 5 images
    - Five discrete image tensor outputs
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="DuffyAdvancedFolderImageSelector",
            display_name="Duffy Advanced Folder Image Selector",
            category="Duffy/Image",
            inputs=[
                io.String.Input(
                    "folder_path",
                    default="",
                    multiline=False,
                ),
                io.String.Input(
                    "selected_images_state",
                    default="[]",
                    multiline=False,
                ),
            ],
            outputs=[
                io.Image.Output("image_1"),
                io.Image.Output("image_2"),
                io.Image.Output("image_3"),
                io.Image.Output("image_4"),
                io.Image.Output("image_5"),
                io.Image.Output("image_6"),
                io.Image.Output("image_7"),
                io.Image.Output("image_8"),
                io.Image.Output("image_9"),
                io.Image.Output("image_10"),
            ],
        )

    @classmethod
    def execute(
        cls,
        folder_path: str,
        selected_images_state: str,
        **kwargs
    ) -> io.NodeOutput:
        """
        Loads the selected images and returns them as five separate tensor outputs.
        If fewer than 5 images are selected, empty tensors are returned for the remaining outputs.
        """
        # Deserialize the selected image paths
        try:
            selected_paths = json.loads(selected_images_state)
            if not isinstance(selected_paths, list):
                selected_paths = []
        except (json.JSONDecodeError, TypeError):
            selected_paths = []

        output_tensors = []

        # Process up to 10 images
        for i in range(10):
            if i < len(selected_paths) and os.path.isfile(selected_paths[i]):
                try:
                    # Load the image
                    img = Image.open(selected_paths[i])
                    img = ImageOps.exif_transpose(img)
                    img = img.convert("RGB")

                    # Convert to tensor: [B, H, W, C] format expected by ComfyUI IMAGE type
                    img_np = np.array(img).astype(np.float32) / 255.0
                    tensor = torch.from_numpy(img_np).unsqueeze(0)
                    output_tensors.append(tensor)
                except Exception as e:
                    print(f"Error loading image {selected_paths[i]}: {e}")
                    # Create an empty fallback tensor
                    empty_tensor = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                    output_tensors.append(empty_tensor)
            else:
                # No image selected for this slot - return empty tensor
                empty_tensor = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                output_tensors.append(empty_tensor)

        return io.NodeOutput(*output_tensors)
