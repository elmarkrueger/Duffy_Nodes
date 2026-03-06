# 🎨 Duffy Nodes - ComfyUI Custom Node Pack

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ComfyUI](https://img.shields.io/badge/ComfyUI-Nodes%202.0-blue)](https://github.com/comfyanonymous/ComfyUI)
[![Schema V3](https://img.shields.io/badge/Schema-V3-green)](https://github.com/comfyanonymous/ComfyUI)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)

A comprehensive collection of custom nodes for ComfyUI, built with the modern **Nodes 2.0 V3 Schema** architecture. This pack provides essential utilities, advanced image processing, flexible primitives, and powerful workflow helpers designed for professional AI art generation pipelines.

---

## ✨ Features

🚀 **Modern Architecture** - Built with ComfyUI Nodes 2.0 and Schema V3 for maximum performance and compatibility  
🎯 **27+ Professional Nodes** - Carefully crafted tools covering primitives, math, image processing, sampling, and more  
⚡ **GPU Accelerated** - Leverages PyTorch and torchvision for blazing-fast image operations  
🔧 **Stateless Design** - Clean, predictable behavior with proper caching and fingerprinting  
🎨 **Custom UI Widgets** - Enhanced user experience with specialized Vue-compatible interfaces  
📦 **Zero Dependencies** - Works out of the box with your existing ComfyUI installation  

---

## 📦 Installation

### Method 1: ComfyUI Manager (Recommended)
1. Open ComfyUI Manager
2. Search for "Duffy Nodes"
3. Click Install

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

### 🧮 Math Operations
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

Combined image loader and intelligent resizer. Loads images and automatically resizes to target megapixels in one step.

**Inputs:** `image` (file picker), `target_megapixels` (float), `mode` (dropdown)  
**Outputs:** `IMAGE`, `width` (int), `height` (int), `MASK`

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

### 🎲 Latent Operations
Specialized nodes for latent space manipulation and noise generation.

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

#### 📡 Signal Selector
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
#### �🏷️ LoRA Prompt Combiner
![LoRA Prompt Combiner](images/lora_prompt_combiner.jpg)
*Category: `Duffy/Utilities`*

Intelligently combine base prompts with LoRA tags and weights. Supports advanced formatting and tag injection.

**Inputs:** `base_prompt` (string), `lora_name` (string), `lora_weight` (float), `position` (dropdown)  
**Outputs:** `STRING` (formatted prompt)

**Position Modes:** Prepend, Append, Replace

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

Current Version: **0.17.0** (March 6, 2026)

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

---

<div align="center">

**[⬆ Back to Top](#-duffy-nodes---comfyui-custom-node-pack)**

Made with 🎨 by the Duffy Nodes Team

</div>
