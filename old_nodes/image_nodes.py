# ComfyUI - Image Processing Nodes - Elmar Krüger - 2025
import hashlib
import json
import math
import os

import comfy.utils
import folder_paths
import numpy as np
import torch
from PIL import Image, ImageOps

try:
    from server import PromptServer
except ImportError:
    PromptServer = None
from PIL.PngImagePlugin import PngInfo


class RGBA_to_RGB_Lossless:
    """
    Eine spezialisierte ComfyUI Custom Node zur verlustfreien Konvertierung
    von RGBA-Bilddaten (4 Kanäle) in das RGB-Format (3 Kanäle).
    Diese Node entfernt den Alpha-Kanal durch Tensor-Slicing, ohne die
    Farbwerte neu zu berechnen oder zu komprimieren.
    """

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        """
        Definiert die Schnittstelle zum ComfyUI Frontend.
        Erwartet wird ein Bild-Tensor.
        """
        return {
            "required": {
                # 'image' ist der interne Variablenname und das Label im GUI
                # ("IMAGE",) definiert den Datentyp und erzwingt Typensicherheit
                "image": ("IMAGE",),
            },
        }

    # Definition der Rückgabewerte
    # WICHTIG: Das Komma ist essenziell, um ein Python-Tupel zu erzeugen!
    RETURN_TYPES = ("IMAGE",)

    # Benutzerfreundliche Namen für die Ausgänge im GUI
    RETURN_NAMES = ("rgb_image",)

    # Verweis auf die Methode, die die Logik ausführt
    FUNCTION = "convert_rgba_to_rgb"

    # Gruppierung im Kontextmenü des Node-Graphen
    CATEGORY = "Bildverarbeitung/Konvertierung"

    def convert_rgba_to_rgb(self, image):
        """
        Führt die Konvertierung auf Tensor-Ebene durch.

        Args:
            image (torch.Tensor): Ein Tensor der Form.
                                  B=Batch, H=Höhe, W=Breite, C=Kanäle.

        Returns:
            tuple: Ein Tupel enthaltend den modifizierten Tensor.
        """

        # 1. Analyse der Tensor-Dimensionen
        # image.shape gibt ein torch.Size Objekt zurück, z.B.
        batch_size, height, width, channels = image.shape

        # 2. Bedingte Logik basierend auf der Kanal-Tiefe
        if channels == 4:
            # HAUPTFALL: RGBA Input
            # Wir nutzen Python Slicing (View-Operation).
            # ... (Ellipsis) steht für "alle vorherigen Dimensionen" (hier B, H, W).
            # :3 bedeutet "nimm die Indizes 0, 1, 2" (also R, G, B).
            # Der Alpha-Kanal (Index 3) wird ignoriert.
            rgb_image = image[..., :3]

            # Dies ist eine "Zero-Copy" Operation in PyTorch (View),
            # daher extrem speichereffizient und schnell.
            return (rgb_image,)

        elif channels == 3:
            # FALLBACK: Input ist bereits RGB
            # Wir geben das Bild unverändert weiter, um Fehler zu vermeiden.
            return (image,)

        elif channels == 1:
            # SONDERFALL: Graustufen (Grayscale)
            # Manche Masken kommen als 1-Kanal Bilder.
            # .repeat(1, 1, 1, 3) repliziert den Kanal 3x, um RGB zu simulieren.
            # Dimensionen: Batch(1) * Height(1) * Width(1) * Channels(3)
            rgb_image = image.repeat(1, 1, 1, 3)
            return (rgb_image,)

        else:
            # FEHLERFALL: Unbekannte Kanalanzahl (z.B. 2 oder >4)
            # Wir geben das Original zurück, könnten hier aber auch einen Error raisen.
            print(
                f"Warnung: RGBA_to_RGB_Lossless erhielt Bild mit {channels} Kanälen. Keine Konvertierung möglich."
            )
            return (image,)


