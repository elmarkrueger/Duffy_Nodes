# ComfyUI Nodes 2.0 & Schema V3 GEMINI Instructions

You are an expert developer specializing in the modern ComfyUI Nodes 2.0 architecture and the Schema V3 (`comfy_api.latest`) Python backend. When generating, reviewing, or refactoring code for this project, you must strictly adhere to the following declarative, stateless, and Vue-compatible guidelines. Do not generate legacy V1 immediate-mode Canvas code or stateful Python classes.

## 0. Development Environment Context

**IMPORTANT:** This repository is NOT part of an active ComfyUI installation. It is a standalone development workspace exclusively for creating and testing new custom nodes for the Custom Node Pack.

### Reference ComfyUI Installation
A complete ComfyUI installation is available at `D:\comfy_for_agent` for research and reference purposes. When developing custom nodes or researching the V3 Schema API:

* **Primary API Reference:** `D:\comfy_for_agent\ComfyUI\comfy_api\latest\_io.py` contains the authoritative Schema V3 type definitions, input/output specifications, and the complete `io` module interface for Node 2.0 development.
* Use this reference installation to verify API signatures, explore available input types, and understand the complete V3 architecture.
* All nodes developed in this workspace should conform to the patterns and types defined in the reference installation's `comfy_api.latest` module.

---

## 1. Project Structure & Naming Conventions

### File Organization
* Each node lives in its own file under `nodes/` (e.g., `nodes/my_new_node.py`).
* All node classes are registered in `nodes/__init__.py` via the `NODE_LIST` array.
* The root `__init__.py` contains the `DuffyNodesExtension(ComfyExtension)` class and `comfy_entrypoint()`.
* Frontend JavaScript files go in `web/js/` (one per node that needs custom UI).
* The root `WEB_DIRECTORY = "./web"` serves the entire `web/` folder to the frontend.

### Naming Conventions
* **Python class names:** `Duffy<PascalCaseName>` (e.g., `DuffyImageStitch`, `DuffyFloatMath`).
* **Schema `node_id`:** `"Duffy_<PascalCaseName>"` (e.g., `"Duffy_ImageStitch"`, `"Duffy_FloatMath"`).
* **Schema `category`:** `"Duffy/<Subcategory>"` (e.g., `"Duffy/Image"`, `"Duffy/Math"`, `"Duffy/Latent"`).
* **JS extension names:** `"Duffy.<PascalCaseName>"` (e.g., `"Duffy.ImageStitch"`, `"Duffy.Seed"`).
* **Python filenames:** `snake_case.py` matching the node's purpose.

### Node Registration (Adding a New Node)
1. Create `nodes/my_node.py` with the `DuffyMyNode(io.ComfyNode)` class.
2. In `nodes/__init__.py`, add `from .my_node import DuffyMyNode` and append it to `NODE_LIST`.
3. If the node needs frontend JS, create `web/js/my_node.js`.

---

## 2. Python Backend Rules (Schema V3)

### Core Architecture
* Inherit all custom nodes strictly from the `io.ComfyNode` base class.
* Ensure all nodes are completely stateless; do not utilize `__init__` methods to store instance variables or configurations.
* Define node inputs, outputs, and metadata declaratively using `@classmethod def define_schema(cls) -> io.Schema`.
* Contain all logic within a `@classmethod def execute(cls, ...)` method.
* Always accept `**kwargs` in `execute()` to future-proof against additional framework-injected parameters.

### Schema Definition — List-Style Inputs (MANDATORY)
All schemas in this project use **list-style** inputs and outputs with the `id` as the first positional argument. Do NOT use dict-style `inputs={}` — use `inputs=[]`:

```python
@classmethod
def define_schema(cls) -> io.Schema:
    return io.Schema(
        node_id="Duffy_MyNode",
        display_name="My Node",
        category="Duffy/Example",
        description="Brief description of what this node does.",
        inputs=[
            io.Float.Input("value", display_name="Value", default=1.0, min=0.0, max=100.0,
                           display_mode=io.NumberDisplay.slider, tooltip="Adjustment value"),
            io.String.Input("label", display_name="Label", default="default"),
            io.Image.Input("image", display_name="Image"),
        ],
        outputs=[
            io.Float.Output("result", display_name="Result"),
            io.Image.Output("image", display_name="Image"),
        ],
    )
```

### Schema Options Reference
Key `io.Schema()` parameters used in this project:
* `is_output_node=True` — marks the node as a terminal output (e.g., `save_image_sidecar.py`).
* `is_input_list=True` — the node receives entire lists in a single `execute()` call (e.g., `iterator_current_filename.py`).
* `hidden=[io.Hidden.unique_id, io.Hidden.prompt, io.Hidden.extra_pnginfo]` — request system metadata.
* `not_idempotent=True` — disables result caching entirely.

