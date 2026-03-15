import os

import comfy.sd
import folder_paths
import torch
from comfy_api.latest import io


class DuffyClipLoader(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_ClipLoader",
            display_name="Duffy CLIP Loader",
            category="Duffy/Loaders",
            description="Loads a CLIP model for text encoding, with support for modern Node 2.0 schemas.",
            inputs=[
                io.Combo.Input("clip_name", options=folder_paths.get_filename_list("text_encoders"), tooltip="Select the CLIP/Text Encoder model file"),
                io.Combo.Input("type", options=["stable_diffusion", "stable_cascade", "sd3", "stable_audio", "mochi", "ltxv", "pixart", "cosmos", "lumina2", "wan", "hidream", "chroma", "ace", "omnigen2", "qwen_image", "hunyuan_image", "flux2", "ovis"], default="stable_diffusion", tooltip="The architecture type of the selected text encoder"),
                io.Combo.Input("device", options=["default", "cpu"], default="default", tooltip="Where to load the model")
            ],
            outputs=[
                io.Clip.Output("clip", display_name="CLIP"),
            ],
        )

    @classmethod
    def execute(cls, clip_name: str, type: str, device: str, **kwargs) -> io.NodeOutput:
        clip_type = getattr(comfy.sd.CLIPType, type.upper(), comfy.sd.CLIPType.STABLE_DIFFUSION)

        model_options = {}
        if device == "cpu":
            model_options["load_device"] = model_options["offload_device"] = torch.device("cpu")

        clip_path = folder_paths.get_full_path_or_raise("text_encoders", clip_name)
        clip = comfy.sd.load_clip(
            ckpt_paths=[clip_path], 
            embedding_directory=folder_paths.get_folder_paths("embeddings"), 
            clip_type=clip_type, 
            model_options=model_options
        )
        return io.NodeOutput(clip)

    @classmethod
    def fingerprint_inputs(cls, clip_name: str, type: str, device: str, **kwargs) -> str:
        try:
            clip_path = folder_paths.get_full_path_or_raise("text_encoders", clip_name)
            mtime = os.path.getmtime(clip_path)
            return f"{clip_name}_{type}_{device}_{mtime}"
        except Exception:
            return f"{clip_name}_{type}_{device}"