class SaveImageWithSidecarTxt_V2:
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.type = "output"
        self.compress_level = 4

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "filename_prefix": ("STRING", {"default": "ComfyUI"}),
                "file_format": (["PNG", "JPG", "JPEG", "WEBP"], {"default": "PNG"}),
            },
            "optional": {
                "output_path": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": False,
                        "placeholder": "C:\\Mein\\Pfad (optional)",
                    },
                ),
                "positive_prompt": (
                    "STRING",
                    {"forceInput": True, "multiline": True, "default": ""},
                ),
                "negative_prompt": (
                    "STRING",
                    {"forceInput": True, "multiline": True, "default": ""},
                ),
                "model_name": (
                    "STRING",
                    {"forceInput": True, "default": "Unknown Model"},
                ),
                "clip_name": (
                    "STRING",
                    {"forceInput": True, "default": "Unknown CLIP"},
                ),
                "vae_name": ("STRING", {"forceInput": True, "default": "Unknown VAE"}),
                # --- Pass 1 ---
                "p1_sampler": ("STRING", {"forceInput": True}),
                "p1_scheduler": ("STRING", {"forceInput": True}),
                "p1_steps": ("INT", {"forceInput": True}),
                "p1_seed": ("INT", {"forceInput": True}),
                # --- Pass 2 ---
                "p2_sampler": ("STRING", {"forceInput": True}),
                "p2_scheduler": ("STRING", {"forceInput": True}),
                "p2_steps": ("INT", {"forceInput": True}),
                "p2_seed": ("INT", {"forceInput": True}),
                # --- Pass 3 ---
                "p3_sampler": ("STRING", {"forceInput": True}),
                "p3_scheduler": ("STRING", {"forceInput": True}),
                "p3_steps": ("INT", {"forceInput": True}),
                "p3_seed": ("INT", {"forceInput": True}),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ()
    FUNCTION = "save_images_and_text_v2"
    OUTPUT_NODE = True
    CATEGORY = "Custom_Research/IO"

    def save_images_and_text_v2(
        self,
        images,
        filename_prefix="ComfyUI",
        file_format="PNG",
        output_path="",
        positive_prompt="",
        negative_prompt="",
        model_name="Unknown Model",
        clip_name="Unknown CLIP",
        vae_name="Unknown VAE",
        p1_sampler=None,
        p1_scheduler=None,
        p1_steps=None,
        p1_seed=None,
        p2_sampler=None,
        p2_scheduler=None,
        p2_steps=None,
        p2_seed=None,
        p3_sampler=None,
        p3_scheduler=None,
        p3_steps=None,
        p3_seed=None,
        prompt=None,
        extra_pnginfo=None,
    ):

        # 1. Pfad-Logik (identisch zu V1)
        if output_path and output_path.strip():
            base_output_dir = output_path.strip()
            try:
                if not os.path.exists(base_output_dir):
                    os.makedirs(base_output_dir, exist_ok=True)
            except:
                base_output_dir = self.output_dir
        else:
            base_output_dir = self.output_dir

        full_output_folder, filename, counter, subfolder, filename_prefix = (
            folder_paths.get_save_image_path(
                filename_prefix, base_output_dir, images.shape[2], images.shape[1]
            )
        )

        extension = file_format.lower()
        if extension == "jpeg":
            extension = "jpg"

        # 2. Sampler String Konstruktion (Das Herzstück von V2)
        sampler_lines = []

        # Pass 1
        if p1_sampler or p1_steps:
            s_name = p1_sampler if p1_sampler else "N/A"
            sched = p1_scheduler if p1_scheduler else "N/A"
            st = p1_steps if p1_steps is not None else "N/A"
            sd = p1_seed if p1_seed is not None else "N/A"
            sampler_lines.append(
                f"First Sampler: --> {s_name}, First Scheduler: --> {sched}, Steps first Sampler: --> {st}, Seed first Sampler: --> {sd}"
            )

        # Pass 2
        if p2_sampler or p2_steps:
            s_name = p2_sampler if p2_sampler else "N/A"
            sched = p2_scheduler if p2_scheduler else "N/A"
            st = p2_steps if p2_steps is not None else "N/A"
            sd = p2_seed if p2_seed is not None else "N/A"
            sampler_lines.append(
                f"Second Sampler: --> {s_name}, Second Scheduler: --> {sched}, Steps second Sampler: --> {st}, Seed second Sampler: --> {sd}"
            )

        # Pass 3
        if p3_sampler or p3_steps:
            s_name = p3_sampler if p3_sampler else "N/A"
            sched = p3_scheduler if p3_scheduler else "N/A"
            st = p3_steps if p3_steps is not None else "N/A"
            sd = p3_seed if p3_seed is not None else "N/A"
            sampler_lines.append(
                f"Third Sampler: --> {s_name}, Third Scheduler: --> {sched}, Steps third Sampler: --> {st}, Seed third Sampler: --> {sd}"
            )

        formatted_sampler_details = "\n".join(sampler_lines)

        results = list()
        for image in images:
            # Bild speichern (identisch zu V1)
            i = 255.0 * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            if file_format in ["JPG", "JPEG"] and img.mode == "RGBA":
                img = img.convert("RGB")

            metadata = None
            if file_format == "PNG":
                metadata = PngInfo()
                if prompt is not None:
                    metadata.add_text("prompt", json.dumps(prompt))
                if extra_pnginfo is not None:
                    for x in extra_pnginfo:
                        metadata.add_text(x, json.dumps(extra_pnginfo[x]))

            file_base = f"{filename}_{counter:05}_"
            file_img = f"{file_base}.{extension}"
            file_txt = f"{file_base}.txt"

            image_path = os.path.join(full_output_folder, file_img)
            txt_path = os.path.join(full_output_folder, file_txt)

            if file_format == "PNG":
                img.save(
                    image_path, pnginfo=metadata, compress_level=self.compress_level
                )
            elif file_format in ["JPG", "JPEG"]:
                img.save(image_path, quality=95)
            elif file_format == "WEBP":
                img.save(image_path, quality=95, lossless=False)

            # Text speichern
            txt_content = f"""FILENAME INFORMATION
Filename: {file_img}
Filepath: {image_path}
Format:   {file_format}

==================================================
MODEL DETAILS
==================================================
Diffusion Model: {model_name}
Clip Model:      {clip_name}
VAE Model:       {vae_name}

==================================================
PROMPTS
==================================================
[Positive Prompt]
{positive_prompt}

[Negative Prompt]
{negative_prompt}

==================================================
SAMPLING PROCESS (Seeds & Steps)
==================================================
{formatted_sampler_details}
"""
            try:
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(txt_content)
            except Exception as e:
                print(f"Error: {e}")

            results.append(
                {"filename": file_img, "subfolder": subfolder, "type": self.type}
            )
            counter += 1

        return {"ui": {"images": results}}


