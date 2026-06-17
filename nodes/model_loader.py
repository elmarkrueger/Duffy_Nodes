import importlib
import inspect
import logging
import os
import sys

import comfy.model_management
import comfy.sd
import comfy.utils
import folder_paths
import torch
from comfy_api.latest import io
from safetensors import safe_open

import nodes

# Try to import GGUF components dynamically due to the hyphenated folder name
GGMLOps = None
GGUFModelPatcher = None
gguf_sd_loader = None
gguf_clip_loader = None
HAS_GGUF_SUPPORT = False

def _patch_gguf_base(gguf_nodes_module):
    global GGMLOps, GGUFModelPatcher, gguf_sd_loader, gguf_clip_loader, HAS_GGUF_SUPPORT
    GGMLOps = gguf_nodes_module.GGMLOps
    GGUFModelPatcher = gguf_nodes_module.GGUFModelPatcher
    gguf_sd_loader = gguf_nodes_module.gguf_sd_loader
    gguf_clip_loader = gguf_nodes_module.gguf_clip_loader
    HAS_GGUF_SUPPORT = True
    try:
        import comfy.model_patcher
        if hasattr(comfy.model_patcher, "CoreModelPatcher"):
            gguf_nodes_module.GGUFModelPatcher.__bases__ = (comfy.model_patcher.CoreModelPatcher,)
    except Exception as e:
        logging.warning(f"Failed to dynamically adjust GGUFModelPatcher base class: {e}")

try:
    # Look for ComfyUI-GGUF in sys.path or add it
    gguf_nodes = importlib.import_module("ComfyUI-GGUF.nodes")
    _patch_gguf_base(gguf_nodes)
except ImportError:
    # Check parent paths of custom_nodes
    custom_nodes_path = None
    for path in sys.path:
        if os.path.exists(os.path.join(path, "ComfyUI-GGUF")):
            custom_nodes_path = path
            break
    if not custom_nodes_path:
        possible_paths = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ComfyUI-GGUF"),
            os.path.join(os.path.dirname(os.path.abspath(folder_paths.__file__)), "custom_nodes", "ComfyUI-GGUF"),
        ]
        for p in possible_paths:
            if os.path.exists(p):
                parent = os.path.dirname(p)
                if parent not in sys.path:
                    sys.path.append(parent)
                custom_nodes_path = parent
                break
    if custom_nodes_path:
        try:
            gguf_nodes = importlib.import_module("ComfyUI-GGUF.nodes")
            _patch_gguf_base(gguf_nodes)
        except Exception as e:
            logging.error(f"CRITICAL: Model_Loader cannot initialize GGUF capabilities. Dependency failure: {e}")


def get_model_names():
    diffusion = folder_paths.get_filename_list("diffusion_models")
    unet_gguf = folder_paths.get_filename_list("unet_gguf") if "unet_gguf" in folder_paths.folder_names_and_paths else []
    return sorted(list(set(diffusion + unet_gguf)))


def get_clip_names():
    clip = folder_paths.get_filename_list("text_encoders")
    clip_gguf = folder_paths.get_filename_list("clip_gguf") if "clip_gguf" in folder_paths.folder_names_and_paths else []
    return sorted(list(set(clip + clip_gguf)))


def get_vae_names():
    try:
        return nodes.VAELoader.vae_list(nodes.VAELoader)
    except Exception:
        vaes = folder_paths.get_filename_list("vae")
        approx_vaes = folder_paths.get_filename_list("vae_approx")
        return sorted(list(set(vaes + approx_vaes + ["pixel_space"])))


def resolve_path(folder_name, name):
    if not name:
        return None
    # Enforce strict path traversal check
    if ".." in name or name.startswith("/") or name.startswith("\\") or ":" in name:
        raise ValueError(f"Path traversal attempt detected: '{name}'")
    
    # Try resolving via standard folder_paths
    path = folder_paths.get_full_path(folder_name, name)
    if path and os.path.exists(path):
        return path
    
    # Fallback paths for models
    if folder_name == "diffusion_models":
        for alt_folder in ["unet", "unet_gguf"]:
            path = folder_paths.get_full_path(alt_folder, name)
            if path and os.path.exists(path):
                return path
    elif folder_name == "text_encoders":
        for alt_folder in ["clip", "clip_gguf"]:
            path = folder_paths.get_full_path(alt_folder, name)
            if path and os.path.exists(path):
                return path
    elif folder_name == "vae":
        path = folder_paths.get_full_path("vae_approx", name)
        if path and os.path.exists(path):
            return path
            
    return None


