import { createApp } from "vue";
// @ts-ignore
import { app as comfyApp } from "COMFY_APP";
import AdvancedLayerControl from "./AdvancedLayerControl.vue";

const MIN_W = 980;
const MIN_H = 760;

comfyApp.registerExtension({
    name: "Duffy.AdvancedLayerControl.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_AdvancedLayerControl") return;

        const dataWidget = node.widgets?.find((widget: any) => widget.name === "saved_layers");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.hidden = true;
            dataWidget.computeSize = () => [0, 0];
            dataWidget.draw = () => {};
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden; position:relative; isolation:isolate;";
        container.addEventListener("pointerdown", (event) => event.stopPropagation());
        container.addEventListener("wheel", (event) => event.stopPropagation());
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = (comfyApp as any).canvas;
            if (canvas) canvas.processContextMenu(node, e);
        });

        const vueApp = createApp(AdvancedLayerControl, {
            nodeId: String(node.id),
            onChange: (json: string) => {
                if (dataWidget) {
                    dataWidget.value = json;
                }
                node.setDirtyCanvas?.(true, true);
            },
        });

        const instance = vueApp.mount(container) as any;
        const domWidget = node.addDOMWidget("advanced_layer_control_ui", "custom", container, { serialize: false });
        domWidget.computeSize = () => [MIN_W, MIN_H];
        domWidget.content = container;

        node.setSize?.([MIN_W, MIN_H]);
        node.setDirtyCanvas?.(true, true);

        if (dataWidget?.value) {
            instance.deserialise(dataWidget.value);
        }

        const origConfigure = node.configure;
        node.configure = function (info: any) {
            origConfigure?.call(this, info);
            if (dataWidget?.value) instance.deserialise(dataWidget.value);
        };

        const origOnResize = node.onResize;
        node.onResize = function(size: number[]) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };

        const origRemoved = node.onRemoved;
        node.onRemoved = function() {
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    },
});
