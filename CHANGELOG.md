# Changelog

All notable changes to **Duffy Nodes** are documented here.
This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.19.0] — 2026-03-07

### Added

- **Find and Replace Text** node (`Duffy_FindAndReplaceText`, category `Duffy/Text`).
  - Performs literal find-and-replace on single-line and multiline string inputs.
  - Replaces all matches across the full input string.
  - Supports both case-sensitive and case-insensitive matching via a boolean toggle.
  - Accepts direct text entry or connected string input from upstream nodes.
  - Empty `find_text` is handled deterministically by returning the input unchanged.
  - `fingerprint_inputs` tracks source text, search text, replacement text, and case sensitivity for correct cache invalidation.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.

---

## [0.18.0] — 2026-03-06

### Added

- **Connected Image Stitch** node (`Duffy_ConnectedImageStitch`, category `Duffy/Image`).
  - Connection-based variant of Image Stitch — accepts up to 9 optional image inputs via node connections instead of file uploads.
  - Three orientation modes: **Horizontal** (scales to tallest height), **Vertical** (center-crops to narrowest width), and **Layout** (3×3 grid with custom mapping).
  - Interactive 3×3 layout mapping grid (visible only in Layout mode) with per-cell dropdown to assign any input (Image 1–9 or None) to any grid position.
  - "Reset to Default (1–9)" button to restore the identity mapping.
  - Graceful handling of unconnected inputs: if a grid cell references an input that isn't wired, the cell is treated as empty (filled with black).
  - Reuses all stitching functions from Image Stitch (`_stitch_horizontal`, `_stitch_vertical`, `_stitch_layout`) — no code duplication.
  - Custom orientation toggle widget (→ Horizontal / ↓ Vertical / ⊞ Layout) with Duffy node theming.
  - Node auto-resizes when toggling between modes to accommodate or hide the layout grid.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
  - Companion JavaScript extension (`connected_image_stitch.js`) with Vue-compatible Nodes 2.0 architecture, event isolation, and dynamic DOM widget sizing.

---

## [0.17.0] — 2026-03-06

### Added

- **JSON Format String** node (`Duffy_JsonFormatString`, category `Duffy/utilities`).
  - Parses a raw JSON string and outputs a well-formatted multiline representation.
  - Two format modes: **Pretty JSON** (standard indented JSON with configurable indent size 1–8) and **Readable Text** (human-friendly labeled sections with nested indentation, underscored keys converted to title case).
  - Accepts input by direct paste or by connecting from another string node (e.g. Primitive String Multiline).
  - Graceful error handling: invalid JSON returns a descriptive `[JSON Parse Error]` message instead of raising an exception.
  - `fingerprint_inputs` for proper cache invalidation based on input text, format mode, and indent size.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.

---

## [0.16.0] — 2026-03-05

### Added

- **Image Stitch** node (`Duffy_ImageStitch`, category `Duffy/Image`).
  - Upload up to 9 images via an interactive 3×3 grid and stitch them into a single output image.
  - Two orientation modes: **Horizontal** (scales all images to the tallest height, preserving aspect ratios, concatenated left-to-right) and **Vertical** (center-crops all images to the narrowest width, stacked top-to-bottom).
  - 9 optional `io.Combo.Input` slots with `upload=io.UploadType.image` — uses ComfyUI's native image upload mechanism for full workflow serialization compatibility.
  - Interactive 3×3 grid frontend with numbered badge labels ("Image 1"–"Image 9") that remain visible over thumbnails.
  - Per-slot image upload via file picker, thumbnail preview loaded from ComfyUI's `/view` endpoint.
  - HTML5 drag-and-drop reordering: swap images between any two grid cells by dragging.
  - Per-slot clear button (×) to remove individual images.
  - Custom orientation toggle widget (→ Horizontal / ↓ Vertical) synced to hidden combo input.
  - All combo widgets hidden in favor of the custom DOM grid interface.
  - Image resizing via `comfy.utils.common_upscale` with Lanczos interpolation for high-quality stitching.
  - Empty state returns a 64×64 black placeholder to prevent pipeline errors.
  - `fingerprint_inputs` (SHA-256 hash of all image files + orientation) for proper cache invalidation.
  - `validate_inputs` for file existence checking on all non-empty slots.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
  - Companion JavaScript extension (`image_stitch.js`) with Vue-compatible Nodes 2.0 architecture, event isolation (`pointerdown`/`wheel` stopPropagation), and Duffy node theming.

---

## [0.15.0] — 2026-03-04

### Added

- **Seed** node (`Duffy_Seed`, category `Duffy/utilities`).
  - Advanced seed management node with randomize, increment, decrement, and fixed modes.
  - Integer seed input with full range (±1,125,899,906,842,624) and a single `SEED` (INT) output.
  - Three dedicated UI buttons: "🎲 Randomize Each Time" (sets seed to -1), "🎲 New Fixed Random" (immediate random), "♻️ Use Last Queued Seed" (restore last used value).
  - Frontend prompt interception: hooks into `api.queuePrompt` to replace special seed values (-1 random, -2 increment, -3 decrement) in both serialized output and workflow metadata before server submission.
  - Dedicated random state isolated from the global Python/JS random state to prevent interference with other extensions.
  - Server-side API fallback: if special seeds arrive without frontend interception (e.g. direct API calls), the backend generates a random seed and persists it to workflow and prompt metadata via hidden inputs (`UNIQUE_ID`, `PROMPT`, `EXTRA_PNGINFO`).
  - `fingerprint_inputs` forces re-execution when special seed values are used (V3 equivalent of `IS_CHANGED`).
  - Removes the default ComfyUI `control_after_generate` dropdown widget in favor of the dedicated button interface.
  - Context menu with quick actions (randomize, fixed random, use last seed) and toggleable "Show/Hide Last Seed Display" read-only text widget.
  - Custom node theming (gold/brown colour scheme) applied via `nodeCreated` lifecycle hook.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
  - Companion JavaScript extension (`seed.js`) with Vue-compatible Nodes 2.0 architecture.

