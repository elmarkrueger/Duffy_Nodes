import { app } from "../../../scripts/app.js";
import { d as defineComponent, D as watch, f as onMounted, o as openBlock, c as createElementBlock, a as createBaseVNode, w as withDirectives, p as vModelSelect, F as Fragment, r as renderList, t as toDisplayString, j as normalizeClass, v as vModelText, m as normalizeStyle, b as ref, l as computed, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-CVynLnP5.js";
const _hoisted_1 = { class: "adaptive-resolution-root" };
const _hoisted_2 = { class: "control-group" };
const _hoisted_3 = ["value"];
const _hoisted_4 = { class: "aspect-ratio-grid" };
const _hoisted_5 = ["onClick"];
const _hoisted_6 = { class: "resolution-control-area" };
const _hoisted_7 = {
  key: 0,
  class: "custom-inputs"
};
const _hoisted_8 = { class: "input-block" };
const _hoisted_9 = ["step"];
const _hoisted_10 = { class: "input-block" };
const _hoisted_11 = ["step"];
const _hoisted_12 = {
  key: 1,
  class: "filtered-list"
};
const _hoisted_13 = ["value"];
const _hoisted_14 = { class: "divisibility-controls" };
const _hoisted_15 = { class: "constraint-group" };
const _hoisted_16 = ["onClick"];
const _hoisted_17 = { class: "stats-panel" };
const _hoisted_18 = { class: "preview-container" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AdaptiveResolutionLatent",
  props: {
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const modelContext = ref("SDXL");
    const availableModels = ["SD 1.5", "SDXL", "Qwen-Image 2512", "Flux 1", "Flux 2", "Flux 2 Klein", "Z-Image", "Ernie-Image"];
    const aspectRatios = ["1:1", "16:9", "9:16", "2:1", "3:2", "2:3", "3:4", "4:3", "9:21", "21:9"];
    const currentRatio = ref("1:1");
    const isCustom = ref(false);
    const width = ref(1024);
    const height = ref(1024);
    const constraint = ref(8);
    const selectedPreset = ref(null);
    const filteredPresets = computed(() => {
      const presets = [];
      const model = modelContext.value;
      const ratio = currentRatio.value;
      if (model.includes("Flux") || model === "Ernie-Image") {
        if (ratio === "1:1") presets.push({ width: 1024, height: 1024, label: "1.0 MP BASELINE" });
        if (ratio === "4:3") presets.push({ width: 1152, height: 896, label: "~1.0 MP ADJUSTED" });
        if (ratio === "3:4") presets.push({ width: 896, height: 1152, label: "~1.0 MP ADJUSTED" });
        if (ratio === "16:9") {
          presets.push({ width: 1344, height: 768, label: "~1.0 MP ADJUSTED" });
          presets.push({ width: 1920, height: 1088, label: "2.0 MP MAXIMUM" });
        }
        if (ratio === "9:16") presets.push({ width: 768, height: 1344, label: "~1.0 MP ADJUSTED" });
        if (ratio === "21:9") presets.push({ width: 1536, height: 640, label: "~1.0 MP ADJUSTED" });
        if (ratio === "3:2") presets.push({ width: 1728, height: 1152, label: "2.0 MP MAXIMUM" });
      } else if (model === "Z-Image") {
        if (ratio === "1:1") presets.push({ width: 1024, height: 1024, label: "1024 BASE" }, { width: 1280, height: 1280, label: "1280 BASE" }, { width: 1536, height: 1536, label: "1536 BASE" });
        if (ratio === "4:3") presets.push({ width: 1152, height: 864, label: "1024 BASE" }, { width: 1472, height: 1104, label: "1280 BASE" }, { width: 1728, height: 1296, label: "1536 BASE" });
        if (ratio === "3:4") presets.push({ width: 864, height: 1152, label: "1024 BASE" }, { width: 1104, height: 1472, label: "1280 BASE" }, { width: 1296, height: 1728, label: "1536 BASE" });
        if (ratio === "3:2") presets.push({ width: 1248, height: 832, label: "1024 BASE" }, { width: 1536, height: 1024, label: "1280 BASE" }, { width: 1872, height: 1248, label: "1536 BASE" });
        if (ratio === "16:9") presets.push({ width: 1280, height: 720, label: "1024 BASE" }, { width: 1536, height: 864, label: "1280 BASE" }, { width: 2048, height: 1152, label: "1536 BASE" });
        if (ratio === "9:16") presets.push({ width: 720, height: 1280, label: "1024 BASE" }, { width: 864, height: 1536, label: "1280 BASE" }, { width: 1152, height: 2048, label: "1536 BASE" });
        if (ratio === "21:9") presets.push({ width: 1344, height: 576, label: "1024 BASE" }, { width: 1680, height: 720, label: "1280 BASE" }, { width: 2016, height: 864, label: "1536 BASE" });
        if (ratio === "9:21") presets.push({ width: 576, height: 1344, label: "1024 BASE" }, { width: 720, height: 1680, label: "1280 BASE" }, { width: 864, height: 2016, label: "1536 BASE" });
      } else if (model === "SDXL" || model === "SD 1.5") {
        if (ratio === "1:1") presets.push({ width: 1024, height: 1024, label: "STANDARD BASELINE" });
        if (ratio === "4:3") presets.push({ width: 1152, height: 896, label: "STANDARD BASELINE" });
        if (ratio === "16:9") presets.push({ width: 1344, height: 768, label: "STANDARD BASELINE" });
        if (ratio === "3:4" || ratio === "9:16") presets.push({ width: 896, height: 1152, label: "PORTRAIT (VERTICAL)" });
      }
      if (presets.length === 0) {
        const parts = ratio.split(":").map(Number);
        const rw = parts[0] || 1;
        const rh = parts[1] || 1;
        const aspect = rw / rh;
        let targetMPs = [1];
        if (model === "SD 1.5") targetMPs = [0.26];
        else if (model === "Qwen-Image 2512") targetMPs = [0.75, 1.5, 3, 6.3];
        else if (model === "Z-Image") targetMPs = [1, 1.6, 2.3];
        else if (model.includes("Flux") || model === "Ernie-Image") targetMPs = [1, 1.5, 2];
        else if (model === "SDXL") targetMPs = [1];
        const c = constraint.value;
        targetMPs.forEach((mp) => {
          const targetPixels = mp * 1e6;
          let h = Math.sqrt(targetPixels / aspect);
          let w = h * aspect;
          w = Math.max(c, Math.round(w / c) * c);
          h = Math.max(c, Math.round(h / c) * c);
          if (!presets.find((p) => p.width === w && p.height === h)) {
            presets.push({ width: w, height: h, label: `~${mp.toFixed(1)} MP AUTO-CALCULATED` });
          }
        });
        if (presets.length === 0) {
          presets.push({ width: 1024, height: 1024, label: "FALLBACK DIMENSIONS" });
        }
      }
      return presets;
    });
    watch(modelContext, (newModel) => {
      if (newModel === "Flux 2 Klein") {
        constraint.value = 16;
      } else if (newModel.includes("Flux") || newModel === "Ernie-Image") {
        constraint.value = 16;
      } else {
        constraint.value = 8;
      }
      emitChange();
    });
    const calculateMP = (w, h) => (w * h / 1e6).toFixed(2);
    const calculateRatio = (w, h) => (w / h).toFixed(2);
    const previewStyle = computed(() => {
      const w = Math.max(10, width.value / 12);
      const h = Math.max(10, height.value / 12);
      return {
        width: `${w}px`,
        height: `${h}px`
      };
    });
    function selectAspectRatio(ratio) {
      isCustom.value = false;
      currentRatio.value = ratio;
      if (filteredPresets.value.length > 0) {
        selectedPreset.value = filteredPresets.value[0];
        applyPreset();
      }
    }
    function applyPreset() {
      if (selectedPreset.value) {
        width.value = enforceConstraint(selectedPreset.value.width);
        height.value = enforceConstraint(selectedPreset.value.height);
        emitChange();
      }
    }
    function swapDimensions() {
      const t = width.value;
      width.value = height.value;
      height.value = t;
      emitChange();
    }
    function updateFromCustom() {
      width.value = enforceConstraint(width.value);
      height.value = enforceConstraint(height.value);
      emitChange();
    }
    function setConstraint(val) {
      constraint.value = val;
      updateFromCustom();
    }
    function enforceConstraint(val) {
      const c = constraint.value;
      return Math.max(c, Math.round(val / c) * c);
    }
    function serialise() {
      return JSON.stringify({
        model: modelContext.value,
        width: width.value,
        height: height.value,
        constraint: constraint.value,
        isCustom: isCustom.value,
        ratio: currentRatio.value
      });
    }
    const isDragging = ref(false);
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartW = 0;
    let dragStartH = 0;
    function startDrag(e) {
      isDragging.value = true;
      isCustom.value = true;
      const target = e.target;
      target.setPointerCapture(e.pointerId);
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartW = width.value;
      dragStartH = height.value;
      target.addEventListener("pointermove", onDrag);
      target.addEventListener("pointerup", stopDrag);
      target.addEventListener("pointercancel", stopDrag);
      e.preventDefault();
    }
    function onDrag(e) {
      if (!isDragging.value) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      const scale = 12;
      const rawNewW = dragStartW + dx * scale;
      const rawNewH = dragStartH + dy * scale;
      width.value = enforceConstraint(Math.max(constraint.value, rawNewW));
      height.value = enforceConstraint(Math.max(constraint.value, rawNewH));
      emitChange();
    }
    function stopDrag(e) {
      isDragging.value = false;
      const target = e.target;
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener("pointermove", onDrag);
      target.removeEventListener("pointerup", stopDrag);
      target.removeEventListener("pointercancel", stopDrag);
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (data.model) modelContext.value = data.model;
        if (data.width) width.value = data.width;
        if (data.height) height.value = data.height;
        if (data.constraint) constraint.value = data.constraint;
        if (data.isCustom !== void 0) isCustom.value = data.isCustom;
        if (data.ratio) currentRatio.value = data.ratio;
      } catch (e) {
        console.error("Failed to parse node state JSON", e);
      }
    }
    function emitChange() {
      if (props.onChange) {
        props.onChange(serialise());
      }
    }
    function cleanup() {
    }
    __expose({ serialise, deserialise, cleanup });
    onMounted(() => {
      if (!isCustom.value && filteredPresets.value.length > 0 && !selectedPreset.value) {
        selectedPreset.value = filteredPresets.value[0];
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          _cache[6] || (_cache[6] = createBaseVNode("label", null, "ARCHITECTURAL CONTEXT:", -1)),
          withDirectives(createBaseVNode("select", {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => modelContext.value = $event),
            onChange: _cache[1] || (_cache[1] = //@ts-ignore
            (...args) => _ctx.onModelChange && _ctx.onModelChange(...args))
          }, [
            (openBlock(), createElementBlock(Fragment, null, renderList(availableModels, (model) => {
              return createBaseVNode("option", {
                key: model,
                value: model
              }, toDisplayString(model), 9, _hoisted_3);
            }), 64))
          ], 544), [
            [vModelSelect, modelContext.value]
          ])
        ]),
        createBaseVNode("div", _hoisted_4, [
          (openBlock(), createElementBlock(Fragment, null, renderList(aspectRatios, (ratio) => {
            return createBaseVNode("button", {
              key: ratio,
              class: normalizeClass({ active: currentRatio.value === ratio && !isCustom.value }),
              onClick: ($event) => selectAspectRatio(ratio)
            }, toDisplayString(ratio), 11, _hoisted_5);
          }), 64))
        ]),
        createBaseVNode("div", _hoisted_6, [
          createBaseVNode("button", {
            class: normalizeClass(["custom-btn", { active: isCustom.value }]),
            onClick: _cache[2] || (_cache[2] = ($event) => isCustom.value = true)
          }, " CUSTOM RESOLUTION ", 2),
          isCustom.value ? (openBlock(), createElementBlock("div", _hoisted_7, [
            createBaseVNode("div", _hoisted_8, [
              _cache[7] || (_cache[7] = createBaseVNode("label", null, "WIDTH", -1)),
              withDirectives(createBaseVNode("input", {
                type: "number",
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => width.value = $event),
                step: constraint.value,
                onChange: updateFromCustom
              }, null, 40, _hoisted_9), [
                [
                  vModelText,
                  width.value,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("button", {
              class: "swap-btn",
              onClick: swapDimensions,
              title: "Orientation Toggle"
            }, " ⟲ "),
            createBaseVNode("div", _hoisted_10, [
              _cache[8] || (_cache[8] = createBaseVNode("label", null, "HEIGHT", -1)),
              withDirectives(createBaseVNode("input", {
                type: "number",
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => height.value = $event),
                step: constraint.value,
                onChange: updateFromCustom
              }, null, 40, _hoisted_11), [
                [
                  vModelText,
                  height.value,
                  void 0,
                  { number: true }
                ]
              ])
            ])
          ])) : (openBlock(), createElementBlock("div", _hoisted_12, [
            withDirectives(createBaseVNode("select", {
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => selectedPreset.value = $event),
              onChange: applyPreset,
              class: "preset-select",
              size: "4"
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(filteredPresets.value, (preset, i) => {
                return openBlock(), createElementBlock("option", {
                  key: i,
                  value: preset
                }, toDisplayString(preset.width) + " × " + toDisplayString(preset.height) + " (" + toDisplayString(calculateMP(preset.width, preset.height)) + " MP) - " + toDisplayString(preset.label), 9, _hoisted_13);
              }), 128))
            ], 544), [
              [vModelSelect, selectedPreset.value]
            ])
          ]))
        ]),
        createBaseVNode("div", _hoisted_14, [
          _cache[9] || (_cache[9] = createBaseVNode("label", null, "DIVISIBILITY CONSTRAINT", -1)),
          createBaseVNode("div", _hoisted_15, [
            (openBlock(), createElementBlock(Fragment, null, renderList([8, 16, 32, 64], (val) => {
              return createBaseVNode("button", {
                key: val,
                class: normalizeClass({ active: constraint.value === val }),
                onClick: ($event) => setConstraint(val)
              }, toDisplayString(val), 11, _hoisted_16);
            }), 64))
          ])
        ]),
        createBaseVNode("div", _hoisted_17, [
          createBaseVNode("span", null, "RATIO: ~" + toDisplayString(calculateRatio(width.value, height.value)) + ":1", 1),
          createBaseVNode("span", null, "DENSITY: " + toDisplayString(calculateMP(width.value, height.value)) + " MP", 1)
        ]),
        createBaseVNode("div", _hoisted_18, [
          createBaseVNode("div", {
            class: "preview-box",
            style: normalizeStyle(previewStyle.value)
          }, [
            createBaseVNode("div", {
              class: "grab-point bottom-right",
              onPointerdown: startDrag,
              title: "Drag to Resize"
            }, null, 32)
          ], 4)
        ])
      ]);
    };
  }
});
const AdaptiveResolutionLatent = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7f1c5819"]]);
app.registerExtension({
  name: "Duffy.AdaptiveResolutionLatent",
  async nodeCreated(node) {
    var _a, _b, _c;
    if (node.comfyClass !== "Duffy_AdaptiveResolutionLatent") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "state_json");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.hidden = true;
      dataWidget.computeSize = () => [0, 0];
      dataWidget.draw = () => {
      };
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("mousedown", (e) => e.stopPropagation());
    container.addEventListener("mouseup", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    container.addEventListener("keydown", (e) => e.stopPropagation());
    container.addEventListener("keyup", (e) => e.stopPropagation());
    const vueApp = createApp(AdaptiveResolutionLatent, {
      onChange: (json) => {
        if (dataWidget) {
          dataWidget.value = json;
        }
        node.setDirtyCanvas(true, true);
      }
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    domWidget.content = container;
    domWidget.computeSize = () => [460, 580];
    const MIN_W = 460;
    const MIN_H = 580;
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    (_b = node.setSize) == null ? void 0 : _b.call(node, [MIN_W, MIN_H]);
    (_c = node.setDirtyCanvas) == null ? void 0 : _c.call(node, true, true);
    if ((dataWidget == null ? void 0 : dataWidget.value) && dataWidget.value !== "{}") {
      instance.deserialise(dataWidget.value);
    } else {
      dataWidget.value = instance.serialise();
    }
    const origConfigure = node.configure;
    node.configure = function(info) {
      origConfigure == null ? void 0 : origConfigure.call(this, info);
      if (dataWidget == null ? void 0 : dataWidget.value) instance.deserialise(dataWidget.value);
    };
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      (_a2 = instance.cleanup) == null ? void 0 : _a2.call(instance);
      vueApp.unmount();
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
  }
});
