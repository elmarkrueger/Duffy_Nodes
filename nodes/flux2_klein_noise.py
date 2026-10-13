import torch
from comfy_api.latest import io


class DuffyFlux2KleinNoise(io.ComfyNode):
    """
    Generates highly parameterised noise for injection or use as empty latents.
    Supports Flux 2 Klein architectures (128 channels, f16 spatial downsampling)
    while maintaining backward compatibility with SD1.5/SDXL/SD3 workflows.
    """

    _CHANNEL_DOWNSAMPLE_MAP: dict[str, int] = {
        "4": 8,
        "16": 8,
        "64": 16,
        "128": 16,
    }

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_Flux2KleinNoise",
            display_name="Generate Noise (Flux 2 Klein)",
            category="Duffy/Latent",
            description=(
                "Generates parameterised noise for injection or as empty latents. "
                "Supports f16 architectures (64/128 channels) as well as legacy "
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
                    options=list(cls._CHANNEL_DOWNSAMPLE_MAP.keys()),
                    display_name="Latent Channels",
                    default="4",
                    tooltip="4/16 = f8 architectures, 64/128 = f16 architectures",
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
    def _resolve_downscale_factor(cls, latent_channels: str) -> int | None:
        return cls._CHANNEL_DOWNSAMPLE_MAP.get(str(latent_channels))

    @classmethod
    def validate_inputs(
        cls,
        width: int,
        height: int,
        latent_channels: str,
        shape: str,
        **kwargs,
    ) -> bool | str:
        # Comfy may call validation with unresolved (None) values while graph links are still being resolved.
        # In that phase, defer strict numeric checks to avoid TypeErrors in validator code.
        if width is None or height is None or latent_channels is None or shape is None:
            return True

        downscale_factor = cls._resolve_downscale_factor(latent_channels)
        if downscale_factor is None:
            valid = ", ".join(cls._CHANNEL_DOWNSAMPLE_MAP.keys())
            return f"Validation Error: Unsupported latent_channels '{latent_channels}'. Use one of: {valid}."

        try:
            width_i = int(width)
            height_i = int(height)
        except (TypeError, ValueError):
            return "Validation Error: Width and height must be integer values."

        if width_i % downscale_factor != 0 or height_i % downscale_factor != 0:
            return (
                f"Validation Error: Width ({width_i}) and height ({height_i}) must both be divisible "
                f"by {downscale_factor} for latent_channels={latent_channels}."
            )

        if shape not in {"BCHW", "BCTHW", "BTCHW"}:
            return f"Validation Error: Unsupported shape '{shape}'."

        return True

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
        if width is None or height is None:
            raise ValueError("Width and height are required to generate latent noise.")

        try:
            width_i = int(width)
            height_i = int(height)
        except (TypeError, ValueError) as exc:
            raise ValueError("Width and height must be integer values.") from exc

        generator = torch.manual_seed(seed)
        downscale_factor = cls._resolve_downscale_factor(latent_channels)
        if downscale_factor is None:
            valid = ", ".join(cls._CHANNEL_DOWNSAMPLE_MAP.keys())
            raise ValueError(
                f"Unsupported latent_channels '{latent_channels}'. Use one of: {valid}."
            )

        if width_i % downscale_factor != 0 or height_i % downscale_factor != 0:
            raise ValueError(
                f"Width ({width_i}) and height ({height_i}) must both be divisible by {downscale_factor} "
                f"for latent_channels={latent_channels}."
            )

        channels = int(latent_channels)
        spatial_h = height_i // downscale_factor
        spatial_w = width_i // downscale_factor

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
        else:
            raise ValueError(f"Unsupported shape '{shape}'.")

        # Sigma-based variance scaling
        if sigmas is not None and model is not None:
            sigma = sigmas - sigmas[-1]
            sigma /= model.model.latent_format.scale_factor
            noise *= sigma

        noise *= multiplier

        if normalize:
            std = float(noise.std().item())
            if std > 0.0:
                noise = noise / std

        if constant_batch_noise:
            if shape == "BCHW":
                noise = noise[:1].repeat(batch_size, 1, 1, 1)
            elif shape == "BCTHW":
                noise = noise[:, :, :1, :, :].repeat(1, 1, batch_size, 1, 1)
            elif shape == "BTCHW":
                noise = noise[:, :1, :, :, :].repeat(1, batch_size, 1, 1, 1)

        return io.NodeOutput({"samples": noise})
