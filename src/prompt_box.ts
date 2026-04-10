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
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = (comfyApp as any).canvas;
            if (canvas) canvas.processContextMenu(node, e);
        });

        // Capture-phase intercept: prevent ComfyUI from eating clipboard/text-editing
        // shortcuts when the user is typing inside our textarea.
        function captureKeyboard(e: KeyboardEvent) {
            if (!container.contains(e.target as Node)) return;
            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && ["v", "c", "x", "a", "z"].includes(key)) {
                e.stopPropagation();
            }
        }
        document.addEventListener("keydown", captureKeyboard, true);

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

        const origOnExecuted = node.onExecuted;
        node.onExecuted = function(message: any) {
            origOnExecuted?.apply(this, arguments);
            if (message?.text && message.text.length > 0) {
                // Update Vue state with the backend output
                instance.deserialise(JSON.stringify({ text: message.text[0] }));
                // We do NOT call emitChange here because this reflects the executed state,
                // and it would wrongfully trigger a dirty canvas state flag.
            }
        };

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            document.removeEventListener("keydown", captureKeyboard, true);
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    }
});
