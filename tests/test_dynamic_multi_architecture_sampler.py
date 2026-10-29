import importlib.util
import math
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

import torch

# Ensure ComfyUI path is available first
sys.path.insert(0, r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sampler_path = os.path.join(REPO_ROOT, "nodes", "dynamic_multi_architecture_sampler.py")
spec = importlib.util.spec_from_file_location("nodes.dynamic_multi_architecture_sampler", sampler_path)
sampler_mod = importlib.util.module_from_spec(spec)
sys.modules["nodes.dynamic_multi_architecture_sampler"] = sampler_mod
spec.loader.exec_module(sampler_mod)

DuffyDynamicMultiArchitectureSampler = sampler_mod.DuffyDynamicMultiArchitectureSampler

replacements_path = os.path.join(REPO_ROOT, "nodes", "node_replacements.py")
rep_spec = importlib.util.spec_from_file_location("nodes.node_replacements", replacements_path)
rep_mod = importlib.util.module_from_spec(rep_spec)
sys.modules["nodes.node_replacements"] = rep_mod
rep_spec.loader.exec_module(rep_mod)


class TestDynamicMultiArchitectureSampler(unittest.TestCase):
    def test_schema_is_universal_without_model_presets(self):
        schema = DuffyDynamicMultiArchitectureSampler.define_schema()
        self.assertEqual(schema.node_id, "Duffy_DynamicMultiArchitectureSampler")

        input_ids = [inp.id for inp in schema.inputs]
        self.assertNotIn("model_selection", input_ids)
        self.assertFalse(hasattr(DuffyDynamicMultiArchitectureSampler, "MODEL_PROFILES"))

        for expected_id in (
            "model",
            "seed",
            "steps",
            "cfg",
            "sampler_name",
            "scheduler",
            "positive",
            "negative",
            "latent_image",
            "denoise",
            "enable_ofd",
            "ofd_offset",
            "ofd_factor",
            "ofd_delta",
            "ofd_start_percent",
            "ofd_end_percent",
        ):
            self.assertIn(expected_id, input_ids)

    def test_validate_inputs_universal_ranges(self):
        # 1-step turbo/LCM models and high-step base models are both valid
        self.assertTrue(DuffyDynamicMultiArchitectureSampler.validate_inputs(steps=1, cfg=1.0, denoise=1.0))
        self.assertTrue(DuffyDynamicMultiArchitectureSampler.validate_inputs(steps=150, cfg=7.5, denoise=0.5))
        self.assertTrue(DuffyDynamicMultiArchitectureSampler.validate_inputs(steps=None, cfg=None, denoise=None))

        err_steps = DuffyDynamicMultiArchitectureSampler.validate_inputs(steps=0, cfg=1.0, denoise=1.0)
        self.assertIsInstance(err_steps, str)

        err_cfg = DuffyDynamicMultiArchitectureSampler.validate_inputs(steps=20, cfg=-0.5, denoise=1.0)
        self.assertIsInstance(err_cfg, str)

        err_denoise = DuffyDynamicMultiArchitectureSampler.validate_inputs(steps=20, cfg=1.0, denoise=1.5)
        self.assertIsInstance(err_denoise, str)

    def test_initial_offset_preserves_exact_hypersphere_norm_4d_and_5d(self):
        torch.manual_seed(42)
        for shape in ([2, 16, 32, 32], [1, 16, 4, 16, 16]):
            noise = torch.randn(shape, dtype=torch.float32)
            orig_flat = noise.reshape(noise.shape[0], -1)
            orig_norm = orig_flat.norm(dim=1)

            offset_val = 0.4
            rotated = DuffyDynamicMultiArchitectureSampler._apply_initial_offset(
                noise=noise,
                seed=12345,
                ofd_offset=offset_val,
                ofd_delta=0.25,
            )
            self.assertEqual(rotated.shape, noise.shape)
            rot_flat = rotated.reshape(rotated.shape[0], -1)
            rot_norm = rot_flat.norm(dim=1)

            # L2 norm on the Gaussian hypersphere must be strictly preserved
            self.assertTrue(torch.allclose(orig_norm, rot_norm, rtol=1e-5, atol=1e-5))

            # Geodesic angle between original and rotated noise must equal offset * (pi / 4)
            cos_sim = (orig_flat * rot_flat).sum(dim=1) / (orig_norm * rot_norm)
            expected_cos = math.cos(offset_val * (math.pi * 0.25))
            for c in cos_sim.tolist():
                self.assertAlmostEqual(c, expected_cos, places=4)

    def test_dual_gram_schmidt_orthogonality(self):
        torch.manual_seed(99)
        b, n = 2, 4096
        u1 = torch.randn(b, n)
        u2 = torch.randn(b, n)
        vec = torch.randn(b, n)

        ortho = DuffyDynamicMultiArchitectureSampler._project_orthogonal(vec, [u1, u2])
        # Unit norm
        norms = ortho.norm(dim=1)
        self.assertTrue(torch.allclose(norms, torch.ones_like(norms), atol=1e-5))

        # Strictly orthogonal to both u1 and u2
        dot1 = (ortho * (u1 / u1.norm(dim=1, keepdim=True))).sum(dim=1).abs().max().item()
        dot2 = (ortho * (u2 / u2.norm(dim=1, keepdim=True))).sum(dim=1).abs().max().item()
        self.assertLess(dot1, 1e-5)
        self.assertLess(dot2, 1e-5)

    def test_trajectory_ofd_works_for_both_cfg1_and_guided_models(self):
        torch.manual_seed(7)
        denoised = torch.randn(1, 16, 32, 32)
        x_input = denoised + torch.randn_like(denoised) * 0.5
        cond = denoised + torch.randn_like(denoised) * 0.1
        uncond = denoised - torch.randn_like(denoised) * 0.1

        b_struct = DuffyDynamicMultiArchitectureSampler._build_multiscale_field(denoised, 777, 1, 0.75)
        b_detail = DuffyDynamicMultiArchitectureSampler._build_multiscale_field(denoised, 777, 2, 0.15)

        # 1. Distilled / Flow mode (CFG=1.0, cond_denoised and uncond_denoised are None)
        out_cfg1 = DuffyDynamicMultiArchitectureSampler._apply_trajectory_ofd(
            denoised=denoised,
            x_input=x_input,
            cond_denoised=None,
            uncond_denoised=None,
            basis_struct=b_struct,
            basis_detail=b_detail,
            ofd_factor=0.5,
            ofd_delta=0.0,
            progress=0.40,
            start_percent=0.10,
            end_percent=0.75,
        )
        self.assertFalse(torch.allclose(out_cfg1, denoised))

        # 2. Guided mode (CFG > 1.0)
        out_guided = DuffyDynamicMultiArchitectureSampler._apply_trajectory_ofd(
            denoised=denoised,
            x_input=x_input,
            cond_denoised=cond,
            uncond_denoised=uncond,
            basis_struct=b_struct,
            basis_detail=b_detail,
            ofd_factor=0.5,
            ofd_delta=0.0,
            progress=0.40,
            start_percent=0.10,
            end_percent=0.75,
        )
        self.assertFalse(torch.allclose(out_guided, denoised))

        # 3. Sweeping ofd_delta produces distinct variations on the same seed
        out_delta_shifted = DuffyDynamicMultiArchitectureSampler._apply_trajectory_ofd(
            denoised=denoised,
            x_input=x_input,
            cond_denoised=cond,
            uncond_denoised=uncond,
            basis_struct=b_struct,
            basis_detail=b_detail,
            ofd_factor=0.5,
            ofd_delta=0.5,
            progress=0.40,
            start_percent=0.10,
            end_percent=0.75,
        )
        self.assertFalse(torch.allclose(out_guided, out_delta_shifted))

        # 4. Outside temporal window -> untouched passthrough
        out_outside = DuffyDynamicMultiArchitectureSampler._apply_trajectory_ofd(
            denoised=denoised,
            x_input=x_input,
            cond_denoised=cond,
            uncond_denoised=uncond,
            basis_struct=b_struct,
            basis_detail=b_detail,
            ofd_factor=0.5,
            ofd_delta=0.0,
            progress=0.90,
            start_percent=0.10,
            end_percent=0.75,
        )
        self.assertTrue(torch.equal(out_outside, denoised))

    def test_execute_registers_post_cfg_hook_without_cfg1_penalty(self):
        mock_model = MagicMock()
        cloned_model = MagicMock()
        cloned_model.load_device = torch.device("cpu")
        cloned_model.model_options = {}
        mock_model.clone.return_value = cloned_model

        latent_in = {"samples": torch.zeros(1, 4, 16, 16)}

        def fake_sample(model, noise, steps, cfg, sampler_name, scheduler, pos, neg, latent_samples, **kwargs):
            # Trigger the registered post_cfg hook if present
            if cloned_model.set_model_sampler_post_cfg_function.called:
                hook = cloned_model.set_model_sampler_post_cfg_function.call_args[0][0]
                denoised = hook(
                    {
                        "denoised": noise.clone(),
                        "input": latent_samples,
                        "cond_denoised": None,
                        "uncond_denoised": None,
                        "sigma": torch.tensor([0.5]),
                    }
                )
                return denoised
            return noise

        with (
            patch("comfy.sample.fix_empty_latent_channels", side_effect=lambda m, s, d: s),
            patch("comfy.sample.prepare_noise", return_value=torch.randn(1, 4, 16, 16)),
            patch("latent_preview.prepare_callback", return_value=None),
            patch("comfy.sample.sample", side_effect=fake_sample),
        ):
            out = DuffyDynamicMultiArchitectureSampler.execute(
                model=mock_model,
                seed=999,
                steps=8,
                cfg=1.0,
                sampler_name="euler",
                scheduler="simple",
                positive=[],
                negative=[],
                latent_image=latent_in,
                denoise=1.0,
                enable_ofd=True,
                ofd_offset=0.1,
                ofd_factor=0.4,
                ofd_delta=0.2,
                ofd_start_percent=0.1,
                ofd_end_percent=0.8,
            )

        self.assertTrue(cloned_model.set_model_sampler_post_cfg_function.called)
        self.assertFalse(cloned_model.set_model_sampler_cfg_function.called)
        res_latent = out.args[0] if hasattr(out, "args") and out.args else out.result[0]
        self.assertEqual(list(res_latent["samples"].shape), [1, 4, 16, 16])
        self.assertFalse(torch.isnan(res_latent["samples"]).any().item())

    def test_node_replacement_registered(self):
        self.assertTrue(len(rep_mod.REPLACEMENTS) >= 1)
        rep = rep_mod.REPLACEMENTS[0]
        self.assertEqual(rep.old_node_id, "Duffy_DynamicMultiArchitectureSampler")
        self.assertEqual(rep.new_node_id, "Duffy_DynamicMultiArchitectureSampler")
        self.assertIn("model_selection", rep.old_widget_ids)


if __name__ == "__main__":
    unittest.main()
