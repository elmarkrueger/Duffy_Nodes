"""Unit, mocked integration, and optional --live tests for Gemma-4 multimodal analyzers."""

from __future__ import annotations

import argparse
import base64
import importlib
import math
import os
import sys
import tempfile
import types
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import torch
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
COMFY_ROOT = Path(r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")

if os.path.isdir(str(COMFY_ROOT)) and str(COMFY_ROOT) not in sys.path:
    sys.path.append(str(COMFY_ROOT))


def _import_duffy_package(name: str):
    """Import repo modules without executing nodes/__init__.py (avoids ComfyUI server circular import)."""
    pkg_name = "duffy_repo_pkg"
    if pkg_name not in sys.modules:
        pkg = types.ModuleType(pkg_name)
        pkg.__path__ = [str(REPO_ROOT)]
        sys.modules[pkg_name] = pkg
    for sub in ("utils", "nodes"):
        sub_name = f"{pkg_name}.{sub}"
        if sub_name not in sys.modules:
            sub_pkg = types.ModuleType(sub_name)
            sub_pkg.__path__ = [str(REPO_ROOT / sub)]
            sys.modules[sub_name] = sub_pkg
    return importlib.import_module(f"{pkg_name}.{name}")


class FakeInterruptException(Exception):
    pass


FakeInterruptException.__name__ = "InterruptProcessingException"


def _make_synthetic_image(height: int, width: int, seed: int = 123, batch: int = 1) -> torch.Tensor:
    gen = torch.Generator(device="cpu").manual_seed(seed)
    return torch.rand((batch, height, width, 3), generator=gen, dtype=torch.float32)


class TestGemma4Analyzers(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.media_mod = _import_duffy_package("utils.media")
        cls.memory_mod = _import_duffy_package("utils.memory")
        cls.common_mod = _import_duffy_package("utils.gemma_common")
        cls.node_12b_mod = _import_duffy_package("nodes.gemma_4_12b_analyzer")
        cls.node_gguf_mod = _import_duffy_package("nodes.gemma_gguf_analyzer")
        cls.node_spatial_mod = _import_duffy_package("nodes.gemma_ideogram_spatial_architect")
        cls.replacements_mod = _import_duffy_package("nodes.node_replacements")

    def tearDown(self) -> None:
        self.node_12b_mod._model_cache_12b.unload()
        self.node_gguf_mod._model_cache.unload()

    def test_lazy_llama_cpp_isolation_on_module_import(self) -> None:
        """Module import must succeed even if llama_cpp is unavailable (startup fault isolation)."""
        with patch.dict(sys.modules, {"llama_cpp": None, "llama_cpp.llama_chat_format": None}):
            spec = importlib.util.spec_from_file_location(
                "duffy_repo_pkg.nodes._isolated_12b_probe",
                str(REPO_ROOT / "nodes" / "gemma_4_12b_analyzer.py"),
            )
            mod = importlib.util.module_from_spec(spec)
            mod.__package__ = "duffy_repo_pkg.nodes"
            spec.loader.exec_module(mod)
            self.assertTrue(hasattr(mod, "DuffyGemma4_12B_Analyzer"))

    def test_v3_schemas_and_legacy_widget_positions(self) -> None:
        s12 = self.node_12b_mod.DuffyGemma4_12B_Analyzer.define_schema()
        s_gguf = self.node_gguf_mod.DuffyGemmaGGUFAnalyzer.define_schema()

        ids_12 = [inp.id for inp in s12.inputs]
        ids_gguf = [inp.id for inp in s_gguf.inputs]

        expected_12_prefix = [
            "gguf_model", "mmproj_model", "use_custom_prompt", "preset_prompt",
            "system_prompt", "user_prompt", "enable_thinking", "preserve_thinking",
            "strip_thinking_tags", "unload_model", "max_tokens", "temperature",
            "top_k", "top_p", "min_p", "repeat_penalty", "presence_penalty",
            "frequency_penalty", "mirostat_mode", "mirostat_tau", "mirostat_eta",
            "seed", "n_gpu_layers", "n_ctx", "frame_sample_interval",
        ]
        self.assertEqual(ids_12[:len(expected_12_prefix)], expected_12_prefix)

        expected_gguf_prefix = [
            x if x != "frame_sample_interval" else "video_fps"
            for x in expected_12_prefix if x != "preserve_thinking"
        ]
        self.assertEqual(ids_gguf[:len(expected_gguf_prefix)], expected_gguf_prefix)

        for opt_id in (
            "mmproj_offload", "flash_attn", "kv_cache_type_k", "kv_cache_type_v",
            "n_batch", "n_ubatch", "image_min_tokens", "image_max_tokens",
        ):
            self.assertIn(opt_id, ids_12)
            self.assertIn(opt_id, ids_gguf)

        mmproj_12 = next(i for i in s12.inputs if i.id == "mmproj_model")
        self.assertEqual(mmproj_12.options[-1], self.common_mod.MMPROJ_NONE)

    def test_node_replacements_Preserve_first_and_cover_gemma_nodes(self) -> None:
        reps = self.replacements_mod.REPLACEMENTS
        self.assertEqual(reps[0].old_node_id, "Duffy_DynamicMultiArchitectureSampler")
        by_id = {r.old_node_id: r for r in reps}
        self.assertIn("Duffy_Gemma4_12B_Analyzer", by_id)
        self.assertIn("Duffy_GemmaGGUFAnalyzer", by_id)

        r12 = by_id["Duffy_Gemma4_12B_Analyzer"]
        self.assertEqual(len(r12.old_widget_ids), 25)
        mapped_new_ids = {m["new_id"] for m in r12.input_mapping}
        for required_new in (
            "n_batch", "n_ubatch", "image_min_tokens", "image_max_tokens",
            "kv_cache_type_k", "kv_cache_type_v", "flash_attn", "mmproj_offload",
            "image", "reference_image", "video", "audio",
        ):
            self.assertIn(required_new, mapped_new_ids)

    def test_spatial_architect_cache_api_compatibility(self) -> None:
        self.assertIs(
            self.node_spatial_mod._model_cache_12b,
            self.node_12b_mod._model_cache_12b,
        )
        self.assertIs(
            self.node_spatial_mod._get_gguf_models,
            self.node_12b_mod._get_gguf_models,
        )
        self.assertIs(
            self.node_spatial_mod._get_mmproj_models,
            self.node_12b_mod._get_mmproj_models,
        )

    def test_validation_path_traversal_and_nonblocking_f16_none(self) -> None:
        cls = self.node_12b_mod.DuffyGemma4_12B_Analyzer
        self.assertIs(
            cls.validate_inputs(gguf_model="Gemma-4/model.gguf", mmproj_model="gemma-4-12b-heretic-mmproj-f16.gguf"),
            True,
        )
        self.assertIs(
            cls.validate_inputs(gguf_model="Gemma-4/model.gguf", mmproj_model="None"),
            True,
        )
        self.assertIsInstance(
            cls.validate_inputs(gguf_model="../escape.gguf", mmproj_model="None"),
            str,
        )
        self.assertIsInstance(
            cls.validate_inputs(gguf_model="model.gguf", mmproj_model="C:\\evil\\mmproj.gguf"),
            str,
        )
        self.assertIsInstance(
            cls.validate_inputs(
                gguf_model="model.gguf",
                mmproj_model="mmproj-BF16.gguf",
                image_min_tokens=1536,
                image_max_tokens=1024,
            ),
            str,
        )

    def test_mocked_model_cache_batch_sizing_kv_guard_thinking_sync_and_unload(self) -> None:
        mock_llama_cls = MagicMock()
        mock_handler_cls = MagicMock()
        handler_instance = MagicMock()
        handler_instance.enable_thinking = True
        handler_instance.extra_template_arguments = {"enable_thinking": True}
        mock_handler_cls.return_value = handler_instance

        llama_instance = MagicMock()
        mock_llama_cls.return_value = llama_instance

        fake_llama_cpp = types.ModuleType("llama_cpp")
        fake_llama_cpp.Llama = mock_llama_cls
        fake_llama_cpp.GGML_TYPE_F16 = 1
        fake_llama_cpp.GGML_TYPE_Q4_0 = 2
        fake_llama_cpp.GGML_TYPE_Q8_0 = 8
        fake_chat_format = types.ModuleType("llama_cpp.llama_chat_format")
        fake_chat_format.Gemma4ChatHandler = mock_handler_cls
        fake_chat_format.Llava16ChatHandler = MagicMock()

        cache = self.node_12b_mod._model_cache_12b
        with patch.dict(
            sys.modules,
            {"llama_cpp": fake_llama_cpp, "llama_cpp.llama_chat_format": fake_chat_format},
        ):
            # Case 1: default hardware load allows 5-arg spatial_architect reuse + live thinking toggle
            cache.load_model("model.gguf", "mmproj.gguf", -1, 8192, enable_thinking=True)
            l_default = mock_llama_cls.call_args.kwargs
            h_default = mock_handler_cls.call_args.kwargs
            self.assertEqual(l_default["n_ubatch"], 2048)
            self.assertEqual(l_default["n_batch"], 2048)
            self.assertEqual(l_default["swa_full"], False)
            self.assertEqual(l_default["flash_attn_type"], 1)
            self.assertEqual(h_default["batch_max_tokens"], 2048)

            self.assertFalse(
                cache.needs_reload("model.gguf", "mmproj.gguf", -1, 8192, enable_thinking=False)
            )
            self.assertFalse(handler_instance.enable_thinking)
            self.assertFalse(handler_instance.extra_template_arguments["enable_thinking"])

            # Case 2: n_ubatch=512 is automatically raised to >= 1120, swa_full=False, KV FA guard
            cache.load_model(
                "model.gguf",
                "mmproj.gguf",
                -1,
                8192,
                enable_thinking=True,
                n_batch=1024,
                n_ubatch=512,
                image_min_tokens=128,
                image_max_tokens=1120,
                flash_attn=False,
                kv_cache_type_k="q8_0",
                kv_cache_type_v="q8_0",
                mmproj_offload=True,
            )

            h_kwargs = mock_handler_cls.call_args.kwargs
            l_kwargs = mock_llama_cls.call_args.kwargs
            self.assertGreaterEqual(l_kwargs["n_ubatch"], 1120)
            self.assertGreaterEqual(l_kwargs["n_batch"], l_kwargs["n_ubatch"])
            self.assertEqual(h_kwargs["batch_max_tokens"], l_kwargs["n_ubatch"])
            self.assertEqual(h_kwargs["image_max_tokens"], 1120)
            self.assertEqual(l_kwargs["swa_full"], False)
            self.assertEqual(l_kwargs["flash_attn_type"], 0)
            self.assertEqual(l_kwargs["type_k"], 8)
            self.assertEqual(l_kwargs["type_v"], 1)  # forced to f16 when flash_attn=False

            self.assertFalse(
                cache.needs_reload(
                    "model.gguf",
                    "mmproj.gguf",
                    -1,
                    8192,
                    enable_thinking=False,
                    n_batch=1024,
                    n_ubatch=512,
                    image_min_tokens=128,
                    image_max_tokens=1120,
                    flash_attn=False,
                    kv_cache_type_k="q8_0",
                    kv_cache_type_v="q8_0",
                    mmproj_offload=True,
                )
            )

            # Case 3: image_max_tokens=2048 forces n_ubatch=2048
            cache.load_model(
                "model.gguf",
                "mmproj.gguf",
                -1,
                8192,
                enable_thinking=True,
                n_batch=2048,
                n_ubatch=512,
                image_max_tokens=2048,
                flash_attn=True,
                kv_cache_type_k="q8_0",
                kv_cache_type_v="q8_0",
            )
            l_kwargs_2 = mock_llama_cls.call_args.kwargs
            self.assertEqual(l_kwargs_2["n_ubatch"], 2048)
            self.assertEqual(l_kwargs_2["flash_attn_type"], 1)
            self.assertEqual(l_kwargs_2["type_v"], 8)

            # Case 4: text-only (mmproj=None) skips Gemma4ChatHandler
            mock_handler_cls.reset_mock()
            cache.load_model("model.gguf", None, -1, 8192, enable_thinking=True)
            mock_handler_cls.assert_not_called()

        # Verify unload closes resources cleanly without evicting Comfy models by default
        import comfy.model_management as real_mm  # type: ignore

        with (
            patch.object(real_mm, "unload_all_models") as mock_unload_all,
            patch.object(real_mm, "soft_empty_cache") as mock_soft_empty,
        ):
            cache.chat_handler = handler_instance
            cache.model_instance = llama_instance
            cache.unload()
            handler_instance.close.assert_called()
            llama_instance.close.assert_called()
            mock_unload_all.assert_not_called()
            mock_soft_empty.assert_called()

            # Explicit eviction flag calls unload_all_models()
            cache.model_instance = llama_instance
            cache.unload(evict_comfy_models=True)
            mock_unload_all.assert_called_once()

    def test_fingerprint_nan_on_random_and_tensor_pixel_sensitivity(self) -> None:
        cls = self.node_12b_mod.DuffyGemma4_12B_Analyzer
        base_kwargs = dict(
            gguf_model="m.gguf",
            mmproj_model="None",
            use_custom_prompt=True,
            preset_prompt="General Multimodal Analysis",
            system_prompt="sys",
            user_prompt="usr",
            enable_thinking=True,
            strip_thinking_tags=True,
            unload_model=False,
            max_tokens=256,
            temperature=0.8,
            top_k=40,
            top_p=0.95,
            min_p=0.05,
            repeat_penalty=1.1,
            presence_penalty=0.0,
            frequency_penalty=0.0,
            mirostat_mode=0,
            mirostat_tau=5.0,
            mirostat_eta=0.1,
            n_gpu_layers=-1,
            n_ctx=8192,
            frame_sample_interval=2.0,
        )

        img_a = _make_synthetic_image(64, 64, seed=1)
        img_b = img_a.clone()
        img_b[0, 10, 10, 0] = 1.0 - img_b[0, 10, 10, 0]

        fp_rand = cls.fingerprint_inputs(seed=-1, image=img_a, **base_kwargs)
        self.assertIsInstance(fp_rand, float)
        self.assertTrue(math.isnan(fp_rand))

        fp_a1 = cls.fingerprint_inputs(seed=42, preserve_thinking=False, image=img_a, **base_kwargs)
        fp_a2 = cls.fingerprint_inputs(seed=42, preserve_thinking=True, image=img_a, **base_kwargs)
        fp_b = cls.fingerprint_inputs(seed=42, preserve_thinking=False, image=img_b, **base_kwargs)
        self.assertNotIsInstance(fp_a1, bool)
        self.assertEqual(fp_a1, fp_a2)
        self.assertNotEqual(fp_a1, fp_b)

    def test_media_png_encoding_edge_tensors_4k_downscale_batches_and_audio_fallback(self) -> None:
        # C=1 grayscale, C=4 RGBA with NaN/Inf/out-of-range
        gray = torch.full((128, 128, 1), 0.5)
        rgba_dirty = torch.tensor([[[float("nan"), 1.5, -0.5, 0.2]] * 64] * 64, dtype=torch.float32)
        for tensor in (gray, rgba_dirty):
            uri = self.media_mod.image_tensor_to_data_uri(tensor)
            url = uri["image_url"]["url"]
            self.assertTrue(url.startswith("data:image/png;base64,"))
            raw = base64.b64decode(url.split(",", 1)[1])
            pil = Image.open(BytesIO(raw))
            self.assertEqual(pil.format, "PNG")
            self.assertEqual(pil.mode, "RGB")

        # 4K pre-downscale at effective_image_max_tokens=1120 vs full-res at 2048
        img_4k = torch.zeros((2160, 3840, 3), dtype=torch.float32)
        uri_capped = self.media_mod.image_tensor_to_data_uri(
            img_4k, max_long_edge=2048, effective_image_max_tokens=1120
        )
        pil_capped = Image.open(BytesIO(base64.b64decode(uri_capped["image_url"]["url"].split(",", 1)[1])))
        self.assertEqual(max(pil_capped.size), 2048)

        uri_hi = self.media_mod.image_tensor_to_data_uri(
            img_4k, max_long_edge=2048, effective_image_max_tokens=2048
        )
        pil_hi = Image.open(BytesIO(base64.b64decode(uri_hi["image_url"]["url"].split(",", 1)[1])))
        self.assertEqual(pil_hi.size, (3840, 2160))

        # Batched images preserve all batch items
        batch_imgs = _make_synthetic_image(128, 128, seed=9, batch=3)
        batch_uris = self.media_mod.image_tensor_batch_to_data_uris(batch_imgs)
        self.assertEqual(len(batch_uris), 3)

        # Video token budget clamps safely under small n_ctx
        video = torch.zeros((10, 512, 512, 3), dtype=torch.float32)
        frames = self.media_mod.video_tensor_to_frame_list(
            video, target_fps=30.0, source_fps=1.0, n_ctx=2048, image_max_tokens=1120
        )
        self.assertLessEqual(len(frames), 4)

        # Audio WAV encoding works even if torchaudio is missing
        audio = {"waveform": torch.sin(torch.linspace(0, 6.28, 24000)).unsqueeze(0), "sample_rate": 24000}
        with patch.dict(sys.modules, {"torchaudio": None}):
            audio_uri = self.media_mod.audio_to_data_uri(audio)
            self.assertTrue(audio_uri["audio_url"]["url"].startswith("data:audio/wav;base64,"))
            omni_uri = self.media_mod.audio_to_data_uri_omni(audio)
            self.assertEqual(omni_uri["type"], "input_audio")

    def test_context_guard_and_interrupt_propagation(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            model_file = Path(tmpdir) / "dummy.gguf"
            mmproj_file = Path(tmpdir) / "mmproj-dummy-BF16.gguf"
            model_file.write_bytes(b"GGUF")
            mmproj_file.write_bytes(b"GGUF")

            fake_folder_paths = types.SimpleNamespace(
                get_folder_paths=lambda _k: [tmpdir],
                get_full_path=lambda _k, rel: str(Path(tmpdir) / rel),
                get_filename_list=lambda _k: [model_file.name, mmproj_file.name],
            )
            mock_llm = MagicMock()
            cache = self.node_12b_mod._model_cache_12b
            cache.model_instance = mock_llm
            cache.chat_handler = MagicMock()
            cache.current_model_path = str(model_file)
            cache.current_mmproj_path = str(mmproj_file)
            cache.current_n_gpu_layers = -1
            cache.current_n_ctx = 512
            cache._current_hw_config = cache._build_hw_config(
                str(model_file),
                str(mmproj_file),
                -1,
                512,
                self.common_mod.resolve_kv_and_batch_params(512, 2048, 2048, 128, 1120, True, "f16", "f16"),
                True,
            )

            with patch.object(self.common_mod, "folder_paths", fake_folder_paths):
                # Huge batch exceeds n_ctx=512 before inference call
                huge_batch = torch.zeros((4, 1024, 1024, 3), dtype=torch.float32)
                out = self.node_12b_mod.DuffyGemma4_12B_Analyzer.execute(
                    gguf_model=model_file.name,
                    mmproj_model=mmproj_file.name,
                    use_custom_prompt=True,
                    preset_prompt="General Multimodal Analysis",
                    system_prompt="sys",
                    user_prompt="desc",
                    enable_thinking=True,
                    strip_thinking_tags=True,
                    unload_model=False,
                    max_tokens=128,
                    temperature=0.8,
                    top_k=40,
                    top_p=0.95,
                    min_p=0.05,
                    repeat_penalty=1.1,
                    presence_penalty=0.0,
                    frequency_penalty=0.0,
                    mirostat_mode=0,
                    mirostat_tau=5.0,
                    mirostat_eta=0.1,
                    seed=1,
                    n_gpu_layers=-1,
                    n_ctx=512,
                    frame_sample_interval=2.0,
                    image=huge_batch,
                )
                self.assertIn("Validation error", out.args[0])
                mock_llm.create_chat_completion.assert_not_called()

                # InterruptProcessingException during completion propagates cleanly
                cache._current_hw_config = cache._build_hw_config(
                    str(model_file),
                    str(mmproj_file),
                    -1,
                    4096,
                    self.common_mod.resolve_kv_and_batch_params(4096, 2048, 2048, 128, 1120, True, "f16", "f16"),
                    True,
                )
                cache.current_n_ctx = 4096

                def _interrupt_stream(**_kw):
                    yield {"choices": [{"delta": {"content": "hello"}}]}
                    raise FakeInterruptException("cancelled")

                mock_llm.create_chat_completion.side_effect = _interrupt_stream
                with self.assertRaises(FakeInterruptException):
                    self.node_12b_mod.DuffyGemma4_12B_Analyzer.execute(
                        gguf_model=model_file.name,
                        mmproj_model=mmproj_file.name,
                        use_custom_prompt=True,
                        preset_prompt="General Multimodal Analysis",
                        system_prompt="sys",
                        user_prompt="desc",
                        enable_thinking=True,
                        strip_thinking_tags=True,
                        unload_model=True,
                        max_tokens=128,
                        temperature=0.8,
                        top_k=40,
                        top_p=0.95,
                        min_p=0.05,
                        repeat_penalty=1.1,
                        presence_penalty=0.0,
                        frequency_penalty=0.0,
                        mirostat_mode=0,
                        mirostat_tau=5.0,
                        mirostat_eta=0.1,
                        seed=1,
                        n_gpu_layers=-1,
                        n_ctx=4096,
                        frame_sample_interval=2.0,
                    )
                self.assertIsNone(cache.model_instance)


def run_live_suite() -> int:
    """Run live high-resolution (>0.5 MP to 3.69 MP) verification against installed Gemma-4 models."""
    import folder_paths  # type: ignore

    llm_dir = Path(r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI\models\LLM")
    if llm_dir.is_dir():
        folder_paths.add_model_folder_path("LLM", str(llm_dir))

    files = folder_paths.get_filename_list("LLM")
    candidates_12b = [
        "Gemma-4\\gemma-4-12B-it-uncensored-Q4_K_M.gguf",
        "Gemma-4/gemma-4-12B-it-uncensored-Q4_K_M.gguf",
    ]
    mmproj_12b_candidates = [
        "Gemma-4\\mmproj-gemma-4-12B-it-BF16.gguf",
        "Gemma-4/mmproj-gemma-4-12B-it-BF16.gguf",
    ]
    model_rel = next((c for c in candidates_12b if c in files), None)
    mmproj_rel = next((c for c in mmproj_12b_candidates if c in files), None)
    if not model_rel or not mmproj_rel:
        print(f"SKIP live test: 12B Q4_K_M or BF16 mmproj not found in {files}")
        return 0

    mod_12b = _import_duffy_package("nodes.gemma_4_12b_analyzer")
    mod_gguf = _import_duffy_package("nodes.gemma_gguf_analyzer")
    common_mod = _import_duffy_package("utils.gemma_common")

    print(f"[LIVE] Using model={model_rel}, mmproj={mmproj_rel}")
    resolutions = [
        (848, 592, "0.50 MP"),
        (960, 1280, "1.23 MP"),
        (1080, 1920, "2.07 MP"),
        (1440, 2560, "3.69 MP"),
    ]

    try:
        for idx, (h, w, label) in enumerate(resolutions):
            img = _make_synthetic_image(h, w, seed=100 + idx)
            # Toggle enable_thinking on final resolution to verify zero-reload live switch
            use_thinking = idx < len(resolutions) - 1
            if idx > 0:
                needs = mod_12b._model_cache_12b.needs_reload(
                    common_mod.resolve_llm_subpath(model_rel),
                    common_mod.resolve_llm_subpath(mmproj_rel),
                    -1,
                    10240,
                    enable_thinking=use_thinking,
                )
                assert not needs, f"Unexpected reload on resolution={label}, enable_thinking={use_thinking}"

            out = mod_12b.DuffyGemma4_12B_Analyzer.execute(
                gguf_model=model_rel,
                mmproj_model=mmproj_rel,
                use_custom_prompt=True,
                preset_prompt="General Multimodal Analysis",
                system_prompt="You are concise.",
                user_prompt="Describe brightness and colors in one short sentence.",
                enable_thinking=use_thinking,
                preserve_thinking=False,
                strip_thinking_tags=True,
                unload_model=False,
                max_tokens=256,
                temperature=0.2,
                top_k=20,
                top_p=0.95,
                min_p=0.05,
                repeat_penalty=1.1,
                presence_penalty=0.0,
                frequency_penalty=0.0,
                mirostat_mode=0,
                mirostat_tau=5.0,
                mirostat_eta=0.1,
                seed=42,
                n_gpu_layers=-1,
                n_ctx=10240,
                frame_sample_interval=2.0,
                mmproj_offload=True,
                flash_attn=True,
                kv_cache_type_k="f16",
                kv_cache_type_v="f16",
                n_batch=2048,
                n_ubatch=2048,
                image_min_tokens=128,
                image_max_tokens=1120,
                image=img,
            )
            text = out.args[0]
            assert not text.startswith("[DuffyGemma4_12B_Analyzer]"), text
            assert len(text.strip()) > 0
            print(f"[LIVE PASS] 12B {label} ({w}x{h}) thinking={use_thinking}: {text[:80]!r}")

        # Dual image + batch=2 test on 12B
        img_main = _make_synthetic_image(1080, 1920, seed=200)
        img_ref = _make_synthetic_image(1080, 1920, seed=201)
        out_dual = mod_12b.DuffyGemma4_12B_Analyzer.execute(
            gguf_model=model_rel,
            mmproj_model=mmproj_rel,
            use_custom_prompt=True,
            preset_prompt="General Multimodal Analysis",
            system_prompt="You are concise.",
            user_prompt="Compare both images in 5 words.",
            enable_thinking=False,
            strip_thinking_tags=True,
            unload_model=True,
            max_tokens=48,
            temperature=0.2,
            top_k=20,
            top_p=0.95,
            min_p=0.05,
            repeat_penalty=1.1,
            presence_penalty=0.0,
            frequency_penalty=0.0,
            mirostat_mode=0,
            mirostat_tau=5.0,
            mirostat_eta=0.1,
            seed=42,
            n_gpu_layers=-1,
            n_ctx=10240,
            frame_sample_interval=2.0,
            image=img_main,
            reference_image=img_ref,
        )
        assert not out_dual.args[0].startswith("[DuffyGemma4_12B_Analyzer]"), out_dual.args[0]
        assert mod_12b._model_cache_12b.model_instance is None
        print(f"[LIVE PASS] 12B dual 2.07MP + unload: {out_dual.args[0][:80]!r}")

        # Also test sibling DuffyGemmaGGUFAnalyzer at 2.07 MP (1920x1080)
        out_sibling = mod_gguf.DuffyGemmaGGUFAnalyzer.execute(
            gguf_model=model_rel,
            mmproj_model=mmproj_rel,
            use_custom_prompt=True,
            preset_prompt="Reverse Engineered Prompt",
            system_prompt="You are concise.",
            user_prompt="Reply with 5 words about this image.",
            enable_thinking=False,
            strip_thinking_tags=True,
            unload_model=True,
            max_tokens=48,
            temperature=0.2,
            top_k=20,
            top_p=0.95,
            min_p=0.05,
            repeat_penalty=1.1,
            presence_penalty=0.0,
            frequency_penalty=0.0,
            mirostat_mode=0,
            mirostat_tau=5.0,
            mirostat_eta=0.1,
            seed=42,
            n_gpu_layers=-1,
            n_ctx=8192,
            video_fps=1.0,
            image=_make_synthetic_image(1080, 1920, seed=300),
        )
        assert not out_sibling.args[0].startswith("[DuffyGemmaGGUFAnalyzer]"), out_sibling.args[0]
        if torch.cuda.is_available():
            free_b, total_b = torch.cuda.mem_get_info()
            print(f"[LIVE GPU] free={(free_b / 1024**3):.2f} GiB / total={(total_b / 1024**3):.2f} GiB")
        print(f"[LIVE PASS] Sibling DuffyGemmaGGUFAnalyzer 2.07MP: {out_sibling.args[0][:80]!r}")
        return 0
    finally:
        mod_12b._model_cache_12b.unload()
        mod_gguf._model_cache.unload()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--live", action="store_true")
    known, remaining = parser.parse_known_args()
    if known.live:
        rc = run_live_suite()
        sys.exit(rc)
    unittest.main(argv=[sys.argv[0], *remaining])
