import torch
import torchvision.transforms.functional as TF
from comfy_api.latest import io


class DuffyImageAdjuster(io.ComfyNode):
    """
    Post-processing node for manipulating image brightness, contrast,
    saturation, and hue before final save. Uses torchvision functional
    transforms on the [B, C, H, W] tensor layout and clamps output to [0, 1].
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_ImageAdjuster",
            display_name="Image Adjuster",
            category="Duffy/Image",
            description=(
                "Adjusts brightness, contrast, saturation, and hue of an image batch. "
                "Place between VAE Decode and Save Image for post-processing."
            ),
            inputs=[
                io.Image.Input(
                    "image",
                    display_name="Image",
                    tooltip="The input image batch [B, H, W, C]",
                ),
                io.Float.Input(
                    "brightness",
                    display_name="Brightness",
                    default=1.0,
                    min=0.0,
                    max=3.0,
                    step=0.05,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Scale global intensity. 1.0 is unchanged.",
                ),
                io.Float.Input(
                    "contrast",
                    display_name="Contrast",
                    default=1.0,
                    min=0.0,
                    max=3.0,
                    step=0.05,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Scale dynamic range. 1.0 is unchanged.",
                ),
                io.Float.Input(
                    "saturation",
                    display_name="Saturation",
                    default=1.0,
                    min=0.0,
                    max=3.0,
                    step=0.05,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Scale color vibrancy. 1.0 is unchanged, 0.0 is grayscale.",
                ),
                io.Float.Input(
                    "hue",
                    display_name="Hue",
                    default=0.0,
                    min=-0.5,
                    max=0.5,
                    step=0.01,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Cyclic shift of color hues. 0.0 is unchanged.",
                ),
            ],
            outputs=[
                io.Image.Output(
                    "image",
                    display_name="Image",
                    tooltip="The adjusted image batch",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        image: torch.Tensor,
        brightness: float,
        contrast: float,
        saturation: float,
        hue: float,
    ) -> io.NodeOutput:
        # ComfyUI tensors arrive as [B, H, W, C].
        # torchvision.transforms.functional expects [B, C, H, W].
        tensor = image.permute(0, 3, 1, 2)

        if brightness != 1.0:
            tensor = TF.adjust_brightness(tensor, brightness)

        if contrast != 1.0:
            tensor = TF.adjust_contrast(tensor, contrast)

        if saturation != 1.0:
            tensor = TF.adjust_saturation(tensor, saturation)

        if hue != 0.0:
            tensor = TF.adjust_hue(tensor, hue)

        # Permute back to [B, H, W, C] for ComfyUI
        tensor = tensor.permute(0, 2, 3, 1)

        # Clamp to valid [0.0, 1.0] range
        tensor = torch.clamp(tensor, 0.0, 1.0)

        return io.NodeOutput(tensor)
