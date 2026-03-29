import torch
from comfy_api.latest import io


def parse_time(time_str: str) -> float:
    """Parses a time string like 'MM:SS', 'HH:MM:SS', or 'SS.s' into float seconds."""
    if not time_str or time_str.strip() == "":
        return 0.0
    
    parts = time_str.strip().split(':')
    seconds = 0.0
    
    try:
        if len(parts) == 3:
            # HH:MM:SS
            seconds = float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            # MM:SS
            seconds = float(parts[0]) * 60 + float(parts[1])
        else:
            # SS or SS.s
            seconds = float(parts[0])
    except ValueError:
        pass
        
    return seconds


class DuffyAudioSlicer(io.ComfyNode):
    """
    Slices a portion of an audio file based on start and end times string format (e.g. 0:30, 3:44, or 10.5).
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_AudioSlicer",
            display_name="Audio Slicer",
            category="Duffy/Audio",
            description="Slices a portion of an audio file based on start and end times string format (e.g. 0:30, 3:44, or 10.5).",
            inputs=[
                io.Audio.Input(
                    "audio", 
                    display_name="Audio File",
                    tooltip="The audio file to slice"
                ),
                io.String.Input(
                    "start_time", 
                    display_name="Start Time", 
                    default="0:00", 
                    tooltip="Start time in format like 0:30, 1:20:00, or just seconds like 10.5"
                ),
                io.String.Input(
                    "end_time", 
                    display_name="End Time", 
                    default="0:10", 
                    tooltip="End time in format like 0:30, 1:20:00, or just seconds like 10.5"
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
    def execute(cls, audio: dict, start_time: str, end_time: str, **kwargs) -> io.NodeOutput:
        waveform: torch.Tensor | None = audio.get("waveform")
        sampler_rate: int | None = audio.get("sampler_rate")
        
        # Some audio dictionaries use 'sample_rate' instead of 'sampler_rate'
        if sampler_rate is None:
            sampler_rate = audio.get("sample_rate")

        if waveform is None or sampler_rate is None:
            return io.NodeOutput(audio)
        
        start_seconds = parse_time(start_time)
        end_seconds = parse_time(end_time)

        # Ensure start_seconds is strictly less than end_seconds, otherwise flip
        if start_seconds > end_seconds:
            start_seconds, end_seconds = end_seconds, start_seconds

        # Audio waveform shape is typically [B, C, samples] or [1, C, samples]
        # We slice along the last dimension (samples)
        start_sample = int(start_seconds * sampler_rate)
        end_sample = int(end_seconds * sampler_rate)

        # Handle bounds
        max_samples = waveform.size(-1)
        start_sample = max(0, min(start_sample, max_samples))
        end_sample = max(start_sample, min(end_sample, max_samples))

        # Slice the last dimension
        sliced_waveform = waveform[..., start_sample:end_sample]

        # Return the new audio dictionary structure
        new_audio = dict(audio)  # copy original metadata
        new_audio["waveform"] = sliced_waveform
        # Make sure that whichever sampling rate key was used before is safely written back
        if "sampler_rate" in audio:
            new_audio["sampler_rate"] = sampler_rate
        else:
            new_audio["sample_rate"] = sampler_rate

        return io.NodeOutput(new_audio)
