import { createApp } from "vue";
// @ts-ignore - resolved at runtime by ComfyUI
import { app as comfyApp } from "COMFY_APP";
import RealTimeGradingProcessor from "./RealTimeGradingProcessor.vue";

const NODE_CLASS = "Duffy_RealTimeGradingProcessor";
const DEFAULT_SIZE: [number, number] = [440, 380];
const MIN_WIDGET_HEIGHT = 240;

const ISOLATED_EVENTS = ["pointerdown", "mousedown", "mouseup", "dblclick", "wheel"] as const;

comfyApp.registerExtension({
  name: "Duffy.RealTimeGradingProcessor.Vue",

  getNodeMenuItems(node: any) {
    if (node?.comfyClass !== NODE_CLASS) return [];
    return [
      {
        content: "Duffy: Open Full-Screen Grading Studio",
        callback: () => {
          node.__duffyGradingInstance?.openEditor?.();
        },
      },
    ];
  },

  async nodeCreated(node: any) {
    if (node.comfyClass !== NODE_CLASS) return;

    const findWidget = (name: string) => node.widgets?.find((w: any) => w.name === name);
    const paramsWidget = findWidget("shader_params");
    const strengthWidget = findWidget("overall_strength");

    if (paramsWidget) {
      paramsWidget.type = "hidden";
      paramsWidget.hidden = true;
      paramsWidget.computeSize = () => [0, -4];
      paramsWidget.draw = () => {};
    }

    const container = document.createElement("div");
    container.className = "duffy-realtime-grading-container";
    container.style.cssText =
      "width:100%; height:100%; box-sizing:border-box; position:relative; isolation:isolate;";

    for (const type of ISOLATED_EVENTS) {
      container.addEventListener(type, (event) => event.stopPropagation());
    }
    container.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      comfyApp.canvas?.processContextMenu?.(node, event);
    });

    const writeState = (json: string) => {
      if (!paramsWidget) return;
      paramsWidget.value = json;
      node.setDirtyCanvas?.(true, true);
    };

    const writeStrength = (val: number) => {
      if (!strengthWidget) return;
      strengthWidget.value = val;
      node.setDirtyCanvas?.(true, true);
    };

    const initialParamsStr = typeof paramsWidget?.value === "string" ? paramsWidget.value : "{}";

    const vueApp = createApp(RealTimeGradingProcessor, {
      getNodeId: () => String(node.id),
      initialParams: initialParamsStr,
      getOverallStrength: () => Number(strengthWidget?.value ?? 1.0),
      onStateChange: writeState,
      onStrengthChange: writeStrength,
    });
    const instance = vueApp.mount(container) as any;
    node.__duffyGradingInstance = instance;

    const domWidget = node.addDOMWidget("realtime_grading_ui", "custom", container, {
      serialize: false,
      hideOnZoom: false,
      getMinHeight: () => MIN_WIDGET_HEIGHT,
    });
    domWidget.content = container;

    if (strengthWidget) {
      const originalCallback = strengthWidget.callback;
      strengthWidget.callback = function (...args: any[]) {
        const result = originalCallback?.apply(this, args);
        instance.setOverallStrength?.(Number(strengthWidget.value ?? 1.0));
        return result;
      };
    }

    if (!node.size || node.size[0] < DEFAULT_SIZE[0] || node.size[1] < DEFAULT_SIZE[1]) {
      node.setSize?.([
        Math.max(node.size?.[0] ?? 0, DEFAULT_SIZE[0]),
        Math.max(node.size?.[1] ?? 0, DEFAULT_SIZE[1]),
      ]);
    }

    const originalConfigure = node.configure;
    node.configure = function (info: any) {
      const result = originalConfigure?.apply(this, arguments as any);
      if (typeof paramsWidget?.value === "string" && paramsWidget.value.trim()) {
        instance.hydrateState?.(paramsWidget.value);
      }
      if (strengthWidget) {
        instance.setOverallStrength?.(Number(strengthWidget.value ?? 1.0));
      }
      return result;
    };

    const originalExecuted = node.onExecuted;
    node.onExecuted = function (message: any) {
      originalExecuted?.apply(this, arguments as any);
      const originalThumb = message?.original_thumbnail?.[0];
      const processedThumb = message?.grading_result?.[0] ?? message?.processed_thumbnail?.[0];
      const histogram = message?.histogram?.[0];
      const savedState = message?.grading_state?.[0];
      if (typeof savedState === "string" && savedState.length < 500_000) {
        writeState(savedState);
      }
      instance.setExecutionResult?.({
        originalThumb,
        processedThumb,
        histogram,
        savedState,
      });
    };

    const originalRemoved = node.onRemoved;
    node.onRemoved = function () {
      delete node.__duffyGradingInstance;
      instance.cleanup?.();
      vueApp.unmount();
      originalRemoved?.apply(this, arguments as any);
    };
  },
});
