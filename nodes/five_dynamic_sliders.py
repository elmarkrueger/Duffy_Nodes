import hashlib
import json

from comfy_api.latest import io


class DuffyFiveDynamicSliders(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_FiveDynamicSliders",
            display_name="Five Dynamic Sliders",
            category="Duffy/Math",
            description="Provides five float sliders with custom ranges, steps, decimals, and output labels.",
            inputs=[
                io.String.Input(
                    "float_payload",
                    default="[]",
                    socketless=True,
                    tooltip="Internal JSON payload managing the dynamic float sliders",
                ),
            ],
            outputs=[
                io.Float.Output(f"out_{i}", display_name=f"Value {i}") for i in range(1, 6)
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, float_payload: str, **kwargs) -> str:
        """
        Deterministic caching: whenever the float_payload JSON string changes,
        force a re-execution since outputs have mutated.
        """
        return hashlib.md5(float_payload.encode("utf-8")).hexdigest()

    @classmethod
    def execute(cls, float_payload: str, **kwargs) -> io.NodeOutput:
        try:
            data = json.loads(float_payload)
        except json.JSONDecodeError:
            data = []

        results = []
        for i in range(5):
            if i < len(data):
                item = data[i]
                val = item.get("value", 0.0)
                decimals = item.get("decimals", 2)
                try:
                    results.append(round(float(val), int(decimals)))
                except (ValueError, TypeError):
                    results.append(0.0)
            else:
                results.append(0.0)

        # Return exactly 5 results, mapped to the statically defined 5 outputs.
        return io.NodeOutput(*results)
