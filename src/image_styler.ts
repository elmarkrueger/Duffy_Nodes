import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import ImageStyler from "./ImageStyler.vue";

comfyApp.registerExtension({
    name: "Duffy.ImageStyler.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_ImageStyler") return;

        const styleWidget = node.widgets?.find((w: any) => w.name === "style");
        if (!styleWidget) return;

        styleWidget.type = "hidden";
        styleWidget.hidden = true;
        styleWidget.computeSize = () => [0, 0];
        styleWidget.draw = () => {};

        const options = Array.isArray(styleWidget.options)
            ? styleWidget.options
            : (styleWidget.options?.values || []);

        const container = document.createElement("div");
        container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("mousedown", (e) => e.stopPropagation());
        container.addEventListener("mouseup", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = (comfyApp as any).canvas;
            if (canvas) canvas.processContextMenu(node, e);
        });

        const runtimeAssetBaseUrl = new URL(import.meta.url);
        runtimeAssetBaseUrl.pathname = runtimeAssetBaseUrl.pathname.replace(/\/js\/[^/]+$/, "/image_styler/");
        runtimeAssetBaseUrl.search = "";
        runtimeAssetBaseUrl.hash = "";
        const thumbnailBaseUrl = runtimeAssetBaseUrl.toString();

        const vueApp = createApp(ImageStyler, {
            options,
            initialStyle: styleWidget.value,
            thumbnailBaseUrl,
            onChange: (style: string) => {
                styleWidget.value = style;
                node.setDirtyCanvas(true, true);
            },
        });

        const instance = vueApp.mount(container) as any;

        const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        const VERTICAL_MARGIN = 8;
        const CONTENT_MIN_H = 156;
        domWidget.computeSize = () => {
            const currentW = Array.isArray(node.size) && node.size.length >= 2 ? node.size[0] : 340;
            const currentH = Array.isArray(node.size) && node.size.length >= 2 ? node.size[1] : 200;
            return [
                Math.max(340, currentW),
                Math.max(CONTENT_MIN_H, currentH - VERTICAL_MARGIN),
            ];
        };
        domWidget.content = container;

        const MIN_W = 340;
        const MIN_H = 214;

        function clampSize(size: [number, number]): [number, number] {
            return [
                Math.max(MIN_W, size[0]),
                Math.max(MIN_H, size[1]),
            ];
        }

        const origOnResize = node.onResize;
        node.onResize = function(size: [number, number]) {
            const [nextW, nextH] = clampSize(size);
            size[0] = nextW;
            size[1] = nextH;
            origOnResize?.call(this, size);
        };

        const initialSize = Array.isArray(node.size) && node.size.length >= 2
            ? [node.size[0], node.size[1]] as [number, number]
            : [MIN_W, MIN_H] as [number, number];
        node.setSize?.(clampSize(initialSize));
        node.setDirtyCanvas?.(true, true);

        if (styleWidget.value) {
            instance.deserialise(styleWidget.value);
        }

        const origConfigure = node.configure;
        node.configure = function (info: any) {
            origConfigure?.call(this, info);
            if (styleWidget.value) instance.deserialise(styleWidget.value);

            if (Array.isArray(this.size) && this.size.length >= 2) {
                const nextSize = clampSize([this.size[0], this.size[1]]);
                this.setSize?.(nextSize);
            }
        };

        const origWidgetCallback = styleWidget.callback;
        styleWidget.callback = function (value: string) {
            instance.deserialise(value);
            if (origWidgetCallback) origWidgetCallback.apply(this, arguments);
        };

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            instance.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };
    },
});