class MegapixelResizeNode:
    """
    A custom node for ComfyUI that resizes images to a target megapixel count
    while maintaining aspect ratio and ensuring dimensions are multiples of 8.
    """
    
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        """
        Defines the input widgets for the node.
        """
        return {
            "required": {
                # The input image batch
                "image": ("IMAGE",),
                
                # The target size in megapixels (Million pixels)
                # Configured with min/max as requested by user
                "target_megapixels": ("FLOAT", {
                    "default": 1.0, 
                    "min": 0.1, 
                    "max": 4.0, 
                    "step": 0.01,
                    "display": "number", 
                    "tooltip": "Target size in megapixels (e.g. 1.0 = 1024x1024)"
                }),
                
                # Resampling method selection
                "method": (["lanczos", "bicubic", "bilinear", "nearest-exact", "area"], {
                    "default": "lanczos"
                }),
            }
        }

    # Outputs: The resized image, plus the new width and height as integers
    RETURN_TYPES = ("IMAGE", "INT", "INT")
    RETURN_NAMES = ("IMAGE", "width", "height")
    FUNCTION = "resize"
    CATEGORY = "Image/Resizing"

    def resize(self, image, target_megapixels, method):
        # 1. Analyze Input Dimensions
        # ComfyUI images are
        # We perform the calculation based on the first image in the batch,
        # assuming all images in a batch share dimensions (standard Comfy behavior).
        _, current_h, current_w, _ = image.shape
        
        # 2. Calculate Aspect Ratio
        aspect_ratio = current_w / current_h
        
        # 3. Calculate Target Dimensions
        # Total Pixels = MP * 1,000,000
        target_pixel_count = target_megapixels * 1_000_000
        
        # Formula: Height = sqrt(Area / AspectRatio)
        new_h_float = math.sqrt(target_pixel_count / aspect_ratio)
        new_w_float = new_h_float * aspect_ratio
        
        # 4. Enforce "Multiple of 8" Constraint for VAE compatibility
        # We round to the nearest 8 to ensure clean latent encoding
        new_w = int(round(new_w_float / 8.0) * 8)
        new_h = int(round(new_h_float / 8.0) * 8)
        
        # Safety clamp to prevent 0-dimension images
        new_w = max(new_w, 8)
        new_h = max(new_h, 8)
        
        # 5. Prepare Tensor for Resizing
        # comfy.utils.common_upscale expects
        # Input is, so we move dimensions.
        image_moved = image.movedim(-1, 1)
        
        # 6. Execute Resizing
        # We use comfy.utils.common_upscale as it handles the "method" string mapping
        # and internal device management better than raw torch.nn.functional
        resized_image_moved = comfy.utils.common_upscale(
            image_moved, 
            new_w, 
            new_h, 
            method, 
            crop="disabled" # We do not want to crop, we want to scale
        )
        
        # 7. Restore Tensor Layout
        # Convert back to for ComfyUI
        result_image = resized_image_moved.movedim(1, -1)
        
        # 8. Return results
        return (result_image, new_w, new_h)