def pre_validate_file(path, expected_type):
    if not path or not os.path.exists(path):
        raise ValueError(f"Model file does not exist at path: '{path}'")
        
    _, ext = os.path.splitext(path.lower())
    if ext == ".gguf":
        if not HAS_GGUF_SUPPORT:
            raise ValueError(
                "GGUF support is not available. Please install the 'gguf' library using: pip install --upgrade gguf\n"
                f"Cannot load GGUF file: {path}"
            )
        import gguf
        try:
            reader = gguf.GGUFReader(path)
        except Exception as e:
            raise ValueError(f"Failed to read GGUF header for '{path}': {e}")
            
        arch_str = None
        # get architecture field
        field = reader.get_field("general.architecture")
        if field is not None and len(field.types) == 1 and field.types[0] == gguf.GGUFValueType.STRING:
            arch_str = str(field.parts[field.data[-1]], encoding="utf-8")
        
        # Verify architecture type
        IMG_ARCH_LIST = {"flux", "sd1", "sdxl", "sd3", "aura", "hidream", "cosmos", "ltxv", "hyvid", "wan", "lumina2", "qwen_image"}
        TXT_ARCH_LIST = {"t5", "t5encoder", "llama", "qwen2vl", "qwen3", "qwen3vl", "gemma3"}
        VIS_TYPE_LIST = {"clip-vision", "mmproj"}
        
        if expected_type == "model":
            if arch_str and arch_str not in IMG_ARCH_LIST:
                raise ValueError(
                    f"Unexpected architecture type in GGUF file: '{arch_str}'. "
                    f"Expected a diffusion model (e.g. flux, sdxl, sd3, wan)."
                )
        elif expected_type == "clip":
            type_field = reader.get_field("general.type")
            type_str = None
            if type_field is not None and len(type_field.types) == 1 and type_field.types[0] == gguf.GGUFValueType.STRING:
                type_str = str(type_field.parts[type_field.data[-1]], encoding="utf-8")
                
            if arch_str not in TXT_ARCH_LIST and type_str not in VIS_TYPE_LIST:
                raise ValueError(
                    f"Unexpected text model architecture type in GGUF file: '{arch_str}'. "
                    f"Expected a text encoder architecture (e.g. t5, llama, gemma3)."
                )
    elif ext == ".safetensors":
        try:
            with safe_open(path, framework="pt", device="cpu") as f:
                keys = f.keys()
            if expected_type == "model":
                has_diff = any(k.startswith("model.diffusion_model.") or k.startswith("diffusion_model.") for k in keys)
                if not has_diff:
                    raise ValueError(
                        f"Expected diffusion model keys (e.g. 'model.diffusion_model') in safetensors, "
                        f"but they are categorically absent. Is this a CLIP or VAE file?"
                    )
            elif expected_type == "clip":
                has_clip = any(
                    k.startswith("cond_stage_model.") or 
                    k.startswith("transformer.") or 
                    k.startswith("encoder.") or 
                    k.startswith("shared.") or 
                    k.startswith("model.layers.") or
                    "text_model" in k
                    for k in keys
                )
                if not has_clip:
                    raise ValueError(
                        f"Expected text encoder keys in safetensors, but they are categorically absent. "
                        f"Is this a diffusion model or VAE file?"
                    )
            elif expected_type == "vae":
                has_vae = any(
                    k.startswith("encoder.") or 
                    k.startswith("decoder.") or 
                    k.startswith("first_stage_model.")
                    for k in keys
                )
                if not has_vae:
                    raise ValueError(
                        f"Expected VAE keys in safetensors, but they are categorically absent. "
                        f"Is this a diffusion model or CLIP file?"
                    )
        except Exception as e:
            if "Expected" in str(e):
                raise e
            raise ValueError(f"Failed to parse safetensors header: {e}")


def detect_clip_type(clip_name, clip_type_str):
    if clip_type_str and clip_type_str != "default":
        return clip_type_str
    
    # Simple semantic heuristics
    name_lower = clip_name.lower()
    if "flux" in name_lower:
        return "flux"
    elif "sd3" in name_lower or "stable_diffusion_3" in name_lower:
        return "sd3"
    elif "wan" in name_lower:
        return "wan"
    elif "sdxl" in name_lower:
        return "sdxl"
    
    return "stable_diffusion"


def _file_signature(path):
    if not path or not os.path.exists(path):
        return None
    try:
        stat = os.stat(path)
        return (path, stat.st_mtime_ns, stat.st_size)
    except Exception:
        return path


