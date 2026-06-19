from comfy_api.latest import io


class DuffyPromptSplitter(io.ComfyNode):
    """
    Splits a prompt containing positive and negative components separated by a selected delimiter.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_PromptSplitter",
            display_name="Prompt Splitter",
            category="Duffy/Text",
            description="Splits a multi-line string (like those from LLM nodes) into positive and negative prompts using a selected separator.",
            inputs=[
                io.String.Input(
                    "text",
                    display_name="Text",
                    default="",
                    multiline=True,
                    tooltip="The full prompt text containing both positive and negative components to split.",
                ),
                io.Combo.Input(
                    "separator",
                    options=["|", ",", ";", "\\n", "---", "__"],
                    display_name="Separator",
                    default="|",
                    tooltip="The character or sequence separating the positive and negative components.",
                ),
            ],
            outputs=[
                io.String.Output(
                    "positive",
                    display_name="Positive Prompt",
                    tooltip="The extracted positive prompt component.",
                ),
                io.String.Output(
                    "negative",
                    display_name="Negative Prompt",
                    tooltip="The extracted negative prompt component.",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, text: str, separator: str, **kwargs) -> tuple[str, str]:
        return (text, separator)

    @classmethod
    def execute(cls, text: str, separator: str, **kwargs) -> io.NodeOutput:
        actual_separator = separator
        # Handle visual representation of newline
        if separator == "\\n" or separator == "\n":
            actual_separator = "\n"

        parts = text.split(actual_separator, 1)
        if len(parts) == 2:
            positive = parts[0].strip()
            negative = parts[1].strip()
        else:
            positive = text.strip()
            negative = ""

        return io.NodeOutput(positive, negative)
