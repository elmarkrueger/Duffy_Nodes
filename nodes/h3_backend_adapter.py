"""Model-, LoRA-, and Attention-Agnostic MiniMax-H3 Execution Adapter."""

from __future__ import annotations

import gc
import importlib
import logging
import math
import sys
from typing import Any, Callable, Optional

import torch
import torch.nn.functional as F

logger = logging.getLogger(__name__)


def align_h3_frame_count(n: int) -> int:
    """Snap frame count `n` up to MiniMax-H3's native `17k + 5` DiT frame grid (minimum 5)."""
    val = max(5, int(n))
    while val % 17 != 5:
        val += 1
    return val


def valid_h3_guide_frame_count(n: int) -> int:
    """Snap a multi-frame continuation guide down to MiniMax-H3's valid `17k + 5` guide length (or 1 if < 5)."""
    val = int(n)
    if val < 5:
        return 1
    while val % 17 != 5:
        val -= 1
    return max(1, val)


def get_intermediate_device() -> torch.device:
    """Return ComfyUI's intermediate device (or CPU in standalone test environments)."""
    try:
        import comfy.model_management as mm  # type: ignore

        return mm.intermediate_device()
    except Exception:
        return torch.device("cpu")


def soft_empty_vram_cache() -> None:
    """Release unreferenced cached VRAM without unloading active models."""
    gc.collect()
    try:
        import comfy.model_management as mm  # type: ignore

        mm.soft_empty_cache()
    except Exception:
        pass


def normalize_image_to_canvas(
    image: torch.Tensor,
    width: int,
    height: int,
    crop: str = "center",
) -> torch.Tensor:
    """Normalize an image/video tensor `[B, H, W, C]` to `(B, height, width, 3)` in `[0.0, 1.0]`."""
    t = image.to(torch.float32)
    if t.ndim == 3:
        t = t.unsqueeze(0)
    t = t[..., :3]
    b, h, w, _ = t.shape
    if h == height and w == width:
        return torch.clamp(t, 0.0, 1.0)

    try:
        import comfy.utils  # type: ignore

        out = comfy.utils.common_upscale(t.movedim(-1, 1), int(width), int(height), "lanczos", crop).movedim(1, -1)
        return torch.clamp(out.to(torch.float32), 0.0, 1.0)
    except Exception:
        # Pure PyTorch bilinear fallback with optional center crop
        chw = t.permute(0, 3, 1, 2)
        if crop == "center":
            scale = max(height / float(h), width / float(w))
            nh = max(height, int(round(h * scale)))
            nw = max(width, int(round(w * scale)))
            resized = F.interpolate(chw, size=(nh, nw), mode="bilinear", align_corners=False)
            y0 = (nh - height) // 2
            x0 = (nw - width) // 2
            cropped = resized[:, :, y0 : y0 + height, x0 : x0 + width]
            return torch.clamp(cropped.permute(0, 2, 3, 1), 0.0, 1.0)
        resized = F.interpolate(chw, size=(int(height), int(width)), mode="bilinear", align_corners=False)
        return torch.clamp(resized.permute(0, 2, 3, 1), 0.0, 1.0)


def resample_waveform(waveform: torch.Tensor, orig_sr: int, target_sr: int) -> torch.Tensor:
    """Resample `[B, C, Samples]` waveform from `orig_sr` to `target_sr` without module-level torchaudio."""
    if int(orig_sr) == int(target_sr) or waveform.numel() == 0:
        return waveform
    try:
        import comfy.audio  # type: ignore

        return comfy.audio.resample(waveform, int(orig_sr), int(target_sr))
    except Exception:
        pass

    orig_len = waveform.shape[-1]
    target_len = max(1, int(round(orig_len * float(target_sr) / float(orig_sr))))
    return F.interpolate(waveform.to(torch.float32), size=target_len, mode="linear", align_corners=False)


