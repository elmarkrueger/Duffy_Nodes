# ComfyUI Nodes 2.0 & Schema V3 Copilot Instructions

You are an expert developer specializing in the modern ComfyUI Nodes 2.0 architecture and the Schema V3 (`comfy_api.latest`) Python backend. When generating, reviewing, or refactoring code for this project, you must strictly adhere to the following declarative, stateless, and Vue-compatible guidelines. Do not generate legacy V1 immediate-mode Canvas code or stateful Python classes.

## 1. Python Backend Rules (Schema V3)
* Inherit all custom nodes strictly from the `io.ComfyNode` base class.
* Ensure all nodes are completely stateless; do not utilize `__init__` methods to store instance variables or configurations.
* Define node inputs, outputs, and metadata declaratively using `@classmethod def define_schema(cls) -> io.Schema`.
* Utilize V3 typed objects for schema definitions, such as `io.Image.Input()`, `io.String.Input(multiline=True)`, or `io.Float.Input(display_mode=io.NumberDisplay.slider)`.
* Contain all mathematical and operational logic within a `@classmethod def execute(cls, ...)` method.
* Register extensions asynchronously by defining an `async def comfy_entrypoint()` function that returns an instance of `io.ComfyExtension`.
* Process image tensors strictly in the `[B, C, H, W]` dimension format.
* Maintain image tensor floating-point values normalized between `0.0` and `1.0`.
* Control caching invalidation by implementing `@classmethod def fingerprint_inputs(cls, ...)` rather than relying on legacy methods.

## 2. Frontend & Styling Rules (Nodes 2.0 Vue Architecture)
* Register all JavaScript extensions using the `app.registerExtension({ name: "...", ... })` pattern.
* Verify the node identity in lifecycle hooks by checking `if (node.comfyClass !== "YourTargetNodeClass") return;` to prevent styling bleed.
* Inject custom DOM elements exclusively through the `getCustomWidgets()` API contract.
* Include the `capturePointerEvents: true` and `captureWheelEvents: true` flags in custom widgets to prevent global canvas dragging and zooming conflicts.
* Include `stretch: true` and define a `minHeight` integer in custom widgets to prevent Vue's flexbox from crushing the DOM element.
* Modify programmatic appearance properties like `node.color`, `node.bgcolor`, and `node.size` within the `async nodeCreated(node)` lifecycle hook.
* Construct context menus declaratively using the `getNodeMenuItems(node)` hook, returning an array of configuration objects rather than mutating arrays.
* Inject external scoped CSS stylesheets during the `setup()` hook by appending a `<link>` element to the document head.

## 3. Strict Anti-Patterns (Do NOT Generate)
* Do not define `INPUT_TYPES`, `RETURN_TYPES`, `RETURN_NAMES`, `FUNCTION`, or `CATEGORY` as class dictionaries or tuples.
* Do not register nodes by mutating `NODE_CLASS_MAPPINGS` or `NODE_DISPLAY_NAME_MAPPINGS`.
* Do not use the legacy `IS_CHANGED` class method.
* Do not override `onDrawForeground` or `node.__proto__.onDrawForeground` to execute native Canvas API drawing commands.
* Do not imperatively push items into `nodeType.prototype.getExtraMenuOptions`.
* Do not execute global DOM queries like `document.getElementById` expecting Vue elements to be fully mounted during early instantiation phases.

---

## 4. Boilerplate Templates

When instructed to create a new node, utilize the following structural templates.

### Python Backend Template (`__init__.py`)
This boilerplate demonstrates the mandatory stateless V3 architecture, strictly typed schema definitions, and the asynchronous registration pipeline. It also exposes the `WEB_DIRECTORY` for frontend assets.