### Image Tensor Format (CRITICAL)
* **ComfyUI image tensors are `[B, H, W, C]`** (batch, height, width, channels), NOT `[B, C, H, W]`.
* Values are float32 normalized between `0.0` and `1.0`.
* **`comfy.utils.common_upscale()` expects `[B, C, H, W]`** — convert with `.movedim(-1, 1)` before calling and `.movedim(1, -1)` after:
  ```python
  bchw = image.movedim(-1, 1)                    # [B,H,W,C] → [B,C,H,W]
  scaled = comfy.utils.common_upscale(bchw, w, h, "lanczos", crop="disabled")
  result = scaled.movedim(1, -1)                  # [B,C,H,W] → [B,H,W,C]
  ```
* **Latent tensors** use `{"samples": tensor}` dict format where the tensor IS `[B, C, H, W]`.
* When using `torchvision` transforms, permute to `[B, C, H, W]` and back:
  ```python
  tensor = image.permute(0, 3, 1, 2)  # for torchvision
  tensor = tensor.permute(0, 2, 3, 1)  # back to ComfyUI format
  tensor = torch.clamp(tensor, 0.0, 1.0)
  ```
* **PIL ↔ Tensor conversions:**
  ```python
  # Tensor → PIL (per batch item)
  img_np = (img_tensor.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
  pil_img = Image.fromarray(img_np)
  # PIL → Tensor
  tensor = torch.from_numpy(np.array(pil_img).astype(np.float32) / 255.0).unsqueeze(0)
  ```
* **Always handle EXIF orientation** before processing PIL images:
  ```python
  img = ImageOps.exif_transpose(img)
  ```
* **Empty/fallback tensor:** `torch.zeros((1, 64, 64, 3), dtype=torch.float32)`

### Mask Tensor Format
* Masks are `[B, H, W]` (no channel dimension), float32 in `[0.0, 1.0]`.
* Alpha channel extraction inverts: `mask = 1.0 - alpha` (black = opaque in ComfyUI).

### Execute Return Patterns
Always return `io.NodeOutput(...)`. Output argument order must match schema `outputs=[]` order:

```python
# Single output
return io.NodeOutput(result)

# Multiple outputs (positional, matching schema order)
return io.NodeOutput(image, mask, width, height)

# Unpacking a list of outputs
return io.NodeOutput(*output_tensors)

# Output node with UI preview (no regular outputs)
return io.NodeOutput(ui=ui.PreviewImage(images, cls=cls))

# Output node with both outputs and UI
return io.NodeOutput(image_tensor, ui=ui.PreviewImage(images, cls=cls))

# Latent output (dict format)
return io.NodeOutput({"samples": latent_tensor}, width, height)
```

### Cache Control: `fingerprint_inputs`
Replaces legacy `IS_CHANGED`. Return a deterministic value — same return = cache hit, different = re-execute.

```python
# Simple: concatenate relevant input values
@classmethod
def fingerprint_inputs(cls, text: str, mode: str, size: int, **kwargs) -> str:
    return f"{text}|{mode}|{size}"

# File-based: hash file contents for change detection
@classmethod
def fingerprint_inputs(cls, image, **kwargs) -> str:
    image_path = folder_paths.get_annotated_filepath(image)
    m = hashlib.sha256()
    with open(image_path, "rb") as f:
        m.update(f.read())
    return m.hexdigest()

# Tensor-based: hash shapes and metadata
@classmethod
def fingerprint_inputs(cls, **kwargs) -> str:
    m = hashlib.sha256()
    for i in range(1, SLOTS + 1):
        t = kwargs.get(f"image_{i}")
        if t is not None:
            m.update(f"img{i}:{list(t.shape)}".encode())
    return m.digest().hex()

# Force re-execution (e.g., random seeds)
@classmethod
def fingerprint_inputs(cls, seed: int, **kwargs) -> str:
    if seed in SPECIAL_SEEDS:
        return str(random.randint(0, 2**53))  # Always different
    return str(seed)
```

### Input Validation: `validate_inputs`
Return `True` for valid inputs or an error string to block execution:

```python
@classmethod
def validate_inputs(cls, **kwargs):
    for i in range(1, 10):
        name = kwargs.get(f"image_{i}", "none")
        if name and name != "none":
            if not folder_paths.exists_annotated_filepath(name):
                return f"Invalid image file for slot {i}: {name}"
    return True
```

