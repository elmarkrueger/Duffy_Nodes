import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import ImageCompare from "./ImageCompare.vue";

comfyApp.registerExtension({
    name: "Duffy.ImageCompare.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_ImageCompare") return;

        // Ensure minimum size and standard theme colors
        node.color = "#2B4E5C";
        node.bgcolor = "#1A2F38";

        const MIN_W = 512;
        const MIN_H = 512;

        const dataWidget = node.widgets?.find((w: any) => w.name === "compare_state");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.hidden = true;
            dataWidget.computeSize = () => [0, 0];
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (comfyApp.canvas) comfyApp.canvas.processContextMenu(node, e);
        });

        const vueApp = createApp(ImageCompare, {
            onChange: (json: string) => {
                if (dataWidget) Object.assign(dataWidget, { value: json });
                node.setDirtyCanvas(true, true);
            },
            nodeId: node.id
        });

        const instance = vueApp.mount(container) as any;

        const origOnExecuted = node.onExecuted;
        node.onExecuted = function (message: any) {
            origOnExecuted?.apply(this, arguments);
            if (message?.compare_images) {
                instance.setImages(message.compare_images);
            }
        };

        const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        
        // Prevent infinite growth in legacy view by returning base dimensions
        domWidget.computeSize = () => [MIN_W, MIN_H];

        const origOnResize = node.onResize;
        node.onResize = function (size: [number, number]) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };

        // Bootstrap the initial dimensions
        setTimeout(() => {
            if (node.size && (node.size[0] < MIN_W || node.size[1] < MIN_H)) {
                node.size = [Math.max(MIN_W, node.size[0]), Math.max(MIN_H, node.size[1])];
                node.setDirtyCanvas(true, true);
            }
        }, 100);

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
