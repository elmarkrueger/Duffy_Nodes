import { createApp } from "vue";
// @ts-ignore
import { app as comfyApp } from "COMFY_APP";
import NodeAlignmentTool from "./NodeAlignmentTool.vue";
import {
    alignBottom,
    alignLeft,
    alignRight,
    alignTop,
    centerHorizontal,
    centerVertical,
    distributeHorizontal,
    distributeVertical,
    getSanitizedSelection
} from "./utils/alignment_math";

function executeAction(action: Function) {
    if (!comfyApp.canvas) return;

    // Run inside requestAnimationFrame to let Vue layout settle if it was involved
    requestAnimationFrame(() => {
        const bounds = getSanitizedSelection(comfyApp, "Duffy_NodeAlignmentTool");
        if (bounds.length < 2) return;

        // Create undo point
        if (comfyApp.graph.list_of_graphcanvas && comfyApp.canvas) {
            comfyApp.canvas.setDirty(true, true);
        }

        const stateBefore = comfyApp.graph.serialize();
        
        action(bounds);
        
        comfyApp.canvas.setDirty(true, true);
        
        // Push to undo stack if possible (assuming Comfy overrides or litegraph undo)
        // Some versions of comfy lack standard undo, but this handles the visual dirtying
    });
}

const UI_WIDTH = 210;
const UI_HEIGHT = 100;

comfyApp.registerExtension({
    name: "Duffy.NodeAlignmentTool.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_NodeAlignmentTool") return;

        // Add Vue UI component
        const container = document.createElement("div");
        container.style.cssText = `width:${UI_WIDTH}px; height:${UI_HEIGHT}px; box-sizing:border-box; overflow:hidden; display:flex; justify-content:center; align-items:center;`;
        
        // Stop panning and dragging mechanics on the canvas underneath
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("mousedown", (e) => e.stopPropagation());

        const vueApp = createApp(NodeAlignmentTool, {
            onAlignLeft: () => executeAction(alignLeft),
            onCenterHorizontal: () => executeAction(centerHorizontal),
            onAlignRight: () => executeAction(alignRight),
            onDistributeHorizontal: () => executeAction(distributeHorizontal),
            onAlignTop: () => executeAction(alignTop),
            onCenterVertical: () => executeAction(centerVertical),
            onAlignBottom: () => executeAction(alignBottom),
            onDistributeVertical: () => executeAction(distributeVertical),
            getSelectedCount: () => {
                return getSanitizedSelection(comfyApp, "Duffy_NodeAlignmentTool").length;
            }
        });

        const instance = vueApp.mount(container) as any;

        const domWidget = node.addDOMWidget("align_vue_ui", "custom", container, { serialize: false });
        domWidget.computeSize = () => [UI_WIDTH, UI_HEIGHT];
        node.size = [UI_WIDTH + 20, UI_HEIGHT + 35]; // Adjust node size
        
        // Enforce Minimum Size
        const origOnResize = node.onResize;
        node.onResize = function(size: [number, number]) {
            size[0] = Math.max(UI_WIDTH + 20, size[0]);
            size[1] = Math.max(UI_HEIGHT + 35, size[1]);
            origOnResize?.apply(this, arguments);
        };

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    },

    getSelectionToolboxCommands(canvas: any) {
        const selection = getSanitizedSelection(comfyApp, "Duffy_NodeAlignmentTool");
        
        if (selection.length < 2) return [];

        const commands = [
            { id: "duffy-align.left", label: "Align Left", function: () => executeAction(alignLeft) },
            { id: "duffy-align.center-h", label: "Align Center H", function: () => executeAction(centerHorizontal) },
            { id: "duffy-align.right", label: "Align Right", function: () => executeAction(alignRight) },
            { id: "duffy-align.top", label: "Align Top", function: () => executeAction(alignTop) },
            { id: "duffy-align.center-v", label: "Align Center V", function: () => executeAction(centerVertical) },
            { id: "duffy-align.bottom", label: "Align Bottom", function: () => executeAction(alignBottom) }
        ];

        if (selection.length >= 3) {
            commands.push({ id: "duffy-align.distribute-h", label: "Distribute H", function: () => executeAction(distributeHorizontal) });
            commands.push({ id: "duffy-align.distribute-v", label: "Distribute V", function: () => executeAction(distributeVertical) });
        }

        return commands;
    }
});
