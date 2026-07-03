import { app } from "../../../scripts/app.js";
import { d as defineComponent, o as openBlock, c as createElementBlock, a as createBaseVNode, F as Fragment, r as renderList, w as withDirectives, v as vModelText, n as normalizeClass, b as ref, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-CRxIfRw1.js";
const _hoisted_1 = { class: "five-sliders-root" };
const _hoisted_2 = { class: "sliders-list" };
const _hoisted_3 = { class: "main-controls" };
const _hoisted_4 = ["onUpdate:modelValue", "onChange"];
const _hoisted_5 = { class: "slider-container" };
const _hoisted_6 = ["onUpdate:modelValue", "min", "max", "step", "onInput"];
const _hoisted_7 = ["onUpdate:modelValue", "min", "max", "step", "onChange"];
const _hoisted_8 = ["onClick"];
const _hoisted_9 = { class: "setting-field" };
const _hoisted_10 = ["onUpdate:modelValue", "onChange"];
const _hoisted_11 = { class: "setting-field" };
const _hoisted_12 = ["onUpdate:modelValue", "onChange"];
const _hoisted_13 = { class: "setting-field" };
const _hoisted_14 = ["onUpdate:modelValue", "onChange"];
const _hoisted_15 = { class: "setting-field" };
const _hoisted_16 = ["onUpdate:modelValue", "onChange"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "FiveDynamicSliders",
  props: {
    onChange: { type: Function },
    onLabelChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const sliders = ref([
      { label: "Slider 1", value: 0.5, min: 0, max: 1, step: 0.01, decimals: 2, showSettings: false },
      { label: "Slider 2", value: 0.5, min: 0, max: 1, step: 0.01, decimals: 2, showSettings: false },
      { label: "Slider 3", value: 0.5, min: 0, max: 1, step: 0.01, decimals: 2, showSettings: false },
      { label: "Slider 4", value: 0.5, min: 0, max: 1, step: 0.01, decimals: 2, showSettings: false },
      { label: "Slider 5", value: 0.5, min: 0, max: 1, step: 0.01, decimals: 2, showSettings: false }
    ]);
    function serialise() {
      const data = sliders.value.map((s) => {
        const factor = Math.pow(10, s.decimals);
        const val = Math.round((s.value || 0) * factor) / factor;
        return {
          label: s.label,
          value: val,
          min: s.min,
          max: s.max,
          step: s.step,
          decimals: s.decimals
        };
      });
      return JSON.stringify(data);
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
          sliders.value = data.slice(0, 5).map((s, idx) => {
            var _a;
            return {
              label: s.label || `Slider ${idx + 1}`,
              value: typeof s.value === "number" ? s.value : 0.5,
              min: typeof s.min === "number" ? s.min : 0,
              max: typeof s.max === "number" ? s.max : 1,
              step: typeof s.step === "number" ? s.step : 0.01,
              decimals: typeof s.decimals === "number" ? s.decimals : 2,
              showSettings: ((_a = sliders.value[idx]) == null ? void 0 : _a.showSettings) ?? false
            };
          });
          while (sliders.value.length < 5) {
            const idx = sliders.value.length;
            sliders.value.push({
              label: `Slider ${idx + 1}`,
              value: 0.5,
              min: 0,
              max: 1,
              step: 0.01,
              decimals: 2,
              showSettings: false
            });
          }
        }
      } catch (e) {
      }
    }
    function emitChange() {
      var _a;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function onLabelChange(index, newLabel) {
      var _a;
      (_a = props.onLabelChange) == null ? void 0 : _a.call(props, index, newLabel);
      emitChange();
    }
    function onSliderInput(item) {
      const factor = Math.pow(10, item.decimals);
      item.value = Math.round(item.value * factor) / factor;
    }
    function onNumberChange(item) {
      if (item.value < item.min) item.value = item.min;
      if (item.value > item.max) item.value = item.max;
      const factor = Math.pow(10, item.decimals);
      item.value = Math.round(item.value * factor) / factor;
      emitChange();
    }
    function toggleSettings(index) {
      sliders.value[index].showSettings = !sliders.value[index].showSettings;
    }
    function onSettingsChange(item) {
      if (item.min >= item.max) {
        item.max = item.min + 1;
      }
      if (item.decimals < 0) item.decimals = 0;
      if (item.decimals > 10) item.decimals = 10;
      if (item.step <= 0) item.step = 1e-3;
      if (item.value < item.min) item.value = item.min;
      if (item.value > item.max) item.value = item.max;
      const factor = Math.pow(10, item.decimals);
      item.value = Math.round(item.value * factor) / factor;
      emitChange();
    }
    function cleanup() {
    }
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[5] || (_cache[5] = createBaseVNode("div", { class: "header" }, [
          createBaseVNode("h4", null, "Five Dynamic Sliders")
        ], -1)),
        createBaseVNode("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(sliders.value, (item, index) => {
            return openBlock(), createElementBlock("div", {
              key: index,
              class: "slider-row glass-panel"
            }, [
              createBaseVNode("div", _hoisted_3, [
                withDirectives(createBaseVNode("input", {
                  type: "text",
                  "onUpdate:modelValue": ($event) => item.label = $event,
                  onChange: ($event) => onLabelChange(index, item.label),
                  class: "label-input",
                  placeholder: "Slider Label"
                }, null, 40, _hoisted_4), [
                  [vModelText, item.label]
                ]),
                createBaseVNode("div", _hoisted_5, [
                  withDirectives(createBaseVNode("input", {
                    type: "range",
                    "onUpdate:modelValue": ($event) => item.value = $event,
                    min: item.min,
                    max: item.max,
                    step: item.step,
                    onInput: ($event) => onSliderInput(item),
                    onChange: emitChange,
                    class: "slider-bar"
                  }, null, 40, _hoisted_6), [
                    [
                      vModelText,
                      item.value,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                withDirectives(createBaseVNode("input", {
                  type: "number",
                  "onUpdate:modelValue": ($event) => item.value = $event,
                  min: item.min,
                  max: item.max,
                  step: item.step,
                  onChange: ($event) => onNumberChange(item),
                  class: "number-input"
                }, null, 40, _hoisted_7), [
                  [
                    vModelText,
                    item.value,
                    void 0,
                    { number: true }
                  ]
                ]),
                createBaseVNode("button", {
                  class: "settings-toggle-btn",
                  onClick: ($event) => toggleSettings(index)
                }, [..._cache[0] || (_cache[0] = [
                  createBaseVNode("svg", {
                    class: "cog-icon",
                    viewBox: "0 0 24 24",
                    width: "14",
                    height: "14"
                  }, [
                    createBaseVNode("path", {
                      fill: "currentColor",
                      d: "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.03,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"
                    })
                  ], -1)
                ])], 8, _hoisted_8)
              ]),
              createBaseVNode("div", {
                class: normalizeClass(["settings-panel", { expanded: item.showSettings }])
              }, [
                createBaseVNode("div", _hoisted_9, [
                  _cache[1] || (_cache[1] = createBaseVNode("label", null, "Min", -1)),
                  withDirectives(createBaseVNode("input", {
                    type: "number",
                    "onUpdate:modelValue": ($event) => item.min = $event,
                    onChange: ($event) => onSettingsChange(item),
                    class: "setting-input",
                    step: "any"
                  }, null, 40, _hoisted_10), [
                    [
                      vModelText,
                      item.min,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                createBaseVNode("div", _hoisted_11, [
                  _cache[2] || (_cache[2] = createBaseVNode("label", null, "Max", -1)),
                  withDirectives(createBaseVNode("input", {
                    type: "number",
                    "onUpdate:modelValue": ($event) => item.max = $event,
                    onChange: ($event) => onSettingsChange(item),
                    class: "setting-input",
                    step: "any"
                  }, null, 40, _hoisted_12), [
                    [
                      vModelText,
                      item.max,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                createBaseVNode("div", _hoisted_13, [
                  _cache[3] || (_cache[3] = createBaseVNode("label", null, "Step", -1)),
                  withDirectives(createBaseVNode("input", {
                    type: "number",
                    "onUpdate:modelValue": ($event) => item.step = $event,
                    onChange: ($event) => onSettingsChange(item),
                    class: "setting-input",
                    min: "0.0001",
                    step: "any"
                  }, null, 40, _hoisted_14), [
                    [
                      vModelText,
                      item.step,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                createBaseVNode("div", _hoisted_15, [
                  _cache[4] || (_cache[4] = createBaseVNode("label", null, "Decimals", -1)),
                  withDirectives(createBaseVNode("input", {
                    type: "number",
                    "onUpdate:modelValue": ($event) => item.decimals = $event,
                    onChange: ($event) => onSettingsChange(item),
                    class: "setting-input",
                    min: "0",
                    max: "10",
                    step: "1"
                  }, null, 40, _hoisted_16), [
                    [
                      vModelText,
                      item.decimals,
                      void 0,
                      { number: true }
                    ]
                  ])
                ])
              ], 2)
            ]);
          }), 128))
        ])
      ]);
    };
  }
});
const FiveDynamicSliders = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-4403a8ab"]]);
const MIN_W = 380, MIN_H = 320;
app.registerExtension({
  name: "Duffy.FiveDynamicSliders.Vue",
  async nodeCreated(node) {
    var _a;
    if (node.comfyClass !== "Duffy_FiveDynamicSliders") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "float_payload");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.hidden = true;
      dataWidget.computeSize = () => [0, 0];
      dataWidget.draw = () => {
      };
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("mousedown", (e) => e.stopPropagation());
    container.addEventListener("mouseup", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    container.addEventListener("dblclick", (e) => e.stopPropagation());
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = app.canvas;
      if (canvas) canvas.processContextMenu(node, e);
    });
    const syncOutputs = (json) => {
      try {
        const data = JSON.parse(json);
        if (!Array.isArray(data)) return;
        for (let i = 0; i < 5; i++) {
          if (node.outputs && node.outputs[i]) {
            const item = data[i];
            const label = (item == null ? void 0 : item.label) || `Slider ${i + 1}`;
            node.outputs[i].name = label;
            node.outputs[i].label = label;
            node.outputs[i].tooltip = label;
          }
        }
        node.setDirtyCanvas(true, true);
      } catch (e) {
      }
    };
    const vueApp = createApp(FiveDynamicSliders, {
      onChange: (json) => {
        if (dataWidget) dataWidget.value = json;
        syncOutputs(json);
      }
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => [
      node.size[0],
      Math.max(180, (node.size[1] || MIN_H) - 140)
    ];
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    node.setSize([MIN_W, MIN_H]);
    if (dataWidget == null ? void 0 : dataWidget.value) {
      instance.deserialise(dataWidget.value);
      syncOutputs(dataWidget.value);
    }
    const origConfigure = node.configure;
    node.configure = function(info) {
      const r = origConfigure ? origConfigure.apply(this, arguments) : void 0;
      if (dataWidget == null ? void 0 : dataWidget.value) {
        instance.deserialise(dataWidget.value);
        syncOutputs(dataWidget.value);
      }
      return r;
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
