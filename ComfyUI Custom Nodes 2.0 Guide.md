# **The Architectural Evolution and Implementation Guide for ComfyUI Custom Nodes Under the Nodes 2.0 V3 Schema**

## **Introduction to the Shifting Paradigm of Visual Inference Engines**

The landscape of generative artificial intelligence has been fundamentally reorganized by the advent of node-based graphical user interfaces, which allow researchers, developers, and artists to construct complex, deterministic, and highly reproducible workflows. Within this rapidly expanding domain, ComfyUI has established itself as the preeminent open-source inference engine and visual programming environment. Its modularity allows operators to orchestrate sophisticated deep learning models—ranging from iterative latent diffusion models like Stable Diffusion and Flux, to advanced audio synthesis frameworks, and complex video generation architectures like AnimateDiff and Hunyuan3D.1 Historically, the foundational architecture of ComfyUI relied on a bifurcated system: the visual frontend was powered by the LiteGraph.js canvas rendering engine, while the computational backend was driven by a stateful, object-oriented Python application programming interface (API), widely referred to as the V1 Schema.2

However, as the complexity of generative computational workflows expanded—frequently incorporating hundreds of interconnected nodes to achieve high-fidelity outputs—the limitations of this legacy architecture became a severe developmental bottleneck.4 The LiteGraph.js canvas, while serviceable for rudimentary graphs, struggled to maintain performance under the immense weight of massive, enterprise-scale workflows.4 From a development perspective, executing seemingly minor modifications to the user interface (UI) required intricate, time-consuming interventions into the core JavaScript, slowing the repository's ability to respond to community feedback and severely complicating custom node development.4

Concurrently, the backend API exhibited architectural vulnerabilities. The V1 Schema required developers to construct custom nodes using stateful Python classes, where variables and configurations were frequently initialized within class instantiation methods (\_\_init\_\_) and mapped via global dictionaries.5 This stateful design complicated horizontal scaling, hindered seamless execution on distributed cloud infrastructure, and made the automated generation of RESTful APIs for cloud-native enterprise deployments incredibly fragile.7

To resolve these structural and performance limitations, the ComfyUI platform initiated a massive architectural overhaul culminating in the Nodes 2.0 framework and the corresponding V3 Schema (comfy\_api.latest).5 The visual system transitioned to a modern Vue-based architecture, unlocking faster feature iteration, richer dynamic interactions, scalable performance, and the implementation of expandable nodes with advanced interactive widgets.4 Simultaneously, the backend API was rewritten to enforce a declarative, strictly typed, and stateless design paradigm.5

This exhaustive research report provides a comprehensive, expert-level exposition of the Nodes 2.0 architecture and the V3 Schema. It delineates the underlying theoretical mechanics of the new architectural paradigm, dissects the required data structures, and presents a meticulous, step-by-step methodology for constructing custom nodes. The analysis culminates in two deeply annotated implementation examples that demonstrate the practical application of these novel engineering principles in production environments.

## **The Vue-Based Frontend: Capabilities and Community Reception**

The migration to the Nodes 2.0 frontend represents a calculated departure from the monolithic LiteGraph.js framework toward a component-driven Vue.js architecture.4 This transition was engineered to facilitate a more modular, extensible user interface capable of supporting the next generation of generative AI tools.

The Vue-based system introduces a highly flexible foundation that allows for dynamic widget generation, improved missing node user experiences, an integrated workflow progress panel, and specialized rendering contexts such as the new Assets sidebar with 3D panoramic image support.4 For custom node developers, this means the frontend can automatically generate complex UI components—such as multi-line text editors, specific slider interfaces, and dynamic input ports—directly from the Python backend schema definitions, drastically reducing the need to write custom JavaScript extensions.5

However, the transition to Nodes 2.0 has not been without friction within the developer ecosystem. Because the architectural shift was so profound, backward compatibility for highly customized legacy UI extensions was compromised. During the public beta phases, numerous popular custom node repositories—such as KJ-Nodes and the rgthree optimization suite—experienced critical compatibility failures.12 Developers noted that the split between the frontend and backend repositories created out-of-sync scenarios, and some community members reported that the visual layout of the new nodes felt less readable due to altered padding and missing legacy features like batch node pinning.6

Despite these transitional challenges, the architectural benefits of the Vue framework—particularly its alignment with the strictly typed V3 Python backend—solidify it as the mandatory future standard for the platform.4 The framework maintains a toggle to revert to the legacy LiteGraph.js system, but all future development and optimization efforts are explicitly targeted at the Nodes 2.0 paradigm.4

## **Architectural Overhaul: From Stateful Classes to Stateless Declarations**

The most profound theoretical transformation introduced by the V3 Schema is the total deprecation of stateful node objects in favor of stateless, declarative programming models.5 Understanding this paradigm shift is the absolute prerequisite for mastering modern ComfyUI node development.

### **The Legacy V1 Methodology**

Under the legacy V1 architecture, developers defined a custom node by constructing a standard Python class. This class relied on global class attributes, specifically dictionaries like INPUT\_TYPES, RETURN\_TYPES, RETURN\_NAMES, and FUNCTION, to communicate its operational specifications to the application runtime.5

A typical V1 node possessed the following structural characteristics:

* It utilized an \_\_init\_\_ method, allowing the node to retain internal state across multiple executions of the Directed Acyclic Graph (DAG).5  
* It lacked rigorous schema validation prior to execution.  
* It was registered into the system by forcefully mutating global dictionary objects, namely NODE\_CLASS\_MAPPINGS and NODE\_DISPLAY\_NAME\_MAPPINGS, within the module's \_\_init\_\_.py file.5

While highly accessible to novice programmers, this methodology permitted dangerous runtime state mutations. If a node altered its internal state during one execution pass, subsequent passes could behave non-deterministically. Furthermore, the lack of strict type definitions made it exceedingly difficult for automated systems—such as ComfyUI-Manager or cloud-deployment wrappers—to predictably parse the node's requirements and convert workflows into RESTful APIs.7

### **The V3 Schema Contract**

The V3 architecture rectifies these vulnerabilities by enforcing a rigorous contract between the node's structural definition and its computational execution logic.5 All modern nodes must inherit from io.ComfyNode, representing the pinnacle of the framework's inheritance chain.5

Crucially, the V3 architecture fundamentally eliminates the instantiation of node objects during graph execution. Nodes do not expose a persistent 'state', and the \_\_init\_\_ constructor possesses absolutely no functional utility within the framework.5 Instead, all operational logic, configuration declarations, and caching protocols are executed exclusively as Python @classmethod implementations.5

