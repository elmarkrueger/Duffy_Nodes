"""
Unit and integration test suite for `DuffyOmniModelNode` (`nodes/omni_model_node.py`).

Covers:
  1. Schema V3 contract (node_id, display_name, category, inputs, outputs).
  2. Recursive GGUF / mmproj discovery and `.imatrix.gguf` exclusion in `models/LLM/Omni_Modal`.
  3. Path-traversal protection in `resolve_llm_subpath` and `validate_inputs`.
  4. Deterministic SHA-256 `fingerprint_inputs` (never returning a bool).
  5. Multimodal media encoders:
     - Single & batched `IMAGE` tensors -> base64 PNG data URIs (with [0, 1] clamping).
     - `44100 Hz` Stereo `AUDIO` -> `16000 Hz` Mono 16-bit PCM WAV base64 payload.
     - `VIDEO` (`VideoInput` with `get_components()`) -> uniformly sampled keyframes + audio track.
  6. `_OmniRuntimeCache` lifecycle (`unload_model=False` reuse vs `unload_model=True` teardown)
     and `llama-cpp-python` v0.3.48 (`present_penalty`, `flash_attn_type`) compatibility.
  7. End-to-end multimodal smoke test against `Qwen2.5-Omni-7B` if present on disk.
"""

from __future__ import annotations

import base64
import importlib.util
import io as stdlib_io
import os
import sys
import types
import unittest
import wave
from unittest.mock import MagicMock, patch

import numpy as np
import torch
from PIL import Image

# Ensure ComfyUI root is in sys.path so `folder_paths` and `comfy_api.latest` resolve
COMFY_ROOT = r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI"
if os.path.isdir(COMFY_ROOT) and COMFY_ROOT not in sys.path:
    sys.path.insert(0, COMFY_ROOT)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE_FILE = os.path.join(REPO_ROOT, "nodes", "omni_model_node.py")

spec = importlib.util.spec_from_file_location("nodes.omni_model_node", NODE_FILE)
assert spec is not None and spec.loader is not None
omni_mod = importlib.util.module_from_spec(spec)
sys.modules["nodes.omni_model_node"] = omni_mod
spec.loader.exec_module(omni_mod)

DuffyOmniModelNode = omni_mod.DuffyOmniModelNode
comfy_image_to_data_uris = omni_mod.comfy_image_to_data_uris
comfy_audio_to_input_audio_list = omni_mod.comfy_audio_to_input_audio_list
extract_comfy_video = omni_mod.extract_comfy_video
get_llm_And_mmproj_lists = omni_mod.get_llm_And_mmproj_lists
resolve_llm_subpath = omni_mod.resolve_llm_subpath
_RUNTIME_CACHE = omni_mod._RUNTIME_CACHE


