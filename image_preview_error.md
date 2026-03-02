# **Technical Analysis of Interface Rendering Failures and Architectural Remediation in ComfyUI V3 Custom Nodes**

The transition of the ComfyUI ecosystem toward the Nodes 2.0 (V3) specification, facilitated by the comfy\_api.latest library, marks a fundamental pivot in the platform’s architectural philosophy. While legacy V1 nodes relied on loosely coupled class attributes and dictionary-based communication, the V3 schema introduces a structured, type-safe, and highly serialized framework designed to enhance both security and cross-environment compatibility.1 A recurring technical friction point within this new paradigm manifests as the "Image failed to load \- Invalid URL" error within the graphical user interface (GUI), particularly when developing custom output nodes like the DuffySaveImageWithSidecar. This phenomenon occurs when the physical persistence of data to the storage medium—saving images and companion sidecar files—succeeds, but the synchronization between the server-side filesystem state and the client-side rendering engine fails.2 This report provides an exhaustive technical audit of the underlying causes, focusing on path sandboxing, the mechanics of the /view endpoint, and the standardized implementation of UI helpers within the io.ComfyNode hierarchy.

## **Evolution of Node Specifications and Communication Protocols**

The architectural evolution of ComfyUI can be categorized into two distinct epochs. The legacy epoch utilized a Python-centric approach where nodes were registered through a global NODE\_CLASS\_MAPPINGS dictionary. Data was passed between nodes as standard Python objects, often leading to challenges in maintaining a stable state across the WebSocket connection.1 The contemporary V3 epoch, characterized by the io.Schema and io.ComfyNode classes, abstracts these interactions into a formal contract between the backend and the frontend.1

In the V3 framework, the define\_schema method establishes the formal inputs and outputs of the node, while the execute method handles the logic.1 The specific failure observed in the user’s node indicates a breakdown in the metadata loop. When an output node finishes execution, it returns an io.NodeOutput object. This object must contain specific UI instructions to inform the React-based frontend where to find the generated assets.1 If the instructions point to a path that the server’s security layer refuses to serve, or if the path is constructed inconsistently with the server’s root directory configuration, the "Invalid URL" error is triggered.5

### **Comparative Framework of Node Lifecycle Operations**

| Lifecycle Phase | Legacy V1 (Standard) | V3 (comfy\_api.latest) | Impact on UI Rendering |
| :---- | :---- | :---- | :---- |
| **Declaration** | INPUT\_TYPES class method | define\_schema method | Defines expected metadata for the UI |
| **Execution** | Function returning a tuple | classmethod execute returning NodeOutput | Controls the final payload sent to the frontend |
| **UI Updates** | Manual dictionary return {"ui": {...}} | ui module helpers (e.g., ui.PreviewImage) | Determines if the image renders or fails 1 |
| **Security** | Minimal path validation | Strict sandboxing and symlink resolution | Prevents arbitrary file access via /view 5 |
| **Metadata** | Manual extra\_pnginfo handling | Automated via is\_output\_node=True | Ensures generation parameters are embedded 1 |

## **Technical Analysis of the /view Endpoint and Sandboxing Logic**

The ComfyUI frontend does not access the filesystem directly; instead, it requests images through the /view HTTP GET endpoint.3 This endpoint is the gatekeeper of image persistence visibility. It requires three critical parameters: filename, subfolder, and type.7

The type parameter acts as a root selector, typically mapping to the input, output, or temp directories defined in the server's configuration.3 The "Invalid URL" error in the DuffySaveImageWithSidecar node is often a symptom of the node saving images to a location—specified by the output\_path variable—that resides outside the server's authorized output root.9

### **Path Traversal Protection and Validation Mechanisms**

ComfyUI employs a security mechanism to prevent path traversal attacks (CWE-59), where a malicious actor might attempt to read arbitrary system files by providing relative paths like ../../etc/passwd.5 The server validates every /view request by joining the base directory (the root for output, input, or temp) with the requested subfolder and filename. It then calculates the absolute path and ensures it shares a common root with the base directory using os.path.commonpath().5

If a custom node overrides the default output directory with an absolute path such as D:\\MyGenerations, and then attempts to tell the UI that the file is located there, the /view endpoint will reject the request because D:\\MyGenerations does not reside within the standard ComfyUI/output folder.11 The frontend receives a 403 Forbidden or 404 Not Found error, which is translated into the "Invalid URL" message seen by the user.5

