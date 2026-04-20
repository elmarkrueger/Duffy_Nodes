# LLM Node Setup Guide

## Gemma-4 GGUF Multimodal Analyzer

The **Duffy_GemmaGGUFAnalyzer** node provides powerful multimodal analysis capabilities using Google's **Gemma-4-E4B-it** model (GGUF format) via llama.cpp. This node supports text, image, video, and audio inputs for comprehensive AI-powered analysis.

> **⚠️ Critical Version Requirement:**  
> **llama-cpp-python version 0.3.35 or later is mandatory.** This is the first version that includes the `Gemma4ChatHandler` required for Gemma-4-E4B model support. Earlier versions will not work with this node.
>
> The current official release on PyPI is **v0.3.20-cu123**, which **does not include** the Gemma 4 chat template. You **must** install a pre-built wheel manually (see below).

---

## Prerequisites

### 1. Install llama-cpp-python (Pre-Built Wheel — Required)

Because the official PyPI version of llama-cpp-python (v0.3.20-cu123) does not yet include the Gemma 4 chat template, you must install a pre-built wheel from the community repository:

**Pre-built wheels:** https://github.com/JamePeng/llama-cpp-python/releases

Version **0.3.36** is available for the following CUDA versions:
- CUDA 11.8
- CUDA 12.1
- CUDA 12.4
- CUDA 12.8
- CUDA 13.0

#### Standard Python Environment (pip / venv)

1. Go to https://github.com/JamePeng/llama-cpp-python/releases
2. Download the `.whl` file matching your **Python version** and **CUDA version** (e.g., `llama_cpp_python-0.3.36+cu124-cp311-cp311-win_amd64.whl` for Python 3.11 + CUDA 12.4)
3. Install the wheel:

```bash
pip install /path/to/llama_cpp_python-0.3.36+cu124-cp311-cp311-win_amd64.whl --force-reinstall --no-deps
```

> **Tip:** Use `--force-reinstall --no-deps` to ensure a clean installation that replaces any existing version without pulling in unwanted dependencies.

#### ComfyUI Portable / python_embedded

ComfyUI portable installations bundle their own Python interpreter under `python_embedded/`. You must install the wheel into that specific environment:

1. Download the correct `.whl` file from https://github.com/JamePeng/llama-cpp-python/releases matching the Python version inside `python_embedded/` (check with `python_embedded\python.exe --version`)
2. Open a terminal and navigate to your ComfyUI root folder
3. Install using the embedded Python directly:

```powershell
.\python_embedded\python.exe -m pip install "X:\path\to\llama_cpp_python-0.3.36+cu124-cp311-cp311-win_amd64.whl" --force-reinstall --no-deps
```

4. Verify the installation:

```powershell
.\python_embedded\python.exe -c "import llama_cpp; print(llama_cpp.__version__)"
```

This should print `0.3.36` (or the version you installed).

> **Important:** Do **not** use the system `pip` or a different Python — you must target `python_embedded\python.exe` explicitly, otherwise the package will be installed into the wrong environment and ComfyUI will not find it.

#### Verifying CUDA Support

After installation, verify that GPU acceleration is available:

```python
from llama_cpp import Llama
# If this loads without errors, CUDA support is active
```

If you see errors about missing CUDA libraries, ensure your NVIDIA driver and CUDA toolkit version match the wheel you downloaded.

### 2. Install Remaining Dependencies

The following Python packages are also required and are included in `requirements.txt`:

```bash
pip install numpy>=1.24.0 torchaudio>=2.0.0 soundfile>=0.12.0
```

### 2. Download Model Files

You need two files for multimodal operation with **Gemma-4-E4B**:

1. **The main Gemma-4-E4B GGUF model** (e.g., `gemma-2-27b-it-Q4_K_M.gguf`)
2. **The Gemma-4 multimodal projector** (e.g., `mmproj-gemma-4-e4b-it-f16.gguf`)