def normalize_audio_to_project(
    audio: dict[str, Any],
    target_sr: int,
    target_channels: int = 2,
    target_samples: Optional[int] = None,
) -> dict[str, Any]:
    """Normalize a ComfyUI AUDIO dict to `[1, target_channels, Samples]` at `target_sr`."""
    waveform = audio.get("waveform")
    if waveform is None:
        n_samp = int(target_samples) if target_samples is not None else int(target_sr)
        return {
            "waveform": torch.zeros((1, target_channels, n_samp), dtype=torch.float32),
            "sample_rate": int(target_sr),
        }

    w = waveform.detach().to(torch.float32)
    if w.ndim == 1:
        w = w.unsqueeze(0).unsqueeze(0)
    elif w.ndim == 2:
        w = w.unsqueeze(0)
    elif w.ndim > 3:
        w = w.reshape(1, w.shape[-2], w.shape[-1])

    # Keep first batch item
    w = w[:1]

    orig_sr = int(audio.get("sample_rate", audio.get("sampler_rate", target_sr)))
    if orig_sr != int(target_sr):
        w = resample_waveform(w, orig_sr, int(target_sr))

    # Channel layout normalization (e.g. mono -> stereo)
    c = w.shape[1]
    if c == 1 and target_channels == 2:
        w = w.repeat(1, 2, 1)
    elif c > target_channels:
        w = w[:, :target_channels, :]
    elif c < target_channels:
        repeats = math.ceil(target_channels / float(c))
        w = w.repeat(1, repeats, 1)[:, :target_channels, :]

    if target_samples is not None:
        target_s = max(1, int(target_samples))
        cur_s = w.shape[-1]
        if cur_s > target_s:
            w = w[..., :target_s]
        elif cur_s < target_s:
            pad = torch.zeros((1, target_channels, target_s - cur_s), dtype=w.dtype, device=w.device)
            w = torch.cat([w, pad], dim=-1)

    return {
        "waveform": torch.nan_to_num(w, nan=0.0, posinf=1.0, neginf=-1.0).clamp(-1.0, 1.0),
        "sample_rate": int(target_sr),
    }


def reset_temporal_accelerator_state(model_or_pipe: Any) -> None:
    """Reset per-clip stateful accelerator counters (e.g. TeaCache / temporal KV caches) without touching LoRAs or attention backends."""
    if model_or_pipe is None or isinstance(model_or_pipe, (str, dict)):
        return

    model_patcher = model_or_pipe
    try:
        # 1. Reset any patch objects that expose a cleanup() method in transformer_options
        model_opts = getattr(model_patcher, "model_options", None)
        if isinstance(model_opts, dict):
            t_opts = model_opts.get("transformer_options", {})
            if isinstance(t_opts, dict):
                # Clear transient per-run step/cache keys while preserving config keys
                for transient_key in (
                    "teacache_state",
                    "cnt",
                    "step_counter",
                    "accumulated_rel_l1_distance",
                    "previous_modulated_input",
                    "previous_residual",
                    "kv_cache",
                ):
                    t_opts.pop(transient_key, None)

                patches_replace = t_opts.get("patches_replace", {})
                if isinstance(patches_replace, dict):
                    for group in patches_replace.values():
                        if isinstance(group, dict):
                            for patch_obj in group.values():
                                if hasattr(patch_obj, "cleanup") and callable(patch_obj.cleanup):
                                    patch_obj.cleanup()

        # 2. Reset common TeaCache / FBCache attributes on the inner diffusion_model if present
        inner_model = getattr(model_patcher, "model", None)
        diff_model = getattr(inner_model, "diffusion_model", None)
        for target in (inner_model, diff_model):
            if target is None:
                continue
            for attr, reset_val in (
                ("cnt", 0),
                ("accumulated_rel_l1_distance", 0.0),
                ("previous_modulated_input", None),
                ("previous_residual", None),
            ):
                if hasattr(target, attr):
                    try:
                        setattr(target, attr, reset_val)
                    except Exception:
                        pass
    except Exception as exc:
        logger.debug("[h3_backend_adapter] Non-fatal temporal state reset warning: %s", exc)


