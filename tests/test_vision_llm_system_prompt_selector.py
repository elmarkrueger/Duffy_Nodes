"""
Unit test suite for `DuffyVisionLLMSystemPromptSelector` (`nodes/vision_llm_system_prompt_selector.py`).

Covers:
  1. Schema V3 contract (node_id, display_name, category, inputs, outputs, tooltips).
  2. All 12 (model, use_case) combinations return non-empty, distinct system prompts
     with expected architectural signatures and restored XML/math placeholders.
  3. All 12 (model, use_case) combinations emit the exact Section 5 VLM decoding
     hyperparameters (`enable_thinking`, `temperature`, `top_p`, `top_k`,
     `presence_penalty`, `max_tokens`).
  4. `validate_inputs` accepts all valid pairs and rejects invalid models or use cases.
  5. `fingerprint_inputs` returns deterministic tuples (never a boolean).
  6. Registration in `nodes/__init__.py` `NODE_LIST`.
"""

from __future__ import annotations

import importlib.util
import os
import sys
import unittest

COMFY_ROOT = r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI"
if os.path.isdir(COMFY_ROOT) and COMFY_ROOT not in sys.path:
    sys.path.insert(0, COMFY_ROOT)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE_FILE = os.path.join(REPO_ROOT, "nodes", "vision_llm_system_prompt_selector.py")

spec = importlib.util.spec_from_file_location(
    "nodes.vision_llm_system_prompt_selector", NODE_FILE
)
assert spec is not None and spec.loader is not None
selector_mod = importlib.util.module_from_spec(spec)
sys.modules["nodes.vision_llm_system_prompt_selector"] = selector_mod
spec.loader.exec_module(selector_mod)

DuffyVisionLLMSystemPromptSelector = selector_mod.DuffyVisionLLMSystemPromptSelector
MODEL_OPTIONS = selector_mod.MODEL_OPTIONS
USE_CASE_OPTIONS = selector_mod.USE_CASE_OPTIONS
SYSTEM_PROMPTS = selector_mod.SYSTEM_PROMPTS
HYPERPARAMETERS = selector_mod.HYPERPARAMETERS


