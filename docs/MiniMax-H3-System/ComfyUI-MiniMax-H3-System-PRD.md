```markdown
# Product Requirements Document (PRD): MiniMax-H3 Multi-Clip Storyboard & A/V Stitching Suite

**Document Version:** 1.1  
**Target Platform:** ComfyUI (Nodes 2.0 / V3 API Compatible)  
**Target Repository:** Custom ComfyUI Node Pack (Existing Multi-Node Repository Integration)  
**Target Coding Agent:** Google Gemini Argon (Google Antigravity)  

---

## 1. Executive Summary & Objective

The objective of this sub-project is to design and implement a lightweight, deterministic, and beginner-friendly multi-clip video and audio generation pipeline for **MiniMax-H3** inside ComfyUI. 

MiniMax-H3 supports generating individual video clips up to a maximum duration of 15.0 seconds. However, users frequently need to create longer, cohesive videos composed of multiple variable-length clips (e.g., a 4-second intro, an 11.5-second dialogue shot, a 15-second action sequence) stitched together seamlessly. Existing community solutions (such as *Motion-Context* or *MiniMax-Director*) are overly bloated, rely on complex JSON scheduling, or duplicate massive sampler setups across the canvas.

This suite introduces a **Hybrid Storyboard & Single-Sampler Execution Architecture** consisting of four modular custom nodes. It decouples lightweight scene definition from heavy GPU execution, remains **100% agnostic to upstream model patches, attention mechanisms, and acceleration LoRAs**, enables non-destructive single-clip re-rendering via disk-backed state caching, provides an optional downstream cascade re-render toggle, maintains $N$-frame visual/acoustic continuity across variable-duration clips, and performs synchronous, phase-accurate Audio/Video (A/V) stitching before releasing temporary resources upon project finalization.

---

## 2. Core Functional Requirements

1. **Variable Clip Duration ($1.0\text{s}$ to $15.0\text{s}$):**
   * Each individual clip in a sequence must support a user-defined duration up to the 15.0-second ceiling (e.g., `1.0s` to `15.0s`, or explicit frame counts derived from project FPS).
   * Downstream overlap calculations, audio slicing, and timeline stitching must dynamically adapt to heterogeneous clip durations without assuming fixed 15-second blocks.
2. **100% Agnostic to Attention Mechanisms, LoRAs, and Sampler Modifiers:**
   * Different users run vastly different hardware and optimization stacks (e.g., **Turbo LoRA** at 4–8 steps vs. base model at 30 steps; **SageAttention**, **FlashAttention-2**, **SDPA**, or **XFormers**; **TeaCache**, **FP8/GGUF quantizations**, or custom scheduler overrides).
   * The node suite must **never** hardcode attention backends, override patched model weights, or enforce rigid sampler schemas. All model loading, LoRA patching, attention selection, and sampler configuration happen upstream using standard ComfyUI nodes and are passed into `H3_ExecutionEngine` as a pre-configured, black-box execution state.
   * Crucially, changing an upstream optimization setting (such as toggling SageAttention or adding a Turbo LoRA to speed up subsequent renders) must **not** invalidate the disk cache of already-rendered clips unless the user explicitly marks a clip for re-rendering.
3. **Hybrid Storyboard & Single-Sampler Execution Topology:**
   * Users define clips by chaining lightweight storyboard nodes (`H3_ClipCard`) left-to-right on the canvas.
   * Heavy generation is handled by a single downstream engine node (`H3_ExecutionEngine`) that loops strictly over uncached or invalidated clips, keeping peak VRAM usage identical to generating a single clip.
4. **Non-Destructive Single-Clip Re-Rendering & Persistent Caching:**
   * All rendered clips (uncompressed frames and raw audio waveforms) are stored in a dedicated project workspace on disk until the project is explicitly finalized.
   * Modifying a single clip (e.g., Clip 2 out of 5) must only trigger generation for Clip 2 without re-evaluating Clips 1, 4, or 5.
5. **Optional Cascade Re-Render Toggle:**
   * When Clip $i$ is re-rendered, its tail frames change, which invalidates the starting reference frames of Clip $i+1$.
   * **Cascade OFF (`False`):** Only Clip $i$ re-renders. Downstream clips load from cache and flag a non-blocking `[Continuity Warning: Out of Sync]` status so the user can preview Clip $i$ quickly.
   * **Cascade ON (`True`):** Re-rendering Clip $i$ automatically queues Clip $i+1, i+2, \dots$ for re-rendering up to the end of the chain (or up to the next clip configured as a `Hard Cut` where `overlap_frames_N == 0`).
6. **$N$-Frame Visual & Acoustic Continuity:**
   * Each clip $i$ ($i > 1$) can reference $N$ tail frames (and the corresponding tail audio slice of duration $N / \text{FPS}$) from clip $i-1$ to ensure smooth motion, lighting, and acoustic continuity.
7. **Global & Local Reference Media Accessibility:**
   * Users can register global reference assets (character images, environment images, master audio tracks) once in a central vault and reference them in any clip by key/tag, alongside clip-specific local reference images or audio.
8. **Synchronous A/V Stitching & Explicit Resource Release:**
   * Video overlaps ($N$ frames) and audio overlaps must be blended and trimmed synchronously so zero cumulative lip-sync drift occurs across variable-length clips.
   * Temporary cache files remain on disk throughout the active session and are only purged when the user triggers `finalize_project = True`.

---

## 3. System Architecture & Data Contracts

### 3.1 Visual Graph Topology (Upstream Agnostic Pattern)
```text
[Load MiniMax-H3] ──► [Optional: Turbo LoRA / SageAttention / TeaCache / Sampler Config]
                                                        │
                                           (Opaque Model / Execution Pipe)
                                                        ▼
