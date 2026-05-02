import logging
import os
import shutil

from comfy_api.latest import ComfyExtension, io

# Instructs ComfyUI to serve the './web' directory to the frontend
WEB_DIRECTORY = "./web"


class DuffyNodesExtension(ComfyExtension):
    """
    Formal extension registration container for Duffy_Nodes.
    Inherits from ComfyExtension to interface with the ComfyUI backend loader.
    """
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        """
        Returns the list of active V3 schema nodes to the application registry.
        """
        # Import here to avoid relative import issues at module load time
        from .nodes import NODE_LIST
        return NODE_LIST

async def comfy_entrypoint() -> DuffyNodesExtension:
    """
    The initialization hook probed by the ComfyUI backend loader.
    Must return an object inheriting from ComfyExtension.
    """
    from .nodes import NODE_LIST
    node_count = len(NODE_LIST)
    
    logging.info("=" * 60)
    logging.info("[ Duffy_Nodes ] Extension Detected")
    logging.info(f" -> Initializing Duffy_Nodes extension (Nodes 2.0 V3 Schema)")
    logging.info(f" -> Successfully registered {node_count} utility nodes")
    logging.info("=" * 60)
    return DuffyNodesExtension()

__all__ = ["comfy_entrypoint", "WEB_DIRECTORY"]
