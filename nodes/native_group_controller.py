from comfy_api.latest import io


class DuffyNativeGroupBypasser(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_NativeGroupBypasser",
            display_name="Native Group Bypasser",
            category="Duffy/Workflow",
            description="Natively bypasses groups in ComfyUI Nodes 2.0 without LiteGraph bugs.",
            inputs=[
                io.AnyType.Input("any", display_name="Any", optional=True, tooltip="Wildcard input for arbitrary visual chaining"),
            ],
            outputs=[
                io.AnyType.Output("any", display_name="Any", tooltip="Passthrough output"),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> io.NodeOutput:
        return io.NodeOutput(kwargs.get("any"))


class DuffyNativeGroupMuter(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_NativeGroupMuter",
            display_name="Native Group Muter",
            category="Duffy/Workflow",
            description="Natively mutes groups in ComfyUI Nodes 2.0 without LiteGraph bugs.",
            inputs=[
                io.AnyType.Input("any", display_name="Any", optional=True, tooltip="Wildcard input for arbitrary visual chaining"),
            ],
            outputs=[
                io.AnyType.Output("any", display_name="Any", tooltip="Passthrough output"),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> io.NodeOutput:
        return io.NodeOutput(kwargs.get("any"))


class DuffyNativeSingleGroupBypasser(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_NativeSingleGroupBypasser",
            display_name="Native Single Group Bypasser",
            category="Duffy/Workflow",
            description="Natively bypasses a specific group in ComfyUI Nodes 2.0.",
            inputs=[
                io.AnyType.Input("any", display_name="Any", optional=True, tooltip="Wildcard input for arbitrary visual chaining"),
            ],
            outputs=[
                io.AnyType.Output("any", display_name="Any", tooltip="Passthrough output"),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> io.NodeOutput:
        return io.NodeOutput(kwargs.get("any"))


class DuffyNativeSingleGroupMuter(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_NativeSingleGroupMuter",
            display_name="Native Single Group Muter",
            category="Duffy/Workflow",
            description="Natively mutes a specific group in ComfyUI Nodes 2.0.",
            inputs=[
                io.AnyType.Input("any", display_name="Any", optional=True, tooltip="Wildcard input for arbitrary visual chaining"),
            ],
            outputs=[
                io.AnyType.Output("any", display_name="Any", tooltip="Passthrough output"),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> io.NodeOutput:
        return io.NodeOutput(kwargs.get("any"))

