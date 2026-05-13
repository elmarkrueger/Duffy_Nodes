import { app } from "../../../scripts/app.js";
const ARCHITECTURE_CONSTRAINTS = {
  "Z-Image Base": { min: 20, default: 30, max: 100, cfg: 4.5, distilled: false },
  "Z-Image Turbo": { min: 6, default: 8, max: 100, cfg: 1, distilled: true },
  "Qwen-Image-2512": { min: 4, default: 8, max: 100, cfg: 1, distilled: true },
  "Flux.2-Klein-Base": { min: 20, default: 25, max: 100, cfg: 3.5, distilled: false },
  "Flux.2-Klein": { min: 4, default: 8, max: 100, cfg: 1, distilled: true },
  "Ernie-Image Base": { min: 20, default: 50, max: 100, cfg: 4, distilled: false },
  "Ernie-Image": { min: 4, default: 8, max: 100, cfg: 1, distilled: true }
};
function clampValue(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (value < min || value > max) {
    return fallback;
  }
  return value;
}
function updateWidgetValue(widget, value) {
  widget.value = value;
  if (typeof widget.callback === "function") {
    widget.callback(widget.value);
  }
}
app.registerExtension({
  name: "Duffy.DynamicMultiArchitectureSampler",
  async nodeCreated(node) {
    if (node.comfyClass !== "Duffy_DynamicMultiArchitectureSampler") return;
    requestAnimationFrame(() => {
      var _a, _b, _c;
      const modelWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "model_selection");
      const stepsWidget = (_b = node.widgets) == null ? void 0 : _b.find((w) => w.name === "steps");
      const cfgWidget = (_c = node.widgets) == null ? void 0 : _c.find((w) => w.name === "cfg");
      if (!modelWidget || !stepsWidget || !cfgWidget) return;
      const applyProfile = (profileName) => {
        var _a2, _b2;
        const constraints = ARCHITECTURE_CONSTRAINTS[profileName];
        if (!constraints) return;
        stepsWidget.options = stepsWidget.options || {};
        stepsWidget.options.min = constraints.min;
        stepsWidget.options.max = constraints.max;
        stepsWidget.options.default = constraints.default;
        const nextSteps = clampValue(
          Number(stepsWidget.value),
          constraints.min,
          constraints.max,
          constraints.default
        );
        if (nextSteps !== Number(stepsWidget.value)) {
          updateWidgetValue(stepsWidget, nextSteps);
        }
        if (constraints.distilled) {
          const nextCfg = 1;
          if (Number(cfgWidget.value) !== nextCfg) {
            updateWidgetValue(cfgWidget, nextCfg);
          }
        }
        (_a2 = node.setDirtyCanvas) == null ? void 0 : _a2.call(node, true, true);
        const canvas = app.canvas;
        (_b2 = canvas == null ? void 0 : canvas.setDirty) == null ? void 0 : _b2.call(canvas, true, true);
      };
      const originalModelCallback = modelWidget.callback;
      modelWidget.callback = function(value) {
        if (typeof originalModelCallback === "function") {
          originalModelCallback.apply(this, arguments);
        }
        applyProfile(String(value));
      };
      applyProfile(String(modelWidget.value));
      const originalRemoved = node.onRemoved;
      node.onRemoved = function() {
        modelWidget.callback = originalModelCallback;
        originalRemoved == null ? void 0 : originalRemoved.apply(this, arguments);
      };
    });
  }
});
