"""
Duffy Resolution Selector (V3 Schema)
Megapixel-driven resolution calculator supporting common square, landscape,
portrait, photo/print, cinema, and social media aspect ratios with a freely
configurable divisibility constraint.
"""

import math

from comfy_api.latest import io

PIXELS_PER_MEGAPIXEL = 1_000_000.0

ASPECT_RATIOS: dict[str, tuple[float, float]] = {
    # Square
    "1:1 — Square (Instagram, Avatar)": (1.0, 1.0),
    # Landscape — Photo, Print & Display
    "5:4 — Landscape (Large Format, 8×10)": (5.0, 4.0),
    "4:3 — Landscape (Classic Photo, Tablet)": (4.0, 3.0),
    "7:5 — Landscape (5×7 Print, ISO-A)": (7.0, 5.0),
    "3:2 — Landscape (35mm DSLR, Photo)": (3.0, 2.0),
    "16:10 — Landscape (Widescreen Display)": (16.0, 10.0),
    # Landscape — Video, Social Media & Cinema
    "16:9 — Landscape (YouTube, HD Video, X/Twitter)": (16.0, 9.0),
    "1.91:1 — Landscape (Social Link Card, OG / Ad)": (191.0, 100.0),
    "2:1 — Landscape (Univisium, X Single Image)": (2.0, 1.0),
    "19.5:9 — Landscape (Smartphone Fullscreen)": (195.0, 90.0),
    "21:9 — Landscape (Ultrawide, Cinema)": (21.0, 9.0),
    "2.39:1 — Landscape (Anamorphic CinemaScope)": (239.0, 100.0),
    "3:1 — Landscape (X/Twitter Header Banner)": (3.0, 1.0),
    "32:9 — Landscape (Super Ultrawide)": (32.0, 9.0),
    "4:1 — Landscape (LinkedIn Cover Banner)": (4.0, 1.0),
    # Portrait — Photo, Print & Social Media
    "4:5 — Portrait (Instagram Feed, Facebook)": (4.0, 5.0),
    "3:4 — Portrait (Instagram Grid, Editorial)": (3.0, 4.0),
    "5:7 — Portrait (5×7 Print, ISO-A)": (5.0, 7.0),
    "2:3 — Portrait (Pinterest Pin, 35mm Portrait)": (2.0, 3.0),
    "10:16 — Portrait (Vertical Poster)": (10.0, 16.0),
    "9:16 — Portrait (TikTok, Reels, Shorts, Stories)": (9.0, 16.0),
    "1:2 — Portrait (Pinterest Long Pin, Tall Mobile)": (1.0, 2.0),
    "9:19.5 — Portrait (Smartphone Wallpaper)": (90.0, 195.0),
    "9:21 — Portrait (Ultra-Tall Vertical, Webtoon)": (9.0, 21.0),
}

DEFAULT_ASPECT_RATIO = "1:1 — Square (Instagram, Avatar)"


def calculate_resolution(
    megapixels: float,
    ratio_w: float,
    ratio_h: float,
    divisible_by: int,
) -> tuple[int, int]:
    """
    Calculate (width, height) from target megapixels, aspect ratio (ratio_w:ratio_h),
    and divisibility constraint.

    Both dimensions are computed symmetrically from the target pixel budget and
    snapped to the nearest positive multiple of ``divisible_by``.
    """
    if not math.isfinite(megapixels) or megapixels <= 0.0:
        raise ValueError(f"megapixels must be a finite positive number, got {megapixels!r}")
    if not math.isfinite(ratio_w) or not math.isfinite(ratio_h) or ratio_w <= 0.0 or ratio_h <= 0.0:
        raise ValueError(f"aspect ratio components must be finite positive numbers, got ({ratio_w!r}, {ratio_h!r})")
    if isinstance(divisible_by, bool) or not isinstance(divisible_by, int) or divisible_by < 1:
        raise ValueError(f"divisible_by must be an integer >= 1, got {divisible_by!r}")

    target_pixels = megapixels * PIXELS_PER_MEGAPIXEL

    exact_w = math.sqrt(target_pixels * ratio_w / ratio_h)
    exact_h = math.sqrt(target_pixels * ratio_h / ratio_w)

    width = max(divisible_by, int(round(exact_w / divisible_by)) * divisible_by)
    height = max(divisible_by, int(round(exact_h / divisible_by)) * divisible_by)

    return width, height


