# V3 Schema node definitions for Duffy_Nodes.
# Import each node class here and add it to NODE_LIST.

from .signal_selector import DuffySignalSelector

NODE_LIST = [
    DuffySignalSelector,
]
