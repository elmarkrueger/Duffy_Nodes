import re

from comfy_api.latest import io


class DuffyFindAndReplaceText(io.ComfyNode):
    """
    Performs literal find-and-replace on a string, with optional case-insensitive matching.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_FindAndReplaceText",
            display_name="Find and Replace Text",
            category="Duffy/Text",
            description="Finds literal text within a string and replaces all matches.",
            inputs=[
                io.String.Input(
                    "text",
                    display_name="Text",
                    default="",
                    multiline=True,
                    tooltip="The source text to manipulate. Supports both single-line and multiline content.",
                ),
                io.String.Input(
                    "find_text",
                    display_name="Find",
                    default="",
                    multiline=True,
                    tooltip="The literal text to search for. Leave empty to return the input unchanged.",
                ),
                io.String.Input(
                    "replace_with",
                    display_name="Replace With",
                    default="",
                    multiline=True,
                    tooltip="The text that will replace every match.",
                ),
                io.Boolean.Input(
                    "case_sensitive",
                    display_name="Case Sensitive",
                    default=True,
                    tooltip="When enabled, only exact-case matches are replaced.",
                ),
            ],
            outputs=[
                io.String.Output(
                    "text",
                    display_name="Text",
                    tooltip="The manipulated text output.",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(
        cls,
        text: str,
        find_text: str,
        replace_with: str,
        case_sensitive: bool,
    ) -> tuple[str, str, str, bool]:
        return (text, find_text, replace_with, case_sensitive)

    @classmethod
    def execute(
        cls,
        text: str,
        find_text: str,
        replace_with: str,
        case_sensitive: bool,
    ) -> io.NodeOutput:
        if not find_text:
            return io.NodeOutput(text)

        if case_sensitive:
            return io.NodeOutput(text.replace(find_text, replace_with))

        pattern = re.compile(re.escape(find_text), re.IGNORECASE)
        replaced_text = pattern.sub(lambda _: replace_with, text)
        return io.NodeOutput(replaced_text)
