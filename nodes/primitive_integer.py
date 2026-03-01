from comfy_api.latest import io


class DuffyPrimitiveInteger(io.ComfyNode):
    """
    A primitive node that takes a single integer value and passes it through.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_PrimitiveInteger",
            display_name="Primitive Integer",
            category="Duffy/Primitives",
            description="Takes a single integer value and outputs it unchanged.",
            inputs=[
                io.Int.Input(
                    "value",
                    display_name="Value",
                    default=0,
                    min=-2147483648,
                    max=2147483647,
                    step=1,
                    tooltip="Integer value to pass through",
                ),
            ],
            outputs=[
                io.Int.Output(
                    "value",
                    display_name="Value",
                    tooltip="The integer value",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, value: int) -> str:
        return str(value)

    @classmethod
    def execute(cls, value: int) -> io.NodeOutput:
        return io.NodeOutput(value)
