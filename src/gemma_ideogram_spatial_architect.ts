import { app as comfyApp } from "COMFY_APP";
import { api as comfyApi } from "COMFY_API";
import { createApp } from "vue";
import GemmaIdeogramSpatialArchitect from "./GemmaIdeogramSpatialArchitect.vue";

comfyApp.registerExtension({
    name: "Duffy.GemmaIdeogramSpatialArchitect",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_GemmaIdeogramSpatialArchitect") return;

        // Locate the hidden state widget
        const stateWidget = node.widgets?.find((w: any) => w.name === "state_json");
        if (stateWidget) {
            stateWidget.type = "hidden";
            stateWidget.hidden = true;
            stateWidget.computeSize = () => [0, 0];
            stateWidget.draw = () => {};
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden;";

        // Prevent canvas drag/zoom when interacting with the Vue workspace
        const preventCanvasEvents = (e: Event) => e.stopPropagation();
        container.addEventListener("pointerdown", preventCanvasEvents);
        container.addEventListener("mousedown", preventCanvasEvents);
        container.addEventListener("mouseup", preventCanvasEvents);
        container.addEventListener("wheel", preventCanvasEvents);
        container.addEventListener("keydown", preventCanvasEvents);
        container.addEventListener("keyup", preventCanvasEvents);

        const vueApp = createApp(GemmaIdeogramSpatialArchitect, {
            onChange: (json: string) => {
                if (stateWidget) {
                    stateWidget.value = json;
                }
                node.setDirtyCanvas(true, true);
            }
        });

        // Mount the Vue instance
        const instance = vueApp.mount(container) as any;

        // Register the DOM widget
        const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        domWidget.content = container;

        // Custom size calculation matching standard workspace aspect ratios
        domWidget.computeSize = () => [680, 520];

        const MIN_W = 680;
        const MIN_H = 520;
        const origOnResize = node.onResize;
        node.onResize = function (size: [number, number]) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };
        node.setSize?.([MIN_W, MIN_H]);
        node.setDirtyCanvas?.(true, true);

        // Restore state if present
        if (stateWidget?.value && stateWidget.value !== "{}") {
            instance.deserialise(stateWidget.value);
        } else {
            stateWidget.value = instance.serialise();
        }

        // Re-sync state on workflow reload/load
        const origConfigure = node.configure;
        node.configure = function (info: any) {
            origConfigure?.call(this, info);
            if (stateWidget?.value) {
                instance.deserialise(stateWidget.value);
            }
        };

        // Clean up Vue app when node is deleted
        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    }
});
