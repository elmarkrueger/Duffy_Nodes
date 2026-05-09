import re
from pathlib import Path
from typing import Optional

from comfy_api.latest import io

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets" / "image_styler"
BASE_PROMPT_FILE = ASSETS_DIR / "photorealistic_prompt.txt"
_VALID_STYLE_RE = re.compile(r"^[a-z0-9_]+$")

_COMMON_FORBIDDEN = [
    "do not copy subjects from style examples",
    "do not mention ducks unless a duck exists in the input image",
]

_NO_PHOTO_LANGUAGE = [
    "no camera model, lens, f-stop, film stock, or sensor language",
    "no photorealistic, cinematic, ray-traced, or volumetric-light phrasing",
]

_STYLE_RULES = {
    "3d_render": {
        "directive": "High-end CGI rendering with physically based materials and clean geometric readability.",
        "must": ["pbr materials", "controlled global illumination", "clean silhouette", "stylized realism"],
        "forbid": [],
        "word_range": (100, 160),
    },
    "anime": {
        "directive": "Anime illustration with cel shading and expressive stylized proportions.",
        "must": ["clean linework", "cel-shaded forms", "expressive facial styling", "graphic color blocks"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "childrens_book_illustration": {
        "directive": "Whimsical children's book illustration with gentle storybook readability.",
        "must": ["friendly stylization", "soft illustrative shapes", "storybook mood", "clear focal subject"],
        "forbid": [],
        "word_range": (80, 140),
    },
    "cinematic": {
        "directive": "Cinematic visual language with dramatic lighting and strong narrative framing.",
        "must": ["dramatic contrast", "intentional framing", "atmospheric lighting", "filmic composition"],
        "forbid": [],
        "word_range": (100, 170),
    },
    "claymation": {
        "directive": "Handcrafted claymation look with tactile material character.",
        "must": ["clay texture", "miniature set feeling", "soft stop-motion charm", "handmade imperfection"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "comic_book": {
        "directive": "Comic-book rendering with assertive ink language and panel-ready clarity.",
        "must": ["bold inking", "stylized shadows", "graphic readability", "dynamic contour emphasis"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "cyberpunk": {
        "directive": "Cyberpunk art direction with neon-urban atmosphere and futuristic edge.",
        "must": ["neon accent lighting", "high-contrast night mood", "futuristic texture cues", "urban density"],
        "forbid": [],
        "word_range": (100, 170),
    },
    "dark_fantasy": {
        "directive": "Dark fantasy mood with ominous atmosphere and dramatic tonal weight.",
        "must": ["moody contrast", "mythic darkness", "aged material cues", "gothic atmosphere"],
        "forbid": [],
        "word_range": (100, 170),
    },
    "digital_art": {
        "directive": "Polished digital illustration with controlled stylized rendering.",
        "must": ["clean digital brush language", "structured stylization", "readable edges", "intentional color control"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "disney_animation_studio": {
        "directive": "Feature-animation style with expressive, family-friendly readability.",
        "must": ["expressive stylization", "clean character readability", "animation-friendly forms", "warm story feel"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "fantasy": {
        "directive": "Fantasy illustration with imaginative atmosphere and world-building detail.",
        "must": ["epic atmosphere", "stylized fantasy cues", "luminous accenting", "illustrative world detail"],
        "forbid": [],
        "word_range": (100, 170),
    },
    "hand_drawn": {
        "directive": "Hand-drawn illustration with organic mark-making and sketch character.",
        "must": ["organic line quality", "visible hand-drawn feel", "imperfect artisanal marks", "illustrative texture"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "horror": {
        "directive": "Horror-oriented visual treatment with tension and psychological unease.",
        "must": ["unsettling atmosphere", "low-key lighting", "high tension mood", "uneasy tonal cues"],
        "forbid": [],
        "word_range": (100, 170),
    },
    "line_art": {
        "directive": "Strict monochrome line art: black ink lines on white or near-white ground, no painterly shading.",
        "must": ["monochrome black-and-white", "line-weight variation", "sparse hatching only", "flat uncluttered background"],
        "forbid": _NO_PHOTO_LANGUAGE + [
            "no color palette language",
            "no texture realism wording like pores or fabric microdetail",
            "no glossy or cinematic lighting terminology",
        ],
        "word_range": (70, 120),
    },
    "minimalist": {
        "directive": "Strict minimalist style: reduce details, simplify geometry, emphasize negative space.",
        "must": ["few essential visual elements", "flat simplified forms", "restrained palette", "clean negative space"],
        "forbid": _NO_PHOTO_LANGUAGE + [
            "no dense descriptive clutter",
            "no ornate texture vocabulary",
            "no cinematic or dramatic camera language",
        ],
        "word_range": (60, 110),
    },
    "noir": {
        "directive": "Noir treatment with stark monochrome contrast and dramatic shadow geometry.",
        "must": ["black-and-white tonality", "hard shadow contrast", "moody noir atmosphere", "dramatic silhouettes"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "oil_painting": {
        "directive": "Oil painting treatment with visible brush behavior and layered pigment feel.",
        "must": ["painterly brush texture", "layered paint depth", "traditional canvas mood", "fine-art rendering"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "photorealistic": {
        "directive": "Photorealistic rendering with physically plausible materials and natural image realism.",
        "must": ["real-world lighting behavior", "natural material response", "accurate anatomy", "clean realistic detail"],
        "forbid": [],
        "word_range": (110, 190),
    },
    "pixar_3d": {
        "directive": "Stylized family-animation 3D with smooth forms, expressive readability, and polished CGI finish.",
        "must": ["stylized animation forms", "expressive character readability", "clean cgi shading", "bright production design"],
        "forbid": [],
        "word_range": (100, 170),
    },
    "pixel_art": {
        "directive": "Pixel-art treatment with intentional low-resolution grid logic.",
        "must": ["pixel grid awareness", "limited sprite-like detail", "controlled dithering", "retro game-art look"],
        "forbid": ["no photorealistic shading language", "no high-frequency microdetail wording"],
        "word_range": (70, 120),
    },
    "pop_art": {
        "directive": "Pop-art treatment with bold graphic contrast and poster-like impact.",
        "must": ["high-contrast graphic blocks", "bold stylized color language", "print-inspired edges", "visual punch"],
        "forbid": [],
        "word_range": (80, 140),
    },
    "sci_fi": {
        "directive": "Science-fiction treatment with advanced-tech atmosphere and futuristic design cues.",
        "must": ["futuristic design language", "tech-environment cues", "speculative mood", "high readability"],
        "forbid": [],
        "word_range": (100, 170),
    },
    "steampunk": {
        "directive": "Steampunk treatment with Victorian-industrial motifs and mechanical ornament.",
        "must": ["brass-and-gear motifs", "victorian industrial flavor", "mechanical craft detail", "warm aged patina"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "surrealism": {
        "directive": "Surrealist treatment with dream logic and impossible conceptual juxtapositions.",
        "must": ["dreamlike atmosphere", "unexpected symbolic pairing", "non-literal composition", "conceptual visual tension"],
        "forbid": [],
        "word_range": (100, 170),
    },
    "vintage": {
        "directive": "Vintage treatment with period-authentic tonality and retro image character.",
        "must": ["period-era mood", "retro tonal treatment", "analog-inspired finish", "timeworn visual character"],
        "forbid": [],
        "word_range": (90, 150),
    },
    "watercolor": {
        "directive": "Watercolor treatment with transparent layering, pigment bloom, and soft edge bleed.",
        "must": ["watercolor wash behavior", "soft edge bleeding", "paper texture feel", "transparent pigment layering"],
        "forbid": ["no glossy photoreal microdetail wording"],
        "word_range": (80, 130),
    },
}

_STYLE_TRANSFORM_POLICY = {
    "3d_render": "Translate all visible forms into polished CGI forms with physically coherent material language.",
    "anime": "Convert realism into stylized anime anatomy and cel-shaded shape language while preserving identity and pose.",
    "childrens_book_illustration": "Simplify visual complexity into child-friendly storybook forms and warm illustrative readability.",
    "cinematic": "Reframe content with narrative shot language, controlled atmosphere, and dramatic scene intention.",
    "claymation": "Reinterpret forms as handcrafted clay models with tactile, miniature stop-motion aesthetics.",
    "comic_book": "Convert scene information into bold comic-book inking logic and panel-driven graphic emphasis.",
    "cyberpunk": "Shift the environment and mood toward dense neon-futurist visual language.",
    "dark_fantasy": "Push tone and design toward ominous mythic darkness with dramatic stylized contrast.",
    "digital_art": "Unify visual elements under polished digital painting and illustration conventions.",
    "disney_animation_studio": "Translate content into readable feature-animation forms with expressive stylized charm.",
    "fantasy": "Infuse scene with fantasy-art atmosphere and imaginative world-building cues.",
    "hand_drawn": "Prioritize handcrafted line and sketch character over realism-heavy surface description.",
    "horror": "Intensify atmosphere and framing into psychological tension and dread-focused presentation.",
    "line_art": "Aggressively abstract realism into monochrome contour drawing; preserve structure but strip realism-heavy texture language.",
    "minimalist": "Aggressively reduce scene to essential forms, negative space, and minimal descriptive load.",
    "noir": "Transform scene into monochrome noir mood with hard shadow structure and atmospheric tension.",
    "oil_painting": "Translate forms into brush-driven painterly masses with layered pigment-like language.",
    "photorealistic": "Preserve realistic structure and material plausibility with natural photographic coherence.",
    "pixar_3d": "Stylize content into family-animation 3D readability with expressive forms and clean CGI charm.",
    "pixel_art": "Reduce and quantize details into deliberate low-resolution pixel-grid logic.",
    "pop_art": "Flatten and amplify visual impact through bold graphic contrast and poster-like stylization.",
    "sci_fi": "Push setting and visual treatment toward futuristic speculative design language.",
    "steampunk": "Blend forms with Victorian-industrial mechanical motif language and warm aged material character.",
    "surrealism": "Recompose scene with dreamlike logic and symbolic impossible pairings while preserving core subject identity.",
    "vintage": "Recast visual treatment into period-authentic retro tonality and analog-era character.",
    "watercolor": "Soften and reinterpret forms through transparent watercolor layering, wash behavior, and edge bleed.",
}


def _read_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def _style_prompt_path(style_name: str) -> Path:
    if not _VALID_STYLE_RE.fullmatch(style_name):
        raise ValueError(f"Invalid style id: {style_name}")
    return ASSETS_DIR / f"{style_name}.txt"


def _discover_style_options() -> list[str]:
    if not ASSETS_DIR.exists():
        return []

    style_options: list[str] = []
    for txt_file in sorted(ASSETS_DIR.glob("*.txt")):
        if txt_file.name == "photorealistic_prompt.txt":
            continue
        try:
            if _read_text_file(txt_file):
                style_options.append(txt_file.stem)
        except Exception:
            continue
    return style_options


def _file_signature(path: Path) -> tuple[str, int, int]:
    if not path.exists():
        return (str(path), -1, -1)
    stat = path.stat()
    return (str(path), stat.st_mtime_ns, stat.st_size)


def _neutralize_base_prompt(base_prompt: str) -> str:
    """Remove hard-coded photorealistic bias while preserving analysis structure."""
    sanitized = base_prompt

    # Replace the exact enforced quality tail that hard-locks photorealism.
    sanitized = sanitized.replace(
        '"highly detailed, photorealistic, sharp focus on the subject, correct human anatomy, natural hands and fingers, clean image, simple uncluttered background, no extra limbs, no watermarks, no logos, no motion blur."',
        '"highly detailed, sharp focus on the subject, correct human anatomy, natural hands and fingers, clean image, simple uncluttered background, no extra limbs, no watermarks, no logos, no motion blur."',
    )

    # Demote global photorealistic language so the selected style can dominate.
    sanitized = re.sub(r"\\bphotorealistic\\b", "style-faithful", sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r"\\bphotorealism\\b", "style fidelity", sanitized, flags=re.IGNORECASE)

    return sanitized


def _build_style_instruction(style_name: str, style_prompt: str) -> str:
    rule = _STYLE_RULES.get(style_name)
    if rule is not None:
        return rule["directive"]

    fallback_notes = " ".join(style_prompt.split())
    return (
        f"Apply the selected style '{style_name}' as a pure visual treatment. "
        "Use only medium, line, color, lighting, and texture characteristics. "
        "Never copy concrete subjects, characters, props, or scene-specific objects from style examples. "
        f"Style notes: {fallback_notes}"
    )


def _style_rule(style_name: str, style_prompt: str) -> dict:
    rule = _STYLE_RULES.get(style_name)
    if rule is not None:
        return rule

    return {
        "directive": _build_style_instruction(style_name, style_prompt),
        "must": ["clear dominant style language", "content preserved from input image", "consistent visual treatment"],
        "forbid": _COMMON_FORBIDDEN,
        "word_range": (90, 150),
    }


def _compose_system_prompt(style_name: str, style_prompt: str, base_prompt: str) -> str:
    style_rule = _style_rule(style_name, style_prompt)
    style_instruction = style_rule["directive"]
    must = list(style_rule["must"])
    forbid = list(_COMMON_FORBIDDEN) + list(style_rule["forbid"])
    transform_policy = _STYLE_TRANSFORM_POLICY.get(
        style_name,
        "Apply style treatment strongly while preserving semantic content from the input image.",
    )

    optional_reference_block = ""
    if style_name == "photorealistic" and base_prompt:
        optional_reference_block = (
            "PHOTOREALISTIC REFERENCE ENGINE:\n"
            f"{_neutralize_base_prompt(base_prompt)}\n\n"
        )

    must_text = "; ".join(must)
    forbid_text = "; ".join(forbid)

    return (
        "You are a style-locked multimodal prompt compiler.\n"
        f"Selected style id: {style_name}\n\n"
        "TASK:\n"
        "1. Analyze the input image only for content: subject, pose/action, composition, background context, and key readable text.\n"
        "2. Ignore the original visual style of the input image.\n"
        "3. Rewrite the content as one final generation-ready prompt in the selected style.\n\n"
        "STYLE LOCK (AUTHORITATIVE):\n"
        f"- {style_instruction}\n"
        f"- Transformation policy: {transform_policy}\n"
        f"- Required cues: {must_text}.\n"
        f"- Forbidden cues: {forbid_text}.\n"
        "- Use concise high-signal language: neither too short nor verbose.\n\n"
        f"{optional_reference_block}"
        "HARD CONSTRAINTS:\n"
        "- If any instruction conflicts with STYLE LOCK, STYLE LOCK wins.\n"
        "- Preserve identity and semantic content from input image; style is a treatment layer only.\n"
        "- Do not import subjects, props, costumes, species, or setting objects from style examples.\n"
        "- Do not mention ducks unless a duck is visibly present in the input image.\n"
        "- Output exactly one paragraph with no labels, no bullets, and no commentary.\n\n"
        "OUTPUT CONTRACT (ABSOLUTE):\n"
        "- Return only the final prompt text and nothing else.\n"
        "- Do not output metadata, notes, confidence, analysis, or internal reasoning.\n"
        "- Do not output prefixes/suffixes such as 'Prompt:', 'Final Prompt:', 'Word count:', or 'Tokens:'.\n"
        "- Do not output markdown, code blocks, numbered lists, XML/JSON, or quoted wrappers.\n"
        "- Do not output <think> tags or any hidden-thought traces."
    )


class DuffyImageStyler(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        style_options = _discover_style_options()
        if not style_options:
            style_options = ["photorealistic"]

        return io.Schema(
            node_id="Duffy_ImageStyler",
            display_name="Image Styler",
            category="Duffy/LLM",
            description=(
                "Outputs a style-aware system prompt for multimodal LLM analyzer nodes. "
                "Style prompts are loaded from assets/image_styler/*.txt."
            ),
            inputs=[
                io.Combo.Input(
                    "style",
                    options=style_options,
                    default=style_options[0],
                    tooltip="Select a style profile from assets/image_styler.",
                ),
            ],
            outputs=[
                io.String.Output(
                    "system_prompt",
                    display_name="System Prompt",
                    tooltip="Styled system prompt for LLM node system_prompt input.",
                ),
            ],
        )

    @classmethod
    def validate_inputs(cls, style: str, **kwargs) -> bool | str:
        try:
            style_path = _style_prompt_path(style)
        except ValueError as exc:
            return str(exc)

        if not style_path.exists():
            return f"Style prompt not found for '{style}'"

        try:
            style_prompt = _read_text_file(style_path)
            if not style_prompt:
                return f"Style prompt file is empty for '{style}'"

            if style == "photorealistic":
                if not BASE_PROMPT_FILE.exists():
                    return "Base style prompt missing: assets/image_styler/photorealistic_prompt.txt"

                base_prompt = _read_text_file(BASE_PROMPT_FILE)
                if not base_prompt:
                    return "Base style prompt is empty: photorealistic_prompt.txt"
        except Exception as exc:
            return f"Failed reading style prompts: {exc}"

        return True

    @classmethod
    def fingerprint_inputs(cls, style: str, **kwargs) -> tuple[str, tuple[str, int, int], tuple[str, int, int]]:
        style_path: Optional[Path] = None
        try:
            style_path = _style_prompt_path(style)
        except ValueError:
            # Keep fingerprint deterministic even for invalid style values.
            pass

        return (
            style,
            _file_signature(BASE_PROMPT_FILE),
            _file_signature(style_path) if style_path else ("invalid-style", -1, -1),
        )

    @classmethod
    def execute(cls, style: str, **kwargs) -> io.NodeOutput:
        style_prompt = _read_text_file(_style_prompt_path(style))
        base_prompt = ""
        if style == "photorealistic" and BASE_PROMPT_FILE.exists():
            base_prompt = _read_text_file(BASE_PROMPT_FILE)
        composed_prompt = _compose_system_prompt(style, style_prompt, base_prompt)
        return io.NodeOutput(composed_prompt, ui={"text": [composed_prompt]})
