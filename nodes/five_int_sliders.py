from comfy_api.latest import io


class DuffyFiveIntSliders(io.ComfyNode):
    """
    A node with five integer sliders and customizable labels.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        inputs = []
        outputs = []
        
        for i in range(1, 6):
            inputs.append(
                io.String.Input(
                    f"label_{i}",
                    display_name=f"Label {i}",
                    default=f"Value {i}",
                    tooltip=f"Custom label for slider {i}",
                )
            )
            inputs.append(
                io.Int.Input(
                    f"value_{i}",
                    display_name=f"Value {i}",
                    default=50,
                    min=1,
                    max=100,
                    step=1,
                    display_mode=io.NumberDisplay.slider,
                    tooltip=f"Integer value for slider {i}",
                )
            )
            outputs.append(
                io.Int.Output(
                    f"out_{i}",
                    display_name=f"Value {i}",
                    tooltip=f"Output for slider {i}",
                )
            )

        return io.Schema(
            node_id="Duffy_FiveIntSliders",
            display_name="Five Int Sliders",
            category="Duffy/Math",
            description="Five integer sliders with customizable labels.",
            inputs=inputs,
            outputs=outputs,
        )

    @classmethod
    def execute(
        cls,
        label_1: str,
        value_1: int,
        label_2: str,
        value_2: int,
        label_3: str,
        value_3: int,
        label_4: str,
        value_4: int,
        label_5: str,
        value_5: int,
    ) -> io.NodeOutput:
        """
        Passes the integer values to the outputs.
        """
        return io.NodeOutput(value_1, value_2, value_3, value_4, value_5)
