"""Integration-style tests for the Interactive Overlay Compositor node (stubbed PromptServer)."""
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
from comfy_api.latest import io  # noqa: E402  (real V3 API)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODES = os.path.join(ROOT, "nodes")
TEMP_DIR = tempfile.mkdtemp(prefix="duffy_overlay_test_")


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


FAKE_SERVER = _FakePromptServer()
sys.modules["server"] = types.SimpleNamespace(PromptServer=types.SimpleNamespace(instance=FAKE_SERVER))

# Load the math module under the name the node falls back to, then the node itself.
for name in ("interactive_overlay_math", "interactive_overlay_compositor"):
    spec = importlib.util.spec_from_file_location(name, os.path.join(NODES, f"{name}.py"))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)

node_mod = sys.modules["interactive_overlay_compositor"]
node_mod.model_management = _FakeModelManagement
node_mod.folder_paths = types.SimpleNamespace(get_temp_directory=lambda: TEMP_DIR)
node_mod.ui = types.SimpleNamespace(PreviewImage=lambda image, cls=None: None)

Node = node_mod.DuffyInteractiveOverlayCompositor


class _TestNode(Node):
    hidden = types.SimpleNamespace(unique_id="7")


def _run(**kwargs):
    params = dict(
        background_image=torch.zeros(1, 64, 96, 3),
        overlay_image=torch.ones(1, 16, 16, 3),
        blend_mode="normal",
        opacity=1.0,
        pause_mode="always",
        transform_state="{}",
    )
    params.update(kwargs)
    return _TestNode.execute(**params)


def _outputs(result):
    return result.result if hasattr(result, "result") else result.args


def _resume_soon(transform, node_id="7", delay=0.05, record=None):
    def on_send(_event, data):
        def worker():
            time.sleep(delay)
            started = time.perf_counter()
            status, _ = node_mod.handle_resume({"session_id": data["session_id"], "node_id": node_id,
                                                "transform": transform})
            if record is not None:
                record.update(status=status, resumed_at=started)
        threading.Thread(target=worker, daemon=True).start()
    FAKE_SERVER.on_send = on_send


