from comfy_api.latest import io


class DuffyFloatMath(io.ComfyNode):
    """
    Performs basic arithmetic (add, subtract, multiply, divide) on two floats.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_FloatMath",
            display_name="Float Math",
            category="Duffy/Math",
            description="Performs add, subtract, multiply, or divide on two floats.",
            inputs=[
                io.Float.Input(
                    "a",
                    display_name="A",
                    default=0.0,
                    min=-1e12,
                    max=1e12,
                    step=0.01,
                    tooltip="First operand",
                ),
                io.Combo.Input(
                    "operation",
                    options=["Add", "Subtract", "Multiply", "Divide"],
                    display_name="Operation",
                    default="Add",
                    tooltip="Arithmetic operation to perform",
                ),
                io.Float.Input(
                    "b",
                    display_name="B",
                    default=0.0,
                    min=-1e12,
                    max=1e12,
                    step=0.01,
                    tooltip="Second operand",
                ),
            ],
            outputs=[
                io.Float.Output(
                    "result",
                    display_name="Result",
                    tooltip="Result of the arithmetic operation",
                ),
            ],
        )

    @classmethod
    def execute(cls, a: float, operation: str, b: float) -> io.NodeOutput:
        if operation == "Add":
            result = a + b
        elif operation == "Subtract":
            result = a - b
        elif operation == "Multiply":
            result = a * b
        elif operation == "Divide":
            if b == 0.0:
                result = 0.0
            else:
                result = a / b
        else:
            result = 0.0
        return io.NodeOutput(result)
