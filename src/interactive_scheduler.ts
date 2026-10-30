import { createApp } from "vue";
// @ts-ignore - resolved at runtime by ComfyUI
import { app as comfyApp } from "COMFY_APP";
import InteractiveScheduler, { type WidgetParamsSnapshot } from "./InteractiveScheduler.vue";

const NODE_CLASS = "Duffy_InteractiveScheduler";
const DEFAULT_SIZE: [number, number] = [480, 490];
const MIN_WIDGET_HEIGHT = 270;

const ISOLATED_EVENTS = [
  "pointerdown",
  "mousedown",
  "mouseup",
  "dblclick",
  "wheel",
] as const;

comfyApp.registerExtension({
  name: "Duffy.InteractiveScheduler.Vue",

  getNodeMenuItems(node: any) {
    if (node?.comfyClass !== NODE_CLASS) return [];
    return [
      {
        content: "Duffy: Reset Sigma Curve to Baseline",
        callback: () => {
          node.__duffySchedulerInstance?.resetToBaseline?.();
        },
      },
    ];
  },

  async nodeCreated(node: any) {
    if (node.comfyClass !== NODE_CLASS) return;

    const findWidget = (name: string) =>
      node.widgets?.find((w: any) => w.name === name);

    const schedulerWidget = findWidget("scheduler");
    const stepsWidget = findWidget("steps");
    const denoiseWidget = findWidget("denoise");
    const sigmaMaxWidget = findWidget("sigma_max_fallback");
    const sigmaMinWidget = findWidget("sigma_min_fallback");
    const monotonicWidget = findWidget("enforce_monotonic");
    const stateWidget = findWidget("custom_sigmas_json");

    if (stateWidget) {
      stateWidget.type = "hidden";
      stateWidget.hidden = true;
      stateWidget.computeSize = () => [0, -4];
      stateWidget.draw = () => {};
    }

    const container = document.createElement("div");
    container.className = "duffy-interactive-scheduler-container";
    container.style.cssText =
      "width:100%; height:100%; box-sizing:border-box; position:relative; isolation:isolate;";

    for (const type of ISOLATED_EVENTS) {
      container.addEventListener(type, (event) => event.stopPropagation());
    }
    container.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      // Canvas handles right-click point deletion internally; non-canvas areas forward to LiteGraph menu
      if ((event.target as HTMLElement)?.tagName?.toLowerCase() !== "canvas") {
        comfyApp.canvas?.processContextMenu?.(node, event);
      }
    });

    let isInternalStepsUpdate = false;

    const getWidgetParams = (): WidgetParamsSnapshot => ({
      scheduler: String(schedulerWidget?.value ?? "normal"),
      steps: Math.max(1, Math.min(1000, Math.round(Number(stepsWidget?.value ?? 20)))),
      denoise: Math.max(0.01, Math.min(1.0, Number(denoiseWidget?.value ?? 1.0))),
      sigmaMaxFallback: Math.max(0.0001, Number(sigmaMaxWidget?.value ?? 1.0)),
      sigmaMinFallback: Math.max(0.000001, Number(sigmaMinWidget?.value ?? 0.01)),
      enforceMonotonic: Boolean(monotonicWidget?.value ?? true),
    });

    const writeStateJson = (json: string) => {
      if (!stateWidget) return;
      stateWidget.value = json;
      node.setDirtyCanvas?.(true, true);
    };

    const writeStepsFromGraph = (newSteps: number) => {
      if (!stepsWidget) return;
      const clamped = Math.max(1, Math.min(1000, Math.round(newSteps)));
      if (Number(stepsWidget.value) === clamped) return;
      isInternalStepsUpdate = true;
      try {
        stepsWidget.value = clamped;
      } finally {
        isInternalStepsUpdate = false;
      }
      node.setDirtyCanvas?.(true, true);
    };

    const initialStateStr =
      typeof stateWidget?.value === "string" ? stateWidget.value : "{}";

    const vueApp = createApp(InteractiveScheduler, {
      getNodeId: () => String(node.id ?? ""),
      initialStateJson: initialStateStr,
      getWidgetParams,
      onStateChange: writeStateJson,
      onStepsChange: writeStepsFromGraph,
      onForwardContextMenu: (event: MouseEvent) => {
        comfyApp.canvas?.processContextMenu?.(node, event);
      },
    });

    const instance = vueApp.mount(container) as any;
    node.__duffySchedulerInstance = instance;

    const domWidget = node.addDOMWidget("interactive_scheduler_ui", "custom", container, {
      serialize: false,
      hideOnZoom: false,
      getMinHeight: () => MIN_WIDGET_HEIGHT,
    });
    domWidget.content = container;

    // Wire two-way synchronization on standard LiteGraph widgets
    if (stepsWidget) {
      const origStepsCb = stepsWidget.callback;
      stepsWidget.callback = function (...args: any[]) {
        const res = origStepsCb?.apply(this, args);
        if (!isInternalStepsUpdate) {
          instance.onExternalStepsWidgetChanged?.(Number(stepsWidget.value ?? 20));
        }
        return res;
      };
    }

    if (schedulerWidget) {
      const origSchedCb = schedulerWidget.callback;
      schedulerWidget.callback = function (...args: any[]) {
        const res = origSchedCb?.apply(this, args);
        instance.onExternalSchedulerWidgetChanged?.(String(schedulerWidget.value ?? "normal"));
        return res;
      };
    }

    for (const w of [denoiseWidget, sigmaMaxWidget, sigmaMinWidget, monotonicWidget]) {
      if (!w) continue;
      const origCb = w.callback;
      w.callback = function (...args: any[]) {
        const res = origCb?.apply(this, args);
        instance.onExternalBoundsOrDenoiseChanged?.();
        return res;
      };
    }

    if (
      !node.size ||
      node.size[0] < DEFAULT_SIZE[0] ||
      node.size[1] < DEFAULT_SIZE[1]
    ) {
      node.setSize?.([
        Math.max(node.size?.[0] ?? 0, DEFAULT_SIZE[0]),
        Math.max(node.size?.[1] ?? 0, DEFAULT_SIZE[1]),
      ]);
    }

    const origOnResize = node.onResize;
    node.onResize = function (size: [number, number]) {
      if (Array.isArray(size)) {
        size[0] = Math.max(380, size[0]);
        size[1] = Math.max(420, size[1]);
      }
      origOnResize?.apply(this, arguments as any);
    };

    const origConfigure = node.configure;
    node.configure = function (info: any) {
      const result = origConfigure?.apply(this, arguments as any);
      if (typeof stateWidget?.value === "string" && stateWidget.value.trim()) {
        instance.hydrateState?.(stateWidget.value);
      }
      return result;
    };

    const origExecuted = node.onExecuted;
    node.onExecuted = function (message: any) {
      origExecuted?.apply(this, arguments as any);
      const statePayload = message?.scheduler_state?.[0];
      if (statePayload) {
        instance.onBackendExecuted?.(statePayload);
      }
    };

    const origRemoved = node.onRemoved;
    node.onRemoved = function () {
      instance.cleanup?.();
      vueApp.unmount();
      delete node.__duffySchedulerInstance;
      origRemoved?.apply(this, arguments as any);
    };
  },
});
