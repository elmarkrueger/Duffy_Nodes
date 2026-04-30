import { app as comfyApp } from "COMFY_APP";
import PrimeVue from "primevue/config";
import { createApp } from "vue";
import PowerLoraLoader from "./PowerLoraLoader.vue";

const MIN_W = 400, MIN_H = 300;

comfyApp.registerExtension({
    name: "Duffy.PowerLoraLoader.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_PowerLoraLoader") return;

        const dataWidget = node.widgets?.find((w: any) => w.name === "lora_payload");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.computeSize = () => [0, -4];
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("dblclick", (e) => e.stopPropagation());

        const vueApp = createApp(PowerLoraLoader, {
            onChange: (json: string) => {
                if (dataWidget) dataWidget.value = json;
                node.setDirtyCanvas(true, true);
            }
        });
        vueApp.use(PrimeVue);

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
        }

        const origConfigure = node.configure;
        node.configure = function() {
            const r = origConfigure ? origConfigure.apply(this, arguments) : undefined;
            if (dataWidget?.value) {
                instance.deserialise(dataWidget.value);
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
