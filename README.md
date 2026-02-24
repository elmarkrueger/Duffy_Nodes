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
