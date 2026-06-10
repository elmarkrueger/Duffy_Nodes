import hashlib
import json

from comfy_api.latest import io


class DuffyDynamicFloat(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_DynamicFloat",
            display_name="Dynamic Float Provider",
            category="Duffy/Primitives",
            description="Dynamically provides float values (2 decimal places) assigned via Vue UI, mapped to discrete outputs.",
            inputs=[
                io.String.Input(
                    "float_payload",
                    default="[]",
                    socketless=True,
                    tooltip="Internal JSON payload managing the dynamic floats",
                ),
            ],
            outputs=[
                io.Float.Output(f"float_{i}") for i in range(1, 11)
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
        for i in range(10):
            if i < len(data):
                val = data[i].get("value", 0.0)
                try:
                    results.append(round(float(val), 2))
                except (ValueError, TypeError):
                    results.append(0.0)
            else:
                results.append(0.0)

        # Return exactly 10 results, mapped to the statically defined 10 schema outputs.
        # The frontend visual ports are dynamically filtered, but the backend V3 always routes exactly mapped lists.
        return io.NodeOutput(*results)
