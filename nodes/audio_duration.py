from typing import TypedDict

import torch
from comfy_api.latest import io


class DuffyAudioDuration(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_AudioDuration",
            display_name="Audio Duration",
            category="Duffy/Audio",
            description="Returns the length of the provided audio in milliseconds.",
            inputs=[
                io.Audio.Input("audio", display_name="Audio")
            ],
            outputs=[
                io.Float.Output("duration_ms", display_name="Duration (ms)"),
                io.Int.Output("duration_ms_int", display_name="Duration ms (int)")
            ],
        )

    @classmethod
    def execute(cls, audio: dict, **kwargs) -> io.NodeOutput:
        # Check if the inputs appear valid
        if not audio or 'waveform' not in audio or 'sampler_rate' not in audio:
            return io.NodeOutput(0.0, 0)
            
        waveform = audio['waveform']
        sampler_rate = audio['sampler_rate']
            
        # audio['waveform'] shape is typically [batch/channel, samples] or [batch, channel, samples].
        # The number of samples is always the last dimension.
        num_samples = waveform.shape[-1]
            
        # Calculate duration in milliseconds: 1000 ms = 1 second
        duration_ms = (num_samples / sampler_rate) * 1000.0
        
        return io.NodeOutput(float(duration_ms), int(round(duration_ms)))
