import base64
import io as py_io
import json
import logging
import os
import re
import threading
import uuid
from typing import Any, Optional

import folder_paths  # type: ignore
import numpy as np
import server  # type: ignore
import torch
from aiohttp import web
from comfy_api.latest import io, ui
from PIL import Image

from ..utils.media import image_tensor_to_data_uri
from .gemma_4_12b_analyzer import _get_gguf_models, _get_mmproj_models, _model_cache_12b

logger = logging.getLogger(__name__)

# Dictionary to hold thread synchronization objects for GISA layout editor sessions
PENDING_GISA_SESSIONS = {}

# ---------------------------------------------------------------------------
# aiohttp HTTP route for GISA frontend communication
# ---------------------------------------------------------------------------
try:
    @server.PromptServer.instance.routes.post("/duffy/gisa/continue")
    async def gisa_continue(request: web.Request) -> web.Response:
        try:
            data = await request.json()
            session_id = data.get("session_id")
            layout = data.get("layout", {})
            
            if session_id in PENDING_GISA_SESSIONS:
                PENDING_GISA_SESSIONS[session_id]["layout"] = layout
                PENDING_GISA_SESSIONS[session_id]["event"].set()
                return web.json_response({"status": "success"})
            else:
                return web.json_response({"status": "error", "message": "Session not found"}, status=404)
        except Exception as e:
            return web.json_response({"status": "error", "message": str(e)}, status=500)
except Exception as exc:
    logger.warning("[ Duffy_Nodes ] Failed to register GISA HTTP route: %s", exc)

# ---------------------------------------------------------------------------
# CaptionVerifier Class - Strict Schema Verification for Ideogram 4
# ---------------------------------------------------------------------------
class CaptionVerifier:
    """Rigorous schema verification and cleaning tool for Ideogram 4 prompt JSONs."""
    
    @staticmethod
    def clean_and_verify(payload: dict) -> dict:
        # 1. Enforce existence of mutable top-level fields
        if "style_description" not in payload:
            payload["style_description"] = {}
        if "compositional_deconstruction" not in payload:
            payload["compositional_deconstruction"] = {}
            
        style = payload["style_description"]
        comp = payload["compositional_deconstruction"]
        
        # 2. Key mutual exclusivity (photo vs. art_style)
        if "photo" in style and "art_style" in style:
            # Fall back to photo or raise error. Let's raise an explicit Exception as per PRD
            raise ValueError(
                "Ideogram 4 JSON schema violation: 'photo' and 'art_style' are mutually exclusive "
                "within style_description. Please select one or the other."
            )
            
        # 3. Restructure style_description in exact sequence:
        # aesthetics, lighting, photo/art_style, medium, color_palette
        ordered_style = {}
        for k in ["aesthetics", "lighting", "photo", "art_style", "medium", "color_palette"]:
            if k in style:
                ordered_style[k] = style[k]
        payload["style_description"] = ordered_style
        
        # 4. Global color palette verification
        if "color_palette" in ordered_style:
            palette = ordered_style["color_palette"]
            if not isinstance(palette, list):
                palette = []
            # Upper limit of 16 colors
            if len(palette) > 16:
                palette = palette[:16]
            
            cleaned_palette = []
            for color in palette:
                if isinstance(color, str):
                    # Enforce uppercase and # prefix
                    color = color.strip().upper()
                    if not color.startswith("#"):
                        color = "#" + color
                    # Strict validation: length of 7 (e.g. #FF00FF)
                    if re.match(r"^#[0-9A-F]{6}$", color):
                        cleaned_palette.append(color)
            ordered_style["color_palette"] = cleaned_palette

        # 5. Compositional deconstruction serialization order: background before elements
        ordered_comp = {}
        if "background" in comp:
            ordered_comp["background"] = comp["background"]
        else:
            ordered_comp["background"] = "A clean empty background"
            
        if "elements" in comp:
            ordered_comp["elements"] = comp["elements"]
        else:
            ordered_comp["elements"] = []
            
        payload["compositional_deconstruction"] = ordered_comp
        
        # 6. Bounding Box check and clamping
        elements = ordered_comp["elements"]
        if not isinstance(elements, list):
            elements = []
            ordered_comp["elements"] = elements
            
        cleaned_elements = []
        for i, el in enumerate(elements):
            if not isinstance(el, dict):
                continue
            
            # Handle native VLM visual detection format: {"bbox": [[ymin, xmin, ymax, xmax], "label"]}
            bbox_val = el.get("bbox")
            if isinstance(bbox_val, list) and len(bbox_val) == 2:
                coords = bbox_val[0]
                label = bbox_val[1]
                if isinstance(coords, list) and len(coords) == 4 and isinstance(label, str):
                    el["bbox"] = coords
                    el["desc"] = label
            
            # Verify required keys
            el_type = el.get("type", "obj")
            if el_type not in ["obj", "text"]:
                el_type = "obj"
            el["type"] = el_type
            
            # Map alternative naming conventions generated by VLM
            if "description" in el:
                if not el.get("desc"):
                    el["desc"] = el["description"]
                el.pop("description", None)
            if "element" in el:
                if el_type == "text" and not el.get("text"):
                    el["text"] = el["element"]
                elif el_type == "obj" and not el.get("desc"):
                    el["desc"] = el["element"]
                el.pop("element", None)

            if "desc" not in el:
                el["desc"] = ""
                
            if el_type == "text" and "text" not in el:
                el["text"] = "TEXT"
            elif el_type == "obj" and "text" in el:
                # Remove text field from obj type elements as they are not permitted in schema
                el.pop("text", None)
                
            # Local color palette verification (max 5 colors)
            if "color_palette" in el:
                local_palette = el["color_palette"]
                if not isinstance(local_palette, list):
                    local_palette = []
                if len(local_palette) > 5:
                    local_palette = local_palette[:5]
                cleaned_local = []
                for color in local_palette:
                    if isinstance(color, str):
                        color = color.strip().upper()
                        if not color.startswith("#"):
                            color = "#" + color
                        if re.match(r"^#[0-9A-F]{6}$", color):
                            cleaned_local.append(color)
                el["color_palette"] = cleaned_local
                
            # Bbox checks: [y_min, x_min, y_max, x_max]
            bbox = el.get("bbox")
            if not isinstance(bbox, list) or len(bbox) != 4:
                bbox = [0, 0, 500, 500]  # default fallback
                
            # Convert to integers, clamping to [0, 1000] interval
            try:
                y_min = max(0, min(1000, int(round(bbox[0]))))
                x_min = max(0, min(1000, int(round(bbox[1]))))
                y_max = max(0, min(1000, int(round(bbox[2]))))
                x_max = max(0, min(1000, int(round(bbox[3]))))
            except Exception:
                y_min, x_min, y_max, x_max = 0, 0, 500, 500
                
            # Guard against inverted bounding boxes (y_min < y_max and x_min < x_max)
            if y_min >= y_max:
                y_max = min(1000, y_min + 50)
                if y_max == y_min:
                    y_min = max(0, y_min - 50)
            if x_min >= x_max:
                x_max = min(1000, x_min + 50)
                if x_max == x_min:
                    x_min = max(0, x_min - 50)
                    
            el["bbox"] = [y_min, x_min, y_max, x_max]
            cleaned_elements.append(el)
            
        ordered_comp["elements"] = cleaned_elements
        return payload