[Global Media Vault] ──► [Clip 1 Card] ──► [Clip N Card] ──(PROJECT_BUS)──► [H3 Execution Engine] ──► [A/V Stitcher]

```

### 3.2 On-Disk Project Workspace Structure

Each project creates a persistent workspace inside ComfyUI's output or temp directory (`<comfy_output>/H3_Projects/<project_name>/`):

```text
<project_name>/
├── manifest.json                  # Project state, hashes, timeline metadata
├── vault/                         # Cached global reference assets
│   ├── ref_img_1_<hash>.png
│   └── ref_audio_1_<hash>.wav
├── cache/                         # Active clip cache (persists until finalized)
│   ├── clip_001_frames.safetensors # Uncompressed float16/uint8 tensor [F, H, W, C]
│   ├── clip_001_tail.safetensors   # Fast-access tail slice [N_max, H, W, C]
│   ├── clip_001_audio.wav          # 32-bit float PCM WAV [C, Samples]
│   └── ...
└── exports/
    ├── preview_master.mp4         # Rolling stitched preview
    └── final_master.mp4           # Final deliverable written on finalization

```

### 3.3 `PROJECT_BUS` Data Contract (Python Dict)

Passed along a single custom ComfyUI wire (`H3_PROJECT_BUS`) between nodes:

```python
H3ProjectBus = {
    "project_name": str,
    "project_dir": str,          # Absolute path to workspace
    "fps": int,                  # Project-wide frame rate (e.g., 24, 25, 30)
    "sample_rate": int,          # Project-wide audio sample rate (e.g., 44100, 48000)
    "resolution": tuple[int, int], # (width, height)
    "global_media": {
        "images": dict[str, str], # tag -> cached tensor/image path
        "audio": dict[str, str],  # tag -> cached wav path
        "master_audio_path": Optional[str] # Optional continuous master audio stem
    },
    "clips": list[ClipSpec]      # Ordered list of clip specifications
}

```

### 3.4 `ClipSpec` & `manifest.json` Schema

Each clip appended by an `H3_ClipCard` creates a `ClipSpec` entry. Note that `config_hash` is computed **strictly from clip-level creative parameters** (and intentionally excludes upstream attention/LoRA/accelerator states so switching to a faster attention mechanism or Turbo LoRA does not wipe out cached clips):

```python
ClipSpec = {
    "clip_index": int,           # 1-based sequential index determined by chain order
    "clip_id": str,              # e.g., "clip_001"
    "prompt": str,
    "negative_prompt": str,
    "duration_sec": float,       # Range: 0.5 to 15.0 seconds
    "target_frames": int,        # round(duration_sec * fps)
    "seed": int,
    "overlap_frames_N": int,     # Number of frames referenced from clip_(i-1); 0 for clip_001 or hard cut
    "render_mode": str,          # "Smart_Auto" | "Force_ReRender" | "Lock_Cache"
    "global_image_tags": list[str],
    "global_audio_tags": list[str],
    "local_ref_image_path": Optional[str],
    "local_ref_audio_path": Optional[str],
    "clip_sampler_overrides": Optional[dict], # Optional per-clip steps/cfg override if desired
    "config_hash": str,          # SHA-256 of (prompt, negative_prompt, duration_sec, fps, seed, refs, overlap_frames_N)
}

