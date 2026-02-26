import { app } from "../../scripts/app.js";

function setupDynamicLabels(node) {
    const updateLabels = () => {
        if (!node.widgets || !node.outputs) return;
        
        let changed = false;
        for (let i = 1; i <= 5; i++) {
            const labelWidget = node.widgets.find(w => w.name === `label_${i}`);
            if (labelWidget && labelWidget.value) {
                const newLabel = labelWidget.value;
                
                // Update output label and tooltip
                if (node.outputs[i - 1]) {
                    if (node.outputs[i - 1].name !== newLabel || node.outputs[i - 1].label !== newLabel) {
                        node.outputs[i - 1].name = newLabel;
                        node.outputs[i - 1].label = newLabel;
                        node.outputs[i - 1].tooltip = newLabel;
                        changed = true;
                    }
                }
                
                // Update slider widget label
                const sliderWidget = node.widgets.find(w => w.name === `value_${i}`);
                if (sliderWidget && sliderWidget.label !== newLabel) {
                    sliderWidget.label = newLabel;
                    changed = true;
                }
            }
        }
        
        if (changed && app.graph) {
            app.graph.setDirtyCanvas(true, true);
        }
    };

    // Wait for widgets to be fully populated
    setTimeout(() => {
        if (!node.widgets) return;
        
        for (let i = 1; i <= 5; i++) {
            const labelWidget = node.widgets.find(w => w.name === `label_${i}`);
            if (labelWidget) {
                const originalCallback = labelWidget.callback;
                labelWidget.callback = function(value) {
                    if (originalCallback) {
                        originalCallback.apply(this, arguments);
                    }
                    updateLabels();
                };
            }
        }
        updateLabels();
    }, 100);
}

app.registerExtension({
    name: "Duffy.FiveIntSliders",
    
    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_FiveIntSliders") return;
        setupDynamicLabels(node);
    },
    
    loadedGraphNode(node) {
        if (node.comfyClass !== "Duffy_FiveIntSliders") return;
        setupDynamicLabels(node);
    }
});
