from comfy_api.latest import io


class DuffyFiveFloatSliders(io.ComfyNode):
    """
    A node with five float sliders and customizable labels.
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
                io.Float.Input(
                    f"value_{i}",
                    display_name=f"Value {i}",
                    default=0.5,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    display_mode=io.NumberDisplay.slider,
                    tooltip=f"Float value for slider {i}",
                )
            )
            outputs.append(
                io.Float.Output(
                    f"out_{i}",
                    display_name=f"Value {i}",
                    tooltip=f"Output for slider {i}",
                )
            )

        return io.Schema(
            node_id="Duffy_FiveFloatSliders",
            display_name="Five Float Sliders",
            category="Duffy/Math",
            description="Five float sliders with customizable labels.",
            inputs=inputs,
            outputs=outputs,
        )

    @classmethod
    def execute(
        cls,
        label_1: str,
        value_1: float,
        label_2: str,
        value_2: float,
        label_3: str,
        value_3: float,
        label_4: str,
        value_4: float,
        label_5: str,
        value_5: float,
    ) -> io.NodeOutput:
        """
        Passes the float values to the outputs.
        """
        return io.NodeOutput(value_1, value_2, value_3, value_4, value_5)
