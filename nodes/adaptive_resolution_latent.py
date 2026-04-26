import json

import torch
from comfy_api.latest import io


class DuffyAdaptiveResolutionLatent(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_AdaptiveResolutionLatent",
            display_name="Adaptive Resolution & Latent Heatsink",
            category="Duffy/Latent",
            description="Dynamically adapts aspect ratio, divisibility constraints, and native latent generation.",
            inputs=[
                io.Int.Input("batch_size", default=1, min=1, max=4096),
                io.String.Input("state_json", default="{}", socketless=True),
            ],
            outputs=[
                io.Int.Output("width", display_name="WIDTH"),
                io.Int.Output("height", display_name="HEIGHT"),
                io.Latent.Output("latent", display_name="LATENT"),
            ],
        )

    @classmethod
    def execute(cls, batch_size: int, state_json: str, **kwargs) -> io.NodeOutput:
        try:
            state = json.loads(state_json)
        except json.JSONDecodeError:
            state = {}
            
        width = int(state.get("width", 1024))
        height = int(state.get("height", 1024))
        model = state.get("model", "SDXL")
        
        # Base defaults (SD 1.5, SDXL, Qwen-Image 2512)
        channels = 4
        downscale = 8
        
        # PRD Mapping
        if model in ["Flux 1", "Flux 2", "Z-Image", "Ernie-Image"]:
            channels = 16
            downscale = 8
        elif model == "Flux 2 Klein":
            channels = 128
            downscale = 16
            
        spatial_h = height // downscale
        spatial_w = width // downscale
        
        # Generate empty latent
        latent_tensor = torch.zeros([batch_size, channels, spatial_h, spatial_w], device="cpu")
        
        return io.NodeOutput(width, height, {"samples": latent_tensor})
