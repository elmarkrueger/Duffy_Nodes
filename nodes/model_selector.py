import json
import logging
import os

import folder_paths
from comfy_api.latest import io

logger = logging.getLogger(__name__)

MODEL_EXTENSIONS = {".safetensors", ".ckpt", ".pt", ".bin", ".pth", ".gguf"}
SLOT_COUNT = 3
_NONE = "(empty)"
_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "model_dirs_config.json")


# ── Config persistence helpers ──────────────────────────────────

def _load_model_dirs() -> list[str]:
    """Load model directories: always includes the default ComfyUI models dir,
    plus any extra directories saved in the config file."""
    dirs = [folder_paths.models_dir]
    if os.path.isfile(_CONFIG_FILE):
        try:
            with open(_CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            extra = data.get("model_dirs", [])
            if isinstance(extra, list):
                for d in extra:
                    d = d.strip()
                    if d and d not in dirs:
                        dirs.append(d)
        except (json.JSONDecodeError, OSError):
            logger.warning("Model Selector: could not read config: %s", _CONFIG_FILE)
    return dirs


def _save_model_dirs(dirs_text: str) -> None:
    """Save extra model directories from the node's text input to the config file."""
    lines = [line.strip() for line in dirs_text.splitlines() if line.strip()]
    try:
        with open(_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump({"model_dirs": lines}, f, indent=2)
    except OSError:
        logger.warning("Model Selector: could not write config: %s", _CONFIG_FILE)


def _get_extra_dirs_text() -> str:
    """Return the extra directories from config as newline-separated text."""
    if os.path.isfile(_CONFIG_FILE):
        try:
            with open(_CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            extra = data.get("model_dirs", [])
            if isinstance(extra, list):
                return "\n".join(d for d in extra if d.strip())
        except (json.JSONDecodeError, OSError):
            pass
    return ""


# ── Directory scanning helpers ──────────────────────────────────

def _scan_subfolders() -> dict[str, list[str]]:
    """
    Walk every directory in MODELS_DIRS and return a mapping of
    subfolder_name → sorted list of model filenames found inside.
    If the same subfolder name appears in multiple base dirs, the
    model lists are merged and deduplicated.
    """
    topology: dict[str, set[str]] = {}
    for base in _load_model_dirs():
        base = os.path.expandvars(os.path.expanduser(base))
        if not os.path.isdir(base):
            logger.warning("Model Selector: configured path does not exist: %s", base)
            continue
        real_base = os.path.realpath(base)
        try:
            for entry in os.listdir(real_base):
                entry_path = os.path.join(real_base, entry)
                if not os.path.isdir(entry_path) or entry.startswith("."):
                    continue
                models = topology.setdefault(entry, set())
                for root, _dirs, files in os.walk(entry_path):
                    for f in files:
                        if os.path.splitext(f)[1].lower() in MODEL_EXTENSIONS:
                            rel = os.path.relpath(
                                os.path.join(root, f), entry_path
                            ).replace("\\", "/")
                            models.add(rel)
        except OSError:
            logger.warning("Model Selector: could not read directory: %s", base)
    result = {k: sorted(v) for k, v in sorted(topology.items())}
    logger.info(
        "Model Selector: scanned %d subfolder(s) across directories: %s",
        len(result),
        ", ".join(_load_model_dirs()),
    )
    return result


def _build_folder_combo(slot_index: int, topology: dict[str, list[str]]) -> io.DynamicCombo.Input:
    """
    Build a DynamicCombo for one slot.  Each subfolder becomes an Option;
    inside each Option sits a regular Combo populated with the model files
    found in that subfolder.
    """
    options: list[io.DynamicCombo.Option] = []

    # First option: nothing selected
    options.append(io.DynamicCombo.Option(_NONE, []))

    for folder_name, model_files in topology.items():
        file_list = model_files if model_files else [_NONE]
        nested_combo = io.Combo.Input(
            f"model_{slot_index}",
            options=file_list,
            display_name=f"Model {slot_index}",
            tooltip=f"Select a model file from '{folder_name}'.",
        )
        options.append(io.DynamicCombo.Option(folder_name, [nested_combo]))

    return io.DynamicCombo.Input(
        f"folder_{slot_index}",
        options=options,
        display_name=f"Folder {slot_index}",
        tooltip=f"Select a subfolder for slot {slot_index}.",
    )


# ── Node ────────────────────────────────────────────────────────

class DuffyModelSelector(io.ComfyNode):
    """
    Three-slot model path selector using DynamicCombo.  The subfolder
    topology is pre-computed from MODELS_DIRS at server startup — no JS
    needed for dropdown population.  Each slot has a customizable label
    that is reflected on the output port via the companion JS extension.
    Outputs are plain-string filenames; nothing is loaded into VRAM.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        topology = _scan_subfolders()
        if not topology:
            logger.warning(
                "Model Selector: no subfolders found in configured directories. "
                "Add paths in the 'Extra Model Directories' field and restart."
            )

        inputs: list[io.Input] = [
            io.String.Input(
                "model_directories",
                default=_get_extra_dirs_text(),
                multiline=True,
                display_name="Extra Model Directories",
                tooltip=(
                    "Enter additional model directory paths, one per line. "
                    "The default ComfyUI models directory is always included. "
                    "After changing paths, run the workflow once to save, "
                    "then restart ComfyUI to rescan."
                ),
            ),
        ]

        for i in range(1, SLOT_COUNT + 1):
            inputs.append(
                io.String.Input(
                    f"label_{i}",
                    default=f"Model {i}",
                    display_name=f"Label {i}",
                    tooltip=f"Custom label for slot {i} (shown on the output port).",
                )
            )
            inputs.append(_build_folder_combo(i, topology))

        outputs = [
            io.String.Output(
                f"model_string_{i}",
                display_name=f"Model {i}",
                tooltip=f"Filename of the model selected in slot {i}.",
            )
            for i in range(1, SLOT_COUNT + 1)
        ]

        return io.Schema(
            node_id="Duffy_ModelSelector",
            display_name="Model Selector",
            category="Duffy/Selectors",
            description=(
                "Pick a subfolder and model for each of three slots. "
                "Outputs filenames as strings — models are NOT loaded. "
                "Add extra model directories in the text field and restart "
                "ComfyUI to rescan."
            ),
            inputs=inputs,
            outputs=outputs,
        )

    @classmethod
    def execute(cls, model_directories: str = "", **kwargs) -> io.NodeOutput:
        _save_model_dirs(model_directories)

        results = []
        for i in range(1, SLOT_COUNT + 1):
            folder_data = kwargs.get(f"folder_{i}", {})
            if isinstance(folder_data, dict):
                model = folder_data.get(f"model_{i}", "")
            else:
                model = ""
            if not model or model == _NONE:
                model = ""
            results.append(model)
        return io.NodeOutput(*results)
