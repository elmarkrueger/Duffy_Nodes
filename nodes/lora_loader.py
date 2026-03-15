import comfy.sd
import comfy.utils
import folder_paths
from comfy_api.latest import io


class DuffyLoraLoader(io.ComfyNode):
    """
    Loads a LoRA model and applies it to the given MODEL and CLIP.
    Autonomously resolves complex directory structures across all primary and supplementary storage paths.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_LoraLoader",
            display_name="Duffy Lora Loader",
            category="Duffy/Loaders",
            description="Loads a LoRA and applies it to the Diffusion Model and CLIP.",
            inputs=[
                io.Model.Input("model", display_name="Model", tooltip="Base diffusion model"),
                io.Clip.Input("clip", display_name="CLIP", tooltip="Base text encoder"),
                io.Combo.Input(
                    "lora_name",
                    options=[f.replace("\\", "/") for f in folder_paths.get_filename_list("loras")],
                    display_name="LoRA Name",
                    tooltip="The LoRA to load",
                ),
                io.Float.Input(
                    "strength_model",
                    display_name="Strength Model",
                    default=1.0,
                    min=-20.0,
                    max=20.0,
                    step=0.01,
                    tooltip="The scalar multiplier for the UNet weight matrix injection",
                ),
                io.Float.Input(
                    "strength_clip",
                    display_name="Strength CLIP",
                    default=1.0,
                    min=-20.0,
                    max=20.0,
                    step=0.01,
                    tooltip="The scalar multiplier for the CLIP text encoder weight matrix injection",
                ),
            ],
            outputs=[
                io.Model.Output("model", display_name="Model", tooltip="Modified diffusion model"),
                io.Clip.Output("clip", display_name="CLIP", tooltip="Modified text encoder"),
            ],
        )

    @classmethod
    def execute(
        cls,
        model,
        clip,
        lora_name: str,
        strength_model: float,
        strength_clip: float,
        **kwargs,
    ) -> io.NodeOutput:
        
        if strength_model == 0 and strength_clip == 0:
            return io.NodeOutput(model, clip)

        lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
        lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
        model_lora, clip_lora = comfy.sd.load_lora_for_models(
            model, clip, lora, strength_model, strength_clip
        )
        return io.NodeOutput(model_lora, clip_lora)
