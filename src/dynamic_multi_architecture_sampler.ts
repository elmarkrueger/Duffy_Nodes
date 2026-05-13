import { app as comfyApp } from "COMFY_APP";

type ConstraintProfile = {
    min: number;
    max: number;
    default: number;
    cfg: number;
    distilled: boolean;
};

const ARCHITECTURE_CONSTRAINTS: Record<string, ConstraintProfile> = {
    "Z-Image Base": { min: 20, default: 30, max: 100, cfg: 4.5, distilled: false },
    "Z-Image Turbo": { min: 6, default: 8, max: 100, cfg: 1.0, distilled: true },
    "Qwen-Image-2512": { min: 4, default: 8, max: 100, cfg: 1.0, distilled: true },
    "Flux.2-Klein-Base": { min: 20, default: 25, max: 100, cfg: 3.5, distilled: false },
    "Flux.2-Klein": { min: 4, default: 8, max: 100, cfg: 1.0, distilled: true },
    "Ernie-Image Base": { min: 20, default: 50, max: 100, cfg: 4.0, distilled: false },
    "Ernie-Image": { min: 4, default: 8, max: 100, cfg: 1.0, distilled: true },
};

function clampValue(value: number, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    if (value < min || value > max) {
        return fallback;
    }
    return value;
}

function updateWidgetValue(widget: any, value: number) {
    widget.value = value;
    if (typeof widget.callback === "function") {
        widget.callback(widget.value);
    }
}

comfyApp.registerExtension({
    name: "Duffy.DynamicMultiArchitectureSampler",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_DynamicMultiArchitectureSampler") return;

        requestAnimationFrame(() => {
            const modelWidget = node.widgets?.find((w: any) => w.name === "model_selection");
            const stepsWidget = node.widgets?.find((w: any) => w.name === "steps");
            const cfgWidget = node.widgets?.find((w: any) => w.name === "cfg");

            if (!modelWidget || !stepsWidget || !cfgWidget) return;

            const applyProfile = (profileName: string) => {
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
                    constraints.default,
                );
                if (nextSteps !== Number(stepsWidget.value)) {
                    updateWidgetValue(stepsWidget, nextSteps);
                }

                if (constraints.distilled) {
                    const nextCfg = 1.0;
                    if (Number(cfgWidget.value) !== nextCfg) {
                        updateWidgetValue(cfgWidget, nextCfg);
                    }
                }

                node.setDirtyCanvas?.(true, true);
                const canvas = (comfyApp as any).canvas;
                canvas?.setDirty?.(true, true);
            };

            const originalModelCallback = modelWidget.callback;
            modelWidget.callback = function(value: string) {
                if (typeof originalModelCallback === "function") {
                    originalModelCallback.apply(this, arguments);
                }
                applyProfile(String(value));
            };

            applyProfile(String(modelWidget.value));

            const originalRemoved = node.onRemoved;
            node.onRemoved = function() {
                modelWidget.callback = originalModelCallback;
                originalRemoved?.apply(this, arguments);
            };
        });
    },
});
