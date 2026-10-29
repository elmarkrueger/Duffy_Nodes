from comfy_api.latest import ComfyAPI, io

REPLACEMENTS = [
    io.NodeReplace(
        new_node_id="Duffy_DynamicMultiArchitectureSampler",
        old_node_id="Duffy_DynamicMultiArchitectureSampler",
        old_widget_ids=[
            "model_selection",
            "seed",
            "steps",
            "cfg",
            "sampler_name",
            "scheduler",
            "denoise",
            "enable_ofd",
            "ofd_strength",
            "ofd_start_percent",
            "ofd_end_percent",
            "ofd_boost",
            "ofd_parallel_mix",
        ],
        input_mapping=[
            {"new_id": "model", "old_id": "model"},
            {"new_id": "positive", "old_id": "positive"},
            {"new_id": "negative", "old_id": "negative"},
            {"new_id": "latent_image", "old_id": "latent_image"},
            {"new_id": "seed", "old_id": "seed"},
            {"new_id": "steps", "old_id": "steps"},
            {"new_id": "cfg", "old_id": "cfg"},
            {"new_id": "sampler_name", "old_id": "sampler_name"},
            {"new_id": "scheduler", "old_id": "scheduler"},
            {"new_id": "denoise", "old_id": "denoise"},
            {"new_id": "enable_ofd", "old_id": "enable_ofd"},
            {"new_id": "ofd_offset", "set_value": 0.05},
            {"new_id": "ofd_factor", "old_id": "ofd_strength"},
            {"new_id": "ofd_delta", "set_value": 0.0},
            {"new_id": "ofd_start_percent", "old_id": "ofd_start_percent"},
            {"new_id": "ofd_end_percent", "old_id": "ofd_end_percent"},
        ],
        output_mapping=[
            {"new_idx": 0, "old_idx": 0},
        ],
    ),
]


async def register_all_replacements() -> None:
    api = ComfyAPI()
    for rep in REPLACEMENTS:
        await api.node_replacement.register(rep)
