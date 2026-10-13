import importlib.util
import json
import math
import os
import sys
import unittest

import torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURES = os.path.join(ROOT, "tests", "fixtures", "overlay_transform_cases.json")

spec = importlib.util.spec_from_file_location(
    "interactive_overlay_math", os.path.join(ROOT, "nodes", "interactive_overlay_math.py")
)
om = importlib.util.module_from_spec(spec)
sys.modules["interactive_overlay_math"] = om
spec.loader.exec_module(om)


def _state(**overrides):
    state = {"translation_norm": [0.5, 0.5], "scale_factors": [1.0, 1.0], "rotation_deg": 0.0, "anchor_point": [0.5, 0.5]}
    state.update(overrides)
    return state


class TestTransformMath(unittest.TestCase):
    def test_golden_fixture_corners(self):
        with open(FIXTURES, encoding="utf-8") as fh:
            cases = json.load(fh)["cases"]
        self.assertGreaterEqual(len(cases), 5)
        for case in cases:
            with self.subTest(case=case["name"]):
                corners = om.transformed_corners(case["state"], tuple(case["bg_size"]), tuple(case["overlay_size"]))
                for got, expected in zip(corners, case["expected_corners_px"]):
                    self.assertAlmostEqual(got[0], expected[0], delta=1e-4)
                    self.assertAlmostEqual(got[1], expected[1], delta=1e-4)

    def test_positive_rotation_is_ccw_on_screen(self):
        # Top-right corner of a centered overlay should move up (smaller y) and left when rotated +90.
        corners = om.transformed_corners(_state(rotation_deg=90), (100, 100), (20, 20))
        tr = corners[1]
        self.assertAlmostEqual(tr[0], 40.0, places=6)
        self.assertAlmostEqual(tr[1], 40.0, places=6)
        tl = corners[0]
        self.assertAlmostEqual(tl[0], 40.0, places=6)
        self.assertAlmostEqual(tl[1], 60.0, places=6)

    def test_default_scale_fits_half_without_upscaling(self):
        self.assertAlmostEqual(om.default_scale((1000, 1000), (4000, 1000)), 0.125)
        self.assertEqual(om.default_scale((1000, 1000), (100, 100)), 1.0)

    def test_validate_rejects_bad_payloads(self):
        for bad in [None, [], {"translation_norm": [float("nan"), 0.5]}, {"scale_factors": [0, 1]},
                    {"scale_factors": [1]}, {"blend_mode": "darken"}, {"rotation_deg": "abc"},
                    {"translation_norm": [float("inf"), 0]}]:
            with self.subTest(bad=bad):
                with self.assertRaises((ValueError, TypeError)):
                    om.validate_transform(bad)

    def test_validate_clamps_extremes(self):
        state = om.validate_transform({"scale_factors": [1e9, -1e-9], "opacity": 7, "rotation_deg": 540,
                                       "anchor_point": [99, -99]})
        self.assertEqual(state["scale_factors"], [om.MAX_SCALE, -om.MIN_SCALE])
        self.assertEqual(state["opacity"], 1.0)
        self.assertAlmostEqual(state["rotation_deg"], -180.0)
        self.assertEqual(state["anchor_point"], [om.ANCHOR_MAX, om.ANCHOR_MIN])

    def test_parse_saved_state_lenient(self):
        self.assertIsNone(om.parse_saved_state("{}"))
        self.assertIsNone(om.parse_saved_state("not json"))
        self.assertIsNone(om.parse_saved_state(""))
        parsed = om.parse_saved_state(json.dumps(_state(rotation_deg=10)))
        self.assertEqual(parsed["rotation_deg"], 10.0)


