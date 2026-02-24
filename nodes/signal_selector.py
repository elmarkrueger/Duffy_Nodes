from comfy_api.latest import io

# Reusable wildcard type — accepts any data across the DAG
AnyType = io.Custom("*")


class DuffySignalSelector(io.ComfyNode):
    """
    A 3-channel signal router with customizable labels and a single mutually exclusive
    slider. Only the active channel's upstream graph is evaluated;
    the other two branches are skipped via V3 lazy evaluation.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_SignalSelector",
            display_name="Signal Selector",
            category="Duffy/Routing",
            description=(
                "Routes one of three inputs to the output using a single mutually exclusive "
                "slider. Each channel has a customizable label. Only the "
                "active channel is evaluated — unused branches are skipped."
            ),
            inputs=[
                io.Int.Input(
                    "active_input",
                    default=1,
                    min=1,
                    max=3,
                    step=1,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Select which input to activate (1, 2, or 3)",
                ),
                # ── Channel 1 ──────────────────────────────────
                io.String.Input(
                    "label_1",
                    display_name="Input 1",
                    default="Signal A",
                    tooltip="Custom label for channel 1",
                ),
                AnyType.Input(
                    "input_1",
                    optional=True,
                    lazy=True,
                    display_name="Input 1",
                    tooltip="Connect any data to channel 1",
                ),

                # ── Channel 2 ──────────────────────────────────
                io.String.Input(
                    "label_2",
                    display_name="Input 2",
                    default="Signal B",
                    tooltip="Custom label for channel 2",
                ),
                AnyType.Input(
                    "input_2",
                    optional=True,
                    lazy=True,
                    display_name="Input 2",
                    tooltip="Connect any data to channel 2",
                ),

                # ── Channel 3 ──────────────────────────────────
                io.String.Input(
                    "label_3",
                    display_name="Input 3",
                    default="Signal C",
                    tooltip="Custom label for channel 3",
                ),
                AnyType.Input(
                    "input_3",
                    optional=True,
                    lazy=True,
                    display_name="Input 3",
                    tooltip="Connect any data to channel 3",
                ),
            ],
            outputs=[
                AnyType.Output(
                    "output",
                    display_name="Selected Signal",
                    tooltip="The data from the currently active channel",
                ),
            ],
        )

    @classmethod
    def check_lazy_status(
        cls,
        active_input: int,
        **kwargs,
    ) -> list[str]:
        """
        Only the selected channel's upstream graph is computed.
        """
        if active_input == 1:
            return ["input_1"]
        elif active_input == 2:
            return ["input_2"]
        elif active_input == 3:
            return ["input_3"]
        return ["input_1"]

    @classmethod
    def execute(
        cls,
        active_input: int,
        label_1: str,
        label_2: str,
        label_3: str,
        input_1=None,
        input_2=None,
        input_3=None,
    ) -> io.NodeOutput:
        """
        Passes the active channel's data to the output.
        """
        if active_input == 1:
            result = input_1
        elif active_input == 2:
            result = input_2
        elif active_input == 3:
            result = input_3
        else:
            result = input_1

        return io.NodeOutput(result)
