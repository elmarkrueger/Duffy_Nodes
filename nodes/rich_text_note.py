import re
from comfy_api.latest import io


class DuffyRichTextNote(io.ComfyNode):
    """
    A rich text note node with WYSIWYG editing. Stores sanitized HTML in
    a hidden socketless string widget and outputs plain text (HTML tags
    stripped) for downstream LLM or prompt-processing nodes.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_RichTextNote",
            display_name="Rich Text Note",
            category="Duffy/Text",
            description=(
                "A rich text note editor. Click 'Open Editor' to edit "
                "formatted text with bold, italic, headings, lists, "
                "colors, links, and icons."
            ),
            inputs=[
                io.String.Input(
                    "rich_text",
                    default="",
                    socketless=True,
                    multiline=True,
                ),
            ],
            outputs=[
                io.String.Output(
                    "text",
                    display_name="Text",
                    tooltip="Plain text content (HTML tags stripped).",
                ),
            ],
        )

    @classmethod
    def execute(cls, rich_text: str = "", **kwargs) -> io.NodeOutput:
        download_urls = re.findall(r'data-url="([^"]*)"', rich_text)

        plain_text = re.sub(r"<[^>]*>", "", rich_text)
        plain_text = re.sub(r"\s+", " ", plain_text).strip()

        if download_urls:
            plain_text += "\n\nDownload Links:\n"
            for i, url in enumerate(download_urls, 1):
                plain_text += f"{i}. {url}\n"

        return io.NodeOutput(plain_text)
