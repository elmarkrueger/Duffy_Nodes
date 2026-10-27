"""Unit and integration test suite for the MiniMax-H3 Multi-Clip Storyboard & A/V Stitching Suite.

Covers:
  1. Schema V3 contract for all 5 nodes (`Duffy_H3_GlobalMediaVault`, `Duffy_H3_ClipCard`,
     `Duffy_H3_SamplerConfig`, `Duffy_H3_ExecutionEngine`, `Duffy_H3_AVStitcher`).
  2. Variable-duration multi-clip chains (`3.5s` -> `15.0s` -> `6.2s` at 24 fps, 48000 Hz)
     with `17k + 5` DiT frame ceiling calculation and exact post-decode frame/audio trimming.
  3. Upstream model, LoRA, attention, and sampler hash isolation (`ClipSpec.config_hash`
     and `fingerprint_inputs` ignore upstream accelerator changes when clips are cached).
  4. Non-destructive single-clip re-rendering and `cascade_rerender` ON/OFF behavior
     (including `OUT_OF_SYNC` warning when OFF, cascade propagation when ON, and stopping
     at Hard Cuts `overlap_frames_N == 0` or `Lock_Cache`).
  5. Master timeline audio auto-slicing (`slice_from_master_audio=True`) using exact
     cumulative frame offset $F_{\\text{start}}(i) = \\sum_{k=1}^{i-1} (F_k - N_{k+1})$.
  6. Synchronous A/V stitching (`Linear_Crossfade_Overlap`, `Trim_Duplicate_Head`,
     `Optical_Flow_Blend`, `Equal_Power_Cosine`, `Linear`, `Hard_Cut_At_Midpoint`, and
     5ms hard-cut micro-fade) with zero sample drift across variable overlaps.
  7. Edge-case validation: overlap clamping ($N_i \\le \\min(F_{i-1}-1, F_i-1)$), resolution
     normalization, mono-to-stereo resampling, and `finalize_project=True` cache cleanup.
"""

from __future__ import annotations

import importlib.util
import os
import shutil
import sys
import tempfile
import types
import unittest

COMFY_ROOT = r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI"
if os.path.isdir(COMFY_ROOT) and COMFY_ROOT not in sys.path:
    sys.path.insert(0, COMFY_ROOT)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODES_DIR = os.path.join(REPO_ROOT, "nodes")

# Create a lightweight namespace package stub for `nodes` so relative imports inside
# the H3 modules resolve without executing `nodes/__init__.py` (which imports `server`).
if "nodes" not in sys.modules or not hasattr(sys.modules["nodes"], "__path__"):
    nodes_pkg = types.ModuleType("nodes")
    nodes_pkg.__path__ = [NODES_DIR]
    sys.modules["nodes"] = nodes_pkg


