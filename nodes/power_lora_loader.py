import os
import json
import torch
from aiohttp import web
from server import PromptServer
import folder_paths
import comfy.sd
from comfy_api.latest import io

# Custom API endpoints
@PromptServer.instance.routes.get("/duffynodes/api/v1/lora-list")
async def get_lora_list(request):
    try:
        loras = folder_paths.get_filename_list("loras")
        # Optimization: returning structured JSON tree if needed, now just a simple list
        return web.json_response({"status": "success", "loras": loras})
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

@PromptServer.instance.routes.get("/duffynodes/api/v1/trigger-lookup")
async def get_trigger_lookup(request):
    lora_name = request.rel_url.query.get("lora_name", "")
    if not lora_name:
        return web.json_response({"status": "error", "message": "Missing lora_name param"}, status=400)
    
    try:
        # Fallback/stub implemented for metadata lookup
        lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
        # TODO: Implement Safetensors metadata extraction
        return web.json_response({"status": "success", "trigger_words": []})
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

class DuffyPowerLoraLoader(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_PowerLoraLoader",
            display_name="Power LoRA Loader",
            category="Duffy/Model",
            description="Advanced dynamic multi-LoRA loader with seamless preset integration.",
            inputs=[
                io.Model.Input("model"),
                io.Clip.Input("clip"),
                # Hidden payload for the Vue UI containing the LoRAs list state:
                # [ { "lora_name": str, "strength_model": float, "strength_clip": float, "trigger_words": str, "is_active": bool }, ... ]
                io.String.Input("lora_payload", default="[]", socketless=True),
            ],
            outputs=[
                io.Model.Output("MODEL"),
                io.Clip.Output("CLIP"),
                io.String.Output("TRIGGER_STR", display_name="Trigger Words")
            ]
        )
    
    @classmethod
    def execute(cls, model: torch.Tensor, clip: torch.Tensor, lora_payload: str, **kwargs) -> io.NodeOutput:
        try:
            lora_data = json.loads(lora_payload)
        except json.JSONDecodeError:
            lora_data = []

        current_model = model
        current_clip = clip
        active_triggers = []

        for lora in lora_data:
            if not lora.get("is_active", True):
                continue
            
            lora_name = lora.get("lora_name")
            strength_model = lora.get("strength_model", 1.0)
            strength_clip = lora.get("strength_clip", 1.0)
            trigger_words = lora.get("trigger_words", "").strip()
            
            if not lora_name:
                continue

            # Load and Patch LoRA
            try:
                lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
                lora_weights = comfy.utils.load_torch_file(lora_path, safe_load=True)
                
                current_model, current_clip = comfy.sd.load_lora_for_models(
                    current_model, current_clip, lora_weights, strength_model, strength_clip
                )
                
                if trigger_words:
                    active_triggers.append(trigger_words)
                    
            except FileNotFoundError:
                print(f"[Duffy Power Lora Loader] Warning: Lora file {lora_name} not found. Bypassing...")
                PromptServer.instance.send_sync("duffy.lora.error", {
                    "node_type": "Duffy_PowerLoraLoader",
                    "message": f"Lora file {lora_name} not found. Bypassing..."
                })
            except Exception as e:
                print(f"[Duffy Power Lora Loader] Error applying Lora {lora_name}: {e}")
                PromptServer.instance.send_sync("duffy.lora.error", {
                    "node_type": "Duffy_PowerLoraLoader",
                    "message": str(e)
                })

        trigger_str = ", ".join(active_triggers)
        return io.NodeOutput(current_model, current_clip, trigger_str)
