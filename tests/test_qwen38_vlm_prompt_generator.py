r"""
Unit & Integration Test Suite for DuffyQwen38VLMPromptGenerator (Duffy_Qwen38_VLM_PromptGenerator).

Usage:
    & "D:\Easy_Installer\ComfyUI-Easy-Install\python_embeded\python.exe" tests/test_qwen38_vlm_prompt_generator.py
    & "D:\Easy_Installer\ComfyUI-Easy-Install\python_embeded\python.exe" tests/test_qwen38_vlm_prompt_generator.py --live
"""

import argparse
import base64
import importlib.util
import io as std_io
import os
import sys
from unittest.mock import MagicMock, patch

import numpy as np
import torch
from PIL import Image

COMFY_ROOT = r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI"
if os.path.isdir(COMFY_ROOT) and COMFY_ROOT not in sys.path:
    sys.path.insert(0, COMFY_ROOT)

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
NODE_FILE = os.path.join(REPO_ROOT, "nodes", "qwen38_vlm_prompt_generator.py")

spec = importlib.util.spec_from_file_location("nodes.qwen38_vlm_prompt_generator", NODE_FILE)
assert spec is not None and spec.loader is not None
qwen38_mod = importlib.util.module_from_spec(spec)
sys.modules["nodes.qwen38_vlm_prompt_generator"] = qwen38_mod
spec.loader.exec_module(qwen38_mod)

_EMPTY_MODEL_PLACEHOLDER = qwen38_mod._EMPTY_MODEL_PLACEHOLDER
_NONE_OPTION = qwen38_mod._NONE_OPTION
_UNCLOSED_THINK_WARNING = qwen38_mod._UNCLOSED_THINK_WARNING
DuffyQwen38VLMPromptGenerator = qwen38_mod.DuffyQwen38VLMPromptGenerator
_is_safe_relpath = qwen38_mod._is_safe_relpath
_Qwen38RuntimeCache = qwen38_mod._Qwen38RuntimeCache
compute_effective_image_max_tokens = qwen38_mod.compute_effective_image_max_tokens
get_qwen38_model_lists = qwen38_mod.get_qwen38_model_lists
parse_qwen38_response = qwen38_mod.parse_qwen38_response
resolve_llm_subpath = qwen38_mod.resolve_llm_subpath
tensor_frame_to_png_data_uri = qwen38_mod.tensor_frame_to_png_data_uri

# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

def test_schema_contract():
    """Verify V3 Schema fields, 26 inputs, 3 outputs, and mandatory display_name/tooltip."""
    schema = DuffyQwen38VLMPromptGenerator.define_schema()
    assert schema.node_id == "Duffy_Qwen38_VLM_PromptGenerator"
    assert schema.display_name == "Qwen3.8-27B Vision Prompt Generator (GGUF)"
    assert schema.category == "Duffy/LLM"

    expected_inputs = [
        "model_name",
        "mmproj_name",
        "system_prompt",
        "user_prompt",
        "thinking_mode",
        "seed",
        "n_gpu_layers",
        "mmproj_offload",
        "n_ctx",
        "flash_attn",
        "kv_cache_type_k",
        "kv_cache_type_v",
        "n_batch",
        "n_ubatch",
        "keep_model_loaded",
        "image_min_tokens",
        "image_max_tokens",
        "enable_mtp",
        "mtp_draft_max",
        "reasoning_budget",
        "max_new_tokens",
        "temperature",
        "top_p",
        "top_k",
        "min_p",
        "presence_penalty",
        "image",
    ]
    input_ids = [inp.id for inp in schema.inputs]
    assert input_ids == expected_inputs, f"Unexpected inputs: {input_ids}"

    for inp in schema.inputs:
        assert getattr(inp, "display_name", None), f"Input '{inp.id}' missing display_name"
        assert getattr(inp, "tooltip", None), f"Input '{inp.id}' missing tooltip"

    # Verify image is optional
    image_inp = next(inp for inp in schema.inputs if inp.id == "image")
    assert getattr(image_inp, "optional", False) is True, "image input must be optional=True"

    output_ids = [out.id for out in schema.outputs]
    assert output_ids == ["clean_prompt", "thinking_trace", "raw_response"]
    for out in schema.outputs:
        assert getattr(out, "display_name", None), f"Output '{out.id}' missing display_name"
        assert getattr(out, "tooltip", None), f"Output '{out.id}' missing tooltip"

    print("[PASS] test_schema_contract")


