"""
Duffy Seed Node (V3 Schema)
Seed node with randomize, increment, decrement, and fixed modes.
Frontend UI provides dedicated buttons and intercepts the prompt to replace
special seed values (-1, -2, -3) before they reach the server.
For direct API usage without the frontend, the server-side fallback generates
random seeds.
"""

import logging
import random
from datetime import datetime

from comfy_api.latest import io

# Dedicated random state to avoid interference with other extensions
# that might also manipulate the global random state.
_initial_random_state = random.getstate()
random.seed(datetime.now().timestamp())
_seed_random_state = random.getstate()
random.setstate(_initial_random_state)

SPECIAL_SEED_RANDOM = -1
SPECIAL_SEED_INCREMENT = -2
SPECIAL_SEED_DECREMENT = -3
SPECIAL_SEEDS = frozenset({SPECIAL_SEED_RANDOM, SPECIAL_SEED_INCREMENT, SPECIAL_SEED_DECREMENT})

MAX_SEED = 1125899906842624


def _new_random_seed():
    """Generate a new random seed using a dedicated random state."""
    global _seed_random_state
    prev_state = random.getstate()
    random.setstate(_seed_random_state)
    seed = random.randint(1, MAX_SEED)
    _seed_random_state = random.getstate()
    random.setstate(prev_state)
    return seed


class DuffySeed(io.ComfyNode):
    """
    Seed node with randomize, increment, decrement, and fixed modes.

    Special seed values handled by the frontend before submission:
      -1 → Random seed each queue
      -2 → Increment last seed
      -3 → Decrement last seed

    If special seeds arrive at the server (e.g. direct API usage), the
    backend generates a random seed as a fallback.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Duffy_Seed",
            display_name="Duffy Seed",
            category="Duffy/utilities",
            description="Seed node with randomize, increment, decrement, and fixed modes.",
            inputs=[
                io.Int.Input(
                    "seed",
                    display_name="Seed",
                    default=0,
                    min=-MAX_SEED,
                    max=MAX_SEED,
                ),
            ],
            outputs=[
                io.Int.Output("seed", display_name="SEED"),
            ],
            hidden=[
                io.Hidden.unique_id,
                io.Hidden.prompt,
                io.Hidden.extra_pnginfo,
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, seed: int) -> str:
        """Force re-execution when a special seed value is used."""
        if seed in SPECIAL_SEEDS:
            return str(_new_random_seed())
        return str(seed)

    @classmethod
    def execute(cls, seed: int = 0, **kwargs) -> io.NodeOutput:
        """
        Returns the seed value. If a special seed (-1, -2, -3) arrives
        (e.g. from an API call without frontend interception), a random
        seed is generated server-side as a fallback and saved to metadata.
        """
        if seed in SPECIAL_SEEDS:
            original_seed = seed

            if seed in (SPECIAL_SEED_INCREMENT, SPECIAL_SEED_DECREMENT):
                logging.warning(
                    "[DuffySeed] Cannot %s seed from server; generating random seed.",
                    "increment" if seed == SPECIAL_SEED_INCREMENT else "decrement",
                )

            seed = _new_random_seed()
            logging.info(
                "[DuffySeed] API fallback: replaced special seed %d with %d",
                original_seed, seed,
            )

            # Attempt to persist the actual seed into the image metadata
            unique_id = cls.hidden.unique_id
            extra_pnginfo = cls.hidden.extra_pnginfo
            prompt = cls.hidden.prompt

            if unique_id is not None and extra_pnginfo is not None:
                workflow_node = next(
                    (
                        x
                        for x in extra_pnginfo.get("workflow", {}).get("nodes", [])
                        if str(x.get("id")) == str(unique_id)
                    ),
                    None,
                )
                if workflow_node is not None and "widgets_values" in workflow_node:
                    for idx, val in enumerate(workflow_node["widgets_values"]):
                        if val == original_seed:
                            workflow_node["widgets_values"][idx] = seed
                            break

            if unique_id is not None and prompt is not None:
                prompt_node = prompt.get(str(unique_id))
                if (
                    prompt_node is not None
                    and "inputs" in prompt_node
                    and "seed" in prompt_node["inputs"]
                ):
                    prompt_node["inputs"]["seed"] = seed

        return io.NodeOutput(seed)
