import { app } from "../../scripts/app.js";

const SLOT_COUNT = 3;

/**
 * Sync the user-editable label_N string widgets to the corresponding
 * output port labels on the node canvas.
 */
function setupLabelSync(node) {
    if (node._duffyModelSelectorInit) return;
    node._duffyModelSelectorInit = true;

    const w = (name) => node.widgets?.find((x) => x.name === name);

    const syncLabels = () => {
        let changed = false;
        for (let i = 1; i <= SLOT_COUNT; i++) {
            const labelWidget = w(`label_${i}`);
            if (!labelWidget?.value) continue;
            const outputIndex = i - 1;
            if (node.outputs && node.outputs[outputIndex]) {
                if (node.outputs[outputIndex].label !== labelWidget.value) {
                    node.outputs[outputIndex].label = labelWidget.value;
                    changed = true;
                }
            }
        }
        if (changed && app.graph) app.graph.setDirtyCanvas(true, true);
    };

    const init = () => {
        for (let i = 1; i <= SLOT_COUNT; i++) {
            const lw = w(`label_${i}`);
            if (lw) {
                const origCb = lw.callback;
                lw.callback = function (value) {
                    if (origCb) origCb.apply(this, arguments);
                    syncLabels();
                };
            }
        }
        syncLabels();
    };

    requestAnimationFrame(() => init());
}

app.registerExtension({
    name: "Duffy.ModelSelector",

    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_ModelSelector") return;
        node.color = "#2E4E3B";
        node.bgcolor = "#1C3024";
        setupLabelSync(node);
    },

    loadedGraphNode(node) {
        if (node.comfyClass !== "Duffy_ModelSelector") return;
        setupLabelSync(node);
    },
});
