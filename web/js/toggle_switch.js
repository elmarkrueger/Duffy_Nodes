import { app } from "../../scripts/app.js";

/**
 * Dynamically syncs user-defined labels to the input ports
 * and the slider widget label for the Toggle Switch node.
 */
function setupDynamicLabels(node) {
    const CHANNEL_COUNT = 5;

    const updateLabels = () => {
        if (!node.widgets) return;

        let changed = false;
        for (let i = 1; i <= CHANNEL_COUNT; i++) {
            const labelWidget = node.widgets.find(w => w.name === `label_${i}`);
            if (!labelWidget || !labelWidget.value) continue;

            const newLabel = labelWidget.value;

            // Update the Any-type input port label
            const inputPort = node.inputs
                ? node.inputs.find(p => p.name === `input_${i}`)
                : null;
            if (inputPort && inputPort.label !== newLabel) {
                inputPort.label = newLabel;
                changed = true;
            }
        }

        if (changed && app.graph) app.graph.setDirtyCanvas(true, true);
    };

    setTimeout(() => {
        if (!node.widgets) return;

        for (let i = 1; i <= CHANNEL_COUNT; i++) {
            const label = node.widgets.find(w => w.name === `label_${i}`);
            if (label) {
                const orig = label.callback;
                label.callback = function (value) {
                    if (orig) orig.apply(this, arguments);
                    updateLabels();
                };
            }
        }
        updateLabels();
    }, 100);
}

app.registerExtension({
    name: "Duffy.ToggleSwitch",

    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_ToggleSwitch") return;

        node.color = "#2E4E3B";
        node.bgcolor = "#1C3024";

        setupDynamicLabels(node);
    },

    loadedGraphNode(node) {
        if (node.comfyClass !== "Duffy_ToggleSwitch") return;
        setupDynamicLabels(node);
    },
});


        node.color = "#2E4E3B";
        node.bgcolor = "#1C3024";

        setupToggleSwitch(node);
    },

    loadedGraphNode(node) {
        if (node.comfyClass !== "Duffy_ToggleSwitch") return;
        setupToggleSwitch(node);
    },
});