```

In `manifest.json`, each rendered clip stores:

* `config_hash`: The `config_hash` at the time of rendering.
* `input_tail_hash_used`: The `tail_frames_hash` of `clip_(i-1)` that was used as continuation input when `clip_i` was rendered (`null` if `clip_001` or `overlap_frames_N == 0`).
* `tail_frames_hash`: SHA-256 hash of the last $N_{\text{next}}$ frames produced by this clip.
* `actual_frames`: Integer count of frames generated.
* `actual_audio_samples`: Integer count of audio samples generated.
* `frame_cache_path`: Relative path to `.safetensors` frame tensor.
* `audio_cache_path`: Relative path to `.wav` file.
* `continuity_status`: `"SYNCED"` | `"OUT_OF_SYNC"` | `"DIRTY"`.

---

## 4. Detailed Node Specifications

### Node 1: `H3_GlobalMediaVault`

* **Category:** `MiniMax-H3/Project`
* **Purpose:** Initializes the project workspace, locks in project-wide timing constants (`fps`, `sample_rate`, `resolution`), and caches global reference media.
* **Inputs:**
* `project_name` (`STRING`, default `"My_H3_Project"`): Sanitized for filesystem safety.
* `fps` (`INT`, default `24`, min `12`, max `60`).
* `width` (`INT`, default `1280`, step `16`), `height` (`INT`, default `720`, step `16`).
* `audio_sample_rate` (`COMBO`: `[44100, 48000]`, default `48000`).
* `ref_image_1` to `ref_image_4` (Optional `IMAGE`), paired with `ref_image_tag_1..4` (`STRING`, e.g., `"hero"`, `"car"`, `"style"`).
* `ref_audio_1` to `ref_audio_2` (Optional `AUDIO`), paired with `ref_audio_tag_1..2` (`STRING`, e.g., `"voice_ref"`, `"ambience"`).
* `master_timeline_audio` (Optional `AUDIO`): Continuous audio track (e.g., a song or full narration) that can be automatically time-sliced per clip based on cumulative clip durations.


* **Outputs:**
* `project_bus` (`H3_PROJECT_BUS`).



---

### Node 2: `H3_ClipCard`

* **Category:** `MiniMax-H3/Storyboard`
* **Purpose:** Lightweight, chainable scene definition card. Users place as many cards as needed and wire them sequentially.
* **Inputs:**
* `project_bus` (`H3_PROJECT_BUS`, required).
* `prompt` (`STRING`, multiline, required).
* `negative_prompt` (`STRING`, multiline, optional, default `""`).
* `duration_sec` (`FLOAT`, default `5.0`, min `1.0`, max `15.0`, step `0.1`): Variable clip duration.
* `seed` (`INT`, default `0`, min `0`, max `0xffffffffffffffff`).
* `overlap_frames_N` (`INT`, default `8`, min `0`, max `64`): Frames pulled from the end of the previous clip. Forced to `0` automatically if this card is the first clip in the chain.
* `render_mode` (`COMBO`: `["Smart_Auto", "Force_ReRender", "Lock_Cache"]`).
* `Smart_Auto`: Renders if cache is missing or `config_hash` changed; also renders if `cascade_rerender` is enabled downstream and upstream tail frames changed.
* `Force_ReRender`: Always re-renders on the next run.
* `Lock_Cache`: Never re-renders if a valid cache file exists on disk, even if prompt/seed or upstream tail frames changed.


* `use_global_image_tags` (`STRING`, default `""`, comma-separated tags matching `H3_GlobalMediaVault`).
* `use_global_audio_tags` (`STRING`, default `""`, comma-separated tags).
* `slice_from_master_audio` (`BOOLEAN`, default `False`): If `True` and `master_timeline_audio` exists in the vault, automatically extracts this clip's exact time window from the master audio track as the clip's audio reference.
* `local_ref_image` (Optional `IMAGE`).
* `local_ref_audio` (Optional `AUDIO`).


* **Outputs:**
* `project_bus` (`H3_PROJECT_BUS` with this clip appended).



---

### Node 3: `H3_ExecutionEngine` (Model-, Attention-, and LoRA-Agnostic Core)

* **Category:** `MiniMax-H3/Engine`
* **Purpose:** Receives the complete `project_bus` and whatever pre-configured MiniMax-H3 model/sampler objects the user has constructed upstream, determines the dirty/cascade execution plan, and invokes the backend adapter sequentially for required clips only.
* **Inputs:**
* `project_bus` (`H3_PROJECT_BUS`, required).
* `model_or_pipe` (`*` Any/Wildcard type or repository-specific `MODEL` / `H3_PIPE`): Accepts the already-loaded, already-patched MiniMax-H3 model or pipeline object directly from upstream nodes (carrying any applied Turbo LoRAs, GGUF/FP8 quantizations, SageAttention/FlashAttention patches, or TeaCache hooks transparently).
* `sampler_config` (Optional `*` / `H3_SAMPLER_CONFIG` / kwargs bundle): Allows users to either wire in an upstream sampler configuration node OR use lightweight fallback widgets on the engine (`steps`, `cfg`, `scheduler`) that seamlessly adapt whether the user is running a 4-step Turbo LoRA (`steps=4, cfg=1.0`) or a 30-step standard run (`steps=30, cfg=6.0`).
* `vae` / `text_encoder` / `audio_encoder` (Optional `*` inputs, only required if not already bundled inside `model_or_pipe` by the repository's existing MiniMax-H3 loader).
* `cascade_rerender` (`BOOLEAN`, default `False`): Controls whether upstream tail changes trigger automatic re-rendering of downstream clips.


* **Upstream Agnostic Guarantees:**
1. **Zero Interference with Model Patches:** `H3_ExecutionEngine` never re-instantiates the model or resets `torch.nn.functional.scaled_dot_product_attention` / SageAttention / XFormers hooks. If the incoming `model_or_pipe` is a ComfyUI `ModelPatcher` or custom H3 wrapper with active LoRAs (such as Turbo LoRA) and attention overrides, the Engine passes that exact object reference into the adapter untouched.
2. **Decoupled Cache Hashing:** Changing upstream acceleration settings (e.g., switching from SDPA to SageAttention, or attaching a Turbo LoRA to render Clips 3 and 4 faster) does **not** alter `ClipSpec.config_hash`. Already-rendered Clips 1 and 2 remain safely cached unless the user switches their `render_mode` to `Force_ReRender`.


* **Execution State Machine (Per Clip $i$ in $1 \dots M$):**
1. **Calculate Target Frame & Sample Counts:**
* $F_i = \text{round}(\text{duration\_sec}_i \times \text{fps})$
* $S_i = \text{round}\left(\frac{F_i}{\text{fps}} \times \text{sample\_rate}\right)$
* Using $\frac{F_i}{\text{fps}}$ as the canonical clip duration guarantees an integer number of frames and prevents fractional frame rounding drift across clips of arbitrary durations (e.g., `3.7s`, `11.2s`, `15.0s`).


2. **Evaluate Dirty State:**
* Check if `cache/clip_{i}_frames.safetensors` and `cache/clip_{i}_audio.wav` exist.
* `is_dirty = False`
* If cache files missing $\rightarrow$ `is_dirty = True`
* Else if `render_mode == "Lock_Cache"` $\rightarrow$ `is_dirty = False`
* Else if `render_mode == "Force_ReRender"` $\rightarrow$ `is_dirty = True`
* Else if `clip.config_hash != manifest[clip_id].config_hash` $\rightarrow$ `is_dirty = True`
* Else if `i > 1` and `clip.overlap_frames_N > 0` and `manifest[clip_id].input_tail_hash_used != manifest[clip_{i-1}].tail_frames_hash`:
* If `cascade_rerender == True` $\rightarrow$ `is_dirty = True`
* If `cascade_rerender == False` $\rightarrow$ `is_dirty = False`, mark `manifest[clip_id].continuity_status = "OUT_OF_SYNC"`.




3. **Prepare Conditioning & Continuity Payload (If `is_dirty == True`):**
* **Continuation Frames & Audio:** If $i > 1$ and $N = \text{overlap\_frames\_N} > 0$:
* Load the last $N$ frames from `clip_{i-1}`: `tail_frames = prev_frames[-N:]` (shape `[N, H, W, C]`).
* Load the last $S_N$ audio samples from `clip_{i-1}` where $S_N = \text{round}\left(\frac{N}{\text{fps}} \times \text{sample\_rate}\right)$.


* **Master Audio Time-Slicing (If `slice_from_master_audio == True`):**
* Compute exact timeline start frame of Clip $i$:

$$F_{\text{start}}(i) = \sum_{k=1}^{i-1} \left(F_k - N_{k+1}\right)$$



*(where $N_{k+1}$ is the overlap frames of clip $k+1$)*.
* Slice master audio from sample $\text{round}\left(\frac{F_{\text{start}}(i)}{\text{fps}} \times \text{SR}\right)$ for $S_i$ samples.


* **Invoke Agnostic MiniMax-H3 Adapter:** Pass the opaque `model_or_pipe` and `sampler_config` alongside the resolved per-clip payload `(prompt, F_i, seed, tail_frames, tail_audio, resolved_global_refs, local_refs)`.
* **Write to Cache:** Save output frames to `cache/clip_{i}_frames.safetensors`, save audio to `cache/clip_{i}_audio.wav`, compute new `tail_frames_hash`, and update `manifest.json` immediately (crash-resilient per clip).
* Free per-clip intermediate conditioning/latent tensors (`gc.collect()`, `comfy.model_management.soft_empty_cache()`) without unloading the user's patched model or resetting attention state before advancing to Clip $i+1$.




* **Outputs:**
* `project_bus` (`H3_PROJECT_BUS` updated with execution results and manifest state).
* `status_report` (`STRING`: Multi-line human-readable summary of which clips were cached, rendered, or flagged as out-of-sync).



---

### Node 4: `H3_AVStitcher`

* **Category:** `MiniMax-H3/Output`
* **Purpose:** Assembles all variable-length cached clips in sequential order, executes frame-accurate visual blending and sample-accurate audio crossfading across every $N$-frame overlap seam, outputs the master preview/export, and handles resource cleanup upon project completion.
* **Inputs:**
* `project_bus` (`H3_PROJECT_BUS`, required).
* `visual_transition_mode` (`COMBO`: `["Linear_Crossfade_Overlap", "Trim_Duplicate_Head", "Optical_Flow_Blend"]`, default `"Linear_Crossfade_Overlap"`).
* `audio_crossfade_curve` (`COMBO`: `["Equal_Power_Cosine", "Linear", "Hard_Cut_At_Midpoint"]`, default `"Equal_Power_Cosine"`).
* `export_format` (`COMBO`: `["mp4_h264_aac", "mp4_h265_aac", "mov_prores_pcm"]`, default `"mp4_h264_aac"`).
* `finalize_project` (`BOOLEAN`, default `False`):
* When `False`: Writes rolling preview to `<project_dir>/exports/preview_master.mp4` and preserves all cache files in `<project_dir>/cache/` and `<project_dir>/vault/`.
* When `True`: Writes final deliverable to ComfyUI's main output folder (`output/<project_name>_final_<timestamp>.mp4`), then deletes `<project_dir>/cache/` and `<project_dir>/vault/` to release disk resources.




* **Outputs:**
* `images` (`IMAGE`: Full stitched tensor `[Total_Frames, H, W, C]`).
* `audio` (`AUDIO`: ComfyUI standard audio dict `{"waveform": Tensor[1, C, Total_Samples], "sample_rate": int}`).
* `video_filepath` (`STRING`: Absolute path to the compiled `.mp4`/`.mov` file).



---

## 5. Mathematical Specification for Synchronous A/V Stitching

Because each clip $i$ can have an arbitrary duration $D_i \in [1.0, 15.0]$ seconds and an arbitrary overlap $N_i \in [0, 64]$ frames (providing $N_i < F_{i-1}$ and $N_i < F_i$), the stitcher must maintain strict lockstep between frame indices and audio sample indices.

### 5.1 Video Seam Blending (For Clip $i$ with Overlap $N_i > 0$)

Let $A$ be the accumulated master frame tensor (ending with the frames of Clip $i-1$, length $L_A$) and $B$ be the newly loaded frame tensor of Clip $i$ (length $F_i$).

* **Non-Overlapping Prefix of $A$:** $A[0 : L_A - N_i]$
* **Overlap Zone ($k \in \{0, 1, \dots, N_i - 1\}$):**
* If `visual_transition_mode == "Linear_Crossfade_Overlap"`:

$$\alpha_k = \frac{k + 1}{N_i + 1}$$


$$\text{Overlap}[k] = (1 - \alpha_k) \cdot A[L_A - N_i + k] + \alpha_k \cdot B[k]$$


* If `visual_transition_mode == "Trim_Duplicate_Head"`:

$$\text{Overlap} = A[L_A - N_i : L_A] \quad (\text{discards } B[0 : N_i])$$




* **Non-Overlapping Suffix of $B$:** $B[N_i : F_i]$
* **New Master Frame Tensor:**

$$A_{\text{new}} = \text{concat}\left(A[0 : L_A - N_i], \text{Overlap}, B[N_i : F_i]\right)$$



The net frame count added by Clip $i$ is exactly $F_i - N_i$ frames.

### 5.2 Audio Seam Crossfading (Zero-Drift Guarantee)

To prevent cumulative fractional sample rounding errors across 10+ variable-length clips:

1. For every clip $i$, its canonical audio sample length is normalized before stitching to:

$$S_i = \text{round}\left(\frac{F_i}{\text{fps}} \times \text{SR}\right)$$



If the raw audio returned by MiniMax-H3 is slightly shorter or longer by a few samples, pad with silence or trim to exactly $S_i$.
2. The overlap sample window for $N_i$ frames is:

$$S_{\text{overlap}, i} = \text{round}\left(\frac{N_i}{\text{fps}} \times \text{SR}\right)$$


3. **Equal-Power Cosine Crossfade Across $S_{\text{overlap}, i}$ Samples:**
For sample index $m \in \{0, 1, \dots, S_{\text{overlap}, i} - 1\}$, define phase $t_m = \frac{m}{S_{\text{overlap}, i} - 1} \in [0, 1]$:

$$g_{\text{out}}(m) = \cos\left(t_m \cdot \frac{\pi}{2}\right), \quad g_{\text{in}}(m) = \sin\left(t_m \cdot \frac{\pi}{2}\right)$$


$$\text{Audio}_{\text{overlap}}[m] = g_{\text{out}}(m) \cdot \text{Audio}_A[L_{S,A} - S_{\text{overlap}, i} + m] + g_{\text{in}}(m) \cdot \text{Audio}_B[m]$$


4. If $N_i == 0$ (Hard Cut), apply a micro-fade ($5\text{ms}$ linear fade-out/fade-in at the boundary without shortening duration) to prevent zero-crossing audio clicks.

---

## 6. Agnostic Backend Adapter & ComfyUI Integration Rules

### 6.1 The Black-Box Execution Adapter (`h3_backend_adapter.py`)

To guarantee 100% compatibility with any attention mechanism (SageAttention, FlashAttention-2, SDPA, XFormers), any LoRA (such as Turbo LoRA), and any temporal cache modifier (such as TeaCache):

1. **Inspection Before Implementation:**
* The coding agent must first inspect how MiniMax-H3 is currently invoked in the user's ComfyUI environment / repository (e.g., whether it uses a native `comfy.model_patcher.ModelPatcher` + `KSampler` flow or a custom pipeline wrapper class).


2. **Pass-Through Execution Contract:**
* `h3_backend_adapter.py` must implement an adapter class/function that accepts the upstream `model_or_pipe` and `sampler_config` as opaque objects and delegates execution directly to the underlying sampler/pipeline callable without mutating model weights, attention flags, or LoRA hooks:
```python
def execute_h3_clip(
    model_or_pipe: Any,              # Opaque upstream model/pipe (with active LoRAs, attention backend, TeaCache, etc.)
    sampler_config: dict[str, Any],  # Upstream steps, cfg, sampler_name, scheduler, denoise, or custom kwargs
    clip_payload: dict[str, Any],    # {prompt, negative_prompt, num_frames, fps, width, height, seed, ...}
    continuity_payload: dict[str, Any], # {continuation_frames: Optional[Tensor], continuation_audio: Optional[dict]}
    media_refs: dict[str, Any],      # {global_images, global_audios, local_image, local_audio}
    progress_callback: Optional[Callable] = None
) -> tuple[torch.Tensor, dict]:

