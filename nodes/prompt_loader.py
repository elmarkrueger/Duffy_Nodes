from __future__ import annotations

import asyncio
import hashlib
import importlib
import json
import logging
import os
import re
import threading
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any

try:
    _aiohttp = importlib.import_module("aiohttp")
    web: Any = getattr(_aiohttp, "web")
except Exception:  # pragma: no cover - only missing outside ComfyUI runtime
    web = None

try:
    _comfy_api_latest = importlib.import_module("comfy_api.latest")
    io: Any = getattr(_comfy_api_latest, "io")
    _HAS_V3 = True
except Exception:  # pragma: no cover - legacy fallback runtime
    io = None
    _HAS_V3 = False

try:
    _comfy_cli_args = importlib.import_module("comfy.cli_args")
    comfy_args = getattr(_comfy_cli_args, "args")
except Exception:  # pragma: no cover - tests or non-Comfy runtime
    comfy_args = None

try:
    _server_module = importlib.import_module("server")
    PromptServer = getattr(_server_module, "PromptServer")
    _SERVER_AVAILABLE = True
except Exception:  # pragma: no cover - tests or non-Comfy runtime
    PromptServer = None
    _SERVER_AVAILABLE = False

try:
    _folder_paths = importlib.import_module("folder_paths")
except Exception:  # pragma: no cover - tests or non-Comfy runtime
    _folder_paths = None


LOGGER = logging.getLogger(__name__)

_ALLOWED_EXTENSIONS = {".txt", ".csv", ".md"}
_DEFAULT_SEPARATOR = "|"
_DEFAULT_POSITIVE_MARKER = "(+)"
_DEFAULT_NEGATIVE_MARKER = "(-)"
_PROMPT_LOADER_STATE: dict[str, dict[str, Any]] = {}
_STATE_LOCK = threading.Lock()


def _normalize_hidden_value(value: Any) -> Any:
    if isinstance(value, list):
        return value[0] if value else None
    return value


def _sanitize_text(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()


def _state_key(unique_id: Any, file_path: str) -> str:
    normalized = _normalize_hidden_value(unique_id)
    if normalized is None:
        return f"path::{file_path.lower()}"
    return str(normalized)


def _normalize_path(file_path: str) -> str:
    cleaned = (file_path or "").strip().strip('"').strip("'")
    if not cleaned:
        raise ValueError("file_path is required.")

    resolved: str | None = None

    if _folder_paths is not None:
        try:
            annotated_resolved = _folder_paths.get_annotated_filepath(cleaned)
            if os.path.isfile(annotated_resolved):
                resolved = os.path.abspath(os.path.normpath(annotated_resolved))
        except Exception:
            pass

    if resolved is None:
        resolved = os.path.abspath(os.path.normpath(cleaned))

    if not os.path.isfile(resolved):
        raise FileNotFoundError(f"Prompt file not found: {resolved}")

    extension = Path(resolved).suffix.lower()
    if extension not in _ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(_ALLOWED_EXTENSIONS))
        raise ValueError(f"Unsupported file extension '{extension}'. Allowed: {allowed}")

    return resolved


def _file_signature(path: str) -> tuple[str, int, int]:
    stat = os.stat(path)
    return (path, stat.st_mtime_ns, stat.st_size)


def _read_text_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as file_handle:
            return file_handle.read()
    except UnicodeDecodeError:
        with open(path, "r", encoding="latin-1") as file_handle:
            return file_handle.read()


def _validate_markers(separator: str, positive_marker: str, negative_marker: str) -> None:
    if not separator:
        raise ValueError("separator cannot be empty.")
    if not positive_marker:
        raise ValueError("positive_marker cannot be empty.")
    if not negative_marker:
        raise ValueError("negative_marker cannot be empty.")
    if positive_marker == negative_marker:
        raise ValueError("positive_marker and negative_marker must be different.")


def _split_blocks(document: str, separator: str) -> list[str]:
    pattern = re.escape(separator)
    chunks = re.split(pattern, document)
    blocks = [_sanitize_text(chunk) for chunk in chunks if _sanitize_text(chunk)]
    return blocks


