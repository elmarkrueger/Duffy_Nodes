import json

from comfy_api.latest import io


class DuffyShowAnything(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_ShowAnything",
            display_name="Show Anything",
            category="Duffy/Utils",
            description="Displays connected values as text and outputs the displayed value(s).",
            is_input_list=True,
            is_output_node=True,
            inputs=[
                io.AnyType.Input(
                    "value",
                    display_name="Value",
                    optional=True,
                    tooltip="Any supported value to display and pass through",
                ),
            ],
            outputs=[
                io.AnyType.Output(
                    "value",
                    display_name="Value",
                    tooltip="Displayed value(s) as produced by the node",
                ),
            ],
            hidden=[io.Hidden.unique_id, io.Hidden.extra_pnginfo],
        )

    @classmethod
    def execute(cls, **kwargs) -> io.NodeOutput:
        unique_id = cls.hidden.unique_id
        extra_pnginfo = cls.hidden.extra_pnginfo

        values = []
        if "value" in kwargs:
            for val in kwargs["value"]:
                if isinstance(val, str):
                    values.append(val)
                elif isinstance(val, (int, float, bool)):
                    values.append(str(val))
                elif isinstance(val, list) and len(val) <= 30:
                    values = val
                elif val is not None:
                    try:
                        values.append(json.dumps(val, indent=4, ensure_ascii=False))
                    except Exception:
                        try:
                            values.append(str(val))
                        except Exception:
                            raise Exception("source exists, but could not be serialized.")

        if extra_pnginfo and isinstance(extra_pnginfo, dict) and "workflow" in extra_pnginfo:
            _uid = unique_id[0] if isinstance(unique_id, list) else unique_id
            node = next((x for x in extra_pnginfo["workflow"]["nodes"] if str(x["id"]) == str(_uid)), None)
            if node:
                node["widgets_values"] = [values]

        result_val = values[0] if (isinstance(values, list) and len(values) == 1) else values
        return io.NodeOutput(result_val, ui={"text": values})