class DirectoryImageIterator:
    """
    Loads a sorted slice of images from a directory and forwards them one-by-one
    to downstream nodes via ComfyUI's list-iteration paradigm. Supports mixed
    resolutions, displays a thumbnail preview on the canvas, and invalidates
    the execution cache only when the target directory slice actually changes.
    """

    VALID_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp', '.tiff')

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "", "multiline": False}),
                "start_index": ("INT", {"default": 0, "min": 0, "max": 100000, "step": 1}),
                "image_limit": ("INT", {"default": 0, "min": 0, "max": 100000, "step": 1}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("image", "filename")
    OUTPUT_IS_LIST = (True, True)
    FUNCTION = "load_images"
    CATEGORY = "image/iteration"

    @classmethod
    def _get_target_files(cls, folder_path, start_index, image_limit):
        """Returns the deterministically sorted slice of valid image filenames."""
        files = sorted(
            f for f in os.listdir(folder_path)
            if f.lower().endswith(cls.VALID_EXTENSIONS)
        )
        end_idx = start_index + image_limit if image_limit > 0 else len(files)
        return files[start_index:end_idx]

    @classmethod
    def IS_CHANGED(cls, folder_path, start_index, image_limit, **kwargs):
        """Cryptographic hash of the target slice — re-executes only on real changes."""
        folder_path = os.path.realpath(os.path.abspath(folder_path))
        if not os.path.isdir(folder_path):
            return float("NaN")

        m = hashlib.sha256()
        for filename in cls._get_target_files(folder_path, start_index, image_limit):
            file_path = os.path.join(folder_path, filename)
            m.update(filename.encode('utf-8'))
            m.update(str(os.path.getmtime(file_path)).encode('utf-8'))
        return m.hexdigest()

    def load_images(self, folder_path, start_index, image_limit, unique_id=None):
        # Resolve to absolute path to prevent path traversal
        folder_path = os.path.realpath(os.path.abspath(folder_path))
        if not os.path.isdir(folder_path):
            raise ValueError(f"Directory does not exist: {folder_path}")

        target_files = self._get_target_files(folder_path, start_index, image_limit)
        if not target_files:
            raise ValueError("No valid images found in the specified range.")

        out_images = []
        out_filenames = []
        ui_images = []
        temp_dir = folder_paths.get_temp_directory()
        total = len(target_files)

        for idx, filename in enumerate(target_files):
            img_path = os.path.join(folder_path, filename)
            img = Image.open(img_path)
            img = ImageOps.exif_transpose(img)
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Downscaled thumbnail saved to ComfyUI temp dir for the preview widget.
            # os.urandom avoids the random module and produces a secure unique prefix.
            thumb = img.copy()
            thumb.thumbnail((512, 512), Image.Resampling.LANCZOS)
            temp_filename = f"iter_thumb_{os.urandom(8).hex()}_{filename}"
            thumb.save(os.path.join(temp_dir, temp_filename), format="JPEG")
            ui_entry = {"filename": temp_filename, "subfolder": "", "type": "temp", "original_filename": filename}
            ui_images.append(ui_entry)

            # Send real-time preview update to the JS frontend
            if unique_id is not None and PromptServer is not None:
                PromptServer.instance.send_sync("iterator_preview", {
                    "node": str(unique_id),
                    "index": idx,
                    "total": total,
                    "filename": temp_filename,
                    "subfolder": "",
                    "type": "temp",
                    "original_filename": filename
                })

            img_array = np.array(img).astype(np.float32) / 255.0
            out_images.append(torch.from_numpy(img_array).unsqueeze(0))
            out_filenames.append(filename)

        return {"ui": {"images": ui_images}, "result": (out_images, out_filenames)}


class IteratorCurrentFilename:
    """
    Helper node for DirectoryImageIterator.

    Problem: DirectoryImageIterator emits filename as a list (OUTPUT_IS_LIST=True).
    When that list is wired directly to SaveImage.filename_prefix, ComfyUI does not
    expand it the same way it expands IMAGE tensors, so the save node receives the
    whole Python list and raises "expected string or bytes-like object, got 'list'".

    Solution: Place this node between DirectoryImageIterator.filename and
    SaveImage.filename_prefix.  It receives the full list via INPUT_IS_LIST=True,
    strips the file extension (filename_prefix must not include it), and re-emits the
    result with OUTPUT_IS_LIST=True so ComfyUI's execution engine forwards one string
    per iteration step to the downstream node.

    Wiring:
        DirectoryImageIterator.filename  →  this node  →  SaveImage.filename_prefix
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "filename": ("STRING", {"forceInput": True}),
            }
        }

    INPUT_IS_LIST = True
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("filename_prefix",)
    OUTPUT_IS_LIST = (True,)
    FUNCTION = "extract"
    CATEGORY = "image/iteration"

    def extract(self, filename):
        """Strip extensions so each string is ready for use as filename_prefix."""
        return ([os.path.splitext(f)[0] for f in filename],)


NODE_CLASS_MAPPINGS = {
    "RGBA_to_RGB_Lossless": RGBA_to_RGB_Lossless,
    "SaveImageWithSidecarTxt_V2": SaveImageWithSidecarTxt_V2,
    "MegapixelResizeNode": MegapixelResizeNode,
    "DirectoryImageIterator": DirectoryImageIterator,
    "IteratorCurrentFilename": IteratorCurrentFilename,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "RGBA_to_RGB_Lossless": "RGBA zu RGB (Verlustfrei)",
    "SaveImageWithSidecarTxt_V2": "Bild mit Sidecar TXT speichern V2",
    "MegapixelResizeNode": "Megapixel Resize",
    "DirectoryImageIterator": "Directory Image Iterator",
    "IteratorCurrentFilename": "Iterator Current Filename",
}
