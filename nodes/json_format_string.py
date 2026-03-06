import json

from comfy_api.latest import io


def _format_readable(obj, indent=0):
    """Recursively format a parsed JSON object into human-readable labeled text."""
    lines = []
    prefix = "  " * indent

    if isinstance(obj, dict):
        for key, value in obj.items():
            label = key.replace("_", " ").title()
            if isinstance(value, dict):
                lines.append(f"{prefix}{label}:")
                lines.append(_format_readable(value, indent + 1))
            elif isinstance(value, list):
                lines.append(f"{prefix}{label}:")
                for i, item in enumerate(value):
                    if isinstance(item, (dict, list)):
                        lines.append(f"{prefix}  [{i + 1}]")
                        lines.append(_format_readable(item, indent + 2))
                    else:
                        lines.append(f"{prefix}  - {item}")
            else:
                lines.append(f"{prefix}{label}: {value}")
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if isinstance(item, (dict, list)):
                lines.append(f"{prefix}[{i + 1}]")
                lines.append(_format_readable(item, indent + 1))
            else:
                lines.append(f"{prefix}- {item}")
    else:
        lines.append(f"{prefix}{obj}")

    return "\n".join(lines)


class DuffyJsonFormatString(io.ComfyNode):
    """
    Parses a raw JSON string and outputs it as a well-formatted multiline string.
    Supports Pretty JSON (indented) and Readable Text (human-friendly labels) modes.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_JsonFormatString",
            display_name="JSON Format String",
            category="Duffy/utilities",
            description="Parses a JSON string and outputs a well-formatted multiline representation.",
            inputs=[
                io.String.Input(
                    "json_text",
                    display_name="JSON Text",
                    default="",
                    multiline=True,
                    tooltip="Raw JSON string to format",
                ),
                io.Combo.Input(
                    "format_mode",
                    options=["Pretty JSON", "Readable Text"],
                    display_name="Format Mode",
                    default="Readable Text",
                    tooltip="Pretty JSON: indented JSON. Readable Text: human-friendly labeled sections.",
                ),
                io.Int.Input(
                    "indent_size",
                    display_name="Indent Size",
                    default=2,
                    min=1,
                    max=8,
                    step=1,
                    tooltip="Number of spaces per indent level (used in Pretty JSON mode)",
                ),
            ],
            outputs=[
                io.String.Output(
                    "formatted_text",
                    display_name="Formatted Text",
                    tooltip="The formatted string output",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, json_text: str, format_mode: str, indent_size: int) -> str:
        return f"{json_text}|{format_mode}|{indent_size}"

    @classmethod
    def execute(cls, json_text: str, format_mode: str, indent_size: int, **kwargs) -> io.NodeOutput:
        text = json_text.strip()
        if not text:
            return io.NodeOutput("")

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as e:
            return io.NodeOutput(f"[JSON Parse Error] {e}")

        if format_mode == "Pretty JSON":
            formatted = json.dumps(parsed, indent=indent_size, ensure_ascii=False)
        else:
            formatted = _format_readable(parsed)

        return io.NodeOutput(formatted)
