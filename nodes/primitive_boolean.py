from comfy_api.latest import io


class DuffyPrimitiveBoolean(io.ComfyNode):
    """
    A primitive node that takes a single boolean value and passes it through.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_PrimitiveBoolean",
            display_name="Primitive Boolean",
            category="Duffy/Logic",
            description="Takes a single boolean value and outputs it unchanged.",
            inputs=[
                io.Boolean.Input(
                    "value",
                    display_name="Value",
                    default=False,
                    tooltip="Boolean value to pass through",
                ),
            ],
            outputs=[
                io.Boolean.Output(
                    "value",
                    display_name="Value",
                    tooltip="The boolean value",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, value: bool) -> str:
        return str(value)

    @classmethod
    def execute(cls, value: bool, **kwargs) -> io.NodeOutput:
        return io.NodeOutput(value)
