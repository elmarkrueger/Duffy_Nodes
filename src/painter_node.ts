/**
 * Advanced Painter - Frontend UI (Nodes 2.0 Compatible)
 * Provides an interactive Fabric.js canvas for painting, text, and erasing.
 */

import { createApp, h, reactive } from "vue";
import PainterWidget from "./PainterWidget.vue";
// @ts-ignore
import { app } from "COMFY_APP";

const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 512;
const DEFAULT_BG_COLOR = "#ffffff";
const MIN_W = 480;
const MIN_H = 360;
const NODE_CHROME_HEIGHT = 220;

function parseStoredState(raw: unknown) {
    const fallback = {
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        bgColor: DEFAULT_BG_COLOR,
    };

    if (typeof raw !== "string" || !raw) {
        return fallback;
    }

    try {
        const parsed = JSON.parse(raw);
        return {
            width: Number(parsed.width) || fallback.width,
            height: Number(parsed.height) || fallback.height,
            bgColor: typeof parsed.bgColor === "string" ? parsed.bgColor : fallback.bgColor,
        };
    } catch {
        return fallback;
    }
}

function computeNodeSize(width: number, height: number): [number, number] {
    return [Math.max(MIN_W, width + 48), Math.max(MIN_H, height + NODE_CHROME_HEIGHT)];
}

app.registerExtension({
    name: "Duffy.PainterNode.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_PainterNode") return;

        const dataWidget = node.widgets?.find((w: any) => w.name === "json_data");
        if (!dataWidget) return;

        dataWidget.type = "hidden";
        dataWidget.hidden = true;
        dataWidget.computeSize = () => [0, 0];
        dataWidget.draw = () => {};

        const initialState = parseStoredState(dataWidget.value);
        const state = reactive({
            width: initialState.width,
            height: initialState.height,
            bgColor: initialState.bgColor,
        });

        const container = document.createElement("div");
        container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden; position:relative; isolation:isolate;";

        const stopCanvasEvent = (event: Event) => event.stopPropagation();
        container.addEventListener("pointerdown", stopCanvasEvent);
        container.addEventListener("wheel", stopCanvasEvent);
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = (app as any).canvas;
            if (canvas) canvas.processContextMenu(node, e);
        });

        let widgetRef: any = null;

        const vueApp = createApp({
            render() {
                return h(PainterWidget, {
                    ref: (r: any) => { widgetRef = r; },
                    width: state.width,
                    height: state.height,
                    bgColor: state.bgColor,
                    onChange: (json: string) => {
                        dataWidget.value = json;

                        const nextState = parseStoredState(json);
                        state.width = nextState.width;
                        state.height = nextState.height;
                        state.bgColor = nextState.bgColor;

                        if (node.setSize) {
                            node.setSize(computeNodeSize(state.width, state.height));
                        }

                        node.setDirtyCanvas(true, true);
                    },
                    onUpdateDimensions: (newWidth: number, newHeight: number) => {
                        state.width = newWidth;
                        state.height = newHeight;

                        if (node.setSize) {
                            node.setSize(computeNodeSize(newWidth, newHeight));
                        }
                    }
                });
            }
        });

        vueApp.mount(container);

        const domWidget = node.addDOMWidget("painter_ui", "custom", container, { serialize: false });

        domWidget.computeSize = () => computeNodeSize(state.width, state.height);

        if (dataWidget?.value) {
            widgetRef?.deserialise(dataWidget.value);
        }

        node.setSize?.(computeNodeSize(state.width, state.height));

        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            widgetRef?.cleanup?.();
            vueApp.unmount();
            origRemoved?.apply(this, arguments);
        };

        const origOnResize = node.onResize;
        node.onResize = function(size: [number, number]) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };
    }
});
