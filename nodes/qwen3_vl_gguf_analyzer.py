import logging
import os
import re
from typing import Any, Optional

import folder_paths  # type: ignore  — provided by ComfyUI runtime
import torch
from comfy_api.latest import io
from llama_cpp import Llama  # type: ignore
from llama_cpp.llama_chat_format import Qwen3VLChatHandler  # type: ignore
from llama_cpp.llama_chat_format import Llava16ChatHandler

from ..utils.media import image_tensor_to_data_uri, video_tensor_to_frame_list
from ..utils.memory import unload_llm

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Built-in system prompts  (shared with DuffyGemmaGGUFAnalyzer)
# ---------------------------------------------------------------------------

PROMPT_REVERSE_ENGINEERED = """You are an expert image analysis and prompt engineering system. Your sole function is to analyze a provided image and output a single, highly detailed natural-language prompt that enables an image generation model to faithfully recreate the source image. Output only the prompt text — no preambles, labels, explanations, commentary, or formatting.

Follow these instructions precisely:

1. STYLE IDENTIFICATION (mandatory first priority)
Determine the visual medium and rendering style of the image before anything else. Identify it accurately from categories including but not limited to: photograph, studio photograph, candid photograph, cinematic still, analog film photograph, 3D render, CGI rendering, digital painting, oil painting, acrylic painting, watercolor painting, gouache painting, ink drawing, pen-and-ink illustration, pencil sketch, charcoal drawing, pastel artwork, vector illustration, flat illustration, concept art, matte painting, pixel art, anime artwork, manga panel, comic book illustration, collage, mixed media, engraving, woodcut, linocut, stencil art, graffiti art, or any other identifiable style. If the style blends multiple techniques, describe the combination. The style must appear as the opening element of the prompt.

2. MAIN SUBJECT
Describe the primary subject with precision: what or who it is, physical appearance, clothing, expression, pose, material, texture, color, and any distinguishing features. For people, include apparent age range, ethnicity cues only when visually essential for recreation, hair, attire, and body language. For objects, include shape, material, surface quality, and condition. For animals or creatures, include species, coloring, posture, and expression.

3. ACTION AND POSE
Describe what the subject is doing, the direction of gaze, gesture, motion, or stillness. Capture the dynamic or static nature of the scene.

4. COMPOSITION AND FRAMING
Note the camera angle or viewpoint (close-up, medium shot, wide shot, bird's-eye, worm's-eye, three-quarter view, profile, etc.), depth of field, focal point, and how elements are arranged within the frame.

5. BACKGROUND AND ENVIRONMENT
Describe the setting, scenery, architectural elements, landscape, interior details, atmospheric conditions, weather, time of day, season, and any contextual objects or secondary elements.

6. LIGHTING
Describe the lighting setup: direction, quality (soft, harsh, diffused, dramatic), color temperature (warm, cool, neutral), light sources (natural sunlight, golden hour, overcast, studio lighting, neon, candlelight, rim light, backlight, volumetric light, chiaroscuro), shadows, highlights, and overall luminance.

7. COLOR PALETTE AND MOOD
Describe the dominant and accent colors, saturation level, contrast, tonal range, and the emotional mood or atmosphere conveyed (serene, ominous, joyful, melancholic, energetic, mysterious, etc.).

8. ADDITIONAL DETAILS
Include any remaining important visual elements: text appearing in the image (wrap exact text in quotation marks), logos, symbols, patterns, special effects (bokeh, lens flare, motion blur, grain, vignette, glitch), texture overlays, borders, or any other notable feature required for accurate recreation.

9. OUTPUT RULES
- Write the prompt as a single continuous block of natural-language text. Do not use bullet points, numbered lists, section headers, or any structural formatting.
- Begin with the identified style, then weave all elements together in a coherent, descriptive flow.
- Adjust prompt length to match image complexity: use approximately 120 words for simple compositions and up to 300 words for complex scenes. Never go below 120 or above 300 words.
- Use quotation marks exclusively to denote text elements visible within the image.
- Do not mention that you are analyzing an image, do not reference the source image, and do not include any meta-commentary.
- Output only the prompt. Nothing else."""

