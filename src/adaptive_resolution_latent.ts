import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import AdaptiveResolutionLatent from "./AdaptiveResolutionLatent.vue";

comfyApp.registerExtension({
    name: "Duffy.AdaptiveResolutionLatent",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_AdaptiveResolutionLatent") return;

        // Locate the hidden JSON state widget
        const dataWidget = node.widgets?.find((w: any) => w.name === "state_json");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.hidden = true;
            dataWidget.computeSize = () => [0, 0];
            dataWidget.draw = () => {};
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden;";
        
        // Prevent canvas drag/zoom when interacting with the Vue widget
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("mousedown", (e) => e.stopPropagation());
        container.addEventListener("mouseup", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("keydown", (e) => e.stopPropagation());
        container.addEventListener("keyup", (e) => e.stopPropagation());

        const vueApp = createApp(AdaptiveResolutionLatent, {
            onChange: (json: string) => {
                if (dataWidget) {
                    dataWidget.value = json;
                }
                node.setDirtyCanvas(true, true);
            }
        });

        // Mount the Vue instance
        const instance = vueApp.mount(container) as any;

        // Add the DOM widget to the node
        const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        domWidget.content = container;
        
        // Ensure proper minimum dimensions
        domWidget.computeSize = () => [460, 580];
        
        const MIN_W = 460;
        const MIN_H = 580;
        const origOnResize = node.onResize;
        node.onResize = function(size: [number, number]) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };
        node.setSize?.([MIN_W, MIN_H]);
        node.setDirtyCanvas?.(true, true);

        // Restore saved workflow state if present
        if (dataWidget?.value && dataWidget.value !== "{}") {
            instance.deserialise(dataWidget.value);
        } else {
            // Seed the initial data on first load
            dataWidget.value = instance.serialise();
        }

        // Clean up Vue app correctly when node is removed
        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    }
});
