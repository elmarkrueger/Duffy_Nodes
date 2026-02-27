import torch
from comfy_api.latest import io


class DuffyFlux2KleinNoise(io.ComfyNode):
    """
    Generates highly parameterised noise for injection or use as empty latents.
    Supports Flux 2 Klein architectures (128 channels, f16 spatial downsampling)
    while maintaining backward compatibility with SD1.5/SDXL/SD3 workflows.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_Flux2KleinNoise",
            display_name="Generate Noise (Flux 2 Klein)",
            category="Duffy/Latent",
            description=(
                "Generates parameterised noise for injection or as empty latents. "
                "Supports Flux 2 Klein (128-channel, f16) as well as legacy "
                "SD1.5/SDXL/SD3 architectures (4/16-channel, f8)."
            ),
            inputs=[
                io.Int.Input(
                    "width",
                    display_name="Width",
                    default=1024,
                    min=16,
                    max=8192,
                    step=16,
                    tooltip="Pixel width (step of 16 for f16 alignment)",
                ),
                io.Int.Input(
                    "height",
                    display_name="Height",
                    default=1024,
                    min=16,
                    max=8192,
                    step=16,
                    tooltip="Pixel height (step of 16 for f16 alignment)",
                ),
                io.Int.Input(
                    "batch_size",
                    display_name="Batch Size",
                    default=1,
                    min=1,
                    max=4096,
                    tooltip="Number of noise samples to generate",
                ),
                io.Int.Input(
                    "seed",
                    display_name="Seed",
                    default=123,
                    min=0,
                    max=0xFFFFFFFFFFFFFFFF,
                    step=1,
                    tooltip="Random seed for deterministic noise generation",
                ),
                io.Float.Input(
                    "multiplier",
                    display_name="Multiplier",
                    default=1.0,
                    min=0.0,
                    max=4096.0,
                    step=0.01,
                    tooltip="Intensity multiplier applied to the generated noise",
                ),
                io.Boolean.Input(
                    "constant_batch_noise",
                    display_name="Constant Batch Noise",
                    default=False,
                    tooltip="When enabled, all batch items share identical noise",
                ),
                io.Boolean.Input(
                    "normalize",
                    display_name="Normalize",
                    default=False,
                    tooltip="Normalize noise to unit variance",
                ),
                # Optional inputs
                io.Model.Input(
                    "model",
                    display_name="Model",
                    optional=True,
                    tooltip="Model used for sigma-based variance scaling",
                ),
                io.Custom("SIGMAS").Input(
                    "sigmas",
                    display_name="Sigmas",
                    optional=True,
                    tooltip="Sigma schedule for diffusion-based variance scaling",
                ),
                io.Combo.Input(
                    "latent_channels",
                    options=["4", "16", "128"],
                    display_name="Latent Channels",
                    default="4",
                    tooltip="4 = SD1.5/SDXL, 16 = SD3, 128 = Flux 2 Klein",
                ),
                io.Combo.Input(
                    "shape",
                    options=["BCHW", "BCTHW", "BTCHW"],
                    display_name="Shape",
                    default="BCHW",
                    tooltip="Tensor layout: BCHW for images, BCTHW/BTCHW for video",
                ),
            ],
            outputs=[
                io.Latent.Output(
                    "latent",
                    display_name="Latent",
                    tooltip="Generated noise tensor wrapped in a latent dictionary",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        width: int,
        height: int,
        batch_size: int,
        seed: int,
        multiplier: float,
        constant_batch_noise: bool,
        normalize: bool,
        model=None,
        sigmas=None,
        latent_channels: str = "4",
        shape: str = "BCHW",
    ) -> io.NodeOutput:
        generator = torch.manual_seed(seed)
        channels = int(latent_channels)

        # Flux 2 Klein uses f16 downsampling; legacy architectures use f8
        downscale_factor = 16 if channels == 128 else 8
        spatial_h = height // downscale_factor
        spatial_w = width // downscale_factor

        if shape == "BCHW":
            noise = torch.randn(
                [batch_size, channels, spatial_h, spatial_w],
                dtype=torch.float32, generator=generator, device="cpu",
            )
        elif shape == "BCTHW":
            noise = torch.randn(
                [1, channels, batch_size, spatial_h, spatial_w],
                dtype=torch.float32, generator=generator, device="cpu",
            )
        elif shape == "BTCHW":
            noise = torch.randn(
                [1, batch_size, channels, spatial_h, spatial_w],
                dtype=torch.float32, generator=generator, device="cpu",
            )

        # Sigma-based variance scaling
        if sigmas is not None and model is not None:
            sigma = sigmas - sigmas[-1]
            sigma /= model.model.latent_format.scale_factor
            noise *= sigma

        noise *= multiplier

        if normalize:
            noise = noise / noise.std()

        if constant_batch_noise:
            noise = noise.repeat(batch_size, 1, 1, 1)

        return io.NodeOutput({"samples": noise})