def test_model_discovery_and_qwen38_priority():
    """Verify subfolder discovery, Qwen3.8 prioritization, and imatrix exclusion."""
    main_models, mmproj_models = get_qwen38_model_lists()
    for m in main_models:
        assert "imatrix" not in m.lower(), f"imatrix file leaked into main_models: {m}"
        if m != _EMPTY_MODEL_PLACEHOLDER:
            assert "mmproj" not in os.path.basename(m).lower()

    for mm in mmproj_models:
        if mm != _NONE_OPTION:
            assert "mmproj" in os.path.basename(mm).lower()

    # Check if real Qwen3.8-27B files exist on disk in this workspace
    expected_qwen = "Qwen3.8-27B/Qwen3.8-27B-IQ3_XS-3.01bpw.gguf"
    expected_mmproj = "Qwen3.8-27B/mmproj-Qwen3.8-27B-BF16.gguf"
    if expected_qwen in main_models:
        assert main_models[0] == expected_qwen, f"Expected {expected_qwen} first, got {main_models[0]}"
        resolved = resolve_llm_subpath(expected_qwen)
        assert resolved and os.path.isfile(resolved)
    if expected_mmproj in mmproj_models:
        assert mmproj_models[0] == expected_mmproj, f"Expected {expected_mmproj} first, got {mmproj_models[0]}"
        resolved_mm = resolve_llm_subpath(expected_mmproj)
        assert resolved_mm and os.path.isfile(resolved_mm)

    print(f"[PASS] test_model_discovery_and_qwen38_priority (main[0]={main_models[0]}, mmproj[0]={mmproj_models[0]})")


def test_security_and_input_validation():
    """Verify path traversal rejection and token range validation."""
    assert _is_safe_relpath("../secret.gguf") is False
    assert _is_safe_relpath("Qwen3.8-27B/../../secret.gguf") is False
    assert _is_safe_relpath("C:/Windows/System32/cmd.exe") is False
    assert _is_safe_relpath("/etc/passwd") is False
    assert _is_safe_relpath(_NONE_OPTION) is False
    assert _is_safe_relpath("Qwen3.8-27B/Qwen3.8-27B-IQ3_XS-3.01bpw.gguf") is True

    assert resolve_llm_subpath("../outside.gguf") is None

    res_traversal = DuffyQwen38VLMPromptGenerator.validate_inputs(
        model_name="../outside.gguf",
        mmproj_name="None",
        image_min_tokens=256,
        image_max_tokens=1536,
    )
    assert isinstance(res_traversal, str) and "Invalid" in res_traversal

    # Validate token range check when valid model exists
    main_models, mmproj_models = get_qwen38_model_lists()
    if main_models[0] != _EMPTY_MODEL_PLACEHOLDER:
        res_tokens = DuffyQwen38VLMPromptGenerator.validate_inputs(
            model_name=main_models[0],
            mmproj_name=mmproj_models[0],
            image_min_tokens=1024,
            image_max_tokens=512,
        )
        assert isinstance(res_tokens, str) and "cannot be less than" in res_tokens

        res_ok = DuffyQwen38VLMPromptGenerator.validate_inputs(
            model_name=main_models[0],
            mmproj_name=mmproj_models[0],
            image_min_tokens=256,
            image_max_tokens=1536,
        )
        assert res_ok is True

    print("[PASS] test_security_and_input_validation")