This stateless design ensures that every execution of a node is purely a mathematical function of its immediately provided inputs. By eliminating side effects and internal state mutations, the backend compiler can aggressively cache execution results, parallelize independent node evaluations across multiple GPUs, and safely execute operations in isolated, distributed enterprise server environments.7

To further standardize the ecosystem, several properties from the V1 era have been deprecated and mapped to new declarative schema fields.

| Legacy V1 Property / Architecture | Modern V3 Schema Equivalent / Architecture | Systemic Implication |
| :---- | :---- | :---- |
| INPUT\_TYPES dictionary | define\_schema returning io.Schema | Enforces strict, object-oriented type validation and UI binding prior to graph execution. |
| RETURN\_TYPES tuple | outputs list within io.Schema | Replaces ambiguous tuples with strictly typed io.Output objects. |
| RETURN\_NAMES tuple | display\_name attribute in io.Output | Localizes naming conventions directly to the output object definition. |
| FUNCTION string assignment | Fixed @classmethod def execute | Eliminates arbitrary method naming; standardizes the execution entrypoint. |
| CATEGORY string assignment | category attribute in io.Schema | Centralizes metadata into a single source of truth. |
| NODE\_CLASS\_MAPPINGS mutation | comfy\_entrypoint returning ComfyExtension | Eliminates global namespace pollution; provides a formal, asynchronous loading pipeline. |
| IS\_CHANGED method | fingerprint\_inputs method | Separates cache invalidation logic from raw input evaluation, fixing dynamic linking failures. |

Data sources supporting the architectural mapping:.5

## **Project Structure and Environment Configuration**

Developing a production-ready custom node package for the Nodes 2.0 framework necessitates a highly disciplined organizational structure. The codebase must not only satisfy the ComfyUI execution compiler but must also conform to the strict specifications of the Comfy Registry for seamless distribution to the end-user community.8

### **The Optimal Directory Architecture**

A standardized project repository typically resides within the ComfyUI/custom\_nodes/ directory. The structure separates the registration entrypoints, the declarative node schemas, and any optional JavaScript frontend extensions into distinct boundaries.8

ComfyUI/

└── custom\_nodes/

└── comfyui-enterprise-nodes/

├── **init**.py \# The mandatory extension registration entrypoint

├── pyproject.toml \# Registry metadata and dependency graphs

├── requirements.txt \# Legacy and pip package dependencies

├── install.py \# Optional script for complex binary setups

├── core/ \# Internal modules for tensor and math logic

│ └── tensor\_math.py

├── nodes/ \# The V3 Schema io.ComfyNode definitions

│ ├── image\_filters.py

│ └── api\_requests.py

└── web/ \# Vue.js or legacy JavaScript frontend extensions

└── js/

└── custom\_widgets.js

### **Dependency and Metadata Management**

The inclusion of the pyproject.toml file is a critical addition for modern custom nodes.8 It interfaces directly with the official publishing registry and advanced package managers. The configuration strictly defines the Python environment prerequisites, dependency graphs, and developer metadata, ensuring that the package can be automatically parsed and indexed.8

An enterprise-grade pyproject.toml contains the following structured data:

Ini, TOML

\[project\]  
name \= "comfyui-enterprise-nodes"  
description \= "A suite of advanced, stateless image processing nodes utilizing the V3 schema."  
version \= "1.2.0"  
license \= "Apache-2.0"  
requires-python \= "\>=3.10"  
dependencies \= \[  
    "torch\>=2.1.0",  
    "numpy\>=1.26.0",  
    "pillow",  
    "requests"  
\]

\[project.urls\]  
Repository \= "https://github.com/developer/comfyui-enterprise-nodes"  
Documentation \= "https://docs.developer.com/comfyui"

\[tool.comfy\]  
PublisherId \= "enterprise-ai-namespace"  
DisplayName \= "Enterprise Processing Nodes"  
Icon \= "https://developer.com/assets/icon.png"

When users leverage the ComfyUI Manager to install the node, the system parses this configuration file, cross-references the traditional requirements.txt, and isolates the dependency installation. This isolation is critical; installing conflicting versions of libraries like av, transformers, or torchvision can catastrophically contaminate the global Python environment or the embedded portable Python executable used by Windows users.8

### **The Formal Registration Pipeline: comfy\_entrypoint**

As previously discussed, the V1 architecture relied on developers mutating global dictionaries (NODE\_CLASS\_MAPPINGS) upon module import.17 If an error occurred deep within a custom node file during the import sequence, it frequently crashed the entire ComfyUI startup process or resulted in silent failures where nodes simply failed to appear in the UI.25

The V3 architecture introduces a formal, asynchronous extension registration pipeline that encapsulates node discovery. The application compiler explicitly probes the \_\_init\_\_.py file for an asynchronous function named comfy\_entrypoint.5 This function serves as a secure factory mechanism, returning an instance of an object derived from io.ComfyExtension.10

The extension class handles the registration by overriding the asynchronous get\_node\_list method, returning a comprehensive list of all io.ComfyNode classes exposed by the package.5 This asynchronous loading mechanism allows the ComfyUI backend to concurrently load multiple extensions, safely catch and log ModuleNotFoundError exceptions without halting the primary server thread, and cleanly register the nodes into the internal routing tables.22

## **The Declarative Type System and Data Structures**

The transition to strictly typed input and output definitions profoundly enhances the stability of the workflow DAG. By defining types as objects rather than loose dictionary strings, the engine can execute pre-flight validation checks to ensure the structural and connection correctness of workflows before committing GPU Virtual Random Access Memory (VRAM) to the task.8

The comfy\_api.latest.io module provides a comprehensive suite of declarative object wrappers that map high-level frontend constructs to low-level Python and PyTorch primitives.5

### **Mapping Generative Primitives**

To successfully engineer within the V3 schema, developers must mentally map the legacy dictionary strings to their modern object-oriented equivalents.5

