from comfy_api.latest import io


class DuffyLogicGate(io.ComfyNode):
    """
    Performs logical operations on boolean inputs.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_LogicGate",
            display_name="Logic Gate",
            category="Duffy/Logic",
            description="Performs boolean logical operations such as AND, OR, NOT, NAND, NOR, XOR, and XNOR.",
            inputs=[
                io.Combo.Input(
                    "operation",
                    options=["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"],
                    display_name="Operation",
                    default="AND",
                    tooltip="Logical operation to perform",
                ),
                io.Boolean.Input(
                    "a",
                    display_name="A",
                    default=False,
                    tooltip="First boolean operand",
                ),
                io.Boolean.Input(
                    "b",
                    display_name="B",
                    optional=True,
                    default=False,
                    tooltip="Second boolean operand (ignored for NOT)",
                ),
            ],
            outputs=[
                io.Boolean.Output(
                    "result",
                    display_name="Result",
                    tooltip="Result of the logical operation",
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, operation: str, a: bool, b: bool = False, **kwargs) -> str:
        normalized_b = False if operation == "NOT" else bool(b)
        return f"{operation}:{int(bool(a))}:{int(normalized_b)}"

    @classmethod
    def execute(cls, operation: str, a: bool, b: bool = False, **kwargs) -> io.NodeOutput:
        normalized_b = bool(b)

        if operation == "NOT":
            result = not a
        elif operation == "AND":
            result = a and normalized_b
        elif operation == "OR":
            result = a or normalized_b
        elif operation == "NAND":
            result = not (a and normalized_b)
        elif operation == "NOR":
            result = not (a or normalized_b)
        elif operation == "XOR":
            result = a ^ normalized_b
        elif operation == "XNOR":
            result = not (a ^ normalized_b)
        else:
            result = False
            
        return io.NodeOutput(result)
