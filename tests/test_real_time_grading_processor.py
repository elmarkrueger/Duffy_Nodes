"""Unit and integration tests for Duffy_RealTimeGradingProcessor and real_time_grading_math."""

from __future__ import annotations

import importlib.util
import json
import math
import os
import sys
import tempfile
import threading
import time
import types
import unittest

import torch

sys.path.insert(0, r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")
from comfy_api.latest import io  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODES = os.path.join(ROOT, "nodes")
TEMP_DIR = tempfile.mkdtemp(prefix="duffy_grading_test_")


class _Routes:
    def post(self, _path):
        return lambda fn: fn

    def get(self, _path):
        return lambda fn: fn


class _FakePromptServer:
    def __init__(self):
        self.routes = _Routes()
        self.client_id = "client-1"
        self.sockets = {"client-1": object()}
        self.sent = []
        self.on_send = None

    def send_sync(self, event, data, sid=None):
        self.sent.append((event, data, sid))
        if self.on_send:
            self.on_send(event, data)


class _Interrupted(BaseException):
    pass


class _FakeModelManagement:
    interrupted = False

    @staticmethod
    def soft_empty_cache(force=False):
        pass

    @classmethod
    def throw_exception_if_processing_interrupted(cls):
        if cls.interrupted:
            cls.interrupted = False
            raise _Interrupted()

    @staticmethod
    def get_torch_device():
        return torch.device("cpu")

    @staticmethod
    def intermediate_device():
        return torch.device("cpu")

    @staticmethod
    def intermediate_dtype():
        return torch.float32


FAKE_SERVER = _FakePromptServer()
sys.modules["server"] = types.SimpleNamespace(
    PromptServer=types.SimpleNamespace(instance=FAKE_SERVER)
)

for mod_name in ("real_time_grading_math", "real_time_grading_processor"):
    spec = importlib.util.spec_from_file_location(mod_name, os.path.join(NODES, f"{mod_name}.py"))
    module = importlib.util.module_from_spec(spec)
    sys.modules[mod_name] = module
    spec.loader.exec_module(module)

gm = sys.modules["real_time_grading_math"]
node_mod = sys.modules["real_time_grading_processor"]
node_mod.model_management = _FakeModelManagement
node_mod.folder_paths = types.SimpleNamespace(get_temp_directory=lambda: TEMP_DIR)

Node = node_mod.DuffyRealTimeGradingProcessor


class _TestNode(Node):
    hidden = types.SimpleNamespace(unique_id="42")


def _run(**kwargs):
    params = dict(
        image=torch.full((1, 48, 64, 3), 0.5, dtype=torch.float32),
        pause_mode="always",
        overall_strength=1.0,
        shader_params="{}",
        mask=None,
    )
    params.update(kwargs)
    return _TestNode.execute(**params)


def _outputs(result):
    return result.result if hasattr(result, "result") else result.args


class TestGradingMath(unittest.TestCase):
    def test_identity_passthrough_is_exact(self):
        img = torch.rand(2, 32, 48, 3)
        params = gm.default_params()
        self.assertTrue(gm.is_identity_params(params))
        out = gm.apply_grading_batch(img, params, overall_strength=1.0)
        torch.testing.assert_close(out, img, atol=1e-6, rtol=0)

    def test_zero_overall_strength_is_passthrough(self):
        img = torch.rand(1, 32, 32, 3)
        params = gm.default_params()
        params["exposure_contrast_saturation"]["exposure"] = 1.5
        out = gm.apply_grading_batch(img, params, overall_strength=0.0)
        torch.testing.assert_close(out, img, atol=1e-6, rtol=0)

    def test_white_balance_and_exposure_contrast_saturation(self):
        img = torch.full((1, 16, 16, 3), 0.4)
        params = gm.default_params()
        params["white_balance"] = {"temperature": 0.5, "tint": -0.25}
        params["exposure_contrast_saturation"] = {
            "exposure": 0.5,
            "contrast": 1.2,
            "saturation": 1.3,
            "vibrance": 0.2,
            "hue_shift": 30.0,
        }
        out = gm.apply_grading_batch(img, params, overall_strength=1.0)
        self.assertEqual(tuple(out.shape), (1, 16, 16, 3))
        self.assertTrue(torch.isfinite(out).all())
        self.assertGreater(float(out.mean()), 0.4)

    def test_shadows_highlights_and_lift_gamma_gain(self):
        img = torch.linspace(0.0, 1.0, 16 * 16 * 3).view(1, 16, 16, 3)
        params = gm.default_params()
        params["shadows_highlights"] = {"shadows": 0.5, "highlights": -0.4}
        params["lift_gamma_gain"] = {"lift": 0.05, "gamma": 1.2, "gain": 0.95}
        out = gm.apply_grading_batch(img, params)
        self.assertEqual(tuple(out.shape), (1, 16, 16, 3))
        self.assertGreaterEqual(float(out.min()), 0.0)
        self.assertLessEqual(float(out.max()), 1.0)

    def test_monotone_cubic_curves_and_fractional_lut(self):
        img = torch.full((1, 16, 16, 3), 0.5)
        params = gm.default_params()
        # Invert master curve
        params["curves"]["rgb"] = [[0.0, 1.0], [1.0, 0.0]]
        out = gm.apply_grading_batch(img, params)
        self.assertAlmostEqual(float(out.mean()), 0.5, places=2)

        # Boost midpoint on red channel only
        params = gm.default_params()
        params["curves"]["r"] = [[0.0, 0.0], [0.5, 0.8], [1.0, 1.0]]
        out = gm.apply_grading_batch(img, params)
        self.assertAlmostEqual(float(out[0, 0, 0, 0]), 0.8, places=2)
        self.assertAlmostEqual(float(out[0, 0, 0, 1]), 0.5, places=3)

    def test_gradient_map_blend_modes(self):
        img = torch.linspace(0.1, 0.9, 16 * 16 * 3).view(1, 16, 16, 3)
        for mode in gm.GRADIENT_BLEND_MODES:
            with self.subTest(mode=mode):
                params = gm.default_params()
                params["gradient_map"] = {
                    "enabled": True,
                    "blending_mode": mode,
                    "opacity": 0.75,
                    "stops": [
                        {"offset": 0.0, "color": "#112233"},
                        {"offset": 0.5, "color": "#aa5522"},
                        {"offset": 1.0, "color": "#ffeecc"},
                    ],
                }
                out = gm.apply_grading_batch(img, params)
                self.assertEqual(tuple(out.shape), (1, 16, 16, 3))
                self.assertTrue(torch.isfinite(out).all())

    def test_optical_fx_bloom_sharpen_aberration_vignette_grain(self):
        img = torch.rand(2, 32, 32, 3)
        params = gm.default_params()
        params["sharpen"] = 0.8
        params["chromatic_aberration"] = 0.02
        params["bloom"] = {"intensity": 0.6, "threshold": 0.5, "radius": 2.5}
        params["vignette_intensity"] = 0.5
        params["film_grain"] = 0.04
        out = gm.apply_grading_batch(img, params)
        self.assertEqual(tuple(out.shape), (2, 32, 32, 3))
        self.assertTrue(torch.isfinite(out).all())
        self.assertGreaterEqual(float(out.min()), 0.0)
        self.assertLessEqual(float(out.max()), 1.0)

    def test_mask_and_rgba_preservation(self):
        rgba = torch.full((1, 16, 16, 4), 0.2)
        rgba[..., 3] = 0.75
        mask = torch.zeros(1, 16, 16)
        mask[:, :8, :] = 1.0  # only top half receives grading

        params = gm.default_params()
        params["exposure_contrast_saturation"]["exposure"] = 1.0  # doubles brightness to 0.4

        out = gm.apply_grading_batch(rgba, params, overall_strength=1.0, mask=mask)
        self.assertEqual(tuple(out.shape), (1, 16, 16, 4))
        # Alpha preserved
        self.assertAlmostEqual(float(out[0, 4, 4, 3]), 0.75, places=5)
        # Top half graded (0.4), bottom half ungraded (0.2)
        self.assertAlmostEqual(float(out[0, 2, 2, 0]), 0.4, places=4)
        self.assertAlmostEqual(float(out[0, 12, 12, 0]), 0.2, places=4)

    def test_validation_clamps_and_rejects_non_dict(self):
        with self.assertRaises(ValueError):
            gm.validate_params(["not", "a", "dict"])

        clamped = gm.validate_params(
            {
                "chromatic_aberration": 99.0,
                "sharpen": -5.0,
                "exposure_contrast_saturation": {"exposure": 50.0, "contrast": -2.0},
                "gradient_map": {"enabled": True, "blending_mode": "InvalidMode"},
            }
        )
        self.assertEqual(clamped["chromatic_aberration"], 0.05)
        self.assertEqual(clamped["sharpen"], 0.0)
        self.assertEqual(clamped["exposure_contrast_saturation"]["exposure"], 2.0)
        self.assertEqual(clamped["exposure_contrast_saturation"]["contrast"], 0.0)
        self.assertEqual(clamped["gradient_map"]["blending_mode"], "Normal")


class TestRealTimeGradingNode(unittest.TestCase):
    def setUp(self):
        FAKE_SERVER.sent.clear()
        FAKE_SERVER.on_send = None
        FAKE_SERVER.client_id = "client-1"
        FAKE_SERVER.sockets = {"client-1": object()}
        node_mod.PENDING_GRADING_SESSIONS.clear()

    def test_schema_and_validation(self):
        schema = Node.define_schema()
        self.assertEqual(schema.node_id, "Duffy_RealTimeGradingProcessor")
        self.assertEqual(schema.category, "Duffy/Image/PostProcessing")
        self.assertEqual(len(schema.outputs), 2)

        self.assertTrue(Node.validate_inputs(pause_mode="always", overall_strength=0.5, shader_params="{}"))
        self.assertIsInstance(Node.validate_inputs(pause_mode="bad_mode"), str)
        self.assertIsInstance(Node.validate_inputs(overall_strength=2.5), str)
        self.assertIsInstance(Node.validate_inputs(shader_params="{broken json"), str)

    def test_fingerprint_inputs(self):
        fp_always = Node.fingerprint_inputs(pause_mode="always", shader_params="{}")
        self.assertTrue(isinstance(fp_always, float) and math.isnan(fp_always))

        fp1 = Node.fingerprint_inputs(pause_mode="never", overall_strength=1.0, shader_params='{"a": 1, "b": 2}')
        fp2 = Node.fingerprint_inputs(pause_mode="never", overall_strength=1.0, shader_params='{"b":2,"a":1}')
        self.assertEqual(fp1, fp2)

    def test_pause_and_resume_roundtrip(self):
        record = {}
        custom_params = gm.default_params()
        custom_params["exposure_contrast_saturation"]["exposure"] = 1.0

        def on_send(event, data):
            def worker():
                time.sleep(0.04)
                status, _ = node_mod.handle_resume(
                    {
                        "session_id": data["session_id"],
                        "node_id": "42",
                        "params": custom_params,
                    }
                )
                record["status"] = status

            threading.Thread(target=worker, daemon=True).start()

        FAKE_SERVER.on_send = on_send
        result = _run(image=torch.full((1, 32, 32, 3), 0.25))
        graded, grading_json = _outputs(result)

        self.assertEqual(record.get("status"), 200)
        self.assertEqual(len(FAKE_SERVER.sent), 1)
        self.assertEqual(FAKE_SERVER.sent[0][0], "duffy-grading-pause")
        self.assertAlmostEqual(float(graded.mean()), 0.5, places=3)

        parsed_out = json.loads(grading_json)
        self.assertTrue(parsed_out["paused"])
        self.assertEqual(node_mod.PENDING_GRADING_SESSIONS, {})

    def test_on_input_change_skips_when_signature_matches(self):
        img = torch.full((1, 24, 24, 3), 0.3)
        sig = gm.tensor_signature(img, None)
        saved = gm.default_params()
        saved["input_signature"] = sig
        _run(image=img, pause_mode="on_input_change", shader_params=json.dumps(saved))
        self.assertEqual(FAKE_SERVER.sent, [])

    def test_interrupt_cleans_up_session(self):
        def on_send(_event, _data):
            def worker():
                time.sleep(0.05)
                _FakeModelManagement.interrupted = True

            threading.Thread(target=worker, daemon=True).start()

        FAKE_SERVER.on_send = on_send
        with self.assertRaises(_Interrupted):
            _run()
        self.assertEqual(node_mod.PENDING_GRADING_SESSIONS, {})


if __name__ == "__main__":
    unittest.main()