### **Security Logic Execution Flow**

The server's validation sequence for image requests follows a strict logic to ensure system integrity:

1. **Request Reception**: The server receives a GET request at /view?filename=test.png\&subfolder=my\_folder\&type=output.  
2. **Root Identification**: The server looks up the absolute path for the output type (e.g., /home/user/ComfyUI/output).  
3. **Path Concatenation**: The server joins the root path with my\_folder and test.png.  
4. **Absolute Resolution**: The resulting path is resolved using os.path.abspath() or os.path.realpath() to eliminate symlinks and relative segments.5  
5. **Sanity Check**: The server checks if the base root path is still a prefix of the final path. If the node saved the file to an external drive not symlinked into the output directory, this check fails.5

## **Systematic Audit of the DuffySaveImageWithSidecar Codebase**

The provided DuffySaveImageWithSidecar node demonstrates a sophisticated understanding of image processing and sidecar file management but contains a logic gap in its UI communication strategy. The node performs manual directory scanning and counter management to avoid file overwrites, which is generally a best practice.8 However, the way it returns data to the UI is the source of the failure.

### **The Problem of Absolute Output Paths**

The node includes an optional output\_path input. When this input is provided, the node logic resolves the base\_output\_dir to this custom path:

Python

if output\_path and output\_path.strip():  
    base\_output\_dir \= output\_path.strip()  
    if not os.path.exists(base\_output\_dir):  
        os.makedirs(base\_output\_dir, exist\_ok=True)  
else:  
    base\_output\_dir \= folder\_paths.get\_output\_directory()

By allowing base\_output\_dir to be an arbitrary absolute path, the node bypasses the standard folder\_paths management system that the ComfyUI server uses to serve files.9 When the node later returns {"filename": file\_img, "subfolder": subfolder, "type": "output"} to the UI, the frontend assumes these assets are available under the server's default output root.3 If the actual files are on a different drive or outside the project folder, the server cannot serve them via the standard /view route.5

### **Logic Conflict in Counter Resolution**

The user's code includes a manual loop to find the highest counter in the directory. While this is effective for file persistence, it creates a potential synchronization issue with the folder\_paths.get\_save\_image\_path utility.13 This utility is designed to handle pathing and numbering in a way that remains compatible with the server's internal state. By manually overriding the counter and subfolder logic, the node might provide metadata to the UI that does not align with what the server expects to find if it were to re-scan the directory.13

## **Pixel Reconstruction and Tensor Processing in generative workflows**

To understand why images render or fail, one must examine the data transformation from a PyTorch tensor to a browser-compatible pixel format. In ComfyUI, images are represented as tensors with a standard normalized range.8

### **The Normalization Function**

Images are processed in a floating-point space $\\mathcal{I} \\in $. To persist these as 8-bit integers (UINT8) for display, the following transformation is applied:

![][image1]  
The DuffySaveImageWithSidecar node correctly implements this:

Python

i \= 255.0 \* image.cpu().numpy()  
img \= Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))

This conversion ensures that the image data itself is valid. The "Invalid URL" error confirms that the problem is not a corruption of the pixel data, but a failure of the URI (Uniform Resource Identifier) to point to the valid byte stream.2

### **Metadata Persistence and the Sidecar Philosophy**

A unique value proposition of the DuffySaveImageWithSidecar node is the .txt sidecar. Standard ComfyUI nodes embed metadata directly into the PNG chunks (using PngInfo).8 However, this metadata is often lost when images are converted to JPEG or shared on platforms that strip image headers.8

The V3 specification improves metadata handling via the is\_output\_node=True flag in the schema.1 This flag automatically injects the prompt and extra\_pnginfo hidden inputs into the execute method.1 The user's node currently uses manual string inputs for prompts, which is a valid choice for user-defined descriptions but may bypass the full workflow capture that ComfyUI is capable of.

## **Remediation Strategy: Implementing V3 UI Helpers**

The most effective resolution for the "Invalid URL" error in the ComfyUI V3 framework is the adoption of the ui helper modules.1 Instead of returning a raw dictionary of strings, the node should utilize the ui.PreviewImage class. This class abstracts the pathing logic and ensures that the frontend receives a valid reference to the image.1

