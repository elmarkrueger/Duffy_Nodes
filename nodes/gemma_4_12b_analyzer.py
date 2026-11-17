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
from ..utils.media import audio_to_data_uri_omni

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
# Projector helpers & shared model cache (exported for spatial architect)
# ---------------------------------------------------------------------------

def _get_gguf_models() -> list[str]:
    """Return .gguf filenames from models/LLM, excluding mmproj files."""
    return get_gguf_models()


def _get_mmproj_models() -> list[str]:
    """Return mmproj .gguf filenames from models/LLM (plus None for text-only)."""
    return get_mmproj_models(include_none=True)


# Separate cache from DuffyGemmaGGUFAnalyzer to avoid collisions; shared with
# DuffyGemmaIdeogramSpatialArchitect for instant reuse across nodes.
_model_cache_12b = _GemmaModelCache("gemma_4_12b")


# ---------------------------------------------------------------------------
# V3 Node
# ---------------------------------------------------------------------------

class DuffyGemma4_12B_Analyzer(io.ComfyNode):
    """Multimodal analysis using Gemma-4-12B-it via llama.cpp.

    Supports text, image, video, and audio inputs using the unified
    gemma4uv multimodal projector, or text-only execution when mmproj is None.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_Gemma4_12B_Analyzer",
            display_name="Gemma-4 12B GGUF Multimodal Analyzer",
            category="Duffy/LLM",
            description="Multimodal analysis using Gemma-4-12B-it via llama.cpp. Supports text, high-resolution images, video, and audio inputs.",
            inputs=build_gemma_inputs(
                gguf_options=_get_gguf_models(),
                mmproj_options=_get_mmproj_models(),
                preset_options=list(PRESET_PROMPTS.keys()),
                default_preset="General Multimodal Analysis",
                default_n_ctx=10240,
                n_ctx_tooltip="Context window size (default 10 K for multimodal analysis; model supports up to 256 K)",
                video_timing_input=io.Float.Input(
                    "frame_sample_interval",
                    default=2.0,
                    min=0.5,
                    max=10.0,
                    step=0.5,
                    tooltip="Temporal interval in seconds between sampled video frames",
                ),
                include_legacy_preserve_thinking=True,
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
        """Validate path safety and token limits without blocking F16 or None projectors."""
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
        frame_sample_interval: float,
        preserve_thinking: bool = False,
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
        """Cache-bust on random seed (-1) or when model files, params, or tensor contents change."""
        del preserve_thinking
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
                n_gpu_layers, n_ctx, frame_sample_interval,
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
        frame_sample_interval: float,
        preserve_thinking: bool = False,
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
        del preserve_thinking
        target_fps = 1.0 / frame_sample_interval if frame_sample_interval > 0 else 1.0
        return execute_gemma_node(
            "DuffyGemma4_12B_Analyzer",
            _model_cache_12b,
            unload_model,
            preset_prompts=PRESET_PROMPTS,
            audio_encoder=audio_to_data_uri_omni,
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
            target_fps=target_fps,
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
    frame_sample_interval: float,
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
    target_fps = 1.0 / frame_sample_interval if frame_sample_interval > 0 else 1.0
    return run_gemma_inference(
        cache=_model_cache_12b,
        preset_prompts=PRESET_PROMPTS,
        audio_encoder=audio_to_data_uri_omni,
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
        target_fps=target_fps,
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
