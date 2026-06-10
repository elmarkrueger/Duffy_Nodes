import logging
import os
import re
from typing import Any, Optional

import folder_paths  # type: ignore  — provided by ComfyUI runtime
import torch
from comfy_api.latest import io

# ---------------------------------------------------------------------------
# Import-time validation: verify the JamePeng llama-cpp-python wheel
# ---------------------------------------------------------------------------
_IMPORT_ERROR_MSG = (
    "You have an outdated or incompatible version of the llama-cpp-python library. "
    "The Gemma 4 12B Unified model requires the JamePeng wheel v0.3.40-cu130 or higher. "
    "Install it via: pip install https://github.com/TAO71-AI/llama-cpp-python-JamePeng/releases/download/v0.3.40-cu130-win-20260608/llama_cpp_python-0.3.40-cp312-cp312-win_amd64.whl"
)

try:
    from llama_cpp import Llama  # type: ignore
    from llama_cpp.llama_chat_format import Gemma4ChatHandler  # type: ignore
except ImportError:
    raise ImportError(_IMPORT_ERROR_MSG)

# Fallback Llava16ChatHandler kept for the multi-strategy model loading
try:
    from llama_cpp.llama_chat_format import Llava16ChatHandler  # type: ignore
except ImportError:
    Llava16ChatHandler = None  # type: ignore

from ..utils.media import (audio_to_data_uri_omni, image_tensor_to_data_uri,
                           video_tensor_to_frame_list)
from ..utils.memory import unload_llm

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Built-in system prompts (shared with DuffyGemmaGGUFAnalyzer + new 12B preset)
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

PROMPT_GENERAL_MULTIMODAL = """You are an expert multimodal analysis system powered by the Gemma 4 12B unified architecture. You can simultaneously process and correlate text, images, video frames, and audio waveforms. Your task is to provide a thorough, insightful analysis of all provided inputs.

Follow these instructions:

1. OVERVIEW
Begin with a concise summary of what inputs you received (e.g., "You provided 3 images, a 30-second audio clip, and a text query about..."). This helps orient the user.

2. VISUAL ANALYSIS
For each image or video frame provided, describe the key visual elements: subjects, composition, lighting, color palette, style, and any notable details. If multiple images are provided, identify relationships between them (chronological sequence, before/after, stylistic variations, etc.).

3. AUDIO ANALYSIS
If audio is provided, transcribe any speech, identify speakers if distinguishable, describe background sounds, music, acoustic characteristics, and emotional tone. Correlate audio events with visual changes if both are present (e.g., "The speaker begins discussing the sunset at 0:12, which coincides with the warm lighting appearing in frame 4").

4. CROSS-MODAL CORRELATION
If multiple modalities are provided, identify meaningful relationships between them. For video + audio, note how the acoustic and visual tracks reinforce or contrast with each other. For image + text, explain how the visual content illustrates or diverges from the textual description.

5. INSIGHTS AND CONCLUSIONS
Provide actionable insights, interpretations, or recommendations based on the multimodal analysis. Be specific and grounded in the provided content.

6. OUTPUT RULES
- Write in clear, well-structured natural language.
- Use section headings (OVERVIEW, VISUAL ANALYSIS, etc.) for readability.
- Be thorough but concise — quality over quantity.
- If a modality is absent, skip that section entirely.
- Do not mention that you are an AI or reference your own architecture.
- Do not output any meta-commentary about the analysis process."""

PRESET_PROMPTS = {
    "Reverse Engineered Prompt": PROMPT_REVERSE_ENGINEERED,
    "Style Transfer Prompt": PROMPT_STYLE_TRANSFER,
    "General Multimodal Analysis": PROMPT_GENERAL_MULTIMODAL,
}

# ---------------------------------------------------------------------------
# BF16 projector validation (option 1a: file-name heuristic)
# ---------------------------------------------------------------------------

