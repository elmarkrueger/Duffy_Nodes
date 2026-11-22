import importlib.util
import math
import os
import sys
import unittest

# Ensure ComfyUI path is available first
sys.path.insert(0, r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE_FILE = os.path.join(REPO_ROOT, "nodes", "resolution_selector.py")

spec = importlib.util.spec_from_file_location("nodes.resolution_selector", NODE_FILE)
resolution_selector = importlib.util.module_from_spec(spec)
sys.modules["nodes.resolution_selector"] = resolution_selector
spec.loader.exec_module(resolution_selector)

DuffyResolutionSelector = resolution_selector.DuffyResolutionSelector
ASPECT_RATIOS = resolution_selector.ASPECT_RATIOS
DEFAULT_ASPECT_RATIO = resolution_selector.DEFAULT_ASPECT_RATIO
calculate_resolution = resolution_selector.calculate_resolution


class TestDuffyResolutionSelector(unittest.TestCase):
    def test_schema(self):
        schema = DuffyResolutionSelector.define_schema()
        self.assertEqual(schema.node_id, "Duffy_ResolutionSelector")
        self.assertEqual(schema.display_name, "Duffy Resolution Selector")
        self.assertEqual(schema.category, "Duffy/Selectors")
        self.assertEqual(len(schema.inputs), 3)
        self.assertEqual(len(schema.outputs), 2)

        input_ids = [inp.id for inp in schema.inputs]
        self.assertEqual(input_ids, ["megapixels", "aspect_ratio", "divisible_by"])

        output_ids = [out.id for out in schema.outputs]
        self.assertEqual(output_ids, ["width", "height"])

        combo_input = schema.inputs[1]
        self.assertIn(DEFAULT_ASPECT_RATIO, combo_input.options)
        self.assertEqual(len(combo_input.options), 24)

    def test_all_aspect_ratios_divisibility_and_orientation(self):
        for label, (rw, rh) in ASPECT_RATIOS.items():
            for divisible_by in (1, 8, 16, 32, 64):
                with self.subTest(aspect_ratio=label, divisible_by=divisible_by):
                    output = DuffyResolutionSelector.execute(1.0, label, divisible_by)
                    width, height = output[0], output[1]

                    self.assertIsInstance(width, int)
                    self.assertIsInstance(height, int)
                    self.assertGreaterEqual(width, divisible_by)
                    self.assertGreaterEqual(height, divisible_by)
                    self.assertEqual(width % divisible_by, 0)
                    self.assertEqual(height % divisible_by, 0)

                    if rw == rh:
                        self.assertEqual(width, height)
                    elif rw > rh:
                        self.assertGreater(width, height)
                    else:
                        self.assertGreater(height, width)

    def test_transpose_symmetry_for_landscape_portrait_pairs(self):
        pairs = [
            ("5:4 — Landscape (Large Format, 8×10)", "4:5 — Portrait (Instagram Feed, Facebook)"),
            ("4:3 — Landscape (Classic Photo, Tablet)", "3:4 — Portrait (Instagram Grid, Editorial)"),
            ("7:5 — Landscape (5×7 Print, ISO-A)", "5:7 — Portrait (5×7 Print, ISO-A)"),
            ("3:2 — Landscape (35mm DSLR, Photo)", "2:3 — Portrait (Pinterest Pin, 35mm Portrait)"),
            ("16:10 — Landscape (Widescreen Display)", "10:16 — Portrait (Vertical Poster)"),
            ("16:9 — Landscape (YouTube, HD Video, X/Twitter)", "9:16 — Portrait (TikTok, Reels, Shorts, Stories)"),
            ("2:1 — Landscape (Univisium, X Single Image)", "1:2 — Portrait (Pinterest Long Pin, Tall Mobile)"),
            ("19.5:9 — Landscape (Smartphone Fullscreen)", "9:19.5 — Portrait (Smartphone Wallpaper)"),
            ("21:9 — Landscape (Ultrawide, Cinema)", "9:21 — Portrait (Ultra-Tall Vertical, Webtoon)"),
        ]
        for landscape, portrait in pairs:
            for mp in (0.5, 1.0, 2.0, 4.0):
                for div in (8, 16, 32, 64):
                    with self.subTest(landscape=landscape, portrait=portrait, mp=mp, div=div):
                        lw, lh = DuffyResolutionSelector.execute(mp, landscape, div)
                        pw, ph = DuffyResolutionSelector.execute(mp, portrait, div)
                        self.assertEqual(lw, ph)
                        self.assertEqual(lh, pw)

    def test_reference_outputs(self):
        # 1.0 MP Square
        self.assertEqual(tuple(DuffyResolutionSelector.execute(1.0, DEFAULT_ASPECT_RATIO, 8)), (1000, 1000))
        self.assertEqual(tuple(DuffyResolutionSelector.execute(1.0, DEFAULT_ASPECT_RATIO, 16)), (992, 992))
        self.assertEqual(tuple(DuffyResolutionSelector.execute(1.0, DEFAULT_ASPECT_RATIO, 32)), (992, 992))
        self.assertEqual(tuple(DuffyResolutionSelector.execute(1.0, DEFAULT_ASPECT_RATIO, 64)), (1024, 1024))

        # 1.0 MP 4:5 Portrait (Instagram Feed)
        ratio_4_5 = "4:5 — Portrait (Instagram Feed, Facebook)"
        self.assertEqual(tuple(DuffyResolutionSelector.execute(1.0, ratio_4_5, 16)), (896, 1120))

        # Full HD 1920x1080 = 2.0736 MP at 16:9 with div=8
        ratio_16_9 = "16:9 — Landscape (YouTube, HD Video, X/Twitter)"
        self.assertEqual(tuple(DuffyResolutionSelector.execute(2.0736, ratio_16_9, 8)), (1920, 1080))

        # 1.0 MP 16:9 with div=16
        self.assertEqual(tuple(DuffyResolutionSelector.execute(1.0, ratio_16_9, 16)), (1328, 752))

    def test_custom_and_non_power_of_two_divisible_by(self):
        ratio_16_9 = "16:9 — Landscape (YouTube, HD Video, X/Twitter)"
        for div in (1, 2, 3, 7, 12, 24, 48, 100, 128):
            with self.subTest(divisible_by=div):
                w, h = DuffyResolutionSelector.execute(1.5, ratio_16_9, div)
                self.assertEqual(w % div, 0)
                self.assertEqual(h % div, 0)
                self.assertGreaterEqual(w, div)
                self.assertGreaterEqual(h, div)

    def test_extreme_bounds(self):
        # Very low megapixels + large divisible_by must never produce 0
        ratio_32_9 = "32:9 — Landscape (Super Ultrawide)"
        w, h = DuffyResolutionSelector.execute(0.01, ratio_32_9, 64)
        self.assertGreaterEqual(w, 64)
        self.assertGreaterEqual(h, 64)
        self.assertEqual(w % 64, 0)
        self.assertEqual(h % 64, 0)

        # High megapixels (64 MP)
        w_hi, h_hi = DuffyResolutionSelector.execute(64.0, DEFAULT_ASPECT_RATIO, 32)
        self.assertEqual((w_hi, h_hi), (8000, 8000))

    def test_validate_inputs(self):
        self.assertIs(DuffyResolutionSelector.validate_inputs(1.0, DEFAULT_ASPECT_RATIO, 16), True)
        # Linked inputs arrive as None during validation
        self.assertIs(DuffyResolutionSelector.validate_inputs(None, None, None), True)
        self.assertIs(DuffyResolutionSelector.validate_inputs(1.0, None, 8), True)

        self.assertIsInstance(DuffyResolutionSelector.validate_inputs(0.0, DEFAULT_ASPECT_RATIO, 16), str)
        self.assertIsInstance(DuffyResolutionSelector.validate_inputs(-1.0, DEFAULT_ASPECT_RATIO, 16), str)
        self.assertIsInstance(DuffyResolutionSelector.validate_inputs(float("nan"), DEFAULT_ASPECT_RATIO, 16), str)
        self.assertIsInstance(DuffyResolutionSelector.validate_inputs(float("inf"), DEFAULT_ASPECT_RATIO, 16), str)
        self.assertIsInstance(DuffyResolutionSelector.validate_inputs(1.0, "99:1 — Fake", 16), str)
        self.assertIsInstance(DuffyResolutionSelector.validate_inputs(1.0, DEFAULT_ASPECT_RATIO, 0), str)
        self.assertIsInstance(DuffyResolutionSelector.validate_inputs(1.0, DEFAULT_ASPECT_RATIO, -8), str)
        self.assertIsInstance(DuffyResolutionSelector.validate_inputs(1.0, DEFAULT_ASPECT_RATIO, True), str)

    def test_execute_invalid_dynamic_inputs(self):
        with self.assertRaises(ValueError):
            DuffyResolutionSelector.execute(0.0, DEFAULT_ASPECT_RATIO, 16)
        with self.assertRaises(ValueError):
            DuffyResolutionSelector.execute(float("nan"), DEFAULT_ASPECT_RATIO, 16)
        with self.assertRaises(ValueError):
            DuffyResolutionSelector.execute(1.0, "unknown", 16)
        with self.assertRaises(ValueError):
            DuffyResolutionSelector.execute(1.0, DEFAULT_ASPECT_RATIO, 0)
        with self.assertRaises(ValueError):
            calculate_resolution(1.0, 0.0, 1.0, 16)

    def test_fingerprint_inputs(self):
        fp1 = DuffyResolutionSelector.fingerprint_inputs(1.0, DEFAULT_ASPECT_RATIO, 16)
        fp2 = DuffyResolutionSelector.fingerprint_inputs(1.0, DEFAULT_ASPECT_RATIO, 32)
        fp3 = DuffyResolutionSelector.fingerprint_inputs(2.0, DEFAULT_ASPECT_RATIO, 16)
        fp_same = DuffyResolutionSelector.fingerprint_inputs(1.0, DEFAULT_ASPECT_RATIO, 16)

        self.assertIsInstance(fp1, str)
        self.assertNotIsInstance(fp1, bool)
        self.assertEqual(fp1, fp_same)
        self.assertNotEqual(fp1, fp2)
        self.assertNotEqual(fp1, fp3)

    def test_registration_in_nodes_init(self):
        init_path = os.path.join(REPO_ROOT, "nodes", "__init__.py")
        with open(init_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("from .resolution_selector import DuffyResolutionSelector", content)
        self.assertIn("DuffyResolutionSelector,", content)


if __name__ == "__main__":
    unittest.main()