class TestDuffyOmniModelNode(unittest.TestCase):
    def tearDown(self) -> None:
        _RUNTIME_CACHE.unload()

    # ------------------------------------------------------------------
    # 1. Schema V3 & Model Discovery
    # ------------------------------------------------------------------
    def test_define_schema_v3_contract(self) -> None:
        schema = DuffyOmniModelNode.define_schema()
        self.assertEqual(schema.node_id, "Duffy_OmniModelNode")
        self.assertEqual(schema.display_name, "Omni Model Node (Qwen2.5-Omni GGUF)")
        self.assertEqual(schema.category, "Duffy/LLM")

        input_ids = [inp.id for inp in schema.inputs]
        # Required scalar widgets
        for expected_widget in (
            "model_name",
            "mmproj_name",
            "unload_model",
            "n_gpu_layers",
            "n_ctx",
            "flash_attn",
            "system_prompt",
            "user_prompt",
            "max_tokens",
            "temperature",
            "top_p",
            "top_k",
            "repeat_penalty",
            "presence_penalty",
            "frequency_penalty",
            "seed",
            "max_video_frames",
        ):
            self.assertIn(expected_widget, input_ids)

        # Dynamic multimodal slots: 10 images, 2 audios, 2 videos
        for i in range(1, 11):
            self.assertIn(f"image_{i}", input_ids)
        for i in range(1, 3):
            self.assertIn(f"audio_{i}", input_ids)
        for i in range(1, 3):
            self.assertIn(f"video_{i}", input_ids)

        self.assertEqual(len(schema.outputs), 1)
        self.assertEqual(schema.outputs[0].display_name, "response_text")

    def test_model_discovery_excludes_imatrix_and_separates_mmproj(self) -> None:
        models_list, mmproj_list = get_llm_And_mmproj_lists()
        # Verify no imatrix files leak into either dropdown
        for m in models_list + mmproj_list:
            self.assertNotIn("imatrix", os.path.basename(m).lower())
        # Verify no mmproj files leak into primary models_list
        for m in models_list:
            self.assertNotIn("mmproj", os.path.basename(m).lower())
        # Verify Omni_Modal files are discovered and prioritized when present on disk
        omni_dir = os.path.join(COMFY_ROOT, "models", "LLM", "Omni_Modal")
        if os.path.isdir(omni_dir):
            self.assertIn(
                "Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
                models_list,
            )
            self.assertIn(
                "Omni_Modal/Qwen2.5-Omni-7B-abliterated.mmproj-Q8_0.gguf",
                mmproj_list,
            )
            self.assertEqual(
                models_list[0],
                "Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
            )
            self.assertEqual(
                mmproj_list[0],
                "Omni_Modal/Qwen2.5-Omni-7B-abliterated.mmproj-Q8_0.gguf",
            )

    # ------------------------------------------------------------------
    # 2. Path Traversal Security & Validation
    # ------------------------------------------------------------------
    def test_path_traversal_rejected(self) -> None:
        unsafe_paths = [
            "../secret.gguf",
            "Omni_Modal/../../secret.gguf",
            "..\\Windows\\System32\\cmd.exe",
            "/etc/passwd",
            "\\Windows\\win.ini",
            "C:\\Windows\\System32\\calc.exe",
        ]
        for unsafe in unsafe_paths:
            with self.assertRaises(ValueError, msg=f"Failed to reject {unsafe}"):
                resolve_llm_subpath(unsafe)

            val_model = DuffyOmniModelNode.validate_inputs(
                model_name=unsafe,
                mmproj_name="none",
            )
            self.assertIsInstance(val_model, str)

            val_mmproj = DuffyOmniModelNode.validate_inputs(
                model_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
                mmproj_name=unsafe,
            )
            self.assertIsInstance(val_mmproj, str)

    def test_validate_inputs_requires_mmproj_when_media_connected(self) -> None:
        dummy_img = torch.zeros((1, 16, 16, 3), dtype=torch.float32)
        res = DuffyOmniModelNode.validate_inputs(
            model_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
            mmproj_name="none",
            image_1=dummy_img,
        )
        self.assertIsInstance(res, str)
        self.assertIn("mmproj", res.lower())

        res_ok = DuffyOmniModelNode.validate_inputs(
            model_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
            mmproj_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.mmproj-Q8_0.gguf",
            image_1=dummy_img,
        )
        self.assertTrue(res_ok)

    # ------------------------------------------------------------------
    # 3. Deterministic Fingerprinting
    # ------------------------------------------------------------------
    def test_fingerprint_inputs_deterministic_and_not_bool(self) -> None:
        fp1 = DuffyOmniModelNode.fingerprint_inputs(
            model_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
            mmproj_name="none",
            seed=42,
            user_prompt="Hello",
        )
        fp2 = DuffyOmniModelNode.fingerprint_inputs(
            model_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
            mmproj_name="none",
            seed=42,
            user_prompt="Hello",
        )
        fp3 = DuffyOmniModelNode.fingerprint_inputs(
            model_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
            mmproj_name="none",
            seed=43,
            user_prompt="Hello",
        )
        self.assertIsInstance(fp1, str)
        self.assertNotIsInstance(fp1, bool)
        self.assertEqual(fp1, fp2)
        self.assertNotEqual(fp1, fp3)

    # ------------------------------------------------------------------
    # 4. Media Preprocessors (Image, Audio, Video)
    # ------------------------------------------------------------------
    def test_comfy_image_to_data_uris_batch_and_clamping(self) -> None:
        # Create a 3-image batch with out-of-range values (-0.5 and 1.5) to test clamping
        batch = torch.tensor(
            [[-0.5, 0.5, 1.5]], dtype=torch.float32
        ).view(1, 1, 1, 3).expand(3, 32, 48, 3).clone()

        uris = comfy_image_to_data_uris(batch)
        self.assertEqual(len(uris), 3)

        for uri in uris:
            self.assertTrue(uri.startswith("data:image/png;base64,"))
            b64_part = uri.split(",", 1)[1]
            raw_bytes = base64.b64decode(b64_part)
            img = Image.open(stdlib_io.BytesIO(raw_bytes))
            self.assertEqual(img.format, "PNG")
            self.assertEqual(img.mode, "RGB")
            self.assertEqual(img.size, (48, 32))  # (W, H)
            arr = np.array(img)
            self.assertEqual(int(arr[0, 0, 0]), 0)
            self.assertEqual(int(arr[0, 0, 1]), 128)
            self.assertEqual(int(arr[0, 0, 2]), 255)

    def test_comfy_audio_to_input_audio_list_resamples_to_16khz_mono_pcm16(self) -> None:
        # 1.0 second of 44.1 kHz Stereo sine wave: shape [1, 2, 44100]
        sr = 44100
        t = torch.linspace(0.0, 1.0, steps=sr, dtype=torch.float32)
        left = torch.sin(2.0 * np.pi * 440.0 * t)
        right = torch.cos(2.0 * np.pi * 440.0 * t)
        waveform = torch.stack([left, right], dim=0).unsqueeze(0)  # [1, 2, 44100]

        payloads = comfy_audio_to_input_audio_list({"waveform": waveform, "sample_rate": sr})
        self.assertEqual(len(payloads), 1)
        self.assertEqual(payloads[0]["format"], "wav")

        wav_bytes = base64.b64decode(payloads[0]["data"])
        with wave.open(stdlib_io.BytesIO(wav_bytes), "rb") as wf:
            self.assertEqual(wf.getnchannels(), 1)
            self.assertEqual(wf.getsampwidth(), 2)  # 16-bit PCM
            self.assertEqual(wf.getframerate(), 16000)
            self.assertEqual(wf.getnframes(), 16000)

    def test_extract_comfy_video_uniform_sampling_and_audio(self) -> None:
        # Mock a ComfyUI VideoInput object with 30 frames and 0.5s of 48 kHz stereo audio
        total_frames = 30
        images = torch.linspace(0.0, 1.0, steps=total_frames).view(total_frames, 1, 1, 1).expand(total_frames, 24, 24, 3)
        audio = {
            "waveform": torch.zeros((1, 2, 24000), dtype=torch.float32),
            "sample_rate": 48000,
        }
        mock_video = types.SimpleNamespace(
            get_components=lambda: types.SimpleNamespace(images=images, audio=audio, fps=30.0)
        )

        frames_uris, audio_payloads = extract_comfy_video(mock_video, max_frames=8)
        self.assertEqual(len(frames_uris), 8)
        self.assertEqual(len(audio_payloads), 1)

        wav_bytes = base64.b64decode(audio_payloads[0]["data"])
        with wave.open(stdlib_io.BytesIO(wav_bytes), "rb") as wf:
            self.assertEqual(wf.getnchannels(), 1)
            self.assertEqual(wf.getframerate(), 16000)
            self.assertEqual(wf.getnframes(), 8000)  # 0.5s * 16000 Hz

    # ------------------------------------------------------------------
    # 5. Runtime Cache, Parameter Mapping & VRAM Lifecycle
    # ------------------------------------------------------------------
    def test_execute_and_vram_lifecycle_with_mocked_llama(self) -> None:
        created_instances: list[MagicMock] = []

        class FakeLlama:
            def __init__(
                self,
                model_path: str,
                mmproj_path: str | None = None,
                n_ctx: int = 8192,
                n_gpu_layers: int = -1,
                flash_attn_type: int = -1,
                verbose: bool = False,
            ) -> None:
                self.model_path = model_path
                self.mmproj_path = mmproj_path
                self.n_ctx = n_ctx
                self.n_gpu_layers = n_gpu_layers
                self.flash_attn_type = flash_attn_type
                self.chat_handler = MagicMock()
                self.close = MagicMock()
                self.last_call_kwargs: dict | None = None
                created_instances.append(self)

            def create_chat_completion(
                self,
                messages: list,
                max_tokens: int = 1024,
                temperature: float = 0.7,
                top_p: float = 0.9,
                top_k: int = 40,
                repeat_penalty: float = 1.1,
                present_penalty: float = 0.0,
                frequency_penalty: float = 0.0,
                seed: int | None = None,
            ) -> dict:
                self.last_call_kwargs = {
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "top_p": top_p,
                    "top_k": top_k,
                    "repeat_penalty": repeat_penalty,
                    "present_penalty": present_penalty,
                    "frequency_penalty": frequency_penalty,
                    "seed": seed,
                }
                return {
                    "choices": [
                        {"message": {"role": "assistant", "content": "  Mocked Omni Response  "}}
                    ]
                }

        fake_llama_mod = types.ModuleType("llama_cpp")
        fake_llama_mod.Llama = FakeLlama  # type: ignore[attr-defined]

        with patch.dict(sys.modules, {"llama_cpp": fake_llama_mod}), \
             patch.object(omni_mod, "resolve_llm_subpath", side_effect=lambda p: __file__ if p != "none" else ""), \
             patch.object(omni_mod, "_inspect_and_sanitize_mmproj", return_value=(True, True)):
            # Run 1: unload_model=False -> caches model in _RUNTIME_CACHE
            dummy_img = torch.zeros((2, 16, 16, 3), dtype=torch.float32)
            dummy_aud = {"waveform": torch.zeros((1, 2, 16000), dtype=torch.float32), "sample_rate": 16000}

            out1 = DuffyOmniModelNode.execute(
                model_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
                mmproj_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.mmproj-Q8_0.gguf",
                unload_model=False,
                n_gpu_layers=-1,
                n_ctx=8192,
                flash_attn=True,
                system_prompt="System instruction",
                user_prompt="Describe media",
                max_tokens=256,
                temperature=0.6,
                top_p=0.9,
                top_k=40,
                repeat_penalty=1.1,
                presence_penalty=0.25,
                frequency_penalty=0.1,
                seed=12345,
                max_video_frames=4,
                image_1=dummy_img,
                audio_1=dummy_aud,
            )
            self.assertEqual(out1.args[0], "Mocked Omni Response")
            self.assertEqual(len(created_instances), 1)
            inst = created_instances[0]
            self.assertEqual(inst.flash_attn_type, 1)
            self.assertIsNotNone(_RUNTIME_CACHE.llm)
            self.assertAlmostEqual(inst.last_call_kwargs["present_penalty"], 0.25)

            # Verify multimodal message payload contains 2 image_url blocks + 1 input_audio block + 1 text block
            user_msg = inst.last_call_kwargs["messages"][1]
            self.assertEqual(user_msg["role"], "user")
            content_blocks = user_msg["content"]
            self.assertEqual(len(content_blocks), 4)
            self.assertEqual(content_blocks[0]["type"], "image_url")
            self.assertEqual(content_blocks[1]["type"], "image_url")
            self.assertEqual(content_blocks[2]["type"], "input_audio")
            self.assertEqual(content_blocks[3]["type"], "text")

            # Run 2: Same config + unload_model=True -> reuses cached instance, then deterministically unloads
            out2 = DuffyOmniModelNode.execute(
                model_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf",
                mmproj_name="Omni_Modal/Qwen2.5-Omni-7B-abliterated.mmproj-Q8_0.gguf",
                unload_model=True,
                n_gpu_layers=-1,
                n_ctx=8192,
                flash_attn=True,
                system_prompt="System instruction",
                user_prompt="Follow-up prompt",
                max_tokens=128,
                temperature=0.6,
                top_p=0.9,
                top_k=40,
                repeat_penalty=1.1,
                presence_penalty=0.0,
                frequency_penalty=0.0,
                seed=99,
                max_video_frames=4,
            )
            self.assertEqual(out2.args[0], "Mocked Omni Response")
            # No second model instantiation occurred because config matched
            self.assertEqual(len(created_instances), 1)
            # Deterministic teardown executed in finally block
            inst.chat_handler.close.assert_called_once()
            inst.close.assert_called_once()
            self.assertIsNone(_RUNTIME_CACHE.llm)
            self.assertIsNone(_RUNTIME_CACHE.chat_handler)

    # ------------------------------------------------------------------
    # 6. End-to-End Live Multimodal Smoke Test (Qwen2.5-Omni GGUF + mmproj)
    # ------------------------------------------------------------------
    def test_live_qwen25_omni_multimodal_smoke(self) -> None:
        model_rel = "Omni_Modal/Qwen2.5-Omni-7B-abliterated.i1-Q6_K.gguf"
        mmproj_rel = "Omni_Modal/Qwen2.5-Omni-7B-abliterated.mmproj-Q8_0.gguf"
        try:
            model_abs = resolve_llm_subpath(model_rel)
            mmproj_abs = resolve_llm_subpath(mmproj_rel)
        except FileNotFoundError:
            self.skipTest("Qwen2.5-Omni GGUF files not present on disk")
            return

        if not (os.path.isfile(model_abs) and os.path.isfile(mmproj_abs)):
            self.skipTest("Qwen2.5-Omni GGUF files not present on disk")
            return

        img = torch.rand((1, 64, 64, 3), dtype=torch.float32)
        mock_video = types.SimpleNamespace(
            get_components=lambda: types.SimpleNamespace(
                images=torch.rand((4, 64, 64, 3), dtype=torch.float32),
                audio={
                    "waveform": torch.sin(torch.linspace(0.0, 50.0, 8000)).view(1, 1, 8000),
                    "sample_rate": 16000,
                },
                fps=24.0,
            )
        )

        out = DuffyOmniModelNode.execute(
            model_name=model_rel,
            mmproj_name=mmproj_rel,
            unload_model=True,
            n_gpu_layers=-1,
            n_ctx=4096,
            flash_attn=True,
            system_prompt="You are Qwen, a helpful assistant.",
            user_prompt="Reply with the single word READY.",
            max_tokens=16,
            temperature=0.1,
            top_p=0.9,
            top_k=40,
            repeat_penalty=1.1,
            presence_penalty=0.0,
            frequency_penalty=0.0,
            seed=42,
            max_video_frames=2,
            image_1=img,
            video_1=mock_video,
        )
        response_text = out.args[0]
        self.assertIsInstance(response_text, str)
        self.assertGreater(len(response_text), 0)
        # Verify unload_model=True cleaned up the runtime cache
        self.assertIsNone(_RUNTIME_CACHE.llm)
        self.assertIsNone(_RUNTIME_CACHE.chat_handler)


if __name__ == "__main__":
    unittest.main(verbosity=2)
