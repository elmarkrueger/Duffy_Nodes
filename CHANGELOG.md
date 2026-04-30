# Changelog

All notable changes to **Duffy Nodes** are documented here.
This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.34.0] — 2026-04-30

### Added

- **Power LoRA Loader** (`Duffy_PowerLoraLoader`, category `Duffy/Model`).
  - Next-generation dynamic multi-LoRA loader built entirely in Vue 3 and headless PrimeVue for the ComfyUI Nodes 2.0 (Schema V3) architecture.
  - Supports infinite, dynamic LoRA lists without fragile `Autogrow` pins.
  - Native ContextMenu dropdowns with nested folder traversal exactly matching base ComfyUI behavior.
  - Individual sliders for both `Strength Model` and `Strength Clip` bound dynamically correctly without memory leaks.
  - Generates deterministic caching fingerprints to avoid redundant model reloads.
  - Missing LoRAs gracefully skip execution instead of crashing the DAG execution queue.
  - Intercepts graph configuration logic to completely restore preset slider states on workflow reload.

---

## [0.33.0] — 2026-04-26

### Added

- **Adaptive Resolution & Latent Heatsink** (`Duffy_AdaptiveResolutionLatent`, category `Duffy/Latent`).
  - Interactive Vue 3 based custom node for precisely generating optimal empty latents.
  - Automatically handles tensor sizing constraints (divisibility by 8, 16, 32, 64) depending on the target architecture (SDXL, Qwen, Z-Image, Flux).
  - Includes a visual resizing bounding box, preset aspect ratios, algorithmic megapixel calculation, and strict 1:12 scale dragging.
  - Integrates direct event-bubbling stops for seamless keyboard and pointer usage inside ComfyUI.

---

## [0.32.0] — 2026-04-24

### Added

- **Spatial Alignment Matrix** (`Duffy_NodeAlignmentTool`, category `Duffy/Layout`).
  - Frontend utility node for aligning and distributing selected nodes on the canvas.
  - Operates entirely in the UI layer and is completely bypassed during backend graph execution.
  - Supports Left, Center-Horizontal, Right, Top, Center-Vertical, and Bottom alignments.
  - Includes Horizontal and Vertical equidistant distribution algorithms for cleanly spacing 3 or more nodes.
  - Compatible with both the legacy LiteGraph V1 canvas and the modern V2 Vue Nodes architecture.
  - Accessible either as a standalone floating matrix node or directly injected into the Nodes 2.0 Selection Toolbox via extension hooks.

---

## [0.31.0] — 2026-04-22

### Added

- **Native Group Controllers** (`Duffy_NativeGroupBypasser`, `Duffy_NativeGroupMuter`, `Duffy_NativeSingleGroupBypasser`, `Duffy_NativeSingleGroupMuter`, category `Duffy/Workflow`).
  - Allows bypassing or muting entire groups of nodes natively within the ComfyUI UI.
  - Automatically identifies, alphabetically sorts, and tracks groups on the canvas.
  - Supports Exclusive Mode for Multi-Group variants (only one group active at a time).
  - Single-Group variants utilize a responsive dropdown for targeted control.
  - Written in Native Javascript on top of `LiteGraph`, avoiding pure Vue 3 limitations for rapid Canvas DOM updates.
  - Full V3 Schema implementation constraints compliance.

---

## [0.30.0] — 2026-04-21

### Added

- **Show Anything** node (`Duffy_ShowAnything`, category `Duffy/Utils`).
  - Displays connected values as text directly onto the node interface in real-time.
  - Accommodates any data type (strings, integers, floats, booleans, and complex structures).
  - Automatically formats arrays and serializes complex standard dictionaries into formatted JSON.
  - Integrates a responsive, scrollable Vue 3-powered frontend component (`ShowAnything.vue`) for clear legibility and automatic height scaling.
  - Passes the value through as an output (`AnyType`) for seamless workflow continuation.
  - Extension entrypoint (`show_anything.ts`) registered as `"Duffy.ShowAnything.Vue"`.
  - Full V3 Schema implementation constraint compliance.

---

## [0.29.0] — 2026-04-19

### Added

- **Interactive Image Cropping** for the Load Image & Resize node (`Duffy_LoadImageResize`).
  - New "✂ Crop Image" button opens a fullscreen modal overlay powered by **Cropper.js** for precise visual cropping.
  - Aspect ratio presets in the crop editor: Free, 1:1, 4:3, 3:4, 3:2, 2:3, 16:9, 9:16, 21:9, 9:21.
  - Live dimension readout showing crop width, height, and position in real-time.
  - Crop coordinates are stored as JSON in a hidden `crop_data` widget and persisted in workflow metadata.
  - Keyboard shortcuts: Enter to apply, Escape to cancel.
  - Automatic crop reset when the selected image changes, preventing stale coordinates from being applied to a new image.
  - Backend applies crop after EXIF normalization but before center-crop-to-ratio and megapixel resize.
  - Tensor bounds clamping prevents out-of-bounds errors for any coordinate values.
  - Both RGB image and alpha mask tensors are cropped identically (64×64 placeholder masks are skipped).
  - `fingerprint_inputs` updated to include `crop_data` for correct cache invalidation.
  - Fully backwards compatible: empty crop data (`"{}"`) means no crop is applied.
  - Companion Vue 3 component (`LoadImageResizeCrop.vue`) with scoped CSS using ComfyUI theme variables.
  - Extension entrypoint (`load_image_resize.ts`) registered as `"Duffy.LoadImageResize.Vue"`.
  - Vite build entry added; output compiled to `web/js/load_image_resize.js`.
  - New dependency: `cropperjs@^1.6` (bundled, no user action required).

