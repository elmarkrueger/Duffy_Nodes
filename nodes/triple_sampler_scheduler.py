import comfy.samplers
from comfy_api.latest import io


class DuffyTripleSamplerScheduler(io.ComfyNode):
    """
    A V3-compliant custom node that enables the programmatic selection of 
    three independent sampler and scheduler algorithmic pairs. 
    Outputs plain text strings for downstream metadata nodes.
    
    This node is designed for advanced workflow generation where users need to
    perform comparative analysis across multiple sampler/scheduler combinations
    simultaneously. The plain text string outputs are optimized for direct
    integration with metadata injection nodes like SaveImageWithMetadata.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        """
        Constructs the strict Vue-compatible UI schema for the node.
        Dynamically populates dropdown menus from the ComfyUI sampler registry.
        """
        # Fetch standard mathematical algorithm registries safely from the core
        available_samplers = comfy.samplers.KSampler.SAMPLERS
        available_schedulers = comfy.samplers.KSampler.SCHEDULERS

        return io.Schema(
            node_id="Duffy_TripleSamplerScheduler",
            display_name="Triple Sampler & Scheduler Selector",
            category="Duffy/Sampling",
            description="Selects 3 samplers and 3 schedulers, outputting specific string names for metadata formatting and parallel sampler testing workflows.",
            inputs=[
                io.Combo.Input(
                    "sampler_1",
                    display_name="Sampler 1",
                    options=available_samplers,
                    tooltip="First sampler algorithm for comparative testing",
                ),
                io.Combo.Input(
                    "scheduler_1",
                    display_name="Scheduler 1",
                    options=available_schedulers,
                    tooltip="First noise scheduler for comparative testing",
                ),
                io.Combo.Input(
                    "sampler_2",
                    display_name="Sampler 2",
                    options=available_samplers,
                    tooltip="Second sampler algorithm for comparative testing",
                ),
                io.Combo.Input(
                    "scheduler_2",
                    display_name="Scheduler 2",
                    options=available_schedulers,
                    tooltip="Second noise scheduler for comparative testing",
                ),
                io.Combo.Input(
                    "sampler_3",
                    display_name="Sampler 3",
                    options=available_samplers,
                    tooltip="Third sampler algorithm for comparative testing",
                ),
                io.Combo.Input(
                    "scheduler_3",
                    display_name="Scheduler 3",
                    options=available_schedulers,
                    tooltip="Third noise scheduler for comparative testing",
                ),
            ],
            outputs=[
                io.String.Output(
                    "sampler_1_out",
                    display_name="Sampler 1",
                    tooltip="Selected sampler 1 as plain text string",
                ),
                io.String.Output(
                    "scheduler_1_out",
                    display_name="Scheduler 1",
                    tooltip="Selected scheduler 1 as plain text string",
                ),
                io.String.Output(
                    "sampler_2_out",
                    display_name="Sampler 2",
                    tooltip="Selected sampler 2 as plain text string",
                ),
                io.String.Output(
                    "scheduler_2_out",
                    display_name="Scheduler 2",
                    tooltip="Selected scheduler 2 as plain text string",
                ),
                io.String.Output(
                    "sampler_3_out",
                    display_name="Sampler 3",
                    tooltip="Selected sampler 3 as plain text string",
                ),
                io.String.Output(
                    "scheduler_3_out",
                    display_name="Scheduler 3",
                    tooltip="Selected scheduler 3 as plain text string",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        sampler_1: str,
        scheduler_1: str,
        sampler_2: str,
        scheduler_2: str,
        sampler_3: str,
        scheduler_3: str,
    ) -> io.NodeOutput:
        """
        Executes the logic during the backend graph evaluation step.
        The selected string values are passed directly through to the NodeOutput bundle.
        
        This is a pure pass-through operation - the node acts as a data orchestrator,
        receiving the selected string variables from the dropdown UI and immediately
        returning them to the execution queue for downstream metadata injection.
        """
        return io.NodeOutput(
            sampler_1,
            scheduler_1,
            sampler_2,
            scheduler_2,
            sampler_3,
            scheduler_3,
        )