class DuffyModelLoader(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_ModelLoader",
            display_name="Unified Model Loader",
            category="Duffy/Loaders",
            description=(
                "Unified Model Loader node for ComfyUI Nodes 2.0. "
                "Consolidates Diffusion, CLIP, and VAE loaders into a single interface. "
                "Automatically routes weights for standard .safetensors and quantized .gguf formats."
            ),
            inputs=[
                io.Combo.Input(
                    "model_name",
                    options=get_model_names(),
                    tooltip="Select the primary Diffusion Transformer or UNet model file (.safetensors or .gguf).",
                ),
                io.Combo.Input(
                    "clip_name",
                    options=get_clip_names(),
                    tooltip="Select the CLIP/T5 text encoder file (.safetensors or .gguf).",
                ),
                io.Combo.Input(
                    "vae_name",
                    options=get_vae_names(),
                    tooltip="Select the Variational Autoencoder.",
                ),
                io.Combo.Input(
                    "clip_type",
                    options=[
                        "default", "stable_diffusion", "stable_cascade", "sd3", "stable_audio", 
                        "mochi", "ltxv", "pixart", "cosmos", "lumina2", "wan", "hidream", 
                        "chroma", "ace", "omnigen2", "qwen_image", "hunyuan_image", "flux2", 
                        "ovis", "longcat_image", "cogvideox", "lens", "pixeldit", "ideogram4"
                    ],
                    default="default",
                    tooltip="Override structural detection for complex CLIP models, or use 'default' for auto-detection."
                ),
                io.Combo.Input(
                    "weight_dtype",
                    options=["default", "fp8_e4m3fn", "fp16"],
                    default="default",
                    tooltip="Downcast precision for standard unquantized diffusion models."
                ),
                io.Combo.Input(
                    "device",
                    options=["default", "cpu"],
                    default="default",
                    optional=True,
                    advanced=True,
                    tooltip="Select the device to load the CLIP model ('default' or 'cpu')."
                ),
            ],
            outputs=[
                io.Model.Output("MODEL", tooltip="Loaded Diffusion Model (with patcher)."),
                io.Clip.Output("CLIP", tooltip="Loaded CLIP Text Encoder."),
                io.Vae.Output("VAE", tooltip="Loaded VAE decoder/encoder."),
            ]
        )

    @classmethod
    def validate_inputs(
        cls,
        model_name: str,
        clip_name: str,
        vae_name: str,
        clip_type: str = "default",
        weight_dtype: str = "default",
        device: str = "default",
        **kwargs
    ) -> bool | str:
        try:
            model_path = resolve_path("diffusion_models", model_name)
            if not model_path:
                return f"Model file '{model_name}' not found."
            clip_path = resolve_path("text_encoders", clip_name)
            if not clip_path:
                return f"CLIP file '{clip_name}' not found."
            return True
        except Exception as e:
            return str(e)

    @classmethod
    def fingerprint_inputs(
        cls,
        model_name: str,
        clip_name: str,
        vae_name: str,
        clip_type: str = "default",
        weight_dtype: str = "default",
        device: str = "default",
        **kwargs
    ):
        model_path = resolve_path("diffusion_models", model_name)
        clip_path = resolve_path("text_encoders", clip_name)
        
        vae_path = None
        if vae_name != "pixel_space":
            try:
                vae_path = resolve_path("vae", vae_name)
            except Exception:
                pass
                
        return (
            model_name,
            clip_name,
            vae_name,
            clip_type,
            weight_dtype,
            device,
            _file_signature(model_path),
            _file_signature(clip_path),
            _file_signature(vae_path)
        )

    @classmethod
    def execute(
        cls,
        model_name: str,
        clip_name: str,
        vae_name: str,
        clip_type: str = "default",
        weight_dtype: str = "default",
        device: str = "default",
        **kwargs
    ) -> io.NodeOutput:
        
        # 1. Resolve paths
        model_path = resolve_path("diffusion_models", model_name)
        clip_path = resolve_path("text_encoders", clip_name)
        
        if not model_path:
            raise ValueError(f"Could not find model file: '{model_name}'")
        if not clip_path:
            raise ValueError(f"Could not find CLIP file: '{clip_name}'")
            
        # Enforce header validation
        pre_validate_file(model_path, "model")
        pre_validate_file(clip_path, "clip")
        
        # 2. Load Diffusion Model
        model = None
        model_is_gguf = model_path.lower().endswith(".gguf")
        
        if model_is_gguf:
            if not HAS_GGUF_SUPPORT:
                raise ValueError("GGUF support is not available. Please install the 'gguf' package.")
            
            ops = GGMLOps()
            sd, extra = gguf_sd_loader(model_path)
            
            load_kwargs = {}
            valid_params = inspect.signature(comfy.sd.load_diffusion_model_state_dict).parameters
            if "metadata" in valid_params:
                load_kwargs["metadata"] = extra.get("metadata", {})
                
            model = comfy.sd.load_diffusion_model_state_dict(
                sd, model_options={"custom_operations": ops}, **load_kwargs
            )
            if model is None:
                raise RuntimeError(f"Could not detect model type of GGUF: {model_path}")
            model = GGUFModelPatcher.clone(model)
        else:
            model_options = {}
            if weight_dtype == "fp8_e4m3fn":
                model_options["dtype"] = torch.float8_e4m3fn
            elif weight_dtype == "fp16":
                model_options["dtype"] = torch.float16
                
            model = comfy.sd.load_diffusion_model(model_path, model_options=model_options)
            
        # 3. Load CLIP Text Encoder
        clip = None
        clip_is_gguf = clip_path.lower().endswith(".gguf")
        
        clip_type_val = detect_clip_type(clip_name, clip_type)
        clip_type_enum = getattr(comfy.sd.CLIPType, clip_type_val.upper(), comfy.sd.CLIPType.STABLE_DIFFUSION)
        
        if clip_is_gguf:
            if not HAS_GGUF_SUPPORT:
                raise ValueError("GGUF support is not available. Please install the 'gguf' package.")
                
            sd = gguf_clip_loader(clip_path)
            if "scaled_fp8" in sd:
                raise NotImplementedError(f"Mixing scaled FP8 with GGUF is not supported! ({clip_path})")
                
            try:
                # Prepare GGUF model options
                gguf_model_options = {
                    "custom_operations": GGMLOps,
                    "initial_device": comfy.model_management.text_encoder_offload_device()
                }
                if device == "cpu":
                    gguf_model_options["load_device"] = gguf_model_options["offload_device"] = torch.device("cpu")
                    
                clip = comfy.sd.load_text_encoder_state_dicts(
                    clip_type=clip_type_enum,
                    state_dicts=[sd],
                    model_options=gguf_model_options,
                    embedding_directory=folder_paths.get_folder_paths("embeddings"),
                )
                clip.patcher = GGUFModelPatcher.clone(clip.patcher)
            except (ValueError, IndexError) as te_err:
                raise ValueError(
                    f"Tokenizer initialization failed for CLIP '{clip_name}' (type: '{clip_type_val}'). "
                    f"Details: {te_err}. Please verify clip_type choice."
                )
        else:
            try:
                # Prepare device options for standard CLIP loading
                clip_model_options = {}
                if device == "cpu":
                    clip_model_options["load_device"] = clip_model_options["offload_device"] = torch.device("cpu")
                    
                clip = comfy.sd.load_clip(
                    ckpt_paths=[clip_path],
                    embedding_directory=folder_paths.get_folder_paths("embeddings"),
                    clip_type=clip_type_enum,
                    model_options=clip_model_options
                )
            except (ValueError, IndexError) as te_err:
                raise ValueError(
                    f"Tokenizer initialization failed for CLIP '{clip_name}' (type: '{clip_type_val}'). "
                    f"Details: {te_err}."
                )
                
        # 4. Load VAE
        vae = None
        try:
            vae = nodes.VAELoader().load_vae(vae_name)[0]
        except Exception as vae_err:
            raise ValueError(f"Failed to load VAE '{vae_name}': {vae_err}")
            
        # 5. Check vram_state and partially unload if resources are low
        vram_state = comfy.model_management.vram_state
        if vram_state in (comfy.model_management.VRAMState.LOW_VRAM, comfy.model_management.VRAMState.NO_VRAM):
            if hasattr(model, "partially_unload"):
                try:
                    model.partially_unload(model.offload_device)
                except Exception as e:
                    logging.warning(f"Failed to partially unload model: {e}")
            if clip is not None and getattr(clip, "patcher", None) is not None and hasattr(clip.patcher, "partially_unload"):
                try:
                    clip.patcher.partially_unload(clip.patcher.offload_device)
                except Exception as e:
                    logging.warning(f"Failed to partially unload clip: {e}")
                    
        return io.NodeOutput(model, clip, vae)
