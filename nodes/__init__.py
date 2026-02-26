# V3 Schema node definitions for Duffy_Nodes.
# Import each node class here and add it to NODE_LIST.

from .five_float_sliders import DuffyFiveFloatSliders
from .five_int_sliders import DuffyFiveIntSliders
from .lora_prompt_combiner import DuffyLoRaPromptCombiner
from .multi_pass_node import DuffyMultiPassSampling
from .signal_selector import DuffySignalSelector

NODE_LIST = [
    DuffySignalSelector,
    DuffyLoRaPromptCombiner,
    DuffyFiveFloatSliders,
    DuffyFiveIntSliders,
    DuffyMultiPassSampling,
]