---

## [0.28.0] — 2026-04-12

### Added

- **Gemma-4 GGUF Multimodal Analyzer** node (`Duffy_GemmaGGUFAnalyzer`, category `Duffy/LLM`).
  - Professional-grade multimodal AI analysis using Google's **Gemma-4-E4B-it** model (GGUF format) via llama.cpp.
  - **Requires llama-cpp-python>=0.3.35** (mandatory for Gemma4ChatHandler support).
  - Supports text, image, video, and audio inputs for comprehensive analysis.
  - Built-in preset prompts: "Reverse Engineered Prompt" for image-to-prompt generation, "Style Transfer Prompt" for content+style analysis.
  - Full GPU acceleration support via llama-cpp-python with CUDA.
  - Advanced inference controls: temperature, top_p, top_k, repeat_penalty, presence_penalty, frequency_penalty, mirostat sampling.
  - Intelligent video frame sampling (up to 30 frames) and audio processing (16 kHz mono, max 60s).
  - Context window support up to 128K tokens for long-form analysis.
  - Model caching system to keep models in VRAM between executions.
  - Graceful fallback: Gemma4ChatHandler → Llava16ChatHandler → text-only mode.
  - Thinking mode with optional tag stripping for extended reasoning.
- **Utility modules** (`utils/media.py`, `utils/memory.py`).
  - Image/video/audio to data URI conversion for LLM multimodal inputs.
  - Aggressive VRAM/RAM cleanup utilities for optimal memory management.
- **Comprehensive LLM documentation** (`docs/llm_node_setup.md`).
  - Detailed setup guide including CUDA-enabled llama-cpp-python installation.
  - Model download sources and placement instructions.
  - VRAM requirements and quantization recommendations.
  - Performance optimization tips and troubleshooting guide.
  - Advanced parameter tuning and context window management.

### Changed

- Updated `requirements.txt` to include LLM dependencies: **`llama-cpp-python>=0.3.35`** (mandatory for Gemma4ChatHandler), `numpy>=1.24.0`, `torchaudio>=2.0.0`, `soundfile>=0.12.0`.

---

## [0.27.0] — 2026-03-15

### Added

- **Duffy Prompt Box** node (`Duffy_PromptBox`, category `Duffy/Text`).
  - Multiline text editor with Copy, Clear, and Save utility buttons.
  - Optional input socket for external text override capability.
  - Vue 3-powered frontend widget with persistent state management.
  - Designed for complex prompt editing and text workflow documentation.
- **Duffy Lora Loader** node (`Duffy_LoraLoader`, category `Duffy/Loaders`).
  - Stateless V3 Schema compliant backend supporting `strength_model` and `strength_clip`.
  - Custom Vue 3 widget to override native V3 flat lists and restore hierarchical folder support using `LiteGraph.ContextMenu`.
- **Duffy CLIP Loader** node (`Duffy_ClipLoader`, category `Duffy/Loaders`).
  - Loads CLIP/Text Encoder models with support for 18+ architecture types.
  - Includes CPU offload option for memory-constrained workflows.
  - Features intelligent cache fingerprinting based on file modification time.
  - Fully stateless V3 Schema implementation.

## [0.26.0] — 2026-03-12

### Added

- **Advanced Layer Control** node (`Duffy_AdvancedLayerControl`, category `Duffy/Image`).
  - Interactive visual compositor allowing users to pause the workflow and arrange up to five image layers over a background.
  - Features precise numerical controls and interactive Fabric.js canvas bindings for dragging, scaling, rotating, and mirroring.
  - Implements complete z-index sorting with "Bring Forward" and "Send Backward" controls.
  - Fully responsive, Vue 3-powered frontend widget with auto-scaling to seamlessly support high-resolution background assets without scrolling.

---

## [0.25.0] — 2026-03-09

### Added

- **Logic Gate** node (`Duffy_LogicGate`, category `Duffy/Logic`).
  - Performs boolean logical operations (AND, OR, NOT, NAND, NOR, XOR, XNOR).
  - Supports optional second operand for unary operations like NOT.
  - Full V3 Schema implementation with efficient fingerprinting for cache invalidation.
- **Primitive Boolean** node (`Duffy_PrimitiveBoolean`, category `Duffy/Logic`).
  - Simple boolean pass-through node for workflow control.
  - Toggle-based UI for easy True/False selection.
  - Full V3 Schema implementation.

