# Changelog

All notable changes to **Duffy Nodes** are documented here.
This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.9.0] — 2026-03-01

### Added

- **Load Image & Resize** node (`Duffy_LoadImageResize`, category `Duffy/Image`).
  - Combines ComfyUI's Load Image functionality with megapixel resizing in a single node.
  - V3 image upload via `io.Combo.Input` with `upload=io.UploadType.image`.
  - Target megapixel slider (0.01–16.0 MP) with dimensions snapped to multiples of 8.
  - Aspect ratio selector with 10 presets: original, 1:1, 4:3, 3:2, 16:9, 21:9, 3:4, 2:3, 9:16, 9:21.
  - Non-original aspect ratios center-crop the source image before resizing.
  - Five resampling methods: lanczos, bicubic, bilinear, nearest-exact, area.
  - Nine outputs: image, mask, width, height, original width, original height, filename, megapixels, aspect ratio string.
  - Alpha-channel extraction with inverted mask output (black = opaque).
  - V3 `fingerprint_inputs` (SHA-256 hash) for proper cache invalidation.
  - `validate_inputs` for file existence checking.
  - Vue-compatible JavaScript extension (`load_image_resize.js`) with on-node info panel displaying filename, source/output dimensions, aspect ratio, and megapixel count after execution.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.

## [0.8.0] — 2026-02-27

### Added

- **Empty Qwen-2512 Latent Image** node (`Duffy_EmptyQwenLatent`, category `Duffy/Latent`).
  - Creates an empty 16-channel latent tensor for the Qwen-Image-2512 model.
  - Dropdown of seven optimised resolution presets (1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3).
  - Size multiplier slider (1.0–2.0) with automatic snapping to 16 px alignment.
  - Outputs the latent plus computed width and height as integers.
  - Migrated from legacy V1 class to full V3 Schema implementation.
- **Latent Noise Blender** node (`Duffy_LatentNoiseBlender`, category `Duffy/Latent`).
  - Blends a base latent with a noise latent using a percentage slider (0–100).
  - Automatically resizes noise via bicubic interpolation when spatial dimensions differ.
  - Handles cross-device tensor mismatches transparently.
  - Migrated from legacy V1 class to full V3 Schema implementation.
- **Generate Noise (Flux 2 Klein)** node (`Duffy_Flux2KleinNoise`, category `Duffy/Latent`).
  - Generates parameterised noise for injection or as empty latents.
  - Supports Flux 2 Klein (128-channel, f16), SD3 (16-channel, f8), and SD1.5/SDXL (4-channel, f8).
  - Three tensor layouts: BCHW (images), BCTHW and BTCHW (video).
  - Deterministic seed, intensity multiplier, variance normalisation, and optional sigma-based scaling.
  - Migrated from legacy V1 class to full V3 Schema implementation.

## [0.7.0] — 2026-02-27

### Added

- **RGBA to RGB (Lossless)** node (`Duffy_RGBAtoRGB`, category `Duffy/Image`).
  - Converts RGBA images to RGB by discarding the alpha channel via zero-copy tensor slicing.
  - Passes through 3-channel RGB images unchanged; expands single-channel grayscale to pseudo-RGB.
  - Migrated from legacy V1 class to full V3 Schema implementation.
- **Megapixel Resize** node (`Duffy_MegapixelResize`, category `Duffy/Image`).
  - Resizes images to a target megapixel count (0.1–4.0 MP) while preserving aspect ratio.
  - Output dimensions snapped to multiples of 8 for VAE compatibility.
  - Supports five resampling methods: lanczos, bicubic, bilinear, nearest-exact, area.
  - Outputs the resized image plus its width and height as integers.
  - Migrated from legacy V1 class to full V3 Schema implementation.
- **Save Image with Sidecar TXT** node (`Duffy_SaveImageWithSidecar`, category `Duffy/IO`).
  - Saves images in PNG/JPG/WEBP format with a companion `.txt` file containing model details, prompts, and multi-pass sampling metadata.
  - Supports optional custom output directory, three sampling passes with sampler/scheduler/steps/seed fields.
  - Marked as `is_output_node=True` for partial graph execution.
  - Migrated from legacy V1 class to full V3 Schema implementation.
- **Directory Image Iterator** node (`Duffy_DirectoryImageIterator`, category `Duffy/Image`).
  - Loads a sorted slice of images from a directory and emits them as a list for downstream iteration.
  - Supports start index and image limit controls, mixed resolutions.
  - Uses `fingerprint_inputs` for smart cache invalidation based on file modification timestamps.
  - Migrated from legacy V1 class (`IS_CHANGED`, `OUTPUT_IS_LIST`) to V3 Schema with `fingerprint_inputs` and `is_output_list`.
