import gc
import logging

import torch

logger = logging.getLogger(__name__)


def preflight_vram_check(
    model_path: str | None = None,
    n_gpu_layers: int = -1,
    min_free_bytes: int = 1024 * 1024 * 1024,
) -> None:
    """Free cached ComfyUI VRAM when free GPU memory is below estimated demand."""
    try:
        import os
        import torch

        if not torch.cuda.is_available():
            return

        free_bytes, _total_bytes = torch.cuda.mem_get_info()
        needed_bytes = min_free_bytes
        if n_gpu_layers != 0 and model_path and os.path.isfile(model_path):
            needed_bytes = max(min_free_bytes, int(os.path.getsize(model_path) * 1.05))
        elif n_gpu_layers == 0:
            needed_bytes = min(min_free_bytes, 512 * 1024 * 1024)

        if free_bytes >= needed_bytes:
            return

        import comfy.model_management  # type: ignore

        comfy.model_management.soft_empty_cache()
        free_bytes, _ = torch.cuda.mem_get_info()
        if free_bytes < needed_bytes:
            logger.info(
                "Low VRAM before LLM load (free=%.2f GiB, needed~=%.2f GiB); unloading ComfyUI models",
                free_bytes / (1024 ** 3),
                needed_bytes / (1024 ** 3),
            )
            comfy.model_management.unload_all_models()
            comfy.model_management.soft_empty_cache()
            gc.collect()
    except Exception as exc:
        logger.debug("Preflight VRAM check skipped: %s", exc)


def unload_llm(
    model_instance,
    chat_handler=None,
    evict_comfy_models: bool = False,
):
    """Aggressively free an llama-cpp-python model from VRAM/RAM.

    Executes the cleanup pipeline in strict order:
      1. Delete the C++ backed Llama object (triggers C destructors).
      2. Run Python garbage collection.
      3. Call ComfyUI's native model/cache cleanup.
      4. Flush the CUDA memory cache.

    Args:
        model_instance: The llama_cpp.Llama object to release. May be None.
    """
    # 1. Close and destroy C++ instance (chat handler first, then Llama)
    if model_instance is not None or chat_handler is not None:
        resolved_handler = (
            chat_handler
            if chat_handler is not None
            else getattr(model_instance, "chat_handler", None)
        )
        for resource in (resolved_handler, model_instance):
            if resource is not None and callable(getattr(resource, "close", None)):
                try:
                    resource.close()
                except Exception as exc:
                    logger.debug("Ignoring close error on %s: %s", type(resource).__name__, exc)
        if model_instance is not None:
            del model_instance
        if chat_handler is not None:
            del chat_handler
    gc.collect()
    logger.info("LLM instance deleted, garbage collected")

    # 2. ComfyUI native cleanup
    try:
        import comfy.model_management  # type: ignore
        if evict_comfy_models:
            comfy.model_management.unload_all_models()
        comfy.model_management.soft_empty_cache()
        logger.info(
            "ComfyUI model management caches cleared%s",
            " (evicted ComfyUI models)" if evict_comfy_models else "",
        )
    except ImportError:
        logger.debug("comfy.model_management not available, skipping")
    except Exception as e:
        logger.warning("ComfyUI cache cleanup failed: %s", e)

    # 3. CUDA cache flush
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        logger.info("CUDA cache emptied")