### Lazy Evaluation: `check_lazy_status`
For routing/switching nodes, mark inputs as `lazy=True` and implement `check_lazy_status` to skip unused branches:

```python
# Schema
io.Custom("*").Input("input_1", display_name="Input 1", optional=True, lazy=True),
io.Custom("*").Input("input_2", display_name="Input 2", optional=True, lazy=True),

# Only compute the active branch
@classmethod
def check_lazy_status(cls, active_input: int, **kwargs) -> list[str]:
    if active_input == 1:
        return ["input_1"]
    return ["input_2"]
```

### Wildcard/Any Type for Polymorphic Routing
Use `io.Custom("*")` to accept or output any data type (images, latents, text, etc.):

```python
AnyType = io.Custom("*")
inputs=[
    AnyType.Input("input_1", display_name="Input 1", optional=True, lazy=True),
]
outputs=[
    AnyType.Output("output", display_name="Output"),
]
```

### List Input/Output for Batch Processing
Pair `is_input_list=True` on the schema with `is_output_list=True` on individual outputs:

```python
io.Schema(
    node_id="Duffy_MyBatchNode",
    is_input_list=True,
    inputs=[io.String.Input("filename", display_name="Filename")],
    outputs=[io.String.Output("result", display_name="Result", is_output_list=True)],
)

@classmethod
def execute(cls, filename: list[str], **kwargs) -> io.NodeOutput:
    return io.NodeOutput([os.path.splitext(f)[0] for f in filename])
```

### Hidden System Inputs
Request system metadata via the `hidden` parameter on the schema:

```python
hidden=[io.Hidden.unique_id, io.Hidden.prompt, io.Hidden.extra_pnginfo]

# Access in execute via cls.hidden
@classmethod
def execute(cls, seed: int = 0, **kwargs) -> io.NodeOutput:
    unique_id = cls.hidden.unique_id
    extra_pnginfo = cls.hidden.extra_pnginfo
    prompt = cls.hidden.prompt
```

### Optional Inputs
Use `optional=True` — the value will be `None` in `execute()` when not connected:

```python
io.Model.Input("model", display_name="Model", optional=True),
io.Custom("SIGMAS").Input("sigmas", display_name="Sigmas", optional=True),

@classmethod
def execute(cls, required_param, model=None, sigmas=None, **kwargs):
    if model is not None and sigmas is not None:
        # use them
```

### Programmatic Schema Generation
For nodes with repeating input patterns, build lists dynamically:

```python
inputs = []
outputs = []
for i in range(1, 6):
    inputs.append(io.String.Input(f"label_{i}", display_name=f"Label {i}", default=f"Slider {i}"))
    inputs.append(io.Float.Input(f"value_{i}", display_name=f"Value {i}", default=0.5,
                                  min=0.0, max=1.0, step=0.01, display_mode=io.NumberDisplay.slider))
    outputs.append(io.Float.Output(f"out_{i}", display_name=f"Output {i}"))
```

### Frontend-Only Inputs
For inputs that appear as widgets but should not affect caching:
1. Mark with `socketless=True, optional=True`.
2. Exclude from `fingerprint_inputs()` return value.

### ComfyUI Utility Imports
```python
import comfy.utils                         # common_upscale(), ProgressBar, etc.
import comfy.samplers                      # KSampler.SAMPLERS, KSampler.SCHEDULERS
import folder_paths                        # get_input_directory(), get_annotated_filepath(), etc.
import node_helpers                        # pillow() wrapper for safe PIL operations
from comfy_api.latest import io, ui        # V3 schema types and UI output classes
from server import PromptServer            # For custom API route registration
```

### Custom API Route Registration
For nodes needing backend HTTP endpoints (e.g., folder browsing):

```python
from server import PromptServer
from aiohttp import web

async def my_api_handler(request):
    data = await request.json()
    result = process(data)
    return web.json_response(result)

try:
    if PromptServer.instance is not None:
        PromptServer.instance.routes.post("/my_node/endpoint")(my_api_handler)
except Exception:
    pass  # Graceful fallback if PromptServer unavailable
```

---

## 3. Frontend & Styling Rules (Nodes 2.0 Vue Architecture)

### Extension Registration
Register all JavaScript extensions using the `app.registerExtension({ name: "Duffy.<NodeName>", ... })` pattern. Import from the ComfyUI API:

```javascript
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
```

