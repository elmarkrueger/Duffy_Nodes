import hashlib
import json

from comfy_api.latest import io


class DuffyDynamicInteger(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_DynamicInteger",
            display_name="Dynamic Integer Provider",
            category="Duffy/Primitives",
            description="Dynamically provides integer values assigned via Vue UI, mapped to discrete outputs.",
            inputs=[
                io.String.Input(
                    "int_payload",
                    default="[]",
                    socketless=True,
                    tooltip="Internal JSON payload managing the dynamic integers",
                ),
            ],
            outputs=[
                io.Int.Output(f"int_{i}") for i in range(1, 11)
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, int_payload: str, **kwargs) -> str:
        """
        Deterministic caching: whenever the int_payload JSON string changes,
        force a re-execution since outputs have mutated.
        """
        return hashlib.md5(int_payload.encode("utf-8")).hexdigest()

    @classmethod
    def execute(cls, int_payload: str, **kwargs) -> io.NodeOutput:
        try:
            data = json.loads(int_payload)
        except json.JSONDecodeError:
            data = []

        results = []
        for i in range(10):
            if i < len(data):
                val = data[i].get("value", 0)
                try:
                    results.append(int(val))
                except ValueError:
                    results.append(0)
            else:
                results.append(0)

        # Return exactly 10 results, mapped to the statically defined 10 schema outputs.
        # The frontend visual ports are dynamically filtered, but the backend V3 always routes exactly mapped lists.
        return io.NodeOutput(*results)
