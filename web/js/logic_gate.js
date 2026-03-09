import { app } from "../../../scripts/app.js";

/**
 * Keeps the Logic Gate UI in sync without mutating the node's input slots.
 */
function setupLogicGate(node) {
    if (node.__duffyLogicGateInitialized) {
        node.__duffyLogicGateUpdateUI?.();
        return;
    }

    node.__duffyLogicGateInitialized = true;

    /**
     * Updates the UI state based on the selected operation.
     */
    const updateUI = () => {
        if (!node.widgets) return;

        const opWidget = node.widgets.find(w => w.name === "operation");
        const bWidget = node.widgets.find(w => w.name === "b");
        const bInput = node.inputs?.find(input => input.name === "b");
        if (!opWidget) return;

        const isNot = opWidget.value === "NOT";

        if (bWidget) {
            if (bWidget.__duffyOriginalType === undefined) {
                bWidget.__duffyOriginalType = bWidget.type ?? "toggle";
            }
            if (bWidget.__duffyOriginalComputeSize === undefined) {
                bWidget.__duffyOriginalComputeSize = bWidget.computeSize ?? null;
            }

            if (isNot) {
                bWidget.type = "hidden";
                bWidget.computeSize = () => [0, -4];
            } else {
                bWidget.type = bWidget.__duffyOriginalType;

                if (bWidget.__duffyOriginalComputeSize) {
                    bWidget.computeSize = bWidget.__duffyOriginalComputeSize;
                } else {
                    delete bWidget.computeSize;
                }
            }
        }

        if (bInput) {
            bInput.label = isNot ? "B (ignored)" : "B";
        }

        node.setSize(node.computeSize());
        if (app.graph) app.graph.setDirtyCanvas(true, true);
    };

    node.__duffyLogicGateUpdateUI = updateUI;

    const opWidget = node.widgets.find(w => w.name === "operation");
    if (opWidget) {
        const origCallback = opWidget.callback;
        opWidget.callback = function() {
            if (origCallback) origCallback.apply(this, arguments);
            updateUI();
        };
    }

    setTimeout(updateUI, 0);
}

app.registerExtension({
    name: "Duffy.LogicGate",

    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_LogicGate") return;
        setupLogicGate(node);
    },

    loadedGraphNode(node) {
        if (node.comfyClass !== "Duffy_LogicGate") return;
        setupLogicGate(node);
    },
});