def test_image_preprocessing_and_lanczos_downscale():
    """Verify batch token scaling, NaN clamping, and Lanczos 1536px long-edge downscaling."""
    assert compute_effective_image_max_tokens(1536, 1) == 1536
    assert compute_effective_image_max_tokens(1600, 4) == 400
    assert compute_effective_image_max_tokens(512, 8) == 256  # Clamped to min 256

    # Test 1: Standard 1024x768 image (no downscale)
    frame_std = torch.rand((768, 1024, 3), dtype=torch.float32)
    frame_std[0, 0, 0] = float("nan")
    uri_std, orig_std, final_std = tensor_frame_to_png_data_uri(frame_std, effective_image_max_tokens=1536)
    assert uri_std.startswith("data:image/png;base64,")
    assert orig_std == (1024, 768)
    assert final_std == (1024, 768)

    # Test 2: High-res 3000x2000 image with effective_image_max_tokens=1536 (<=2048) -> downscaled to 1536x1024
    frame_hi = torch.ones((2000, 3000, 3), dtype=torch.float32) * 0.5
    uri_hi, orig_hi, final_hi = tensor_frame_to_png_data_uri(frame_hi, effective_image_max_tokens=1536)
    assert orig_hi == (3000, 2000)
    assert final_hi == (1536, 1024), f"Expected (1536, 1024), got {final_hi}"

    # Verify decoded PNG matches final_hi
    raw_bytes = base64.b64decode(uri_hi.split(",", 1)[1])
    decoded_img = Image.open(std_io.BytesIO(raw_bytes))
    assert decoded_img.size == (1536, 1024)

    # Test 3: High-res 3000x2000 image with effective_image_max_tokens=4096 (>2048) -> preserved
    _, _, final_preserve = tensor_frame_to_png_data_uri(frame_hi, effective_image_max_tokens=4096)
    assert final_preserve == (3000, 2000)

    print("[PASS] test_image_preprocessing_and_lanczos_downscale")


def test_parse_qwen38_response():
    """Verify <think> extraction across standard, prefilled, disabled, and truncated cases."""
    # Case 1: Full <think>...</think>
    clean, trace = parse_qwen38_response(
        "<think>\nAnalyzing lighting and subject.\n</think>\n\nA cinematic portrait of a cyberpunk samurai.",
        thinking_mode="enable",
    )
    assert clean == "A cinematic portrait of a cyberpunk samurai."
    assert trace == "Analyzing lighting and subject."

    # Case 2: Prompt-prefilled <think>\n (completion only contains closing </think>)
    clean2, trace2 = parse_qwen38_response(
        "Step 1: Check composition.\nStep 2: Synthesize prompt.\n</think>\n\nUltra-detailed oil painting of a mountain peak.",
        thinking_mode="enable",
    )
    assert clean2 == "Ultra-detailed oil painting of a mountain peak."
    assert "Step 1: Check composition." in trace2

    # Case 3: Thinking disabled
    clean3, trace3 = parse_qwen38_response(
        "A photorealistic studio shot of a vintage watch.",
        thinking_mode="disable",
    )
    assert clean3 == "A photorealistic studio shot of a vintage watch."
    assert trace3 == ""

    # Case 4: Unclosed <think> tag
    clean4, trace4 = parse_qwen38_response(
        "<think>\nStill thinking about the background details...",
        thinking_mode="enable",
        finish_reason="length",
    )
    assert clean4 == _UNCLOSED_THINK_WARNING
    assert trace4 == "Still thinking about the background details..."

    # Case 5: Prompt-prefilled <think> that hit finish_reason="length" before emitting </think>
    clean5, trace5 = parse_qwen38_response(
        "Let me analyze every pixel in the top-left corner first...",
        thinking_mode="enable",
        finish_reason="length",
    )
    assert clean5 == _UNCLOSED_THINK_WARNING
    assert trace5 == "Let me analyze every pixel in the top-left corner first..."

    print("[PASS] test_parse_qwen38_response")


