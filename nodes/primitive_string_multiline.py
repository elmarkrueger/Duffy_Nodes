from comfy_api.latest import io


class DuffyPrimitiveStringMultiline(io.ComfyNode):
    """
    A primitive node that takes a multiline string value and passes it through.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_PrimitiveStringMultiline",
            display_name="Primitive String (Multiline)",
            category="Duffy/Primitives",
            description="Takes a multiline string value and outputs it unchanged.",
            inputs=[
                io.String.Input(
                    "value",
                    display_name="Value",
                    default="",
                    multiline=True,
                    tooltip="Multiline string value to pass through",
                ),
            ],
            outputs=[
                io.String.Output(
                    "value",
                    display_name="Value",
                    tooltip="The multiline string value",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, value: str) -> str:
        return value

    @classmethod
    def execute(cls, value: str) -> io.NodeOutput:
        return io.NodeOutput(value)
