# V3 Schema node definitions for Duffy_Nodes.
# Import each node class here and add it to NODE_LIST.

from .advanced_folder_image_selector import DuffyAdvancedFolderImageSelector
from .directory_image_iterator import DuffyDirectoryImageIterator
# Latent nodes (migrated from legacy V1)
from .empty_qwen_latent import DuffyEmptyQwenLatent
from .five_float_sliders import DuffyFiveFloatSliders
from .five_int_sliders import DuffyFiveIntSliders
from .float_math import DuffyFloatMath
from .flux2_klein_noise import DuffyFlux2KleinNoise
from .image_adjuster import DuffyImageAdjuster
from .integer_math import DuffyIntegerMath
from .iterator_current_filename import DuffyIteratorCurrentFilename
from .latent_noise_blender import DuffyLatentNoiseBlender
from .load_image_resize import DuffyLoadImageResize
from .lora_prompt_combiner import DuffyLoRaPromptCombiner
from .megapixel_resize import DuffyMegapixelResize
from .model_selector import DuffyModelSelector
from .multi_pass_node import DuffyMultiPassSampling
# Primitive nodes
from .primitive_float import DuffyPrimitiveFloat
from .primitive_integer import DuffyPrimitiveInteger
from .primitive_string import DuffyPrimitiveString
from .primitive_string_multiline import DuffyPrimitiveStringMultiline
# Image processing nodes (migrated from legacy V1)
from .rgba_to_rgb import DuffyRGBAtoRGB
from .save_image_sidecar import DuffySaveImageWithSidecar
from .seed import DuffySeed
from .signal_selector import DuffySignalSelector
from .toggle_switch import DuffyToggleSwitch
from .triple_sampler_scheduler import DuffyTripleSamplerScheduler

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
    DuffyImageAdjuster,
    DuffyRGBAtoRGB,
    DuffyMegapixelResize,
    DuffyLoadImageResize,
    DuffySaveImageWithSidecar,
    DuffyDirectoryImageIterator,
    DuffyIteratorCurrentFilename,
    DuffyAdvancedFolderImageSelector,
    # Latent nodes
    DuffyEmptyQwenLatent,
    DuffyLatentNoiseBlender,
    DuffyFlux2KleinNoise,
    # Primitive nodes
    DuffyPrimitiveInteger,
    DuffyPrimitiveFloat,
    DuffyPrimitiveString,
    DuffyPrimitiveStringMultiline,
    # Selector nodes
    DuffyModelSelector,
    # Sampling nodes
    DuffyTripleSamplerScheduler,
    # Utility nodes
    DuffySeed,
]