PROMPT_STYLE_TRANSFER = """You are an expert image analysis and prompt engineering system. Your sole function is to analyze two provided images\u2014an "Input Image" (for content) and a "Reference Image" (for style)\u2014and output a single, highly detailed natural-language prompt. This prompt must enable an image generation model to faithfully recreate the exact subjects and scenes of the Input Image, but rendered entirely in the style, lighting, and mood of the Reference Image. Output only the prompt text — no preambles, labels, explanations, commentary, or formatting. Follow these instructions precisely:

**1. STYLE IDENTIFICATION (mandatory first priority)**
Determine the visual medium and rendering style of the Reference Image before anything else. Identify it accurately from categories including but not limited to: photograph, studio photograph, cinematic still, 3D render, digital painting, oil painting, watercolor painting, ink drawing, concept art, anime artwork, mixed media, or any other identifiable style. If the style blends multiple techniques, describe the combination. The style must appear as the opening element of the prompt.

**2. MAIN SUBJECT & ACTION (Input Image)**
Describe the primary subject of the Input Image with precision: what or who it is, physical appearance, clothing, expression, and any distinguishing features. Describe what the subject is doing, the direction of gaze, gesture, motion, or stillness. Retain the exact content and actions of the Input Image, but describe its material, texture, or color through the lens of the Reference Image's style. 

**3. COMPOSITION AND FRAMING (Input Image)**
Note the camera angle or viewpoint, depth of field, focal point, and how elements are arranged within the frame of the Input Image. Capture the dynamic or static nature of the scene.

**4. BACKGROUND AND ENVIRONMENT (Input Image)**
Describe the setting, scenery, architectural elements, landscape, interior details, and any contextual objects or secondary elements present in the Input Image.

**5. LIGHTING, COLOR PALETTE AND MOOD (Reference Image)**
Analyze the Reference Image and describe the lighting setup: direction, quality (soft, harsh, diffused, dramatic), color temperature, light sources, shadows, highlights, and overall luminance. Extract the dominant and accent colors, saturation level, contrast, tonal range, and the emotional mood or atmosphere conveyed. Apply these lighting and color characteristics strictly to the environment and subjects of the Input Image.

**6. OUTPUT RULES**
* Write the prompt as a single continuous block of natural-language text.
* Do not use bullet points, numbered lists, section headers, or any structural formatting.
* Begin with the identified style from the Reference Image, then weave all elements together in a coherent, descriptive flow.
* Adjust prompt length to match image complexity: use approximately 120 words for simple compositions and up to 300 words for complex scenes.
* Never go below 120 or above 300 words.
* Do not mention that you are analyzing an image, do not reference the Input or Reference images by name, and do not include any meta-commentary.
* Output only the prompt.
* Nothing else."""

PRESET_PROMPTS = {
    "Reverse Engineered Prompt": PROMPT_REVERSE_ENGINEERED,
    "Style Transfer Prompt": PROMPT_STYLE_TRANSFER,
}

# ---------------------------------------------------------------------------
# Helper: filter GGUF file lists for the dropdown menus
# ---------------------------------------------------------------------------

def _get_gguf_models() -> list[str]:
    """Return .gguf filenames from the LLM folder, excluding mmproj files."""
    try:
        files = folder_paths.get_filename_list("LLM")
    except Exception:
        return []
    return sorted(
        f for f in files
        if f.lower().endswith(".gguf") and "mmproj" not in f.lower()
    )


def _get_mmproj_models() -> list[str]:
    """Return mmproj .gguf filenames from the LLM folder, with a 'None' option."""
    try:
        files = folder_paths.get_filename_list("LLM")
    except Exception:
        return ["None"]
    projectors = sorted(
        f for f in files
        if f.lower().endswith(".gguf") and "mmproj" in f.lower()
    )
    return ["None"] + projectors


# ---------------------------------------------------------------------------
# Module-level model cache (replaces instance state for V3 stateless nodes)
# ---------------------------------------------------------------------------