def test_mocked_execution_vision_and_text_only():
    """Verify full node execution with connected image batch, text-only mode, KV safety guard, and MTP."""
    main_models, mmproj_models = get_qwen38_model_lists()
    model_name = main_models[0]
    mmproj_name = mmproj_models[0]

    mock_llama_instance = MagicMock()
    mock_llama_instance.chat_handler = MagicMock()
    mock_llama_instance.chat_handler.extra_template_arguments = {"enable_thinking": True}
    mock_llama_instance.speculative = MagicMock()
    mock_llama_instance.last_speculative_stats = {
        "drafted": 40,
        "accepted_draft_tokens": 30,
        "draft_token_acceptance_rate": 0.75,
    }
    mock_llama_instance.create_chat_completion.return_value = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Analyzing visual elements.</think>\n\nA breathtaking aerial photograph of an emerald fjord at golden hour.",
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 620,
            "completion_tokens": 45,
            "total_tokens": 665,
        },
    }

    with patch("llama_cpp.Llama", return_value=mock_llama_instance) as mock_llama_cls:
        _Qwen38RuntimeCache.unload()

        # 1. Execute with a 2-frame image batch and flash_attn=False + kv_cache_type_v="q8_0"
        #    (should auto-override type_v to GGML_TYPE_F16 = 1)
        batch_images = torch.rand((2, 512, 512, 3), dtype=torch.float32)
        output_vision = DuffyQwen38VLMPromptGenerator.execute(
            model_name=model_name,
            mmproj_name=mmproj_name,
            system_prompt="System instructions",
            user_prompt="Describe these frames.",
            thinking_mode="enable",
            seed=123,
            n_gpu_layers=-1,
            mmproj_offload=True,
            n_ctx=8192,
            flash_attn=False,
            kv_cache_type_k="q8_0",
            kv_cache_type_v="q8_0",
            n_batch=1024,
            n_ubatch=512,
            keep_model_loaded=True,
            image_min_tokens=256,
            image_max_tokens=1536,
            enable_mtp=True,
            mtp_draft_max=4,
            reasoning_budget=1024,
            max_new_tokens=512,
            temperature=0.7,
            top_p=0.95,
            top_k=20,
            min_p=0.05,
            presence_penalty=1.5,
            image=batch_images,
        )

        clean_p, think_t, raw_r = output_vision.args
        assert clean_p == "A breathtaking aerial photograph of an emerald fjord at golden hour."
        assert think_t == "Analyzing visual elements."
        assert "2 frame(s)" in raw_r
        assert "tokens_per_frame=256..768" in raw_r
        assert "V=f16" in raw_r  # Overridden because flash_attn=False

        # Check Llama init arguments
        init_call_kwargs = mock_llama_cls.call_args.kwargs
        assert init_call_kwargs["flash_attn_type"] == 0
        assert init_call_kwargs["type_v"] == 1  # GGML_TYPE_F16
        assert init_call_kwargs["load_mtp"] is True
        assert init_call_kwargs["speculative"] is not None
        assert init_call_kwargs["chat_handler_kwargs"]["image_max_tokens"] == 768

        # Check create_chat_completion messages had 2 image_url blocks + 1 text block
        chat_call_kwargs = mock_llama_instance.create_chat_completion.call_args.kwargs
        user_msg = chat_call_kwargs["messages"][-1]["content"]
        assert isinstance(user_msg, list) and len(user_msg) == 3
        assert user_msg[0]["type"] == "image_url"
        assert user_msg[1]["type"] == "image_url"
        assert user_msg[2]["type"] == "text"
        assert chat_call_kwargs["reasoning_budget"] == 1024
        assert chat_call_kwargs["reasoning_start_in_prompt"] is True

        # 2. Execute in pure text-only mode (image=None) with thinking_mode="disable" and keep_model_loaded=False
        mock_llama_instance.create_chat_completion.return_value = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "A futuristic solarpunk library bathed in warm sunlight.",
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 80, "completion_tokens": 12, "total_tokens": 92},
        }

        output_text = DuffyQwen38VLMPromptGenerator.execute(
            model_name=model_name,
            mmproj_name=mmproj_name,
            system_prompt="System instructions",
            user_prompt="Generate a solarpunk prompt.",
            thinking_mode="disable",
            seed=456,
            n_gpu_layers=-1,
            mmproj_offload=True,
            n_ctx=8192,
            flash_attn=False,
            kv_cache_type_k="q8_0",
            kv_cache_type_v="q8_0",
            n_batch=1024,
            n_ubatch=512,
            keep_model_loaded=False,
            image_min_tokens=256,
            image_max_tokens=1536,
            enable_mtp=True,
            mtp_draft_max=4,
            reasoning_budget=1024,
            max_new_tokens=512,
            temperature=0.7,
            top_p=0.95,
            top_k=20,
            min_p=0.05,
            presence_penalty=1.5,
            image=None,
        )

        clean_t, think_t2, raw_r2 = output_text.args
        assert clean_t == "A futuristic solarpunk library bathed in warm sunlight."
        assert think_t2 == ""
        assert "text-only (no image connected)" in raw_r2
        assert _Qwen38RuntimeCache._instance is None, "Model must be unloaded when keep_model_loaded=False"

    print("[PASS] test_mocked_execution_vision_and_text_only")


