from comfy_api.latest import io


class DuffyIntegerCompare(io.ComfyNode):
    """
    Compares two integer values (A and B) using a Less Than (<) or Greater Than (>)
    condition and outputs both the selected integer value and the boolean result.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_IntegerCompare",
            display_name="Integer Compare",
            category="Duffy/Logic",
            description=(
                "Compares two integer values (A and B) using a 'Less Than (<)' or "
                "'Greater Than (>)' condition, outputting the selected integer value "
                "and the boolean comparison result."
            ),
            inputs=[
                io.Int.Input(
                    "a",
                    display_name="A",
                    default=0,
                    min=-2147483648,
                    max=2147483647,
                    step=1,
                    tooltip="First integer operand (A), e.g., width",
                ),
                io.Combo.Input(
                    "condition",
                    options=["Less Than (<)", "Greater Than (>)"],
                    display_name="Condition",
                    default="Less Than (<)",
                    tooltip="Comparison condition to evaluate (A < B or A > B)",
                ),
                io.Int.Input(
                    "b",
                    display_name="B",
                    default=0,
                    min=-2147483648,
                    max=2147483647,
                    step=1,
                    tooltip="Second integer operand (B), e.g., height",
                ),
            ],
            outputs=[
                io.Int.Output(
                    "value",
                    display_name="Value",
                    tooltip="Selected integer value (A if condition is met, otherwise B)",
                ),
                io.Boolean.Output(
                    "result",
                    display_name="Result",
                    tooltip="Boolean result of evaluating the condition (True or False)",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, a: int, condition: str, b: int, **kwargs) -> str:
        return f"{int(a)}:{condition}:{int(b)}"

    @classmethod
    def execute(cls, a: int, condition: str, b: int, **kwargs) -> io.NodeOutput:
        val_a = int(a)
        val_b = int(b)

        if condition == "Less Than (<)":
            is_true = val_a < val_b
        elif condition == "Greater Than (>)":
            is_true = val_a > val_b
        else:
            is_true = False

        selected_value = val_a if is_true else val_b
        return io.NodeOutput(selected_value, is_true)
