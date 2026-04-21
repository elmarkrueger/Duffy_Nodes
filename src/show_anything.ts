import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import ShowAnythingWidget from "./ShowAnything.vue";

comfyApp.registerExtension({
    name: "Duffy.ShowAnything.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_ShowAnything") return;

        const container = document.createElement("div");
        container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());

        const vueApp = createApp(ShowAnythingWidget);
        const instance = vueApp.mount(container) as any;

        const domWidget = node.addDOMWidget("vue_show_anything", "custom", container, { serialize: false });
        domWidget.computeSize = () => [300, 200];

        // Ensure minimum size for the node to accommodate the UI
        const origOnResize = node.onResize;
        node.onResize = function(size: [number, number]) {
            size[0] = Math.max(300, size[0]);
            size[1] = Math.max(200, size[1]);
            origOnResize?.call(this, size);
        };

        const origOnExecuted = node.onExecuted;
        node.onExecuted = function(message: any) {
            origOnExecuted?.apply(this, arguments);
            if (message?.text && Array.isArray(message.text)) {
                // Update Vue state with the backend output
                instance.setValues(message.text);
            }
        };

        const origConfigure = node.configure;
        node.configure = function(info: any) {
            origConfigure?.call(this, info);
            if (this.widgets_values?.length) {
                const vals = this.widgets_values[0];
                if (Array.isArray(vals)) {
                     instance.setValues(vals.map(String));
                } else {
                     instance.setValues([String(vals)]);
                }
            }
        };

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    }
});