```python
# __init__.py
from comfy_api.latest import io, ComfyExtension

# Instructs ComfyUI to serve the './js' directory to the frontend
WEB_DIRECTORY = "./js"

class MyCustomNode(io.ComfyNode):
    """A strictly stateless backend node utilizing the Schema V3 architecture."""
    
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="MyCustomNode_V3",
            display_name="My Custom Node",
            category="custom/example",
            inputs={
                "base_value": io.Float.Input(default=1.0, min=0.0, max=100.0, display_mode=io.NumberDisplay.slider),
            },
            outputs={
                "result": io.Float.Output()
            },
        )

    @classmethod
    def execute(cls, base_value: float, **kwargs) -> io.NodeOutput:
        # Execution must remain completely stateless
        result = base_value * 2.0
        return io.NodeOutput(result)

class MyCustomExtension(ComfyExtension):
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [MyCustomNode]

# Asynchronous loading pipeline required by V3
async def comfy_entrypoint() -> MyCustomExtension:
    return MyCustomExtension()

__all__ = ["comfy_entrypoint", "WEB_DIRECTORY"]
```

Vue-Compatible JavaScript Template (./js/widget.js)
This boilerplate illustrates how to correctly inject an isolated DOM element using the getCustomWidgets contract. It actively prevents layout breakage by implementing capturePointerEvents, captureWheelEvents, and stretch.

```javascript
// ./js/widget.js
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ComfyUI.Custom.MyCustomNodeUI",
    
    // 1. Establish the Nodes 2.0 Custom Widget API Contract
    getCustomWidgets() {
        return {
            MY_CUSTOM_WIDGET: {
                element: (() => {
                    const container = document.createElement("div");
                    container.className = "custom-widget-container";
                    container.style.padding = "8px";
                    container.style.backgroundColor = "#353535";
                    container.style.borderRadius = "4px";
                    container.innerText = "Interactive Custom Widget";
                    
                    // Event listeners go here. Because capturePointerEvents is true, 
                    // interactions won't drag the entire node.
                    container.addEventListener("pointerdown", (e) => {
                        console.log("Widget clicked!");
                    });

                    return container;
                })(),
                
                // Explicit structural flags defining Vue compatibility behavior
                capturePointerEvents: true,
                captureWheelEvents: true,
                stretch: true,
                minHeight: 50
            }
        };
    },

    // 2. Programmatic Styling & Widget Binding
    async nodeCreated(node) {
        if (node.comfyClass !== "MyCustomNode_V3") return;

        // Override default LiteGraph theme colors
        node.color = "#2b5c7a"; 
        node.bgcolor = "#1a3a4c";
        
        // Append the custom DOM element registered above
        node.addWidget("MY_CUSTOM_WIDGET", "custom_ui", null, () => {});
        
        // Dynamically recalculate dimensions to fit the new element
        const requiredSize = node.computeSize();
        node.size = [Math.max(200, requiredSize[0]), Math.max(120, requiredSize[1])];
    },

    // 3. Modernized Declarative Context Menu
    getNodeMenuItems(node) {
        if (node.comfyClass !== "MyCustomNode_V3") return;

        return [
            {
                content: "Reset Widget State",
                callback: () => {
                    console.log("Resetting state...");
                    app.graph.setDirtyCanvas(true, true);
                }
            }
        ];
    }
});
```

### Project Configuration Template (`pyproject.toml`)
The V3 architecture strongly relies on `pyproject.toml` for package distribution, dependency isolation, and Comfy Registry indexing. Use this template to define the environment constraints and metadata rather than relying solely on legacy `requirements.txt` files.

```toml
[project]
name = "comfyui-my-custom-nodes"
description = "A modern, stateless custom node suite for ComfyUI using the V3 schema."
version = "1.0.0"
license = "Apache-2.0"
# ComfyUI's modern ecosystem generally targets Python 3.10+
requires-python = ">=3.10"
dependencies = [
    "torch>=2.1.0",
    "numpy>=1.26.0",
    "pillow"
]

[project.urls]
Repository = "[https://github.com/yourusername/comfyui-my-custom-nodes](https://github.com/yourusername/comfyui-my-custom-nodes)"
Documentation = "[https://github.com/yourusername/comfyui-my-custom-nodes/wiki](https://github.com/yourusername/comfyui-my-custom-nodes/wiki)"

# Metadata specifically parsed by the ComfyUI Registry and modern managers
[tool.comfy]
PublisherId = "your-developer-namespace"
DisplayName = "My Custom Nodes Suite"
Icon = "[https://raw.githubusercontent.com/yourusername/comfyui-my-custom-nodes/main/assets/icon.png](https://raw.githubusercontent.com/yourusername/comfyui-my-custom-nodes/main/assets/icon.png)"
```
