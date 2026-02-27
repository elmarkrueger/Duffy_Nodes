from comfy_api.latest import io


class DuffyMultiPassSampling(io.ComfyNode):
    """
    Multi-pass sampling parameter node for ComfyUI Nodes 2.0.
    Provides textual and multi-pass numerical parameter configuration
    using native Vue sliders.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_MultiPassSampling",
            display_name="Multi-Pass Sampling",
            category="Duffy/Sampling",
            description="Configures filename, filepath, denoise values, and step counts for multi-pass sampling.",
            inputs=[
                # String configurations
                io.String.Input(
                    "filename",
                    display_name="Filename",
                    default="Sampling_Output",
                    multiline=False,
                    tooltip="Output filename for the sampling result",
                ),
                io.String.Input(
                    "filepath",
                    display_name="Filepath",
                    default="./ComfyUI/output",
                    multiline=False,
                    tooltip="Output directory path",
                ),
                # Denoise value sliders (0.0 – 1.0)
                io.Float.Input(
                    "denoise_1",
                    display_name="Denoise Value 1",
                    default=1.00,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Denoise strength for pass 1",
                ),
                io.Float.Input(
                    "denoise_2",
                    display_name="Denoise Value 2",
                    default=0.75,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Denoise strength for pass 2",
                ),
                io.Float.Input(
                    "denoise_3",
                    display_name="Denoise Value 3",
                    default=0.50,
                    min=0.0,
                    max=1.0,
                    step=0.01,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Denoise strength for pass 3",
                ),
                # Step count sliders (1 – 100)
                io.Int.Input(
                    "steps_1",
                    display_name="Steps Sampler 1",
                    default=20,
                    min=1,
                    max=100,
                    step=1,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Sampling steps for pass 1",
                ),
                io.Int.Input(
                    "steps_2",
                    display_name="Steps Sampler 2",
                    default=20,
                    min=1,
                    max=100,
                    step=1,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Sampling steps for pass 2",
                ),
                io.Int.Input(
                    "steps_3",
                    display_name="Steps Sampler 3",
                    default=20,
                    min=1,
                    max=100,
                    step=1,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Sampling steps for pass 3",
                ),
            ],
            outputs=[
                io.String.Output("filename", display_name="Filename"),
                io.String.Output("filepath", display_name="Filepath"),
                io.Float.Output("denoise_1", display_name="Denoise Value 1"),
                io.Float.Output("denoise_2", display_name="Denoise Value 2"),
                io.Float.Output("denoise_3", display_name="Denoise Value 3"),
                io.Int.Output("steps_1", display_name="Steps Sampler 1"),
                io.Int.Output("steps_2", display_name="Steps Sampler 2"),
                io.Int.Output("steps_3", display_name="Steps Sampler 3"),
            ],
        )

    @classmethod
    def execute(
        cls,
        filename: str,
        filepath: str,
        denoise_1: float,
        denoise_2: float,
        denoise_3: float,
        steps_1: int,
        steps_2: int,
        steps_3: int,
    ) -> io.NodeOutput:
        return io.NodeOutput(
            filename, filepath,
            denoise_1, denoise_2, denoise_3,
            steps_1, steps_2, steps_3,
        )
