import torch
from comfy_api.latest import io

# Pre-defined resolutions optimised for the Qwen-Image-2512 architecture
_QWEN_RATIOS: dict[str, tuple[int, int]] = {
    "1:1 (1328x1328)": (1328, 1328),
    "16:9 (1664x928)": (1664, 928),
    "9:16 (928x1664)": (928, 1664),
    "4:3 (1472x1104)": (1472, 1104),
    "3:4 (1104x1472)": (1104, 1472),
    "3:2 (1584x1056)": (1584, 1056),
    "2:3 (1056x1584)": (1056, 1584),
}


class DuffyEmptyQwenLatent(io.ComfyNode):
    """
    Initialises an empty 16-channel latent tensor for the Qwen-Image-2512 model.
    Provides a dropdown of optimised resolutions, a size multiplier slider,
    and automatic rounding to 16 px alignment.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_EmptyQwenLatent",
            display_name="Empty Qwen-2512 Latent Image",
            category="Duffy/Latent",
            description=(
                "Creates an empty 16-channel latent for the Qwen-Image-2512 model. "
                "Select a base resolution from the dropdown and optionally scale it "
                "with the multiplier. Dimensions are snapped to multiples of 16."
            ),
            inputs=[
                io.Combo.Input(
                    "resolution",
                    options=list(_QWEN_RATIOS.keys()),
                    display_name="Resolution",
                    default="16:9 (1664x928)",
                    tooltip="Base resolution preset for the Qwen-Image-2512 architecture",
                ),
                io.Float.Input(
                    "size_multiplier",
                    display_name="Size Multiplier",
                    default=1.0,
                    min=1.0,
                    max=2.0,
                    step=0.25,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Scales the base resolution (1.0 = original, 2.0 = doubled)",
                ),
                io.Int.Input(
                    "batch_size",
                    display_name="Batch Size",
                    default=1,
                    min=1,
                    max=64,
                    step=1,
                    tooltip="Number of latent images in the batch",
                ),
            ],
            outputs=[
                io.Latent.Output(
                    "latent",
                    display_name="Latent",
                    tooltip="Empty 16-channel latent tensor",
                ),
                io.Int.Output(
                    "width",
                    display_name="Width",
                    tooltip="Pixel width after scaling and alignment",
                ),
                io.Int.Output(
                    "height",
                    display_name="Height",
                    tooltip="Pixel height after scaling and alignment",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        resolution: str,
        size_multiplier: float,
        batch_size: int,
    ) -> io.NodeOutput:
        base_width, base_height = _QWEN_RATIOS[resolution]

        # Scale and snap to nearest multiple of 16
        width = int(round(base_width * size_multiplier / 16) * 16)
        height = int(round(base_height * size_multiplier / 16) * 16)

        # Qwen-Image-2512: 16-channel VAE with downscale factor 8
        latent_channels = 16
        downscale_factor = 8

        latent_w = width // downscale_factor
        latent_h = height // downscale_factor

        latent = torch.zeros([batch_size, latent_channels, latent_h, latent_w])

        return io.NodeOutput({"samples": latent}, width, height)
