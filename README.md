# 🎨 Duffy Nodes - ComfyUI Custom Node Pack

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ComfyUI](https://img.shields.io/badge/ComfyUI-Nodes%202.0-blue)](https://github.com/comfyanonymous/ComfyUI)
[![Schema V3](https://img.shields.io/badge/Schema-V3-green)](https://github.com/comfyanonymous/ComfyUI)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)

A comprehensive collection of custom nodes for ComfyUI, built with the modern **Nodes 2.0 V3 Schema** architecture. This pack provides essential utilities, advanced image processing, flexible primitives, and powerful workflow helpers designed for professional AI art generation pipelines.

> [!WARNING]
> **Manual Installation Required for GGUF Multimodal Analyzer Node**
>
> The **Gemma-4 GGUF Multimodal Analyzer** node requires **llama-cpp-python v0.3.36 or higher**, because the Gemma 4 chat template was not integrated until that version. The current official release on PyPI is only **v0.3.20-cu123**, which **will not work**.
>
> You must manually install a pre-built wheel from the community repository:
> **https://github.com/JamePeng/llama-cpp-python/releases** (v0.3.36 for various CUDA versions is available).
>
> `llama-cpp-python` is **not** included in `requirements.txt` and will not be installed automatically.
>
> See **[docs/llm_node_setup.md](docs/llm_node_setup.md)** for detailed installation instructions, including how to install the wheel into ComfyUI's `python_embedded` environment.

> [!TIP]
> **Modern UI Integration:** Several nodes in this pack feature advanced **Vue 3** interactive interfaces for a superior user experience. These frontend components are **precompiled** into the `web/js` directory. Users do not need to install Node.js, Vite, or any build tools to use this pack; it works immediately upon installation like any other ComfyUI extension.

---

## ✨ Features

🚀 **Modern Architecture** - Built with ComfyUI Nodes 2.0 and Schema V3 for maximum performance and compatibility  
🎯 **36+ Professional Nodes** - Carefully crafted tools covering primitives, math, image processing, LLM analysis, and more  
⚡ **GPU Accelerated** - Leverages PyTorch and torchvision for blazing-fast image operations  
🔧 **Stateless Design** - Clean, predictable behavior with proper caching and fingerprinting  
🎨 **Custom UI Widgets** - Enhanced user experience with specialized Vue-compatible interfaces  
📦 **Zero Dependencies** - Works out of the box with your existing ComfyUI installation  

---

## 📦 Installation

### Method 2: Manual Installation
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/yourusername/comfyui-duffy-nodes.git
cd comfyui-duffy-nodes
pip install -r requirements.txt
```

Restart ComfyUI after installation.

---

## 📚 Node Catalog

### 🔢 Primitive Nodes
Essential input nodes for basic data types with clean, intuitive interfaces.

#### ➕ Dynamic Integer Provider
![Dynamic Integer Provider](images/dynamic_integer.jpg)
*Category: `Duffy/Primitives`*

A dynamic, multi-port integer provider built with Vue 3. Generates up to 10 outputs on demand interactively. Users can safely add, remove, and custom-label their integer connection ports entirely from the frontend.

**Outputs:** `INT` (Dynamically Generated)

---

#### ➕ Primitive Integer
![Primitive Integer](images/primitive_integer.jpg)
*Category: `Duffy/Primitives`*

Simple integer input with configurable range (-9007199254740991 to 9007199254740991). Perfect for counters, indices, and discrete parameters.

**Outputs:** `INTEGER`

---

#### ➕ Primitive Float  
![Primitive Float](images/primitive_float.jpg)
*Category: `Duffy/Primitives`*

Floating-point input with high precision support. Ideal for weights, multipliers, and continuous parameters.

**Outputs:** `FLOAT`

---

#### 📝 Primitive String
![Primitive String](images/primitive_string.jpg)
*Category: `Duffy/Primitives`*

Single-line text input for prompts, filenames, and short text snippets.

**Outputs:** `STRING`

---

#### 📄 Primitive String (Multiline)
![Primitive String Multiline](images/primitive_string_multiline.jpg)
*Category: `Duffy/Primitives`*

Multi-line text editor for complex prompts, descriptions, and formatted text.

**Outputs:** `STRING`

---

#### 🔘 Primitive Boolean
![Primitive Boolean](images/primitive_boolean.jpg)
*Category: `Duffy/Logic`*

Simple boolean toggle input (True/False). Perfect for enabling/disabling workflow branches and controlling logic gates.

**Outputs:** `BOOLEAN`

---

### � Models & LoRAs
Advanced tools for routing, patching, and applying machine-learning models.

#### 🔌 Power LoRA Loader
![Power LoRA Loader](images/power_lora_loader.jpg)
*Category: `Duffy/Model`*

A fully stateless, deterministic, native Vue 3 implementation of dynamic multi-LoRA loading. Bypasses the limitations of legacy LiteGraph canvas rendering, providing Drag-and-Drop capabilities, integrated PrimeVue nested context menus, and strict persistence across workflow reloads. Automatically extracts, aggregates, and passes trigger words to text encoders.

**Inputs:** `model` (MODEL), `clip` (CLIP)  
**Outputs:** `MODEL`, `CLIP`, `TRIGGER_STR`

**Features:**
- Native ComfyUI Vue 3 / Schema V3 Component implementation
- Add, adjust, and reorder an infinite number of LoRAs cleanly
- Deterministic payload caching ensures optimal memory re-use
- Missing LoRAs are handled and bypassed gracefully without crashing the graph
- Automatic extraction and concatenation of Trigger Words

---

### 🎯 SAM3 Nodes
Interactive annotation and prompt-conditioning tools for SAM3-driven mask workflows.

#### 🖌️ SAM3 Mask Editor
![SAM3 Mask Editor](images/sam3_mask_editor.jpg)
*Category: `Duffy/SAM3`*

Unified CLIP encoder and interactive SAM3 mask editor with modal image loading, positive/negative point placement, and bounding box annotation for SAM3 Detect pipelines.

**Inputs:** `clip` (CLIP), `image_file` (hidden widget), `prompt_text` (STRING), `internal_bboxes` (hidden JSON), `internal_coords` (hidden JSON), `internal_negative_coords` (hidden JSON), `internal_resize_meta` (hidden JSON)  
**Outputs:** `CONDITIONING`, `positive_coords` (STRING), `negative_coords` (STRING), `bboxes` (BOUNDING_BOX), `image` (IMAGE)

**Features:**
- Fullscreen interactive mask editor modal with pan/zoom canvas controls
- Positive and negative point annotation support for SAM3 prompts
- Bounding box authoring with resize/translate/select/delete tooling
- Safe upload flow to ComfyUI input directory via `/duffy/sam3/upload_image`
- Annotation and resize metadata persistence across workflow save/load
- Integrated CLIP tokenization and conditioning output in a single node

---

### �🧮 Math Operations
Powerful mathematical nodes for precise numerical control.

#### ➗ Float Math
![Float Math](images/float_math.jpg)
*Category: `Duffy/Math`*

Perform arithmetic operations on floating-point values. Supports addition, subtraction, multiplication, division, power, and modulo.

**Inputs:** `a` (float), `b` (float), `operation` (dropdown)  
**Outputs:** `result` (float)

**Operations:** Add, Subtract, Multiply, Divide, Power, Modulo

---

#### ✖️ Integer Math
![Integer Math](images/int_math.jpg)
*Category: `Duffy/Math`*

Integer-based mathematical operations with floor division support. Perfect for discrete calculations and index manipulation.

**Inputs:** `a` (int), `b` (int), `operation` (dropdown)  
**Outputs:** `result` (int)

**Operations:** Add, Subtract, Multiply, Floor Divide, Power, Modulo

---

### 🧠 Logic Operations
Perform boolean logic and conditional routing.

#### 🧩 Logic Gate
![Logic Gate](images/logic_gate.jpg)
*Category: `Duffy/Logic`*

Perform boolean logical operations on inputs. Supports standard gates including AND, OR, NOT, NAND, NOR, XOR, and XNOR.

**Inputs:** `a` (boolean), `b` (boolean, optional), `operation` (dropdown)  
**Outputs:** `result` (boolean)

**Operations:** AND, OR, NOT, NAND, NOR, XOR, XNOR

---

#### 🎛️ Five Float Sliders
![Five Float Sliders](images/five_float_slider.jpg)
*Category: `Duffy/Math`*

Five independent float sliders (0.0–100.0) with custom UI widget. Ideal for multi-parameter experimentation and fine-tuning.

**Outputs:** `float_1`, `float_2`, `float_3`, `float_4`, `float_5`

---

#### 🎚️ Five Int Sliders
![Five Int Sliders](images/five_int_slider.jpg)
*Category: `Duffy/Math`*

Five independent integer sliders (0–100) with synchronized UI. Perfect for batch processing controls and discrete parameter sweeps.

**Outputs:** `int_1`, `int_2`, `int_3`, `int_4`, `int_5`

---

### 🖼️ Image Processing
Advanced image manipulation nodes with GPU acceleration.

#### 🎨 Image Adjuster
![Image Adjuster](images/image_adjuster.jpg)
*Category: `Duffy/Image`*

Professional-grade color correction tool. Adjust brightness, contrast, saturation, and hue with GPU-accelerated torchvision transforms.

**Inputs:** `image` (IMAGE), `brightness` (0.0–3.0), `contrast` (0.0–3.0), `saturation` (0.0–3.0), `hue` (-0.5–0.5)  
**Outputs:** `IMAGE`

**Features:**
- Real-time GPU acceleration via torchvision
- Zero-cost pass-through for unmodified parameters
- Automatic tensor permutation handling
- Output clamping prevents artifacts

---

#### 🎨 Advanced Image Adjuster
![Advanced Image Adjuster](images/advanced_image_adjuster.jpg)
*Category: `Duffy/Image`*

Interactive post-processing node that pauses your workflow to allow real-time image adjustment. Dial in the perfect look with a live preview before continuing the execution.

**Inputs:** `image` (IMAGE), `pause_execution` (boolean), `saved_adjustments` (hidden JSON state)  
**Outputs:** `image` (IMAGE)

**Features:**
- ⏸️ **Workflow Pausing** — Execution stops at the node, revealing an interactive adjustment studio.
- 📺 **Live Preview** — See your changes instantly with a responsive CSS-filtered preview that mirrors the backend math.
- 🎛️ **Precise Sliders** — Fine-tune brightness (0.0–3.0), contrast (0.0–3.0), saturation (0.0–3.0), and hue (-0.5–0.5).
- ⚡ **Pure PyTorch Backend** — Final adjustments are computed using optimized tensor operations, ensuring high-quality output without external dependencies.
- 💾 **State Persistence** — Your settings are saved into the workflow metadata for easy reproduction or batch runs.
- 🔄 **Double-Click Reset** — Quickly reset individual sliders to their default values with a double-click.

**Use Cases:** Visual fine-tuning of generations, color grading, mood adjustment, and interactive A/B testing of image parameters.

---

#### 📐 Megapixel Resize
![Megapixel Resize](images/mega_pixel_resize.jpg)
*Category: `Duffy/Image`*

Intelligent image resizer targeting specific megapixel counts while preserving aspect ratio. Perfect for consistent resolution workflows.

**Inputs:** `image` (IMAGE), `target_megapixels` (float), `mode` (dropdown)  
**Outputs:** `IMAGE`, `width` (int), `height` (int)

**Modes:** Bilinear, Nearest, Bicubic, Area, Lanczos

---

#### 📂 Load Image & Resize
![Load Image Resize](images/load_image_resize.jpg)
*Category: `Duffy/Image`*

Combined image loader, interactive cropper, and intelligent resizer. Loads images, optionally crops them via a fullscreen visual editor, and resizes to target megapixels — all in one node.

**Inputs:** `image` (file picker), `target_megapixels` (float), `aspect_ratio` (dropdown), `method` (dropdown), `divisible_by` (int), `crop_data` (hidden JSON state)  
**Outputs:** `IMAGE`, `MASK`, `width` (int), `height` (int), `original_width` (int), `original_height` (int), `filename` (string), `megapixels` (float), `aspect_ratio` (string)

**Features:**
- ✂️ **Interactive Crop Editor** — A "✂ Crop Image" button opens a fullscreen modal overlay powered by Cropper.js for precise visual cropping.
- 📐 **Aspect Ratio Presets** — Lock the crop selection to common ratios (Free, 1:1, 4:3, 3:4, 3:2, 2:3, 16:9, 9:16, 21:9, 9:21).
- 📏 **Live Dimension Readout** — See the exact pixel dimensions and position of your crop in real-time.
- 🔄 **Auto-Reset on Image Change** — Crop coordinates are automatically cleared when a new image is selected, preventing stale crops.
- 🎯 **Non-Destructive Pipeline** — Crop → center-crop to aspect ratio → megapixel resize. The original image is never modified.
- 💾 **State Persistence** — Crop coordinates are saved in the workflow and restored when reopening the editor.
- 🛡️ **Bounds Safety** — Coordinates are clamped to tensor dimensions on the backend, preventing out-of-bounds errors.
- ⌨️ **Keyboard Shortcuts** — Enter to apply, Escape to cancel.

**Use Cases:** Region-of-interest extraction, composition refinement, dataset preparation, removing unwanted borders, and precise pre-crop before aspect ratio fitting.

---

#### 🎭 RGBA to RGB Converter
![RGBA to RGB](images/rgba_to_rgb.jpg)
*Category: `Duffy/Image`*

Convert RGBA images to RGB with configurable background color. Handles alpha blending gracefully.

**Inputs:** `image` (IMAGE), `background_color` (dropdown)  
**Outputs:** `IMAGE`

**Background Options:** White, Black, Custom RGB

---

#### 💾 Save Image with Sidecar
![Save Image with Sidecar](images/save_image_with_sidecar.jpg)
*Category: `Duffy/Image`*

Save images with JSON metadata sidecar files. Perfect for tracking generation parameters and workflow documentation.

**Inputs:** `images` (IMAGE), `filename_prefix` (string), `metadata` (dict)  
**Outputs:** Saved files + JSON metadata

---

#### 📁 Directory Image Iterator
![Directory Image Iterator](images/directory_image_iterator.jpg)
*Category: `Duffy/Image`*

Iterate through images in a directory with automatic batching. Essential for batch processing workflows.

**Inputs:** `directory` (string), `index` (int), `recursive` (boolean)  
**Outputs:** `IMAGE`, `filename` (string), `total_count` (int)

---

#### 🏷️ Iterator Current Filename
![Iterator Current Filename](images/iterator_current_filename.jpg)
*Category: `Duffy/Image`*

Extract and pass through the current filename from directory iterator. Useful for metadata and naming.

**Inputs:** `filename` (string)
**Outputs:** `STRING`

---

#### 🖼️ Image Preview
![Image Preview](images/image_preview.jpg)
*Category: `Duffy/Image`*

Simple image preview node that displays an image batch natively within the node. Serving strictly as a visual endpoint, it helps you inspect images at any point in your workflow.

**Inputs:** `image` (IMAGE)
**Outputs:** (Visual only)

**Features:**
- ⚡ **Native Rendering** — Leverages ComfyUI's standard image preview widget for reliable and consistent display.
- 📦 **Stateless V3 Execution** — Clean, predictable behavior with proper caching and fingerprinting.
- 🚀 **Batch Support** — Automatically handles and displays all images in a batch.
- 🛡️ **Zero Overhead** — Minimal performance impact, designed for visual verification.

**Use Cases:** Visual inspection of intermediate results, prompt testing, and final output verification.

---

#### 🔍 Image Compare![Image Compare](images/image_compare_node.jpg)
*Category: `Duffy/Image`*

Interactively compare two images with a vertical, laser-sharp slider that adjusts to your mouse position. Perfect for identifying subtle differences between two connected images (e.g., comparing different upscalers or sampling parameters).

**Inputs:** `image_a` (IMAGE), `image_b` (IMAGE)
**Outputs:** (Visual only)

**Features:**
- ⚡ **Interactive Scrubbing** — Move your mouse horizontally over the node to reveal `image_a` over `image_b` in real-time.
- 🌈 **Laser-Sharp Divider** — High-visibility cyan divider line with a glow effect for precise boundary identification.
- 📐 **Responsive Scaling** — Automatically fits images of any size using `object-fit: contain` while preserving aspect ratios.
- 🛡️ **Pointer Isolation** — Interaction logic is isolated from the ComfyUI canvas, allowing smooth scrubbing without accidentally dragging the node.
- 🚀 **Stateless V3 Execution** — Efficiently processes image batches and updates the UI via the modern `onExecuted` lifecycle hook.

**Use Cases:** A/B testing, upscaler comparison, noise-level analysis, color grading verification, and spot-the-difference debugging.

---

#### 🔍 Advanced Folder Image Selector
![Advanced Folder Image Selector](images/advanced_folder_image_selector.jpg)
*Category: `Duffy/Image/Selection`*

Interactive thumbnail browser for selecting up to 10 images from a directory. Features pagination, sorting, and real-time preview.

**Inputs:** `folder_path` (string), `selected_images_state` (string, hidden)  
**Outputs:** `image_1`, `image_2`, `image_3`, `image_4`, `image_5`, `image_6`, `image_7`, `image_8`, `image_9`, `image_10` (IMAGE)

**Features:**
- 🖼️ Thumbnail grid with 3×3 pagination
- 🔄 Sort by filename or creation date
- ✅ Visual selection indicators with badges
- 💾 Persistent selection state across sessions
- ⚡ Async thumbnail generation for performance

**Use Cases:** Manual image selection from large batches, creating comparison workflows, curating datasets

---

#### 🧩 Image Stitch
![Image Stitch](images/duyy_image_stitch.jpg)
*Category: `Duffy/Image`*

Upload up to 9 images via an interactive 3×3 grid and stitch them into a single output image — horizontally, vertically, or in a grid layout. Drag-and-drop reordering lets you control the exact image sequence before stitching.

**Inputs:** `orientation` (Horizontal/Vertical/Layout), `image_1`–`image_9` (file upload, optional)  
**Outputs:** `stitched_image` (IMAGE)

**Features:**
- 🖼️ Interactive 3×3 grid with numbered slot badges (always visible)
- 📤 Per-slot image upload via ComfyUI's native upload mechanism
- 🔀 Drag-and-drop reordering between grid cells
- ↔️ Horizontal mode: scales all images to the tallest height, preserving aspect ratios
- ↕️ Vertical mode: center-crops all images to the narrowest width
- ⊞ Layout mode: stitches images preserving their 3×3 grid positions — empty rows/columns are excluded, empty cells within active rows/columns are filled with black
- ❌ Per-slot clear button to remove individual images
- 🎨 Custom orientation toggle (→ Horizontal / ↓ Vertical / ⊞ Layout)

**Use Cases:** Contact sheets, image comparisons, before/after compositions, multi-image collages, reference boards

---

#### 🔗 Connected Image Stitch
![Connected Image Stitch](images/connected_image_stitch.jpg)
*Category: `Duffy/Image`*

A connection-based variant of Image Stitch. Instead of uploading images directly, connect up to 9 image outputs from other nodes and stitch them into a single output image. In Layout mode, an interactive 3×3 mapping grid lets you assign any input to any grid position.

**Inputs:** `orientation` (Horizontal/Vertical/Layout), `image_1`–`image_9` (IMAGE, optional connections), `layout_pos_1`–`layout_pos_9` (hidden, used by Layout grid)
**Outputs:** `stitched_image` (IMAGE)

**Features:**
- 🔌 9 optional image input connections — wire outputs from Load Image, VAE Decode, or any image-producing node
- ↔️ Horizontal mode: scales all connected images to the tallest height, preserving aspect ratios
- ↕️ Vertical mode: center-crops all connected images to the narrowest width
- ⊞ Layout mode: interactive 3×3 mapping grid with per-cell dropdown to assign any input (Image 1–9) to any grid position
- 🔄 "Reset to Default (1–9)" button to restore identity mapping
- 🛡️ Graceful handling of unconnected inputs — if a grid cell references an input that isn't connected, it is treated as empty (black)
- 🎨 Same orientation toggle and Duffy node theming as Image Stitch

**Use Cases:** Dynamic image compositions from upstream nodes, workflow-driven collages, pipeline-based contact sheets, comparing outputs from multiple generation branches

---

#### 🔗 Advanced Connected Image Stitch
![Advanced Connected Image Stitch](images/advanced_connected_image_stitch.jpg)
*Category: `Duffy/Image`*

An interactive version of the Connected Image Stitch node. It pauses execution to provide a real-time 3×3 grid workspace where you can visually map up to 9 connected image inputs to specific grid cells with a live preview of the final stitched result.

**Inputs:** `image_1`–`image_9` (IMAGE, optional connections), `saved_layout` (hidden JSON state), `pause_execution` (boolean)
**Outputs:** `stitched_image` (IMAGE)

**Features:**
- ⏸️ **Workflow Pausing** — Execution stops at the node, revealing an interactive stitching studio.
- 🖼️ **Live 3×3 Preview** — See exactly how your images will be combined before continuing the workflow.
- ↔️ **Multiple Modes** — Supports Horizontal, Vertical, and custom 3×3 Grid Layouts.
- 📍 **Visual Mapping** — Drag-and-drop or use dropdowns to assign any connected input (1-9) to any grid position.
- ⚡ **Optimized Backend** — Reuses high-quality Lanczos scaling and center-cropping logic for consistent results.
- 💾 **State Persistence** — Your layout configurations are saved into the workflow metadata.

**Use Cases:** Visual contact sheet composition, custom multi-image collages, interactive A/B comparison grids, and complex layout prototyping.

---

#### 🔠 Image Text Overlay
![Image Text Overlay](images/image_text_overlay.jpg)
*Category: `Duffy/Image`*

Stateless V3 node to overlay text onto an image batch. Features a modern color picker, font size slider, precise X/Y positioning, and a robust font resolution engine that supports custom `.ttf`/`.otf` files and system-wide fonts.

**Inputs:** `image` (IMAGE), `text` (string, multiline), `font_color` (hex string), `font_size` (int, 8–1024), `font_name` (dropdown), `position_x` (int), `position_y` (int)
**Outputs:** `image` (IMAGE)

**Features:**
- 🎨 **Modern Color Picker** — Injected HTML5 color widget for intuitive font color selection
- 🔤 **Custom Font Support** — Drop your own `.ttf`, `.otf`, or `.ttc` files into the `fonts/` directory for automatic detection
- 🏢 **System Font Mapping** — Robust resolution for standard Windows and macOS system fonts (Arial, Impact, etc.)
- 📐 **Precise Placement** — Interactive sliders for pixel-perfect X/Y text positioning
- ⚡ **GPU-Friendly** — Processes batch image tensors in standard `[B, H, W, C]` layout

**Use Cases:** Adding watermarks, labeling generation parameters, creating memes, cinematic titles, and procedural text overlays.

---

#### 🧾 Advanced Text Overlay
![Advanced Text Overlay](images/advanced_text_overlay.jpg)
*Category: `Duffy/Image`*

Interactive multi-layer text compositor that pauses execution so you can place, style, and preview multiple text overlays directly on the image before continuing the workflow.

**Inputs:** `image` (IMAGE), `saved_overlays` (hidden JSON state), `pause_execution` (boolean)  
**Outputs:** `image` (IMAGE)

**Features:**
- ⏸️ **Interactive Pause Workflow** — Stops execution and opens a dedicated text overlay studio for live editing.
- 🧱 **Multiple Text Layers** — Add, remove, and manage multiple independent text blocks in a single node.
- 🔤 **Font Browser Support** — Uses system fonts and automatically detects custom `.ttf`, `.otf`, and `.ttc` files from the `fonts/` directory.
- 🎨 **Live Styling Controls** — Adjust text, font, size, color, and normalized X/Y placement with immediate preview feedback.
- 💾 **Persistent Overlay State** — Stores layer configuration in hidden workflow state so layouts can be reused and resumed.

**Use Cases:** Poster layouts, captions, subtitles, meme composition, watermark stacks, title cards, and multi-label annotation workflows.

---

#### 💡 Interactive Relighting
![Interactive Relighting](images/interactive_relighter.jpg)
*Category: `Duffy/Image`*

Pause your workflow and interactively relight your images in real-time. Add multiple 2D light sources—**Point**, **Directional**, and **Ambient**—and manipulate them directly on a high-fidelity canvas preview before continuing the execution.

**Inputs:** `image` (IMAGE), `pause_execution` (boolean), `saved_lights` (hidden JSON state)  
**Outputs:** `image` (IMAGE)

**Features:**
- ⏸️ **Workflow Pausing** — Execution stops at the node, revealing an interactive lighting studio.
- 🔦 **Multiple Light Types** — Mix and match Point lights (radial falloff), Directional lights (linear gradients), and Ambient fills.
- 🎨 **Real-time Color & Intensity** — Adjust RGB colors and light power with immediate visual feedback on the canvas.
- 📍 **Precision Positioning** — Drag-and-drop simulated light centers and adjust radii or angles with fine-tuned sliders.
- ⚡ **PyTorch Backend** — The final lighting is computed using high-performance PyTorch tensor math, ensuring the output perfectly matches your preview.
- 💾 **State Persistence** — Your lighting configurations are saved into the workflow metadata, allowing for easy reproduction or batch processing.

**Use Cases:** Dramatic portrait relighting, mood adjustment, highlighting specific subjects, simulated studio photography, and creative color grading.

---

#### 🎛️ Advanced Layer Control
![Advanced Layer Control](images/advanced_layer_control.jpg)
*Category: `Duffy/Image`*

Pause your workflow to interactively compose up to five distinct object layers over a background image. Position, resize, rotate, mirror, and adjust the z-order of each element on a dynamic canvas.

**Inputs:** `background_image` (IMAGE), `object_1`–`object_5` (IMAGE, optional), `pause_execution` (boolean), `saved_layers` (hidden JSON state)  
**Outputs:** `image` (IMAGE)

**Features:**
- ⏸️ **Interactive Workspace** — Pauses execution to let you visually arrange layers before generating the final composited image.
- 🎨 **Fabric.js Canvas** — Smooth drag-and-drop mechanics with responsive auto-scaling to fit large aspect ratio background images perfectly.
- 📐 **Precision Transforms** — Dial in exact X/Y coordinates, scale, rotation, and flipping via numerical inputs and handy sliders.
- 📚 **Z-Order Management** — Bring objects forward or send them backward, completely changing how elements overlap.
- 👁️ **Visibility Toggles** — Quickly hide or show connected layers without destroying your transform settings.
- ⚡ **Optimized PyTorch Compositing** — Final renders execute quickly on the backend matching your exact visual layout.
- 💾 **Session State** — Layer states are saved in your workflow so re-running prompts keeps everything precisely where you placed it.

**Use Cases:** Crafting complex scenes, adding foreground elements, building collages, placing characters against generated backgrounds, and manual subject positioning.

---

### 🎲 Latent Operations
Specialized nodes for latent space manipulation and noise generation.

#### 🎛️ Adaptive Resolution & Latent Heatsink
![Adaptive Resolution Node](images/adaptive_resolution_node.jpg)
*Category: `Duffy/Latent`*

Advanced interactive resolution calculator mapping directly to architectural divisibility constraints for SD 1.5, SDXL, Qwen, Z-Image, and Flux series models. Offers both preset aspect ratios and custom draggable bounding boxes.

**Inputs:** `batch_size` (int), `state_json` (hidden JSON state)  
**Outputs:** `WIDTH` (INT), `HEIGHT` (INT), `LATENT` (LATENT)

**Features:**
- 📐 **Algorithmic Megapixel Generation** — Automatically calculates optimal Width/Height pairs for your chosen Aspect Ratio and Model Architecture.
- 🖱️ **Interactive Canvas** — Drag-and-scale visual preview box with mathematically constrained 1:12 scale mapping.
- ⚙️ **Divisibility Enforcement** — Automatically snaps values to `8`, `16`, `32`, or `64` modular constraints.
- 🔄 **Orientation Swapping** — One-click toggle between landscape and portrait.

---

#### 📦 Empty Qwen 2512 Latent
![Empty Qwen Latent](images/empty_qwen_2512_latent_image.jpg)
*Category: `Duffy/Latent`*

Generate empty latent tensors optimized for Qwen 2.5 12B model workflows. Ensures proper dimensionality and scaling.

**Inputs:** `width` (int), `height` (int), `batch_size` (int)  
**Outputs:** `LATENT`

---

#### 🌊 Flux Klein Noise Generator
![Flux Klein Noise](images/generate_noise_flux_klein.jpg)
*Category: `Duffy/Latent`*

Advanced noise generator implementing Klein mathematical patterns for Flux model initialization.

**Inputs:** `latent` (LATENT), `seed` (int), `strength` (float)  
**Outputs:** `LATENT`

---

#### 🎭 Latent Noise Blender
![Latent Noise Blender](images/latent_noise_blender.jpg)
*Category: `Duffy/Latent`*

Blend two latent tensors with configurable mixing ratio. Enables latent interpolation and noise injection workflows.

**Inputs:** `latent_a` (LATENT), `latent_b` (LATENT), `blend_factor` (0.0–1.0)  
**Outputs:** `LATENT`

---

### 🎯 Sampling & Scheduling
Advanced sampling control nodes for fine-grained generation control.

#### 🔀 Triple Sampler & Scheduler Selector
![Triple Sampler Scheduler](images/tripple_sampler_selector.jpg)
*Category: `Duffy/Sampling`*

Select three independent sampler + scheduler combinations simultaneously. Perfect for comparative analysis and permutation testing.

**Outputs:** `Sampler 1`, `Scheduler 1`, `Sampler 2`, `Scheduler 2`, `Sampler 3`, `Scheduler 3` (all strings)

**Features:**
- Dynamic population from ComfyUI's sampler registry
- Automatic detection of custom samplers/schedulers
- Optimized for parallelized grid testing
- Civitai metadata compatible

---

#### 🎪 Multi-Pass Sampling
![Multi-Pass Sampling](images/multi_pass_sampling.jpg)
*Category: `Duffy/Sampling`*

Execute multiple sampling passes with different parameters in sequence. Enables iterative refinement workflows.

**Inputs:** `latent` (LATENT), `passes` (int), `steps_per_pass` (int)  
**Outputs:** `LATENT`

---

### 🔧 Selectors & Utilities
Workflow helpers for routing and dynamic selection.

#### �️ Show Anything
![Show Anything](images/show_Anything.jpg)
*Category: `Duffy/Utils`*

Displays connected values as text directly onto the node interface in real-time. Accommodates any data type (strings, integers, floats, booleans, and complex structures).

**Inputs:** `value` (AnyType)  
**Outputs:** `value` (AnyType)

**Features:**
- 🖥️ **Vue 3 UI** — Responsive, scrollable frontend component for clear legibility and automatic height scaling.
- 🧱 **Data Formatting** — Automatically formats arrays and serializes complex standard dictionaries into aesthetically pleasing, formatted JSON.
- ⚡ **Pass-through** — Passes the value through as an output for seamless workflow continuation.

**Use Cases:** Inspecting prompts, debugging complex JSON states, checking numerical math outputs, and workflow documentation.

---

#### �📡 Signal Selector
![Signal Selector](images/signal_selector.jpg)
*Category: `Duffy/Selectors`*

Route one of five inputs to a single output based on selector index. Universal type support via `*` wildcard.

**Inputs:** `selector` (1–5), `input_1` through `input_5` (any type)  
**Outputs:** Selected input (preserves type)

---

#### 🔀 Toggle Switch
![Toggle Switch](images/toggle_switch.jpg)
*Category: `Duffy/Selectors`*

Binary switch between two inputs with custom UI. Clean A/B testing interface.

**Inputs:** `enable` (boolean), `input_a` (any), `input_b` (any)  
**Outputs:** Selected input (preserves type)

---

#### 📂 Model Selector
![Model Selector](images/model_selector.jpg)
*Category: `Duffy/Selectors`*

Dynamic model selection interface for Diffusion, CLIP, and VAE models. Scans custom directories and populates dropdowns automatically.

**Inputs:** `models_path` (string)  
**Outputs:** `diffusion_model` (string), `clip_model` (string), `vae_model` (string)

**Features:**
- User-provided base path
- Recursive folder scanning
- Multiple model format support (.safetensors, .ckpt, .pt, .bin, .pth, .gguf)
- Path traversal protection
- Dynamic dropdown population via REST API

---

#### � Duffy CLIP Loader
![Duffy CLIP Loader](images/duffy_clip_loader.jpg)
*Category: `Duffy/Loaders`*

Loads CLIP/Text Encoder models for text conditioning. Supports multiple architecture types including Stable Diffusion, SD3, FLUX2, and many others with flexible device placement options.

**Inputs:** `clip_name` (CLIP model file), `type` (architecture type), `device` (CPU/default)
**Outputs:** `CLIP` (loaded CLIP model)

**Features:**
- Supports 18+ architecture types (SD, SD3, Flux2, Mochi, LTX-V, Cosmos, Qwen, HunyuanImage, etc.)
- CPU offload option for memory-constrained systems
- Intelligent cache fingerprinting based on file modification time
- Stateless V3 Schema implementation with proper error handling

**Use Cases:** Text conditioning for any ComfyUI pipeline, multi-architecture workflows, memory-optimized inference

---

#### �📦 Duffy Lora Loader
![Duffy Lora Loader](images/duffy_lora_loader.jpg)
*Category: `Duffy/Loaders`*

Stateless V3 Schema Python node supporting `strength_model` and `strength_clip`. Bypasses native V3 searchable flat dropdowns using a custom Vue 3 widget mapped to `LiteGraph.ContextMenu` to preserve hierarchical folder structures.

**Inputs:** `model` (Model), `clip` (CLIP), `lora_name` (String: hidden), `strength_model` (Float), `strength_clip` (Float)
**Outputs:** Modified `model` (Model), Modified `clip` (CLIP)

**Features:**
- Loads LoRAs from the default `models/loras/` folder.
- Custom Vue 3 widget to restore native `LiteGraph.ContextMenu` hierarchical cascading submenus.
- Stateless Python Nodes 2.0 backend (`io.ComfyNode`).

---

#### � Seed
![Duffy Seed](images/seed.jpg)
*Category: `Duffy/utilities`*

Advanced seed node with randomize, increment, decrement, and fixed modes. Handles seed generation on the frontend before the prompt is sent to the server, ensuring reproducibility and proper metadata embedding. Includes a server-side fallback for direct API usage.

**Inputs:** `seed` (INT, range ±1,125,899,906,842,624)  
**Outputs:** `SEED` (INT)

**Features:**
- 🎲 **Randomize Each Time** — generates a new random seed on every queue (seed = -1)
- 🔒 **New Fixed Random** — generates a single random seed and locks it in place
- ♻️ **Use Last Queued Seed** — restores the last actually-used seed value
- ➕ **Increment / Decrement** — automatically increments or decrements the last seed (seed = -2 / -3)
- 📡 **Frontend prompt interception** — replaces special seed values in the serialized prompt and workflow metadata before they reach the server, avoiding caching issues
- 🛡️ **Server-side API fallback** — when special seeds arrive via direct API calls (no frontend), the backend generates a random seed and persists it to workflow & prompt metadata
- 📋 **Context menu** with quick actions and toggleable "Last Seed" display widget
- 🧩 Removes the default ComfyUI `control_after_generate` dropdown in favor of dedicated buttons

**Use Cases:** Reproducible generation runs, iterative seed exploration, A/B seed comparison, API-driven batch pipelines

---
#### 📝 JSON Format String
![JSON Format String](images/json_to_text.jpg)
*Category: `Duffy/utilities`*

Parses a raw JSON string and outputs it as a well-formatted multiline representation. Connect a Primitive String (Multiline) containing JSON to the input, then pipe the output to another String Multiline or Show Any node for clean display.

**Inputs:** `json_text` (string, multiline), `format_mode` (dropdown), `indent_size` (int, 1–8)  
**Outputs:** `formatted_text` (STRING)

**Format Modes:**
- **Pretty JSON** — Standard indented JSON with proper line breaks
- **Readable Text** — Human-friendly labeled sections with nested indentation (e.g. `Scene: ...`, `Color Palette:`, `  Tile Teal: #20B2AA`)

---
#### � Prompt Box
![Prompt Box](images/duffy_prompt_box.jpg)
*Category: `Duffy/Text`*

A sophisticated multiline text editor with built-in utility buttons for quick text manipulation. Features a clean, spacious interface with Copy, Clear, and Save functionality, plus an optional input socket that can override the text content when connected.

**Inputs:** `optional_input` (STRING, optional), `json_data` (hidden JSON state)  
**Outputs:** `text` (STRING)

**Features:**
- 📝 **Large Multiline Editor** — Spacious text area perfect for complex prompts, descriptions, or documentation
- 📋 **Copy to Clipboard** — One-click button to copy the current text content
- 💾 **Save to File** — Export your text content to a file with automatic timestamp
- ❌ **Quick Clear** — Instantly reset the text area
- 🔌 **Optional Input Override** — When connected, external text input takes precedence over the editor content
- 💾 **State Persistence** — Text content is saved in the workflow for easy reuse and modification

**Use Cases:** Writing and editing complex prompts, preparing multi-paragraph descriptions, documenting workflows, storing reference text, creating reusable prompt templates

---
#### �🔎 Find and Replace Text
![Find and Replace Text](images/find_and_replace.jpg)
*Category: `Duffy/Text`*

Perform literal find-and-replace operations on single-line or multiline strings. Useful for prompt cleanup, token renaming, metadata normalization, and bulk text edits inside a workflow.

**Inputs:** `text` (string, multiline), `find_text` (string), `replace_with` (string), `case_sensitive` (boolean)  
**Outputs:** `text` (STRING)

**Behavior:**
- Replaces all matches across the full input string
- Supports case-sensitive and case-insensitive matching
- Returns the original input unchanged when `find_text` is empty

---
#### �🏷️ LoRA Prompt Combiner
![LoRA Prompt Combiner](images/lora_prompt_combiner.jpg)
*Category: `Duffy/Utilities`*

Intelligently combine base prompts with LoRA tags and weights. Supports advanced formatting and tag injection.

**Inputs:** `base_prompt` (string), `lora_name` (string), `lora_weight` (float), `position` (dropdown)  
**Outputs:** `STRING` (formatted prompt)

**Position Modes:** Prepend, Append, Replace

---

### ⚙️ Workflow
Nodes designed to manage and optimize your ComfyUI canvas execution flow.

#### 🔕 Native Group Muter
![Native Group Muter](images/native_group_muter.jpg)
*Category: `Duffy/Workflow`*

Instantly toggle the mute state of all nodes inside multiple groups on your canvas. Features a clean, auto-updating list of all groups sorted alphabetically.

**Inputs:** `Any` (AnyType, pass-through)  
**Outputs:** `Any` (pass-through)

**Features:**
- 🚫 **Multi-Mute Toggle** — Instantly mute/unmute groups without hunting them down
- 🔄 **Auto-Updating** — Polled widget list automatically stays in sync with your canvas
- 🎯 **Exclusive Mode** — Mutes all other listed groups when one is activated
- 🔤 **Alphanumeric Sort** — Organizes your groups cleanly for easy navigation

---

#### ⏭️ Native Group Bypasser
![Native Group Bypasser](images/native_group_bypasser.jpg)
*Category: `Duffy/Workflow`*

Bypass execution for entire groups of nodes using an interactive multi-toggle UI. Execution skips without clearing memory caches of unaffected nodes.

**Inputs:** `Any` (AnyType, pass-through)  
**Outputs:** `Any` (pass-through)

**Features:**
- ⏭️ **Multi-Bypass Toggle** — Skip entire processing chains with a click
- 🔄 **Auto-Updating** — Polled widget list responds to canvas changes natively
- 🎯 **Exclusive Mode** — Bypasses all other listed groups when one is activated
- 🔤 **Alphanumeric Sort** — Keeps UI organized

---

#### 🔕 Native Single Group Muter
![Native Single Group Muter](images/native_single_group_muter.jpg)
*Category: `Duffy/Workflow`*

Target a single group to mute or unmute using a clean dropdown interface. Perfect for precise, uncluttered workflow control.

**Inputs:** `Any` (AnyType, pass-through)  
**Outputs:** `Any` (pass-through)

**Features:**
- 🔽 **Dropdown Selection** — Pick exactly one group from a sorted list
- 🔘 **Master Toggle** — Clean unified Active/Inactive switch
- 🔄 **Auto-Hydration** — Recreates dropdown automatically when canvas groups change

---

#### ⏭️ Native Single Group Bypasser
![Native Single Group Bypasser](images/native_single_group_bypasser.jpg)
*Category: `Duffy/Workflow`*

Target a single group to bypass using a responsive dropdown interface. Ideal for A/B testing execution branches efficiently.

**Inputs:** `Any` (AnyType, pass-through)  
**Outputs:** `Any` (pass-through)

**Features:**
- 🔽 **Dropdown Selection** — Pick exactly one group from a sorted list
- 🔘 **Master Toggle** — Clean unified Active/Inactive switch
- 🔄 **Auto-Hydration** — Recreates dropdown automatically to circumvent Vue render bugs

---

### 📐 Layout
Frontend utilities for organizing the ComfyUI workspace.

#### 📏 Spatial Alignment Matrix
![Spatial Alignment Matrix](images/spatial_alignment_matrix.jpg)
*Category: `Duffy/Layout`*

A fully frontend utility node for aligning and distributing selected nodes across the canvas. Operates natively or as a Vue component overlay via Nodes 2.0 Selection context menus.

- Supports Top, Bottom, Left, Right, Center-Horizontal, and Center-Vertical alignments based on the bounding box extrema of the selected objects.
- Supports Horizontal and Vertical spacing distributions, pushing nodes intelligently with 20px padding loops.
- Operates totally independently of the graph execution stack (auto-bypassed during backend prompts).

---

### 🤖 LLM & AI Analysis
Powerful multimodal AI analysis using local GGUF models.

#### 🎨 Image Styler
![Image Styler](images/image_styler.jpg)
*Category: `Duffy/LLM`*

A dedicated style-system-prompt generator for multimodal LLM analyzers. Select a visual style and feed the generated `system_prompt` directly into your LLM node to enforce consistent stylistic prompt outputs from the same input image.

**Inputs:** `style` (dropdown)
**Outputs:** `system_prompt` (STRING)

**Features:**
- 🧠 **Style-Locked Prompt Engine** — Generates a strict system prompt that prioritizes the selected style over conflicting default tendencies.
- 🎯 **Per-Style Optimization** — Each style uses dedicated transformation rules, required cues, and forbidden cues for improved reliability.
- 🛡️ **Artifact Suppression** — Enforces pure final-prompt output (no word-count lines, labels, markdown, internal thoughts, or metadata).
- 🖼️ **Adaptive Vue UI** — Compact dropdown + thumbnail preview designed to work in both Legacy LiteGraph and Nodes 2.0 views.
- ⚡ **Deterministic Caching** — Input fingerprinting tracks style selections and prompt asset changes for correct cache invalidation.

**Use Cases:**
- Enforcing one consistent art direction across a batch of different source images.
- Building style-transfer prompt pipelines without manually rewriting system prompts.
- Rapidly testing many visual styles with the same analyzer and input image.

---

#### 🧠 Gemma-4 GGUF Multimodal Analyzer
![Gemma GGUF Analyzer](images/gguf_analyzer.jpg)
*Category: `Duffy/LLM`*

A professional-grade multimodal AI analysis node powered by Google's **Gemma-4-E4B-it** model (GGUF format) via llama.cpp. Perform text, image, video, and audio analysis locally with full GPU acceleration support.

> **⚠️ Important Version Requirement:**  
> **llama-cpp-python version 0.3.35 or later is mandatory.** This is the first version that includes the `Gemma4ChatHandler` required by this node. The official PyPI release (v0.3.20-cu123) **does not work**.
>
> You must manually install a pre-built wheel from **https://github.com/JamePeng/llama-cpp-python/releases** (v0.3.36 available for various CUDA versions).
>
> See **[docs/llm_node_setup.md](docs/llm_node_setup.md)** for step-by-step installation instructions.

**Inputs:** `gguf_model` (dropdown), `mmproj_model` (dropdown), `system_prompt` (multiline string), `user_prompt` (multiline string), `image` (IMAGE, optional), `reference_image` (IMAGE, optional), `video` (IMAGE batch, optional), `audio` (AUDIO, optional), plus 20+ inference parameters
**Outputs:** `analysis_text` (STRING)

**Features:**
- 🖼️ **Multimodal Support** — Analyze text, images, videos, and audio in a single inference
- 🎨 **Built-in Presets** — "Reverse Engineered Prompt" generates detailed image recreation prompts; "Style Transfer Prompt" combines content and style from two images
- 🧠 **Thinking Mode** — Enable extended reasoning for more thoughtful, detailed responses
- ⚡ **GPU Accelerated** — Full CUDA support via llama-cpp-python for 10-100× faster inference
- 🎛️ **Fine-Grained Control** — Temperature, top_p, top_k, repeat_penalty, presence_penalty, frequency_penalty, mirostat, and more
- 📹 **Smart Video Sampling** — Automatically subsamples video frames based on FPS and context window size (max 30 frames)
- 🎵 **Audio Processing** — Supports audio inputs with automatic 16 kHz mono resampling (max 60 seconds)
- 💾 **Model Caching** — Keeps models in VRAM between executions for instant re-runs
- 🔄 **Context Window** — Supports up to 128K tokens (131,072) for long-form analysis
- 🛡️ **Error Handling** — Graceful fallback from Gemma4ChatHandler → Llava16ChatHandler → text-only mode

**Preset Prompts:**
- **Reverse Engineered Prompt**: Analyzes an image and generates a 120-300 word natural-language prompt suitable for recreating it with image generation models. Includes style identification, subject description, composition, lighting, color palette, and mood.
- **Style Transfer Prompt**: Analyzes two images (content + reference style) and generates a prompt to recreate the content in the reference image's visual style, lighting, and mood.

**Inference Parameters:**
- `max_tokens` (1-128000): Maximum response length
- `temperature` (0.0-2.0): Randomness/creativity control
- `top_k` (0-500): Vocabulary sampling limit
- `top_p` (0.0-1.0): Nucleus sampling threshold
- `min_p` (0.0-1.0): Minimum probability threshold
- `repeat_penalty` (0.0-3.0): Repetition reduction
- `presence_penalty` / `frequency_penalty` (-2.0 to 2.0): Token reuse penalties
- `mirostat_mode` (0-2): Adaptive sampling mode
- `seed` (-1 or positive): Reproducibility control
- `n_gpu_layers` (-1 to 200): GPU offload control (-1 = all layers)
- `n_ctx` (512-131072): Context window size
- `video_fps` (0.1-5.0): Video frame sampling rate

**Use Cases:** 
- **Gemma-4-E4B** GGUF model file (e.g., `gemma-4-E4B-it-Q4_K_M.gguf`) in `ComfyUI/models/LLM/`
- Multimodal projector for Gemma-4 (e.g., `mmproj-gemma-4-e4b-it-f16.gguf`) in `ComfyUI/models/LLM/`
- **`llama-cpp-python>=0.3.35`** with CUDA support (mandatory for Gemma4ChatHandler)
- Video content analysis and summarization
- Audio transcription and analysis
- Multimodal question answering (e.g., "What's happening in this video?")
- Batch processing of images for metadata generation
- Creative writing assistance based on visual references

**Requirements:**
- GGUF model file (e.g., `gemma-2-27b-it-Q4_K_M.gguf`) in `ComfyUI/models/LLM/`
- Multimodal projector (e.g., `mmproj-gemma-4-e4b-it-f16.gguf`) in `ComfyUI/models/LLM/`
- `llama-cpp-python>=0.3.35` — **must be installed manually** from a [pre-built wheel](https://github.com/JamePeng/llama-cpp-python/releases) (PyPI v0.3.20-cu123 does not work)
- `numpy>=1.24.0`, `torchaudio>=2.0.0`, `soundfile>=0.12.0`

**Setup Guide:** See [docs/llm_node_setup.md](docs/llm_node_setup.md) for detailed installation instructions, model downloads, VRAM requirements, performance optimization tips, and troubleshooting.

---

## 🎯 Use Cases

### 🎨 Professional Workflow Optimization
- **Batch Processing:** Use Directory Image Iterator + Multi-Pass Sampling for high-volume generation
- **Color Grading:** Image Adjuster provides professional post-processing controls
- **Model Management:** Model Selector simplifies switching between checkpoints

### 🔬 Research & Experimentation
- **Comparative Analysis:** Triple Sampler Scheduler enables side-by-side testing
- **Parameter Sweeps:** Five Float/Int Sliders for multi-dimensional optimization
- **Latent Exploration:** Noise Blender and Klein Noise for creative latent manipulation

### ⚡ Production Pipelines
- **Metadata Tracking:** Save Image with Sidecar for workflow documentation
- **Dynamic Resolution:** Megapixel Resize ensures consistent output sizes
- **Conditional Logic:** Signal Selector and Toggle Switch for smart routing

---

## ⚙️ Requirements

- **ComfyUI** (latest version recommended)
- **Python** 3.10 or higher
- **PyTorch** 2.1.0+
- **torchvision** (latest stable)
- **NumPy** 1.26.0+
- **Pillow** (for image I/O)

All dependencies are automatically installed with ComfyUI. No additional setup required.

---

## 🏗️ Architecture

This node pack is built with **ComfyUI Nodes 2.0** and **Schema V3** standards:

✅ **Stateless Design** - All nodes use `@classmethod` methods, no instance variables  
✅ **Declarative Schema** - Inputs/outputs defined via `define_schema()` with typed `io` objects  
✅ **Proper Caching** - Implements `fingerprint_inputs()` for intelligent cache invalidation  
✅ **Vue-Compatible UI** - Custom widgets use `getCustomWidgets()` API with pointer event capture  
✅ **Type Safety** - Full type hints and proper tensor dimension handling  
✅ **Zero Side Effects** - Pure functions with predictable behavior  

---

## 📝 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Guidelines
- Follow V3 Schema architecture patterns
- Maintain stateless node design
- Include docstrings and type hints
- Test with multiple ComfyUI versions
- Update CHANGELOG.md with changes

---

## 🙏 Acknowledgments

Built with ❤️ for the ComfyUI community.

Special thanks to:
- **comfyanonymous** for creating ComfyUI
- The ComfyUI community for inspiration and feedback
- Contributors and testers

---

## 📞 Support

- **Issues:** Report bugs via [GitHub Issues](https://github.com/yourusername/comfyui-duffy-nodes/issues)
- **Discussions:** Join the conversation on [GitHub Discussions](https://github.com/yourusername/comfyui-duffy-nodes/discussions)
- **Documentation:** Check the [Wiki](https://github.com/yourusername/comfyui-duffy-nodes/wiki) for detailed guides

---

## 📊 Version

Current Version: **0.29.0** (April 19, 2026)

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

---

<div align="center">

**[⬆ Back to Top](#-duffy-nodes---comfyui-custom-node-pack)**

Made with 🎨 by the Duffy Nodes Team

</div>
