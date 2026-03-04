/**
 * Duffy Seed Node – Frontend Extension (Nodes 2.0 / Vue compatible)
 *
 * Provides:
 *  - "Randomize Each Time" button  (sets seed to -1)
 *  - "New Fixed Random" button     (generates an immediate random seed)
 *  - "Use Last Queued Seed" button (restores the last actually-used seed)
 *  - Prompt interception: replaces special seeds (-1 random, -2 increment,
 *    -3 decrement) in the serialized output/workflow BEFORE sending to server.
 *  - Context menu: quick actions + toggle "Show Last Seed" display
 */
import { api } from "../../../scripts/api.js";
import { app } from "../../../scripts/app.js";

// Optional import – "Show Last Seed" display uses ComfyWidgets.
// If unavailable the feature is simply hidden from the context menu.
let ComfyWidgets = null;
try {
    const mod = await import("../../../scripts/widgets.js");
    ComfyWidgets = mod.ComfyWidgets;
} catch (_) {
    /* not critical */
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SPECIAL_SEED_RANDOM    = -1;
const SPECIAL_SEED_INCREMENT = -2;
const SPECIAL_SEED_DECREMENT = -3;
const SPECIAL_SEEDS = [SPECIAL_SEED_RANDOM, SPECIAL_SEED_INCREMENT, SPECIAL_SEED_DECREMENT];

const LAST_SEED_BUTTON_LABEL = "♻️ (Use Last Queued Seed)";
const MAX_SEED = 1125899906842624;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateRandomSeed() {
    return Math.floor(Math.random() * MAX_SEED);
}

/**
 * Initialises the custom UI on a Duffy_Seed node instance.
 * Safe to call more than once – bails out if already set up.
 */
function setupSeedNode(node) {
    if (!node.widgets) return;
    if (node._duffySeed) return; // already initialised

    const state = {
        lastSeed: undefined,
        seedWidget: null,
        seedWidgetIndex: -1,
        lastSeedButton: null,
        lastSeedValue: null,
    };
    node._duffySeed = state;

    // Locate the seed widget; remove control_after_generate if ComfyUI added one
    for (let i = node.widgets.length - 1; i >= 0; i--) {
        const w = node.widgets[i];
        if (w.name === "seed") {
            state.seedWidget = w;
            state.seedWidgetIndex = i;
        } else if (w.name === "control_after_generate") {
            node.widgets.splice(i, 1);
        }
    }

    if (!state.seedWidget) return;

    // Default to "Randomize Each Time"
    if (state.seedWidget.value === 0) {
        state.seedWidget.value = SPECIAL_SEED_RANDOM;
    }

    // --- Buttons -----------------------------------------------------------
    node.addWidget("button", "🎲 Randomize Each Time", "", () => {
        state.seedWidget.value = SPECIAL_SEED_RANDOM;
    }, { serialize: false });

    node.addWidget("button", "🎲 New Fixed Random", "", () => {
        state.seedWidget.value = generateRandomSeed();
    }, { serialize: false });

    state.lastSeedButton = node.addWidget(
        "button",
        LAST_SEED_BUTTON_LABEL,
        "",
        () => {
            if (state.lastSeed != null) {
                state.seedWidget.value = state.lastSeed;
            }
            state.lastSeedButton.name = LAST_SEED_BUTTON_LABEL;
            state.lastSeedButton.disabled = true;
        },
        { serialize: false },
    );
    state.lastSeedButton.disabled = true;

    // Fit the new widgets
    const size = node.computeSize();
    node.size = [Math.max(280, size[0]), Math.max(size[1], 160)];
}

// ---------------------------------------------------------------------------
// Extension Registration
// ---------------------------------------------------------------------------
app.registerExtension({
    name: "Duffy.Seed",

    // ------------------------------------------------------------------
    // setup() – intercept api.queuePrompt to swap special seeds
    // ------------------------------------------------------------------
    async setup() {
        const origQueuePrompt = api.queuePrompt.bind(api);

        api.queuePrompt = async function (number, data) {
            const { output, workflow } = data;

            for (const node of app.graph._nodes) {
                if (node.comfyClass !== "Duffy_Seed") continue;

                const state = node._duffySeed;
                if (!state || !state.seedWidget) continue;

                // Skip muted (2) and bypassed (4) nodes
                if (node.mode === 2 || node.mode === 4) continue;

                const nodeId = String(node.id);
                const outputInputs = output?.[nodeId]?.inputs;
                const workflowNode = workflow?.nodes?.find(
                    (n) => String(n.id) === nodeId,
                );

                if (!outputInputs || outputInputs.seed === undefined) continue;

                const currentSeed = Number(outputInputs.seed);

                // Fixed seed – just remember it
                if (!SPECIAL_SEEDS.includes(currentSeed)) {
                    state.lastSeed = currentSeed;
                    state.lastSeedButton.name = LAST_SEED_BUTTON_LABEL;
                    state.lastSeedButton.disabled = true;
                    continue;
                }

                // Determine actual seed to use
                let seedToUse = null;

                if (
                    typeof state.lastSeed === "number" &&
                    !SPECIAL_SEEDS.includes(state.lastSeed)
                ) {
                    if (currentSeed === SPECIAL_SEED_INCREMENT) {
                        seedToUse = state.lastSeed + 1;
                    } else if (currentSeed === SPECIAL_SEED_DECREMENT) {
                        seedToUse = state.lastSeed - 1;
                    }
                }

                if (seedToUse == null || SPECIAL_SEEDS.includes(seedToUse)) {
                    seedToUse = generateRandomSeed();
                }

                // Patch serialized output
                outputInputs.seed = seedToUse;

                // Patch workflow metadata (for PNG info)
                if (workflowNode && workflowNode.widgets_values) {
                    const wIdx = state.seedWidgetIndex;
                    if (wIdx >= 0 && wIdx < workflowNode.widgets_values.length) {
                        workflowNode.widgets_values[wIdx] = seedToUse;
                    }
                }

                // Update frontend state
                state.lastSeed = seedToUse;

                if (seedToUse !== Number(state.seedWidget.value)) {
                    state.lastSeedButton.name = `♻️ ${seedToUse}`;
                    state.lastSeedButton.disabled = false;
                } else {
                    state.lastSeedButton.name = LAST_SEED_BUTTON_LABEL;
                    state.lastSeedButton.disabled = true;
                }

                if (state.lastSeedValue) {
                    state.lastSeedValue.value = `Last Seed: ${seedToUse}`;
                }
            }

            return origQueuePrompt(number, data);
        };
    },

    // ------------------------------------------------------------------
    // nodeCreated – add buttons and theme colours
    // ------------------------------------------------------------------
    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_Seed") return;

        node.color  = "#7a642b";
        node.bgcolor = "#4c3e1a";

        // V3 widgets are ready after a micro-task; use setTimeout for safety
        setTimeout(() => setupSeedNode(node), 100);
    },

    // ------------------------------------------------------------------
    // loadedGraphNode – re-apply UI when loading a saved workflow
    // ------------------------------------------------------------------
    loadedGraphNode(node) {
        if (node.comfyClass !== "Duffy_Seed") return;
        setTimeout(() => setupSeedNode(node), 100);
    },

    // ------------------------------------------------------------------
    // getNodeMenuItems – declarative context menu (Nodes 2.0 pattern)
    // ------------------------------------------------------------------
    getNodeMenuItems(node) {
        if (node.comfyClass !== "Duffy_Seed") return;

        const state = node._duffySeed;
        const items = [
            {
                content: "🎲 Randomize Each Time",
                callback: () => {
                    if (state?.seedWidget) {
                        state.seedWidget.value = SPECIAL_SEED_RANDOM;
                    }
                },
            },
            {
                content: "🔒 New Fixed Random Seed",
                callback: () => {
                    if (state?.seedWidget) {
                        state.seedWidget.value = generateRandomSeed();
                    }
                },
            },
            {
                content: "♻️ Use Last Queued Seed",
                callback: () => {
                    if (state?.seedWidget && state.lastSeed != null) {
                        state.seedWidget.value = state.lastSeed;
                        state.lastSeedButton.name = LAST_SEED_BUTTON_LABEL;
                        state.lastSeedButton.disabled = true;
                    }
                },
            },
        ];

        // "Show / Hide last seed" – only available when ComfyWidgets loaded
        if (ComfyWidgets) {
            items.push(null); // separator
            items.push({
                content: state?.lastSeedValue
                    ? "Hide Last Seed Display"
                    : "Show Last Seed Display",
                callback: () => {
                    if (!state) return;

                    if (state.lastSeedValue) {
                        // Remove display widget
                        if (state.lastSeedValue.inputEl) {
                            state.lastSeedValue.inputEl.remove();
                        }
                        const idx = node.widgets.indexOf(state.lastSeedValue);
                        if (idx >= 0) node.widgets.splice(idx, 1);
                        state.lastSeedValue = null;
                    } else {
                        // Create read-only STRING widget
                        const w = ComfyWidgets["STRING"](
                            node,
                            "last_seed",
                            ["STRING", { multiline: true }],
                            app,
                        ).widget;
                        w.inputEl.readOnly = true;
                        w.inputEl.style.fontSize = "0.75rem";
                        w.inputEl.style.textAlign = "center";
                        w.value =
                            state.lastSeed != null
                                ? `Last Seed: ${state.lastSeed}`
                                : "No seed queued yet";
                        state.lastSeedValue = w;
                    }

                    node.computeSize();
                    app.graph.setDirtyCanvas(true, true);
                },
            });
        }

        return items;
    },
});
