"""ComfyUI V3 Custom Nodes for the MiniMax-H3 Multi-Clip Storyboard & A/V Stitching Suite."""

from __future__ import annotations

import copy
import hashlib
import json
import logging
import os
import time
from typing import Any, Optional

import torch
from comfy_api.latest import io

from .h3_av_stitcher_core import (
    clamp_overlap_frames,
    mux_av_to_container,
    stitch_clip_sequence,
)
from .h3_backend_adapter import (
    align_h3_frame_count,
    execute_h3_clip,
    get_intermediate_device,
    normalize_audio_to_project,
    normalize_image_to_canvas,
)
from .h3_project_manager import (
    H3ProjectWorkspace,
    compute_clip_config_hash,
    fast_tensor_digest,
    get_default_comfy_output_dir,
    load_image_png,
    load_wav_tensor,
    sanitize_project_name,
)

logger = logging.getLogger(__name__)

H3ProjectBusType = io.Custom("H3_PROJECT_BUS")
H3SamplerConfigType = io.Custom("H3_SAMPLER_CONFIG")

_DEFAULT_SAMPLERS = ["euler", "euler_ancestral", "heun", "dpmpp_2m", "dpmpp_sde", "uni_pc"]
_DEFAULT_SCHEDULERS = ["beta", "normal", "karras", "exponential", "sgm_uniform", "simple", "ddim_uniform"]


def _get_comfy_samplers_and_schedulers() -> tuple[list[str], list[str]]:
    try:
        import comfy.samplers  # type: ignore

        samplers = list(comfy.samplers.KSampler.SAMPLERS)
        schedulers = list(comfy.samplers.KSampler.SCHEDULERS)
        return samplers or _DEFAULT_SAMPLERS, schedulers or _DEFAULT_SCHEDULERS
    except Exception:
        return _DEFAULT_SAMPLERS, _DEFAULT_SCHEDULERS