_BF16_WARNING = (
    "The selected mmproj file does not appear to be BF16 format. "
    "The Gemma 4 12B unified model requires the BF16 multimodal projector "
    "(mmproj-BF16.gguf). Non-BF16 projectors cause severe audio degradation "
    "and repetitive generation loops. Download the correct projector from: "
    "https://huggingface.co/unsloth/gemma-4-12B-it-qat-GGUF/blob/main/mmproj-BF16.gguf"
)


def _check_projector_name(mmproj_filename: str) -> Optional[str]:
    """Validate that the mmproj filename indicates BF16 format.

    Uses a lightweight file-name heuristic (option 1a): checks for \"BF16\"
    substring. Does NOT parse GGUF metadata headers, keeping validation simple
    and dependency-free.

    Returns:
        None if the projector name suggests BF16 format.
        A warning string if it does not.
    """
    if "bf16" not in mmproj_filename.lower():
        return _BF16_WARNING
    return None


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
    """Return mmproj .gguf filenames from the LLM folder."""
    try:
        files = folder_paths.get_filename_list("LLM")
    except Exception:
        return []
    return sorted(
        f for f in files
        if f.lower().endswith(".gguf") and "mmproj" in f.lower()
    )


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
        self.current_enable_thinking: Optional[bool] = None
        self.current_preserve_thinking: Optional[bool] = None

    def needs_reload(
        self, model_path: str, mmproj_path: str, n_gpu_layers: int, n_ctx: int,
        enable_thinking: bool = True,
        preserve_thinking: bool = False,
    ) -> bool:
        if self.model_instance is None:
            return True
        return (
            self.current_model_path != model_path
            or self.current_mmproj_path != mmproj_path
            or self.current_n_gpu_layers != n_gpu_layers
            or self.current_n_ctx != n_ctx
            or self.current_enable_thinking != enable_thinking
            or self.current_preserve_thinking != preserve_thinking
        )

    def load_model(
        self, model_path: str, mmproj_path: str, n_gpu_layers: int, n_ctx: int,
        enable_thinking: bool = True,
        preserve_thinking: bool = False,
    ) -> None:
        if self.model_instance is not None:
            logger.info("Unloading previous model before reload")
            unload_llm(self.model_instance)
            self.model_instance = None

        logger.info("Loading model: %s", model_path)
        logger.info("Loading mmproj: %s", mmproj_path)

        # Strategy 1: Gemma4ChatHandler (native Gemma 4 support)
        try:
            chat_handler = Gemma4ChatHandler(
                clip_model_path=mmproj_path,
                enable_thinking=enable_thinking,
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
                "Model loaded with Gemma4ChatHandler (enable_thinking=%s, preserve_thinking=%s)",
                enable_thinking, preserve_thinking,
            )
        except Exception as e1:
            logger.warning("Gemma4ChatHandler failed: %s — trying Llava16ChatHandler", e1)

            # Strategy 2: Llava16ChatHandler (generic fallback)
            if Llava16ChatHandler is not None:
                try:
                    chat_handler = Llava16ChatHandler(clip_model_path=mmproj_path, verbose=False)
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
                    self._load_text_only(model_path, n_gpu_layers, n_ctx)
            else:
                logger.warning("Llava16ChatHandler not available — loading text-only")
                self._load_text_only(model_path, n_gpu_layers, n_ctx)

        self.current_model_path = model_path
        self.current_mmproj_path = mmproj_path
        self.current_n_gpu_layers = n_gpu_layers
        self.current_n_ctx = n_ctx
        self.current_enable_thinking = enable_thinking
        self.current_preserve_thinking = preserve_thinking
        logger.info("Model loaded successfully (n_gpu_layers=%d, n_ctx=%d)", n_gpu_layers, n_ctx)

    def _load_text_only(self, model_path: str, n_gpu_layers: int, n_ctx: int) -> None:
        """Fallback: load model without multimodal projector."""
        self.model_instance = Llama(
            model_path=model_path,
            n_gpu_layers=n_gpu_layers,
            n_ctx=n_ctx,
            verbose=False,
        )
        logger.warning(
            "Model loaded WITHOUT multimodal projector. "
            "Image/video/audio inputs will not work."
        )

    def unload(self) -> None:
        if self.model_instance is not None:
            unload_llm(self.model_instance)
        self.model_instance = None
        self.current_model_path = None
        self.current_mmproj_path = None
        self.current_n_gpu_layers = None
        self.current_n_ctx = None
        self.current_enable_thinking = None
        self.current_preserve_thinking = None


