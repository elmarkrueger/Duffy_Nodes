from comfy_api.latest import io


class DuffyPrimitiveString(io.ComfyNode):
    """
    A primitive node that takes a single-line string value and passes it through.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_PrimitiveString",
            display_name="Primitive String",
            category="Duffy/Primitives",
            description="Takes a single-line string value and outputs it unchanged.",
            inputs=[
                io.String.Input(
                    "value",
                    display_name="Value",
                    default="",
                    tooltip="Single-line string value to pass through",
                ),
            ],
            outputs=[
                io.String.Output(
                    "value",
                    display_name="Value",
                    tooltip="The string value",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, value: str) -> str:
        return value

    @classmethod
    def execute(cls, value: str) -> io.NodeOutput:
        return io.NodeOutput(value)
