import math

from comfy_api.latest import io


class DuffyMathExpression(io.ComfyNode):
    """
    Evaluates a custom mathematical expression with inputs a, b, and c.
    Outputs the result natively as an integer and a float.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_MathExpression",
            display_name="Math Expression",
            category="Duffy/Math",
            description="Evaluates a mathematical expression using inputs a, b, and c and outputs both integer and float results.",
            inputs=[
                io.Float.Input(
                    "a",
                    display_name="A",
                    default=0.0,
                    min=-1e12,
                    max=1e12,
                    step=0.01,
                    tooltip="Variable 'a' for the expression",
                ),
                io.Float.Input(
                    "b",
                    display_name="B",
                    default=0.0,
                    min=-1e12,
                    max=1e12,
                    step=0.01,
                    tooltip="Variable 'b' for the expression",
                ),
                io.Float.Input(
                    "c",
                    display_name="C",
                    default=0.0,
                    min=-1e12,
                    max=1e12,
                    step=0.01,
                    tooltip="Variable 'c' for the expression",
                ),
                io.String.Input(
                    "expression",
                    display_name="Expression",
                    default="a + b + c",
                    tooltip="Mathematical expression natively evaluated using Python (e.g., 'a * math.sin(b) + c')",
                ),
            ],
            outputs=[
                io.Int.Output(
                    "int_result",
                    display_name="Int Result",
                    tooltip="Integer result of the evaluated expression",
                ),
                io.Float.Output(
                    "float_result",
                    display_name="Float Result",
                    tooltip="Float result of the evaluated expression",
                ),
            ],
        )

    @classmethod
    def execute(cls, a: float, b: float, c: float, expression: str, **kwargs) -> io.NodeOutput:
        allowed_names = {
            "a": a,
            "b": b,
            "c": c,
            "math": math,
        }
        
        try:
            # Safely evaluate the expression restricting access to built-in functions
            result = eval(expression, {"__builtins__": {}}, allowed_names)
            float_res = float(result)
            int_res = int(float_res)
        except Exception as e:
            print(f"[Duffy Math Expression] Error evaluating expression '{expression}': {e}")
            float_res = 0.0
            int_res = 0
            
        return io.NodeOutput(int_res, float_res)