def _parse_block(block: str, positive_marker: str, negative_marker: str) -> tuple[str, str]:
    working = block
    pos_index = working.find(positive_marker)
    neg_index = working.find(negative_marker)

    positive = ""
    negative = ""

    if neg_index >= 0:
        before_negative = working[:neg_index]
        after_negative = working[neg_index + len(negative_marker):]

        if pos_index >= 0 and pos_index < neg_index:
            positive = before_negative[pos_index + len(positive_marker):]
        elif pos_index >= 0 and pos_index > neg_index:
            positive = before_negative
            after_negative = after_negative.replace(positive_marker, " ")
        else:
            positive = before_negative

        negative = after_negative.replace(negative_marker, " ")
    else:
        if pos_index >= 0:
            positive = working[pos_index + len(positive_marker):]
        else:
            positive = working
        negative = ""

    return (_sanitize_text(positive), _sanitize_text(negative))


def _parse_prompt_pairs(document: str, separator: str, positive_marker: str, negative_marker: str) -> list[tuple[str, str]]:
    blocks = _split_blocks(document, separator)
    pairs: list[tuple[str, str]] = []

    for block in blocks:
        positive, negative = _parse_block(block, positive_marker, negative_marker)
        if positive or negative:
            pairs.append((positive, negative))

    return pairs


def _parse_json_dict(raw: Any) -> dict[str, Any] | None:
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return None

    cleaned = raw.strip()
    if not cleaned:
        return None

    try:
        parsed = json.loads(cleaned)
    except Exception:
        return None

    if isinstance(parsed, dict):
        return parsed
    return None


def _inject_queue_runtime_inputs(prompt_payload: dict[str, Any], queue_nonce: str, queue_client_id: str) -> int:
    touched = 0
    for node_data in prompt_payload.values():
        if not isinstance(node_data, dict):
            continue
        if node_data.get("class_type") != "Duffy_PromptLoader":
            continue

        inputs = node_data.get("inputs")
        if not isinstance(inputs, dict):
            inputs = {}
            node_data["inputs"] = inputs

        inputs["queue_nonce"] = queue_nonce
        inputs["queue_client_id"] = queue_client_id
        touched += 1

    return touched


def _queue_next_prompt(prompt_payload: Any, workflow_payload: Any, unique_id: Any, queue_client_id: str) -> tuple[bool, str]:
    if not isinstance(prompt_payload, dict) or not prompt_payload:
        return (False, "Cannot auto-queue without hidden prompt payload.")

    queue_nonce = f"q_{uuid.uuid4()}"
    normalized_client_id = str(queue_client_id or "").strip()
    if not normalized_client_id:
        normalized_client_id = f"duffy_prompt_loader_{_normalize_hidden_value(unique_id) or 'unknown'}"

    try:
        prompt_to_queue = json.loads(json.dumps(prompt_payload))
    except Exception:
        prompt_to_queue = dict(prompt_payload)
    touched_nodes = _inject_queue_runtime_inputs(prompt_to_queue, queue_nonce, normalized_client_id)

    port = 8188
    if comfy_args is not None and getattr(comfy_args, "port", None):
        try:
            port = int(comfy_args.port)
        except Exception:
            port = 8188

    request_body = {
        "prompt": prompt_to_queue,
        "client_id": normalized_client_id,
        "prompt_id": str(uuid.uuid4()),
    }

    if isinstance(workflow_payload, dict) and workflow_payload:
        request_body["extra_data"] = {
            "extra_pnginfo": {
                "workflow": workflow_payload,
            }
        }

    request_data = json.dumps(request_body).encode("utf-8")
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}/prompt",
        data=request_data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            response_payload = response.read().decode("utf-8", errors="ignore")
            if 200 <= response.status < 300:
                node_count = len(prompt_to_queue)
                has_workflow = isinstance(workflow_payload, dict) and bool(workflow_payload)
                workflow_suffix = " with workflow metadata" if has_workflow else ""
                nonce_suffix = f"; nonce targets: {touched_nodes}" if touched_nodes > 0 else "; nonce targets: none"
                return (True, f"Queued next prompt run ({node_count} nodes{workflow_suffix}{nonce_suffix}).")
            return (False, f"Queue request failed ({response.status}): {response_payload[:160]}")
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        return (False, f"Queue request failed ({exc.code}): {details[:200]}")
    except Exception as exc:  # pragma: no cover - network-dependent branch
        return (False, f"Queue request error: {exc}")


