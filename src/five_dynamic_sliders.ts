import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import FiveDynamicSliders from "./FiveDynamicSliders.vue";

const MIN_W = 380, MIN_H = 320;

comfyApp.registerExtension({
    name: "Duffy.FiveDynamicSliders.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_FiveDynamicSliders") return;

        // Locate and hide the payload widget from drawing and layout calculations
        const dataWidget = node.widgets?.find((w: any) => w.name === "float_payload");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.hidden = true;
            dataWidget.computeSize = () => [0, 0];
            dataWidget.draw = () => {};
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
        
        // Canvas event isolation
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("mousedown", (e) => e.stopPropagation());
        container.addEventListener("mouseup", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("dblclick", (e) => e.stopPropagation());
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = (comfyApp as any).canvas;
            if (canvas) canvas.processContextMenu(node, e);
        });

        const syncOutputs = (json: string) => {
            try {
                const data = JSON.parse(json);
                if (!Array.isArray(data)) return;

                // Sync custom labels to output ports
                for (let i = 0; i < 5; i++) {
                    if (node.outputs && node.outputs[i]) {
                        const item = data[i];
                        const label = item?.label || `Slider ${i + 1}`;
                        node.outputs[i].name = label;
                        node.outputs[i].label = label;
                        node.outputs[i].tooltip = label;
                    }
                }
                node.setDirtyCanvas(true, true);
            } catch (e) {
                // ignore
            }
        };

        const vueApp = createApp(FiveDynamicSliders, {
            onChange: (json: string) => {
                if (dataWidget) dataWidget.value = json;
                syncOutputs(json);
            }
        });

        const instance = vueApp.mount(container) as any;

        const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        
        // Dynamic width and height with a safe 140px offset to completely block layout growth loops in Litegraph
        domWidget.computeSize = () => [
            node.size[0],
            Math.max(180, (node.size[1] || MIN_H) - 140)
        ];

        const origOnResize = node.onResize;
        node.onResize = function(size: [number, number]) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };
        node.setSize([MIN_W, MIN_H]);

        if (dataWidget?.value) {
            instance.deserialise(dataWidget.value);
            syncOutputs(dataWidget.value);
        }

        // Restore widget value on workflow loading
        const origConfigure = node.configure;
        node.configure = function(info: any) {
            const r = origConfigure ? origConfigure.apply(this, arguments) : undefined;
            if (dataWidget?.value) {
                instance.deserialise(dataWidget.value);
                syncOutputs(dataWidget.value);
            }
            return r;
        };

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    }
});
