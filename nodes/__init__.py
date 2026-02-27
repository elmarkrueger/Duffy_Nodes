# V3 Schema node definitions for Duffy_Nodes.
# Import each node class here and add it to NODE_LIST.

from .directory_image_iterator import DuffyDirectoryImageIterator
# Latent nodes (migrated from legacy V1)
from .empty_qwen_latent import DuffyEmptyQwenLatent
from .five_float_sliders import DuffyFiveFloatSliders
from .five_int_sliders import DuffyFiveIntSliders
from .float_math import DuffyFloatMath
from .flux2_klein_noise import DuffyFlux2KleinNoise
from .integer_math import DuffyIntegerMath
from .iterator_current_filename import DuffyIteratorCurrentFilename
from .latent_noise_blender import DuffyLatentNoiseBlender
from .lora_prompt_combiner import DuffyLoRaPromptCombiner
from .megapixel_resize import DuffyMegapixelResize
from .multi_pass_node import DuffyMultiPassSampling
# Image processing nodes (migrated from legacy V1)
from .rgba_to_rgb import DuffyRGBAtoRGB
from .save_image_sidecar import DuffySaveImageWithSidecar
from .signal_selector import DuffySignalSelector
from .toggle_switch import DuffyToggleSwitch

NODE_LIST = [
    DuffySignalSelector,
    DuffyLoRaPromptCombiner,
    DuffyFiveFloatSliders,
    DuffyFiveIntSliders,
    DuffyFloatMath,
    DuffyIntegerMath,
    DuffyMultiPassSampling,
    DuffyToggleSwitch,
    # Image processing
    DuffyRGBAtoRGB,
    DuffyMegapixelResize,
    DuffySaveImageWithSidecar,
    DuffyDirectoryImageIterator,
    DuffyIteratorCurrentFilename,
    # Latent nodes
    DuffyEmptyQwenLatent,
    DuffyLatentNoiseBlender,
    DuffyFlux2KleinNoise,
]