class DuffyH3GlobalMediaVault(io.ComfyNode):
    """Node 1: Initializes the project workspace, timing constants, and global reference media vault."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_H3_GlobalMediaVault",
            display_name="H3 Global Media Vault",
            category="Duffy/MiniMax-H3/Project",
            description="Initializes the MiniMax-H3 project workspace, locks in FPS/resolution/sample-rate constants, and caches global reference media.",
            search_aliases=["H3_GlobalMediaVault", "minimax vault", "h3 project vault"],
            inputs=[
                io.String.Input(
                    "project_name",
                    display_name="Project Name",
                    default="My_H3_Project",
                    tooltip="Project folder name under <ComfyUI_output>/H3_Projects/ (sanitized for filesystem safety).",
                ),
                io.Int.Input(
                    "fps",
                    display_name="FPS",
                    default=24,
                    min=12,
                    max=60,
                    step=1,
                    tooltip="Project-wide video frame rate (MiniMax-H3 native is 24 fps).",
                ),
                io.Int.Input(
                    "width",
                    display_name="Width",
                    default=1344,
                    min=32,
                    max=4096,
                    step=16,
                    tooltip="Project-wide target frame width in pixels.",
                ),
                io.Int.Input(
                    "height",
                    display_name="Height",
                    default=768,
                    min=32,
                    max=4096,
                    step=16,
                    tooltip="Project-wide target frame height in pixels.",
                ),
                io.Combo.Input(
                    "audio_sample_rate",
                    display_name="Audio Sample Rate",
                    options=["48000", "44100"],
                    default="48000",
                    tooltip="Project-wide canonical stereo audio sample rate in Hz.",
                ),
                io.String.Input(
                    "ref_image_tag_1",
                    display_name="Ref Image Tag 1",
                    default="hero",
                    tooltip="Tag key for Reference Image 1 (referenced by H3_ClipCard).",
                ),
                io.String.Input(
                    "ref_image_tag_2",
                    display_name="Ref Image Tag 2",
                    default="environment",
                    tooltip="Tag key for Reference Image 2.",
                ),
                io.String.Input(
                    "ref_image_tag_3",
                    display_name="Ref Image Tag 3",
                    default="style",
                    tooltip="Tag key for Reference Image 3.",
                ),
                io.String.Input(
                    "ref_image_tag_4",
                    display_name="Ref Image Tag 4",
                    default="prop",
                    tooltip="Tag key for Reference Image 4.",
                ),
                io.String.Input(
                    "ref_audio_tag_1",
                    display_name="Ref Audio Tag 1",
                    default="voice_ref",
                    tooltip="Tag key for Reference Audio 1.",
                ),
                io.String.Input(
                    "ref_audio_tag_2",
                    display_name="Ref Audio Tag 2",
                    default="ambience",
                    tooltip="Tag key for Reference Audio 2.",
                ),
                io.Image.Input(
                    "ref_image_1",
                    display_name="Ref Image 1",
                    optional=True,
                    tooltip="Optional global reference image 1.",
                ),
                io.Image.Input(
                    "ref_image_2",
                    display_name="Ref Image 2",
                    optional=True,
                    tooltip="Optional global reference image 2.",
                ),
                io.Image.Input(
                    "ref_image_3",
                    display_name="Ref Image 3",
                    optional=True,
                    tooltip="Optional global reference image 3.",
                ),
                io.Image.Input(
                    "ref_image_4",
                    display_name="Ref Image 4",
                    optional=True,
                    tooltip="Optional global reference image 4.",
                ),
                io.Audio.Input(
                    "ref_audio_1",
                    display_name="Ref Audio 1",
                    optional=True,
                    tooltip="Optional global reference audio 1.",
                ),
                io.Audio.Input(
                    "ref_audio_2",
                    display_name="Ref Audio 2",
                    optional=True,
                    tooltip="Optional global reference audio 2.",
                ),
                io.Audio.Input(
                    "master_timeline_audio",
                    display_name="Master Timeline Audio",
                    optional=True,
                    tooltip="Optional continuous master audio track that can be auto-sliced per clip.",
                ),
            ],
            outputs=[
                H3ProjectBusType.Output(
                    "project_bus",
                    display_name="Project Bus",
                    tooltip="Initialized H3_PROJECT_BUS carrying workspace paths, timing constants, and vault references.",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        project_name: str,
        fps: int,
        width: int,
        height: int,
        audio_sample_rate: str | int,
        ref_image_tag_1: str = "hero",
        ref_image_tag_2: str = "environment",
        ref_image_tag_3: str = "style",
        ref_image_tag_4: str = "prop",
        ref_audio_tag_1: str = "voice_ref",
        ref_audio_tag_2: str = "ambience",
        ref_image_1: Optional[torch.Tensor] = None,
        ref_image_2: Optional[torch.Tensor] = None,
        ref_image_3: Optional[torch.Tensor] = None,
        ref_image_4: Optional[torch.Tensor] = None,
        ref_audio_1: Optional[dict[str, Any]] = None,
        ref_audio_2: Optional[dict[str, Any]] = None,
        master_timeline_audio: Optional[dict[str, Any]] = None,
        base_output_dir: Optional[str] = None,
    ) -> io.NodeOutput:
        sr = int(audio_sample_rate)
        w = max(32, int(width))
        h = max(32, int(height))
        fps_int = max(1, int(fps))

        workspace = H3ProjectWorkspace(project_name, base_output_dir=base_output_dir)
        workspace.ensure_dirs()

        images_map: dict[str, str] = {}
        image_hashes: dict[str, str] = {}
        for img_tensor, raw_tag in (
            (ref_image_1, ref_image_tag_1),
            (ref_image_2, ref_image_tag_2),
            (ref_image_3, ref_image_tag_3),
            (ref_image_4, ref_image_tag_4),
        ):
            tag = (raw_tag or "").strip()
            if img_tensor is not None and tag:
                norm_img = normalize_image_to_canvas(img_tensor[:1], w, h, crop="center")
                cached_path, digest = workspace.cache_vault_image(tag, norm_img)
                images_map[tag] = cached_path
                image_hashes[tag] = digest

        audio_map: dict[str, str] = {}
        audio_hashes: dict[str, str] = {}
        for aud_dict, raw_tag in (
            (ref_audio_1, ref_audio_tag_1),
            (ref_audio_2, ref_audio_tag_2),
        ):
            tag = (raw_tag or "").strip()
            if aud_dict is not None and tag:
                norm_aud = normalize_audio_to_project(aud_dict, target_sr=sr, target_channels=2)
                cached_path, digest = workspace.cache_vault_audio(tag, norm_aud)
                audio_map[tag] = cached_path
                audio_hashes[tag] = digest

        master_audio_path: Optional[str] = None
        master_audio_hash = "NONE"
        if master_timeline_audio is not None:
            norm_master = normalize_audio_to_project(master_timeline_audio, target_sr=sr, target_channels=2)
            master_audio_path, master_audio_hash = workspace.cache_vault_audio("master_timeline", norm_master)

        project_bus: dict[str, Any] = {
            "project_name": workspace.project_name,
            "project_dir": workspace.project_dir,
            "base_output_dir": os.path.dirname(os.path.dirname(workspace.project_dir)),
            "fps": fps_int,
            "sample_rate": sr,
            "resolution": (w, h),
            "global_media": {
                "images": images_map,
                "image_hashes": image_hashes,
                "audio": audio_map,
                "audio_hashes": audio_hashes,
                "master_audio_path": master_audio_path,
                "master_audio_hash": master_audio_hash,
            },
            "clips": [],
            "warnings": [],
        }
        return io.NodeOutput(project_bus)


class DuffyH3ClipCard(io.ComfyNode):
    """Node 2: Lightweight, chainable scene definition card for MiniMax-H3 multi-clip storyboards."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_H3_ClipCard",
            display_name="H3 Storyboard Clip Card",
            category="Duffy/MiniMax-H3/Storyboard",
            description="Appends a variable-duration scene clip specification (1.0s to 15.0s) to the MiniMax-H3 project bus.",
            search_aliases=["H3_ClipCard", "minimax clip card", "h3 storyboard"],
            inputs=[
                H3ProjectBusType.Input(
                    "project_bus",
                    display_name="Project Bus",
                    tooltip="Incoming H3_PROJECT_BUS from H3_GlobalMediaVault or the preceding H3_ClipCard.",
                ),
                io.String.Input(
                    "prompt",
                    display_name="Prompt",
                    multiline=True,
                    default="",
                    tooltip="Scene prompt for this clip (supports MiniMax-H3 <Picture i>, (S1), and <d>dialogue</d> tags).",
                ),
                io.String.Input(
                    "negative_prompt",
                    display_name="Negative Prompt",
                    multiline=True,
                    default="",
                    optional=True,
                    tooltip="Optional negative prompt (leave empty for zeroed conditioning).",
                ),
                io.Float.Input(
                    "duration_sec",
                    display_name="Duration (sec)",
                    default=5.0,
                    min=1.0,
                    max=15.0,
                    step=0.1,
                    tooltip="Clip duration in seconds (1.0s to 15.0s).",
                ),
                io.Int.Input(
                    "seed",
                    display_name="Seed",
                    default=0,
                    min=0,
                    max=0xFFFFFFFFFFFFFFFF,
                    control_after_generate=True,
                    tooltip="Deterministic random seed for this clip.",
                ),
                io.Int.Input(
                    "overlap_frames_N",
                    display_name="Overlap Frames (N)",
                    default=8,
                    min=0,
                    max=64,
                    step=1,
                    tooltip="Number of continuation tail frames referenced from the previous clip (forced to 0 for Clip 1 or hard cuts).",
                ),
                io.Combo.Input(
                    "render_mode",
                    display_name="Render Mode",
                    options=["Smart_Auto", "Force_ReRender", "Lock_Cache"],
                    default="Smart_Auto",
                    tooltip="Smart_Auto: render only if dirty; Force_ReRender: always re-render; Lock_Cache: never re-render if cache exists.",
                ),
                io.String.Input(
                    "use_global_image_tags",
                    display_name="Global Image Tags",
                    default="",
                    tooltip="Comma-separated image tags from H3_GlobalMediaVault (e.g. 'hero, environment').",
                ),
                io.String.Input(
                    "use_global_audio_tags",
                    display_name="Global Audio Tags",
                    default="",
                    tooltip="Comma-separated audio tags from H3_GlobalMediaVault (e.g. 'voice_ref').",
                ),
                io.Boolean.Input(
                    "slice_from_master_audio",
                    display_name="Slice From Master Audio",
                    default=False,
                    tooltip="Automatically extract this clip's exact timeline window from the Vault's Master Timeline Audio.",
                ),
                io.Image.Input(
                    "local_ref_image",
                    display_name="Local Ref Image",
                    optional=True,
                    tooltip="Optional clip-specific reference image.",
                ),
                io.Audio.Input(
                    "local_ref_audio",
                    display_name="Local Ref Audio",
                    optional=True,
                    tooltip="Optional clip-specific reference audio.",
                ),
            ],
            outputs=[
                H3ProjectBusType.Output(
                    "project_bus",
                    display_name="Project Bus",
                    tooltip="Updated H3_PROJECT_BUS with this ClipSpec appended.",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        project_bus: dict[str, Any],
        prompt: str,
        duration_sec: float = 5.0,
        seed: int = 0,
        overlap_frames_N: int = 8,
        render_mode: str = "Smart_Auto",
        use_global_image_tags: str = "",
        use_global_audio_tags: str = "",
        slice_from_master_audio: bool = False,
        negative_prompt: str = "",
        local_ref_image: Optional[torch.Tensor] = None,
        local_ref_audio: Optional[dict[str, Any]] = None,
        clip_sampler_overrides: Optional[dict[str, Any]] = None,
    ) -> io.NodeOutput:
        bus = copy.deepcopy(project_bus)
        fps = int(bus["fps"])
        sr = int(bus["sample_rate"])
        width, height = int(bus["resolution"][0]), int(bus["resolution"][1])
        workspace = H3ProjectWorkspace(bus["project_name"], base_output_dir=bus.get("base_output_dir"))
        workspace.ensure_dirs()

        clip_index = len(bus["clips"]) + 1
        clip_id = f"clip_{clip_index:03d}"

        dur = max(0.5, min(15.0, float(duration_sec)))
        target_frames = max(2, int(round(dur * fps)))

        # Overlap validation & clamping per Section 6.3
        if clip_index == 1:
            effective_overlap = 0
        else:
            prev_target_frames = int(bus["clips"][-1]["target_frames"])
            effective_overlap, was_clamped = clamp_overlap_frames(
                prev_target_frames,
                target_frames,
                int(overlap_frames_N),
            )
            if was_clamped:
                warn_msg = (
                    f"[{clip_id}] Requested overlap_frames_N={overlap_frames_N} exceeded safe bounds "
                    f"(prev={prev_target_frames}f, cur={target_frames}f); clamped to {effective_overlap} frames."
                )
                logger.warning("[Duffy_H3_ClipCard] %s", warn_msg)
                bus.setdefault("warnings", []).append(warn_msg)

        img_tags = [t.strip() for t in (use_global_image_tags or "").split(",") if t.strip()]
        aud_tags = [t.strip() for t in (use_global_audio_tags or "").split(",") if t.strip()]

        # Resolve hashes of referenced global media so changing a vault image invalidates dependent clips
        global_img_hashes = bus["global_media"].get("image_hashes", {})
        global_aud_hashes = bus["global_media"].get("audio_hashes", {})
        resolved_img_tag_meta = [f"{t}:{global_img_hashes.get(t, 'MISSING')}" for t in img_tags]
        resolved_aud_tag_meta = [f"{t}:{global_aud_hashes.get(t, 'MISSING')}" for t in aud_tags]
        if slice_from_master_audio:
            resolved_aud_tag_meta.append(f"__master__:{bus['global_media'].get('master_audio_hash', 'NONE')}")

        local_img_path: Optional[str] = None
        local_img_hash = "NONE"
        if local_ref_image is not None:
            norm_img = normalize_image_to_canvas(local_ref_image[:1], width, height, crop="center")
            local_img_path, local_img_hash = workspace.cache_vault_image(f"{clip_id}_local", norm_img)

        local_aud_path: Optional[str] = None
        local_aud_hash = "NONE"
        if local_ref_audio is not None:
            norm_aud = normalize_audio_to_project(local_ref_audio, target_sr=sr, target_channels=2)
            local_aud_path, local_aud_hash = workspace.cache_vault_audio(f"{clip_id}_local", norm_aud)

        clip_spec: dict[str, Any] = {
            "clip_index": clip_index,
            "clip_id": clip_id,
            "prompt": str(prompt or ""),
            "negative_prompt": str(negative_prompt or ""),
            "duration_sec": dur,
            "target_frames": target_frames,
            "seed": int(seed),
            "overlap_frames_N": effective_overlap,
            "render_mode": str(render_mode),
            "global_image_tags": img_tags,
            "global_audio_tags": aud_tags,
            "slice_from_master_audio": bool(slice_from_master_audio),
            "local_ref_image_path": local_img_path,
            "local_ref_audio_path": local_aud_path,
            "local_ref_image_hash": f"{local_img_hash}|{'|'.join(resolved_img_tag_meta)}",
            "local_ref_audio_hash": f"{local_aud_hash}|{'|'.join(resolved_aud_tag_meta)}",
            "clip_sampler_overrides": clip_sampler_overrides,
        }
        clip_spec["config_hash"] = compute_clip_config_hash(
            clip_spec=clip_spec,
            fps=fps,
            resolution=(width, height),
            sample_rate=sr,
        )
        bus["clips"].append(clip_spec)
        return io.NodeOutput(bus)


class DuffyH3SamplerConfig(io.ComfyNode):
    """Companion sampler configuration node supporting both SelfLiftH3Sampler and Standard KSampler."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        samplers, schedulers = _get_comfy_samplers_and_schedulers()
        return io.Schema(
            node_id="Duffy_H3_SamplerConfig",
            display_name="H3 Sampler & SelfLift Config",
            category="Duffy/MiniMax-H3/Engine",
            description="Bundles SelfLift progressive-resolution sampling or standard KSampler settings for H3_ExecutionEngine.",
            search_aliases=["H3_SamplerConfig", "selflift config", "minimax sampler config"],
            inputs=[
                io.Combo.Input(
                    "sampler_mode",
                    display_name="Sampler Mode",
                    options=["SelfLift_Progressive", "Standard_KSampler"],
                    default="SelfLift_Progressive",
                    tooltip="Select SelfLift Progressive-Resolution Sampler or standard ComfyUI KSampler.",
                ),
                io.Int.Input(
                    "steps",
                    display_name="Steps",
                    default=8,
                    min=1,
                    max=100,
                    step=1,
                    tooltip="Total denoising steps (e.g., 8 for FastH3 + 4-step Turbo LoRA, 30 for base model).",
                ),
                io.Float.Input(
                    "cfg",
                    display_name="CFG",
                    default=1.0,
                    min=0.0,
                    max=100.0,
                    step=0.1,
                    tooltip="Classifier-Free Guidance scale (1.0 for Turbo LoRA).",
                ),
                io.Combo.Input(
                    "sampler_name",
                    display_name="Sampler Name",
                    options=samplers,
                    default="euler" if "euler" in samplers else samplers[0],
                    tooltip="Sampler algorithm (SelfLift requires 'euler').",
                ),
                io.Combo.Input(
                    "scheduler",
                    display_name="Scheduler",
                    options=schedulers,
                    default="beta" if "beta" in schedulers else schedulers[0],
                    tooltip="Noise schedule (e.g., 'beta').",
                ),
                io.Float.Input(
                    "denoise",
                    display_name="Denoise",
                    default=1.0,
                    min=0.01,
                    max=1.0,
                    step=0.01,
                    tooltip="Denoising strength.",
                ),
                io.Combo.Input(
                    "ref_image_size",
                    display_name="Ref Image Size",
                    options=["match", "max"],
                    default="match",
                    tooltip="MiniMax-H3 reference image sizing ('match' scales to generation area; 'max' uses 2048px short edge).",
                ),
                io.Int.Input(
                    "transition_step",
                    display_name="SelfLift Transition Step",
                    default=4,
                    min=1,
                    max=100,
                    step=1,
                    tooltip="Number of low-resolution denoiser evaluations in SelfLift.",
                ),
                io.Float.Input(
                    "lowres_scale",
                    display_name="SelfLift Lowres Scale",
                    default=0.4,
                    min=0.25,
                    max=1.0,
                    step=0.05,
                    tooltip="Spatial scale of the low-resolution prefix in SelfLift (e.g. 0.4).",
                ),
                io.Float.Input(
                    "rho",
                    display_name="SelfLift Rho",
                    default=0.0,
                    min=0.0,
                    max=1.0,
                    step=0.05,
                    tooltip="Fraction of highest-risk spatiotemporal locations corrected toward the pixel-VAE anchor.",
                ),
                io.Float.Input(
                    "w_min",
                    display_name="SelfLift w_min",
                    default=0.5,
                    min=0.0,
                    max=1.0,
                    step=0.05,
                    tooltip="Correction-strength floor.",
                ),
                io.Float.Input(
                    "w_max",
                    display_name="SelfLift w_max",
                    default=1.0,
                    min=0.0,
                    max=1.0,
                    step=0.05,
                    tooltip="Correction-strength ceiling.",
                ),
                io.String.Input(
                    "upscaler_model",
                    display_name="SelfLift Upscaler Model",
                    default="h3_upscaler_lms_v0.1_fp32.safetensors",
                    tooltip="Filename of external H3 latent upscaler in models/latent_upscale_models (or 'none').",
                ),
                io.Boolean.Input(
                    "highres_tiling",
                    display_name="Highres Tiling",
                    default=False,
                    tooltip="Enable automatic spatial tiling during the high-resolution stage.",
                ),
                io.Boolean.Input(
                    "upscaler_unload",
                    display_name="Unload Upscaler After Lift",
                    default=True,
                    tooltip="Unload the external H3 latent upscaler from VRAM immediately after the resolution lift.",
                ),
                io.Sampler.Input(
                    "sampler",
                    display_name="Custom Sampler",
                    optional=True,
                    tooltip="Optional upstream SAMPLER object (e.g. from KSamplerSelect).",
                ),
                io.Sigmas.Input(
                    "sigmas",
                    display_name="Custom Sigmas",
                    optional=True,
                    tooltip="Optional upstream SIGMAS tensor (e.g. from BasicScheduler).",
                ),
                io.Model.Input(
                    "model_hires",
                    display_name="High-Res Model Override",
                    optional=True,
                    tooltip="Optional separate MODEL used for the SelfLift high-resolution stage.",
                ),
            ],
            outputs=[
                H3SamplerConfigType.Output(
                    "sampler_config",
                    display_name="Sampler Config",
                    tooltip="Configured H3_SAMPLER_CONFIG dictionary for H3_ExecutionEngine.",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        sampler_mode: str = "SelfLift_Progressive",
        steps: int = 8,
        cfg: float = 1.0,
        sampler_name: str = "euler",
        scheduler: str = "beta",
        denoise: float = 1.0,
        ref_image_size: str = "match",
        transition_step: int = 4,
        lowres_scale: float = 0.4,
        rho: float = 0.0,
        w_min: float = 0.5,
        w_max: float = 1.0,
        upscaler_model: str = "h3_upscaler_lms_v0.1_fp32.safetensors",
        highres_tiling: bool = False,
        upscaler_unload: bool = True,
        sampler: Any = None,
        sigmas: Optional[torch.Tensor] = None,
        model_hires: Any = None,
    ) -> io.NodeOutput:
        cfg_dict: dict[str, Any] = {
            "sampler_mode": str(sampler_mode),
            "steps": int(steps),
            "cfg": float(cfg),
            "sampler_name": str(sampler_name),
            "scheduler": str(scheduler),
            "denoise": float(denoise),
            "ref_image_size": str(ref_image_size),
            "transition_step": int(transition_step),
            "lowres_scale": float(lowres_scale),
            "rho": float(rho),
            "w_min": float(w_min),
            "w_max": float(w_max),
            "upscaler_model": str(upscaler_model).strip() or "none",
            "highres_tiling": bool(highres_tiling),
            "upscaler_unload": bool(upscaler_unload),
            "sampler": sampler,
            "sigmas": sigmas,
            "model_hires": model_hires,
        }
        return io.NodeOutput(cfg_dict)


class DuffyH3ExecutionEngine(io.ComfyNode):
    """Node 3: Model-, Attention-, and LoRA-Agnostic Single-Sampler Execution Engine."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        samplers, schedulers = _get_comfy_samplers_and_schedulers()
        return io.Schema(
            node_id="Duffy_H3_ExecutionEngine",
            display_name="H3 Execution Engine",
            category="Duffy/MiniMax-H3/Engine",
            description="Evaluates dirty/cascade state across all storyboard clips and executes only uncached or invalidated clips on the upstream patched MiniMax-H3 model.",
            search_aliases=["H3_ExecutionEngine", "minimax execution engine", "h3 engine"],
            inputs=[
                H3ProjectBusType.Input(
                    "project_bus",
                    display_name="Project Bus",
                    tooltip="Complete H3_PROJECT_BUS from the final H3_ClipCard in the storyboard chain.",
                ),
                io.AnyType.Input(
                    "model_or_pipe",
                    display_name="Model or Pipe",
                    tooltip="Upstream patched MiniMax-H3 MODEL (with active Turbo LoRAs, SageAttention, BlockSparseAttention, etc.) or custom H3 pipeline.",
                ),
                io.Boolean.Input(
                    "cascade_rerender",
                    display_name="Cascade Re-Render",
                    default=False,
                    tooltip="When True, re-rendering Clip i automatically re-renders downstream clips (i+1, ...) that depend on its overlap tail frames.",
                ),
                io.Int.Input(
                    "steps",
                    display_name="Fallback Steps",
                    default=8,
                    min=1,
                    max=100,
                    step=1,
                    tooltip="Fallback denoising steps used when sampler_config is not connected.",
                ),
                io.Float.Input(
                    "cfg",
                    display_name="Fallback CFG",
                    default=1.0,
                    min=0.0,
                    max=100.0,
                    step=0.1,
                    tooltip="Fallback CFG scale used when sampler_config is not connected.",
                ),
                io.Combo.Input(
                    "sampler_name",
                    display_name="Fallback Sampler",
                    options=samplers,
                    default="euler" if "euler" in samplers else samplers[0],
                    tooltip="Fallback sampler algorithm used when sampler_config is not connected.",
                ),
                io.Combo.Input(
                    "scheduler",
                    display_name="Fallback Scheduler",
                    options=schedulers,
                    default="beta" if "beta" in schedulers else schedulers[0],
                    tooltip="Fallback scheduler used when sampler_config is not connected.",
                ),
                io.Combo.Input(
                    "ref_image_size",
                    display_name="Fallback Ref Image Size",
                    options=["match", "max"],
                    default="match",
                    tooltip="Fallback reference image sizing mode used when sampler_config is not connected.",
                ),
                io.AnyType.Input(
                    "sampler_config",
                    display_name="Sampler Config",
                    optional=True,
                    tooltip="Optional H3_SAMPLER_CONFIG from Duffy_H3_SamplerConfig (or custom dict).",
                ),
                io.Clip.Input(
                    "clip",
                    display_name="CLIP (Qwen3-VL minimax)",
                    optional=True,
                    tooltip="MiniMax-H3 CLIP text/vision encoder (required unless bundled in model_or_pipe).",
                ),
                io.Vae.Input(
                    "vae",
                    display_name="Video VAE",
                    optional=True,
                    tooltip="MiniMax-H3 Video VAE (required unless bundled in model_or_pipe).",
                ),
                io.Vae.Input(
                    "audio_vae",
                    display_name="Audio VAE",
                    optional=True,
                    tooltip="MiniMax-H3 Audio VAE (required unless bundled in model_or_pipe).",
                ),
            ],
            outputs=[
                H3ProjectBusType.Output(
                    "project_bus",
                    display_name="Project Bus",
                    tooltip="Updated H3_PROJECT_BUS synchronized with on-disk clip caches and manifest state.",
                ),
                io.String.Output(
                    "status_report",
                    display_name="Status Report",
                    tooltip="Multi-line execution summary detailing cached, rendered, and out-of-sync clips.",
                ),
            ],
        )

    @classmethod
    def validate_inputs(cls, input_types: dict = None, **kwargs) -> bool:
        """Skip default strict type checking on wildcard `model_or_pipe` and `sampler_config` inputs."""
        return True

    @classmethod
    def fingerprint_inputs(
        cls,
        project_bus: Optional[dict[str, Any]] = None,
        model_or_pipe: Any = None,
        cascade_rerender: bool = False,
        steps: int = 8,
        cfg: float = 1.0,
        sampler_name: str = "euler",
        scheduler: str = "beta",
        ref_image_size: str = "match",
        sampler_config: Any = None,
        clip: Any = None,
        vae: Any = None,
        audio_vae: Any = None,
    ) -> str:
        """Compute composite cache fingerprint per Section 6.2 of the PRD (never returns a bool).

        Deliberately excludes `model_or_pipe` object IDs unless a clip has `Force_ReRender`.
        """
        if not isinstance(project_bus, dict):
            return f"init_{time.time_ns()}"

        workspace = H3ProjectWorkspace(
            project_bus.get("project_name", "My_H3_Project"),
            base_output_dir=project_bus.get("base_output_dir"),
        )
        manifest_mtime = workspace.get_manifest_mtime()
        clips = project_bus.get("clips", [])
        clip_tokens = []
        has_force_rerender = False
        for c in clips:
            rmode = c.get("render_mode", "Smart_Auto")
            if rmode == "Force_ReRender":
                has_force_rerender = True
            clip_tokens.append(f"{c.get('clip_id')}:{c.get('config_hash')}:{rmode}:{c.get('overlap_frames_N')}")

        if has_force_rerender:
            # Force re-execution on every run when any clip has Force_ReRender active
            return hashlib.sha256(f"FORCE_{time.time_ns()}".encode("utf-8")).hexdigest()

        composite = f"mtime={manifest_mtime}|cascade={bool(cascade_rerender)}|clips={'|'.join(clip_tokens)}"
        return hashlib.sha256(composite.encode("utf-8")).hexdigest()

    @classmethod
    def execute(
        cls,
        project_bus: dict[str, Any],
        model_or_pipe: Any,
        cascade_rerender: bool = False,
        steps: int = 8,
        cfg: float = 1.0,
        sampler_name: str = "euler",
        scheduler: str = "beta",
        ref_image_size: str = "match",
        sampler_config: Optional[dict[str, Any]] = None,
        clip: Any = None,
        vae: Any = None,
        audio_vae: Any = None,
    ) -> io.NodeOutput:
        bus = copy.deepcopy(project_bus)
        workspace = H3ProjectWorkspace(bus["project_name"], base_output_dir=bus.get("base_output_dir"))
        workspace.ensure_dirs()

        fps = int(bus["fps"])
        sr = int(bus["sample_rate"])
        width, height = int(bus["resolution"][0]), int(bus["resolution"][1])
        clips: list[dict[str, Any]] = bus.get("clips", [])

        manifest = workspace.load_manifest()
        manifest["project_name"] = bus["project_name"]
        manifest["fps"] = fps
        manifest["sample_rate"] = sr
        manifest["resolution"] = [width, height]
        manifest.setdefault("clips", {})

        # Merge fallback widgets with optional sampler_config dictionary
        resolved_sampler_cfg: dict[str, Any] = {
            "sampler_mode": "SelfLift_Progressive",
            "steps": int(steps),
            "cfg": float(cfg),
            "sampler_name": str(sampler_name),
            "scheduler": str(scheduler),
            "denoise": 1.0,
            "ref_image_size": str(ref_image_size),
        }
        if isinstance(sampler_config, dict):
            resolved_sampler_cfg.update(sampler_config)
        if clip is not None:
            resolved_sampler_cfg["clip"] = clip
        if vae is not None:
            resolved_sampler_cfg["vae"] = vae
        if audio_vae is not None:
            resolved_sampler_cfg["audio_vae"] = audio_vae

        # Load master timeline audio once if any clip requests slice_from_master_audio
        master_waveform: Optional[torch.Tensor] = None
        master_audio_path = bus["global_media"].get("master_audio_path")
        if master_audio_path and os.path.isfile(master_audio_path):
            master_waveform, _ = load_wav_tensor(master_audio_path)

        report_lines: list[str] = [
            f"=== MiniMax-H3 Project: {bus['project_name']} ({width}x{height} @ {fps}fps, {sr}Hz) ===",
            f"Cascade Re-Render: {'ENABLED' if cascade_rerender else 'DISABLED'} | Total Clips: {len(clips)}",
        ]
        for w_msg in bus.get("warnings", []):
            report_lines.append(f"[WARNING] {w_msg}")

        pbar = None
        try:
            import comfy.utils  # type: ignore

            pbar = comfy.utils.ProgressBar(len(clips))
        except Exception:
            pbar = None

        total_clips = len(clips)
        for i, clip_spec in enumerate(clips):
            clip_id = clip_spec["clip_id"]
            clip_index = int(clip_spec["clip_index"])
            f_i = int(clip_spec["target_frames"])
            s_i = int(round((f_i / float(fps)) * sr))
            overlap_n = int(clip_spec["overlap_frames_N"]) if clip_index > 1 else 0
            next_overlap_n = int(clips[i + 1]["overlap_frames_N"]) if (i + 1) < total_clips else 0

            # Compute current tail hash of Clip (i-1) for overlap_n frames
            prev_tail_hash: Optional[str] = None
            if i > 0 and overlap_n > 0:
                prev_clip_id = clips[i - 1]["clip_id"]
                prev_tail_hash = workspace.compute_tail_hash(prev_clip_id, overlap_n)
                # Keep prev clip's manifest tail_frames_hash synchronized for this overlap window
                if prev_clip_id in manifest["clips"] and prev_tail_hash is not None:
                    manifest["clips"][prev_clip_id]["tail_frames_hash"] = prev_tail_hash

            is_dirty, reason, continuity_status = workspace.evaluate_clip_dirty_state(
                clip_spec=clip_spec,
                manifest=manifest,
                prev_tail_hash=prev_tail_hash,
                cascade_rerender=bool(cascade_rerender),
            )

            if not is_dirty:
                # Update continuity status in manifest if it transitioned to OUT_OF_SYNC
                entry = manifest["clips"][clip_id]
                entry["continuity_status"] = continuity_status
                workspace.save_manifest(manifest)

                if continuity_status == "OUT_OF_SYNC":
                    report_lines.append(
                        f"  • {clip_id} ({clip_spec['duration_sec']:.1f}s, {f_i}f, overlap={overlap_n}f): "
                        f"[CACHED] [Continuity Warning: Out of Sync] - {reason}"
                    )
                else:
                    report_lines.append(
                        f"  • {clip_id} ({clip_spec['duration_sec']:.1f}s, {f_i}f, overlap={overlap_n}f): "
                        f"[CACHED] [SYNCED] - {reason}"
                    )
                continue

            # Clip is dirty -> prepare continuation and reference payloads
            continuation_frames: Optional[torch.Tensor] = None
            continuation_audio: Optional[dict[str, Any]] = None
            if i > 0 and overlap_n > 0:
                prev_clip_id = clips[i - 1]["clip_id"]
                continuation_frames = workspace.load_clip_tail(prev_clip_id, overlap_n)
                prev_wave, prev_sr = workspace.load_clip_audio(prev_clip_id)
                s_n = max(1, int(round((overlap_n / float(fps)) * prev_sr)))
                tail_wave = prev_wave[..., -s_n:] if prev_wave.shape[-1] >= s_n else prev_wave
                continuation_audio = {"waveform": tail_wave, "sample_rate": prev_sr}

            # Resolve global & local reference media
            global_images_tensors: list[torch.Tensor] = []
            for tag in clip_spec.get("global_image_tags", []):
                img_path = bus["global_media"]["images"].get(tag)
                if img_path and os.path.isfile(img_path):
                    global_images_tensors.append(load_image_png(img_path))

            global_audios_dicts: list[dict[str, Any]] = []
            for tag in clip_spec.get("global_audio_tags", []):
                aud_path = bus["global_media"]["audio"].get(tag)
                if aud_path and os.path.isfile(aud_path):
                    w_t, w_sr = load_wav_tensor(aud_path)
                    global_audios_dicts.append({"waveform": w_t, "sample_rate": w_sr})

            # Master Timeline Audio Auto-Slicing per Section 4 (Node 3, Step 3)
            # F_start(i) = sum_{k=1}^{i-1} (F_k - N_{k+1})
            # Slice s_gen samples covering the aligned DiT frame window (align_h3_frame_count(f_i))
            # so MiniMaxH3AddGuide pins the full song window at frame_idx=0 for lip-sync;
            # execute_h3_clip trims the cached output back to exact s_i samples.
            master_audio_slice: Optional[dict[str, Any]] = None
            if clip_spec.get("slice_from_master_audio", False) and master_waveform is not None:
                f_start = 0
                for k in range(i):
                    f_k = int(clips[k]["target_frames"])
                    n_k_plus_1 = int(clips[k + 1]["overlap_frames_N"])
                    f_start += f_k - n_k_plus_1
                f_start = max(0, f_start)
                f_gen_i = align_h3_frame_count(f_i)
                s_gen_i = max(s_i, int(round((f_gen_i / float(fps)) * sr)))
                start_sample = int(round((f_start / float(fps)) * sr))
                end_sample = start_sample + s_gen_i
                max_avail = int(master_waveform.shape[-1])
                sliced = master_waveform[..., min(start_sample, max_avail) : min(end_sample, max_avail)]
                master_audio_slice = normalize_audio_to_project(
                    {"waveform": sliced, "sample_rate": sr},
                    target_sr=sr,
                    target_channels=2,
                    target_samples=s_gen_i,
                )

            local_img_tensor: Optional[torch.Tensor] = None
            if clip_spec.get("local_ref_image_path") and os.path.isfile(clip_spec["local_ref_image_path"]):
                local_img_tensor = load_image_png(clip_spec["local_ref_image_path"])

            local_aud_dict: Optional[dict[str, Any]] = None
            if clip_spec.get("local_ref_audio_path") and os.path.isfile(clip_spec["local_ref_audio_path"]):
                lw_t, lw_sr = load_wav_tensor(clip_spec["local_ref_audio_path"])
                local_aud_dict = {"waveform": lw_t, "sample_rate": lw_sr}

            clip_payload = {
                "clip_id": clip_id,
                "clip_index": clip_index,
                "prompt": clip_spec["prompt"],
                "negative_prompt": clip_spec.get("negative_prompt", ""),
                "num_frames": f_i,
                "fps": fps,
                "width": width,
                "height": height,
                "sample_rate": sr,
                "seed": clip_spec["seed"],
                "clip_sampler_overrides": clip_spec.get("clip_sampler_overrides"),
            }
            continuity_payload = {
                "continuation_frames": continuation_frames,
                "continuation_audio": continuation_audio,
                "overlap_frames_N": overlap_n,
            }
            media_refs = {
                "global_images": global_images_tensors,
                "global_audios": global_audios_dicts,
                "master_audio_slice": master_audio_slice,
                "local_image": local_img_tensor,
                "local_audio": local_aud_dict,
            }

            rendered_frames, rendered_audio = execute_h3_clip(
                model_or_pipe=model_or_pipe,
                sampler_config=resolved_sampler_cfg,
                clip_payload=clip_payload,
                continuity_payload=continuity_payload,
                media_refs=media_refs,
            )

            # Enforce canonical frame count F_i and sample count S_i
            rendered_frames = normalize_image_to_canvas(rendered_frames, width, height, crop="center")[:f_i]
            rendered_audio = normalize_audio_to_project(
                rendered_audio,
                target_sr=sr,
                target_channels=2,
                target_samples=s_i,
            )

            cache_meta = workspace.save_clip_cache(
                clip_id=clip_id,
                frames=rendered_frames,
                waveform=rendered_audio["waveform"],
                sample_rate=sr,
                max_tail_frames=max(64, next_overlap_n),
            )

            tail_hash_for_next = workspace.compute_tail_hash(
                clip_id,
                next_overlap_n if next_overlap_n > 0 else min(8, f_i),
            )

            manifest["clips"][clip_id] = {
                "config_hash": clip_spec["config_hash"],
                "input_tail_hash_used": prev_tail_hash if (i > 0 and overlap_n > 0) else None,
                "tail_frames_hash": tail_hash_for_next,
                "actual_frames": cache_meta["actual_frames"],
                "actual_audio_samples": cache_meta["actual_audio_samples"],
                "frame_cache_path": cache_meta["frame_cache_path"],
                "audio_cache_path": cache_meta["audio_cache_path"],
                "continuity_status": "SYNCED",
            }
            workspace.save_manifest(manifest)

            dit_grid_frames = align_h3_frame_count(f_i)
            report_lines.append(
                f"  • {clip_id} ({clip_spec['duration_sec']:.1f}s, {f_i}f [DiT {dit_grid_frames}f], overlap={overlap_n}f): "
                f"[RENDERED] [SYNCED] - {reason}"
            )

            if pbar is not None:
                try:
                    pbar.update_absolute(i + 1, total_clips)
                except Exception:
                    pass

        bus["manifest"] = manifest
        status_report = "\n".join(report_lines)
        return io.NodeOutput(bus, status_report)


class DuffyH3AVStitcher(io.ComfyNode):
    """Node 4: Synchronous A/V Stitcher, Master Preview/Export Muxer, and Project Finalizer."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_H3_AVStitcher",
            display_name="H3 Synchronous A/V Stitcher",
            category="Duffy/MiniMax-H3/Output",
            description="Stitches all cached variable-duration clips with frame-accurate video blending and sample-accurate equal-power audio crossfading, exports MP4/MOV, and optionally purges cache on finalization.",
            is_output_node=True,
            search_aliases=["H3_AVStitcher", "minimax stitcher", "h3 stitcher"],
            inputs=[
                H3ProjectBusType.Input(
                    "project_bus",
                    display_name="Project Bus",
                    tooltip="Executed H3_PROJECT_BUS from Duffy_H3_ExecutionEngine.",
                ),
                io.Combo.Input(
                    "visual_transition_mode",
                    display_name="Visual Transition Mode",
                    options=["Linear_Crossfade_Overlap", "Trim_Duplicate_Head", "Optical_Flow_Blend"],
                    default="Linear_Crossfade_Overlap",
                    tooltip="Video blending strategy across each N-frame overlap seam.",
                ),
                io.Combo.Input(
                    "audio_crossfade_curve",
                    display_name="Audio Crossfade Curve",
                    options=["Equal_Power_Cosine", "Linear", "Hard_Cut_At_Midpoint"],
                    default="Equal_Power_Cosine",
                    tooltip="Audio crossfading curve across each overlap window (plus 5ms micro-fade on hard cuts).",
                ),
                io.Combo.Input(
                    "export_format",
                    display_name="Export Format",
                    options=["mp4_h264_aac", "mp4_h265_aac", "mov_prores_pcm"],
                    default="mp4_h264_aac",
                    tooltip="Container and codec configuration for the stitched master video.",
                ),
                io.Boolean.Input(
                    "finalize_project",
                    display_name="Finalize Project (Purge Cache)",
                    default=False,
                    tooltip="When False, writes exports/preview_master.mp4 and keeps caches. When True, exports final master to ComfyUI output/ and deletes cache/ and vault/.",
                ),
            ],
            outputs=[
                io.Image.Output(
                    "images",
                    display_name="Stitched Images",
                    tooltip="Full stitched video tensor [Total_Frames, H, W, C].",
                ),
                io.Audio.Output(
                    "audio",
                    display_name="Stitched Audio",
                    tooltip="Synchronized stereo audio dict {'waveform': [1, 2, Total_Samples], 'sample_rate': int}.",
                ),
                io.String.Output(
                    "video_filepath",
                    display_name="Video Filepath",
                    tooltip="Absolute path to the exported master video file.",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        project_bus: dict[str, Any],
        visual_transition_mode: str = "Linear_Crossfade_Overlap",
        audio_crossfade_curve: str = "Equal_Power_Cosine",
        export_format: str = "mp4_h264_aac",
        finalize_project: bool = False,
    ) -> io.NodeOutput:
        workspace = H3ProjectWorkspace(
            project_bus["project_name"],
            base_output_dir=project_bus.get("base_output_dir"),
        )
        fps = int(project_bus["fps"])
        sr = int(project_bus["sample_rate"])
        width, height = int(project_bus["resolution"][0]), int(project_bus["resolution"][1])
        clips: list[dict[str, Any]] = project_bus.get("clips", [])

        if not clips:
            raise ValueError("Duffy_H3_AVStitcher received a project_bus with zero clips.")

        clip_records: list[dict[str, Any]] = []
        for idx, clip_spec in enumerate(clips):
            clip_id = clip_spec["clip_id"]
            if not workspace.has_valid_clip_cache(clip_id):
                raise RuntimeError(
                    f"Clip '{clip_id}' cache is missing on disk. Ensure Duffy_H3_ExecutionEngine ran before Duffy_H3_AVStitcher."
                )
            frames = workspace.load_clip_frames(clip_id)
            frames = normalize_image_to_canvas(frames, width, height, crop="center")
            waveform, loaded_sr = workspace.load_clip_audio(clip_id)
            norm_aud = normalize_audio_to_project(
                {"waveform": waveform, "sample_rate": loaded_sr},
                target_sr=sr,
                target_channels=2,
            )
            clip_records.append(
                {
                    "clip_id": clip_id,
                    "frames": frames,
                    "waveform": norm_aud["waveform"],
                    "target_frames": int(clip_spec["target_frames"]),
                    "overlap_frames_N": 0 if idx == 0 else int(clip_spec["overlap_frames_N"]),
                }
            )

        stitched_frames, stitched_audio = stitch_clip_sequence(
            clip_records=clip_records,
            fps=fps,
            sample_rate=sr,
            visual_transition_mode=str(visual_transition_mode),
            audio_crossfade_curve=str(audio_crossfade_curve),
        )

        ext = ".mov" if export_format == "mov_prores_pcm" else ".mp4"
        if finalize_project:
            base_out = project_bus.get("base_output_dir") or get_default_comfy_output_dir()
            timestamp = int(time.time())
            out_filename = f"{workspace.project_name}_final_{timestamp}{ext}"
            target_video_path = os.path.join(base_out, out_filename)
        else:
            workspace.ensure_dirs()
            target_video_path = os.path.join(workspace.exports_dir, f"preview_master{ext}")

        final_filepath = mux_av_to_container(
            frames=stitched_frames,
            waveform=stitched_audio["waveform"],
            fps=fps,
            sample_rate=sr,
            output_path=target_video_path,
            export_format=str(export_format),
        )

        if finalize_project:
            workspace.purge_project_caches()

        out_frames = stitched_frames.to(device=get_intermediate_device(), dtype=torch.float32)
        return io.NodeOutput(out_frames, stitched_audio, final_filepath)