class TestCompositing(unittest.TestCase):
    def test_identity_reproduces_overlay(self):
        bg = torch.zeros(1, 64, 64, 3)
        ov = torch.rand(1, 64, 64, 3)
        image, mask = om.composite_batch(bg, ov, _state(), "normal", 1.0)
        # Bicubic at integer alignment is exact in the interior.
        torch.testing.assert_close(image[0, 2:-2, 2:-2], ov[0, 2:-2, 2:-2], atol=1e-4, rtol=0)
        self.assertTrue(torch.all(mask[0, 2:-2, 2:-2] > 0.999))

    def test_rotation_is_rigid_on_widescreen(self):
        # A 100x100 white square rotated 90 on a 1920x800 canvas must stay square (no skew).
        bg = torch.zeros(1, 800, 1920, 3)
        ov = torch.ones(1, 100, 100, 3)
        _, mask = om.composite_batch(bg, ov, _state(rotation_deg=90), "normal", 1.0)
        footprint = mask[0] > 0.5
        rows = torch.nonzero(footprint.any(1)).flatten()
        cols = torch.nonzero(footprint.any(0)).flatten()
        height = int(rows.max() - rows.min() + 1)
        width = int(cols.max() - cols.min() + 1)
        self.assertLessEqual(abs(height - 100), 1)
        self.assertLessEqual(abs(width - 100), 1)

    def test_premultiplied_no_dark_fringe(self):
        # White square on transparent background rotated 45: all visible RGB must stay white.
        # Transparent pixels are black RGB -- the worst case for straight-alpha fringing.
        ov = torch.zeros(1, 64, 64, 4)
        ov[:, 16:48, 16:48, :] = 1.0
        theta = om.inverse_theta(_state(rotation_deg=45), (64, 64), (64, 64))
        warped = om.warp_overlay(om.to_rgba_chw(ov[0]), theta, (64, 64))
        visible = warped[3] > 0.02
        self.assertTrue(visible.any())
        self.assertGreater(float(warped[:3, visible].min()), 0.98)
        self.assertLessEqual(float(warped.max()), 1.0)
        self.assertGreaterEqual(float(warped.min()), 0.0)

    def test_blend_modes_reference_values(self):
        a = torch.tensor([0.6]).view(1, 1, 1)
        b_dark = torch.tensor([0.25]).view(1, 1, 1)
        b_light = torch.tensor([0.75]).view(1, 1, 1)
        self.assertAlmostEqual(float(om.blend("normal", a, b_dark)), 0.6, places=6)
        self.assertAlmostEqual(float(om.blend("multiply", a, b_dark)), 0.15, places=6)
        self.assertAlmostEqual(float(om.blend("screen", a, b_dark)), 1 - 0.4 * 0.75, places=6)
        self.assertAlmostEqual(float(om.blend("overlay", a, b_dark)), 2 * 0.6 * 0.25, places=6)
        self.assertAlmostEqual(float(om.blend("overlay", a, b_light)), 1 - 2 * 0.4 * 0.25, places=6)
        self.assertAlmostEqual(float(om.blend("add", a, b_light)), 1.0, places=6)

    def test_opacity_and_mask_convention(self):
        bg = torch.zeros(1, 32, 32, 3)
        ov = torch.ones(1, 32, 32, 3)
        image, mask = om.composite_batch(bg, ov, _state(), "normal", 0.25)
        self.assertAlmostEqual(float(mask[0, 16, 16]), 0.25, places=4)  # 1.0 == overlay present, includes opacity
        self.assertAlmostEqual(float(image[0, 16, 16, 0]), 0.25, places=4)
        _, zero_mask = om.composite_batch(bg, ov, _state(), "normal", 0.0)
        self.assertEqual(float(zero_mask.max()), 0.0)

    def test_rgb_overlay_gets_solid_alpha_and_rgba_preserved(self):
        bg = torch.zeros(1, 16, 16, 3)
        rgba = torch.ones(1, 16, 16, 4)
        rgba[..., 3] = 0.5
        _, mask = om.composite_batch(bg, rgba, _state(), "normal", 1.0)
        self.assertAlmostEqual(float(mask[0, 8, 8]), 0.5, places=3)
        _, solid = om.composite_batch(bg, rgba[..., :3], _state(), "normal", 1.0)
        self.assertAlmostEqual(float(solid[0, 8, 8]), 1.0, places=3)

    def test_rgba_background_keeps_channels(self):
        bg = torch.zeros(2, 16, 16, 4)
        ov = torch.ones(1, 8, 8, 3)
        image, mask = om.composite_batch(bg, ov, _state(), "normal", 1.0)
        self.assertEqual(tuple(image.shape), (2, 16, 16, 4))
        self.assertEqual(tuple(mask.shape), (2, 16, 16))
        self.assertAlmostEqual(float(image[1, 8, 8, 3]), 1.0, places=4)

    def test_batch_broadcast_and_mismatch(self):
        bg = torch.zeros(3, 16, 16, 3)
        image, _ = om.composite_batch(bg, torch.ones(1, 8, 8, 3), _state(), "normal", 1.0)
        self.assertEqual(image.shape[0], 3)
        with self.assertRaises(ValueError):
            om.composite_batch(bg, torch.ones(2, 8, 8, 3), _state(), "normal", 1.0)

    def test_extreme_inputs(self):
        tiny = torch.rand(1, 1, 1, 3)
        image, mask = om.composite_batch(tiny, tiny, _state(), "screen", 1.0)
        self.assertEqual(tuple(image.shape), (1, 1, 1, 3))
        for scale in (om.MIN_SCALE, om.MAX_SCALE):
            image, mask = om.composite_batch(torch.rand(1, 32, 48, 3), torch.rand(1, 20, 10, 3),
                                             _state(scale_factors=[scale, scale], rotation_deg=33), "add", 1.0)
            self.assertTrue(torch.isfinite(image).all())
            self.assertGreaterEqual(float(image.min()), 0.0)
            self.assertLessEqual(float(image.max()), 1.0)

    def test_transform_data_payload(self):
        data = json.loads(om.build_transform_data(_state(), (200, 100), (50, 50), "multiply", 0.5, True))
        self.assertEqual(data["bg_size"], [200, 100])
        self.assertEqual(data["blend_mode"], "multiply")
        self.assertEqual(len(data["corners_px"]), 4)
        self.assertEqual(data["corners_px"][0], [75.0, 25.0])
        self.assertTrue(data["interactive"])

    def test_signature_changes_with_content(self):
        a = torch.zeros(1, 32, 32, 3)
        b = a.clone()
        b[0, 0, 0, 0] = 1.0
        self.assertEqual(om.tensor_signature(a), om.tensor_signature(a.clone()))
        self.assertNotEqual(om.tensor_signature(a), om.tensor_signature(b))


if __name__ == "__main__":
    unittest.main()
