# V3 Schema node definitions for Duffy_Nodes.
# Import each node class here and add it to NODE_LIST.

from .advanced_folder_image_selector import DuffyAdvancedFolderImageSelector
from .connected_image_stitch import DuffyConnectedImageStitch
from .directory_image_iterator import DuffyDirectoryImageIterator
from .image_text_overlay import DuffyImageTextOverlay
from .advanced_text_overlay import DuffyAdvancedTextOverlay
from .interactive_relight import DuffyInteractiveRelight
from .advanced_image_adjuster import DuffyAdvancedImageAdjuster
from .advanced_connected_image_stitch import DuffyAdvancedConnectedImageStitch
from .image_preview import DuffyImagePreview
# Latent nodes (migrated from legacy V1)
from .empty_qwen_latent import DuffyEmptyQwenLatent
from .find_and_replace_text import DuffyFindAndReplaceText
from .five_float_sliders import DuffyFiveFloatSliders
from .five_int_sliders import DuffyFiveIntSliders
from .float_math import DuffyFloatMath
from .flux2_klein_noise import DuffyFlux2KleinNoise
from .image_adjuster import DuffyImageAdjuster
from .image_compare import DuffyImageCompare
from .image_stitch import DuffyImageStitch
from .integer_math import DuffyIntegerMath
from .iterator_current_filename import DuffyIteratorCurrentFilename
from .json_format_string import DuffyJsonFormatString
from .latent_noise_blender import DuffyLatentNoiseBlender
from .load_image_resize import DuffyLoadImageResize
from .lora_prompt_combiner import DuffyLoRaPromptCombiner
from .megapixel_resize import DuffyMegapixelResize
from .model_selector import DuffyModelSelector
from .multi_pass_node import DuffyMultiPassSampling
# Primitive nodes
from .primitive_boolean import DuffyPrimitiveBoolean
from .primitive_float import DuffyPrimitiveFloat
from .primitive_integer import DuffyPrimitiveInteger
from .primitive_string import DuffyPrimitiveString
from .primitive_string_multiline import DuffyPrimitiveStringMultiline
# Logic nodes
from .logic_gate import DuffyLogicGate
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
    DuffyFindAndReplaceText,
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
    # Image stitching
    DuffyImageCompare,
    DuffyImageStitch,
    DuffyConnectedImageStitch,
    # Latent nodes
    DuffyEmptyQwenLatent,
    DuffyLatentNoiseBlender,
    DuffyFlux2KleinNoise,
    # Primitive nodes
    DuffyPrimitiveBoolean,
    DuffyPrimitiveInteger,
    DuffyPrimitiveFloat,
    DuffyPrimitiveString,
    DuffyPrimitiveStringMultiline,
    # Logic nodes
    DuffyLogicGate,
    # Selector nodes
    DuffyModelSelector,
    # Sampling nodes
    DuffyTripleSamplerScheduler,
    # Utility nodes
    DuffySeed,
    DuffyJsonFormatString,
    DuffyImageTextOverlay,
    DuffyAdvancedTextOverlay,
    DuffyInteractiveRelight,
    DuffyAdvancedImageAdjuster,
    DuffyAdvancedConnectedImageStitch,
    DuffyImagePreview,
]