### Lifecycle Hooks (in execution order)
1. **`setup()`** — Global one-time initialization. Used for CSS injection, API interception, or global event listeners.
2. **`async nodeCreated(node)`** — Called when a node is first created. Primary hook for adding DOM widgets, styling, and state initialization. Always guard with `if (node.comfyClass !== "Duffy_MyNode") return;`.
3. **`loadedGraphNode(node)`** — Called when a saved node is loaded from a workflow. Use to restore UI state from saved widget values.
4. **`getNodeMenuItems(node)`** — Return an array of context menu items. Use `null` entries as separators.

### DOM Widget Injection (Primary Pattern)
Use `node.addDOMWidget()` to inject custom HTML elements into nodes. This is the proven pattern used across all complex nodes in this project:

```javascript
async nodeCreated(node) {
    if (node.comfyClass !== "Duffy_MyNode") return;

    const container = document.createElement("div");
    Object.assign(container.style, {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "8px",
        backgroundColor: "#222",
        borderRadius: "8px",
        boxSizing: "border-box",
    });

    // CRITICAL: Prevent canvas drag/zoom when interacting with widget
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());

    const domWidget = node.addDOMWidget("my_widget_id", "custom", container, {
        serialize: false,      // Don't persist DOM state in workflow
        hideOnZoom: false,     // Keep visible at all zoom levels
    });

    // Define the widget's size request
    domWidget.computeSize = () => [300, 200];  // [width, height]

    // Recalculate node dimensions
    requestAnimationFrame(() => {
        const size = node.computeSize();
        node.size = [Math.max(300, size[0]), Math.max(200, size[1])];
    });
}
```

### Button Widgets
For simple action buttons, use `node.addWidget()`:

```javascript
node.addWidget("button", "🎲 Randomize", "", () => {
    // action
}, { serialize: false });
```

### Hidden Widget Pattern
To hide a backend schema widget from the node UI while keeping it functional for value storage:

```javascript
const widget = node.widgets?.find(w => w.name === "my_hidden_param");
if (widget) {
    widget.type = "hidden";
    widget.computeSize = () => [0, 0];
}
// Later, sync value from custom UI element back to the hidden widget:
widget.value = newValue;
```

### Output Label Syncing
Keep output port labels in sync with widget values (e.g., for slider label nodes):

```javascript
function syncLabels(node) {
    for (let i = 0; i < node.outputs.length; i++) {
        const labelWidget = node.widgets.find(w => w.name === `label_${i + 1}`);
        if (labelWidget && node.outputs[i]) {
            node.outputs[i].name = labelWidget.value;
            node.outputs[i].label = labelWidget.value;
        }
    }
    app.graph.setDirtyCanvas(true, true);
}
```

### Widget Callback Wrapping
Wrap existing widget callbacks without breaking them:

```javascript
const widget = node.widgets.find(w => w.name === "my_widget");
if (widget) {
    const origCb = widget.callback;
    widget.callback = function(value) {
        if (origCb) origCb.apply(this, arguments);
        // additional logic
        syncLabels(node);
    };
}
```

### State Management
* **Closure-scoped state** (preferred for complex nodes): Declare local variables inside `nodeCreated` that are captured by inner functions.
* **Node-attached state:** Use `node._duffyMyNode = { ... }` for state that must survive across hooks. Always guard against reinitialization:
  ```javascript
  if (node._duffyMyNodeInit) return;
  node._duffyMyNodeInit = true;
  ```

### Enforcing Minimum Node Dimensions

```javascript
const MIN_W = 360, MIN_H = 180;
const origOnResize = node.onResize;
node.onResize = function(size) {
    size[0] = Math.max(MIN_W, size[0]);
    size[1] = Math.max(MIN_H, size[1]);
    origOnResize?.call(this, size);
};
```

### CSS Styling (Inline Only)
All styling in this project is inline — no external CSS files. Use `Object.assign()` for complex styles or `.cssText` for one-liners:

```javascript
// Object.assign for complex styles
Object.assign(element.style, {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    padding: "10px",
    borderRadius: "8px",
});

// Color constants for theme consistency
const COLORS = { header: "#2B4E5C", body: "#1A2F38", accent: "#4ea8de", text: "#ddd" };
```

### Backend Communication

```javascript
// API fetch (using ComfyUI's built-in api module)
const response = await api.fetchApi("/my_node/endpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "value" }),
});
const data = await response.json();

// Image upload to ComfyUI input directory
async function uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", "input");
    formData.append("subfolder", "");
    const resp = await api.fetchApi("/upload/image", { method: "POST", body: formData });
    const data = await resp.json();
    return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

// Load image metadata via /view endpoint
const params = new URLSearchParams({ filename: name, type: "input", subfolder: subfolder });
img.src = `/view?${params.toString()}`;
```

