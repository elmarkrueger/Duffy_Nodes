import torch
from comfy_api.latest import io


class DuffyRGBAtoRGB(io.ComfyNode):
    """
    Lossless conversion of RGBA image tensors (4 channels) to RGB (3 channels).
    Removes the alpha channel via tensor slicing without recomputing or
    compressing colour values. Also handles grayscale (1-channel) inputs.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_RGBAtoRGB",
            display_name="RGBA to RGB (Lossless)",
            category="Duffy/Image",
            description=(
                "Converts RGBA images to RGB by discarding the alpha channel. "
                "Passes through RGB images unchanged and expands grayscale to 3-channel RGB."
            ),
            inputs=[
                io.Image.Input(
                    "image",
                    display_name="Image",
                    tooltip="Input image tensor (RGBA, RGB, or grayscale)",
                ),
            ],
            outputs=[
                io.Image.Output(
                    "rgb_image",
                    display_name="RGB Image",
                    tooltip="The resulting 3-channel RGB image",
                ),
            ],
        )

    @classmethod
    def execute(cls, image: torch.Tensor) -> io.NodeOutput:
        channels = image.shape[-1]

        if channels == 4:
            # RGBA → RGB: zero-copy view dropping the alpha channel
            rgb_image = image[..., :3]
        elif channels == 3:
            # Already RGB — pass through
            rgb_image = image
        elif channels == 1:
            # Grayscale → pseudo-RGB by replicating the single channel
            rgb_image = image.repeat(1, 1, 1, 3)
        else:
            # Unknown channel count — return as-is
            rgb_image = image

        return io.NodeOutput(rgb_image)