**Where to download:**
- Official Gemma models: [Google AI Studio](https://ai.google.dev/)
- Quantized GGUF versions: [Hugging Face](https://huggingface.co/) (search for "Gemma GGUF")
- Community models: Check ComfyUI Discord or forums for recommended quantizations

### 3. Place Models in ComfyUI

Both files must be placed in the `models/LLM/` directory within your ComfyUI installation:

```
ComfyUI/
└── models/
    └── LLM/
        ├── gemma-2-27b-it-Q4_K_M.gguf
        └── mmproj-gemma-4-e4b-it-f16.gguf
```

**Note:** If the `LLM` folder doesn't exist, create it manually.

---

## Node Features

### Supported Input Types

- **Text**: System prompts, user prompts, and custom instructions
- **Image**: Single images for analysis or prompt generation
- **Reference Image**: For style transfer operations
- **Video**: Frame sequences (automatically sampled to fit context window)
- **Audio**: Audio waveforms (resampled to 16 kHz mono for compatibility)

### Built-in Preset Prompts

1. **Reverse Engineered Prompt**: Analyzes an image and generates a detailed natural-language prompt suitable for recreating it with an image generation model
2. **Style Transfer Prompt**: Analyzes two images (content + style) and generates a prompt to recreate the content in the reference style

### Key Parameters

- **`n_gpu_layers`**: Number of model layers to offload to GPU
  - `-1` = offload all layers (recommended for NVIDIA GPUs)
  - `0` = CPU-only inference (slow but works without GPU)
  - Adjust based on your VRAM capacity

- **`n_ctx`**: Context window size (tokens)
  - Default: `8192`
  - Gemma-4 supports up to `131072` (128K context)
  - Larger contexts require more VRAM

- **`enable_thinking`**: Enables extended reasoning mode
  - When enabled, the model performs internal "thinking" before responding
  - Produces more thoughtful, detailed responses
  - Increases inference time and token usage

- **`strip_thinking_tags`**: Removes `<think>...</think>` blocks from output
  - Recommended when you only want the final answer
  - Disable to see the model's reasoning process

- **`unload_model`**: Aggressively frees VRAM/RAM after inference
  - Useful for tight memory situations
  - Reloads model on next execution (slower)

---

## Usage Examples

### Example 1: Image Analysis (Prompt Generation)

1. Add the **Duffy_GemmaGGUFAnalyzer** node to your workflow
2. Connect an image to the `image` input
3. Set `use_custom_prompt` to `False`
4. Select `preset_prompt`: "Reverse Engineered Prompt"
5. Adjust `max_tokens` to `512` or higher (for detailed prompts)
6. Execute the workflow

The node will output a detailed natural-language prompt describing the image.

### Example 2: Style Transfer Prompt

1. Connect your content image to the `image` input
2. Connect your style reference to the `reference_image` input
3. Set `use_custom_prompt` to `False`
4. Select `preset_prompt`: "Style Transfer Prompt"
5. Execute

The output will be a prompt that describes the content image in the style of the reference.

### Example 3: Custom Multimodal Query

1. Set `use_custom_prompt` to `True`
2. Write a custom system prompt (e.g., "You are an expert art critic.")
3. Write a user prompt (e.g., "Describe the artistic techniques used in this painting.")
4. Connect an image
5. Adjust inference parameters (`temperature`, `top_p`, etc.) as needed
6. Execute

---

## Performance Optimization

### GPU vs CPU

- **GPU inference** (with `llama-cpp-python[cuda]`) is **10-100× faster** than CPU
- On modern GPUs (RTX 3060+), expect 10-30 tokens/sec for quantized models
- CPU inference is possible but can be extremely slow (1-3 tokens/sec)

### Quantization Recommendations

- **Q4_K_M**: Best balance of quality and size (recommended for most users)
- **Q5_K_M / Q6_K**: Higher quality, larger file size, more VRAM required
- **Q2_K / Q3_K_M**: Extremely compact but reduced quality

### VRAM Requirements (Approximate)

| Model Size | Quantization | VRAM (n_gpu_layers=-1) |
|------------|--------------|------------------------|
| 9B params  | Q4_K_M       | ~6-8 GB                |
| 27B params | Q4_K_M       | ~16-20 GB              |
| 27B params | Q6_K         | ~24-28 GB              |

Add ~2-4 GB for the multimodal projector and context buffer.

---

## Troubleshooting

### "GGUF model not found"

- Ensure the `.gguf` file is in `ComfyUI/models/LLM/`
- Check that the filename matches exactly (case-sensitive on Linux/macOS)
- Restart ComfyUI to refresh the model list

### "Model loaded WITHOUT multimodal projector"

- The mmproj file is missing or incompatible
- Ensure both the model and mmproj are from the same Gemma-4 version
- Download the correct mmproj from the same source as your model

### Slow Inference / Out of Memory

- Reduce `n_ctx` (e.g., from 8192 to 4096 or 2048)
- Use a more aggressive quantization (Q4_K_M instead of Q6_K)
- Reduce `n_gpu_layers` if you're running out of VRAM
- Enable `unload_model` to free memory between executions

### "llama-cpp-python not found" or Import Errors

- You must manually install a pre-built wheel from https://github.com/JamePeng/llama-cpp-python/releases (the official PyPI version v0.3.20-cu123 does not include the Gemma 4 chat template)
- For ComfyUI portable installs, make sure you install into `python_embedded\` (see Prerequisites above)
- Verify your virtual environment is activated
- On Windows, ensure Visual C++ Build Tools are installed

---

## Advanced Configuration

### Inference Parameter Guide

- **`temperature`**: Controls randomness (0.0 = deterministic, 2.0 = very creative)
- **`top_p`**: Nucleus sampling threshold (0.95 = diverse, 0.5 = focused)
- **`top_k`**: Limits vocabulary to top K tokens (40 is a good default)
- **`repeat_penalty`**: Reduces repetition (1.1-1.3 recommended)
- **`presence_penalty` / `frequency_penalty`**: Penalize token reuse (useful for diverse outputs)

### Context Window Management

- **Video inputs**: Automatically subsampled based on `video_fps` and `n_ctx`
  - At 1.0 FPS, expect ~4 frames per second of video
  - Maximum 30 frames to prevent context overflow
  
- **Audio inputs**: Limited to 60 seconds
  - Automatically resampled to 16 kHz mono
  - Longer audio requires splitting

---

## Known Limitations

- **Model compatibility**: This node is specifically designed for **Gemma-4-E4B** models in GGUF format. Other models may not work correctly or may require fallback handlers.
- **Version requirement**: Requires `llama-cpp-python>=0.3.35` with Gemma4ChatHandler support. The official PyPI release (v0.3.20-cu123) does not work — a pre-built wheel must be installed manually from [JamePeng/llama-cpp-python](https://github.com/JamePeng/llama-cpp-python/releases).
- **Video**: Only supports batch image tensors `[F, H, W, 3]` (not native video files)
- **Audio**: Maximum 60-second duration
- **Model format**: Only GGUF models are supported (not PyTorch `.safetensors`)

---

## Additional Resources

- [llama.cpp GitHub](https://github.com/ggerganov/llama.cpp)
- [llama-cpp-python Documentation](https://llama-cpp-python.readthedocs.io/)
- [Gemma Model Cards](https://ai.google.dev/gemma)
- [GGUF Model Zoo (Hugging Face)](https://huggingface.co/models?library=gguf)

---

## Support

For issues specific to this node, please report them on the [Duffy Nodes GitHub repository](https://github.com/your-repo/Duffy_Nodes).

For general ComfyUI questions, visit the [ComfyUI Discord](https://discord.gg/comfyui) or [forum](https://www.comfy.org/).
