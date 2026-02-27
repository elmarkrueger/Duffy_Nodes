from comfy_api.latest import io

# Reusable wildcard type — accepts any data across the DAG
AnyType = io.Custom("*")


class DuffyToggleSwitch(io.ComfyNode):
    """
    A 5-channel signal router with customizable labels and a single
    selector slider (1–5). Only the active channel's upstream graph
    is evaluated; the other four branches are skipped via V3 lazy
    evaluation.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        inputs = [
            io.Int.Input(
                "active_input",
                display_name="Active Input",
                default=1,
                min=1,
                max=5,
                step=1,
                display_mode=io.NumberDisplay.slider,
                tooltip="Select which input channel (1–5) is routed to the output",
            ),
        ]

        for i in range(1, 6):
            inputs.append(
                io.String.Input(
                    f"label_{i}",
                    display_name=f"Input {i}",
                    default=f"Input {i}",
                    tooltip=f"Custom label for channel {i}",
                )
            )
            inputs.append(
                AnyType.Input(
                    f"input_{i}",
                    optional=True,
                    lazy=True,
                    display_name=f"Input {i}",
                    tooltip=f"Connect any data to channel {i}",
                )
            )

        return io.Schema(
            node_id="Duffy_ToggleSwitch",
            display_name="Toggle Switch",
            category="Duffy/Routing",
            description=(
                "Routes one of five inputs to the output using a selector slider. "
                "Each channel has a customizable label. Only the active channel "
                "is evaluated — unused branches are skipped."
            ),
            inputs=inputs,
            outputs=[
                AnyType.Output(
                    "output",
                    display_name="Selected Signal",
                    tooltip="The data from the currently active channel",
                ),
            ],
        )

    @classmethod
    def check_lazy_status(cls, active_input: int, **kwargs) -> list[str]:
        channel = max(1, min(5, active_input))
        return [f"input_{channel}"]

    @classmethod
    def execute(
        cls,
        active_input: int,
        label_1: str = "",
        label_2: str = "",
        label_3: str = "",
        label_4: str = "",
        label_5: str = "",
        input_1=None,
        input_2=None,
        input_3=None,
        input_4=None,
        input_5=None,
    ) -> io.NodeOutput:
        channel = max(1, min(5, active_input))
        inputs = {1: input_1, 2: input_2, 3: input_3, 4: input_4, 5: input_5}
        return io.NodeOutput(inputs[channel])
