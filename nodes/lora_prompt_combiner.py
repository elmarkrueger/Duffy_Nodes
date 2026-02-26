from comfy_api.latest import io


class DuffyLoRaPromptCombiner(io.ComfyNode):
    """
    Combines a LoRa trigger and a main prompt using a customizable separator.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_LoRaPromptCombiner",
            display_name="LoRa Prompt Combiner",
            category="Duffy/Text",
            description="Combines a LoRa trigger and a main prompt using a customizable separator.",
            inputs=[
                io.String.Input(
                    "lora_trigger",
                    display_name="LoRa Trigger",
                    default="",
                    multiline=True,
                    tooltip="The trigger words for the LoRa model",
                ),
                io.String.Input(
                    "separator",
                    display_name="Separator",
                    default=",",
                    tooltip="The separator to use between the LoRa trigger and the main prompt",
                ),
                io.String.Input(
                    "prompt",
                    display_name="Prompt",
                    default="",
                    multiline=True,
                    tooltip="The main prompt text",
                ),
            ],
            outputs=[
                io.String.Output(
                    "combined_prompt",
                    display_name="Combined Prompt",
                    tooltip="The combined prompt text",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        lora_trigger: str,
        separator: str,
        prompt: str,
    ) -> io.NodeOutput:
        """
        Combines the LoRa trigger and the main prompt with the separator.
        """
        if not lora_trigger:
            combined = prompt
        elif not prompt:
            combined = lora_trigger
        else:
            combined = f"{lora_trigger}{separator}{prompt}"

        return io.NodeOutput(combined)
