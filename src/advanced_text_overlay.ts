import { createApp } from "vue";
// @ts-ignore
import { app as comfyApp } from "COMFY_APP";
import AdvancedTextOverlay from "./AdvancedTextOverlay.vue";

comfyApp.registerExtension({
    name: "Duffy.AdvancedTextOverlay.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_AdvancedTextOverlay") return;

        const dataWidget = node.widgets?.find((w: any) => w.name === "saved_overlays");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.computeSize = () => [0, -4];
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());

        const vueApp = createApp(AdvancedTextOverlay, {
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
        domWidget.computeSize = () => [800, 740];
        domWidget.content = container;

        const MIN_W = 800, MIN_H = 740;
        const origOnResize = node.onResize;
        node.onResize = function(size: number[]) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };
        node.setSize?.([MIN_W, MIN_H]);
        node.setDirtyCanvas?.(true, true);

        if (dataWidget?.value) {
            instance.deserialise(dataWidget.value);
        }

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    }
});
