import comfy.sample
import comfy.samplers
import comfy.utils
import latent_preview
import torch
from comfy_api.latest import io


class DuffyDynamicMultiArchitectureSampler(io.ComfyNode):
    DEFAULT_PROFILE = "Z-Image Base"
    OFD_STRENGTH = 0.08
    OFD_BOOST = 1.5
    _EPS = 1e-8

    MODEL_PROFILES: dict[str, dict[str, float | int | bool]] = {
        "Z-Image Base": {"min": 20, "default": 30, "max": 100, "cfg": 4.5, "distilled": False},
        "Z-Image Turbo": {"min": 6, "default": 8, "max": 100, "cfg": 1.0, "distilled": True},
        "Qwen-Image-2512": {"min": 4, "default": 8, "max": 100, "cfg": 1.0, "distilled": True},
        "Flux.2-Klein-Base": {"min": 20, "default": 25, "max": 100, "cfg": 3.5, "distilled": False},
        "Flux.2-Klein": {"min": 4, "default": 8, "max": 100, "cfg": 1.0, "distilled": True},
        "Ernie-Image Base": {"min": 20, "default": 50, "max": 100, "cfg": 4.0, "distilled": False},
        "Ernie-Image": {"min": 4, "default": 8, "max": 100, "cfg": 1.0, "distilled": True},
    }

    @classmethod
    def define_schema(cls) -> io.Schema:
        available_samplers = comfy.samplers.KSampler.SAMPLERS
        available_schedulers = comfy.samplers.KSampler.SCHEDULERS

        return io.Schema(
            node_id="Duffy_DynamicMultiArchitectureSampler",
            display_name="Dynamic Multi-Architecture Sampler",
            category="Duffy/Sampling",
            description=(
                "Profile-driven sampler for foundation and distilled architectures. "
                "Enforces model-specific step boundaries and dynamically adapts CFG behavior during sampling."
            ),
            inputs=[
                io.Model.Input("model", tooltip="Model patcher used for latent denoising."),
                io.Combo.Input(
                    "model_selection",
                    options=list(cls.MODEL_PROFILES.keys()),
                    default=cls.DEFAULT_PROFILE,
                    tooltip="Architecture profile that drives dynamic constraints and sampler adaptation.",
                ),
                io.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=0x7FFFFFFFFFFFFFFF,
                    step=1,
                    control_after_generate=True,
                    tooltip="Noise seed used to initialize the latent trajectory.",
                ),
                io.Int.Input(
                    "steps",
                    default=int(cls.MODEL_PROFILES[cls.DEFAULT_PROFILE]["default"]),
                    min=4,
                    max=100,
                    step=1,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Sampling step count. Backend validates model-specific boundaries.",
                ),
                io.Float.Input(
                    "cfg",
                    default=float(cls.MODEL_PROFILES[cls.DEFAULT_PROFILE]["cfg"]),
                    min=1.0,
                    max=20.0,
                    step=0.1,
                    round=0.01,
                    display_mode=io.NumberDisplay.slider,
                    tooltip=(
                        "Classifier-Free Guidance scale. Distilled profiles internally enforce CFG=1.0 "
                        "for numerical stability."
                    ),
                ),
                io.Combo.Input(
                    "sampler_name",
                    options=available_samplers,
                    tooltip="Sampling algorithm used by ComfyUI KSampler.",
                ),
                io.Combo.Input(
                    "scheduler",
                    options=available_schedulers,
                    tooltip="Noise scheduler used by the selected sampler.",
                ),
                io.Conditioning.Input("positive", tooltip="Positive conditioning payload."),
                io.Conditioning.Input("negative", tooltip="Negative conditioning payload."),
                io.Latent.Input("latent_image", tooltip="Input latent to denoise."),
                io.Float.Input(
                    "denoise",
                    default=1.0,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    tooltip="Denoise strength used by the scheduler integration path.",
                ),
                io.Boolean.Input(
                    "enable_ofd",
                    default=False,
                    advanced=True,
                    tooltip=(
                        "Experimental: inject a small orthogonal perturbation in distilled CFG path "
                        "to reduce mode collapse."
                    ),
                ),
                io.Float.Input(
                    "ofd_strength",
                    default=cls.OFD_STRENGTH,
                    min=0.0,
                    max=0.5,
                    step=0.005,
                    round=0.001,
                    display_mode=io.NumberDisplay.slider,
                    advanced=True,
                    tooltip=(
                        "Strength of orthogonal perturbation when OFD is enabled. "
                        "Higher values increase diversity but can reduce prompt adherence."
                    ),
                ),
                io.Float.Input(
                    "ofd_boost",
                    default=cls.OFD_BOOST,
                    min=0.0,
                    max=4.0,
                    step=0.05,
                    round=0.01,
                    display_mode=io.NumberDisplay.slider,
                    advanced=True,
                    tooltip=(
                        "Nonlinear gain for OFD strength. Higher values amplify high-end diversity, "
                        "especially in early denoising steps."
                    ),
                ),
                io.Float.Input(
                    "ofd_parallel_mix",
                    default=0.0,
                    min=0.0,
                    max=0.5,
                    step=0.01,
                    round=0.01,
                    display_mode=io.NumberDisplay.slider,
                    advanced=True,
                    tooltip=(
                        "Blend in a non-orthogonal random component. Use sparingly to push stronger variation "
                        "at the cost of stricter prompt adherence."
                    ),
                ),
            ],
            outputs=[
                io.Latent.Output("latent", display_name="LATENT"),
            ],
        )

    @classmethod
    def validate_inputs(cls, model_selection: str, steps: int, **kwargs) -> bool | str:
        profile = cls.MODEL_PROFILES.get(model_selection)
        if profile is None:
            return f"Validation Error: Unknown architecture profile '{model_selection}'."

        min_steps = int(profile["min"])
        max_steps = int(profile["max"])
        if steps < min_steps or steps > max_steps:
            return (
                f"Validation Error: Step count {steps} is out of bounds for {model_selection}. "
                f"Required range is {min_steps} to {max_steps}."
            )

        return True

    @classmethod
    def _apply_ofd(
        cls,
        guided_noise: torch.Tensor,
        cond_noise: torch.Tensor,
        uncond_noise: torch.Tensor,
        seed: int,
        sigma: torch.Tensor | float | int | None,
        ofd_strength: float,
        ofd_boost: float,
        ofd_parallel_mix: float,
        sigma_ratio: float,
    ) -> torch.Tensor:
        if guided_noise.ndim < 2:
            return guided_noise

        direction = cond_noise - uncond_noise
        if direction.ndim < 2:
            return guided_noise

        flat_dir = direction.reshape(direction.shape[0], -1)
        guided_flat = guided_noise.reshape(guided_noise.shape[0], -1)
        dir_norm = flat_dir.norm(dim=1, keepdim=True)
        guided_norm = guided_flat.norm(dim=1, keepdim=True).clamp_min(cls._EPS)

        sigma_value = 0
        if sigma is not None:
            if isinstance(sigma, torch.Tensor):
                sigma_value = int(abs(float(sigma.reshape(-1)[0].item())) * 1_000_000)
            else:
                sigma_value = int(abs(float(sigma)) * 1_000_000)

        mixed_seed = (int(seed) ^ sigma_value ^ 0x9E3779B97F4A7C15) & 0x7FFFFFFFFFFFFFFF

        # Build random source on CPU for broad compatibility, then move to active device/dtype.
        generator = torch.Generator(device="cpu")
        generator.manual_seed(mixed_seed)
        rand = torch.randn(flat_dir.shape, dtype=torch.float32, device="cpu", generator=generator)
        rand = rand.to(device=flat_dir.device, dtype=flat_dir.dtype)

        # Project random vector off the semantic guidance direction.
        safe_dir_norm = dir_norm.clamp_min(cls._EPS)
        projection = (rand * flat_dir).sum(dim=1, keepdim=True) / (safe_dir_norm * safe_dir_norm)
        ortho = rand - projection * flat_dir
        ortho_norm = ortho.norm(dim=1, keepdim=True).clamp_min(cls._EPS)
        rand_norm = rand.norm(dim=1, keepdim=True).clamp_min(cls._EPS)

        ortho_unit = ortho / ortho_norm
        rand_unit = rand / rand_norm

        # Optional parallel/random mixing to break orthogonal-only saturation at high strengths.
        mix = max(0.0, min(0.5, float(ofd_parallel_mix)))
        basis = ortho_unit * (1.0 - mix) + rand_unit * mix
        basis_norm = basis.norm(dim=1, keepdim=True).clamp_min(cls._EPS)
        basis = basis / basis_norm

        # If cond/uncond are near-identical, fall back to a small normalized random perturbation.
        semantic_scale = torch.where(dir_norm > cls._EPS, dir_norm, guided_norm * 0.25)

        # Nonlinear gain: high ofd_strength values become progressively stronger.
        strength_gain = 1.0 + max(0.0, float(ofd_boost)) * float(ofd_strength) * max(0.0, min(1.0, float(sigma_ratio)))
        effective_strength = float(ofd_strength) * strength_gain

        scaled_perturb = basis * (semantic_scale * effective_strength)
        return guided_noise + scaled_perturb.reshape_as(guided_noise)

    @classmethod
    def _sigma_scalar(cls, sigma: torch.Tensor | float | int | None) -> float:
        if sigma is None:
            return 0.0
        if isinstance(sigma, torch.Tensor):
            return abs(float(sigma.reshape(-1)[0].item()))
        return abs(float(sigma))

    @classmethod
    def execute(
        cls,
        model,
        model_selection: str,
        seed: int,
        steps: int,
        cfg: float,
        sampler_name: str,
        scheduler: str,
        positive,
        negative,
        latent_image: dict,
        denoise: float,
        enable_ofd: bool = False,
        ofd_strength: float = OFD_STRENGTH,
        ofd_boost: float = OFD_BOOST,
        ofd_parallel_mix: float = 0.0,
        **kwargs,
    ) -> io.NodeOutput:
        profile = cls.MODEL_PROFILES[model_selection]
        is_distilled = bool(profile["distilled"])
        effective_cfg = 1.0 if is_distilled else float(cfg)
        effective_ofd_strength = max(0.0, min(0.5, float(ofd_strength)))
        effective_ofd_boost = max(0.0, min(4.0, float(ofd_boost)))
        effective_ofd_parallel_mix = max(0.0, min(0.5, float(ofd_parallel_mix)))

        dynamic_model = model.clone()
        ofd_state: dict[str, float | None] = {"max_sigma": None}

        def architecture_cfg_hook(args: dict) -> torch.Tensor:
            cond = args["cond"]
            uncond = args["uncond"]
            cond_scale = float(args.get("cond_scale", 1.0))

            local_scale = 1.0 if is_distilled else cond_scale
            guided = uncond + (cond - uncond) * local_scale

            if is_distilled and enable_ofd:
                sigma_scalar = cls._sigma_scalar(args.get("sigma"))
                max_sigma = ofd_state["max_sigma"]
                if max_sigma is None or sigma_scalar > max_sigma:
                    ofd_state["max_sigma"] = sigma_scalar
                    max_sigma = sigma_scalar
                sigma_ratio = sigma_scalar / max(float(max_sigma), cls._EPS)

                guided = cls._apply_ofd(
                    guided_noise=guided,
                    cond_noise=cond,
                    uncond_noise=uncond,
                    seed=seed,
                    sigma=args.get("sigma"),
                    ofd_strength=effective_ofd_strength,
                    ofd_boost=effective_ofd_boost,
                    ofd_parallel_mix=effective_ofd_parallel_mix,
                    sigma_ratio=sigma_ratio,
                )

            return guided

        # OFD requires real cond/uncond predictions; disable CFG=1 optimization when OFD is enabled.
        dynamic_model.set_model_sampler_cfg_function(
            architecture_cfg_hook,
            disable_cfg1_optimization=bool(is_distilled and enable_ofd),
        )

        latent_samples = latent_image["samples"]
        latent_samples = comfy.sample.fix_empty_latent_channels(
            dynamic_model,
            latent_samples,
            latent_image.get("downscale_ratio_spacial", None),
        )

        batch_inds = latent_image.get("batch_index")
        noise = comfy.sample.prepare_noise(latent_samples, int(seed), batch_inds)
        noise_mask = latent_image.get("noise_mask")
        callback = latent_preview.prepare_callback(dynamic_model, int(steps))
        disable_pbar = not comfy.utils.PROGRESS_BAR_ENABLED

        sampled_latent = comfy.sample.sample(
            dynamic_model,
            noise,
            int(steps),
            float(effective_cfg),
            sampler_name,
            scheduler,
            positive,
            negative,
            latent_samples,
            denoise=float(denoise),
            noise_mask=noise_mask,
            callback=callback,
            disable_pbar=disable_pbar,
            seed=int(seed),
        )

        out = latent_image.copy()
        out.pop("downscale_ratio_spacial", None)
        out["samples"] = sampled_latent
        return io.NodeOutput(out)
