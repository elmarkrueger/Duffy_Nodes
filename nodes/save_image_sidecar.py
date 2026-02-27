import json
import os

import folder_paths
import numpy as np
import torch
from comfy_api.latest import io
from PIL import Image
from PIL.PngImagePlugin import PngInfo


class DuffySaveImageWithSidecar(io.ComfyNode):
    """
    Saves images in PNG/JPG/WEBP format alongside a sidecar .txt file containing
    model details, prompts, and multi-pass sampling metadata.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_SaveImageWithSidecar",
            display_name="Save Image with Sidecar TXT",
            category="Duffy/IO",
            description=(
                "Saves images to disk in the chosen format and writes a companion "
                ".txt file with model details, prompts, and sampling parameters."
            ),
            is_output_node=True,
            inputs=[
                io.Image.Input(
                    "images",
                    display_name="Images",
                    tooltip="Image batch to save",
                ),
                io.String.Input(
                    "filename_prefix",
                    display_name="Filename Prefix",
                    default="ComfyUI",
                    tooltip="Base name for saved files",
                ),
                io.Combo.Input(
                    "file_format",
                    options=["PNG", "JPG", "JPEG", "WEBP"],
                    display_name="File Format",
                    default="PNG",
                    tooltip="Output image format",
                ),
                # Optional output path
                io.String.Input(
                    "output_path",
                    display_name="Output Path",
                    default="",
                    multiline=False,
                    optional=True,
                    tooltip="Custom output directory (leave empty for default)",
                ),
                # Prompt fields
                io.String.Input(
                    "positive_prompt",
                    display_name="Positive Prompt",
                    default="",
                    multiline=True,
                    optional=True,
                    tooltip="Positive prompt text to record in sidecar",
                ),
                io.String.Input(
                    "negative_prompt",
                    display_name="Negative Prompt",
                    default="",
                    multiline=True,
                    optional=True,
                    tooltip="Negative prompt text to record in sidecar",
                ),
                # Model info
                io.String.Input(
                    "model_name",
                    display_name="Model Name",
                    default="Unknown Model",
                    optional=True,
                    tooltip="Name of the diffusion model",
                ),
                io.String.Input(
                    "clip_name",
                    display_name="CLIP Name",
                    default="Unknown CLIP",
                    optional=True,
                    tooltip="Name of the CLIP model",
                ),
                io.String.Input(
                    "vae_name",
                    display_name="VAE Name",
                    default="Unknown VAE",
                    optional=True,
                    tooltip="Name of the VAE model",
                ),
                # --- Pass 1 ---
                io.String.Input("p1_sampler", display_name="Pass 1 Sampler", default="", optional=True),
                io.String.Input("p1_scheduler", display_name="Pass 1 Scheduler", default="", optional=True),
                io.Int.Input("p1_steps", display_name="Pass 1 Steps", default=0, min=0, max=10000, optional=True),
                io.Int.Input("p1_seed", display_name="Pass 1 Seed", default=0, min=0, max=0xFFFFFFFFFFFFFFFF, optional=True),
                # --- Pass 2 ---
                io.String.Input("p2_sampler", display_name="Pass 2 Sampler", default="", optional=True),
                io.String.Input("p2_scheduler", display_name="Pass 2 Scheduler", default="", optional=True),
                io.Int.Input("p2_steps", display_name="Pass 2 Steps", default=0, min=0, max=10000, optional=True),
                io.Int.Input("p2_seed", display_name="Pass 2 Seed", default=0, min=0, max=0xFFFFFFFFFFFFFFFF, optional=True),
                # --- Pass 3 ---
                io.String.Input("p3_sampler", display_name="Pass 3 Sampler", default="", optional=True),
                io.String.Input("p3_scheduler", display_name="Pass 3 Scheduler", default="", optional=True),
                io.Int.Input("p3_steps", display_name="Pass 3 Steps", default=0, min=0, max=10000, optional=True),
                io.Int.Input("p3_seed", display_name="Pass 3 Seed", default=0, min=0, max=0xFFFFFFFFFFFFFFFF, optional=True),
            ],
            outputs=[],
        )

    @classmethod
    def execute(
        cls,
        images: torch.Tensor,
        filename_prefix: str = "ComfyUI",
        file_format: str = "PNG",
        output_path: str = "",
        positive_prompt: str = "",
        negative_prompt: str = "",
        model_name: str = "Unknown Model",
        clip_name: str = "Unknown CLIP",
        vae_name: str = "Unknown VAE",
        p1_sampler: str = "",
        p1_scheduler: str = "",
        p1_steps: int = 0,
        p1_seed: int = 0,
        p2_sampler: str = "",
        p2_scheduler: str = "",
        p2_steps: int = 0,
        p2_seed: int = 0,
        p3_sampler: str = "",
        p3_scheduler: str = "",
        p3_steps: int = 0,
        p3_seed: int = 0,
    ) -> io.NodeOutput:
        compress_level = 4

        # Resolve output directory
        if output_path and output_path.strip():
            base_output_dir = output_path.strip()
            if not os.path.exists(base_output_dir):
                os.makedirs(base_output_dir, exist_ok=True)
        else:
            base_output_dir = folder_paths.get_output_directory()

        full_output_folder, filename, counter, subfolder, filename_prefix = (
            folder_paths.get_save_image_path(
                filename_prefix, base_output_dir, images.shape[2], images.shape[1]
            )
        )

        extension = file_format.lower()
        if extension == "jpeg":
            extension = "jpg"

        # Build sampler detail lines
        sampler_lines = []
        if p1_sampler or p1_steps:
            sampler_lines.append(
                f"First Sampler: --> {p1_sampler or 'N/A'}, "
                f"First Scheduler: --> {p1_scheduler or 'N/A'}, "
                f"Steps first Sampler: --> {p1_steps or 'N/A'}, "
                f"Seed first Sampler: --> {p1_seed or 'N/A'}"
            )
        if p2_sampler or p2_steps:
            sampler_lines.append(
                f"Second Sampler: --> {p2_sampler or 'N/A'}, "
                f"Second Scheduler: --> {p2_scheduler or 'N/A'}, "
                f"Steps second Sampler: --> {p2_steps or 'N/A'}, "
                f"Seed second Sampler: --> {p2_seed or 'N/A'}"
            )
        if p3_sampler or p3_steps:
            sampler_lines.append(
                f"Third Sampler: --> {p3_sampler or 'N/A'}, "
                f"Third Scheduler: --> {p3_scheduler or 'N/A'}, "
                f"Steps third Sampler: --> {p3_steps or 'N/A'}, "
                f"Seed third Sampler: --> {p3_seed or 'N/A'}"
            )
        formatted_sampler_details = "\n".join(sampler_lines)

        results = []
        for image in images:
            i = 255.0 * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            if file_format in ("JPG", "JPEG") and img.mode == "RGBA":
                img = img.convert("RGB")

            metadata = None
            if file_format == "PNG":
                metadata = PngInfo()

            file_base = f"{filename}_{counter:05}_"
            file_img = f"{file_base}.{extension}"
            file_txt = f"{file_base}.txt"

            image_path = os.path.join(full_output_folder, file_img)
            txt_path = os.path.join(full_output_folder, file_txt)

            if file_format == "PNG":
                img.save(image_path, pnginfo=metadata, compress_level=compress_level)
            elif file_format in ("JPG", "JPEG"):
                img.save(image_path, quality=95)
            elif file_format == "WEBP":
                img.save(image_path, quality=95, lossless=False)

            # Write sidecar text file
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
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(txt_content)

            results.append(
                {"filename": file_img, "subfolder": subfolder, "type": "output"}
            )
            counter += 1

        return io.NodeOutput(ui={"images": results})
