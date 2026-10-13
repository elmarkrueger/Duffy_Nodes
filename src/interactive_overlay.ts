import { createApp } from "vue";
// @ts-ignore - resolved at runtime by ComfyUI
import { app as comfyApp } from "COMFY_APP";
// @ts-ignore - resolved at runtime by ComfyUI
import { api } from "COMFY_API";
import InteractiveOverlay from "./InteractiveOverlay.vue";

const NODE_CLASS = "Duffy_InteractiveOverlayCompositor";
const DEFAULT_SIZE: [number, number] = [520, 660];
const MIN_WIDGET_HEIGHT = 300;

/** Events that must never reach the graph canvas while interacting with the viewport. */
const ISOLATED_EVENTS = ["pointerdown", "mousedown", "mouseup", "dblclick", "wheel"] as const;

comfyApp.registerExtension({
  name: "Duffy.InteractiveOverlayCompositor.Vue",

  async nodeCreated(node: any) {
    if (node.comfyClass !== NODE_CLASS) return;

    const findWidget = (name: string) => node.widgets?.find((w: any) => w.name === name);
    const stateWidget = findWidget("transform_state");
    const blendWidget = findWidget("blend_mode");
    const opacityWidget = findWidget("opacity");

    if (stateWidget) {
      stateWidget.type = "hidden";
      stateWidget.hidden = true;
      stateWidget.computeSize = () => [0, -4];
      stateWidget.draw = () => {};
    }

    const container = document.createElement("div");
    container.className = "duffy-interactive-overlay-container";
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; position:relative; isolation:isolate;";
    for (const type of ISOLATED_EVENTS) {
      container.addEventListener(type, (event) => event.stopPropagation());
    }
    container.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      comfyApp.canvas?.processContextMenu?.(node, event);
    });

    const writeState = (json: string) => {
      if (!stateWidget) return;
      stateWidget.value = json;
      node.setDirtyCanvas?.(true, true);
    };

    const vueApp = createApp(InteractiveOverlay, {
      getNodeId: () => String(node.id),
      getAppearance: () => ({
        blend: String(blendWidget?.value ?? "normal"),
        opacity: Number(opacityWidget?.value ?? 1),
      }),
      onStateChange: writeState,
    });
    const instance = vueApp.mount(container) as any;

    const domWidget = node.addDOMWidget("interactive_overlay_ui", "custom", container, {
      serialize: false,
      hideOnZoom: false,
      getMinHeight: () => MIN_WIDGET_HEIGHT,
    });
    domWidget.content = container;

    // Live preview of blend mode / opacity changes made in the node widgets during a pause.
    const syncAppearance = () =>
      instance.setAppearance?.(String(blendWidget?.value ?? "normal"), Number(opacityWidget?.value ?? 1));
    for (const widget of [blendWidget, opacityWidget]) {
      if (!widget) continue;
      const original = widget.callback;
      widget.callback = function (...args: any[]) {
        const result = original?.apply(this, args);
        syncAppearance();
        return result;
      };
    }

    if (!node.size || node.size[0] < DEFAULT_SIZE[0] || node.size[1] < DEFAULT_SIZE[1]) {
      node.setSize?.([Math.max(node.size?.[0] ?? 0, DEFAULT_SIZE[0]), Math.max(node.size?.[1] ?? 0, DEFAULT_SIZE[1])]);
    }

    // Show the composited result and persist the authoritative transform after execution.
    const originalExecuted = node.onExecuted;
    node.onExecuted = function (message: any) {
      originalExecuted?.apply(this, arguments as any);
      const result = message?.overlay_result?.[0];
      if (result?.filename) {
        const params = new URLSearchParams({
          filename: String(result.filename),
          subfolder: String(result.subfolder ?? ""),
          type: String(result.type ?? "temp"),
          rand: String(Math.random()).slice(2, 10),
        });
        instance.setResult?.(api.apiURL(`/view?${params.toString()}`));
      }
      const savedState = message?.overlay_state?.[0];
      if (typeof savedState === "string" && savedState.length < 8192) writeState(savedState);
    };

    const originalRemoved = node.onRemoved;
    node.onRemoved = function () {
      instance.cleanup?.();
      vueApp.unmount();
      originalRemoved?.apply(this, arguments as any);
    };
  },
});
