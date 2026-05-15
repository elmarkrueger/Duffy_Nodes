import logging
import os
import shutil

from comfy_api.latest import ComfyExtension, io

# Instructs ComfyUI to serve the './web' directory to the frontend
WEB_DIRECTORY = "./web"

def _sync_image_styler_thumbnails() -> None:
    """Copy style thumbnail images into web/image_styler for frontend access."""
    extension_root = os.path.dirname(__file__)
    source_dir = os.path.join(extension_root, "assets", "image_styler")
    target_dir = os.path.join(extension_root, "web", "image_styler")

    if not os.path.isdir(source_dir):
        return

    os.makedirs(target_dir, exist_ok=True)
    allowed_ext = {".jpeg", ".jpg", ".png", ".webp"}

    for filename in os.listdir(source_dir):
        _, ext = os.path.splitext(filename)
        if ext.lower() not in allowed_ext:
            continue

        src_path = os.path.join(source_dir, filename)
        dst_path = os.path.join(target_dir, filename)

        try:
            src_stat = os.stat(src_path)
            should_copy = True
            if os.path.exists(dst_path):
                dst_stat = os.stat(dst_path)
                should_copy = (
                    src_stat.st_size != dst_stat.st_size
                    or src_stat.st_mtime_ns != dst_stat.st_mtime_ns
                )

            if should_copy:
                shutil.copy2(src_path, dst_path)
        except Exception as exc:
            logging.warning("[ Duffy_Nodes ] Failed to sync Image Styler asset '%s': %s", filename, exc)


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

    _sync_image_styler_thumbnails()
    
    logging.info("=" * 60)
    logging.info("[ Duffy_Nodes ] Extension Detected")
    logging.info(f" -> Initializing Duffy_Nodes extension (Nodes 2.0 V3 Schema)")
    logging.info(f" -> Successfully registered {node_count} utility nodes")
    logging.info("=" * 60)
    return DuffyNodesExtension()

__all__ = ["comfy_entrypoint", "WEB_DIRECTORY"]
