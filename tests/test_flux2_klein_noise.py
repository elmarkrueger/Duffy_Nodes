import importlib.util
import os
import sys
import unittest

import torch

# Ensure ComfyUI path is available first
sys.path.insert(0, r"D:\Easy_Installer\ComfyUI-Easy-Install\ComfyUI")

# Import flux2_klein_noise directly from file
file_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "nodes",
    "flux2_klein_noise.py",
)
spec = importlib.util.spec_from_file_location("nodes.flux2_klein_noise", file_path)
flux2_klein_noise = importlib.util.module_from_spec(spec)
sys.modules["nodes.flux2_klein_noise"] = flux2_klein_noise
spec.loader.exec_module(flux2_klein_noise)

DuffyFlux2KleinNoise = flux2_klein_noise.DuffyFlux2KleinNoise


class TestFlux2KleinNoise(unittest.TestCase):
    def _extract_samples(self, output):
        if hasattr(output, "result") and output.result is not None:
            latent = output.result[0]
        elif hasattr(output, "args") and output.args:
            latent = output.args[0]
        else:
            latent = output[0]
        return latent["samples"]

    def _run_node(
        self,
        *,
        width=1024,
        height=1024,
        batch_size=2,
        seed=123,
        multiplier=1.0,
        constant_batch_noise=False,
        normalize=False,
        latent_channels="4",
        shape="BCHW",
    ):
        output = DuffyFlux2KleinNoise.execute(
            width=width,
            height=height,
            batch_size=batch_size,
            seed=seed,
            multiplier=multiplier,
            constant_batch_noise=constant_batch_noise,
            normalize=normalize,
            model=None,
            sigmas=None,
            latent_channels=latent_channels,
            shape=shape,
        )
        return self._extract_samples(output)

    def test_channel_downscale_mapping_shapes(self):
        samples_4 = self._run_node(latent_channels="4")
        self.assertEqual(list(samples_4.shape), [2, 4, 128, 128])

        samples_16 = self._run_node(latent_channels="16")
        self.assertEqual(list(samples_16.shape), [2, 16, 128, 128])

        samples_64 = self._run_node(latent_channels="64")
        self.assertEqual(list(samples_64.shape), [2, 64, 64, 64])

        samples_128 = self._run_node(latent_channels="128")
        self.assertEqual(list(samples_128.shape), [2, 128, 64, 64])

    def test_bcthw_shape_layout(self):
        samples = self._run_node(
            width=512,
            height=512,
            batch_size=3,
            latent_channels="64",
            shape="BCTHW",
        )
        self.assertEqual(list(samples.shape), [1, 64, 3, 32, 32])

    def test_btchw_shape_layout(self):
        samples = self._run_node(
            width=512,
            height=512,
            batch_size=3,
            latent_channels="64",
            shape="BTCHW",
        )
        self.assertEqual(list(samples.shape), [1, 3, 64, 32, 32])

    def test_constant_batch_noise_bchw(self):
        samples = self._run_node(
            batch_size=4,
            latent_channels="64",
            shape="BCHW",
            constant_batch_noise=True,
        )
        self.assertEqual(list(samples.shape), [4, 64, 64, 64])

        first = samples[0]
        self.assertTrue(torch.equal(first, samples[1]))
        self.assertTrue(torch.equal(first, samples[2]))
        self.assertTrue(torch.equal(first, samples[3]))

    def test_constant_batch_noise_bcthw(self):
        samples = self._run_node(
            batch_size=4,
            latent_channels="64",
            shape="BCTHW",
            constant_batch_noise=True,
        )
        self.assertEqual(list(samples.shape), [1, 64, 4, 64, 64])

        first = samples[:, :, 0, :, :]
        self.assertTrue(torch.equal(first, samples[:, :, 1, :, :]))
        self.assertTrue(torch.equal(first, samples[:, :, 2, :, :]))
        self.assertTrue(torch.equal(first, samples[:, :, 3, :, :]))

    def test_constant_batch_noise_btchw(self):
        samples = self._run_node(
            batch_size=4,
            latent_channels="64",
            shape="BTCHW",
            constant_batch_noise=True,
        )
        self.assertEqual(list(samples.shape), [1, 4, 64, 64, 64])

        first = samples[:, 0, :, :, :]
        self.assertTrue(torch.equal(first, samples[:, 1, :, :, :]))
        self.assertTrue(torch.equal(first, samples[:, 2, :, :, :]))
        self.assertTrue(torch.equal(first, samples[:, 3, :, :, :]))

    def test_validate_inputs_divisibility_error_for_f16(self):
        valid = DuffyFlux2KleinNoise.validate_inputs(
            width=1024,
            height=1024,
            latent_channels="64",
            shape="BCHW",
        )
        self.assertTrue(valid)

        invalid = DuffyFlux2KleinNoise.validate_inputs(
            width=1000,
            height=1024,
            latent_channels="64",
            shape="BCHW",
        )
        self.assertIsInstance(invalid, str)
        self.assertIn("divisible by 16", invalid)

    def test_validate_inputs_allows_unresolved_values(self):
        unresolved = DuffyFlux2KleinNoise.validate_inputs(
            width=None,
            height=1024,
            latent_channels="64",
            shape="BCHW",
        )
        self.assertTrue(unresolved)

    def test_execute_raises_on_invalid_dimensions(self):
        with self.assertRaises(ValueError):
            self._run_node(width=1000, height=1024, latent_channels="64")


if __name__ == "__main__":
    unittest.main()