class _ModelCache:
    """Holds the loaded llama-cpp model between executions.

    V3 nodes are stateless (@classmethod execute), so model caching
    lives at module scope rather than on the node instance.
    """

    def __init__(self):
        self.model_instance: Optional[Llama] = None
        self.current_model_path: Optional[str] = None
        self.current_mmproj_path: Optional[str] = None
        self.current_n_gpu_layers: Optional[int] = None
        self.current_n_ctx: Optional[int] = None
        self.current_force_reasoning: Optional[bool] = None
        self.current_image_min_tokens: Optional[int] = None
        self.current_image_max_tokens: Optional[int] = None

    def needs_reload(
        self,
        model_path: str,
        mmproj_path: Optional[str],
        n_gpu_layers: int,
        n_ctx: int,
        force_reasoning: bool = True,
        image_min_tokens: int = 1024,
        image_max_tokens: int = 4096,
    ) -> bool:
        if self.model_instance is None:
            return True
        return (
            self.current_model_path != model_path
            or self.current_mmproj_path != mmproj_path
            or self.current_n_gpu_layers != n_gpu_layers
            or self.current_n_ctx != n_ctx
            or self.current_force_reasoning != force_reasoning
            or self.current_image_min_tokens != image_min_tokens
            or self.current_image_max_tokens != image_max_tokens
        )

    def load_model(
        self,
        model_path: str,
        mmproj_path: Optional[str],
        n_gpu_layers: int,
        n_ctx: int,
        force_reasoning: bool = True,
        image_min_tokens: int = 1024,
        image_max_tokens: int = 4096,
    ) -> None:
        if self.model_instance is not None:
            logger.info("Unloading previous model before reload")
            unload_llm(self.model_instance)
            self.model_instance = None

        logger.info("Loading model: %s", model_path)

        if mmproj_path is not None:
            logger.info("Loading mmproj: %s", mmproj_path)

            # Strategy 1: Qwen3VLChatHandler
            try:
                chat_handler = Qwen3VLChatHandler(
                    clip_model_path=mmproj_path,
                    force_reasoning=force_reasoning,
                    add_vision_id=True,
                    image_min_tokens=image_min_tokens,
                    image_max_tokens=image_max_tokens,
                    verbose=False,
                )
                self.model_instance = Llama(
                    model_path=model_path,
                    chat_handler=chat_handler,
                    n_gpu_layers=n_gpu_layers,
                    n_ctx=n_ctx,
                    verbose=False,
                )
                logger.info(
                    "Model loaded with Qwen3VLChatHandler "
                    "(force_reasoning=%s, "
                    "image_min_tokens=%d, image_max_tokens=%d)",
                    force_reasoning,
                    image_min_tokens, image_max_tokens,
                )
            except Exception as e1:
                logger.warning("Qwen3VLChatHandler failed: %s — trying Llava16ChatHandler", e1)

                # Strategy 2: Llava16ChatHandler (generic fallback)
                try:
                    chat_handler = Llava16ChatHandler(
                        clip_model_path=mmproj_path, verbose=False,
                    )
                    self.model_instance = Llama(
                        model_path=model_path,
                        chat_handler=chat_handler,
                        n_gpu_layers=n_gpu_layers,
                        n_ctx=n_ctx,
                        verbose=False,
                    )
                    logger.info("Model loaded with Llava16ChatHandler (fallback)")
                except Exception as e2:
                    logger.warning("Llava16ChatHandler failed: %s — loading text-only", e2)
                    self.model_instance = Llama(
                        model_path=model_path,
                        n_gpu_layers=n_gpu_layers,
                        n_ctx=n_ctx,
                        verbose=False,
                    )
                    logger.warning(
                        "Model loaded WITHOUT multimodal projector. "
                        "Image/video inputs will not work."
                    )
        else:
            # Text-only mode: no mmproj selected
            logger.info("No multimodal projector selected — loading text-only")
            self.model_instance = Llama(
                model_path=model_path,
                n_gpu_layers=n_gpu_layers,
                n_ctx=n_ctx,
                verbose=False,
            )

        self.current_model_path = model_path
        self.current_mmproj_path = mmproj_path
        self.current_n_gpu_layers = n_gpu_layers
        self.current_n_ctx = n_ctx
        self.current_force_reasoning = force_reasoning
        self.current_image_min_tokens = image_min_tokens
        self.current_image_max_tokens = image_max_tokens
        logger.info("Model loaded successfully (n_gpu_layers=%d, n_ctx=%d)", n_gpu_layers, n_ctx)

    def unload(self) -> None:
        if self.model_instance is not None:
            unload_llm(self.model_instance)
        self.model_instance = None
        self.current_model_path = None
        self.current_mmproj_path = None
        self.current_n_gpu_layers = None
        self.current_n_ctx = None
        self.current_force_reasoning = None
        self.current_image_min_tokens = None
        self.current_image_max_tokens = None


_model_cache = _ModelCache()


