import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import DynamicInteger from "./DynamicInteger.vue";

const MIN_W = 300, MIN_H = 200;

comfyApp.registerExtension({
    name: "Duffy.DynamicInteger.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_DynamicInteger") return;

        const dataWidget = node.widgets?.find((w: any) => w.name === "int_payload");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.computeSize = () => [0, -4];
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("dblclick", (e) => e.stopPropagation());

        const syncOutputs = (json: string) => {
            try {
                const data = JSON.parse(json);
                if (!Array.isArray(data)) return;

                // Sync ports
                const currentOutputCount = node.outputs ? node.outputs.length : 0;
                const targetOutputCount = data.length;

                // Update names of existing ports / Add new ones
                for (let i = 0; i < targetOutputCount; i++) {
                    const label = data[i].label || `Int ${i+1}`;
                    if (i < currentOutputCount) {
                        node.outputs[i].name = label;
                    } else {
                        node.addOutput(label, "INT");
                    }
                }

                // Remove excess ports
                while (node.outputs && node.outputs.length > targetOutputCount) {
                    node.removeOutput(node.outputs.length - 1);
                }

                node.computeSize();
                node.setDirtyCanvas(true, true);
            } catch (e) {
                // ignore
            }
        };

        const vueApp = createApp(DynamicInteger, {
            onChange: (json: string) => {
                if (dataWidget) dataWidget.value = json;
                syncOutputs(json);
            }
        });

        const instance = vueApp.mount(container) as any;

        const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        domWidget.computeSize = () => [MIN_W, MIN_H];

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

        const origConfigure = node.configure;
        node.configure = function() {
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
