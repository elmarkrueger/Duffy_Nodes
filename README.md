# Duffy Nodes

A custom node pack for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) built on the modern **V3 Schema** (`comfy_api.latest`). Every node in this pack is stateless, strictly typed, and fully compatible with the Nodes 2.0 Vue-based frontend — no legacy JavaScript extensions required.

---

## Nodes

### Signal Selector

**Category:** `Duffy / Routing`

Routes one of three inputs to a single output using a mutually exclusive slider. Each channel carries a customizable text label so you can name your signals meaningfully inside the workflow. Thanks to **V3 lazy evaluation**, only the active channel's upstream graph is computed — the two idle branches are skipped entirely, saving processing time and VRAM.

![Signal Selector node](images/signal_selector.jpg)

#### Inputs

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `active_input` | Int (slider 1 – 3) | `1` | Selects which input channel is routed to the output. |
| `Input 1` (`label_1`) | String | `Signal A` | Custom display label for channel 1. |
| `input_1` | Any (optional, lazy) | — | Data connected to channel 1. Evaluated only when `active_input = 1`. |
| `Input 2` (`label_2`) | String | `Signal B` | Custom display label for channel 2. |
| `input_2` | Any (optional, lazy) | — | Data connected to channel 2. Evaluated only when `active_input = 2`. |
| `Input 3` (`label_3`) | String | `Signal C` | Custom display label for channel 3. |
| `input_3` | Any (optional, lazy) | — | Data connected to channel 3. Evaluated only when `active_input = 3`. |

#### Output

| Name | Type | Description |
|------|------|-------------|
| `Selected Signal` | Any | The data from the currently active channel. |

#### How it works

1. Set `active_input` to `1`, `2`, or `3` using the slider on the node.
2. Give each channel a meaningful name via the **Input 1 / Input 2 / Input 3** text fields.
3. Connect your upstream nodes to the corresponding `input_1`, `input_2`, `input_3` ports.
4. Only the branch matching `active_input` is executed; the others are pruned from the evaluation graph by `check_lazy_status`.

#### Use cases

- Quickly A/B/C-test different model samplers, prompts, or image pre-processors without rewiring the graph.
- Build conditional workflow branches controlled by a single slider.
- Route any data type — images, latents, conditioning vectors, strings, custom objects — through the same switch.

### LoRa Prompt Combiner

**Category:** `Duffy / Text`

Combines a LoRa trigger and a main prompt using a customizable separator.

#### Inputs

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `LoRa Trigger` (`lora_trigger`) | String (multiline) | `""` | The trigger words for the LoRa model. |
| `Separator` (`separator`) | String | `,` | The separator to use between the LoRa trigger and the main prompt. |
| `Prompt` (`prompt`) | String (multiline) | `""` | The main prompt text. |

#### Output

| Name | Type | Description |
|------|------|-------------|
| `Combined Prompt` | String | The combined prompt text. |

### Five Float Sliders

**Category:** `Duffy / Math`

Provides five float sliders (0.0 to 1.0) with customizable labels. The output descriptions and slider labels dynamically update to match the user-defined labels.

#### Inputs

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `Label 1-5` (`label_1` to `label_5`) | String | `Value 1-5` | Custom labels for each slider. |
| `Value 1-5` (`value_1` to `value_5`) | Float (slider 0.0 – 1.0) | `0.5` | Float values for each slider. |

#### Output

| Name | Type | Description |
|------|------|-------------|
| `Value 1-5` (`out_1` to `out_5`) | Float | The float values from the sliders. |

### Five Int Sliders

**Category:** `Duffy / Math`

Provides five integer sliders (1 to 100) with customizable labels. The output descriptions and slider labels dynamically update to match the user-defined labels.

#### Inputs

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `Label 1-5` (`label_1` to `label_5`) | String | `Value 1-5` | Custom labels for each slider. |
| `Value 1-5` (`value_1` to `value_5`) | Int (slider 1 – 100) | `50` | Integer values for each slider. |

#### Output

| Name | Type | Description |
|------|------|-------------|
| `Value 1-5` (`out_1` to `out_5`) | Int | The integer values from the sliders. |

### Multi-Pass Sampling

**Category:** `Duffy / Sampling`

Configures filename, filepath, denoise values, and step counts for multi-pass sampling workflows. All parameters are exposed as individual outputs so they can be wired directly into downstream sampler nodes.

#### Inputs

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `Filename` (`filename`) | String | `Sampling_Output` | Output filename for the sampling result. |
| `Filepath` (`filepath`) | String | `./ComfyUI/output` | Output directory path. |
| `Denoise Value 1` (`denoise_1`) | Float (slider 0.0 – 1.0) | `1.00` | Denoise strength for pass 1. |
| `Denoise Value 2` (`denoise_2`) | Float (slider 0.0 – 1.0) | `0.75` | Denoise strength for pass 2. |
| `Denoise Value 3` (`denoise_3`) | Float (slider 0.0 – 1.0) | `0.50` | Denoise strength for pass 3. |
| `Steps Sampler 1` (`steps_1`) | Int (slider 1 – 100) | `20` | Sampling steps for pass 1. |
| `Steps Sampler 2` (`steps_2`) | Int (slider 1 – 100) | `20` | Sampling steps for pass 2. |
| `Steps Sampler 3` (`steps_3`) | Int (slider 1 – 100) | `20` | Sampling steps for pass 3. |

#### Outputs

| Name | Type | Description |
|------|------|-------------|
| `Filename` | String | The configured filename. |
| `Filepath` | String | The configured filepath. |
| `Denoise Value 1-3` | Float | Denoise strength for each pass. |
| `Steps Sampler 1-3` | Int | Step count for each pass. |

---

## Installation

### Via ComfyUI Manager *(recommended)*

Search for **Duffy Nodes** inside ComfyUI Manager and click **Install**.

### Manual

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/duffy/comfyui-duffy-nodes
cd comfyui-duffy-nodes
pip install -r requirements.txt
```

Restart ComfyUI. The nodes will appear under the **Duffy** category in the node browser.

---

## Requirements

| Dependency | Minimum version |
|------------|-----------------|
| Python | 3.10 |
| PyTorch | 2.1.0 |
| NumPy | 1.26.0 |
| ComfyUI | Nodes 2.0 (V3 Schema) |

---

## Architecture

All nodes are built on the **ComfyUI V3 Schema** (`comfy_api.latest.io`):

- **Stateless execution** — every run is a pure function of its inputs; no hidden state between queue passes.
- **Declarative schema** — inputs, outputs, and UI widgets are defined once in `define_schema()`. The Vue frontend auto-generates the UI from that definition with no JavaScript needed.
- **Lazy evaluation** — `check_lazy_status` tells the ComfyUI scheduler which upstream branches to skip, preventing wasted computation on inactive paths.
- **Async registration** — the extension is loaded through `comfy_entrypoint` / `ComfyExtension.get_node_list()`, isolating startup errors and enabling safe concurrent extension loading.

---

## License

MIT — see [LICENSE](LICENSE) for details.