class TestDuffyVisionLLMSystemPromptSelector(unittest.TestCase):
    def test_define_schema_v3_contract(self) -> None:
        schema = DuffyVisionLLMSystemPromptSelector.define_schema()
        self.assertEqual(schema.node_id, "Duffy_VisionLLMSystemPromptSelector")
        self.assertEqual(schema.display_name, "Vision-LLM System Prompt Selector")
        self.assertEqual(schema.category, "Duffy/LLM")

        input_ids = [inp.id for inp in schema.inputs]
        self.assertEqual(input_ids, ["model", "use_case"])
        for inp in schema.inputs:
            self.assertTrue(inp.display_name, f"Input {inp.id} missing display_name")
            self.assertTrue(inp.tooltip, f"Input {inp.id} missing tooltip")

        output_ids = [out.id for out in schema.outputs]
        self.assertEqual(
            output_ids,
            [
                "system_prompt",
                "enable_thinking",
                "temperature",
                "top_p",
                "top_k",
                "presence_penalty",
                "max_tokens",
            ],
        )
        for out in schema.outputs:
            self.assertTrue(out.display_name, f"Output {out.id} missing display_name")
            self.assertTrue(out.tooltip, f"Output {out.id} missing tooltip")

    def test_all_12_prompts_present_and_clean(self) -> None:
        self.assertEqual(len(MODEL_OPTIONS), 4)
        self.assertEqual(len(USE_CASE_OPTIONS), 3)
        self.assertEqual(len(SYSTEM_PROMPTS), 12)
        self.assertEqual(len(HYPERPARAMETERS), 12)

        seen_prompts: set[str] = set()
        for model in MODEL_OPTIONS:
            for use_case in USE_CASE_OPTIONS:
                key = (model, use_case)
                self.assertIn(key, SYSTEM_PROMPTS)
                self.assertIn(key, HYPERPARAMETERS)

                out = DuffyVisionLLMSystemPromptSelector.execute(
                    model=model, use_case=use_case
                )
                values = out.args
                self.assertEqual(len(values), 7)

                (
                    system_prompt,
                    enable_thinking,
                    temperature,
                    top_p,
                    top_k,
                    presence_penalty,
                    max_tokens,
                ) = values

                self.assertIsInstance(system_prompt, str)
                self.assertGreater(len(system_prompt), 400)
                self.assertNotIn(system_prompt, seen_prompts)
                seen_prompts.add(system_prompt)

                # Ensure markdown export corruption is absent
                self.assertNotIn("inside a ... block", system_prompt)
                self.assertNotIn("After ,", system_prompt)
                self.assertNotIn("![][image", system_prompt)
                self.assertNotIn("\\<", system_prompt)
                self.assertNotIn("\\_", system_prompt)

                # Verify types of secondary hyperparameter outputs
                self.assertIsInstance(enable_thinking, bool)
                self.assertIsInstance(temperature, float)
                self.assertIsInstance(top_p, float)
                self.assertIsInstance(top_k, int)
                self.assertIsInstance(presence_penalty, float)
                self.assertIsInstance(max_tokens, int)

                # Models with enable_thinking=True must instruct <think>...</think>
                if enable_thinking:
                    self.assertIn("<think>...</think>", system_prompt)
                    self.assertIn("</think>", system_prompt)
                else:
                    self.assertEqual(model, "FLUX 3 Image Klein")
                    self.assertNotIn("<think>", system_prompt)

    def test_model_specific_signatures_and_hyperparameters(self) -> None:
        # 1. Krea-2
        for uc in USE_CASE_OPTIONS:
            res = DuffyVisionLLMSystemPromptSelector.execute("Krea-2", uc).args
            self.assertIn("Krea-2", res[0])
            self.assertEqual(res[1:], (True, 0.85, 0.95, 40, 0.0, 2048))

        # 2. MOSS-Image
        for uc in USE_CASE_OPTIONS:
            res = DuffyVisionLLMSystemPromptSelector.execute("MOSS-Image", uc).args
            self.assertIn("MOSS-Image", res[0])
            self.assertIn("abs_centralized", res[0])
            self.assertEqual(res[1:], (True, 1.0, 0.95, 40, 0.0, 16384))

        # 3. FLUX 3 Image Klein (T2I & I2P have presence_penalty=1.5; Edit has 0.0)
        res_f3_t2i = DuffyVisionLLMSystemPromptSelector.execute(
            "FLUX 3 Image Klein", "Text-to-Image (Prompt Enhancement)"
        ).args
        self.assertIn("FLUX 3 Image Klein", res_f3_t2i[0])
        self.assertIn("<id_name>", res_f3_t2i[0])
        self.assertEqual(res_f3_t2i[1:], (False, 0.0, 0.95, 20, 1.5, 3584))

        res_f3_i2p = DuffyVisionLLMSystemPromptSelector.execute(
            "FLUX 3 Image Klein", "Image-to-Prompt (Reverse Captioning)"
        ).args
        self.assertIn("<id_name>", res_f3_i2p[0])
        self.assertEqual(res_f3_i2p[1:], (False, 0.0, 0.95, 20, 1.5, 3584))

        res_f3_edit = DuffyVisionLLMSystemPromptSelector.execute(
            "FLUX 3 Image Klein", "Image Editing & Reference Conditioning"
        ).args
        self.assertIn("<ref_image_0>", res_f3_edit[0])
        self.assertEqual(res_f3_edit[1:], (False, 0.0, 0.95, 20, 0.0, 3584))

        # 4. Qwen-Image-2.1 (T2I & I2P have max_tokens=16256; Edit has 24000)
        res_q_t2i = DuffyVisionLLMSystemPromptSelector.execute(
            "Qwen-Image-2.1", "Text-to-Image (Prompt Enhancement)"
        ).args
        self.assertIn("This is an RGBA image with transparency.", res_q_t2i[0])
        self.assertEqual(res_q_t2i[1:], (True, 1.0, 0.95, 20, 0.0, 16256))

        res_q_i2p = DuffyVisionLLMSystemPromptSelector.execute(
            "Qwen-Image-2.1", "Image-to-Prompt (Reverse Captioning)"
        ).args
        self.assertEqual(res_q_i2p[1:], (True, 1.0, 0.95, 20, 0.0, 16256))

        res_q_edit = DuffyVisionLLMSystemPromptSelector.execute(
            "Qwen-Image-2.1", "Image Editing & Reference Conditioning"
        ).args
        self.assertIn("Single Image (N = 1)", res_q_edit[0])
        self.assertIn("Multiple Images (N >= 2, up to 10)", res_q_edit[0])
        self.assertIn("<image1>", res_q_edit[0])
        self.assertEqual(res_q_edit[1:], (True, 1.0, 0.95, 20, 0.0, 24000))

    def test_validate_and_fingerprint_inputs(self) -> None:
        for model in MODEL_OPTIONS:
            for use_case in USE_CASE_OPTIONS:
                self.assertIs(
                    DuffyVisionLLMSystemPromptSelector.validate_inputs(model, use_case),
                    True,
                )
                fp = DuffyVisionLLMSystemPromptSelector.fingerprint_inputs(
                    model, use_case
                )
                self.assertNotIsInstance(fp, bool)
                self.assertEqual(fp, (model, use_case))

        invalid_model = DuffyVisionLLMSystemPromptSelector.validate_inputs(
            "UnknownModel", USE_CASE_OPTIONS[0]
        )
        self.assertIsInstance(invalid_model, str)
        self.assertIn("Invalid model", str(invalid_model))

        invalid_uc = DuffyVisionLLMSystemPromptSelector.validate_inputs(
            MODEL_OPTIONS[0], "UnknownUseCase"
        )
        self.assertIsInstance(invalid_uc, str)
        self.assertIn("Invalid use_case", str(invalid_uc))

        with self.assertRaises(ValueError):
            DuffyVisionLLMSystemPromptSelector.execute("UnknownModel", "UnknownUseCase")

    def test_registered_in_nodes_init(self) -> None:
        init_path = os.path.join(REPO_ROOT, "nodes", "__init__.py")
        with open(init_path, "r", encoding="utf-8") as f:
            init_source = f.read()
        self.assertIn(
            "from .vision_llm_system_prompt_selector import", init_source
        )
        self.assertIn("DuffyVisionLLMSystemPromptSelector", init_source)


if __name__ == "__main__":
    unittest.main()