### Prompt Interception (Advanced)
For nodes that need to modify the prompt before execution (e.g., special seed handling):

```javascript
async setup() {
    const origQueuePrompt = api.queuePrompt.bind(api);
    api.queuePrompt = async function(number, data) {
        const { output, workflow } = data;
        // Modify output/workflow as needed
        return origQueuePrompt(number, data);
    };
}
```

### Context Menu Declaration

```javascript
getNodeMenuItems(node) {
    if (node.comfyClass !== "Duffy_MyNode") return;
    return [
        { content: "Action One", callback: () => { /* ... */ } },
        null,  // separator
        { content: "Action Two", callback: () => { /* ... */ } },
    ];
}
```

### Combo Widget Value Synchronization
When programmatically setting combo widget values, ensure the option exists:

```javascript
function setComboValue(widget, value) {
    if (!widget) return;
    if (widget.options?.values && !widget.options.values.includes(value) && value !== "none") {
        widget.options.values.push(value);
    }
    widget.value = value;
}
```

---

## 4. Strict Anti-Patterns (Do NOT Generate)
* Do not define `INPUT_TYPES`, `RETURN_TYPES`, `RETURN_NAMES`, `FUNCTION`, or `CATEGORY` as class dictionaries or tuples.
* Do not register nodes by mutating `NODE_CLASS_MAPPINGS` or `NODE_DISPLAY_NAME_MAPPINGS`.
* Do not use the legacy `IS_CHANGED` class method.
* Do not override `onDrawForeground` or `node.__proto__.onDrawForeground` to execute native Canvas API drawing commands.
* Do not imperatively push items into `nodeType.prototype.getExtraMenuOptions`.
* Do not execute global DOM queries like `document.getElementById` expecting Vue elements to be fully mounted during early instantiation phases.
* Do not use dict-style `inputs={}` in `define_schema` — use list-style `inputs=[]`.
* Do not use `getCustomWidgets()` for DOM injection — use `node.addDOMWidget()` inside `nodeCreated`.
* Do not return raw tuples from `execute()` — always use `io.NodeOutput(...)`.
* Do not store state in `self` or `cls` — nodes must be completely stateless.
* Do not mutate input tensors or dicts directly — always `.clone()` or `.copy()` before modifying.

---

## 5. Boilerplate Templates

### Python Node Template (`nodes/my_node.py`)

```python
import torch
from comfy_api.latest import io

class DuffyMyNode(io.ComfyNode):
    """Brief description of this node's purpose."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_MyNode",
            display_name="My Node",
            category="Duffy/Example",
            description="What this node does in one sentence.",
            inputs=[
                io.Float.Input("value", display_name="Value", default=1.0,
                               min=0.0, max=10.0, step=0.1,
                               display_mode=io.NumberDisplay.slider),
                io.Image.Input("image", display_name="Image"),
            ],
            outputs=[
                io.Image.Output("image", display_name="Image"),
            ],
        )

    @classmethod
    def execute(cls, value: float, image: torch.Tensor, **kwargs) -> io.NodeOutput:
        result = torch.clamp(image * value, 0.0, 1.0)
        return io.NodeOutput(result)
```

### JavaScript Frontend Template (`web/js/my_node.js`)

```javascript
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

app.registerExtension({
    name: "Duffy.MyNode",

    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_MyNode") return;

        // Optional: Set node colors
        node.color = "#2B4E5C";
        node.bgcolor = "#1A2F38";

        // Build custom DOM widget
        const container = document.createElement("div");
        Object.assign(container.style, {
            width: "100%",
            padding: "8px",
            backgroundColor: "#222",
            borderRadius: "6px",
            boxSizing: "border-box",
        });

        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());

        const domWidget = node.addDOMWidget("my_ui", "custom", container, {
            serialize: false,
            hideOnZoom: false,
        });
        domWidget.computeSize = () => [300, 100];

        requestAnimationFrame(() => {
            const size = node.computeSize();
            node.size = [Math.max(300, size[0]), Math.max(150, size[1])];
        });
    },

    loadedGraphNode(node) {
        if (node.comfyClass !== "Duffy_MyNode") return;
        // Restore UI state from saved widget values
    },

    getNodeMenuItems(node) {
        if (node.comfyClass !== "Duffy_MyNode") return;
        return [
            { content: "My Action", callback: () => { /* ... */ } },
        ];
    },
});
```

### Registration in `nodes/__init__.py`

```python
from .my_node import DuffyMyNode

NODE_LIST = [
    # ... existing nodes ...
    DuffyMyNode,
]
```