# ---------------------------------------------------------------------------
# V3 Node
# ---------------------------------------------------------------------------

class DuffyQwen3VLGGUFAnalyzer(io.ComfyNode):
    """Multimodal analysis using Qwen3-VL via llama.cpp.

    Supports text, image, and video inputs.
    Uses the Qwen3VLChatHandler with Thinking / Instruct operational modes.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_Qwen3VLGGUFAnalyzer",
            display_name="Qwen3-VL GGUF Multimodal Analyzer",
            category="Duffy/LLM",
            description=(
                "Multimodal analysis using Qwen3-VL via llama.cpp. "
                "Supports text, image, and video inputs with Thinking and "
                "Instruct operational modes."
            ),
            inputs=[
                io.Combo.Input(
                    "gguf_model",
                    options=_get_gguf_models(),
                    tooltip="GGUF model file from models/LLM (excludes mmproj files)",
                ),
                io.Combo.Input(
                    "mmproj_model",
                    options=_get_mmproj_models(),
                    default="None",
                    tooltip=(
                        "Multimodal projector file (mmproj-*.gguf). "
                        "Select 'None' for text-only inference."
                    ),
                ),
                io.Boolean.Input(
                    "use_custom_prompt",
                    default=True,
                    tooltip=(
                        "When enabled, the custom system_prompt text is used. "
                        "When disabled, the selected preset_prompt is used instead."
                    ),
                ),
                io.Combo.Input(
                    "preset_prompt",
                    options=list(PRESET_PROMPTS.keys()),
                    default="Reverse Engineered Prompt",
                    tooltip="Built-in system prompt preset. Only active when use_custom_prompt is disabled.",
                ),
                io.String.Input(
                    "system_prompt",
                    multiline=True,
                    default="You are a helpful multimodal analyzer.",
                    tooltip="Custom system prompt. Only active when use_custom_prompt is enabled.",
                ),
                io.String.Input(
                    "user_prompt",
                    multiline=True,
                    default="Analyze the provided input.",
                ),
                io.Combo.Input(
                    "operational_mode",
                    options=["Thinking", "Instruct"],
                    default="Thinking",
                    tooltip=(
                        "Thinking: deep reasoning with <think> tags (temperature=1.0). "
                        "Instruct: direct responses without reasoning (temperature auto-adjusted to 0.7)."
                    ),
                ),
                io.Boolean.Input(
                    "strip_thinking_tags",
                    default=True,
                    tooltip="Remove <think>...</think> blocks from the final output text.",
                ),
                io.Boolean.Input(
                    "unload_model",
                    default=False,
                    tooltip="Aggressively free VRAM/RAM after inference.",
                ),
                # --- Inference parameters ---
                io.Int.Input(
                    "max_tokens", default=4096, min=1, max=32768, step=1,
                    tooltip="Maximum output tokens. Deep reasoning requires higher limits.",
                ),
                io.Float.Input(
                    "temperature", default=1.0, min=0.0, max=2.0, step=0.05,
                    tooltip="Sampling temperature. Auto-adjusted to 0.7 in Instruct mode if left at default.",
                ),
                io.Int.Input("top_k", default=40, min=0, max=500, step=1),
                io.Float.Input("top_p", default=0.95, min=0.0, max=1.0, step=0.01),
                io.Float.Input("min_p", default=0.05, min=0.0, max=1.0, step=0.01),
                io.Float.Input("repeat_penalty", default=1.1, min=0.0, max=3.0, step=0.05),
                io.Float.Input(
                    "presence_penalty", default=1.5, min=-2.0, max=2.0, step=0.1,
                    tooltip="Set to 1.5 by default to suppress repetitive loops during reasoning.",
                ),
                io.Float.Input("frequency_penalty", default=0.0, min=-2.0, max=2.0, step=0.1),
                io.Int.Input("mirostat_mode", default=0, min=0, max=2, step=1),
                io.Float.Input("mirostat_tau", default=5.0, min=0.0, max=20.0, step=0.1),
                io.Float.Input("mirostat_eta", default=0.1, min=0.0, max=1.0, step=0.01),
                io.Int.Input("seed", default=-1, min=-1, max=0x7FFFFFFFFFFFFFFF),
                io.Int.Input(
                    "n_gpu_layers", default=-1, min=-1, max=200, step=1,
                    tooltip="-1 = offload all layers to GPU",
                ),
                io.Int.Input(
                    "n_ctx", default=16384, min=512, max=262144, step=512,
                    tooltip="Context window size.",
                ),
                io.Int.Input(
                    "image_min_tokens", default=1024, min=256, max=4096, step=64,
                    tooltip=(
                        "Minimum visual tokens for the image encoder. "
                        "Ensures spatial resolution for accurate visual parsing."
                    ),
                ),
                io.Int.Input(
                    "image_max_tokens", default=4096, min=1024, max=16384, step=64,
                    tooltip=(
                        "Maximum visual tokens for the image encoder. "
                        "Prevents VRAM exhaustion on large images."
                    ),
                ),
                io.Float.Input(
                    "video_fps", default=1.0, min=0.1, max=5.0, step=0.1,
                    tooltip="Temporal sampling rate for video input (frames per second).",
                ),
                # --- Optional media inputs ---
                io.Image.Input("image", optional=True),
                io.Image.Input(
                    "reference_image", optional=True,
                    tooltip="Reference image for style transfer",
                ),
                io.Image.Input(
                    "video", optional=True,
                    tooltip="Video frames as image batch [F, H, W, 3]. Frames are sent as individual images.",
                ),
            ],
            outputs=[
                io.String.Output("analysis_text", display_name="Analysis Text"),
            ],
        )

    @classmethod
    def execute(
        cls,
        gguf_model: str,
        mmproj_model: str,
        use_custom_prompt: bool,
        preset_prompt: str,
        system_prompt: str,
        user_prompt: str,
        operational_mode: str,
        strip_thinking_tags: bool,
        unload_model: bool,
        max_tokens: int,
        temperature: float,
        top_k: int,
        top_p: float,
        min_p: float,
        repeat_penalty: float,
        presence_penalty: float,
        frequency_penalty: float,
        mirostat_mode: int,
        mirostat_tau: float,
        mirostat_eta: float,
        seed: int,
        n_gpu_layers: int,
        n_ctx: int,
        image_min_tokens: int,
        image_max_tokens: int,
        video_fps: float,
        image: Optional[torch.Tensor] = None,
        reference_image: Optional[torch.Tensor] = None,
        video: Optional[torch.Tensor] = None,
        **kwargs,
    ) -> io.NodeOutput:
        try:
            result = _run_inference(
                gguf_model=gguf_model,
                mmproj_model=mmproj_model,
                use_custom_prompt=use_custom_prompt,
                preset_prompt=preset_prompt,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                operational_mode=operational_mode,
                strip_thinking_tags=strip_thinking_tags,
                max_tokens=max_tokens,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
                min_p=min_p,
                repeat_penalty=repeat_penalty,
                presence_penalty=presence_penalty,
                frequency_penalty=frequency_penalty,
                mirostat_mode=mirostat_mode,
                mirostat_tau=mirostat_tau,
                mirostat_eta=mirostat_eta,
                seed=seed,
                n_gpu_layers=n_gpu_layers,
                n_ctx=n_ctx,
                image_min_tokens=image_min_tokens,
                image_max_tokens=image_max_tokens,
                video_fps=video_fps,
                image=image,
                reference_image=reference_image,
                video=video,
            )
            return io.NodeOutput(result)
        except FileNotFoundError as e:
            error_msg = f"[DuffyQwen3VLGGUFAnalyzer] File not found: {e}"
            logger.error(error_msg)
            return io.NodeOutput(error_msg)
        except ValueError as e:
            error_msg = f"[DuffyQwen3VLGGUFAnalyzer] Validation error: {e}"
            logger.error(error_msg)
            return io.NodeOutput(error_msg)
        except Exception as e:
            error_msg = f"[DuffyQwen3VLGGUFAnalyzer] Inference failed: {e}"
            logger.error(error_msg, exc_info=True)
            return io.NodeOutput(error_msg)
        finally:
            if unload_model:
                logger.info("Unloading model (unload_model=True)")
                _model_cache.unload()


# ---------------------------------------------------------------------------
# Inference logic (module-level, stateless)
# ---------------------------------------------------------------------------

def _run_inference(
    gguf_model: str,
    mmproj_model: str,
    use_custom_prompt: bool,
    preset_prompt: str,
    system_prompt: str,
    user_prompt: str,
    operational_mode: str,
    strip_thinking_tags: bool,
    max_tokens: int,
    temperature: float,
    top_k: int,
    top_p: float,
    min_p: float,
    repeat_penalty: float,
    presence_penalty: float,
    frequency_penalty: float,
    mirostat_mode: int,
    mirostat_tau: float,
    mirostat_eta: float,
    seed: int,
    n_gpu_layers: int,
    n_ctx: int,
    image_min_tokens: int,
    image_max_tokens: int,
    video_fps: float,
    image: Optional[torch.Tensor] = None,
    reference_image: Optional[torch.Tensor] = None,
    video: Optional[torch.Tensor] = None,
) -> str:
    # ----- Derive force_reasoning from operational mode ----- #
    force_reasoning = operational_mode == "Thinking"

    # ----- Resolve file paths ----- #
    model_path = folder_paths.get_full_path("LLM", gguf_model)
    if not model_path or not os.path.isfile(model_path):
        raise FileNotFoundError(
            f"GGUF model not found: '{gguf_model}'. "
            "Ensure it is placed in ComfyUI/models/LLM/"
        )

    mmproj_path: Optional[str] = None
    if mmproj_model != "None":
        mmproj_path = folder_paths.get_full_path("LLM", mmproj_model)
        if not mmproj_path or not os.path.isfile(mmproj_path):
            raise FileNotFoundError(
                f"Multimodal projector not found: '{mmproj_model}'. "
                "Both the model .gguf and its mmproj-*.gguf must reside "
                "together in ComfyUI/models/LLM/"
            )

    # ----- Validate image token boundaries ----- #
    if image_max_tokens < image_min_tokens:
        raise ValueError(
            f"image_max_tokens ({image_max_tokens}) must be >= "
            f"image_min_tokens ({image_min_tokens})."
        )

    # ----- Resolve effective system prompt ----- #
    if use_custom_prompt:
        effective_system_prompt = system_prompt
        logger.info("Using custom system prompt")
    else:
        effective_system_prompt = PRESET_PROMPTS.get(preset_prompt, system_prompt)
        logger.info("Using preset system prompt: %s", preset_prompt)
        if preset_prompt == "Style Transfer Prompt" and reference_image is None:
            logger.warning(
                "Style Transfer Prompt selected but no reference_image connected. "
                "The style transfer prompt expects both an input image and a reference image."
            )

    # ----- Load / cache model ----- #
    if _model_cache.needs_reload(
        model_path, mmproj_path, n_gpu_layers, n_ctx,
        force_reasoning, image_min_tokens, image_max_tokens,
    ):
        _model_cache.load_model(
            model_path, mmproj_path, n_gpu_layers, n_ctx,
            force_reasoning, image_min_tokens, image_max_tokens,
        )

    # ----- Build user content array ----- #
    user_content: list[dict[str, Any]] = [
        {"type": "text", "text": user_prompt},
    ]

    if image is not None:
        if reference_image is not None:
            user_content.append({"type": "text", "text": "Input Image:"})
        user_content.append(image_tensor_to_data_uri(image))

    if reference_image is not None:
        user_content.append({"type": "text", "text": "Reference Image:"})
        user_content.append(image_tensor_to_data_uri(reference_image))

    if video is not None:
        user_content.extend(
            video_tensor_to_frame_list(
                video, target_fps=video_fps, n_ctx=n_ctx,
            )
        )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": effective_system_prompt},
        {"role": "user", "content": user_content},
    ]

    # ----- Instruct mode auto-adjustments ----- #
    if not force_reasoning:
        if temperature == 1.0:
            temperature = 0.7
            logger.info("Instruct mode: temperature auto-adjusted to 0.7")

    # ----- Run inference ----- #
    completion = _model_cache.model_instance.create_chat_completion(
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        top_k=top_k,
        top_p=top_p,
        min_p=min_p,
        repeat_penalty=repeat_penalty,
        present_penalty=presence_penalty,
        frequency_penalty=frequency_penalty,
        mirostat_mode=mirostat_mode,
        mirostat_tau=mirostat_tau,
        mirostat_eta=mirostat_eta,
        seed=seed if seed >= 0 else None,
    )

    response_text: str = completion["choices"][0]["message"]["content"] or ""

    # ----- Strip thinking tags if requested ----- #
    if strip_thinking_tags:
        response_text = re.sub(
            r"<think>.*?</think>", "", response_text, flags=re.DOTALL
        ).strip()

    return response_text