| Generative Data Primitive | Legacy V1 Dictionary String | Modern V3 Schema Definition | Standardized Python/PyTorch Representation |
| :---- | :---- | :---- | :---- |
| **Image Tensor** | "IMAGE" | io.Image.Input() | torch.Tensor (Standard Shape: \`\`) |
| **Latent Space** | "LATENT" | io.Latent.Input() | Python dict containing a "samples" tensor |
| **Mask Tensor** | "MASK" | io.Mask.Input() | torch.Tensor (Standard Shape: or) |
| **Conditioning Vectors** | "CONDITIONING" | io.Conditioning.Input() | Python list of conditioning data arrays/tensors |
| **Neural Network Weights** | "MODEL" | io.Model.Input() | PyTorch Model Object (e.g., UNet, DiT) |
| **Variational Autoencoder** | "VAE" | io.VAE.Input() | VAE Object Instance |
| **Text Encoder** | "CLIP" | io.CLIP.Input() | CLIP/T5 Model Object Instance |

Data source for mapping specifications:.5

It is vital to note the specific shape dimensions utilized by ComfyUI. Unlike native PyTorch vision models which typically expect tensors in the format, ComfyUI standardizes image tensors in the format.10 Failure to appropriately transpose (permute or movedim) these dimensions when interfacing with external libraries or custom mathematical operations will result in immediate execution failures. Furthermore, image tensors in ComfyUI are normalized between the floating values of ![][image1] and ![][image2], rather than the ![][image3] to ![][image4] integer scale commonly found in the Python Imaging Library (PIL).10

### **Primitive Data Types and UI Widget Generation**

Beyond massive neural network tensors, the V3 schema introduces highly robust classes for primitive data types. These objects allow developers to define bounding boxes, validation parameters, and specific Vue frontend behaviors directly within the backend Python schema definition, eliminating the need for disjointed JavaScript files.5

* **io.Int.Input(name, default, min, max, step, display\_mode)**: Defines an integer input. The display\_mode parameter (accepting enumerations such as io.NumberDisplay.slider or io.NumberDisplay.number) directly commands the Vue.js frontend on how to visually render the widget.5 This guarantees that user inputs remain mathematically valid before execution begins.  
* **io.Float.Input(...)**: Identical to the integer class, but operates on floating-point logic. It supports specific rounding limits (e.g., round=0.001) to maintain precision and prevent floating-point drift during continuous slider manipulations.11  
* **io.String.Input(name, default, multiline, dynamic\_prompts)**: Handles text inputs. The multiline=True flag converts a standard text field into a dynamic, expandable text area, which is absolutely essential for prompt engineering nodes.11 The dynamic\_prompts flag can enable integration with wildcard insertion libraries.  
* **io.Combo.Input(name, options=\[...\])**: Generates a dropdown menu interface, forcing the user to select from a strictly validated list of predefined string configurations.10  
* **io.Custom(name).Input(id)**: An advanced abstraction that permits the transmission of arbitrary, non-standard Python objects across the DAG, provided the receiving node recognizes the custom string identifier.5

## **Advanced Evaluation Controls: Caching, Validation, and Lazy Evaluation**

Because ComfyUI frequently processes tensors that consume gigabytes of VRAM and require substantial computational time, efficient graph evaluation is paramount. The framework implements aggressive caching strategies, ensuring that a node is only executed if its inputs have materially changed since the last execution pass.10

### **The Deprecation of IS\_CHANGED and the Rise of fingerprint\_inputs**

In the V1 paradigm, developers utilized the IS\_CHANGED class method to inform the engine whether a node required re-execution. However, this method suffered from severe architectural flaws when dealing with dynamic, runtime-linked variables. If a dynamically linked data port was piped into an IS\_CHANGED function, the engine would frequently pass None to the function because the upstream node had not yet resolved its calculation.20 This resulted in premature cache misses, ignored input changes, or catastrophic evaluation failures.20 Some developers resorted to returning float('NaN') just to force execution, which bypassed the caching engine entirely and degraded performance.20

The V3 architecture rectifies this by formally separating the compilation of the DAG from the sequential sampling process.19 The IS\_CHANGED method has been superseded by the fingerprint\_inputs class method.10

When the evaluation framework traverses the graph prior to execution, it consults fingerprint\_inputs strictly to manage cache invalidation.10 If an execution node relies on systemic external variables—such as fetching a dynamically changing file from an OS directory, tracking an external API state, or utilizing a time-based random seed—the fingerprint method explicitly instructs the graph compiler when to discard the cached io.NodeOutput and enforce a new execution pass.29

For example, a node designed to read a local text file could implement fingerprinting by returning the file's operating system modification timestamp:

Python

    @classmethod  
    def fingerprint\_inputs(cls, file\_path: str) \-\> str:  
        """  
        By returning the current modified timestamp of the target file,  
        the node forcefully triggers a re-execution only if the file OS metadata changes.  
        """  
        try:  
            import os  
            return str(os.path.getmtime(file\_path))  
        except FileNotFoundError:  
            return "file\_not\_found"

This surgical precision in cache administration optimizes high-performance workflows, minimizing extraneous tensor computations and significantly lowering aggregate VRAM utilization.10

### **Deferred Execution via check\_lazy\_status**

Furthermore, the V3 schema introduces advanced lazy evaluation mechanics through the check\_lazy\_status method.10 Certain nodes, such as complex conditional switches or advanced multiplexers, may possess multiple inputs but only mathematically require one of them based on a specific internal configuration.

By setting the lazy=True flag on an input within the schema definition, the developer instructs the engine to defer the evaluation of that specific upstream branch.11 The check\_lazy\_status method is then invoked during graph traversal. It evaluates the minimal necessary parameters and returns a list of strings dictating exactly which input ports must be computed.11 If a computationally expensive upstream branch is not included in the returned list, the engine skips its execution entirely, saving massive amounts of processing time.10

## **Step-by-Step Implementation Example 1: Advanced Tensor Operations and Image Compositing**

To comprehensively illustrate the practical application of the V3 Schema, this section details the step-by-step construction of an advanced ImageBrightnessContrastBlend node. This node processes raw image tensors, manipulates their color space, and dynamically composites the result over a secondary image using blending mathematical operations and an optional masking tensor.10

This implementation highlights the strict schema definition, the manipulation of \`\` shaped tensors using native PyTorch operations, and the mechanism for returning UI components directly to the Vue frontend.

### **Step 1.1: The Schema Definition Contract**

The foundational requirement is to import the correct V3 API and subclass io.ComfyNode. The @classmethod def define\_schema(cls) outlines the absolute operational boundaries of the node.

Python

import torch  
from comfy\_api.latest import io

class ImageBrightnessContrastBlend(io.ComfyNode):  
    """  
    Adjusts the brightness and contrast of a primary image tensor,   
    then blends it with a secondary image based on an operational mode and optional mask.  
    """

    @classmethod  
    def define\_schema(cls) \-\> io.Schema:  
        """  
        Returns the definitive io.Schema object dictating the node's capabilities.  
        """  
        return io.Schema(  
            node\_id="Enterprise\_AdvancedImageBlend",  
            display\_name="Advanced Image Blend (V3)",  
            category="image/composite",  
            description="Applies brightness and contrast adjustments, followed by sophisticated mathematical blending.",  
            inputs=),  
                  
                \# Overall opacity controller mapped to a 0.0 to 1.0 slider  
                io.Float.Input("opacity", default=1.0, min\=0.0, max\=1.0, step=0.05,   
                               display\_mode=io.NumberDisplay.slider),  
                  
                \# Optional mask input. The graph execution will not fail if left unconnected by the user.  
                io.Mask.Input("mask", optional=True, tooltip="Optional mask tensor to spatially isolate the blending effect.")  
            \],  
            outputs=,  
            is\_output\_node=True \# Explicitly dictates that the Vue UI should expect rendering logic from this node  
        )

This declarative structure guarantees that the execute method will receive precisely the types and boundaries specified. The Vue frontend reads this io.Schema to dynamically generate the user interface without requiring the developer to write any JavaScript.5

### **Step 1.2: Execution Logic, Tensor Mathematics, and UI Rendering**

The operational core resides in the @classmethod def execute(cls). The function signature must exactly match the names defined in the schema's inputs list.5 All PyTorch tensor mathematics must account for the ![][image1] to ![][image2] normalization range and the \`\` dimensionality.

Python

    @classmethod  
    def execute(cls, image\_primary: torch.Tensor, image\_secondary: torch.Tensor,   
                brightness: float, contrast: float, blend\_mode: str,   
                opacity: float, mask: torch.Tensor \= None) \-\> io.NodeOutput:  
          
        \# \--- 1\. Apply Brightness and Contrast \---  
        \# Contrast adjustment mathematically revolves around the midpoint (0.5)  
        adjusted \= (image\_primary \- 0.5) \* contrast \+ 0.5  
          
        \# Linear brightness offset is applied cumulatively  
        adjusted \= adjusted \+ brightness  
          
        \# Clamp values to strictly remain within standard tensor boundaries \[0.0, 1.0\].  
        \# Failing to clamp can result in infinite values, leading to downstream black outputs or NaN errors.  
        adjusted \= torch.clamp(adjusted, 0.0, 1.0)  
          
        \# \--- 2\. Mathematical Blending Operations \---  
        if blend\_mode \== "normal":  
            blended \= adjusted  
        elif blend\_mode \== "multiply":  
            \# Direct tensor multiplication  
            blended \= adjusted \* image\_secondary  
        elif blend\_mode \== "screen":  
            \# Inverted multiplication to lighten the composite  
            blended \= 1.0 \- (1.0 \- adjusted) \* (1.0 \- image\_secondary)  
        elif blend\_mode \== "overlay":  
            \# Conditional tensor blending: multiply for dark regions, screen for light regions.  
            \# torch.where evaluates the condition tensor-wide without requiring slow Python loops.  
            blended \= torch.where(  
                image\_secondary \< 0.5,  
                2.0 \* adjusted \* image\_secondary,  
                1.0 \- 2.0 \* (1.0 \- adjusted) \* (1.0 \- image\_secondary)  
            )  
          
        \# \--- 3\. Apply Global Opacity \---  
        \# Linear interpolation between the original secondary background and the new blended result  
        result \= image\_secondary \* (1.0 \- opacity) \+ blended \* opacity  
          
        \# \--- 4\. Process Optional Spatial Masking \---  
        if mask is not None:  
            \# ComfyUI masks are typically provided as grayscale representations.   
            \# To perform mathematical broadcasting against our image tensors,   
            \# we must unsqueeze the tensor to align the dimensional axes.  
            if mask.dim() \== 2:  
                mask \= mask.unsqueeze(0) \# Add Batch dimension if it arrives as  
            if mask.dim() \== 3:  
                mask \= mask.unsqueeze(-1) \# Add Channel dimension, resulting in  
              
            \# Interpolate spatially based on the continuous values of the mask tensor  
            result \= image\_secondary \* (1.0 \- mask) \+ result \* mask  
              
        \# \--- 5\. Output Packaging and Vue UI Rendering \---  
        \# We package the final tensor in the standardized NodeOutput wrapper.  
        \# By passing the kwarg \`ui=io.ui.PreviewImage(...)\`, we instruct the Vue frontend   
        \# to render the resulting image tensor directly on the node canvas, providing immediate user feedback.  
        return io.NodeOutput(  
            result,   
            ui=io.ui.PreviewImage(result, cls=cls)  
        )

The mathematical rigor inside the execute block is entirely isolated from the ComfyUI application state. Because it relies only on localized arguments and yields a pure tensor output, this function is completely thread-safe and deterministic.8

## **Step-by-Step Implementation Example 2: Dynamic External API Integration**

The expansion of ComfyUI from a strict image-generation platform into a generalized AI automation framework has necessitated the integration of external Large Language Models (LLMs) and Vision-Language Models (VLMs).29 Implementing a dynamic network-request node exposes advanced usage of the io.String.Input primitives, dynamic typing, payload construction, and synchronous network constraints.

This exhaustive example illustrates the construction of an ExternalLLMVisionNode. This node dynamically constructs a specialized JSON payload, optionally encodes a PyTorch tensor into a Base64 JPEG string, and communicates via a RESTful endpoint (such as Groq, OpenAI, or Anthropic APIs) while safely handling exceptions.29

### **Step 2.1: Schema Definition for Text and Vision Modalities**

When interfacing with language models, prompt inputs frequently consist of massive paragraphs of text or complex JSON structures. The V3 schema handles this natively via the multiline attribute. Additionally, security parameters such as API keys must be handled carefully.

Python

import json  
import requests  
import base64  
import torch  
from io import BytesIO  
from PIL import Image  
from comfy\_api.latest import io

class ExternalLLMVisionNode(io.ComfyNode):  
    """  
    Communicates with external text and vision-language model APIs,  
    allowing ComfyUI workflows to leverage cloud-based reasoning.  
    """

    @classmethod  
    def define\_schema(cls) \-\> io.Schema:  
        return io.Schema(  
            node\_id="Enterprise\_LLMVisionRequest",  
            display\_name="LLM/Vision API Query",  
            category="network/inference",  
            description="Executes a stateless API request to an external LLM using provided system prompts and optional image data.",  
            inputs=),  
                  
                \# Multiline text areas for extensive, granular prompt engineering  
                io.String.Input("system\_prompt", default="You are an expert AI workflow assistant analyzing image contexts.", multiline=True),  
                io.String.Input("user\_prompt", default="Describe the contents of the attached image in high detail.", multiline=True),  
                  
                \# Optional image input. This allows the node to function as a pure text LLM or a multimodal VLM.  
                io.Image.Input("vision\_image", optional=True, tooltip="Attach an image tensor for vision-based inference."),  
                  
                \# Granular temperature control for probabilistic sampling  
                io.Float.Input("temperature", default=0.7, min\=0.0, max\=2.0, step=0.1)  
            \],  
            outputs=  
        )

### **Step 2.2: Data Transformation and Network Execution Logic**

A critical hurdle in network-based nodes is the data formatting. PyTorch tensors representing images cannot be transmitted directly over standard HTTP JSON payloads. The execute method must convert the \`\` tensor back into a standard Image format, encode it, construct the specific API payload schema, and handle the HTTP request securely.29

Python

    @classmethod  
    def execute(cls, api\_key: str, model: str, system\_prompt: str,   
                user\_prompt: str, temperature: float,   
                vision\_image: torch.Tensor \= None) \-\> io.NodeOutput:  
          
        \# \--- 1\. Security Validation \---  
        if not api\_key or api\_key.strip() \== "":  
            \# Raising a ValueError immediately halts the execution of the current graph branch  
            \# and propagates a visible error to the ComfyUI user interface.  
            raise ValueError("API Key is strictly required for ExternalLLMVisionNode to function.")  
              
        \# Initialize the standard conversational message array  
        messages \= \[{"role": "system", "content": system\_prompt}\]  
          
        \# \--- 2\. Multimodal Data Transformation \---  
        if vision\_image is not None:  
            \# ComfyUI Image tensors are formatted as.  
            \# For a single image request, we extract the first tensor in the batch: .  
            \# We must convert the floating point values \[0.0, 1.0\] back to the  integer scale   
            \# expected by standard image encoding libraries.  
            img\_tensor \= (vision\_image \* 255).byte().cpu().numpy()  
            pil\_image \= Image.fromarray(img\_tensor)  
              
            \# Buffer the image into system memory and encode it to base64  
            buffered \= BytesIO()  
            pil\_image.save(buffered, format\="JPEG", quality=85)  
            img\_str \= base64.b64encode(buffered.getvalue()).decode("utf-8")  
              
            \# Construct a multimodal user message payload compliant with standard OpenAI/Groq schemas  
            messages.append({  
                "role": "user",  
                "content": \[  
                    {"type": "text", "text": user\_prompt},  
                    {"type": "image\_url", "image\_url": {"url": f"data:image/jpeg;base64,{img\_str}"}}  
                \]  
            })  
        else:  
            \# Fallback to standard text-only payload if no image is provided  
            messages.append({"role": "user", "content": user\_prompt})

        \# \--- 3\. Network Payload Construction \---  
        headers \= {  
            "Authorization": f"Bearer {api\_key}",  
            "Content-Type": "application/json"  
        }  
          
        payload \= {  
            "model": model,  
            "messages": messages,  
            "temperature": temperature,  
            "max\_tokens": 1024  
        }  
          
        \# Execute the HTTP POST request.   
        \# (Note: In production, endpoint URLs are often determined dynamically based on the model prefix)  
        endpoint \= "https://api.external-inference.com/v1/chat/completions"  
          
        \# \--- 4\. Synchronous Execution and Error Handling \---  
        try:  
            \# We apply a strict timeout to prevent the ComfyUI server thread from hanging indefinitely  
            response \= requests.post(endpoint, headers=headers, json=payload, timeout=60)  
              
            \# Raise an HTTPError if the status code indicates failure (e.g., 401 Unauthorized, 429 Rate Limit)  
            response.raise\_for\_status()  
              
            response\_data \= response.json()  
              
            \# Parse the deeply nested response string safely  
            final\_text \= response\_data.get("choices", \[{}\]).get("message", {}).get("content", "")  
              
        except requests.exceptions.Timeout:  
            raise RuntimeError("The external API request timed out after 60 seconds. The server may be under heavy load.")  
        except requests.exceptions.RequestException as e:  
            \# Ensure complex network exceptions halt graph execution gracefully and present debug data  
            raise RuntimeError(f"Network inference failed due to an API error: {str(e)}")  
              
        \# \--- 5\. Output Packaging \---  
        \# Return the parsed text string wrapped in the V3 NodeOutput object.  
        \# This string can now be routed to a CLIPTextEncode node to generate conditioning for diffusion models.  
        return io.NodeOutput(final\_text)

By decoupling the HTTP request logic entirely from class-instance variables, the backend can safely queue and dispatch multiple instances of these nodes concurrently across different workflow branches without risking state corruption or network race conditions.29

## **Formal Registration and Migration Strategies**

Constructing the pure mathematical and logical code represents only the preliminary phase of development; securely integrating the codebase into the ComfyUI runtime environment completes the software lifecycle. The registration architecture must account for the strict initialization sequence mandated by the ComfyUI backend loader.22

### **Implementing the Asynchronous comfy\_entrypoint**

The \_\_init\_\_.py file acts as the ultimate gatekeeper for the module. The application loader uses Python's importlib to probe the module for the comfy\_entrypoint function signature. If found, it triggers the instantiation of the custom ComfyExtension.5

Python

\# \_\_init\_\_.py  
import logging  
from comfy\_api.latest import ComfyExtension, io

\# Import the fully implemented V3 schema nodes from the internal submodules  
from.nodes.image\_filters import ImageBrightnessContrastBlend  
from.nodes.api\_requests import ExternalLLMVisionNode

class EnterpriseNodesExtension(ComfyExtension):  
    """  
    The formal extension registration container.   
    Inheriting from ComfyExtension allows the platform to securely request the node list.  
    """  
    async def get\_node\_list(self) \-\> list\[type\[io.ComfyNode\]\]:  
        """  
        Returns the comprehensive list of active V3 schema nodes to the application registry.  
        This method must be declared as async to prevent blocking the main server thread.  
        """  
        return

async def comfy\_entrypoint() \-\> EnterpriseNodesExtension:  
    """  
    The definitive initialization hook probed by the ComfyUI backend loader.  
    Must return an object inheriting from io.ComfyExtension.  
    """  
    logging.info("Initializing Enterprise Nodes Suite utilizing the V3 Architecture.")  
    return EnterpriseNodesExtension()

This asynchronous approach fundamentally safeguards the platform. If a specific node within the list throws an exception during its schema definition evaluation, the error can be isolated and logged, preventing the catastrophic failure of the entire ComfyUI server instance.22

### **Alternative Paradigms: Decorator-Based Registration**

While the rigorous structure of the V3 Schema is the official standard, the community has developed alternative wrapper paradigms to streamline development for those who find the strict class inheritance verbose. Libraries such as ComfyUI-EasyNodes and ComfyUI-Annotations introduce powerful Python decorators like @comfy\_node and @ComfyFunc.37

These external decorator libraries utilize Python's advanced reflection and type-hinting inspection mechanisms to "automagically" generate the underlying schema definitions.37 By simply applying a decorator to a standard Python function and fully annotating its input and return types (e.g., def process\_image(image: ImageTensor) \-\> ImageTensor:), the library constructs the required node definition, handles tuple wrapping, and manages the widget mapping dynamically.37 While these decorator wrappers provide immense quality-of-life improvements for rapid prototyping, constructing nodes utilizing the raw comfy\_api.latest.io schema directly ensures maximum performance, strict compliance, and future-proof resilience against core API updates.5

### **Strategic Backward Compatibility and Node Replacement**

The adoption curve for the Nodes 2.0 framework dictates that developers maintain legacy codebases while navigating the transition.4 While the V3 schema fundamentally replaces the need for NODE\_CLASS\_MAPPINGS, the application loader still recognizes these global dictionaries as a legacy fallback mechanism to preserve compatibility with V1 code that remains active.5

However, if a developer intends to entirely deprecate a legacy V1 node and replace it seamlessly with a mathematically superior V3 equivalent—without breaking the deeply interconnected JSON files of their existing user base—the Comfy API provides a robust node\_replacement registry.41

This registry allows the system to transparently map and upgrade nodes during the graph load sequence. The api.node\_replacement.register method accepts an io.NodeReplace configuration object specifying the required topological changes.41

| Parameter | Type Specification | Systemic Purpose |
| :---- | :---- | :---- |
| new\_node\_id | str | The global identifier of the new V3 Schema node. |
| old\_node\_id | str | The string class name of the deprecated V1 node. |
| old\_widget\_ids | list\[str\] | None | An ordered list binding legacy widget IDs to their relative mapping indexes. |
| input\_mapping | list | None | An array of dictionaries explicitly mapping how inputs traverse from the old node shape to the new node shape. |
| output\_mapping | list | None | An array mapping output indexes from the old structure to the new framework. |

Data source for replacement specifications:.41

To implement this migration transparently:

Python

from comfy\_api.latest import ComfyAPI, io  
api \= ComfyAPI()

async def register\_legacy\_replacements():  
    """  
    Registers a complex topological replacement mapping legacy V1 inputs   
    to the V3 strictly typed schema prior to workflow execution.  
    """  
    await api.node\_replacement.register(io.NodeReplace(  
        new\_node\_id="Enterprise\_AdvancedImageBlend",  
        old\_node\_id="Legacy\_BrightnessContrast",  
          
        \# Declare the specific widgets that existed in the V1 node  
        old\_widget\_ids=\["bright", "cont"\],   
          
        \# Map the legacy input fields to their modern schema equivalents  
        input\_mapping=,  
        output\_mapping=\[  
            \# Map the primary image output tensor  
            {"new\_idx": 0, "old\_idx": 0},  
        \],  
    ))

This asynchronous replacement logic is embedded within the ComfyExtension class by overriding the on\_load lifecycle hook, ensuring that the migration translation occurs immediately upon server initialization and prior to any graph compilation processes.41

## **Conclusion**

The comprehensive implementation of the Nodes 2.0 Vue-based visual rendering engine and the concomitant deployment of the V3 comfy\_api.latest.io backend schema marks a critical, evolutionary maturation in the architecture of visual inference platforms. By aggressively enforcing declarative schema typing, mandating stateless class-based execution layers, and establishing formal asynchronous registration pipelines, the ComfyUI engine eliminates the systemic fragility and non-determinism inherent in the legacy object-oriented paradigm.

Developers adopting this modern architectural framework are heavily empowered to construct robust, thread-safe, and cloud-ready custom nodes. The exhaustive implementation examples provided in this analysis—ranging from deep tensor mathematics manipulating multi-dimensional image composites to dynamically formulated RESTful JSON integrations for external network inference—demonstrate that the rigorous restrictions imposed by strict typing and stateless execution ultimately yield a vastly more flexible, scalable, and predictable engineering environment.

The explicit management of dependencies via modern pyproject.toml configurations, the advanced cache invalidation protocols provided by fingerprint\_inputs, and the precise deferred execution facilitated by check\_lazy\_status further cement the V3 schema as the definitive operational standard for industrial-grade generative AI automation. Mastery of these structural concepts ensures that custom analytical tools not only interface seamlessly with the new dynamic visual interface but also integrate cleanly into fully automated deployment pipelines, REST API workflows, and distributed enterprise-scale cloud infrastructures.

#### **Referenzen**

1. ComfyUI Official Documentation \- ComfyUI, Zugriff am Februar 24, 2026, [https://docs.comfy.org/](https://docs.comfy.org/)  
2. Craft generative AI workflows with ComfyUI \- Replicate, Zugriff am Februar 24, 2026, [https://replicate.com/docs/guides/extend/comfyui](https://replicate.com/docs/guides/extend/comfyui)  
3. ComfyUI-Workflow/awesome-comfyui: A collection of awesome custom nodes for ComfyUI \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/ComfyUI-Workflow/awesome-comfyui](https://github.com/ComfyUI-Workflow/awesome-comfyui)  
4. Nodes 2.0 \- ComfyUI, Zugriff am Februar 24, 2026, [https://docs.comfy.org/interface/nodes-2](https://docs.comfy.org/interface/nodes-2)  
5. V3 Migration \- ComfyUI Official Documentation, Zugriff am Februar 24, 2026, [https://docs.comfy.org/custom-nodes/v3\_migration](https://docs.comfy.org/custom-nodes/v3_migration)  
6. How big of a deal is it to not use the new node schema? \- Reddit, Zugriff am Februar 24, 2026, [https://www.reddit.com/r/comfyui/comments/1qhmhco/how\_big\_of\_a\_deal\_is\_it\_to\_not\_use\_the\_new\_node/](https://www.reddit.com/r/comfyui/comments/1qhmhco/how_big_of_a_deal_is_it_to_not_use_the_new_node/)  
7. A Guide to ComfyUI Custom Nodes \- BentoML, Zugriff am Februar 24, 2026, [https://www.bentoml.com/blog/a-guide-to-comfyui-custom-nodes](https://www.bentoml.com/blog/a-guide-to-comfyui-custom-nodes)  
8. comfyui-nodes \- OSM, Zugriff am Februar 24, 2026, [https://osmagent.com/skill/comfyui-nodes](https://osmagent.com/skill/comfyui-nodes)  
9. Changelog \- ComfyUI Official Documentation, Zugriff am Februar 24, 2026, [https://docs.comfy.org/changelog](https://docs.comfy.org/changelog)  
10. comfyui-nodes \- OSM, Zugriff am Februar 24, 2026, [https://www.osmagent.com/skill/comfyui-nodes](https://www.osmagent.com/skill/comfyui-nodes)  
11. ComfyUI/custom\_nodes/example\_node.py.example at master \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/comfyanonymous/ComfyUI/blob/master/custom\_nodes/example\_node.py.example](https://github.com/comfyanonymous/ComfyUI/blob/master/custom_nodes/example_node.py.example)  
12. What is going on in the land of ComfyUI · Issue \#11356 \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/Comfy-Org/ComfyUI/issues/11356](https://github.com/Comfy-Org/ComfyUI/issues/11356)  
13. \[Bug\] "CRT Z-image" node not recognized after updating ComfyUI to commit 329480d \#11165 \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/Comfy-Org/ComfyUI/issues/11165](https://github.com/Comfy-Org/ComfyUI/issues/11165)  
14. This is a shame. I've not used Nodes 2.0 so can't comment but I hope this doesn't cause a split in the node developers or mean that tgthree eventually can't be used because they're great\! : r/comfyui \- Reddit, Zugriff am Februar 24, 2026, [https://www.reddit.com/r/comfyui/comments/1pd1r0k/this\_is\_a\_shame\_ive\_not\_used\_nodes\_20\_so\_cant/](https://www.reddit.com/r/comfyui/comments/1pd1r0k/this_is_a_shame_ive_not_used_nodes_20_so_cant/)  
15. ComfyUI nodes changed after update — how to bring back the old look? \- Reddit, Zugriff am Februar 24, 2026, [https://www.reddit.com/r/comfyui/comments/1oobb8n/comfyui\_nodes\_changed\_after\_update\_how\_to\_bring/](https://www.reddit.com/r/comfyui/comments/1oobb8n/comfyui_nodes_changed_after_update_how_to_bring/)  
16. comfyui\_gr85 \- ComfyUI Cloud, Zugriff am Februar 24, 2026, [https://comfy.icu/extension/veighnsche\_\_comfyui\_gr85](https://comfy.icu/extension/veighnsche__comfyui_gr85)  
17. Getting Started \- ComfyUI Official Documentation, Zugriff am Februar 24, 2026, [https://docs.comfy.org/custom-nodes/walkthrough](https://docs.comfy.org/custom-nodes/walkthrough)  
18. ComfyUI-Manager/scanner.py at main \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/Comfy-Org/ComfyUI-Manager/blob/main/scanner.py](https://github.com/Comfy-Org/ComfyUI-Manager/blob/main/scanner.py)  
19. HunyuanImage2.1: Implement Hunyuan Mixed APG by KimbingNg · Pull Request \#9882 · Comfy-Org/ComfyUI \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/comfyanonymous/ComfyUI/pull/9882](https://github.com/comfyanonymous/ComfyUI/pull/9882)  
20. LoadImage is executed before other nodes that are linked to it \- 'NoneType' object has no attribute 'endswith' · Issue \#11017 · Comfy-Org/ComfyUI \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/comfyanonymous/ComfyUI/issues/11017](https://github.com/comfyanonymous/ComfyUI/issues/11017)  
21. Create a new custom node \- ComfyUI, Zugriff am Februar 24, 2026, [https://docs.comfy.org/api-reference/registry/create-a-new-custom-node](https://docs.comfy.org/api-reference/registry/create-a-new-custom-node)  
22. nodes.py · multimodalart/wan-2-2-first-last-frame at f9d266f3914f4c22e1b97ae579c2a512a9a7d0d8 \- Hugging Face, Zugriff am Februar 24, 2026, [https://huggingface.co/spaces/multimodalart/wan-2-2-first-last-frame/blob/f9d266f3914f4c22e1b97ae579c2a512a9a7d0d8/nodes.py](https://huggingface.co/spaces/multimodalart/wan-2-2-first-last-frame/blob/f9d266f3914f4c22e1b97ae579c2a512a9a7d0d8/nodes.py)  
23. How to Install Custom Nodes in ComfyUI, Zugriff am Februar 24, 2026, [https://docs.comfy.org/installation/install\_custom\_node](https://docs.comfy.org/installation/install_custom_node)  
24. Custom Nodes \- ComfyUI, Zugriff am Februar 24, 2026, [https://docs.comfy.org/development/core-concepts/custom-nodes](https://docs.comfy.org/development/core-concepts/custom-nodes)  
25. IT Cooking | Success is just one script away, Zugriff am Februar 24, 2026, [https://www.it-cooking.com/](https://www.it-cooking.com/)  
26. Comfy Settings \- ComfyUI, Zugriff am Februar 24, 2026, [https://docs.comfy.org/interface/settings/comfy](https://docs.comfy.org/interface/settings/comfy)  
27. ComfyUI/nodes.py at master \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/Comfy-Org/ComfyUI/blob/master/nodes.py](https://github.com/Comfy-Org/ComfyUI/blob/master/nodes.py)  
28. Any plans of adapting V3 Schema? · Issue \#113 · Chaoses-Ib/ComfyScript \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/Chaoses-Ib/ComfyScript/issues/113](https://github.com/Chaoses-Ib/ComfyScript/issues/113)  
29. groq\_node.py \- EnragedAntelope/ComfyUI-EACloudNodes \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/EnragedAntelope/ComfyUI-EACloudNodes/blob/main/groq\_node.py](https://github.com/EnragedAntelope/ComfyUI-EACloudNodes/blob/main/groq_node.py)  
30. Phr00t/Qwen-Image-Edit-Rapid-AIO · Every image gets out-painted despite same size input and output \- Hugging Face, Zugriff am Februar 24, 2026, [https://huggingface.co/Phr00t/Qwen-Image-Edit-Rapid-AIO/discussions/20](https://huggingface.co/Phr00t/Qwen-Image-Edit-Rapid-AIO/discussions/20)  
31. conditioning\_saver.py \- Lightricks/ComfyUI-LTXVideo \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/Lightricks/ComfyUI-LTXVideo/blob/master/conditioning\_saver.py](https://github.com/Lightricks/ComfyUI-LTXVideo/blob/master/conditioning_saver.py)  
32. Nodes \- ComfyUI, Zugriff am Februar 24, 2026, [https://docs.comfy.org/development/core-concepts/nodes](https://docs.comfy.org/development/core-concepts/nodes)  
33. comfyui-mojo/execution.py at master · owenhilyard/comfyui-mojo, Zugriff am Februar 24, 2026, [https://github.com/owenhilyard/comfyui-mojo/blob/master/execution.py](https://github.com/owenhilyard/comfyui-mojo/blob/master/execution.py)  
34. prompt\_enhancer\_nodes.py \- Lightricks/ComfyUI-LTXVideo \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/Lightricks/ComfyUI-LTXVideo/blob/master/prompt\_enhancer\_nodes.py](https://github.com/Lightricks/ComfyUI-LTXVideo/blob/master/prompt_enhancer_nodes.py)  
35. EnragedAntelope/ComfyUI-EACloudNodes: A collection of ComfyUI custom nodes for interacting with various cloud services, such as LLM providers Groq and OpenRouter. These nodes are designed to work with any ComfyUI instance, including cloud-hosted environments (such as MimicPC) where users may have limited system access. \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/EnragedAntelope/ComfyUI-EACloudNodes](https://github.com/EnragedAntelope/ComfyUI-EACloudNodes)  
36. ComfyUI-EACloudNodes/openrouter.py at main · EnragedAntelope, Zugriff am Februar 24, 2026, [https://github.com/EnragedAntelope/ComfyUI-EACloudNodes/blob/main/openrouter.py](https://github.com/EnragedAntelope/ComfyUI-EACloudNodes/blob/main/openrouter.py)  
37. andrewharp/ComfyUI-EasyNodes: Makes creating new nodes for ComfyUI a breeze. \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/andrewharp/ComfyUI-EasyNodes](https://github.com/andrewharp/ComfyUI-EasyNodes)  
38. An easier way to create new ComfyUI nodes with Python decorators \- Reddit, Zugriff am Februar 24, 2026, [https://www.reddit.com/r/comfyui/comments/1awsfu6/an\_easier\_way\_to\_create\_new\_comfyui\_nodes\_with/](https://www.reddit.com/r/comfyui/comments/1awsfu6/an_easier_way_to_create_new_comfyui_nodes_with/)  
39. Enhancing the Function Registration Process for external nodes · comfyanonymous ComfyUI · Discussion \#903 \- GitHub, Zugriff am Februar 24, 2026, [https://github.com/comfyanonymous/ComfyUI/discussions/903](https://github.com/comfyanonymous/ComfyUI/discussions/903)  
40. ComfyUI-EasyNodes \- PyPI, Zugriff am Februar 24, 2026, [https://pypi.org/project/ComfyUI-EasyNodes/](https://pypi.org/project/ComfyUI-EasyNodes/)  
41. Node replacement \- ComfyUI, Zugriff am Februar 24, 2026, [https://docs.comfy.org/custom-nodes/backend/node-replacement](https://docs.comfy.org/custom-nodes/backend/node-replacement)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAYAAAD+4+QTAAABfklEQVR4Xu2UPyhHURTHj1CUSAb5U2IgmxKlZLL8BhImrDIqi1ImWYwWJSmTyErKwGBQJgPKJIvJxoDC9/vOPa/77q/762VSfp/69N4777xz3u/9zr0iZf4ytXAGbsMN2JO9XZJ6uCj67Cpsyd5WGuAZXIN1sA/ewSk/KUIHvIHzsAYW4AMc9JPIMryGjV5sFt7DZi8WUgV34JE7N9bhqejXSWBhNtizgGMAvsLxIO7TBZ9FX9JnEr7Bfgv0whcpbsIEJvKtYozCLyluMga/Rb9GghWLNQnjPlYs1iSNWyAslqcJi+Rqwmn4bZMlydkkViwW9ykqFovbhITFrMlKEPcZhp8Sb8IpS+Diu4DHoovJ4OR8uKPBRdsKK9x1G3yEm5bgWBCdWE5uyhx8gp3umkW4+q9EC5Mm0ZX9DodK5FXDQ7gv2QWa3NiC53BC9MFb0e3F4C8+Ed0yuJUYLM74gegQ7cJL2O7lpPCtuuE0HBFtnJdK0f+Qz/LI6zL/nR/WhVWYWmTGewAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAYAAAD+4+QTAAABPUlEQVR4Xu2UvUvDUBRHr6hQoejgpBUsbg5OgqA4ujgIIg4FZxFcBBcnJ/EfcBQRHEQUZ3Fy6uBax04WCk5uOoj4ce770OSlaRvIIvbAocnN5f4ayH0iPf4CZayExQ4M4w4e4z6OxR9bpnEb7/ADz+KP2zKJNdzEAi5jHeeiTYqGrOICNqX7kAE8wWt37TnEWxyK1H7Q12xI9yFT+IR7QX0NX3E2qBuyhizhpyRDVvALN4K6IWuIH5YWEtYNWUN0SKthuYbsSuthuYakDUurG7KGLOK7JIf5EP3KEnQKGcFx7HP3JXzEI9/g2MJnsfuXwIecy+8gz6jYzX7DeVfTngO8F/sHlEG8wguJL6j53nXT9UjR11Rf8AFnXE8Rb8QeGXqUeHS41i/FHimnWMWJSE8u9Ivd7nX3q/c9/jvf0rBG4yraNTcAAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAWCAYAAAD5Jg1dAAAAvElEQVR4Xt3RMQtBURjG8degKCWTmYFsSlaTlRQTvoeyynK/gLL5ECYDozJjt5hsLBb+p/Oe2+F0PwBP/brd5z73DveI/FayGGKJCNXPxzZ5bDBDDnWc0PdHJhMcUPC6Ec4ousI8NKOVKzRN3NF1RQ03CYcNPDD/LpKGcd/Byy80wTAokvoyrn6hccOpK8x/22GNjCtJG0+9xhnjgpLep8T+/L3Yw4iTxgJb9HR0FHtCQcxXKhigJfbl/8wb4ZAlMSoxI0oAAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAXCAYAAAD3CERpAAACDElEQVR4Xu2UO0hdQRCGR4ygmGAhRAJKRGysNAQiBhWrNAEJPhDEwgeYkC5aiIKIdUDJo5AgCLEIREEbC1FQIigqqIWIhRZKwEoLIaKFj/+/s+Pds1wuwViF+8PH3bM7Z2fvzH9WJKX/WU9AP/gGBkFxdDmmRvASPARp4DFoAWVeTCFoBvkgHWSCUtDpxrd6AeZAlQuYAdegW3Rz6gH46eZ9JkCOi6F4qIsg5g947cVIFpgG7aIno3LBmmjwczdHjYJtcAgmRTeyd0yM3wG7YEu0aqxiRJw4AKei/9LUJ3rKLm/ui0QPkUhcZ1xSZYBPYFaiJ+oRTcpf070lTST2j+W7BDXe/FcwDDbAb7ACnnnrFJNOge9gT7QVA6JtTKpy0X7SyayEaQz0SryPdO6JqBFNTLoqcfebP8K9IqIT58E4yA7WHknUOPws+I9/iFaH4sbhe/QHHV0RzMfEF0bAkPxFOSRuwn2QF6z5Mn/4pozJEvrlKwGv3LgNXIF37pmypIRjlnJd9LPixWFKZMrYBcCL4IMbm96COje2F/2kVt5F0VvKDhEmtc+v1iaYpBWciW5Atxk0SaWLYz/oXt8MTeAc1Ltn9pXVohFN9MgvUZ/c3lx2uvB6I0egyMVZNRZAB/gMjsF7t2Z6CpbARxe3CZZFq3JnFYA3or3271xfrEY1aBD1RXhVppTSv+sG+3tttvsbh+QAAAAASUVORK5CYII=>