import gc
import logging

import torch

logger = logging.getLogger(__name__)


def unload_llm(model_instance):
    """Aggressively free an llama-cpp-python model from VRAM/RAM.

    Executes the cleanup pipeline in strict order:
      1. Delete the C++ backed Llama object (triggers C destructors).
      2. Run Python garbage collection.
      3. Call ComfyUI's native model/cache cleanup.
      4. Flush the CUDA memory cache.

    Args:
        model_instance: The llama_cpp.Llama object to release. May be None.
    """
    # 1. Destroy C++ instance
    if model_instance is not None:
        del model_instance
    gc.collect()
    logger.info("LLM instance deleted, garbage collected")

    # 2. ComfyUI native cleanup
    try:
        import comfy.model_management  # type: ignore
        comfy.model_management.unload_all_models()
        comfy.model_management.soft_empty_cache()
        logger.info("ComfyUI model management caches cleared")
    except ImportError:
        logger.debug("comfy.model_management not available, skipping")
    except Exception as e:
        logger.warning("ComfyUI cache cleanup failed: %s", e)

    # 3. CUDA cache flush
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        logger.info("CUDA cache emptied")