def _build_runtime_state(
    *,
    state_key: str,
    file_path: str,
    signature: tuple[str, int, int],
    separator: str,
    positive_marker: str,
    negative_marker: str,
    reset_counter: int,
) -> dict[str, Any]:
    document = _read_text_file(file_path)
    pairs = _parse_prompt_pairs(document, separator, positive_marker, negative_marker)
    if not pairs:
        raise ValueError("No prompt pairs were found in the selected file.")

    return {
        "state_key": state_key,
        "file_path": file_path,
        "file_signature": signature,
        "file_hash": hashlib.sha256(document.encode("utf-8", errors="ignore")).hexdigest(),
        "separator": separator,
        "positive_marker": positive_marker,
        "negative_marker": negative_marker,
        "pairs": pairs,
        "total_prompts": len(pairs),
        "current_index": 0,
        "reset_counter": reset_counter,
        "last_queued_index": -1,
    }


def _run_prompt_loader(
    *,
    file_path: str,
    separator: str,
    positive_marker: str,
    negative_marker: str,
    auto_queue: bool,
    reset_counter: int,
    unique_id: Any,
    queue_client_id: str,
    prompt_payload: Any,
    workflow_payload: Any,
) -> dict[str, Any]:
    _validate_markers(separator, positive_marker, negative_marker)
    normalized_path = _normalize_path(file_path)
    signature = _file_signature(normalized_path)
    key = _state_key(unique_id, normalized_path)
    queue_next_index: int | None = None

    with _STATE_LOCK:
        state = _PROMPT_LOADER_STATE.get(key)

        reload_required = state is None
        if state is not None:
            reload_required = reload_required or state.get("file_path") != normalized_path
            reload_required = reload_required or state.get("file_signature") != signature
            reload_required = reload_required or state.get("separator") != separator
            reload_required = reload_required or state.get("positive_marker") != positive_marker
            reload_required = reload_required or state.get("negative_marker") != negative_marker
            reload_required = reload_required or state.get("reset_counter", 0) != int(reset_counter)

        if reload_required:
            state = _build_runtime_state(
                state_key=key,
                file_path=normalized_path,
                signature=signature,
                separator=separator,
                positive_marker=positive_marker,
                negative_marker=negative_marker,
                reset_counter=int(reset_counter),
            )
            _PROMPT_LOADER_STATE[key] = state

        if state is None:
            raise RuntimeError("Prompt loader state initialization failed.")

        pairs: list[tuple[str, str]] = state["pairs"]
        total = int(state["total_prompts"])
        current_index = int(state["current_index"])

        exhausted = current_index >= total
        if exhausted:
            positive_out = ""
            negative_out = ""
            status = f"Complete ({total}/{total})"
            queued = False
            queue_message = "No remaining prompts."
            next_index = current_index
        else:
            positive_out, negative_out = pairs[current_index]
            next_index = current_index + 1
            state["current_index"] = next_index

            has_next = next_index < total
            status = f"Processing prompt {next_index} of {total}"
            queued = False
            queue_message = ""
            if auto_queue and has_next:
                if state.get("last_queued_index") != next_index:
                    queue_next_index = next_index
                    queue_message = "Queue request pending."
                else:
                    queued = True
                    queue_message = "Next prompt already queued for this index."
            elif auto_queue and not has_next:
                queue_message = "Last prompt reached; queueing stopped."

            if not has_next:
                status = f"Complete ({total}/{total})"
                exhausted = True

        result = {
            "positive": positive_out,
            "negative": negative_out,
            "index": min(next_index, total),
            "total": total,
            "status": status,
            "queued": queued,
            "queue_message": queue_message,
            "exhausted": exhausted,
            "state_key": key,
        }

    if queue_next_index is not None:
        queued, queue_message = _queue_next_prompt(prompt_payload, workflow_payload, unique_id, queue_client_id)
        result["queued"] = queued
        result["queue_message"] = queue_message
        if queued:
            with _STATE_LOCK:
                state = _PROMPT_LOADER_STATE.get(key)
                if state is not None and int(state.get("current_index", 0)) >= queue_next_index:
                    state["last_queued_index"] = queue_next_index

    return result


def _fingerprint_for_state(
    *,
    file_path: str,
    separator: str,
    positive_marker: str,
    negative_marker: str,
    reset_counter: int,
    queue_nonce: str,
    unique_id: Any,
) -> tuple[str, str, str, str, int, str, int]:
    try:
        normalized_path = _normalize_path(file_path)
    except Exception:
        normalized_path = (file_path or "").strip()

    key = _state_key(unique_id, normalized_path)
    with _STATE_LOCK:
        state = _PROMPT_LOADER_STATE.get(key)
        current_index = int(state.get("current_index", -1)) if state else -1

    return (
        normalized_path,
        separator,
        positive_marker,
        negative_marker,
        int(reset_counter),
        str(queue_nonce or ""),
        current_index,
    )