```




3. **Stateful Accelerator Reset Between Clips (TeaCache / KV-Cache Safety):**
* Certain acceleration mechanisms (such as TeaCache or custom temporal KV-caches) store step-to-step residual states inside the model object during a single clip's denoising loop.
* When `H3_ExecutionEngine` loops from Clip $i$ to Clip $i+1$, `h3_backend_adapter.py` must ensure that any *per-generation* temporal step counter on the model object is cleanly reset at the start of Clip $i+1$'s denoising loop (exactly as ComfyUI's `model_patcher.pre_run()` / `cleanup()` lifecycle does), while preserving all persistent LoRA weights and attention backend bindings.



### 6.2 `IS_CHANGED` & Cache Invalidation Protocol

* `H3_ClipCard` computes `config_hash` deterministically from its creative inputs. For `IMAGE` and `AUDIO` tensor inputs (`local_ref_image`, `local_ref_audio`), compute a fast tensor digest (`hashlib.sha256` over tensor shape, dtype, mean, std, and a strided 4KB byte sample) so ComfyUI does not re-hash multi-megabyte arrays slowly on every tick.
* `H3_ExecutionEngine.IS_CHANGED` returns a composite hash of `manifest.json` mtime + all incoming `ClipSpec.config_hash` values + `cascade_rerender` state + any `Force_ReRender` flags. It purposefully ignores upstream model/LoRA object IDs unless a clip is dirty or forced to re-render.

### 6.3 Edge-Case Validation & Error Handling

* **Variable Duration vs. Overlap Guard:** If a user sets a short clip duration (e.g., `1.0s` at `24 fps` = `24 frames`) and sets `overlap_frames_N = 30`, automatically clamp $N_i \le \min(F_{i-1} - 1, F_i - 1)$ and log a clear warning to the console and `status_report`.
* **Resolution & Channel Mismatch Guard:** Automatically resize (`bilinear`/`lanczos`) and letterbox/crop any incoming reference images or mismatched cached frames to the Vault's canonical `(width, height)`, and resample any incoming reference audio to the Vault's canonical `audio_sample_rate` and stereo channel layout (`2 channels`) using `torchaudio.functional.resample`.

---

## 7. Deliverables Requested from Coding Agent (Google Gemini Argon)

Please analyze the existing ComfyUI custom node repository structure and generate a detailed **Implementation Plan** followed by the modular implementation covering:

1. **Repository & MiniMax-H3 Inspection Plan:**
* Inspect existing node conventions in the repository (ComfyUI Nodes 2.0 / V3 API schema definitions, directory layout, shared utilities, and registration in `__init__.py`).
* Identify the exact upstream MiniMax-H3 model/pipe/sampler data types so `H3_ExecutionEngine` and `h3_backend_adapter.py` wire seamlessly into existing workflows regardless of whether the user attaches Turbo LoRAs, SageAttention, or custom schedulers upstream.


2. **Module Breakdown:**
* `h3_project_manager.py`: Workspace directory creation, `manifest.json` atomic read/write, fast tensor hashing, and resource cleanup (`finalize_project`).
* `h3_backend_adapter.py`: Model-, LoRA-, and attention-agnostic execution wrapper, per-clip `pre_run()`/`cleanup()` temporal cache reset, plus a fallback Mock mode for rapid dry-run pipeline testing.
* `h3_av_stitcher_core.py`: PyTorch tensor video blending (`Linear_Crossfade_Overlap`, `Trim_Duplicate_Head`, `Optical_Flow_Blend`), sample-accurate equal-power audio crossfading, and `ffmpeg` / `torchaudio` muxing.
* `nodes_h3_storyboard.py`: The 4 ComfyUI custom node classes (`H3_GlobalMediaVault`, `H3_ClipCard`, `H3_ExecutionEngine`, `H3_AVStitcher`).


3. **Verification & Test Suite:**
* Unit test script verifying variable-duration clip chains (e.g., `3.5s` -> `15.0s` -> `6.2s`), single-clip re-render hash isolation when upstream sampler/LoRA settings change, `cascade_rerender` toggle behavior, zero A/V drift across overlaps, and disk cache deletion on finalization.
