import { createApp } from "vue";
// @ts-ignore
import { app as comfyApp } from "COMFY_APP";
import InteractiveRelight from "./InteractiveRelight.vue";

comfyApp.registerExtension({
    name: "Duffy.InteractiveRelight.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_InteractiveRelight") return;

        const dataWidget = node.widgets?.find((w: any) => w.name === "saved_lights");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.computeSize = () => [0, -4];
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = (comfyApp as any).canvas;
            if (canvas) canvas.processContextMenu(node, e);
        });

        console.log(`Duffy_InteractiveRelight nodeCreated: ${node.id}`);

        const vueApp = createApp(InteractiveRelight, {
            nodeId: String(node.id),
            onChange: (json: string) => {
                if (dataWidget) {
                    dataWidget.value = json;
                }
                node.setDirtyCanvas(true, true);
            }
        });

        const instance = vueApp.mount(container) as any;

        const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        domWidget.computeSize = () => [800, 640];
        domWidget.content = container; // Compatibility with new ComfyUI frontend context menus

        // Ensure node starts large enough
        const MIN_W = 800, MIN_H = 640;
        const origOnResize = node.onResize;
        node.onResize = function(size: number[]) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };
        node.setSize?.([MIN_W, MIN_H]);
        node.setDirtyCanvas?.(true, true);

        // Restore saved workflow state
        if (dataWidget?.value) {
            instance.deserialise(dataWidget.value);
        }

        // Safe unmount
        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    }
});
