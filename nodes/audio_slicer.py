import torch
from comfy_api.latest import io


class DuffyAudioSlicer(io.ComfyNode):
    """
    Slices a portion of an audio file based on start and end times in seconds.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_AudioSlicer",
            display_name="Audio Slicer",
            category="Duffy/Audio",
            description="Slices a portion of an audio file based on start and end times in seconds.",
            inputs=[
                io.Audio.Input(
                    "audio", 
                    display_name="Audio File",
                    tooltip="The audio file to slice"
                ),
                io.Float.Input(
                    "start_time", 
                    display_name="Start Time (s)", 
                    default=0.0, 
                    min=0.0,
                    max=1e6, # High max value
                    step=0.1,
                    tooltip="Start time in seconds"
                ),
                io.Float.Input(
                    "end_time", 
                    display_name="End Time (s)", 
                    default=10.0, 
                    min=0.0,
                    max=1e6, # High max value
                    step=0.1,
                    tooltip="End time in seconds"
                ),
            ],
            outputs=[
                io.Audio.Output(
                    "audio", 
                    display_name="Modified Audio",
                    tooltip="The sliced audio"
                ),
            ],
        )

    @classmethod
    def execute(cls, audio: dict, start_time: float, end_time: float, **kwargs) -> io.NodeOutput:
        waveform: torch.Tensor | None = audio.get("waveform")
        sampler_rate: int | None = audio.get("sampler_rate")

        if waveform is None or sampler_rate is None:
            return io.NodeOutput(audio)

        # Audio waveform shape is typically [B, C, samples] or [1, C, samples]
        # We slice along the last dimension (samples)
        start_sample = int(start_time * sampler_rate)
        end_sample = int(end_time * sampler_rate)

        # Handle bounds
        max_samples = waveform.size(-1)
        start_sample = max(0, min(start_sample, max_samples))
        end_sample = max(start_sample, min(end_sample, max_samples))

        # Slice the last dimension
        sliced_waveform = waveform[..., start_sample:end_sample]

        # Return the new audio dictionary structure
        new_audio = {
            "waveform": sliced_waveform,
            "sampler_rate": sampler_rate
        }

        return io.NodeOutput(new_audio)