- **Iterator Current Filename** node (`Duffy_IteratorCurrentFilename`, category `Duffy/Image`).
  - Helper node that strips file extensions from filename lists emitted by Directory Image Iterator.
  - Uses `is_input_list` and `is_output_list` for list-mode pass-through.
  - Migrated from legacy V1 class to full V3 Schema implementation.

## [0.6.0] — 2026-02-27

### Added

- **Integer Math** node (`Duffy_IntegerMath`, category `Duffy/Math`).
  - Two integer inputs (`A`, `B`) and a combo dropdown to select Add, Subtract, Multiply, or Divide.
  - Outputs the integer result. Division uses floor division; dividing by zero returns `0`.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
- **Float Math** node (`Duffy_FloatMath`, category `Duffy/Math`).
  - Two float inputs (`A`, `B`) and a combo dropdown to select Add, Subtract, Multiply, or Divide.
  - Outputs the float result. Dividing by zero returns `0.0`.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.

## [0.5.0] — 2026-02-26

### Added

- **Toggle Switch** node (`Duffy_ToggleSwitch`, category `Duffy/Routing`).
  - Five-channel signal router accepting any data type on each input port via a wildcard `io.Custom("*")` type.
  - Integer slider (1–5) selects which channel is routed to the single `Selected Signal` output.
  - Per-channel customizable text labels that dynamically update input port names.
  - V3 lazy evaluation via `check_lazy_status` — only the active upstream branch is computed; idle branches are pruned from the execution graph.
  - Vue-compatible JavaScript extension (`toggle_switch.js`) for dynamic label sync and custom node theming.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.

## [0.4.0] — 2026-02-26

### Added

- **Multi-Pass Sampling** node (`Duffy_MultiPassSampling`, category `Duffy/Sampling`).
  - Configures filename, filepath, three denoise values (0.0 – 1.0), and three step counts (1 – 100) for multi-pass sampling workflows.
  - All eight parameters exposed as individual typed outputs (`String`, `Float`, `Int`).
  - Vue-compatible JavaScript extension (`multi_pass_ui.js`) for custom node theming and automatic size calculation.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
  - Converted from legacy V1 class (INPUT_TYPES / RETURN_TYPES / FUNCTION) to Nodes 2.0 architecture.

## [0.3.0] — 2026-02-25

### Added

- **Five Float Sliders** node (`Duffy_FiveFloatSliders`, category `Duffy/Math`).
  - Provides five float sliders with a range of 0.0 to 1.0.
  - Includes five string inputs for custom labels.
  - Dynamically updates slider labels, output labels, and tooltips to match the custom labels via a Vue-compatible JavaScript extension.
- **Five Int Sliders** node (`Duffy_FiveIntSliders`, category `Duffy/Math`).
  - Provides five integer sliders with a range of 1 to 100.
  - Includes five string inputs for custom labels.
  - Dynamically updates slider labels, output labels, and tooltips to match the custom labels via a Vue-compatible JavaScript extension.

## [0.2.0] — 2026-02-25

### Added

- **LoRa Prompt Combiner** node (`Duffy_LoRaPromptCombiner`, category `Duffy/Text`).
  - Combines a LoRa trigger and a main prompt using a customizable separator.
  - Two multiline string inputs for `LoRa Trigger` and `Prompt`.
  - Customizable `Separator` string input with a comma `,` as the default.
  - Outputs the combined prompt string.

## [0.1.0] — 2026-02-24

### Added

- **Signal Selector** node (`Duffy_SignalSelector`, category `Duffy/Routing`).
  - Three-channel signal router accepting any data type on each input port via a wildcard `io.Custom("*")` type.
  - `active_input` integer slider (range 1 – 3) selects which channel is routed to the single `Selected Signal` output.
  - Per-channel customizable text labels (`Input 1`, `Input 2`, `Input 3`) displayed directly on the node.
  - V3 lazy evaluation via `check_lazy_status` — only the active upstream branch is computed; idle branches are pruned from the execution graph.
  - Full V3 Schema implementation (`comfy_api.latest.io`): stateless `@classmethod` design, declarative `define_schema`, and typed `io.NodeOutput` return.
- Project scaffolding following the ComfyUI Nodes 2.0 package layout:
  - `__init__.py` with async `comfy_entrypoint` and `ComfyExtension` registration.
  - `nodes/__init__.py` exposing `NODE_LIST` for clean extension loading.
  - `pyproject.toml` with Comfy Registry metadata (`PublisherId`, `DisplayName`).
  - `requirements.txt` declaring `torch>=2.1.0` and `numpy>=1.26.0`.