class TestInteractiveOverlayNode(unittest.TestCase):
    def setUp(self):
        FAKE_SERVER.sent.clear()
        FAKE_SERVER.on_send = None
        FAKE_SERVER.client_id = "client-1"
        FAKE_SERVER.sockets = {"client-1": object()}
        node_mod.PENDING_OVERLAY_SESSIONS.clear()

    def test_schema(self):
        schema = Node.define_schema()
        self.assertEqual(schema.node_id, "Duffy_InteractiveOverlayCompositor")
        self.assertEqual(schema.category, "Duffy/Image/Compositing")
        self.assertEqual(len(schema.outputs), 3)

    def test_headless_skips_pause_and_uses_saved_transform(self):
        FAKE_SERVER.client_id = None
        saved = json.dumps({"translation_norm": [0.25, 0.5], "scale_factors": [1, 1], "rotation_deg": 0,
                            "anchor_point": [0.5, 0.5]})
        image, mask, data = _outputs(_run(transform_state=saved))
        self.assertEqual(FAKE_SERVER.sent, [])
        payload = json.loads(data)
        self.assertEqual(payload["translation_norm"], [0.25, 0.5])
        self.assertFalse(payload["interactive"])
        self.assertAlmostEqual(float(mask[0, 32, 24]), 1.0, places=3)  # 0.25 * 96 = 24
        self.assertEqual(tuple(image.shape), (1, 64, 96, 3))

    def test_headless_without_saved_state_uses_default_fit(self):
        FAKE_SERVER.client_id = None
        _, _, data = _outputs(_run(overlay_image=torch.ones(1, 200, 100, 3)))
        payload = json.loads(data)
        self.assertEqual(payload["translation_norm"], [0.5, 0.5])
        self.assertAlmostEqual(payload["scale_factors"][0], 0.16, places=6)  # min(48/100, 32/200)

    def test_pause_and_resume_roundtrip(self):
        record = {}
        transform = {"translation_norm": [0.5, 0.5], "scale_factors": [2, 2], "rotation_deg": 45,
                     "anchor_point": [0.5, 0.5], "blend_mode": "screen", "opacity": 0.5}
        _resume_soon(transform, record=record)
        result = _run()
        finished = time.perf_counter()
        _, mask, data = _outputs(result)

        self.assertEqual(record["status"], 200)
        self.assertLess(finished - record["resumed_at"], 0.2)  # PRD: output within 200 ms of Continue
        event, payload, sid = FAKE_SERVER.sent[0]
        self.assertEqual(event, "duffy-interactive-overlay-pause")
        self.assertEqual(sid, "client-1")
        self.assertEqual(payload["node_id"], "7")
        self.assertTrue(payload["bg_preview_url"].startswith("/view?"))
        self.assertIn("type=temp", payload["ov_preview_url"])
        out = json.loads(data)
        self.assertTrue(out["interactive"])
        self.assertEqual(out["blend_mode"], "screen")
        self.assertEqual(out["rotation_deg"], 45.0)
        self.assertAlmostEqual(float(mask.max()), 0.5, places=3)
        # Custom UI payload: result thumbnail + authoritative state for the hidden widget.
        ui_payload = result.ui
        thumb = ui_payload["overlay_result"][0]
        self.assertEqual(thumb["type"], "temp")
        self.assertTrue(os.path.isfile(os.path.join(TEMP_DIR, thumb["subfolder"], thumb["filename"])))
        self.assertEqual(json.loads(ui_payload["overlay_state"][0])["rotation_deg"], 45.0)
        # Session + preview files are cleaned up.
        self.assertEqual(node_mod.PENDING_OVERLAY_SESSIONS, {})
        self.assertEqual(os.listdir(os.path.join(TEMP_DIR, "duffy_overlay")), [])

    def test_large_preview_is_capped(self):
        captured = {}

        def on_send(_event, data):
            from PIL import Image
            path = os.path.join(TEMP_DIR, "duffy_overlay", f"{data['session_id']}_bg.webp")
            with Image.open(path) as img:
                captured["size"] = img.size
            node_mod.handle_resume({"session_id": data["session_id"], "node_id": "7", "transform": data["state"]})
        FAKE_SERVER.on_send = on_send
        _run(background_image=torch.zeros(1, 1500, 2600, 3))
        self.assertEqual(max(captured["size"]), 1280)

    def test_interrupt_during_pause_cleans_up(self):
        def on_send(_event, _data):
            def worker():
                time.sleep(0.1)
                _FakeModelManagement.interrupted = True
            threading.Thread(target=worker, daemon=True).start()
        FAKE_SERVER.on_send = on_send
        with self.assertRaises(_Interrupted):
            _run()
        self.assertEqual(node_mod.PENDING_OVERLAY_SESSIONS, {})
        self.assertEqual(os.listdir(os.path.join(TEMP_DIR, "duffy_overlay")), [])

    def test_resume_validation(self):
        status, _ = node_mod.handle_resume({"session_id": "nope", "node_id": "7", "transform": {}})
        self.assertEqual(status, 404)
        status, _ = node_mod.handle_resume({"session_id": "x", "node_id": "7",
                                            "transform": {"translation_norm": [float("nan"), 0]}})
        self.assertEqual(status, 400)
        status, _ = node_mod.handle_resume(["not", "a", "dict"])
        self.assertEqual(status, 400)

        # Wrong node id for an existing session -> 404, session stays blocked.
        event = threading.Event()
        node_mod.PENDING_OVERLAY_SESSIONS["s1"] = {"event": event, "node_id": "7", "transform": None, "payload": {}}
        status, _ = node_mod.handle_resume({"session_id": "s1", "node_id": "8", "transform": {}})
        self.assertEqual(status, 404)
        self.assertFalse(event.is_set())
        self.assertEqual(len(node_mod.pending_payloads()), 1)

    def test_on_input_change_mode(self):
        bg = torch.zeros(1, 32, 32, 3)
        ov = torch.ones(1, 8, 8, 3)
        signature = node_mod.om.tensor_signature(bg, ov)
        saved = json.dumps({"translation_norm": [0.5, 0.5], "scale_factors": [1, 1], "rotation_deg": 0,
                            "anchor_point": [0.5, 0.5], "input_signature": signature})
        _run(background_image=bg, overlay_image=ov, pause_mode="on_input_change", transform_state=saved)
        self.assertEqual(FAKE_SERVER.sent, [])  # unchanged inputs -> no pause

        _resume_soon({"translation_norm": [0.5, 0.5], "scale_factors": [1, 1], "rotation_deg": 0,
                      "anchor_point": [0.5, 0.5]})
        _run(background_image=bg + 0.5, overlay_image=ov, pause_mode="on_input_change", transform_state=saved)
        self.assertEqual(len(FAKE_SERVER.sent), 1)  # changed inputs -> pause

    def test_never_mode_does_not_pause(self):
        _run(pause_mode="never")
        self.assertEqual(FAKE_SERVER.sent, [])

    def test_fingerprint(self):
        self.assertTrue(math.isnan(Node.fingerprint_inputs(pause_mode="always")))
        self.assertEqual(Node.fingerprint_inputs(pause_mode="never"), Node.fingerprint_inputs(pause_mode="never"))

    def test_validate_inputs(self):
        self.assertTrue(Node.validate_inputs(blend_mode="add", pause_mode="never", opacity=0.3))
        self.assertIsInstance(Node.validate_inputs(blend_mode="darken"), str)
        self.assertIsInstance(Node.validate_inputs(opacity=2.0), str)

    def test_batch_mismatch_raises(self):
        FAKE_SERVER.client_id = None
        with self.assertRaises(ValueError):
            _run(background_image=torch.zeros(3, 16, 16, 3), overlay_image=torch.ones(2, 8, 8, 3))


if __name__ == "__main__":
    unittest.main()