def _browse_text_file_sync(initial_path: str = "") -> dict[str, Any]:
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)

        initial_dir = ""
        if initial_path:
            if os.path.isdir(initial_path):
                initial_dir = initial_path
            else:
                initial_dir = os.path.dirname(initial_path)

        selected_path = filedialog.askopenfilename(
            title="Select Prompt File",
            initialdir=initial_dir or None,
            filetypes=[
                ("Text files", "*.txt *.csv *.md"),
                ("All files", "*.*"),
            ],
        )
        root.destroy()

        if not selected_path:
            return {"ok": False, "error": "File selection cancelled."}

        return {"ok": True, "path": os.path.abspath(os.path.normpath(selected_path))}
    except Exception as exc:
        return {
            "ok": False,
            "error": (
                "File picker unavailable in backend runtime (tkinter missing). "
                "Use frontend upload-based Browse."
            ),
        }


_WEB = web

if _SERVER_AVAILABLE and _WEB is not None and PromptServer is not None:
    try:
        async def browse_prompt_loader_text_file(request):
            payload = {}
            try:
                payload = await request.json()
            except Exception:
                payload = {}

            initial_path = str(payload.get("initial_path", ""))
            # Tk dialogs are most reliable from the main thread. This call can
            # block briefly, but avoids the "button does nothing" failure mode.
            result = _browse_text_file_sync(initial_path)
            if result.get("ok"):
                return _WEB.json_response(result)
            return _WEB.json_response(result, status=400)

        if PromptServer.instance is not None and hasattr(PromptServer.instance, "routes"):
            PromptServer.instance.routes.post("/duffy/prompt_loader/browse_text_file")(browse_prompt_loader_text_file)
    except Exception as exc:  # pragma: no cover - route registration safety
        LOGGER.warning("[DuffyPromptLoader] Unable to register browse route: %s", exc)


if _HAS_V3 and io is not None:
    class DuffyPromptLoader(io.ComfyNode):
        @classmethod
        def define_schema(cls):
            return io.Schema(
                node_id="Duffy_PromptLoader",
                display_name="Prompt Loader",
                category="Duffy/Text",
                description=(
                    "Loads prompt pairs from a text file and emits one positive/negative pair per run. "
                    "Supports custom markers and optional automatic queueing."
                ),
                is_output_node=True,
                # Internal prompt index advances every execution, so caching must
                # never suppress this node between queued runs.
                not_idempotent=True,
                inputs=[
                    io.String.Input("file_path", default="", multiline=False),
                    io.String.Input("full_prompt_json", default="{}", multiline=False, socketless=True),
                    io.String.Input("full_workflow_json", default="{}", multiline=False, socketless=True),
                    io.String.Input("queue_nonce", default="", multiline=False, socketless=True),
                    io.String.Input("queue_client_id", default="", multiline=False, socketless=True),
                    io.String.Input("separator", default=_DEFAULT_SEPARATOR, multiline=False, socketless=True),
                    io.String.Input("positive_marker", default=_DEFAULT_POSITIVE_MARKER, multiline=False, socketless=True),
                    io.String.Input("negative_marker", default=_DEFAULT_NEGATIVE_MARKER, multiline=False, socketless=True),
                    io.Boolean.Input("auto_queue", default=False, socketless=True),
                    io.Int.Input("reset_counter", default=0, min=0, max=2147483647, socketless=True),
                ],
                outputs=[
                    io.String.Output("positive_prompt"),
                    io.String.Output("negative_prompt"),
                ],
                hidden=[
                    io.Hidden.unique_id,
                    io.Hidden.prompt,
                ],
            )

        @classmethod
        def validate_inputs(
            cls,
            file_path: str,
            full_prompt_json: str,
            full_workflow_json: str,
            queue_nonce: str,
            queue_client_id: str,
            separator: str,
            positive_marker: str,
            negative_marker: str,
            **kwargs,
        ) -> bool | str:
            try:
                _validate_markers(separator, positive_marker, negative_marker)
                _normalize_path(file_path)
            except Exception as exc:
                return str(exc)
            return True

        @classmethod
        def fingerprint_inputs(
            cls,
            file_path: str,
            full_prompt_json: str,
            full_workflow_json: str,
            queue_nonce: str,
            queue_client_id: str,
            separator: str,
            positive_marker: str,
            negative_marker: str,
            reset_counter: int,
            **kwargs,
        ) -> tuple[str, str, str, str, int, str, int]:
            unique_id = _normalize_hidden_value(cls.hidden.unique_id)
            return _fingerprint_for_state(
                file_path=file_path,
                separator=separator,
                positive_marker=positive_marker,
                negative_marker=negative_marker,
                reset_counter=reset_counter,
                queue_nonce=queue_nonce,
                unique_id=unique_id,
            )

        @classmethod
        def execute(
            cls,
            file_path: str,
            full_prompt_json: str,
            full_workflow_json: str,
            queue_nonce: str,
            queue_client_id: str,
            separator: str,
            positive_marker: str,
            negative_marker: str,
            auto_queue: bool,
            reset_counter: int,
            **kwargs,
        ):
            unique_id = _normalize_hidden_value(cls.hidden.unique_id)
            prompt_payload = _parse_json_dict(full_prompt_json)
            if not prompt_payload:
                prompt_payload = _normalize_hidden_value(cls.hidden.prompt)
            workflow_payload = _parse_json_dict(full_workflow_json)

            try:
                result = _run_prompt_loader(
                    file_path=file_path,
                    separator=separator,
                    positive_marker=positive_marker,
                    negative_marker=negative_marker,
                    auto_queue=bool(auto_queue),
                    reset_counter=int(reset_counter),
                    unique_id=unique_id,
                    queue_client_id=queue_client_id,
                    prompt_payload=prompt_payload,
                    workflow_payload=workflow_payload,
                )
                ui_payload = {
                    "status": [result["status"]],
                    "index": [result["index"]],
                    "total": [result["total"]],
                    "queued": [result["queued"]],
                    "queue_message": [result["queue_message"]],
                    "error": [""],
                    "exhausted": [result["exhausted"]],
                }
                return io.NodeOutput(result["positive"], result["negative"], ui=ui_payload)
            except Exception as exc:
                LOGGER.exception("[DuffyPromptLoader] Execution failed: %s", exc)
                ui_payload = {
                    "status": ["Error"],
                    "index": [0],
                    "total": [0],
                    "queued": [False],
                    "queue_message": [""],
                    "error": [str(exc)],
                    "exhausted": [True],
                }
                return io.NodeOutput("", "", ui=ui_payload)


