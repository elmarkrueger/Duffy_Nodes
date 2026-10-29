import math

import comfy.sample
import comfy.samplers
import comfy.utils
import latent_preview
import torch
import torch.nn.functional as F
from comfy_api.latest import io


class DuffyDynamicMultiArchitectureSampler(io.ComfyNode):
    """
    Universal single-seed variation sampler powered by the OFD v2
    (Offset / Factor / Delta) orthogonal manifold perturbation engine.
    Works across all diffusion and rectified-flow architectures without
    hardcoded model presets.
    """

    DEFAULT_STEPS = 20
    DEFAULT_CFG = 1.0
    DEFAULT_OFD_OFFSET = 0.05
    DEFAULT_OFD_FACTOR = 0.35
    DEFAULT_OFD_DELTA = 0.0
    DEFAULT_OFD_START = 0.10
    DEFAULT_OFD_END = 0.75
    _NORM_LOCK = 0.85
    _EPS = 1e-8

    @classmethod
    def define_schema(cls) -> io.Schema:
        available_samplers = comfy.samplers.KSampler.SAMPLERS
        available_schedulers = comfy.samplers.KSampler.SCHEDULERS

        return io.Schema(
            node_id="Duffy_DynamicMultiArchitectureSampler",
            display_name="Dynamic Universal Sampler (OFD)",
            category="Duffy/Sampling",
            description=(
                "Universal sampler for any foundation, rectified-flow, or distilled architecture. "
                "Includes the OFD (Offset / Factor / Delta) orthogonal manifold engine for "
                "controllable subtle-to-structural variations within a single fixed seed."
            ),
            inputs=[
                io.Model.Input(
                    "model",
                    display_name="Model",
                    tooltip="Model patcher used for latent denoising.",
                ),
                io.Int.Input(
                    "seed",
                    display_name="Seed",
                    default=0,
                    min=0,
                    max=0x7FFFFFFFFFFFFFFF,
                    step=1,
                    control_after_generate=True,
                    tooltip="Primary noise seed used to initialize the latent trajectory.",
                ),
                io.Int.Input(
                    "steps",
                    display_name="Steps",
                    default=cls.DEFAULT_STEPS,
                    min=1,
                    max=200,
                    step=1,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Total sampling steps (supports 1-step distilled up to 200-step base models).",
                ),
                io.Float.Input(
                    "cfg",
                    display_name="CFG",
                    default=cls.DEFAULT_CFG,
                    min=0.0,
                    max=30.0,
                    step=0.1,
                    round=0.01,
                    display_mode=io.NumberDisplay.slider,
                    tooltip=(
                        "Classifier-Free Guidance scale. Set to 1.0 for distilled/flow models "
                        "to preserve single-pass inference speed, or >1.0 for guided models."
                    ),
                ),
                io.Combo.Input(
                    "sampler_name",
                    display_name="Sampler",
                    options=available_samplers,
                    tooltip="Sampling algorithm used by ComfyUI KSampler.",
                ),
                io.Combo.Input(
                    "scheduler",
                    display_name="Scheduler",
                    options=available_schedulers,
                    tooltip="Noise schedule used by the selected sampler.",
                ),
                io.Conditioning.Input(
                    "positive",
                    display_name="Positive",
                    tooltip="Positive conditioning payload.",
                ),
                io.Conditioning.Input(
                    "negative",
                    display_name="Negative",
                    tooltip="Negative conditioning payload.",
                ),
                io.Latent.Input(
                    "latent_image",
                    display_name="Latent",
                    tooltip="Input latent tensor dictionary to denoise.",
                ),
                io.Float.Input(
                    "denoise",
                    display_name="Denoise",
                    default=1.0,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    round=0.01,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Denoising strength applied to the input latent.",
                ),
                io.Boolean.Input(
                    "enable_ofd",
                    display_name="Enable OFD",
                    default=False,
                    tooltip=(
                        "Enable the Offset / Factor / Delta (OFD) engine to explore "
                        "variations within a single fixed seed."
                    ),
                ),
                io.Float.Input(
                    "ofd_offset",
                    display_name="OFD Offset",
                    default=cls.DEFAULT_OFD_OFFSET,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    round=0.001,
                    display_mode=io.NumberDisplay.slider,
                    tooltip=(
                        "Offset (t=0): Spherical tangent rotation of the initial seed noise. "
                        "Preserves exact Gaussian variance while subtly shifting composition and detail."
                    ),
                ),
                io.Float.Input(
                    "ofd_factor",
                    display_name="OFD Factor",
                    default=cls.DEFAULT_OFD_FACTOR,
                    min=0.0,
                    max=2.0,
                    step=0.01,
                    round=0.001,
                    display_mode=io.NumberDisplay.slider,
                    tooltip=(
                        "Factor: Amplitude of the in-trajectory dual-orthogonal perturbation. "
                        "Steers latent features perpendicular to the denoising velocity and prompt guidance."
                    ),
                ),
                io.Float.Input(
                    "ofd_delta",
                    display_name="OFD Delta",
                    default=cls.DEFAULT_OFD_DELTA,
                    min=-1.0,
                    max=1.0,
                    step=0.01,
                    round=0.001,
                    display_mode=io.NumberDisplay.slider,
                    tooltip=(
                        "Delta: Continuous phase rotation (-180 deg to +180 deg) across the orthogonal "
                        "multi-scale basis plane. Sweep between -1.0 and 1.0 to explore a 360-degree "
                        "ring of variations on the same seed."
                    ),
                ),
                io.Float.Input(
                    "ofd_start_percent",
                    display_name="OFD Start %",
                    default=cls.DEFAULT_OFD_START,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    round=0.01,
                    display_mode=io.NumberDisplay.slider,
                    advanced=True,
                    tooltip="Normalized step progress (0.0-1.0) at which the in-trajectory OFD window begins.",
                ),
                io.Float.Input(
                    "ofd_end_percent",
                    display_name="OFD End %",
                    default=cls.DEFAULT_OFD_END,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    round=0.01,
                    display_mode=io.NumberDisplay.slider,
                    advanced=True,
                    tooltip="Normalized step progress (0.0-1.0) at which the in-trajectory OFD window ends.",
                ),
            ],
            outputs=[
                io.Latent.Output(
                    "latent",
                    display_name="LATENT",
                    tooltip="Denoised latent output.",
                ),
            ],
        )

    @classmethod
    def validate_inputs(
        cls,
        steps: int | None = None,
        cfg: float | None = None,
        denoise: float | None = None,
         **kwargs,
    ) -> bool | str:
        if steps is not None and int(steps) < 1:
            return f"Validation Error: steps ({steps}) must be at least 1."
        if cfg is not None and float(cfg) < 0.0:
            return f"Validation Error: cfg ({cfg}) must be non-negative."
        if denoise is not None and (float(denoise) < 0.0 or float(denoise) > 1.0):
            return f"Validation Error: denoise ({denoise}) must be between 0.0 and 1.0."
        return True

    @classmethod
    def _sigma_scalar(cls, sigma: torch.Tensor | float | int | None) -> float:
        if sigma is None:
            return 0.0
        if isinstance(sigma, torch.Tensor):
            if sigma.numel() == 0:
                return 0.0
            return abs(float(sigma.detach().reshape(-1)[0].item()))
        return abs(float(sigma))

    @classmethod
    def _derive_seed(cls, base_seed: int, salt: int) -> int:
        # SplitMix64 bijection for deterministic, uncorrelated companion seeds
        z = (int(base_seed) + int(salt) + 0x9E3779B97F4A7C15) & 0xFFFFFFFFFFFFFFFF
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & 0xFFFFFFFFFFFFFFFF
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & 0xFFFFFFFFFFFFFFFF
        z = (z ^ (z >> 31)) & 0x7FFFFFFFFFFFFFFF
        return int(z)

    @classmethod
    def _spatial_lowpass(cls, tensor: torch.Tensor, factor: int = 4) -> torch.Tensor:
        """
        Smooths spatial dimensions of a 4D [B, C, H, W] or 5D [B, C, T, H, W] latent
        tensor to extract coherent mesoscale structural perturbations.
        """
        if factor <= 1 or tensor.ndim < 4:
            return tensor

        if tensor.ndim == 4:
            _, _, h, w = tensor.shape
            low_h = max(1, h // factor)
            low_w = max(1, w // factor)
            if low_h == h and low_w == w:
                return tensor
            pooled = F.adaptive_avg_pool2d(tensor, (low_h, low_w))
            upsampled = F.interpolate(pooled, size=(h, w), mode="bilinear", align_corners=False)
            return upsampled

        if tensor.ndim == 5:
            b, c, t, h, w = tensor.shape
            low_h = max(1, h // factor)
            low_w = max(1, w // factor)
            if low_h == h and low_w == w:
                return tensor
            reshaped = tensor.permute(0, 2, 1, 3, 4).reshape(b * t, c, h, w)
            pooled = F.adaptive_avg_pool2d(reshaped, (low_h, low_w))
            upsampled = F.interpolate(pooled, size=(h, w), mode="bilinear", align_corners=False)
            return upsampled.reshape(b, t, c, h, w).permute(0, 2, 1, 3, 4)

        return tensor

    @classmethod
    def _build_multiscale_field(
        cls,
        reference: torch.Tensor,
        seed: int,
        salt: int,
        structural_weight: float = 0.5,
    ) -> torch.Tensor:
        """
        Generates a unit-variance multi-scale Gaussian field on CPU (for cross-device
        reproducibility) and moves it to the reference tensor's device in float32.
        """
        gen = torch.Generator(device="cpu")
        gen.manual_seed(cls._derive_seed(seed, salt))
        raw = torch.randn(reference.shape, dtype=torch.float32, device="cpu", generator=gen)

        w_struct = max(0.0, min(1.0, float(structural_weight)))
        if w_struct > 0.0 and raw.ndim >= 4:
            low = cls._spatial_lowpass(raw, factor=4)
            low_std = low.flatten(1).std(dim=1, keepdim=True).clamp_min(cls._EPS)
            low = low / low_std.view([raw.shape[0]] + [1] * (raw.ndim - 1))
            theta = w_struct * (math.pi * 0.5)
            blended = math.cos(theta) * raw + math.sin(theta) * low
        else:
            blended = raw

        flat = blended.flatten(1)
        std = flat.std(dim=1, keepdim=True).clamp_min(cls._EPS)
        normalized = (flat / std).reshape_as(raw)
        return normalized.to(device=reference.device, dtype=torch.float32)

    @classmethod
    def _project_orthogonal(
        cls,
        vec: torch.Tensor,
        basis_vectors: list[torch.Tensor],
    ) -> torch.Tensor:
        """
        Two-pass Modified Gram-Schmidt (MGS) in float32 to project `vec` [B, N]
        strictly orthogonal to all non-zero vectors in `basis_vectors`, returning
        a unit-norm [B, N] vector with deterministic orientation.
        """
        v = vec.to(torch.float32)
        ortho_basis: list[torch.Tensor] = []

        for b in basis_vectors:
            u = b.to(torch.float32)
            for prev in ortho_basis:
                proj = (u * prev).sum(dim=1, keepdim=True)
                u = u - proj * prev
            u_norm = u.norm(dim=1, keepdim=True)
            valid = (u_norm > cls._EPS).to(torch.float32)
            u_unit = torch.where(u_norm > cls._EPS, u / u_norm.clamp_min(cls._EPS), torch.zeros_like(u))
            ortho_basis.append(u_unit * valid)

        # Two-pass MGS (Kahan "twice is enough") guarantees machine-precision orthogonality
        for _ in range(2):
            for u_unit in ortho_basis:
                proj = (v * u_unit).sum(dim=1, keepdim=True)
                v = v - proj * u_unit

        v_norm = v.norm(dim=1, keepdim=True).clamp_min(cls._EPS)
        return v / v_norm

    @classmethod
    def _apply_initial_offset(
        cls,
        noise: torch.Tensor,
        seed: int,
        ofd_offset: float,
        ofd_delta: float,
    ) -> torch.Tensor:
        """
        Stage 1 (O - Offset): Rotates the initial Gaussian noise tensor along a
        multi-scale orthogonal tangent on the hypersphere S^(D-1).
        Strictly preserves sample mean, L2 norm, and N(0, I) variance.
        """
        offset = max(0.0, min(1.0, float(ofd_offset)))
        if offset <= 0.0 or noise.ndim < 2:
            return noise

        orig_dtype = noise.dtype
        noise_f32 = noise.to(torch.float32)
        b = noise_f32.shape[0]
        flat_noise = noise_f32.reshape(b, -1)
        orig_norm = flat_noise.norm(dim=1, keepdim=True).clamp_min(cls._EPS)

        # Build two complementary multi-scale fields (structural + fine detail)
        field_a = cls._build_multiscale_field(noise_f32, seed, salt=0xA11CE01, structural_weight=0.65).reshape(b, -1)
        field_b = cls._build_multiscale_field(noise_f32, seed, salt=0xB0B0002, structural_weight=0.15).reshape(b, -1)

        # Rotate between the two fields using ofd_delta so Delta also steers the initial offset direction
        phi = float(ofd_delta) * math.pi
        combined_field = math.cos(phi) * field_a + math.sin(phi) * field_b

        # Project strictly orthogonal to flat_noise so rotation stays on the exact hypersphere
        tangent_unit = cls._project_orthogonal(combined_field, [flat_noise])
        tangent_scaled = tangent_unit * orig_norm

        # Maximum offset=1.0 corresponds to a 45-degree (pi/4) geodesic arc on the seed hypersphere,
        # keeping the global seed composition recognizable while allowing rich variation.
        theta = offset * (math.pi * 0.25)
        rotated = math.cos(theta) * flat_noise + math.sin(theta) * tangent_scaled
        return rotated.reshape_as(noise).to(dtype=orig_dtype)

    @classmethod
    def _apply_trajectory_ofd(
        cls,
        denoised: torch.Tensor,
        x_input: torch.Tensor | None,
        cond_denoised: torch.Tensor | None,
        uncond_denoised: torch.Tensor | None,
        basis_struct: torch.Tensor,
        basis_detail: torch.Tensor,
        ofd_factor: float,
        ofd_delta: float,
        progress: float,
        start_percent: float,
        end_percent: float,
    ) -> torch.Tensor:
        """
        Stage 2 (F - Factor & D - Delta): Applies a coherent, multi-scale orthogonal
        perturbation to the denoised prediction inside [start_percent, end_percent].
        Projects perpendicular to both the flow/denoising velocity (denoised - x_input)
        and the CFG guidance direction (cond - uncond), with spherical norm locking.
        """
        factor = max(0.0, min(2.0, float(ofd_factor)))
        if factor <= 0.0 or denoised.ndim < 2:
            return denoised

        if start_percent >= end_percent or progress < start_percent or progress > end_percent:
            return denoised

        # Smooth raised-sine window envelope peaking at the center of [start_percent, end_percent]
        tau = (progress - start_percent) / max(end_percent - start_percent, cls._EPS)
        envelope = math.sin(tau * math.pi)
        if envelope <= cls._EPS:
            return denoised

        orig_dtype = denoised.dtype
        denoised_f32 = denoised.to(torch.float32)
        b = denoised_f32.shape[0]
        flat_denoised = denoised_f32.reshape(b, -1)

        # Center per-sample mean so norm preservation operates on latent variance/contrast
        sample_mean = flat_denoised.mean(dim=1, keepdim=True)
        centered_denoised = flat_denoised - sample_mean
        centered_norm = centered_denoised.norm(dim=1, keepdim=True).clamp_min(cls._EPS)

        # Construct the active subspace to protect:
        # 1. Instantaneous denoising/flow velocity: (denoised - x_input)
        # 2. Centered denoised state itself (prevents contrast inflation)
        # 3. CFG guidance direction: (cond_denoised - uncond_denoised) when available
        protected_subspace: list[torch.Tensor] = [centered_denoised]

        if x_input is not None and x_input.shape == denoised.shape:
            velocity = (denoised_f32 - x_input.to(torch.float32)).reshape(b, -1)
            vel_norm = velocity.norm(dim=1, keepdim=True).clamp_min(cls._EPS)
            protected_subspace.append(velocity)
        else:
            vel_norm = centered_norm

        if (
            cond_denoised is not None
            and uncond_denoised is not None
            and cond_denoised.shape == denoised.shape
            and uncond_denoised.shape == denoised.shape
        ):
            cfg_dir = (cond_denoised.to(torch.float32) - uncond_denoised.to(torch.float32)).reshape(b, -1)
            protected_subspace.append(cfg_dir)

        # Rotate inside the persistent 2D multi-scale basis plane via ofd_delta + subtle smooth trajectory phase
        phi = float(ofd_delta) * math.pi + (tau - 0.5) * (math.pi * 0.25)
        raw_dir = math.cos(phi) * basis_struct.reshape(b, -1) + math.sin(phi) * basis_detail.reshape(b, -1)

        ortho_unit = cls._project_orthogonal(raw_dir, protected_subspace)

        # Scale relative to the active geometric reference (blending centered state norm and velocity norm)
        ref_scale = torch.minimum(centered_norm, vel_norm * 0.5 + centered_norm * 0.5)
        # Nonlinear gain at higher factors while keeping low factors (<0.5) ultra-subtle
        effective_gain = envelope * (0.25 * factor + 0.10 * (factor * factor))
        delta_vec = ortho_unit * (ref_scale * effective_gain)

        perturbed_centered = centered_denoised + delta_vec

        # Variance-preserving spherical retraction (norm lock) prevents saturation/contrast burn
        new_norm = perturbed_centered.norm(dim=1, keepdim=True).clamp_min(cls._EPS)
        retracted_centered = perturbed_centered * (centered_norm / new_norm)
        final_centered = (
            (1.0 - cls._NORM_LOCK) * perturbed_centered + cls._NORM_LOCK * retracted_centered
        )

        result = (final_centered + sample_mean).reshape_as(denoised_f32)
        result = torch.nan_to_num(result, nan=0.0, posinf=0.0, neginf=0.0)
        return result.to(dtype=orig_dtype)

    @classmethod
    def _estimate_step_progress(
        cls,
        sigma_scalar: float,
        schedule_sigmas: list[float],
        call_index: int,
        total_steps: int,
    ) -> float:
        """
        Computes architecture-agnostic sampling progress in [0.0, 1.0] by locating
        the current sigma inside the sampler's actual sigma schedule (falling back
        to monotonic call-index progress if schedule sigmas are unavailable).
        """
        if len(schedule_sigmas) >= 2:
            # Schedule sigmas are monotonically decreasing from sigma_start to sigma_end (> 0)
            s_max = schedule_sigmas[0]
            s_min = schedule_sigmas[-1]
            if sigma_scalar >= s_max:
                return 0.0
            if sigma_scalar <= s_min:
                return 1.0
            for idx in range(len(schedule_sigmas) - 1):
                hi = schedule_sigmas[idx]
                lo = schedule_sigmas[idx + 1]
                if hi >= sigma_scalar >= lo:
                    span = max(hi - lo, cls._EPS)
                    frac = (hi - sigma_scalar) / span
                    return max(0.0, min(1.0, (idx + frac) / max(len(schedule_sigmas) - 1, 1)))

        return max(0.0, min(1.0, float(call_index) / max(int(total_steps) - 1, 1)))

    @classmethod
    def execute(
        cls,
        model,
        seed: int,
        steps: int,
        cfg: float,
        sampler_name: str,
        scheduler: str,
        positive,
        negative,
        latent_image: dict,
        denoise: float = 1.0,
        enable_ofd: bool = False,
        ofd_offset: float = DEFAULT_OFD_OFFSET,
        ofd_factor: float = DEFAULT_OFD_FACTOR,
        ofd_delta: float = DEFAULT_OFD_DELTA,
        ofd_start_percent: float = DEFAULT_OFD_START,
        ofd_end_percent: float = DEFAULT_OFD_END,
        **kwargs,
    ) -> io.NodeOutput:
        effective_steps = max(1, int(steps))
        effective_cfg = max(0.0, float(cfg))
        effective_denoise = max(0.0, min(1.0, float(denoise)))
        effective_offset = max(0.0, min(1.0, float(ofd_offset)))
        effective_factor = max(0.0, min(2.0, float(ofd_factor)))
        effective_delta = max(-1.0, min(1.0, float(ofd_delta)))
        start_pct = max(0.0, min(1.0, float(ofd_start_percent)))
        end_pct = max(0.0, min(1.0, float(ofd_end_percent)))

        dynamic_model = model.clone()

        latent_samples = latent_image["samples"]
        latent_samples = comfy.sample.fix_empty_latent_channels(
            dynamic_model,
            latent_samples,
            latent_image.get("downscale_ratio_spacial", None),
        )

        batch_inds = latent_image.get("batch_index")
        noise = comfy.sample.prepare_noise(latent_samples, int(seed), batch_inds)

        if enable_ofd:
            # Stage 1: Initial Hypersphere Offset (O)
            if effective_offset > 0.0:
                noise = cls._apply_initial_offset(
                    noise=noise,
                    seed=int(seed),
                    ofd_offset=effective_offset,
                    ofd_delta=effective_delta,
                )

            # Stage 2: In-Trajectory Orthogonal Flow/Guidance Perturbation (F & D)
            if effective_factor > 0.0 and start_pct < end_pct:
                # Precompute schedule sigmas if the model exposes a sampling schedule
                schedule_sigmas: list[float] = []
                try:
                    ks = comfy.samplers.KSampler(
                        dynamic_model,
                        steps=effective_steps,
                        device=dynamic_model.load_device,
                        sampler=sampler_name,
                        scheduler=scheduler,
                        denoise=effective_denoise,
                        model_options=dynamic_model.model_options,
                    )
                    raw_sigmas = [float(s.item()) for s in ks.sigmas if float(s.item()) > cls._EPS]
                    if len(raw_sigmas) >= 2:
                        schedule_sigmas = raw_sigmas
                except Exception:
                    schedule_sigmas = []

                basis_cache: dict[tuple[tuple[int, ...], torch.device], tuple[torch.Tensor, torch.Tensor]] = {}
                step_tracker: dict[str, int | float | None] = {"call_idx": 0, "last_sigma": None}

                def universal_ofd_post_cfg_hook(args: dict) -> torch.Tensor:
                    denoised = args["denoised"]
                    sigma_scalar = cls._sigma_scalar(args.get("sigma"))

                    last_sigma = step_tracker["last_sigma"]
                    if last_sigma is not None and abs(sigma_scalar - float(last_sigma)) > cls._EPS:
                        step_tracker["call_idx"] = int(step_tracker["call_idx"] or 0) + 1
                    step_tracker["last_sigma"] = sigma_scalar

                    progress = cls._estimate_step_progress(
                        sigma_scalar=sigma_scalar,
                        schedule_sigmas=schedule_sigmas,
                        call_index=int(step_tracker["call_idx"] or 0),
                        total_steps=effective_steps,
                    )

                    cache_key = (tuple(denoised.shape), denoised.device)
                    if cache_key not in basis_cache:
                        b_struct = cls._build_multiscale_field(
                            denoised, int(seed), salt=0xC0FFEE01, structural_weight=0.75
                        )
                        b_detail = cls._build_multiscale_field(
                            denoised, int(seed), salt=0xC0FFEE02, structural_weight=0.15
                        )
                        # Make b_detail strictly orthogonal to b_struct upfront
                        b_detail_ortho = cls._project_orthogonal(
                            b_detail.reshape(denoised.shape[0], -1),
                            [b_struct.reshape(denoised.shape[0], -1)],
                        ).reshape_as(b_detail)
                        basis_cache[cache_key] = (b_struct, b_detail_ortho)

                    b_struct, b_detail = basis_cache[cache_key]

                    return cls._apply_trajectory_ofd(
                        denoised=denoised,
                        x_input=args.get("input"),
                        cond_denoised=args.get("cond_denoised"),
                        uncond_denoised=args.get("uncond_denoised"),
                        basis_struct=b_struct,
                        basis_detail=b_detail,
                        ofd_factor=effective_factor,
                        ofd_delta=effective_delta,
                        progress=progress,
                        start_percent=start_pct,
                        end_percent=end_pct,
                    )

                dynamic_model.set_model_sampler_post_cfg_function(universal_ofd_post_cfg_function := universal_ofd_post_cfg_hook)

        noise_mask = latent_image.get("noise_mask")
        callback = latent_preview.prepare_callback(dynamic_model, effective_steps)
        disable_pbar = not comfy.utils.PROGRESS_BAR_ENABLED

        sampled_latent = comfy.sample.sample(
            dynamic_model,
            noise,
            effective_steps,
            effective_cfg,
            sampler_name,
            scheduler,
            positive,
            negative,
            latent_samples,
            denoise=effective_denoise,
            noise_mask=noise_mask,
            callback=callback,
            disable_pbar=disable_pbar,
            seed=int(seed),
        )

        out = latent_image.copy()
        out.pop("downscale_ratio_spacial", None)
        out["samples"] = torch.nan_to_num(sampled_latent, nan=0.0, posinf=0.0, neginf=0.0)
        return io.NodeOutput(out)