### **The Role of ui.PreviewImage**

In the V3 API, ui.PreviewImage serves as a signal to the frontend that a specific tensor should be rendered on the node.1 Critically, it allows the node to save high-resolution, archival images to a custom absolute path (like the user's output\_path) while simultaneously saving a temporary version in the temp directory for the UI.8 Since the temp directory is always within the server's authorized roots, the URL generated for the preview is guaranteed to be valid.18

### **Corrected Implementation Logic**

The refactored execute method should separate the "Save to Archive" logic from the "Preview to UI" logic. This ensures that the user's files are stored exactly where they want them, but the interface remains responsive and error-free.

Python

from comfy\_api.latest import io, ui

\# Inside the execute method  
\# 1\. Permanent Save Logic (Archiving)  
\#... (save images to output\_path/base\_output\_dir as before)...

\# 2\. UI Update Logic (Previewing)  
\# We return the io.NodeOutput with a UI helper  
return io.NodeOutput(ui=ui.PreviewImage(images, cls=cls))

By passing cls=cls to the helper, the node automatically embeds the necessary workflow metadata into the preview, ensuring that the "Save Image" node continues to act as a "Workflow Save" node.1

## **Technical Comparison of Image File Formats in ComfyUI**

The DuffySaveImageWithSidecar node supports multiple formats, each with different implications for the preview system and the server's I/O performance.8

| Format | Transparency | Metadata Method | Compression Level | Recommended Use |
| :---- | :---- | :---- | :---- | :---- |
| **PNG** | Yes (RGBA) | iTXt Chunks 15 | 1 (Fast) \- 9 (Max) | Archival / Workflows |
| **JPEG** | No (RGB) | EXIF / XMP | Quality 1-100 | Web distribution |
| **WebP** | Yes | Multiple | High Efficiency 21 | UI Previews / Cloud |

For the purpose of the UI preview, the server often converts tensors to WebP or low-compression PNGs to minimize the latency between the completion of a generation and its appearance on the screen.8 The "Invalid URL" error is essentially the frontend timing out or receiving an error while trying to fetch these byte streams.2

## **Directory Management and Counter Synchronization**

The user's node manually scans the directory to determine the next available filename counter. This is a robust approach for ensuring that files are not overwritten when a user restarts a workflow or changes prefixes.13 However, the interaction between this manual logic and the folder\_paths.get\_save\_image\_path function is delicate.

### **Counter Conflict Scenarios**

If the node manually identifies that the next counter is 00005, but the subfolder variable returned by folder\_paths is not synchronized with the user's custom output\_path, the metadata returned to the UI might be:

{"filename": "ComfyUI\_00005.png", "subfolder": "", "type": "output"}

If the file was actually saved to D:\\Custom\\ComfyUI\_00005.png, the frontend will look for /view?filename=ComfyUI\_00005.png\&subfolder=\&type=output. The server will check the default output folder (e.g., C:\\ComfyUI\\output), fail to find the file, and return a 404 error, leading to the "Invalid URL" message.5

### **Standardized Pathing via Symlinks**

A professional-grade solution for users wanting to save to external drives is the use of symbolic links.9 By creating a symlink within the ComfyUI/output folder that points to an external drive (e.g., mklink /D "C:\\ComfyUI\\output\\External" "D:\\Generations"), the user can provide External as the subfolder in the node.9 This satisfies the server's security checks because the path appears to be a subdirectory of the authorized root, even though the physical data is stored elsewhere.5

## **Impact of is\_output\_node and Metadata Embedding**

The is\_output\_node=True flag in the V3 schema is not merely a metadata tag; it significantly alters the node's behavior in the execution queue.1 Nodes marked as output nodes are prioritized for UI updates and are the primary targets for the server's "Save API Format" and "History" endpoints.1

### **Automatic Metadata Injection**

When is\_output\_node=True is defined in define\_schema, the execute method receives prompt and extra\_pnginfo as keyword arguments.1

* **prompt**: Contains the full JSON representation of the current workflow.  
* **extra\_pnginfo**: Contains auxiliary data such as node positions and user notes.

The DuffySaveImageWithSidecar node could be enhanced by including this data in the sidecar .txt file, providing a "human-readable" version of the complex JSON workflow.1

## **Architectural Remediation for the Duffy\_SaveImageWithSidecar Node**

Based on the technical audit, the "Invalid URL" error can be resolved by aligning the node's UI feedback loop with the V3 io.NodeOutput standard.

### **Refined Logic Flow**

1. **Schema Declaration**: Ensure is\_output\_node=True is set.1  
2. **Path Resolution**: Continue using folder\_paths.get\_save\_image\_path but ensure that if a custom output\_path is used, it is either a relative subfolder of the output root or managed via the temp preview system.8  
3. **Execution Return**: Instead of returning a raw dictionary for ui, use the ui.PreviewImage helper.1

This separation of concerns ensures that the archiving process (saving to disk) does not interfere with the visualization process (displaying in the UI). Even if the archive is saved to a restricted absolute path, the ui.PreviewImage helper will generate a temporary authorized reference for the frontend.8

## **Future Outlook: Traceability and Sidecar Management**

The use of sidecar files represents a maturing of the AI generation pipeline. As models become more complex (e.g., multi-pass sampling as seen in the user's node), the metadata embedded in single image files becomes increasingly crowded.22 The move toward Nodes 2.0 (V3) facilitates this by providing a cleaner API for custom node developers to intercept and record generation data.1

The "Invalid URL" error is a transitory friction point caused by the shift from legacy "loosely defined" paths to the new "strictly sandboxed" V3 environment.2 By adopting the standardized ui helpers, developers can ensure their nodes remain compatible with future security updates to the ComfyUI server while providing a robust user experience.1

## **Comprehensive Findings on the save\_error.jpg Failure**

The error "Image failed to load \- Invalid URL" is the UI's reaction to an HTTP 403 or 404 response from the /view endpoint.5 In the context of the DuffySaveImageWithSidecar node, this occurs because:

* The node saves images to a custom absolute output\_path.  
* The node instructs the UI to look for the images in the output directory.  
* The server's sandboxing logic prevents the /view endpoint from resolving paths outside the project root.5  
* The node uses the legacy raw dictionary return for UI updates, which lacks the automated path-correction and temp directory fallback provided by the new V3 ui.PreviewImage helper.1

Implementing the ui.PreviewImage helper and ensuring is\_output\_node=True is the definitive technical solution for this issue.1 This refactoring aligns the node with the ComfyUI Nodes 2.0 V3 standard, resolving the rendering failure while preserving the sophisticated sidecar logic.

#### **Referenzen**

1. V3 Migration \- ComfyUI Official Documentation, Zugriff am März 2, 2026, [https://docs.comfy.org/custom-nodes/v3\_migration](https://docs.comfy.org/custom-nodes/v3_migration)  
2. Nodes 2.0 cant copy image from "save image" node. : r/comfyui \- Reddit, Zugriff am März 2, 2026, [https://www.reddit.com/r/comfyui/comments/1pcb4co/nodes\_20\_cant\_copy\_image\_from\_save\_image\_node/](https://www.reddit.com/r/comfyui/comments/1pcb4co/nodes_20_cant_copy_image_from_save_image_node/)  
3. Hosting a ComfyUI Workflow via API \- 9elements, Zugriff am März 2, 2026, [https://9elements.com/blog/hosting-a-comfyui-workflow-via-api/](https://9elements.com/blog/hosting-a-comfyui-workflow-via-api/)  
4. ComfyUI-test-framework/nodes.py at main \- GitHub, Zugriff am März 2, 2026, [https://github.com/Comfy-Org/ComfyUI-test-framework/blob/main/nodes.py](https://github.com/Comfy-Org/ComfyUI-test-framework/blob/main/nodes.py)  
5. Security: Symlink Path Traversal in /view endpoint allows arbitrary file read \#12285 \- GitHub, Zugriff am März 2, 2026, [https://github.com/Comfy-Org/ComfyUI/issues/12285](https://github.com/Comfy-Org/ComfyUI/issues/12285)  
6. Routes \- ComfyUI, Zugriff am März 2, 2026, [https://docs.comfy.org/development/comfyui-server/comms\_routes](https://docs.comfy.org/development/comfyui-server/comms_routes)  
7. Building a Production-Ready ComfyUI API: A Complete Guide \- ViewComfy, Zugriff am März 2, 2026, [https://www.viewcomfy.com/blog/building-a-production-ready-comfyui-api](https://www.viewcomfy.com/blog/building-a-production-ready-comfyui-api)  
8. eddyhhlure1Eddy/ComfyUI-PreviewImageNode \- GitHub, Zugriff am März 2, 2026, [https://github.com/eddyhhlure1Eddy/ComfyUI-PreviewImageNode](https://github.com/eddyhhlure1Eddy/ComfyUI-PreviewImageNode)  
9. How to Change ComfyUI Output Folder Location, Zugriff am März 2, 2026, [https://comfyui-wiki.com/en/faq/how-to-change-output-folder](https://comfyui-wiki.com/en/faq/how-to-change-output-folder)  
10. output folder options · Comfy-Org ComfyUI · Discussion \#1292 \- GitHub, Zugriff am März 2, 2026, [https://github.com/Comfy-Org/ComfyUI/discussions/1292](https://github.com/Comfy-Org/ComfyUI/discussions/1292)  
11. macOS App \- Adjust paths for saving · Issue \#7128 · Comfy-Org/ComfyUI \- GitHub, Zugriff am März 2, 2026, [https://github.com/comfyanonymous/ComfyUI/issues/7128](https://github.com/comfyanonymous/ComfyUI/issues/7128)  
12. Can't get ComfyUI to access alternate model folders \- Reddit, Zugriff am März 2, 2026, [https://www.reddit.com/r/comfyui/comments/1bh6sv0/cant\_get\_comfyui\_to\_access\_alternate\_model\_folders/](https://www.reddit.com/r/comfyui/comments/1bh6sv0/cant_get_comfyui_to_access_alternate_model_folders/)  
13. Fresh Install "SaveImage not enough values to unpack (expected 5, got 0 · Issue \#2068 · Comfy-Org/ComfyUI · GitHub, Zugriff am März 2, 2026, [https://github.com/comfyanonymous/ComfyUI/issues/2068](https://github.com/comfyanonymous/ComfyUI/issues/2068)  
14. folder\_paths.py \- Comfy-Org/ComfyUI \- GitHub, Zugriff am März 2, 2026, [https://github.com/Comfy-Org/ComfyUI/blob/master/folder\_paths.py](https://github.com/Comfy-Org/ComfyUI/blob/master/folder_paths.py)  
15. Save Images to Local in ComfyUI, Zugriff am März 2, 2026, [https://comfyui-wiki.com/en/comfyui-nodes/image/save-image](https://comfyui-wiki.com/en/comfyui-nodes/image/save-image)  
16. Default Output Location for Save Image : r/comfyui \- Reddit, Zugriff am März 2, 2026, [https://www.reddit.com/r/comfyui/comments/1etecqf/default\_output\_location\_for\_save\_image/](https://www.reddit.com/r/comfyui/comments/1etecqf/default_output_location_for_save_image/)  
17. ComfyUI-KJNodes/nodes/image\_nodes.py at main \- GitHub, Zugriff am März 2, 2026, [https://github.com/kijai/ComfyUI-KJNodes/blob/main/nodes/image\_nodes.py](https://github.com/kijai/ComfyUI-KJNodes/blob/main/nodes/image_nodes.py)  
18. Preview Image | ComfyUI Wiki, Zugriff am März 2, 2026, [https://comfyui-wiki.com/en/comfyui-nodes/image/preview-image](https://comfyui-wiki.com/en/comfyui-nodes/image/preview-image)  
19. ComfyUI Node: Preview Image \- RunComfy, Zugriff am März 2, 2026, [https://www.runcomfy.com/comfyui-nodes/ComfyUI/preview-image](https://www.runcomfy.com/comfyui-nodes/ComfyUI/preview-image)  
20. ComfyUI Node: Image Format Selector \- RunComfy, Zugriff am März 2, 2026, [https://www.runcomfy.com/comfyui-nodes/ComfyUI-JNodes/JNodes\_ImageFormatSelector](https://www.runcomfy.com/comfyui-nodes/ComfyUI-JNodes/JNodes_ImageFormatSelector)  
21. Get model preview image \- ComfyUI, Zugriff am März 2, 2026, [https://docs.comfy.org/api-reference/cloud/model/get-model-preview-image](https://docs.comfy.org/api-reference/cloud/model/get-model-preview-image)  
22. How to modify the input folder? Add subfolders : r/comfyui \- Reddit, Zugriff am März 2, 2026, [https://www.reddit.com/r/comfyui/comments/1cloij4/how\_to\_modify\_the\_input\_folder\_add\_subfolders/](https://www.reddit.com/r/comfyui/comments/1cloij4/how_to_modify_the_input_folder_add_subfolders/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAiCAYAAADiWIUQAAAFWklEQVR4Xu3cWah1cxjH8Uco8zxTvOJCvJGpZLxAJEOGCFHKkOlCpCSzK3e8XEimMhMypBRbLijFjSlRLxlCUkJRhufX8/+3n/1/1zpnn87eZ2/5furprPXf6+z3v9d5a/96/mstMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApmKzdgDLxjkFAGBG3vL6y+sfr6/LtsZm7QqLOV1f9nfzumj48oLe9Nq3bG/sda7Xrxbvl2slneR1n9eZaWy11w5e63kdmcYv8NrIa32vS9J4F/3u3RbvreMXonNxv9exNjxWczjLhnM4r4zrnOmcax6ag37KC15blm0AALCCbvA6Me0rJCkEzNrONgxsm3odnl7rs18pUUB5rvyU47xOKNsrSf/mrmX7fK8HvDbwOtnrC693vbYor8srZfxhiyDV5yCv79P+l2m7daXXo2X7dhsG1r45fOz1qdetaUwO8/qkGQMAAFOmzokCwp5p7M5Ss5YD27h0fO0GqYtUO0kKSE94bVf2l2ubZl//zi7NWKU5KaSJulYKSDtahKUuj7QDPfQ3yiHtbesPeHrPGtIO8frdIgRrDl3n+J52oNja6712EAAATJeWx/5O+/rC137fF/+07GOxXLe3xbKs1MC2h9fLXoOyrSXPH71utFjCywGir8t0ik12GfQAr93L9oZe19l45+wIr+ctQqXC0msWAe7idMxTXh96fWPxefsMbPTzal/nbDE6Z7nDpjBX51ADruaojtxXNuxQVvqbbN6MAQCAKVJ37WeLL3rVVqMvr5gcptTFkbbDNkjbOaissQhCooDRZVBqkhTa3rAIa+P6Lm3XTqA85rWqbOcwpE5YH4WspQY2hcrPLQKyaA51HpqDrmMUdd+qPyyWQiuFvNyRBQAAU7bWYilt1rq6X+MGNh1TL5bvC2w/2eSXedVZ07V+44aXQy2WI7uoy5WvI6x+s9HwlA1s6YHtDOvv2mkOXX8HjV2T9hXY9k/7AABgyvRlrOXClu7I1LLYzV7bp/EDvV4s25da96MedCdkX52ajsvUxalqQBk3sOnatHqjwbdpvNKS3tMWAUuusugqPe51tsWNCZmu39Kx6kbVTlQrL4PqmLo82udZGx6jpV910RTG6nKjulu6iUDqkrCow1aXWnVHaaZzoyBafZS222NFgbHe4ak56301h5fKmOagfZ13LcnW92j/jygc6xo8AAAwZa97/WnxZayfm6TXdIG+6Po2fcHnx0Xs5PVQ2Z5kx0oh7ReL67du87rMho/iONrrs7K9uhyvZVwd+4yNLknWuYmubdPv5HrHIqgoPOkGBIWkvAysz65wop/qhtXl2dbVzf5eFvPuomCV51DP28EWd+jqvZ4sY3Kv14UW15DlrpuuLWwD8ukWj93Q8Zen8fbY2j3LJZrD+zacQw106rre5fWBxY0Slc6LwicAAJgTXXcP6vEU+jJXh6prCW859J6LLelV6rApkLTHn2P9IaulsNZ1bA196iBO2/Fep9noDQvaVjfymDQmCphdy6NaomzvOO07touOa+egDuJRtm6HcZXxWA8AAObCtl43WTwktYY2jalLow6MlhfV2Ro3EEySgoRC4w+2brep0tzaOxtbd1g850yhTEukstYiAKpjd4vFXZrz5MF2YAFLOXYpXrVYWgUAAHNKD4DV8pm6OQpt80qh7tp2cAx6uKyW/NZYfD6CySh1A3MXDgAAzBldx6YgpLCmJ+Uv1sH6L9L1eaLuYr5uCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+Z/4FTPjcs2TbGyYAAAAASUVORK5CYII=>