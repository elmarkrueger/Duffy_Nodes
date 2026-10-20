import importlib.util
import os
import sys
import unittest

# Ensure ComfyUI path is available first
sys.path.insert(0, r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")

# Import integer_compare directly from file
file_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "nodes",
    "integer_compare.py",
)
spec = importlib.util.spec_from_file_location("nodes.integer_compare", file_path)
integer_compare = importlib.util.module_from_spec(spec)
sys.modules["nodes.integer_compare"] = integer_compare
spec.loader.exec_module(integer_compare)

DuffyIntegerCompare = integer_compare.DuffyIntegerCompare


class TestIntegerCompare(unittest.TestCase):
    def test_schema(self):
        schema = DuffyIntegerCompare.define_schema()
        self.assertEqual(schema.node_id, "Duffy_IntegerCompare")
        self.assertEqual(schema.category, "Duffy/Logic")
        self.assertEqual(len(schema.inputs), 3)
        self.assertEqual(len(schema.outputs), 2)

    def test_less_than_true(self):
        output = DuffyIntegerCompare.execute(1024, "Less Than (<)", 2048)
        self.assertEqual(output[0], 1024)
        self.assertTrue(output[1])

    def test_less_than_false(self):
        output = DuffyIntegerCompare.execute(2048, "Less Than (<)", 1024)
        self.assertEqual(output[0], 1024)
        self.assertFalse(output[1])

    def test_less_than_equal(self):
        output = DuffyIntegerCompare.execute(1024, "Less Than (<)", 1024)
        self.assertEqual(output[0], 1024)
        self.assertFalse(output[1])

    def test_greater_than_true(self):
        output = DuffyIntegerCompare.execute(2048, "Greater Than (>)", 1024)
        self.assertEqual(output[0], 2048)
        self.assertTrue(output[1])

    def test_greater_than_false(self):
        output = DuffyIntegerCompare.execute(1024, "Greater Than (>)", 2048)
        self.assertEqual(output[0], 2048)
        self.assertFalse(output[1])

    def test_greater_than_equal(self):
        output = DuffyIntegerCompare.execute(1024, "Greater Than (>)", 1024)
        self.assertEqual(output[0], 1024)
        self.assertFalse(output[1])

    def test_negative_and_extreme_values(self):
        output_lt = DuffyIntegerCompare.execute(-2147483648, "Less Than (<)", 2147483647)
        self.assertEqual(output_lt[0], -2147483648)
        self.assertTrue(output_lt[1])

        output_gt = DuffyIntegerCompare.execute(-2147483648, "Greater Than (>)", 2147483647)
        self.assertEqual(output_gt[0], 2147483647)
        self.assertFalse(output_gt[1])

    def test_fingerprint_inputs(self):
        fp1 = DuffyIntegerCompare.fingerprint_inputs(1024, "Less Than (<)", 2048)
        fp2 = DuffyIntegerCompare.fingerprint_inputs(1024, "Greater Than (>)", 2048)
        self.assertIsInstance(fp1, str)
        self.assertNotEqual(fp1, fp2)


if __name__ == "__main__":
    unittest.main()