def run_live_smoke_test():
    """Opt-in live hardware inference test with Qwen3.8-27B + mmproj on GPU."""
    print("[LIVE] Running live Qwen3.8-27B Vision + Text hardware smoke test...")
    main_models, mmproj_models = get_qwen38_model_lists()
    model_name = main_models[0]
    mmproj_name = mmproj_models[0]

    # Create a simple synthetic 512x512 RGB gradient test image
    y = torch.linspace(0.0, 1.0, 512).view(512, 1, 1).expand(512, 512, 1)
    x = torch.linspace(0.0, 1.0, 512).view(1, 512, 1).expand(512, 512, 1)
    b = torch.full((512, 512, 1), 0.5)
    img_tensor = torch.cat([x, y, b], dim=-1).unsqueeze(0)  # [1, 512, 512, 3]

    output = DuffyQwen38VLMPromptGenerator.execute(
        model_name=model_name,
        mmproj_name=mmproj_name,
        system_prompt="You are a concise visual prompt generator. Output only the final image prompt.",
        user_prompt="Describe the colors and gradient of this image in two sentences.",
        thinking_mode="enable",
        seed=42,
        n_gpu_layers=-1,
        mmproj_offload=True,
        n_ctx=4096,
        flash_attn=True,
        kv_cache_type_k="q8_0",
        kv_cache_type_v="q8_0",
        n_batch=1024,
        n_ubatch=512,
        keep_model_loaded=False,
        image_min_tokens=256,
        image_max_tokens=512,
        enable_mtp=True,
        mtp_draft_max=4,
        reasoning_budget=256,
        max_new_tokens=384,
        temperature=0.7,
        top_p=0.95,
        top_k=20,
        min_p=0.05,
        presence_penalty=1.5,
        image=img_tensor,
    )
    clean_prompt, thinking_trace, raw_response = output.args
    print("\n--- LIVE CLEAN PROMPT ---\n", clean_prompt)
    print("\n--- LIVE THINKING TRACE ---\n", thinking_trace)
    print("\n--- LIVE RAW / TELEMETRY ---\n", raw_response)
    assert len(clean_prompt) > 0, "Expected non-empty clean_prompt from live model"
    print("[PASS] run_live_smoke_test")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Run live GPU inference against Qwen3.8-27B")
    args = parser.parse_args()

    test_schema_contract()
    test_model_discovery_and_qwen38_priority()
    test_security_and_input_validation()
    test_image_preprocessing_and_lanczos_downscale()
    test_parse_qwen38_response()
    test_mocked_execution_vision_and_text_only()

    if args.live:
        run_live_smoke_test()

    print("\nALL TESTS PASSED SUCCESSFULLY.")
