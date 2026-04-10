import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import LoraLoaderWidget from "./LoraLoader.vue";

comfyApp.registerExtension({
    name: "Duffy.LoraLoader.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_LoraLoader") return;

        const dataWidget = node.widgets?.find((w: any) => w.name === "lora_name");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.computeSize = () => [0, -4];
        } else {
            return;
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; box-sizing:border-box; overflow:visible;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = (comfyApp as any).canvas;
            if (canvas) canvas.processContextMenu(node, e);
        });

        const options = Array.isArray(dataWidget.options) 
            ? dataWidget.options 
            : (dataWidget.options?.values || []);

        const vueApp = createApp(LoraLoaderWidget, {
            options: options,
            initialValue: dataWidget.value,
            onChange: (val: string) => {
                dataWidget.value = val;
                node.setDirtyCanvas(true, true);
            }
        });

        const instance = vueApp.mount(container) as any;

        const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        domWidget.computeSize = () => [node.size ? Math.max(300, node.size[0]) : 300, 40];

        const MIN_W = 340, MIN_H = 180;
        const origOnResize = node.onResize;
        node.onResize = function(size: any) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.apply(this, arguments);
        };

        if (dataWidget?.value) instance.deserialise(dataWidget.value);

        const origCallback = dataWidget.callback;
        dataWidget.callback = function(val: string) {
            instance.deserialise(val);
            if (origCallback) origCallback.apply(this, arguments);
        };

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    }
});
