import json
from typing import Optional, Union

from comfy_api.latest import io


class DuffyPromptBox(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_PromptBox",
            display_name="Prompt Box",
            category="Duffy/Text",
            description="A text box with multiline editing, copy, save, and optional input override.",
            inputs=[
                io.String.Input("json_data", default="{}", socketless=True),
                io.String.Input(
                    "optional_input",
                    display_name="Optional Input",
                    tooltip="Optional input string. If provided, this overrides the text in the box.",
                    optional=True,
                    force_input=True
                ),
            ],
            outputs=[
                io.String.Output("text", display_name="Text", tooltip="The output text."),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, json_data: str, optional_input: Optional[str] = None, **kwargs) -> str:
        return f"{json_data}_{optional_input}"

    @classmethod
    def validate_inputs(cls, json_data: str, optional_input: Optional[str] = None, **kwargs) -> Union[bool, str]:
        return True

    @classmethod
    def execute(cls, json_data: str, optional_input: Optional[str] = None, **kwargs) -> io.NodeOutput:
        text = ""
        if optional_input and optional_input.strip() != "":
            text = optional_input
        else:
            try:
                data = json.loads(json_data)
                text = data.get("text", "")
            except json.JSONDecodeError:
                text = ""
            
        return io.NodeOutput(text, ui={"text": [text]})