# Separate cache from DuffyGemmaGGUFAnalyzer to avoid collisions
_model_cache_12b = _ModelCache()


# ---------------------------------------------------------------------------
# V3 Node
# ---------------------------------------------------------------------------

class DuffyGemma4_12B_Analyzer(io.ComfyNode):
    """Multimodal analysis using Gemma-4-12B-it via llama.cpp.

    Supports text, image, video, and audio inputs using the unified
    gemma4uv multimodal projector. Requires the JamePeng llama-cpp-python
    wheel (v0.3.40-cu130) and the BF16-format mmproj file.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_Gemma4_12B_Analyzer",
            display_name="Gemma-4 12B GGUF Multimodal Analyzer",
            category="Duffy/LLM",
            description="Multimodal analysis using Gemma-4-12B-it via llama.cpp. Supports text, image, video, and audio inputs with unified gemma4uv projector.",
            inputs=[
                io.Combo.Input("gguf_model", options=_get_gguf_models(), tooltip="GGUF model file from models/LLM (excludes mmproj files)"),
                io.Combo.Input("mmproj_model", options=_get_mmproj_models(), tooltip="Multimodal projector file (mmproj-*.gguf). Must be BF16 format for the unified 12B model."),
                io.Boolean.Input("use_custom_prompt", default=True, tooltip="When enabled, the custom system_prompt text is used. When disabled, the selected preset_prompt is used instead."),
                io.Combo.Input("preset_prompt", options=list(PRESET_PROMPTS.keys()), default="General Multimodal Analysis", tooltip="Built-in system prompt preset. Only active when use_custom_prompt is disabled."),
                io.String.Input("system_prompt", multiline=True, default="You are a helpful multimodal analyzer.", tooltip="Custom system prompt. Only active when use_custom_prompt is enabled."),
                io.String.Input("user_prompt", multiline=True, default="Analyze the provided input."),
                io.Boolean.Input("enable_thinking", default=True, tooltip="Enable model reasoning / thinking mode"),
                io.Boolean.Input("preserve_thinking", default=False, tooltip="Keep <think> reasoning blocks in the context history across turns (consumes more tokens)"),
                io.Boolean.Input("strip_thinking_tags", default=True, tooltip="Remove <think>...</think> blocks from output"),
                io.Boolean.Input("unload_model", default=False, tooltip="Aggressively free VRAM/RAM after inference"),
                # --- Inference parameters ---
                io.Int.Input("max_tokens", default=1024, min=1, max=128000, step=1),
                io.Float.Input("temperature", default=0.8, min=0.0, max=2.0, step=0.05),
                io.Int.Input("top_k", default=40, min=0, max=500, step=1),
                io.Float.Input("top_p", default=0.95, min=0.0, max=1.0, step=0.01),
                io.Float.Input("min_p", default=0.05, min=0.0, max=1.0, step=0.01),
                io.Float.Input("repeat_penalty", default=1.1, min=0.0, max=3.0, step=0.05),
                io.Float.Input("presence_penalty", default=0.0, min=-2.0, max=2.0, step=0.1),
                io.Float.Input("frequency_penalty", default=0.0, min=-2.0, max=2.0, step=0.1),
                io.Int.Input("mirostat_mode", default=0, min=0, max=2, step=1),
                io.Float.Input("mirostat_tau", default=5.0, min=0.0, max=20.0, step=0.1),
                io.Float.Input("mirostat_eta", default=0.1, min=0.0, max=1.0, step=0.01),
                io.Int.Input("seed", default=-1, min=-1, max=0x7FFFFFFFFFFFFFFF),
                io.Int.Input("n_gpu_layers", default=-1, min=-1, max=200, step=1, tooltip="-1 = offload all layers to GPU"),
                io.Int.Input("n_ctx", default=10240, min=512, max=131072, step=512, tooltip="Context window size (default 10 K for multimodal analysis; model supports up to 256 K)"),
                io.Float.Input("frame_sample_interval", default=2.0, min=0.5, max=10.0, step=0.5, tooltip="Temporal interval in seconds between sampled video frames"),
                # --- Optional media inputs ---
                io.Image.Input("image", optional=True),
                io.Image.Input("reference_image", optional=True, tooltip="Reference image for style transfer"),
                io.Image.Input("video", optional=True, tooltip="Video frames as image batch [F, H, W, 3]"),
                io.Audio.Input("audio", optional=True),
            ],
            outputs=[
                io.String.Output("analysis_text", display_name="Analysis Text"),
            ],
        )

    @classmethod
    def validate_inputs(cls, mmproj_model: str, **kwargs) -> bool | str:
        """Validate the mmproj filename and other inputs before execution."""
        bf16_warning = _check_projector_name(mmproj_model)
        if bf16_warning is not None:
            return bf16_warning
        return True

    @classmethod
    def fingerprint_inputs(
        cls,
        gguf_model: str,
        mmproj_model: str,
        use_custom_prompt: bool,
        preset_prompt: str,
        system_prompt: str,
        user_prompt: str,
        enable_thinking: bool,
        preserve_thinking: bool,
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
        frame_sample_interval: float,
        image: Optional[torch.Tensor] = None,
        reference_image: Optional[torch.Tensor] = None,
        video: Optional[torch.Tensor] = None,
        audio: Optional[dict] = None,
        **kwargs,
    ) -> tuple:
        """Cache-bust when model, projector, or key parameters change."""
        model_path = folder_paths.get_full_path("LLM", gguf_model)
        mmproj_path = folder_paths.get_full_path("LLM", mmproj_model)

        def _file_sig(path_str) -> tuple[str, int, int]:
            if path_str and os.path.isfile(path_str):
                stat = os.stat(path_str)
                return (path_str, stat.st_mtime_ns, stat.st_size)
            return (path_str or "", -1, -1)

        return (
            _file_sig(model_path),
            _file_sig(mmproj_path),
            use_custom_prompt,
            preset_prompt,
            system_prompt,
            user_prompt,
            enable_thinking,
            preserve_thinking,
            strip_thinking_tags,
            unload_model,
            max_tokens,
            temperature,
            top_k,
            top_p,
            min_p,
            repeat_penalty,
            presence_penalty,
            frequency_penalty,
            mirostat_mode,
            mirostat_tau,
            mirostat_eta,
            seed,
            n_gpu_layers,
            n_ctx,
            frame_sample_interval,
            image is not None,
            reference_image is not None,
            video is not None,
            audio is not None,
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
        enable_thinking: bool,
        preserve_thinking: bool,
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
        frame_sample_interval: float,
        image: Optional[torch.Tensor] = None,
        reference_image: Optional[torch.Tensor] = None,
        video: Optional[torch.Tensor] = None,
        audio: Optional[dict] = None,
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
                enable_thinking=enable_thinking,
                preserve_thinking=preserve_thinking,
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
                frame_sample_interval=frame_sample_interval,
                image=image,
                reference_image=reference_image,
                video=video,
                audio=audio,
            )
            return io.NodeOutput(result)
        except FileNotFoundError as e:
            error_msg = f"[DuffyGemma4_12B_Analyzer] File not found: {e}"
            logger.error(error_msg)
            return io.NodeOutput(error_msg)
        except ValueError as e:
            error_msg = f"[DuffyGemma4_12B_Analyzer] Validation error: {e}"
            logger.error(error_msg)
            return io.NodeOutput(error_msg)
        except Exception as e:
            error_msg = f"[DuffyGemma4_12B_Analyzer] Inference failed: {e}"
            logger.error(error_msg, exc_info=True)
            return io.NodeOutput(error_msg)
        finally:
            if unload_model:
                logger.info("Unloading model (unload_model=True)")
                _model_cache_12b.unload()


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
    enable_thinking: bool,
    preserve_thinking: bool,
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
    frame_sample_interval: float,
    image: Optional[torch.Tensor] = None,
    reference_image: Optional[torch.Tensor] = None,
    video: Optional[torch.Tensor] = None,
    audio: Optional[dict] = None,
) -> str:
    # ----- Resolve file paths ----- #
    model_path = folder_paths.get_full_path("LLM", gguf_model)
    mmproj_path = folder_paths.get_full_path("LLM", mmproj_model)

    if not model_path or not os.path.isfile(model_path):
        raise FileNotFoundError(
            f"GGUF model not found: '{gguf_model}'. "
            "Ensure it is placed in ComfyUI/models/LLM/"
        )
    if not mmproj_path or not os.path.isfile(mmproj_path):
        raise FileNotFoundError(
            f"Multimodal projector not found: '{mmproj_model}'. "
            "Both the model .gguf and its mmproj-*.gguf must reside "
            "together in ComfyUI/models/LLM/"
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
    if _model_cache_12b.needs_reload(
        model_path, mmproj_path, n_gpu_layers, n_ctx, enable_thinking, preserve_thinking,
    ):
        _model_cache_12b.load_model(
            model_path, mmproj_path, n_gpu_layers, n_ctx, enable_thinking, preserve_thinking,
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
        # Convert frame_sample_interval (seconds between frames) to target_fps
        target_fps = 1.0 / frame_sample_interval if frame_sample_interval > 0 else 1.0
        user_content.extend(
            video_tensor_to_frame_list(
                video, target_fps=target_fps, n_ctx=n_ctx,
            )
        )

    if audio is not None:
        # Audio fallback: if encoding fails, append a text placeholder
        # so the model knows audio was intended but couldn't be processed.
        try:
            user_content.append(audio_to_data_uri_omni(audio))
        except Exception as e:
            logger.warning("Audio encoding failed: %s — adding text fallback", e)
            user_content.append({
                "type": "text",
                "text": "[Attached unsupported audio file — could not be processed. "
                        f"Error: {e}]",
            })

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": effective_system_prompt},
        {"role": "user", "content": user_content},
    ]

    # ----- Thinking mode adjustments ----- #
    if not enable_thinking:
        if temperature == 0.8:
            temperature = 0.7
            logger.info("Thinking disabled: temperature auto-adjusted to 0.7")
        if presence_penalty == 0.0:
            presence_penalty = 1.5
            logger.info("Thinking disabled: presence_penalty auto-adjusted to 1.5")

    # ----- Run inference with deterministic seed ----- #
    completion = _model_cache_12b.model_instance.create_chat_completion(
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
        seed=seed if seed >= 0 else None,  # Deterministic: passed directly, no global set_seed()
    )

    response_text: str = completion["choices"][0]["message"]["content"] or ""

    # ----- Strip thinking tags if requested (but honor preserve_thinking) ----- #
    if strip_thinking_tags:
        response_text = re.sub(
            r"<\|channel>thought\n.*?<channel\|>", "", response_text, flags=re.DOTALL
        ).strip()
        response_text = re.sub(
            r"<think>.*?</think>", "", response_text, flags=re.DOTALL
        ).strip()

    return response_text