---

## [0.24.0] — 2026-03-08

### Added

- **Advanced Connected Image Stitch** node (`Duffy_AdvancedConnectedImageStitch`, category `Duffy/Image`).
  - Interactive version of the connection-based image stitcher.
  - Workflow Pausing: Execution stops at the node, revealing a modern Vue 3-based 3x3 grid workspace.
  - Live Preview: Real-time visual feedback of the stitching result (Horizontal, Vertical, or Grid) based on current configuration.
  - Visual Mapping: Intuitive 3x3 grid UI to map connected image inputs (1-9) to specific output positions.
  - Pure PyTorch/Comfy backend: Uses the same robust stitching logic as the standard node for high-quality Lanczos scaling and cropping.
  - State Persistence: Layout configurations are serialized to JSON and stored in the workflow metadata.
  - Async synchronization using the `/duffy/stitch/continue` API route.
  - Companion JavaScript extension (`advanced_connected_image_stitch.js`) with Vue 3 SFC and Vite build integration.

---

## [0.23.0] — 2026-03-08

### Added

- **Advanced Image Adjuster** node (`Duffy_AdvancedImageAdjuster`, category `Duffy/Image`).
  - Interactively adjust image brightness, contrast, saturation, and hue with a live preview during workflow execution.
  - Workflow Pausing: Execution stops at the node, allowing real-time adjustment before continuing.
  - Live CSS-filtered preview in the Vue 3 UI that mirrors the backend PyTorch transformation math.
  - Sliders for Brightness (0.0–3.0), Contrast (0.0–3.0), Saturation (0.0–3.0), and Hue (-0.5–0.5).
  - Pure PyTorch implementation for image adjustments, avoiding external dependencies like `torchvision` for better compatibility.
  - State Persistence: Adjustments are serialized to JSON and stored in the workflow metadata.
  - Double-click a slider to reset it to its default value.
  - Async synchronization using a dedicated `/duffy/adjust/continue` API route.
  - Companion JavaScript extension (`advanced_image_adjuster.js`) with Vue 3 SFC integration.

---

## [0.22.0] — 2026-03-08

### Added

- **Interactive Relighting** node (`Duffy_InteractiveRelight`, category `Duffy/Image`).
  - Pause workflow execution to interactively relight images in real-time.
  - Three distinct light types: **Point** (radial falloff), **Directional** (linear gradient), and **Ambient** (global fill).
  - Modern Vue 3-based UI with a high-fidelity canvas preview and a horizontally scrollable light management panel.
  - Real-time interaction: Add, move, and delete multiple light sources directly on the node.
  - Precise control over light color (RGB picker), power/intensity, radius (for point lights), and angle (for directional lights).
  - High-performance PyTorch backend: Applies the final lighting configuration to the image batch using optimized tensor math, ensuring perfect visual parity with the preview.
  - State Persistence: Automatically serializes lighting configurations to JSON for workflow metadata, allowing for exact reproduction and batch processing.
  - Async synchronization: Uses a custom `aiohttp` API route (`/duffy/relight/continue`) and thread events to safely resume workflows.
  - Companion JavaScript extension (`interactive_relight.js`) with Vue 3 SFC and Vite build integration.

---

## [0.21.0] — 2026-03-08

### Added

- **Image Compare** node (`Duffy_ImageCompare`, category `Duffy/Image`).
  - Interactively compare two images with a vertical, laser-sharp divider slider.
  - Interactive scrubbing: Move the mouse horizontally over the node to reveal the boundary in real-time.
  - High-visibility cyan divider line with a glow effect for precise identification of differences.
  - Responsive image scaling using `object-fit: contain` to support any input image size or aspect ratio.
  - Pointer event isolation: Scrubbing logic does not interfere with the ComfyUI canvas or node dragging.
  - Stateless V3 Schema implementation: uses the modern `onExecuted` lifecycle hook to fetch images from the server.
  - Companion JavaScript extension (`image_compare.js`) for the custom DOM slider interface.

---

## [0.20.0] — 2026-03-07

### Added

- **Image Text Overlay** node (`Duffy_ImageTextOverlay`, category `Duffy/Image`).
  - Stateless V3 node for overlaying text onto image batches.
  - Interactive HTML5 Color Picker widget injected via Vue for intuitive font color selection.
  - Robust **Font Resolution Engine** that maps common display names (Arial, Impact, etc.) to actual system font files on Windows and macOS.
  - Support for custom fonts: drop `.ttf`, `.otf`, or `.ttc` files into the `fonts/` directory for automatic discovery in the node dropdown.
  - Precise X/Y positioning and font size sliders with real-time feedback.
  - Batch-aware execution: applies the same overlay to all images in a tensor batch.
  - Correct dimension handling: processes tensors in `[B, H, W, C]` layout.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema` with list-based inputs/outputs, and explicit IDs.
  - Companion JavaScript extension (`image_text_overlay.js`) for UI enhancements and theme integration.

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
