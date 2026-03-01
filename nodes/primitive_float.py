from comfy_api.latest import io


class DuffyPrimitiveFloat(io.ComfyNode):
    """
    A primitive node that takes a single float value and passes it through.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_PrimitiveFloat",
            display_name="Primitive Float",
            category="Duffy/Primitives",
            description="Takes a single float value and outputs it unchanged.",
            inputs=[
                io.Float.Input(
                    "value",
                    display_name="Value",
                    default=0.0,
                    min=-1e12,
                    max=1e12,
                    step=0.01,
                    tooltip="Float value to pass through",
                ),
            ],
            outputs=[
                io.Float.Output(
                    "value",
                    display_name="Value",
                    tooltip="The float value",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, value: float) -> str:
        return str(value)

    @classmethod
    def execute(cls, value: float) -> io.NodeOutput:
        return io.NodeOutput(value)