def extract_json_block(text: str) -> str:
    """Strip reasoning/thinking blocks and extract the first valid {...} JSON substring."""
    # Strip thinking tags
    text = re.sub(r"<\|channel>thought\n.*?<channel\|>", "", text, flags=re.DOTALL).strip()
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    
    # Locate first curly brace and last curly brace
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        return text[start:end+1]
    
    # Strip markdown block fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n", "", text)
        text = re.sub(r"\n```$", "", text)
    return text.strip()


def clean_json_syntactically(json_str: str) -> str:
    """Attempts to repair common VLM syntax mistakes in a JSON string (e.g. trailing commas)."""
    # Remove trailing commas inside arrays/objects
    json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
    # Remove line comments if any
    json_str = re.sub(r'//.*?\n', '\n', json_str)
    json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
    return json_str.strip()


# ---------------------------------------------------------------------------
# GISA Node Implementation
# ---------------------------------------------------------------------------
class DuffyGemmaIdeogramSpatialArchitect(io.ComfyNode):
    """Multimodal Layout Orchestration Node bridging Gemma-4-12B and Ideogram 4."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_GemmaIdeogramSpatialArchitect",
            display_name="Gemma Ideogram Spatial Architect",
            category="Duffy/LLM",
            description="Analyzes layout inputs using Gemma-4-12B multimodal intelligence and constructs validated Ideogram 4 JSON prompts.",
            inputs=[
                io.Combo.Input("gguf_model", options=_get_gguf_models(), tooltip="GGUF model file from models/LLM"),
                io.Combo.Input("mmproj_model", options=_get_mmproj_models(), tooltip="Multimodal projector file (mmproj-*.gguf)"),
                io.String.Input("text_prompt", multiline=True, default="", tooltip="Text description of the layout or composition"),
                io.String.Input("state_json", default="{}", socketless=True, tooltip="Persisted layout state JSON"),
                io.Boolean.Input("pause_execution", default=True, socketless=True, tooltip="Pause execution for layout fine-tuning"),
                io.Boolean.Input("enable_thinking", default=True, tooltip="Enable model reasoning / thinking mode"),
                io.Boolean.Input("unload_model", default=False, tooltip="Unload LLM from memory after execution to free VRAM"),
                io.Int.Input("max_tokens", default=2048, min=1, max=128000),
                io.Float.Input("temperature", default=0.2, min=0.0, max=2.0),
                io.Int.Input("n_gpu_layers", default=-1, min=-1, max=200),
                io.Int.Input("n_ctx", default=16384, min=1024, max=131072, step=1024),
                io.Int.Input("seed", default=42, min=-1, max=0x7FFFFFFFFFFFFFFF),
                io.Image.Input("image", optional=True, tooltip="Reference sketch or layout layout image"),
                io.Image.Input("preview_image", optional=True, tooltip="Optional preview image to display in the node workspace"),
            ],
            outputs=[
                io.String.Output("json_prompt", display_name="JSON Prompt"),
            ],
        )

    @classmethod
    def execute(
        cls,
        gguf_model: str,
        mmproj_model: str,
        text_prompt: str = "",
        state_json: str = "{}",
        pause_execution: bool = True,
        enable_thinking: bool = True,
        unload_model: bool = False,
        max_tokens: int = 2048,
        temperature: float = 0.2,
        n_gpu_layers: int = -1,
        n_ctx: int = 16384,
        seed: int = 42,
        image: Optional[torch.Tensor] = None,
        preview_image: Optional[torch.Tensor] = None,
        **kwargs
    ) -> io.NodeOutput:
        try:
            # Load and parse existing workflow state if any
            try:
                state_dict = json.loads(state_json) if state_json and state_json != "{}" else {}
            except Exception:
                state_dict = {}

            # ---------------------------------------------------------------------------
            # Determine if VLM inference is required
            # ---------------------------------------------------------------------------
            needs_vlm = False
            if not state_dict or "compositional_deconstruction" not in state_dict:
                needs_vlm = True
            else:
                meta = state_dict.get("_meta", {})
                if meta.get("text_prompt") != text_prompt:
                    needs_vlm = True
                elif (image is not None) != meta.get("has_image", False):
                    needs_vlm = True

            if needs_vlm:
                logger.info("[GISA] Inputs changed or state is empty. Executing Gemma-4-12B layout analysis...")
                
                # Resolve GGUF model and mmproj paths
                model_path = folder_paths.get_full_path("LLM", gguf_model)
                mmproj_path = folder_paths.get_full_path("LLM", mmproj_model)

                if not model_path or not os.path.isfile(model_path):
                    raise FileNotFoundError(f"GGUF model not found: '{gguf_model}'. Ensure it resides in models/LLM/")
                if not mmproj_path or not os.path.isfile(mmproj_path):
                    raise FileNotFoundError(f"Multimodal projector not found: '{mmproj_model}'. Ensure it resides in models/LLM/")

                # Load model (sharing cache with gemma_4_12b_analyzer)
                if _model_cache_12b.needs_reload(model_path, mmproj_path, n_gpu_layers, n_ctx, enable_thinking=enable_thinking):
                    _model_cache_12b.load_model(model_path, mmproj_path, n_gpu_layers, n_ctx, enable_thinking=enable_thinking)

                # Build watertight system prompt
                system_prompt = (
                    "You are a precise spatial extraction and layout algorithm for Ideogram 4. "
                    "Analyze the reference image and the user prompt to deconstruct all meaningful visual and textual elements.\n"
                    "Assign a field bbox to each element. Calculate the coordinates as an array [y_min, x_min, y_max, x_max] on an exact 0-1000 grid, "
                    "where (0,0) defines the upper left corner.\n"
                    "The return value must consist exclusively of a valid JSON object. "
                    "The keys within style_description must be written in this exact order: aesthetics, lighting, photo (or art_style), medium, color_palette. "
                    "Within compositional_deconstruction, the background key must be serialized before elements, and must contain a detailed description "
                    "of the environment or background scene from the user prompt (e.g., 'A dark, gloomy graveyard shrouded in darkness with tombstones') "
                    "ensuring it completely fills the canvas. Do not use generic placeholders like 'A layout composition background' or 'clean empty background' "
                    "unless no environment is described.\n"
                    "Include hexadecimal color codes exclusively in uppercase letters (e.g., #FF0000). "
                    "Typographic elements must be defined as type: \"text\" with a text field.\n"
                    "Do not include markdown syntax, code fences, or any preambles."
                )

                user_content = [{"type": "text", "text": f"User Prompt: {text_prompt}"}]
                if image is not None:
                    user_content.append(image_tensor_to_data_uri(image))

                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ]

                completion = _model_cache_12b.model_instance.create_chat_completion(
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    seed=seed if seed >= 0 else None,
                )

                raw_response = completion["choices"][0]["message"]["content"] or ""
                logger.info("[GISA] Gemma raw response length: %d", len(raw_response))
                
                try:
                    debug_file = r"C:\Users\elmar\.gemini\antigravity\brain\7f0c43ca-7342-475b-aa01-fd92971795ce\scratch\raw_gisa_output.txt"
                    os.makedirs(os.path.dirname(debug_file), exist_ok=True)
                    with open(debug_file, "w", encoding="utf-8") as f:
                        f.write(raw_response)
                except Exception as ex:
                    logger.warning("[GISA] Failed to write debug raw response: %s", ex)

                # Extract JSON block stripping any thinking tags
                extracted_response = extract_json_block(raw_response)
                # Repair common syntax issues (e.g. trailing commas)
                repaired_response = clean_json_syntactically(extracted_response)

                try:
                    vlm_layout = json.loads(repaired_response)
                    # Ensure structure matches
                    state_dict = CaptionVerifier.clean_and_verify(vlm_layout)
                except Exception as e:
                    logger.error("[GISA] Failed to parse VLM JSON response: %s. Creating empty fallback layout.", e)
                    logger.error("[GISA] The invalid JSON string was:\n%s", raw_response)
                    state_dict = {
                        "high_level_description": text_prompt,
                        "style_description": {
                            "aesthetics": "clean render",
                            "lighting": "studio",
                            "photo": {},
                            "medium": "photograph",
                            "color_palette": ["#FFFFFF", "#000000"]
                        },
                        "compositional_deconstruction": {
                            "background": "clean white background",
                            "elements": []
                        }
                    }
                
                # Save metadata so we can skip execution if same prompt is queried again
                state_dict["_meta"] = {
                    "text_prompt": text_prompt,
                    "has_image": image is not None
                }

            # ---------------------------------------------------------------------------
            # Workflow Pausing and Frontend Interaction
            # ---------------------------------------------------------------------------
            if pause_execution:
                session_id = str(uuid.uuid4())
                
                # Prepare image background preview if reference image is connected
                img_b64 = None
                if image is not None:
                    img_tensor = image[0].clone().cpu().numpy()
                    img_tensor = (img_tensor * 255).clip(0, 255).astype(np.uint8)
                    pil_img = Image.fromarray(img_tensor)
                    
                    buffered = py_io.BytesIO()
                    pil_img.save(buffered, format="JPEG", quality=80)
                    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
                    img_b64 = f"data:image/jpeg;base64,{img_b64}"

                # Prepare optional preview image streaming
                preview_b64 = None
                if preview_image is not None:
                    prev_tensor = preview_image[0].clone().cpu().numpy()
                    prev_tensor = (prev_tensor * 255).clip(0, 255).astype(np.uint8)
                    pil_prev = Image.fromarray(prev_tensor)
                    
                    buffered_prev = py_io.BytesIO()
                    pil_prev.save(buffered_prev, format="JPEG", quality=80)
                    preview_b64 = base64.b64encode(buffered_prev.getvalue()).decode("utf-8")
                    preview_b64 = f"data:image/jpeg;base64,{preview_b64}"

                PENDING_GISA_SESSIONS[session_id] = {
                    "event": threading.Event(),
                    "layout": state_dict
                }

                # Send event to reactive Vue 3 frontend
                server.PromptServer.instance.send_sync("duffy-gisa-pause", {
                    "session_id": session_id,
                    "layout": state_dict,
                    "image_b64": img_b64,
                    "preview_b64": preview_b64
                })

                # Wait up to 10 minutes (600s) for user confirmation from the UI
                success = PENDING_GISA_SESSIONS[session_id]["event"].wait(timeout=600)
                
                if session_id in PENDING_GISA_SESSIONS:
                    if success:
                        state_dict = PENDING_GISA_SESSIONS[session_id].get("layout", state_dict)
                    del PENDING_GISA_SESSIONS[session_id]

            # ---------------------------------------------------------------------------
            # Verification, Serialization, and Output
            # ---------------------------------------------------------------------------
            # Re-verify layout object
            verified_layout = CaptionVerifier.clean_and_verify(state_dict)
            
            # Strip internal tracking metadata from final output
            verified_layout.pop("_meta", None)

            # Minified ASCII-clean JSON serialization matching Ideogram 4 specifications
            dense_json = json.dumps(verified_layout, separators=(",", ":"), ensure_ascii=False)
            
            # Return output. If preview_image is connected, show it on node in canvas
            if preview_image is not None:
                return io.NodeOutput(dense_json, ui=ui.PreviewImage(preview_image, cls=cls))
            elif image is not None:
                return io.NodeOutput(dense_json, ui=ui.PreviewImage(image, cls=cls))
            else:
                return io.NodeOutput(dense_json)
        finally:
            if unload_model:
                logger.info("[GISA] Unloading model (unload_model=True)")
                _model_cache_12b.unload()
