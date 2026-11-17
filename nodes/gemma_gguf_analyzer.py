import logging
from typing import Any, Optional

import torch
from comfy_api.latest import io

from ..utils.gemma_common import (
    MMPROJ_NONE,
    _GemmaModelCache,
    build_gemma_fingerprint,
    build_gemma_inputs,
    execute_gemma_node,
    get_gguf_models,
    get_mmproj_models,
    run_gemma_inference,
    validate_gemma_inputs,
)
from ..utils.media import audio_to_data_uri

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Built-in system prompts
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
# Projector helpers & shared thread-safe model cache
# ---------------------------------------------------------------------------

def _get_gguf_models() -> list[str]:
    """Return .gguf filenames from models/LLM, excluding mmproj files."""
    return get_gguf_models()


def _get_mmproj_models() -> list[str]:
    """Return mmproj .gguf filenames from models/LLM (plus None for text-only)."""
    return get_mmproj_models(include_none=True)


_model_cache = _GemmaModelCache("gemma_gguf")


# ---------------------------------------------------------------------------
# V3 Node
# ---------------------------------------------------------------------------

class DuffyGemmaGGUFAnalyzer(io.ComfyNode):
    """Multimodal analysis using Gemma-4 GGUF via llama.cpp.

    Supports text, image, video, and audio inputs (or text-only with mmproj=None).
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_GemmaGGUFAnalyzer",
            display_name="Gemma-4 GGUF Multimodal Analyzer",
            category="Duffy/LLM",
            description="Multimodal analysis using Gemma-4 GGUF via llama.cpp. Supports text, high-resolution images, video, and audio inputs.",
            inputs=build_gemma_inputs(
                gguf_options=_get_gguf_models(),
                mmproj_options=_get_mmproj_models(),
                preset_options=list(PRESET_PROMPTS.keys()),
                default_preset="Reverse Engineered Prompt",
                default_n_ctx=8192,
                n_ctx_tooltip="Context window size (Gemma-4 supports up to 128 K)",
                video_timing_input=io.Float.Input(
                    "video_fps",
                    default=1.0,
                    min=0.1,
                    max=5.0,
                    step=0.1,
                    tooltip="Temporal sampling rate for video input (frames per second)",
                ),
            ),
            outputs=[
                io.String.Output("analysis_text", display_name="Analysis Text"),
            ],
        )

    @classmethod
    def validate_inputs(
        cls,
        gguf_model: str = "",
        mmproj_model: str = MMPROJ_NONE,
        image_min_tokens: int = 128,
        image_max_tokens: int = 1120,
        **kwargs,
    ) -> bool | str:
        """Validate relative model paths and visual token bounds."""
        return validate_gemma_inputs(
            gguf_model=gguf_model,
            mmproj_model=mmproj_model,
            image_min_tokens=image_min_tokens,
            image_max_tokens=image_max_tokens,
        )

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
        video_fps: float,
        mmproj_offload: bool = True,
        flash_attn: bool = True,
        kv_cache_type_k: str = "f16",
        kv_cache_type_v: str = "f16",
        n_batch: int = 2048,
        n_ubatch: int = 2048,
        image_min_tokens: int = 128,
        image_max_tokens: int = 1120,
        image: Optional[torch.Tensor] = None,
        reference_image: Optional[torch.Tensor] = None,
        video: Optional[torch.Tensor] = None,
        audio: Optional[dict] = None,
        **kwargs,
    ) -> tuple | float:
        """Cache-bust on random seed (-1) or when files, params, or tensor contents change."""
        return build_gemma_fingerprint(
            gguf_model=gguf_model,
            mmproj_model=mmproj_model,
            seed=seed,
            scalars=(
                use_custom_prompt, preset_prompt, system_prompt, user_prompt,
                enable_thinking, strip_thinking_tags, unload_model,
                max_tokens, temperature, top_k, top_p, min_p,
                repeat_penalty, presence_penalty, frequency_penalty,
                mirostat_mode, mirostat_tau, mirostat_eta, seed,
                n_gpu_layers, n_ctx, video_fps,
                mmproj_offload, flash_attn, kv_cache_type_k, kv_cache_type_v,
                n_batch, n_ubatch, image_min_tokens, image_max_tokens,
            ),
            image=image,
            reference_image=reference_image,
            video=video,
            audio=audio,
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
        video_fps: float,
        mmproj_offload: bool = True,
        flash_attn: bool = True,
        kv_cache_type_k: str = "f16",
        kv_cache_type_v: str = "f16",
        n_batch: int = 2048,
        n_ubatch: int = 2048,
        image_min_tokens: int = 128,
        image_max_tokens: int = 1120,
        image: Optional[torch.Tensor] = None,
        reference_image: Optional[torch.Tensor] = None,
        video: Optional[torch.Tensor] = None,
        audio: Optional[dict] = None,
        **kwargs,
    ) -> io.NodeOutput:
        return execute_gemma_node(
            "DuffyGemmaGGUFAnalyzer",
            _model_cache,
            unload_model,
            preset_prompts=PRESET_PROMPTS,
            audio_encoder=audio_to_data_uri,
            gguf_model=gguf_model,
            mmproj_model=mmproj_model,
            use_custom_prompt=use_custom_prompt,
            preset_prompt=preset_prompt,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            enable_thinking=enable_thinking,
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
            target_fps=video_fps,
            mmproj_offload=mmproj_offload,
            flash_attn=flash_attn,
            kv_cache_type_k=kv_cache_type_k,
            kv_cache_type_v=kv_cache_type_v,
            n_batch=n_batch,
            n_ubatch=n_ubatch,
            image_min_tokens=image_min_tokens,
            image_max_tokens=image_max_tokens,
            image=image,
            reference_image=reference_image,
            video=video,
            audio=audio,
        )


def _run_inference(
    gguf_model: str,
    mmproj_model: str,
    use_custom_prompt: bool,
    preset_prompt: str,
    system_prompt: str,
    user_prompt: str,
    enable_thinking: bool,
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
    video_fps: float,
    mmproj_offload: bool = True,
    flash_attn: bool = True,
    kv_cache_type_k: str = "f16",
    kv_cache_type_v: str = "f16",
    n_batch: int = 2048,
    n_ubatch: int = 2048,
    image_min_tokens: int = 128,
    image_max_tokens: int = 1120,
    image: Optional[torch.Tensor] = None,
    reference_image: Optional[torch.Tensor] = None,
    video: Optional[torch.Tensor] = None,
    audio: Optional[dict] = None,
) -> str:
    """Thin delegation wrapper kept for direct callers/tracebacks."""
    return run_gemma_inference(
        cache=_model_cache,
        preset_prompts=PRESET_PROMPTS,
        audio_encoder=audio_to_data_uri,
        gguf_model=gguf_model,
        mmproj_model=mmproj_model,
        use_custom_prompt=use_custom_prompt,
        preset_prompt=preset_prompt,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        enable_thinking=enable_thinking,
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
        target_fps=video_fps,
        mmproj_offload=mmproj_offload,
        flash_attn=flash_attn,
        kv_cache_type_k=kv_cache_type_k,
        kv_cache_type_v=kv_cache_type_v,
        n_batch=n_batch,
        n_ubatch=n_ubatch,
        image_min_tokens=image_min_tokens,
        image_max_tokens=image_max_tokens,
        image=image,
        reference_image=reference_image,
        video=video,
        audio=audio,
    )
