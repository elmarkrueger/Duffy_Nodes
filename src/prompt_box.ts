import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import PromptBoxWidget from "./PromptBox.vue";

comfyApp.registerExtension({
    name: "Duffy.PromptBox.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_PromptBox") return;

        const dataWidget = node.widgets?.find((w: any) => w.name === "json_data");
        if (dataWidget) {
            dataWidget.type = "hidden";
            dataWidget.hidden = true;
            dataWidget.computeSize = () => [0, 0];
            dataWidget.draw = () => {};
        }

        const optWidget = node.widgets?.find((w: any) => w.name === "optional_input");
        if (optWidget) {
            optWidget.type = "hidden";
            optWidget.hidden = true;
            optWidget.computeSize = () => [0, 0];
            optWidget.draw = () => {};
        }

        const container = document.createElement("div");
        container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());

        const vueApp = createApp(PromptBoxWidget, {
            onChange: (json: string) => {
                if (dataWidget) dataWidget.value = json;
                node.setDirtyCanvas(true, true);
            }
        });

        const instance = vueApp.mount(container) as any;

        const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        domWidget.computeSize = () => [300, 200];

        // Ensure minimum size for the node to accommodate the UI
        const origOnResize = node.onResize;
        node.onResize = function(size: [number, number]) {
            size[0] = Math.max(300, size[0]);
            size[1] = Math.max(200, size[1]);
            origOnResize?.call(this, size);
        };

        if (dataWidget?.value) instance.deserialise(dataWidget.value);

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    }
});
