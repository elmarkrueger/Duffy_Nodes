# V3 Schema node definitions for Duffy_Nodes.
# Import each node class here and add it to NODE_LIST.

from .five_float_sliders import DuffyFiveFloatSliders
from .five_int_sliders import DuffyFiveIntSliders
from .float_math import DuffyFloatMath
from .integer_math import DuffyIntegerMath
from .lora_prompt_combiner import DuffyLoRaPromptCombiner
from .multi_pass_node import DuffyMultiPassSampling
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
]