def _synthesize_mock_clip(
    clip_payload: dict[str, Any],
    continuity_payload: dict[str, Any],
    progress_callback: Optional[Callable[[int, int], None]] = None,
) -> tuple[torch.Tensor, dict[str, Any]]:
    """Deterministic synthetic clip generator for unit tests and dry-run verification."""
    num_frames = int(clip_payload["num_frames"])
    fps = int(clip_payload["fps"])
    width = int(clip_payload["width"])
    height = int(clip_payload["height"])
    sample_rate = int(clip_payload.get("sample_rate", 48000))
    seed = int(clip_payload.get("seed", 0))
    prompt = str(clip_payload.get("prompt", ""))

    # Simulate MiniMax-H3 generating on the 17k+5 grid and trimming to exact num_frames
    f_gen = align_h3_frame_count(num_frames)
    target_samples = int(round((num_frames / float(fps)) * sample_rate))

    if progress_callback is not None:
        progress_callback(1, 2)

    # Deterministic per-clip visual pattern based on seed + prompt hash
    prompt_val = (sum(ord(c) for c in prompt) % 251) / 251.0
    seed_val = ((seed * 2654435761) & 0xFFFFFFFF) / float(0xFFFFFFFF)

    t_axis = torch.linspace(0.0, 1.0, steps=f_gen, dtype=torch.float32).view(f_gen, 1, 1, 1)
    y_axis = torch.linspace(0.0, 1.0, steps=height, dtype=torch.float32).view(1, height, 1, 1)
    x_axis = torch.linspace(0.0, 1.0, steps=width, dtype=torch.float32).view(1, 1, width, 1)

    r = torch.clamp(0.2 + 0.5 * t_axis + 0.2 * seed_val + 0.1 * y_axis, 0.0, 1.0).expand(f_gen, height, width, 1)
    g = torch.clamp(0.2 + 0.5 * x_axis + 0.2 * prompt_val, 0.0, 1.0).expand(f_gen, height, width, 1)
    b = torch.clamp(0.3 + 0.4 * (1.0 - t_axis) + 0.2 * seed_val, 0.0, 1.0).expand(f_gen, height, width, 1)
    frames = torch.cat([r, g, b], dim=-1).clone()

    # If continuation frames exist from Clip (i-1), anchor the head frames smoothly to them
    cont_frames = continuity_payload.get("continuation_frames")
    if cont_frames is not None and isinstance(cont_frames, torch.Tensor) and cont_frames.numel() > 0:
        cont_norm = normalize_image_to_canvas(cont_frames, width, height, crop="center")
        n_cont = min(int(cont_norm.shape[0]), num_frames)
        for k in range(n_cont):
            w_anchor = max(0.0, 1.0 - (k / float(max(1, n_cont))))
            frames[k] = (1.0 - 0.5 * w_anchor) * frames[k] + (0.5 * w_anchor) * cont_norm[k]

    # Trim from 17k+5 DiT grid to exact requested num_frames
    frames = frames[:num_frames].contiguous()

    # Synthesize continuous stereo waveform at exact target_samples
    freq = 220.0 + (seed % 110)
    time_vec = torch.arange(target_samples, dtype=torch.float32) / float(sample_rate)
    left = 0.25 * torch.sin(2.0 * math.pi * freq * time_vec)
    right = 0.25 * torch.cos(2.0 * math.pi * freq * time_vec)
    waveform = torch.stack([left, right], dim=0).unsqueeze(0)

    if progress_callback is not None:
        progress_callback(2, 2)

    return frames, {"waveform": waveform, "sample_rate": sample_rate}


def _resolve_selflift_module():
    """Import comfyui-SelfLift's `nodes` module if installed in ComfyUI's custom_nodes."""
    for mod_name in ("custom_nodes.comfyui-SelfLift.nodes", "comfyui_SelfLift.nodes"):
        if mod_name in sys.modules:
            return sys.modules[mod_name]
    try:
        import folder_paths  # type: ignore

        for custom_dir in folder_paths.get_folder_paths("custom_nodes"):
            candidate = f"{custom_dir}/comfyui-SelfLift/__init__.py"
            import os

            if os.path.isfile(candidate):
                spec = importlib.util.spec_from_file_location(
                    "comfyui_selflift_pkg",
                    candidate,
                    submodule_search_locations=[os.path.dirname(candidate)],
                )
                if spec and spec.loader:
                    pkg = importlib.util.module_from_spec(spec)
                    sys.modules["comfyui_selflift_pkg"] = pkg
                    spec.loader.exec_module(pkg)
                    nodes_spec = importlib.util.spec_from_file_location(
                        "comfyui_selflift_pkg.nodes",
                        os.path.join(os.path.dirname(candidate), "nodes.py"),
                    )
                    if nodes_spec and nodes_spec.loader:
                        nodes_mod = importlib.util.module_from_spec(nodes_spec)
                        sys.modules["comfyui_selflift_pkg.nodes"] = nodes_mod
                        nodes_spec.loader.exec_module(nodes_mod)
                        return nodes_mod
    except Exception as exc:
        logger.debug("[h3_backend_adapter] comfyui-SelfLift lookup note: %s", exc)
    return None


