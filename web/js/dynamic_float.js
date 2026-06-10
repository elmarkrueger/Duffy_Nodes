import { app } from "../../../scripts/app.js";
import { d as defineComponent, o as openBlock, c as createElementBlock, a as createBaseVNode, F as Fragment, r as renderList, b as ref, w as withDirectives, v as vModelText, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-CusGlrPr.js";
const _hoisted_1 = { class: "dynamic-float-root" };
const _hoisted_2 = { class: "float-list" };
const _hoisted_3 = { class: "float-controls" };
const _hoisted_4 = ["onUpdate:modelValue"];
const _hoisted_5 = { class: "float-weights" };
const _hoisted_6 = { class: "weight-control" };
const _hoisted_7 = ["onUpdate:modelValue"];
const _hoisted_8 = { class: "float-actions" };
const _hoisted_9 = ["onClick"];
const _hoisted_10 = { class: "actions" };
const _hoisted_11 = ["disabled"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "DynamicFloat",
  props: {
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const floatList = ref([]);
    function serialise() {
      const rounded = floatList.value.map((f) => ({
        label: f.label,
        value: Math.round((f.value || 0) * 100) / 100
      }));
      return JSON.stringify(rounded);
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
          floatList.value = data.slice(0, 10).map((i) => ({
            label: i.label || "Float",
            value: typeof i.value === "number" ? Math.round((i.value || 0) * 100) / 100 : 0
          }));
        }
      } catch (e) {
      }
    }
    function emitChange() {
      var _a;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function addFloat() {
      if (floatList.value.length < 10) {
        const newIndex = floatList.value.length + 1;
        floatList.value.push({ label: `Float ${newIndex}`, value: 0 });
        emitChange();
      }
    }
    function removeFloat(index) {
      floatList.value.splice(index, 1);
      emitChange();
    }
    function cleanup() {
    }
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[2] || (_cache[2] = createBaseVNode("div", { class: "header" }, [
          createBaseVNode("h4", null, "Dynamic Float Provider")
        ], -1)),
        createBaseVNode("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(floatList.value, (floatItem, index) => {
            return openBlock(), createElementBlock("div", {
              key: index,
              class: "float-item glass-panel"
            }, [
              createBaseVNode("div", _hoisted_3, [
                _cache[0] || (_cache[0] = createBaseVNode("label", null, "Label", -1)),
                withDirectives(createBaseVNode("input", {
                  type: "text",
                  "onUpdate:modelValue": ($event) => floatItem.label = $event,
                  onChange: emitChange,
                  class: "native-text-input",
                  placeholder: "Value Label"
                }, null, 40, _hoisted_4), [
                  [vModelText, floatItem.label]
                ])
              ]),
              createBaseVNode("div", _hoisted_5, [
                createBaseVNode("div", _hoisted_6, [
                  _cache[1] || (_cache[1] = createBaseVNode("label", null, "Value", -1)),
                  withDirectives(createBaseVNode("input", {
                    type: "number",
                    "onUpdate:modelValue": ($event) => floatItem.value = $event,
                    step: "0.01",
                    onChange: emitChange,
                    class: "native-num-input"
                  }, null, 40, _hoisted_7), [
                    [
                      vModelText,
                      floatItem.value,
                      void 0,
                      { number: true }
                    ]
                  ])
                ])
              ]),
              createBaseVNode("div", _hoisted_8, [
                createBaseVNode("button", {
                  class: "remove-btn",
                  onClick: ($event) => removeFloat(index)
                }, "✕", 8, _hoisted_9)
              ])
            ]);
          }), 128))
        ]),
        createBaseVNode("div", _hoisted_10, [
          createBaseVNode("button", {
            class: "add-btn glass-btn",
            onClick: addFloat,
            disabled: floatList.value.length >= 10
          }, "+ Add Float", 8, _hoisted_11)
        ])
      ]);
    };
  }
});
const DynamicFloat = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-362cd26a"]]);
const MIN_W = 300, MIN_H = 200;
app.registerExtension({
  name: "Duffy.DynamicFloat.Vue",
  async nodeCreated(node) {
    var _a;
    if (node.comfyClass !== "Duffy_DynamicFloat") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "float_payload");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.computeSize = () => [0, -4];
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    container.addEventListener("dblclick", (e) => e.stopPropagation());
    const syncOutputs = (json) => {
      try {
        const data = JSON.parse(json);
        if (!Array.isArray(data)) return;
        const currentOutputCount = node.outputs ? node.outputs.length : 0;
        const targetOutputCount = data.length;
        for (let i = 0; i < targetOutputCount; i++) {
          const label = data[i].label || `Float ${i + 1}`;
          if (i < currentOutputCount) {
            node.outputs[i].name = label;
          } else {
            node.addOutput(label, "FLOAT");
          }
        }
        while (node.outputs && node.outputs.length > targetOutputCount) {
          node.removeOutput(node.outputs.length - 1);
        }
        node.computeSize();
        node.setDirtyCanvas(true, true);
      } catch (e) {
      }
    };
    const vueApp = createApp(DynamicFloat, {
      onChange: (json) => {
        if (dataWidget) dataWidget.value = json;
        syncOutputs(json);
      }
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => [MIN_W, MIN_H];
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
    node.configure = function() {
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