---

## [0.14.0] — 2026-03-03

### Added

- **Advanced Folder Image Selector** node (`DuffyAdvancedFolderImageSelector`, category `Duffy/Image/Selection`).
  - Interactive thumbnail browser for selecting up to 5 images from a directory.
  - Paginated 3×3 grid display with Base64-encoded thumbnail previews.
  - Two sorting modes: by filename (alphabetical) and by creation date (newest first).
  - Visual selection indicators with numbered badges showing selection order.
  - Persistent state management through hidden widget — selections survive workflow reloads.
  - Async API endpoint (`/advanced_selector/refresh_folder`) for non-blocking thumbnail generation.
  - Security features: path traversal protection, permission error handling, and file type validation.
  - Five discrete image tensor outputs (`image_1` through `image_5`) for downstream processing.
  - Empty tensor fallbacks (64×64 transparent) for unselected slots to prevent pipeline errors.
  - Auto-refresh on node creation if folder path is already set.
  - Custom DOM widget integration using Nodes 2.0 architecture with proper event isolation.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
  - Companion JavaScript extension (`advanced_folder_image_selector.js`) with Vue-compatible DOM injection.

---

## [0.13.0] — 2026-03-02

### Added

- **Triple Sampler & Scheduler Selector** node (`Duffy_TripleSamplerScheduler`, category `Duffy/Sampling`).
  - Centralized routing node for advanced workflow generation and comparative sampler analysis.
  - Enables simultaneous selection of three independent sampler + scheduler algorithmic pairs.
  - Six plain-text string outputs (`Sampler 1`, `Scheduler 1`, `Sampler 2`, `Scheduler 2`, `Sampler 3`, `Scheduler 3`) optimized for downstream metadata integration.
  - Dropdown menus dynamically populated from `comfy.samplers.KSampler.SAMPLERS` and `comfy.samplers.KSampler.SCHEDULERS` registries.
  - Automatically inherits any custom samplers or schedulers added by third-party extensions without code updates.
  - Stateless pass-through architecture with aggressive caching enabled for optimal performance during iterative workflows.
  - Designed for parallelized permutation testing, side-by-side sampler comparisons, grid testing loops, and Civitai-compatible metadata embedding.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.

## [0.12.0] — 2026-03-01

### Added

- **Model Selector** node (`Duffy_ModelSelector`, category `Duffy/Selectors`).
  - User-provided **Models Path** string input — point it at any directory on your filesystem.
  - Three paired folder / model dropdowns for Diffusion, CLIP, and VAE.
  - Folder and model options are populated dynamically via two backend API routes (`/duffy/model_selector/folders`, `/duffy/model_selector/models`) called from the companion JavaScript extension (`model_selector.js`).
  - Models endpoint walks the selected subfolder recursively and filters by extension (`.safetensors`, `.ckpt`, `.pt`, `.bin`, `.pth`, `.gguf`).
  - Path-traversal protection on the models endpoint ensures requests stay within the user-specified base directory.
  - `validate_inputs` override accepts any dynamically populated combo value.
  - Outputs the selected model filenames as plain strings — no models are loaded into memory.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.

## [0.11.0] — 2026-03-01

### Added

- **Image Adjuster** node (`Duffy_ImageAdjuster`, category `Duffy/Image`).
  - Post-processing node for adjusting brightness, contrast, saturation, and hue of an image batch.
  - Brightness, contrast, and saturation sliders (0.0–3.0, default 1.0); hue slider (−0.5–0.5, default 0.0).
  - Uses `torchvision.transforms.functional` for GPU-accelerated photometric transforms.
  - Permutes tensors between `[B, H, W, C]` (ComfyUI) and `[B, C, H, W]` (torchvision) automatically.
  - Skips transforms left at their default values for zero-cost pass-through.
  - Clamps output to `[0.0, 1.0]` to prevent downstream artifacts.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.

## [0.10.0] — 2026-03-01

### Added

- **Primitive Integer** node (`Duffy_PrimitiveInteger`, category `Duffy/Primitives`).
  - Simple pass-through node that takes a single integer value and outputs it unchanged.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
- **Primitive Float** node (`Duffy_PrimitiveFloat`, category `Duffy/Primitives`).
  - Simple pass-through node that takes a single float value and outputs it unchanged.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
- **Primitive String** node (`Duffy_PrimitiveString`, category `Duffy/Primitives`).
  - Simple pass-through node that takes a single-line string value and outputs it unchanged.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
- **Primitive String (Multiline)** node (`Duffy_PrimitiveStringMultiline`, category `Duffy/Primitives`).
  - Simple pass-through node that takes a multiline string value and outputs it unchanged.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.

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
