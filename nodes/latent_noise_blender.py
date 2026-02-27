import torch
from comfy_api.latest import io


class DuffyLatentNoiseBlender(io.ComfyNode):
    """
    Blends a latent image with latent noise using a percentage slider.
    Automatically handles mismatched spatial dimensions and devices.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_LatentNoiseBlender",
            display_name="Latent Noise Blender",
            category="Duffy/Latent",
            description=(
                "Blends a base latent with a noise latent using a percentage slider. "
                "Noise is automatically resized to match the image dimensions if needed."
            ),
            inputs=[
                io.Latent.Input(
                    "latent_image",
                    display_name="Latent Image",
                    tooltip="The base latent structure",
                ),
                io.Latent.Input(
                    "latent_noise",
                    display_name="Latent Noise",
                    tooltip="The noise latent to blend in",
                ),
                io.Int.Input(
                    "blend_percentage",
                    display_name="Blend %",
                    default=50,
                    min=0,
                    max=100,
                    step=1,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="0 = pure image, 100 = pure noise",
                ),
            ],
            outputs=[
                io.Latent.Output(
                    "blended_latent",
                    display_name="Blended Latent",
                    tooltip="Result of blending the image and noise latents",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        latent_image: dict,
        latent_noise: dict,
        blend_percentage: int,
    ) -> io.NodeOutput:
        img_samples = latent_image["samples"]
        noise_samples = latent_noise["samples"]

        # Resize noise if spatial dimensions differ
        if img_samples.shape[2:] != noise_samples.shape[2:]:
            noise_samples = torch.nn.functional.interpolate(
                noise_samples,
                size=(img_samples.shape[2], img_samples.shape[3]),
                mode="bicubic",
            )

        # Ensure same device
        if noise_samples.device != img_samples.device:
            noise_samples = noise_samples.to(img_samples.device)

        alpha = float(blend_percentage) / 100.0
        blended_samples = (1.0 - alpha) * img_samples.clone() + alpha * noise_samples

        result_latent = latent_image.copy()
        result_latent["samples"] = blended_samples

        return io.NodeOutput(result_latent)
