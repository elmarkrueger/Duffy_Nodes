import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Ensure ComfyUI path is available first
sys.path.insert(0, r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")

# Import model_loader directly from file to prevent package shadowing conflicts (e.g. utils, nodes)
import importlib.util
file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "nodes", "model_loader.py")
spec = importlib.util.spec_from_file_location("nodes.model_loader", file_path)
model_loader = importlib.util.module_from_spec(spec)
sys.modules["nodes.model_loader"] = model_loader
spec.loader.exec_module(model_loader)

DuffyModelLoader = model_loader.DuffyModelLoader
resolve_path = model_loader.resolve_path
detect_clip_type = model_loader.detect_clip_type
pre_validate_file = model_loader.pre_validate_file

class TestModelLoader(unittest.TestCase):
    def test_detect_clip_type(self):
        # Semi-automatic detection test
        self.assertEqual(detect_clip_type("t5xxl_flux_q8.gguf", "default"), "flux")
        self.assertEqual(detect_clip_type("clip_l_sd3_fp16.safetensors", "default"), "sd3")
        self.assertEqual(detect_clip_type("umt5_wan_q4.gguf", "default"), "wan")
        self.assertEqual(detect_clip_type("sdxl_vae.safetensors", "default"), "sdxl")
        self.assertEqual(detect_clip_type("some_random_clip.safetensors", "default"), "stable_diffusion")
        # Explicit override
        self.assertEqual(detect_clip_type("t5xxl_flux_q8.gguf", "sd3"), "sd3")

    def test_path_traversal_detection(self):
        # Resolve path should raise error on path traversal
        with self.assertRaises(ValueError):
            resolve_path("diffusion_models", "../illegal_file.safetensors")
        with self.assertRaises(ValueError):
            resolve_path("diffusion_models", "sub/../../illegal_file.safetensors")
        with self.assertRaises(ValueError):
            resolve_path("diffusion_models", "C:\\windows\\system32\\cmd.exe")

    @patch("os.path.exists")
    @patch("folder_paths.get_full_path")
    def test_resolve_path_success(self, mock_get_full, mock_exists):
        mock_get_full.return_value = "/path/to/my_model.safetensors"
        mock_exists.return_value = True
        
        path = resolve_path("diffusion_models", "my_model.safetensors")
        self.assertEqual(path, "/path/to/my_model.safetensors")
        mock_get_full.assert_called_with("diffusion_models", "my_model.safetensors")

    @patch("os.path.exists")
    @patch("folder_paths.get_full_path")
    def test_resolve_path_fallback(self, mock_get_full, mock_exists):
        # First call (diffusion_models) returns None or file doesn't exist
        # Second call (unet) returns valid path
        def side_effect(folder, name):
            if folder == "unet":
                return "/path/to/unet/my_model.safetensors"
            return None
            
        mock_get_full.side_effect = side_effect
        mock_exists.side_effect = lambda p: p == "/path/to/unet/my_model.safetensors"
        
        path = resolve_path("diffusion_models", "my_model.safetensors")
        self.assertEqual(path, "/path/to/unet/my_model.safetensors")
        
    @patch("nodes.model_loader.os.path.exists")
    @patch("nodes.model_loader.safe_open")
    def test_pre_validate_safetensors_mismatch(self, mock_safe_open, mock_exists):
        mock_exists.return_value = True
        # Mock keys that look like CLIP keys but testing for model
        mock_open = MagicMock()
        mock_open.keys.return_value = ["cond_stage_model.transformer.text_model.embeddings.position_embedding.weight"]
        mock_safe_open.return_value.__enter__.return_value = mock_open
        
        with self.assertRaises(ValueError) as context:
            pre_validate_file("/mock/file.safetensors", "model")
        self.assertIn("Expected diffusion model keys", str(context.exception))

    @patch("nodes.model_loader.os.path.exists")
    @patch("nodes.model_loader.safe_open")
    def test_pre_validate_safetensors_success(self, mock_safe_open, mock_exists):
        mock_exists.return_value = True
        mock_open = MagicMock()
        mock_open.keys.return_value = ["model.diffusion_model.joint_blocks.0.x_block.attn.qkv.weight"]
        mock_safe_open.return_value.__enter__.return_value = mock_open
        
        # Should complete without raising ValueError
        pre_validate_file("/mock/file.safetensors", "model")

    def test_validate_inputs(self):
        # Basic validation checks
        with patch("nodes.model_loader.resolve_path") as mock_resolve:
            mock_resolve.side_effect = lambda folder, name: f"/mock/{folder}/{name}" if name else None
            
            res = DuffyModelLoader.validate_inputs("model.safetensors", "clip.safetensors", "vae.safetensors")
            self.assertTrue(res)
            
            # Missing model
            mock_resolve.side_effect = lambda folder, name: None if folder == "diffusion_models" else "/mock/path"
            res = DuffyModelLoader.validate_inputs("missing.safetensors", "clip.safetensors", "vae.safetensors")
            self.assertIn("not found", res)


if __name__ == "__main__":
    unittest.main()