class DuffyResolutionSelector(io.ComfyNode):
    """
    Megapixel-driven resolution selector supporting square, landscape, portrait,
    and social media aspect ratios with a freely configurable divisibility constraint.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_ResolutionSelector",
            display_name="Duffy Resolution Selector",
            category="Duffy/Selectors",
            description=(
                "Calculates pixel width and height from a target megapixel count, "
                "a selected aspect ratio (square, landscape, portrait, and social media formats), "
                "and a user-configurable divisibility constraint."
            ),
            search_aliases=[
                "resolution",
                "aspect ratio",
                "megapixel",
                "dimensions",
                "width",
                "height",
            ],
            inputs=[
                io.Float.Input(
                    "megapixels",
                    display_name="Megapixels",
                    default=1.0,
                    min=0.01,
                    max=64.0,
                    step=0.01,
                    round=0.001,
                    display_mode=io.NumberDisplay.number,
                    tooltip="Target total pixel count in megapixels (1.0 MP = 1,000,000 pixels).",
                ),
                io.Combo.Input(
                    "aspect_ratio",
                    options=list(ASPECT_RATIOS.keys()),
                    display_name="Aspect Ratio",
                    default=DEFAULT_ASPECT_RATIO,
                    tooltip="Target aspect ratio and orientation (Square, Landscape, or Portrait).",
                ),
                io.Int.Input(
                    "divisible_by",
                    display_name="Divisible By",
                    default=16,
                    min=1,
                    max=512,
                    step=1,
                    display_mode=io.NumberDisplay.number,
                    tooltip=(
                        "Both output width and height are rounded to the nearest multiple of "
                        "this value (e.g. 8, 16, 32, 64, or any custom positive integer)."
                    ),
                ),
            ],
            outputs=[
                io.Int.Output(
                    "width",
                    display_name="Width",
                    tooltip="Calculated image width in pixels, snapped to a multiple of Divisible By.",
                ),
                io.Int.Output(
                    "height",
                    display_name="Height",
                    tooltip="Calculated image height in pixels, snapped to a multiple of Divisible By.",
                ),
            ],
        )

    @classmethod
    def validate_inputs(
        cls,
        megapixels: float | None = None,
        aspect_ratio: str | None = None,
        divisible_by: int | None = None,
    ) -> bool | str:
        if megapixels is not None:
            if not math.isfinite(megapixels) or megapixels <= 0.0:
                return "Megapixels must be a finite number greater than 0."
        if aspect_ratio is not None:
            if aspect_ratio not in ASPECT_RATIOS:
                return f"Unknown aspect ratio: {aspect_ratio!r}"
        if divisible_by is not None:
            if isinstance(divisible_by, bool) or not isinstance(divisible_by, int) or divisible_by < 1:
                return "Divisible By must be an integer greater than or equal to 1."
        return True

    @classmethod
    def fingerprint_inputs(
        cls,
        megapixels: float,
        aspect_ratio: str,
        divisible_by: int,
    ) -> str:
        return f"{megapixels:.6f}|{aspect_ratio}|{divisible_by}"

    @classmethod
    def execute(
        cls,
        megapixels: float,
        aspect_ratio: str,
        divisible_by: int,
    ) -> io.NodeOutput:
        if aspect_ratio not in ASPECT_RATIOS:
            raise ValueError(f"Unknown aspect ratio: {aspect_ratio!r}")

        ratio_w, ratio_h = ASPECT_RATIOS[aspect_ratio]
        width, height = calculate_resolution(
            megapixels=float(megapixels),
            ratio_w=ratio_w,
            ratio_h=ratio_h,
            divisible_by=divisible_by,
        )
        return io.NodeOutput(width, height)
