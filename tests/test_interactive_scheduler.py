"""Unit and integration tests for DuffyInteractiveScheduler and interactive_scheduler_math."""

from __future__ import annotations

import asyncio
import importlib.util
import json
import math
import os
import sys
import types
import unittest

import torch

sys.path.insert(0, r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")
import comfy.samplers  # noqa: E402
from comfy_api.latest import io  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODES = os.path.join(ROOT, "nodes")


class _Routes:
    def __init__(self):
        self.post_handlers = {}
        self.get_handlers = {}

    def post(self, path):
        def _decorator(fn):
            self.post_handlers[path] = fn
            return fn

        return _decorator

    def get(self, path):
        def _decorator(fn):
            self.get_handlers[path] = fn
            return fn

        return _decorator


class _FakePromptServer:
    def __init__(self):
        self.routes = _Routes()
        self.client_id = "test-client"


class _FakeModelManagement:
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

for mod_name in ("interactive_scheduler_math", "interactive_scheduler"):
    spec = importlib.util.spec_from_file_location(
        mod_name, os.path.join(NODES, f"{mod_name}.py")
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[mod_name] = module
    spec.loader.exec_module(module)

sm = sys.modules["interactive_scheduler_math"]
node_mod = sys.modules["interactive_scheduler"]
node_mod.model_management = _FakeModelManagement

Node = node_mod.DuffyInteractiveScheduler


class _TestNode(Node):
    hidden = types.SimpleNamespace(unique_id="node-101")


class _MockModel:
    """Mock ComfyUI ModelPatcher wrapping a StandaloneModelSampling object."""

    def __init__(self, sigma_max: float = 14.6146, sigma_min: float = 0.0292):
        self._ms = sm.StandaloneModelSampling(sigma_max=sigma_max, sigma_min=sigma_min)

    def get_model_object(self, name: str):
        if name == "model_sampling":
            return self._ms
        return None


def _unpack_outputs(node_output: io.NodeOutput):
    if hasattr(node_output, "result") and node_output.result is not None:
        return node_output.result
    return node_output.args


class TestInteractiveSchedulerMath(unittest.TestCase):
    def test_terminal_zero_and_shape_across_all_schedulers(self):
        """Acceptance Criterion 1: 1D float32 CPU tensor of length N + 1 ending at 0.0."""
        schedulers = sm.get_available_schedulers()
        for sched in schedulers:
            for steps in (1, 5, 20, 50):
                sigmas, bounds = sm.calculate_baseline_sigmas(
                    scheduler=sched,
                    steps=steps,
                    denoise=1.0,
                    model=None,
                    sigma_max_fallback=1.0,
                    sigma_min_fallback=0.01,
                )
                self.assertEqual(sigmas.ndim, 1, f"Scheduler {sched} ndim != 1")
                self.assertEqual(sigmas.dtype, torch.float32)
                self.assertEqual(sigmas.device.type, "cpu")
                self.assertEqual(
                    sigmas.shape[0],
                    steps + 1,
                    f"Scheduler {sched} expected {steps + 1} elements, got {sigmas.shape[0]}",
                )
                self.assertEqual(
                    float(sigmas[-1].item()),
                    0.0,
                    f"Scheduler {sched} terminal sigma is not 0.0",
                )
                self.assertTrue(torch.isfinite(sigmas).all())
                self.assertTrue((sigmas >= 0.0).all())
                self.assertFalse(bounds["from_model"])

    def test_minimum_step_floor_invariant(self):
        """Acceptance Criterion 2: N = 1 minimum step floor prevents <2 element tensors."""
        for bad_input in ([], [0.8], "invalid", None):
            sigmas = sm.validate_custom_sigmas(
                bad_input, enforce_monotonic=True, fallback_sigma_max=1.0
            )
            self.assertEqual(sigmas.shape, (2,))
            self.assertEqual(float(sigmas[-1].item()), 0.0)
            self.assertGreaterEqual(float(sigmas[0].item()), 0.0)

    def test_denoise_tail_slicing_parity_with_basic_scheduler(self):
        """Acceptance Criterion 3: steps=25, denoise=0.5 matches stock BasicScheduler."""
        mock_model = _MockModel(sigma_max=14.6146, sigma_min=0.0292)
        ms = mock_model.get_model_object("model_sampling")

        steps = 25
        denoise = 0.5
        scheduler = "karras"

        # Stock BasicScheduler calculation
        total_steps = int(steps / denoise)
        expected = comfy.samplers.calculate_sigmas(ms, scheduler, total_steps).cpu()
        expected = expected[-(steps + 1) :]

        actual, bounds = sm.calculate_baseline_sigmas(
            scheduler=scheduler,
            steps=steps,
            denoise=denoise,
            model=mock_model,
        )
        self.assertEqual(actual.shape, (26,))
        self.assertTrue(bounds["from_model"])
        self.assertTrue(torch.allclose(actual, expected, atol=1e-6))
        self.assertEqual(float(actual[-1].item()), 0.0)

    def test_nan_inf_negative_and_monotonic_clamping(self):
        """Section 3.3.2 Invariants 1-3: NaN/Inf sanitization, >=0, monotonicity, terminal 0.0."""
        dirty = [float("inf"), float("nan"), -0.5, 0.85, 0.40, 0.65, 0.25, 0.99]
        clamped = sm.validate_custom_sigmas(
            dirty, enforce_monotonic=True, sigma_max_cap=10.0
        )
        self.assertEqual(clamped.shape[0], len(dirty))
        self.assertTrue(torch.isfinite(clamped).all())
        self.assertTrue((clamped >= 0.0).all())
        self.assertEqual(float(clamped[0].item()), 10.0)
        self.assertEqual(float(clamped[-1].item()), 0.0)
        # Verify monotonic non-increasing order
        diffs = clamped[1:] - clamped[:-1]
        self.assertTrue((diffs <= 1e-7).all(), f"Expected monotonic, got {clamped.tolist()}")

        # Freeform mode (enforce_monotonic=False) allows non-monotonic interior steps
        freeform = sm.validate_custom_sigmas(
            [1.0, 0.3, 0.7, 0.2, 0.5], enforce_monotonic=False
        )
        self.assertAlmostEqual(float(freeform[1].item()), 0.3, places=5)
        self.assertAlmostEqual(float(freeform[2].item()), 0.7, places=5)
        self.assertEqual(float(freeform[-1].item()), 0.0)

    def test_pchip_resampling_preserves_monotonicity_and_endpoints(self):
        """Section 4.3: Resampling a modified curve preserves shape, endpoints, and monotonicity."""
        custom = [1.0, 0.92, 0.75, 0.40, 0.12, 0.0]
        upsampled = sm.resample_curve_pchip(custom, new_steps=20, enforce_monotonic=True)
        self.assertEqual(upsampled.shape, (21,))
        self.assertAlmostEqual(float(upsampled[0].item()), 1.0, places=5)
        self.assertEqual(float(upsampled[-1].item()), 0.0)
        self.assertTrue(((upsampled[1:] - upsampled[:-1]) <= 1e-7).all())

        downsampled = sm.resample_curve_pchip(upsampled, new_steps=4, enforce_monotonic=True)
        self.assertEqual(downsampled.shape, (5,))
        self.assertAlmostEqual(float(downsampled[0].item()), 1.0, places=5)
        self.assertEqual(float(downsampled[-1].item()), 0.0)


class TestDuffyInteractiveSchedulerNode(unittest.TestCase):
    def test_schema_definition_conforms_to_duffy_conventions(self):
        schema = Node.define_schema()
        self.assertEqual(schema.node_id, "Duffy_InteractiveScheduler")
        self.assertEqual(schema.category, "Duffy/Sampling")
        input_ids = [inp.id for inp in schema.inputs]
        self.assertEqual(
            input_ids,
            [
                "scheduler",
                "steps",
                "denoise",
                "sigma_max_fallback",
                "sigma_min_fallback",
                "enforce_monotonic",
                "custom_sigmas_json",
                "model",
            ],
        )
        output_ids = [out.id for out in schema.outputs]
        self.assertEqual(output_ids, ["sigmas", "steps", "sigmas_string"])

    def test_execute_unmodified_baseline(self):
        out = _TestNode.execute(
            scheduler="normal",
            steps=12,
            denoise=1.0,
            sigma_max_fallback=1.0,
            sigma_min_fallback=0.01,
            enforce_monotonic=True,
            custom_sigmas_json="{}",
            model=None,
        )
        sigmas, steps_out, sigmas_str = _unpack_outputs(out)
        self.assertEqual(sigmas.shape, (13,))
        self.assertEqual(steps_out, 12)
        self.assertEqual(float(sigmas[-1].item()), 0.0)
        parts = [float(x.strip()) for x in sigmas_str.split(",")]
        self.assertEqual(len(parts), 13)
        self.assertEqual(parts[-1], 0.0)

    def test_execute_with_custom_modified_points_and_step_count_sync(self):
        """Adding or removing points updates output tensor length and steps_out."""
        custom_payload = json.dumps(
            {
                "version": "1.0",
                "is_modified": True,
                "baseline_scheduler": "simple",
                "steps": 6,
                "denoise": 1.0,
                "custom_sigmas": [1.0, 0.88, 0.64, 0.42, 0.25, 0.09, 0.0],
            }
        )
        out = _TestNode.execute(
            scheduler="simple",
            steps=20,  # Intentionally different to verify custom_sigmas length takes precedence
            denoise=1.0,
            sigma_max_fallback=1.0,
            sigma_min_fallback=0.01,
            enforce_monotonic=True,
            custom_sigmas_json=custom_payload,
            model=None,
        )
        sigmas, steps_out, sigmas_str = _unpack_outputs(out)
        self.assertEqual(sigmas.shape, (7,))
        self.assertEqual(steps_out, 6)
        self.assertAlmostEqual(float(sigmas[1].item()), 0.88, places=4)
        self.assertEqual(float(sigmas[-1].item()), 0.0)
        self.assertEqual(len(sigmas_str.split(",")), 7)

    def test_validate_inputs_and_fingerprint_inputs(self):
        self.assertTrue(
            Node.validate_inputs(
                scheduler="karras",
                steps=20,
                denoise=0.75,
                sigma_max_fallback=1.0,
                sigma_min_fallback=0.01,
                custom_sigmas_json="{}",
            )
        )
        self.assertIsInstance(Node.validate_inputs(steps=0), str)
        self.assertIsInstance(Node.validate_inputs(denoise=1.5), str)
        self.assertIsInstance(Node.validate_inputs(custom_sigmas_json="{bad_json"), str)

        fp1 = Node.fingerprint_inputs(scheduler="normal", steps=20, custom_sigmas_json="{}")
        fp2 = Node.fingerprint_inputs(scheduler="karras", steps=20, custom_sigmas_json="{}")
        self.assertIsInstance(fp1, str)
        self.assertNotIsInstance(fp1, bool)
        self.assertNotEqual(fp1, fp2)

    def test_rest_endpoint_calculate_baseline(self):
        handler = FAKE_SERVER.routes.post_handlers.get(node_mod.BASELINE_ROUTE)
        self.assertIsNotNone(handler)

        # Populate model bounds cache via connected model execution
        mock_model = _MockModel(sigma_max=14.6146, sigma_min=0.0292)
        _TestNode.execute(
            scheduler="karras",
            steps=10,
            denoise=1.0,
            model=mock_model,
        )

        class _DummyReq:
            def __init__(self, payload: dict):
                self._raw = json.dumps(payload).encode("utf-8")

            async def read(self):
                return self._raw

        def _run_coro_sync(coro):
            try:
                coro.send(None)
            except StopIteration as stop:
                return stop.value
            raise RuntimeError("Coroutine did not finish synchronously")

        resp = _run_coro_sync(
            handler(
                _DummyReq(
                    {
                        "node_id": "node-101",
                        "scheduler": "karras",
                        "steps": 15,
                        "denoise": 1.0,
                        "sigma_max_fallback": 1.0,
                        "sigma_min_fallback": 0.01,
                        "use_cached_model_bounds": True,
                        "resample_custom_sigmas": [14.6146, 5.0, 1.0, 0.0],
                    }
                )
            )
        )
        self.assertEqual(resp.status, 200)
        body = json.loads(resp.text)
        self.assertEqual(body["status"], "ok")
        self.assertEqual(len(body["baseline_sigmas"]), 16)
        self.assertEqual(body["baseline_sigmas"][-1], 0.0)
        self.assertTrue(body["model_bounds"]["from_model"])
        self.assertAlmostEqual(body["model_bounds"]["sigma_max"], 14.6146, places=3)
        self.assertEqual(len(body["resampled_sigmas"]), 16)
        self.assertEqual(body["resampled_sigmas"][-1], 0.0)

    def test_package_registration_in_nodes_init(self):
        """Verify DuffyInteractiveScheduler is imported and listed in nodes/__init__.py NODE_LIST."""
        init_path = os.path.join(NODES, "__init__.py")
        with open(init_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn(
            "from .interactive_scheduler import DuffyInteractiveScheduler", content
        )
        self.assertIn("DuffyInteractiveScheduler,", content)


if __name__ == "__main__":
    unittest.main()
