import os
import sys
import unittest

# Ensure ComfyUI path is available first
sys.path.insert(0, r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")

# Import five_dynamic_sliders directly from file
import importlib.util
file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "nodes", "five_dynamic_sliders.py")
spec = importlib.util.spec_from_file_location("nodes.five_dynamic_sliders", file_path)
five_dynamic_sliders = importlib.util.module_from_spec(spec)
sys.modules["nodes.five_dynamic_sliders"] = five_dynamic_sliders
spec.loader.exec_module(five_dynamic_sliders)

DuffyFiveDynamicSliders = five_dynamic_sliders.DuffyFiveDynamicSliders


class TestFiveDynamicSliders(unittest.TestCase):
    def test_default_empty_payload(self):
        # Empty payload should return exactly 5 values, all default to 0.0
        result = DuffyFiveDynamicSliders.execute("[]")
        self.assertEqual(result[0], 0.0)
        self.assertEqual(result[1], 0.0)
        self.assertEqual(result[2], 0.0)
        self.assertEqual(result[3], 0.0)
        self.assertEqual(result[4], 0.0)

    def test_invalid_payload(self):
        # Invalid JSON should fall back to defaults
        result = DuffyFiveDynamicSliders.execute("invalid json")
        self.assertEqual(result[0], 0.0)
        self.assertEqual(result[1], 0.0)
        self.assertEqual(result[2], 0.0)
        self.assertEqual(result[3], 0.0)
        self.assertEqual(result[4], 0.0)

    def test_valid_payload(self):
        # Valid JSON payload with values and varying decimals
        payload = """[
            {"label": "S1", "value": 0.1234, "min": 0, "max": 1, "step": 0.01, "decimals": 2},
            {"label": "S2", "value": 1.5, "min": 0, "max": 10, "step": 0.5, "decimals": 1},
            {"label": "S3", "value": 5.6789, "min": 0, "max": 10, "step": 0.001, "decimals": 3},
            {"label": "S4", "value": -3.0, "min": -5, "max": 5, "step": 1, "decimals": 0},
            {"label": "S5", "value": 0.5, "min": 0, "max": 1, "step": 0.1, "decimals": 2}
        ]"""
        result = DuffyFiveDynamicSliders.execute(payload)
        self.assertEqual(result[0], 0.12)
        self.assertEqual(result[1], 1.5)
        self.assertEqual(result[2], 5.679)
        self.assertEqual(result[3], -3.0)
        self.assertEqual(result[4], 0.5)

    def test_fewer_than_five_items(self):
        # Fewer than five items should pad the remaining with 0.0
        payload = """[
            {"label": "S1", "value": 1.23, "min": 0, "max": 5, "step": 0.1, "decimals": 2}
        ]"""
        result = DuffyFiveDynamicSliders.execute(payload)
        self.assertEqual(result[0], 1.23)
        self.assertEqual(result[1], 0.0)
        self.assertEqual(result[2], 0.0)
        self.assertEqual(result[3], 0.0)
        self.assertEqual(result[4], 0.0)


if __name__ == "__main__":
    unittest.main()