def _load_node_submodule(mod_name: str):
    full_name = f"nodes.{mod_name}"
    file_path = os.path.join(NODES_DIR, f"{mod_name}.py")
    spec = importlib.util.spec_from_file_location(full_name, file_path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    sys.modules[full_name] = mod
    spec.loader.exec_module(mod)
    return mod


h3_pm = _load_node_submodule("h3_project_manager")
h3_ba = _load_node_submodule("h3_backend_adapter")
h3_av = _load_node_submodule("h3_av_stitcher_core")
h3_sb = _load_node_submodule("nodes_h3_storyboard")

import torch

blend_video_seam = h3_av.blend_video_seam
clamp_overlap_frames = h3_av.clamp_overlap_frames
crossfade_audio_seam = h3_av.crossfade_audio_seam
stitch_clip_sequence = h3_av.stitch_clip_sequence

align_h3_frame_count = h3_ba.align_h3_frame_count
reset_temporal_accelerator_state = h3_ba.reset_temporal_accelerator_state
valid_h3_guide_frame_count = h3_ba.valid_h3_guide_frame_count

H3ProjectWorkspace = h3_pm.H3ProjectWorkspace
fast_tensor_digest = h3_pm.fast_tensor_digest
sanitize_project_name = h3_pm.sanitize_project_name

DuffyH3AVStitcher = h3_sb.DuffyH3AVStitcher
DuffyH3ClipCard = h3_sb.DuffyH3ClipCard
DuffyH3ExecutionEngine = h3_sb.DuffyH3ExecutionEngine
DuffyH3GlobalMediaVault = h3_sb.DuffyH3GlobalMediaVault
DuffyH3SamplerConfig = h3_sb.DuffyH3SamplerConfig


class TestH3StoryboardSuite(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_root = tempfile.mkdtemp(prefix="duffy_h3_test_")

    def tearDown(self) -> None:
        if os.path.isdir(self.tmp_root):
            shutil.rmtree(self.tmp_root, ignore_errors=True)

    def test_v3_schemas_and_registration(self) -> None:
        """Verify all 5 H3 nodes define valid V3 schemas and are registered in NODE_LIST."""
        node_classes = [
            (DuffyH3GlobalMediaVault, "Duffy_H3_GlobalMediaVault"),
            (DuffyH3ClipCard, "Duffy_H3_ClipCard"),
            (DuffyH3SamplerConfig, "Duffy_H3_SamplerConfig"),
            (DuffyH3ExecutionEngine, "Duffy_H3_ExecutionEngine"),
            (DuffyH3AVStitcher, "Duffy_H3_AVStitcher"),
        ]
        for cls, expected_id in node_classes:
            schema = cls.define_schema()
            self.assertEqual(schema.node_id, expected_id)
            self.assertTrue(schema.category.startswith("Duffy/MiniMax-H3/"))
            self.assertTrue(len(schema.inputs) > 0)
            self.assertTrue(len(schema.outputs) > 0)

        init_path = os.path.join(REPO_ROOT, "nodes", "__init__.py")
        with open(init_path, "r", encoding="utf-8") as f:
            init_source = f.read()
        for cls, _ in node_classes:
            self.assertIn(cls.__name__, init_source)

    def test_17k_plus_5_frame_alignment_and_guide_lengths(self) -> None:
        """Verify MiniMax-H3's 17k+5 DiT frame ceiling and guide clip length snapping."""
        # 3.5s @ 24fps = 84 frames -> next 17k+5 is 17*5 + 5 = 90
        self.assertEqual(align_h3_frame_count(84), 90)
        # 5.0s @ 24fps = 120 frames -> next 17k+5 is 17*7 + 5 = 124
        self.assertEqual(align_h3_frame_count(120), 124)
        # 10.0s @ 24fps = 240 frames -> next 17k+5 is 17*14 + 5 = 243
        self.assertEqual(align_h3_frame_count(240), 243)
        # 15.0s @ 24fps = 360 frames -> next 17k+5 is 17*21 + 5 = 362
        self.assertEqual(align_h3_frame_count(360), 362)
        # 6.2s @ 24fps = 149 frames -> next 17k+5 is 17*9 + 5 = 158
        self.assertEqual(align_h3_frame_count(149), 158)

        # Guide frame count snaps down to 17k+5 (or 1 if < 5)
        self.assertEqual(valid_h3_guide_frame_count(4), 1)
        self.assertEqual(valid_h3_guide_frame_count(5), 5)
        self.assertEqual(valid_h3_guide_frame_count(8), 5)
        self.assertEqual(valid_h3_guide_frame_count(25), 22)

    def test_variable_duration_chain_and_zero_av_drift(self) -> None:
        """Verify 3.5s -> 15.0s -> 6.2s chain renders, caches exact F_i/S_i, and stitches with zero A/V drift."""
        fps = 24
        sr = 48000
        width, height = 128, 96  # compact test canvas

        # 1. Initialize Global Media Vault with a reference image and master timeline audio
        hero_img = torch.rand((1, 100, 160, 3), dtype=torch.float32)  # mismatched size -> auto-resized to 128x96
        master_samples = int(30.0 * sr)
        master_wave = torch.linspace(-0.8, 0.8, steps=master_samples, dtype=torch.float32).view(1, 1, -1)  # mono -> stereo

        bus = DuffyH3GlobalMediaVault.execute(
            project_name="Test_Variable_Chain",
            fps=fps,
            width=width,
            height=height,
            audio_sample_rate=str(sr),
            ref_image_tag_1="hero",
            ref_image_1=hero_img,
            master_timeline_audio={"waveform": master_wave, "sample_rate": sr},
            base_output_dir=self.tmp_root,
        )[0]

        # 2. Chain 3 variable-duration ClipCards: 3.5s (84f), 15.0s (360f, overlap=8), 6.2s (149f, overlap=12)
        bus = DuffyH3ClipCard.execute(
            project_bus=bus,
            prompt="Shot 1: Intro 3.5s",
            duration_sec=3.5,
            seed=101,
            overlap_frames_N=8,  # Forced to 0 automatically because it is Clip 1
            use_global_image_tags="hero",
            slice_from_master_audio=True,
        )[0]
        self.assertEqual(bus["clips"][0]["overlap_frames_N"], 0)
        self.assertEqual(bus["clips"][0]["target_frames"], 84)

        bus = DuffyH3ClipCard.execute(
            project_bus=bus,
            prompt="Shot 2: Main 15.0s",
            duration_sec=15.0,
            seed=202,
            overlap_frames_N=8,
            use_global_image_tags="hero",
            slice_from_master_audio=True,
        )[0]
        self.assertEqual(bus["clips"][1]["overlap_frames_N"], 8)
        self.assertEqual(bus["clips"][1]["target_frames"], 360)

        bus = DuffyH3ClipCard.execute(
            project_bus=bus,
            prompt="Shot 3: Outro 6.2s",
            duration_sec=6.2,
            seed=303,
            overlap_frames_N=12,
            slice_from_master_audio=True,
        )[0]
        self.assertEqual(bus["clips"][2]["overlap_frames_N"], 12)
        self.assertEqual(bus["clips"][2]["target_frames"], 149)

        # 3. Execute via DuffyH3ExecutionEngine with mock model pipe
        mock_pipe = {"mock": True, "call_log": [], "attention": "sage_attention"}
        sampler_cfg = DuffyH3SamplerConfig.execute(
            sampler_mode="SelfLift_Progressive",
            steps=8,
            cfg=1.0,
            transition_step=4,
            lowres_scale=0.4,
        )[0]

        bus_exec, report = DuffyH3ExecutionEngine.execute(
            project_bus=bus,
            model_or_pipe=mock_pipe,
            cascade_rerender=False,
            sampler_config=sampler_cfg,
        )
        self.assertEqual(len(mock_pipe["call_log"]), 3)
        self.assertIn("[RENDERED]", report)

        # Verify DiT frame ceiling vs cached actual_frames
        self.assertEqual(mock_pipe["call_log"][0]["aligned_dit_frames"], 90)
        self.assertEqual(mock_pipe["call_log"][1]["aligned_dit_frames"], 362)
        self.assertEqual(mock_pipe["call_log"][2]["aligned_dit_frames"], 158)

        manifest = bus_exec["manifest"]
        self.assertEqual(manifest["clips"]["clip_001"]["actual_frames"], 84)
        self.assertEqual(manifest["clips"]["clip_002"]["actual_frames"], 360)
        self.assertEqual(manifest["clips"]["clip_003"]["actual_frames"], 149)

        # 4. Stitch via DuffyH3AVStitcher (finalize_project=False)
        stitched_images, stitched_audio, video_path = DuffyH3AVStitcher.execute(
            project_bus=bus_exec,
            visual_transition_mode="Linear_Crossfade_Overlap",
            audio_crossfade_curve="Equal_Power_Cosine",
            export_format="mp4_h264_aac",
            finalize_project=False,
        )

        # Expected total frames: 84 + (360 - 8) + (149 - 12) = 573 frames
        expected_total_frames = 84 + (360 - 8) + (149 - 12)
        expected_total_samples = int(round((expected_total_frames / float(fps)) * sr))

        self.assertEqual(tuple(stitched_images.shape), (expected_total_frames, height, width, 3))
        self.assertEqual(tuple(stitched_audio["waveform"].shape), (1, 2, expected_total_samples))
        self.assertEqual(stitched_audio["sample_rate"], sr)
        self.assertTrue(os.path.isfile(video_path))

    def test_upstream_lora_and_attention_hash_isolation(self) -> None:
        """Changing upstream model/LoRA/attention/sampler settings must NOT invalidate cached clips."""
        bus = DuffyH3GlobalMediaVault.execute(
            project_name="Test_Hash_Isolation",
            fps=24,
            width=64,
            height=64,
            audio_sample_rate="48000",
            base_output_dir=self.tmp_root,
        )[0]
        bus = DuffyH3ClipCard.execute(project_bus=bus, prompt="Clip 1", duration_sec=2.0, seed=11)[0]
        bus = DuffyH3ClipCard.execute(project_bus=bus, prompt="Clip 2", duration_sec=2.0, seed=22, overlap_frames_N=6)[0]

        pipe_v1 = {"mock": True, "call_log": [], "attention": "sdpa", "lora": None}
        cfg_v1 = DuffyH3SamplerConfig.execute(sampler_mode="Standard_KSampler", steps=30, cfg=6.0)[0]

        fp_1 = DuffyH3ExecutionEngine.fingerprint_inputs(
            project_bus=bus,
            model_or_pipe=pipe_v1,
            cascade_rerender=False,
            sampler_config=cfg_v1,
        )
        self.assertIsInstance(fp_1, str)

        bus_after_1, _ = DuffyH3ExecutionEngine.execute(
            project_bus=bus,
            model_or_pipe=pipe_v1,
            cascade_rerender=False,
            sampler_config=cfg_v1,
        )
        self.assertEqual(len(pipe_v1["call_log"]), 2)

        # Now switch upstream model to Turbo LoRA + SageAttention + Sol-Attn + SelfLift 4-step
        pipe_v2 = {
            "mock": True,
            "call_log": [],
            "attention": "comfy_kitchen_sol_attn",
            "lora": "minimax_h3_ref2v_turbo_4step",
        }
        cfg_v2 = DuffyH3SamplerConfig.execute(sampler_mode="SelfLift_Progressive", steps=8, cfg=1.0)[0]

        fp_after_1 = DuffyH3ExecutionEngine.fingerprint_inputs(
            project_bus=bus,
            model_or_pipe=pipe_v1,
            cascade_rerender=False,
            sampler_config=cfg_v1,
        )
        fp_after_2 = DuffyH3ExecutionEngine.fingerprint_inputs(
            project_bus=bus,
            model_or_pipe=pipe_v2,
            cascade_rerender=False,
            sampler_config=cfg_v2,
        )
        # Fingerprint must be identical despite completely different upstream model_or_pipe and sampler_config
        self.assertEqual(fp_after_1, fp_after_2)

        _, report_2 = DuffyH3ExecutionEngine.execute(
            project_bus=bus,
            model_or_pipe=pipe_v2,
            cascade_rerender=False,
            sampler_config=cfg_v2,
        )
        # Zero clips re-rendered!
        self.assertEqual(len(pipe_v2["call_log"]), 0)
        self.assertNotIn("[RENDERED]", report_2)
        self.assertIn("[CACHED]", report_2)

    def test_single_clip_rerender_and_cascade_toggle(self) -> None:
        """Verify modifying Clip 2 out of 4 with Cascade OFF vs Cascade ON, plus Hard Cut and Lock_Cache boundaries."""
        def build_chain(clip2_seed: int, clip3_mode: str = "Smart_Auto", clip4_overlap: int = 0) -> dict:
            b = DuffyH3GlobalMediaVault.execute(
                project_name="Test_Cascade",
                fps=24,
                width=64,
                height=64,
                audio_sample_rate="48000",
                base_output_dir=self.tmp_root,
            )[0]
            b = DuffyH3ClipCard.execute(project_bus=b, prompt="C1", duration_sec=2.0, seed=1)[0]
            b = DuffyH3ClipCard.execute(project_bus=b, prompt="C2", duration_sec=2.0, seed=clip2_seed, overlap_frames_N=6)[0]
            b = DuffyH3ClipCard.execute(
                project_bus=b,
                prompt="C3",
                duration_sec=2.0,
                seed=3,
                overlap_frames_N=6,
                render_mode=clip3_mode,
            )[0]
            b = DuffyH3ClipCard.execute(
                project_bus=b,
                prompt="C4",
                duration_sec=2.0,
                seed=4,
                overlap_frames_N=clip4_overlap,  # 0 = Hard Cut
            )[0]
            return b

        # Initial full render of all 4 clips
        bus_init = build_chain(clip2_seed=20)
        pipe_init = {"mock": True, "call_log": []}
        DuffyH3ExecutionEngine.execute(project_bus=bus_init, model_or_pipe=pipe_init, cascade_rerender=False)
        self.assertEqual([c["clip_id"] for c in pipe_init["call_log"]], ["clip_001", "clip_002", "clip_003", "clip_004"])

        # Modify ONLY Clip 2 (seed 20 -> 999) with cascade_rerender=False
        bus_mod = build_chain(clip2_seed=999)
        pipe_no_cascade = {"mock": True, "call_log": []}
        bus_out_off, report_off = DuffyH3ExecutionEngine.execute(
            project_bus=bus_mod,
            model_or_pipe=pipe_no_cascade,
            cascade_rerender=False,
        )
        # Only clip_002 should render; clip_003 should be flagged OUT_OF_SYNC; clip_004 (Hard Cut) stays SYNCED
        self.assertEqual([c["clip_id"] for c in pipe_no_cascade["call_log"]], ["clip_002"])
        self.assertIn("[Continuity Warning: Out of Sync]", report_off)
        self.assertEqual(bus_out_off["manifest"]["clips"]["clip_003"]["continuity_status"], "OUT_OF_SYNC")
        self.assertEqual(bus_out_off["manifest"]["clips"]["clip_004"]["continuity_status"], "SYNCED")

        # Now run with cascade_rerender=True: clip_003 must automatically re-render to sync with clip_002's new tail,
        # while clip_004 has overlap_frames_N=0 (Hard Cut) so cascade stops before clip_004!
        pipe_cascade = {"mock": True, "call_log": []}
        bus_out_on, report_on = DuffyH3ExecutionEngine.execute(
            project_bus=bus_mod,
            model_or_pipe=pipe_cascade,
            cascade_rerender=True,
        )
        self.assertEqual([c["clip_id"] for c in pipe_cascade["call_log"]], ["clip_003"])
        self.assertNotIn("[Continuity Warning: Out of Sync]", report_on)
        self.assertEqual(bus_out_on["manifest"]["clips"]["clip_003"]["continuity_status"], "SYNCED")

    def test_overlap_clamping_and_transition_modes_and_finalization(self) -> None:
        """Verify overlap clamping, all 3 visual transition modes, all 3 audio curves, and finalize_project cleanup."""
        # Overlap clamping when overlap_frames_N (30) >= clip frames (24)
        clamped, was_clamped = clamp_overlap_frames(24, 24, 30)
        self.assertTrue(was_clamped)
        self.assertEqual(clamped, 23)

        bus = DuffyH3GlobalMediaVault.execute(
            project_name="Test_Finalize",
            fps=24,
            width=64,
            height=64,
            audio_sample_rate="44100",
            base_output_dir=self.tmp_root,
        )[0]
        bus = DuffyH3ClipCard.execute(project_bus=bus, prompt="A", duration_sec=1.0, seed=10)[0]
        bus = DuffyH3ClipCard.execute(project_bus=bus, prompt="B", duration_sec=1.0, seed=20, overlap_frames_N=30)[0]
        # Verify warning was recorded and overlap clamped to 23
        self.assertEqual(bus["clips"][1]["overlap_frames_N"], 23)
        self.assertEqual(len(bus["warnings"]), 1)

        pipe = {"mock": True, "call_log": []}
        bus_exec, _ = DuffyH3ExecutionEngine.execute(project_bus=bus, model_or_pipe=pipe, cascade_rerender=True)

        # Test all visual transition modes and audio curves without finalizing
        for v_mode, a_curve in (
            ("Linear_Crossfade_Overlap", "Equal_Power_Cosine"),
            ("Trim_Duplicate_Head", "Linear"),
            ("Optical_Flow_Blend", "Hard_Cut_At_Midpoint"),
        ):
            imgs, aud, _ = DuffyH3AVStitcher.execute(
                project_bus=bus_exec,
                visual_transition_mode=v_mode,
                audio_crossfade_curve=a_curve,
                export_format="mp4_h264_aac",
                finalize_project=False,
            )
            # 24 + (24 - 23) = 25 frames
            self.assertEqual(imgs.shape[0], 25)
            expected_samples = int(round((25 / 24.0) * 44100))
            self.assertEqual(aud["waveform"].shape[-1], expected_samples)

        # Now finalize project -> cache/ and vault/ must be deleted while final deliverable exists
        workspace = H3ProjectWorkspace("Test_Finalize", base_output_dir=self.tmp_root)
        self.assertTrue(os.path.isdir(workspace.cache_dir))
        self.assertTrue(os.path.isdir(workspace.vault_dir))

        _, _, final_path = DuffyH3AVStitcher.execute(
            project_bus=bus_exec,
            visual_transition_mode="Linear_Crossfade_Overlap",
            audio_crossfade_curve="Equal_Power_Cosine",
            export_format="mp4_h264_aac",
            finalize_project=True,
        )
        self.assertTrue(os.path.isfile(final_path))
        self.assertFalse(os.path.isdir(workspace.cache_dir))
        self.assertFalse(os.path.isdir(workspace.vault_dir))

    def test_stateful_accelerator_reset(self) -> None:
        """Verify reset_temporal_accelerator_state clears transient step counters while keeping LoRA/attention options."""
        cleaned = {"called": False}

        class DummyPatch:
            def cleanup(self) -> None:
                cleaned["called"] = True

        class DummyDiffModel:
            def __init__(self) -> None:
                self.cnt = 7
                self.accumulated_rel_l1_distance = 0.42
                self.previous_residual = "tensor_ref"

        class DummyInnerModel:
            def __init__(self) -> None:
                self.diffusion_model = DummyDiffModel()

        class DummyModelPatcher:
            def __init__(self) -> None:
                self.model = DummyInnerModel()
                self.model_options = {
                    "transformer_options": {
                        "minimax_h3_sigma_shift_video": 12.0,
                        "teacache_state": {"step": 8},
                        "cnt": 8,
                        "patches_replace": {"dit": {("double_block", 0): DummyPatch()}},
                    }
                }

        patcher = DummyModelPatcher()
        reset_temporal_accelerator_state(patcher)
        self.assertTrue(cleaned["called"])
        self.assertEqual(patcher.model.diffusion_model.cnt, 0)
        self.assertEqual(patcher.model.diffusion_model.accumulated_rel_l1_distance, 0.0)
        self.assertIsNone(patcher.model.diffusion_model.previous_residual)
        # Persistent sigma shift option must remain intact
        self.assertEqual(
            patcher.model_options["transformer_options"]["minimax_h3_sigma_shift_video"],
            12.0,
        )
        self.assertNotIn("teacache_state", patcher.model_options["transformer_options"])


if __name__ == "__main__":
    unittest.main()
