from comfy_api.latest import io


class DuffyIntegerMath(io.ComfyNode):
    """
    Performs basic arithmetic (add, subtract, multiply, divide) on two integers.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_IntegerMath",
            display_name="Integer Math",
            category="Duffy/Math",
            description="Performs add, subtract, multiply, or divide on two integers.",
            inputs=[
                io.Int.Input(
                    "a",
                    display_name="A",
                    default=0,
                    min=-2147483648,
                    max=2147483647,
                    step=1,
                    tooltip="First operand",
                ),
                io.Combo.Input(
                    "operation",
                    options=["Add", "Subtract", "Multiply", "Divide"],
                    display_name="Operation",
                    default="Add",
                    tooltip="Arithmetic operation to perform",
                ),
                io.Int.Input(
                    "b",
                    display_name="B",
                    default=0,
                    min=-2147483648,
                    max=2147483647,
                    step=1,
                    tooltip="Second operand",
                ),
            ],
            outputs=[
                io.Int.Output(
                    "result",
                    display_name="Result",
                    tooltip="Result of the arithmetic operation",
                ),
            ],
        )

    @classmethod
    def execute(cls, a: int, operation: str, b: int) -> io.NodeOutput:
        if operation == "Add":
            result = a + b
        elif operation == "Subtract":
            result = a - b
        elif operation == "Multiply":
            result = a * b
        elif operation == "Divide":
            if b == 0:
                result = 0
            else:
                result = a // b
        else:
            result = 0
        return io.NodeOutput(result)
