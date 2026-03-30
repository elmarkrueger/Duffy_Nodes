from comfy_api.latest import io


class DuffyFluxMaxShift(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_FluxMaxShift",
            display_name="Flux Max Shift",
            category="Duffy/Sampling",
            description="Calculates the max_shift value for the ModelSamplingFlux node. Replaces the Chroma Radiance subgraph with a single node.",
            inputs=[
                io.Integer.Input("width", default=1024, min=1, max=16384, step=1, tooltip="Image width in pixels"),
                io.Integer.Input("height", default=1024, min=1, max=16384, step=1, tooltip="Image height in pixels"),
                io.Float.Input("multiplier", default=1.00, min=0.01, max=5.00, step=0.01, tooltip="Scaling multiplier applied to the pixel count"),
                io.Integer.Input("divisor", default=1000000, min=1, max=100000000, step=1, tooltip="Divisor for the final value (default: 1M pixels)"),
            ],
            outputs=[
                io.Float.Output("max_shift", tooltip="Calculated max_shift value"),
            ],
        )

    @classmethod
    def execute(cls, width: int, height: int, multiplier: float, divisor: int, **kwargs) -> io.NodeOutput:
        max_shift = float((width * height * multiplier) / divisor)
        return io.NodeOutput(max_shift)
