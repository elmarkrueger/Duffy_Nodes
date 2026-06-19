import os
import sys
import unittest

# Ensure ComfyUI path is available first
sys.path.insert(0, r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")

# Import prompt_splitter directly from file
import importlib.util
file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "nodes", "prompt_splitter.py")
spec = importlib.util.spec_from_file_location("nodes.prompt_splitter", file_path)
prompt_splitter = importlib.util.module_from_spec(spec)
sys.modules["nodes.prompt_splitter"] = prompt_splitter
spec.loader.exec_module(prompt_splitter)

DuffyPromptSplitter = prompt_splitter.DuffyPromptSplitter


class TestPromptSplitter(unittest.TestCase):
    def test_pipe_separator(self):
        result = DuffyPromptSplitter.execute("positive prompt | negative prompt", "|")
        self.assertEqual(result[0], "positive prompt")
        self.assertEqual(result[1], "negative prompt")

    def test_pipe_separator_multiline(self):
        text = """This is a positive prompt
with multiple lines.
|
This is a negative prompt
with multiple lines."""
        result = DuffyPromptSplitter.execute(text, "|")
        self.assertEqual(result[0], "This is a positive prompt\nwith multiple lines.")
        self.assertEqual(result[1], "This is a negative prompt\nwith multiple lines.")

    def test_newline_separator(self):
        text = "positive prompt\nnegative prompt"
        result_escaped = DuffyPromptSplitter.execute(text, "\\n")
        self.assertEqual(result_escaped[0], "positive prompt")
        self.assertEqual(result_escaped[1], "negative prompt")

        result_raw = DuffyPromptSplitter.execute(text, "\n")
        self.assertEqual(result_raw[0], "positive prompt")
        self.assertEqual(result_raw[1], "negative prompt")

    def test_comma_separator(self):
        result = DuffyPromptSplitter.execute("pos,neg", ",")
        self.assertEqual(result[0], "pos")
        self.assertEqual(result[1], "neg")

    def test_missing_separator(self):
        result = DuffyPromptSplitter.execute("only positive prompt", "|")
        self.assertEqual(result[0], "only positive prompt")
        self.assertEqual(result[1], "")

    def test_multiple_separators(self):
        result = DuffyPromptSplitter.execute("pos | neg | extra", "|")
        self.assertEqual(result[0], "pos")
        self.assertEqual(result[1], "neg | extra")


if __name__ == "__main__":
    unittest.main()