def execute_h3_clip(
    model_or_pipe: Any,
    sampler_config: dict[str, Any],
    clip_payload: dict[str, Any],
    continuity_payload: dict[str, Any],
    media_refs: dict[str, Any],
    progress_callback: Optional[Callable[[int, int], None]] = None,
) -> tuple[torch.Tensor, dict[str, Any]]:
    """Execute a single MiniMax-H3 clip using the upstream model/pipe and sampler configuration.

    100% agnostic to upstream LoRAs, attention backends (SageAttention, Comfy Kitchen,
    BlockSparseAttention / Sol-Attn), and quantization wrappers.
    """
    num_frames = int(clip_payload["num_frames"])
    fps = int(clip_payload["fps"])
    width = int(clip_payload["width"])
    height = int(clip_payload["height"])
    sample_rate = int(clip_payload.get("sample_rate", 48000))
    target_samples = int(round((num_frames / float(fps)) * sample_rate))

    # 1. Mock mode for fast unit testing or dry runs
    if model_or_pipe == "MOCK" or (isinstance(model_or_pipe, dict) and model_or_pipe.get("mock", False)):
        if isinstance(model_or_pipe, dict) and isinstance(model_or_pipe.get("call_log"), list):
            model_or_pipe["call_log"].append(
                {
                    "clip_id": clip_payload.get("clip_id"),
                    "num_frames": num_frames,
                    "aligned_dit_frames": align_h3_frame_count(num_frames),
                    "target_samples": target_samples,
                    "seed": clip_payload.get("seed"),
                    "has_continuation_frames": continuity_payload.get("continuation_frames") is not None,
                    "has_continuation_audio": continuity_payload.get("continuation_audio") is not None,
                    "media_refs_count": len(media_refs.get("global_images", []))
                    + (1 if media_refs.get("local_image") is not None else 0),
                }
            )
        return _synthesize_mock_clip(clip_payload, continuity_payload, progress_callback)

    # 2. Custom callable pipeline mode
    custom_fn = None
    if callable(model_or_pipe):
        custom_fn = model_or_pipe
    elif isinstance(model_or_pipe, dict) and callable(model_or_pipe.get("callable")):
        custom_fn = model_or_pipe["callable"]

    if custom_fn is not None:
        reset_temporal_accelerator_state(model_or_pipe)
        raw_frames, raw_audio = custom_fn(
            sampler_config=sampler_config,
            clip_payload=clip_payload,
            continuity_payload=continuity_payload,
            media_refs=media_refs,
            progress_callback=progress_callback,
        )
        norm_frames = normalize_image_to_canvas(raw_frames, width, height, crop="center")[:num_frames]
        norm_audio = normalize_audio_to_project(raw_audio, sample_rate, target_channels=2, target_samples=target_samples)
        return norm_frames.to(device=get_intermediate_device()), norm_audio

    # 3. Native ComfyUI MiniMax-H3 Pipeline (MiniMaxH3ReferenceToVideo + MiniMaxH3AddGuide + SelfLift / KSampler)
    import comfy.model_management as mm  # type: ignore
    import comfy.samplers  # type: ignore
    import nodes as comfy_nodes  # type: ignore
    from comfy_extras.nodes_audio import vae_decode_audio  # type: ignore
    from comfy_extras.nodes_minimax_h3 import (  # type: ignore
        MiniMaxH3AddGuide,
        MiniMaxH3ReferenceToVideo,
    )

    if isinstance(model_or_pipe, dict):
        model = model_or_pipe.get("model")
        clip = model_or_pipe.get("clip")
        video_vae = model_or_pipe.get("vae") or model_or_pipe.get("video_vae")
        audio_vae = model_or_pipe.get("audio_vae")
    else:
        model = model_or_pipe
        clip = sampler_config.get("clip")
        video_vae = sampler_config.get("vae") or sampler_config.get("video_vae")
        audio_vae = sampler_config.get("audio_vae")

    if model is None or clip is None or video_vae is None or audio_vae is None:
        raise ValueError(
            "Duffy_H3_ExecutionEngine requires `model`, `clip`, `vae` (Video VAE), and `audio_vae` (Audio VAE) "
            "to execute native MiniMax-H3 generation (or pass model_or_pipe='MOCK' for dry-run testing)."
        )

    reset_temporal_accelerator_state(model)

    # Compute 17k+5 DiT frame ceiling so MiniMax-H3 generates a valid temporal latent grid
    f_gen = align_h3_frame_count(num_frames)
    prompt = str(clip_payload.get("prompt", ""))
    neg_prompt = str(clip_payload.get("negative_prompt", ""))
    seed = int(clip_payload.get("seed", 0))
    ref_image_size = str(sampler_config.get("ref_image_size", "match"))

    # Assemble Autogrow dictionaries for MiniMaxH3ReferenceToVideo
    ref_images_dict: dict[str, torch.Tensor] = {}
    img_idx = 0
    for g_img in media_refs.get("global_images", []):
        if g_img is not None:
            ref_images_dict[f"ref_image_{img_idx}"] = g_img
            img_idx += 1
    if media_refs.get("local_image") is not None:
        ref_images_dict[f"ref_image_{img_idx}"] = media_refs["local_image"]

    ref_audios_dict: dict[str, dict[str, Any]] = {}
    aud_idx = 0
    for g_aud in media_refs.get("global_audios", []):
        if g_aud is not None:
            ref_audios_dict[f"ref_audio_{aud_idx}"] = g_aud
            aud_idx += 1
    if media_refs.get("local_audio") is not None:
        ref_audios_dict[f"ref_audio_{aud_idx}"] = media_refs["local_audio"]

    # Step A: Reference-to-Video Conditioning + Empty AV NestedTensor Latent
    ref_out = MiniMaxH3ReferenceToVideo.execute(
        clip=clip,
        prompt=prompt,
        width=width,
        height=height,
        length=f_gen,
        ref_image_size=ref_image_size,
        vae=video_vae,
        audio_vae=audio_vae,
        ref_images=ref_images_dict if ref_images_dict else None,
        ref_videos=None,
        ref_video_audios=None,
        ref_audios=ref_audios_dict if ref_audios_dict else None,
    )
    positive_cond, av_latent = ref_out[0], ref_out[1]

    # Negative conditioning: match ConditioningZeroOut from Duffy-Fast-MiniMax-H3.json when empty
    if not neg_prompt.strip():
        negative_cond = []
        for t, d in positive_cond:
            d_copy = d.copy()
            if "pooled_output" in d_copy and isinstance(d_copy["pooled_output"], torch.Tensor):
                d_copy["pooled_output"] = torch.zeros_like(d_copy["pooled_output"])
            negative_cond.append((torch.zeros_like(t), d_copy))
    else:
        neg_tokens = clip.tokenize(neg_prompt)
        negative_cond = clip.encode_from_tokens_scheduled(neg_tokens)

    # Step B: Inject N-Frame Continuation Tail and/or Master Audio Guide at frame_idx=0 via MiniMaxH3AddGuide
    # When master_audio_slice is active (Slice From Master Audio), pinning it at frame_idx=0 places
    # cond_audio on the exact same 3D RoPE time coordinates as the generated video frames for frame-accurate lip-sync.
    cont_frames = continuity_payload.get("continuation_frames")
    cont_audio = continuity_payload.get("continuation_audio")
    master_audio_slice = media_refs.get("master_audio_slice")
    guide_audio = master_audio_slice if master_audio_slice is not None else cont_audio
    if cont_frames is not None or guide_audio is not None:
        guide_image = None
        if cont_frames is not None and isinstance(cont_frames, torch.Tensor) and cont_frames.shape[0] > 0:
            n_avail = int(cont_frames.shape[0])
            valid_n = valid_h3_guide_frame_count(n_avail)
            # Take the most recent valid_n frames from the tail so the seam at frame 0 matches Clip (i-1)'s end
            guide_image = normalize_image_to_canvas(cont_frames[-valid_n:], width, height, crop="center")

        guide_out = MiniMaxH3AddGuide.execute(
            positive=positive_cond,
            latent=av_latent,
            frame_idx=0,
            vae=video_vae if guide_image is not None else None,
            audio_vae=audio_vae if guide_audio is not None else None,
            image=guide_image,
            audio=guide_audio,
        )
        positive_cond = guide_out[0]

    # Step C: Sampling (SelfLift Progressive or Standard ComfyUI KSampler)
    overrides = clip_payload.get("clip_sampler_overrides") or {}
    steps = int(overrides.get("steps", sampler_config.get("steps", 8)))
    cfg = float(overrides.get("cfg", sampler_config.get("cfg", 1.0)))
    sampler_name = str(overrides.get("sampler_name", sampler_config.get("sampler_name", "euler")))
    scheduler = str(overrides.get("scheduler", sampler_config.get("scheduler", "beta")))
    denoise = float(overrides.get("denoise", sampler_config.get("denoise", 1.0)))
    sampler_mode = str(sampler_config.get("sampler_mode", "SelfLift_Progressive"))

    sampled_latent = None
    if sampler_mode == "SelfLift_Progressive":
        selflift_mod = _resolve_selflift_module()
        if selflift_mod is not None:
            sampler_obj = sampler_config.get("sampler") or comfy.samplers.sampler_object(sampler_name)
            sigmas = sampler_config.get("sigmas")
            if sigmas is None:
                model_sampling = model.get_model_object("model_sampling")
                sigmas = comfy.samplers.calculate_sigmas(model_sampling, scheduler, steps).cpu()
                if denoise < 1.0 and len(sigmas) > 1:
                    s_start = int(steps * (1.0 - denoise))
                    sigmas = sigmas[s_start:]

            transition_step = int(sampler_config.get("transition_step", max(1, steps // 2)))
            transition_step = max(1, min(transition_step, int(sigmas.numel()) - 2))
            lowres_scale = float(sampler_config.get("lowres_scale", 0.4))
            rho = float(sampler_config.get("rho", 0.0))
            w_min = float(sampler_config.get("w_min", 0.5))
            w_max = float(sampler_config.get("w_max", 1.0))
            upscaler_model = str(sampler_config.get("upscaler_model", "h3_upscaler_lms_v0.1_fp32.safetensors"))
            highres_tiling = bool(sampler_config.get("highres_tiling", False))
            upscaler_unload = bool(sampler_config.get("upscaler_unload", True))
            model_hires = sampler_config.get("model_hires")

            sl_sampler = selflift_mod.SelfLiftH3Sampler()
            sampled_latent = sl_sampler.sample(
                model=model,
                positive=positive_cond,
                negative=negative_cond,
                vae=video_vae,
                latent_image=av_latent,
                sampler=sampler_obj,
                sigmas=sigmas,
                seed=seed,
                cfg=cfg,
                transition_step=transition_step,
                lowres_scale=lowres_scale,
                rho=rho,
                w_min=w_min,
                w_max=w_max,
                upscaler_model=upscaler_model,
                model_hires=model_hires,
                highres_tiling=highres_tiling,
                upscaler_unload=upscaler_unload,
            )[0]
        else:
            logger.warning(
                "[h3_backend_adapter] comfyui-SelfLift not found; falling back to standard KSampler for clip %s.",
                clip_payload.get("clip_id"),
            )

    if sampled_latent is None:
        sampled_latent = comfy_nodes.common_ksampler(
            model=model,
            seed=seed,
            steps=steps,
            cfg=cfg,
            sampler_name=sampler_name,
            scheduler=scheduler,
            positive=positive_cond,
            negative=negative_cond,
            latent=av_latent,
            denoise=denoise,
        )[0]

    # Step D: Decode Video & Audio and trim to exact requested F_i and S_i
    samples = sampled_latent["samples"]
    video_latent = samples.unbind()[0] if getattr(samples, "is_nested", False) else samples
    decoded_images = video_vae.decode(video_latent)
    if decoded_images.ndim == 5:
        decoded_images = decoded_images.reshape(
            -1,
            decoded_images.shape[-3],
            decoded_images.shape[-2],
            decoded_images.shape[-1],
        )
    decoded_images = torch.nan_to_num(decoded_images, nan=0.0, posinf=1.0, neginf=0.0).clamp(0.0, 1.0)
    final_frames = decoded_images[:num_frames].to(device=mm.intermediate_device(), dtype=mm.intermediate_dtype())

    if master_audio_slice is not None:
        # Preserve pristine studio master audio slice (trimmed to exact target_samples) without Audio VAE degradation
        final_audio = normalize_audio_to_project(
            master_audio_slice,
            target_sr=sample_rate,
            target_channels=2,
            target_samples=target_samples,
        )
    else:
        decoded_audio = vae_decode_audio(audio_vae, sampled_latent)
        final_audio = normalize_audio_to_project(
            decoded_audio,
            target_sr=sample_rate,
            target_channels=2,
            target_samples=target_samples,
        )

    del sampled_latent, av_latent, positive_cond, negative_cond, decoded_images
    soft_empty_vram_cache()

    return final_frames, final_audio