class DuffyPromptLoaderLegacy:
    """
    Legacy fallback for pre-Nodes-2.0 runtimes.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "file_path": ("STRING", {"default": ""}),
                "full_prompt_json": ("STRING", {"default": "{}"}),
                "full_workflow_json": ("STRING", {"default": "{}"}),
                "queue_nonce": ("STRING", {"default": ""}),
                "queue_client_id": ("STRING", {"default": ""}),
                "separator": ("STRING", {"default": _DEFAULT_SEPARATOR}),
                "positive_marker": ("STRING", {"default": _DEFAULT_POSITIVE_MARKER}),
                "negative_marker": ("STRING", {"default": _DEFAULT_NEGATIVE_MARKER}),
                "auto_queue": ("BOOLEAN", {"default": False}),
                "reset_counter": ("INT", {"default": 0, "min": 0, "max": 2147483647}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt": "PROMPT",
            },
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("positive_prompt", "negative_prompt")
    FUNCTION = "execute"
    CATEGORY = "Duffy/Text"
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("NaN")

    def execute(
        self,
        file_path,
        full_prompt_json,
        full_workflow_json,
        queue_nonce,
        queue_client_id,
        separator,
        positive_marker,
        negative_marker,
        auto_queue,
        reset_counter,
        unique_id=None,
        prompt=None,
    ):
        prompt_payload = _parse_json_dict(full_prompt_json)
        if not prompt_payload:
            prompt_payload = prompt
        workflow_payload = _parse_json_dict(full_workflow_json)

        try:
            result = _run_prompt_loader(
                file_path=file_path,
                separator=separator,
                positive_marker=positive_marker,
                negative_marker=negative_marker,
                auto_queue=bool(auto_queue),
                reset_counter=int(reset_counter),
                unique_id=unique_id,
                queue_client_id=queue_client_id,
                prompt_payload=prompt_payload,
                workflow_payload=workflow_payload,
            )
            return (result["positive"], result["negative"])
        except Exception as exc:
            LOGGER.exception("[DuffyPromptLoaderLegacy] Execution failed: %s", exc)
            return ("", "")


NODE_CLASS_MAPPINGS = {
    "Duffy_PromptLoader": DuffyPromptLoaderLegacy,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Duffy_PromptLoader": "Prompt Loader",
}

