import { app } from "../../../scripts/app.js";
import { d as defineComponent, o as openBlock, c as createElementBlock, a as createBaseVNode, F as Fragment, r as renderList, w as withDirectives, v as vModelText, b as ref, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-CVynLnP5.js";
const _hoisted_1 = { class: "dynamic-integer-root" };
const _hoisted_2 = { class: "int-list" };
const _hoisted_3 = { class: "int-controls" };
const _hoisted_4 = ["onUpdate:modelValue"];
const _hoisted_5 = { class: "int-weights" };
const _hoisted_6 = { class: "weight-control" };
const _hoisted_7 = ["onUpdate:modelValue"];
const _hoisted_8 = { class: "int-actions" };
const _hoisted_9 = ["onClick"];
const _hoisted_10 = { class: "actions" };
const _hoisted_11 = ["disabled"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "DynamicInteger",
  props: {
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const intList = ref([]);
    function serialise() {
      return JSON.stringify(intList.value);
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
          intList.value = data.slice(0, 10).map((i) => ({
            label: i.label || "Int",
            value: typeof i.value === "number" ? i.value : 0
          }));
        }
      } catch (e) {
      }
    }
    function emitChange() {
      var _a;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function addInt() {
      if (intList.value.length < 10) {
        const newIndex = intList.value.length + 1;
        intList.value.push({ label: `Int ${newIndex}`, value: 0 });
        emitChange();
      }
    }
    function removeInt(index) {
      intList.value.splice(index, 1);
      emitChange();
    }
    function cleanup() {
    }
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[2] || (_cache[2] = createBaseVNode("div", { class: "header" }, [
          createBaseVNode("h4", null, "Dynamic Integer Provider")
        ], -1)),
        createBaseVNode("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(intList.value, (intItem, index) => {
            return openBlock(), createElementBlock("div", {
              key: index,
              class: "int-item glass-panel"
            }, [
              createBaseVNode("div", _hoisted_3, [
                _cache[0] || (_cache[0] = createBaseVNode("label", null, "Label", -1)),
                withDirectives(createBaseVNode("input", {
                  type: "text",
                  "onUpdate:modelValue": ($event) => intItem.label = $event,
                  onChange: emitChange,
                  class: "native-text-input",
                  placeholder: "Value Label"
                }, null, 40, _hoisted_4), [
                  [vModelText, intItem.label]
                ])
              ]),
              createBaseVNode("div", _hoisted_5, [
                createBaseVNode("div", _hoisted_6, [
                  _cache[1] || (_cache[1] = createBaseVNode("label", null, "Value", -1)),
                  withDirectives(createBaseVNode("input", {
                    type: "number",
                    "onUpdate:modelValue": ($event) => intItem.value = $event,
                    step: "1",
                    onChange: emitChange,
                    class: "native-num-input"
                  }, null, 40, _hoisted_7), [
                    [
                      vModelText,
                      intItem.value,
                      void 0,
                      { number: true }
                    ]
                  ])
                ])
              ]),
              createBaseVNode("div", _hoisted_8, [
                createBaseVNode("button", {
                  class: "remove-btn",
                  onClick: ($event) => removeInt(index)
                }, "✕", 8, _hoisted_9)
              ])
            ]);
          }), 128))
        ]),
        createBaseVNode("div", _hoisted_10, [
          createBaseVNode("button", {
            class: "add-btn glass-btn",
            onClick: addInt,
            disabled: intList.value.length >= 10
          }, "+ Add Int", 8, _hoisted_11)
        ])
      ]);
    };
  }
});
const DynamicInteger = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a3be626d"]]);
const MIN_W = 300, MIN_H = 200;
app.registerExtension({
  name: "Duffy.DynamicInteger.Vue",
  async nodeCreated(node) {
    var _a;
    if (node.comfyClass !== "Duffy_DynamicInteger") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "int_payload");
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
          const label = data[i].label || `Int ${i + 1}`;
          if (i < currentOutputCount) {
            node.outputs[i].name = label;
          } else {
            node.addOutput(label, "INT");
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
    const vueApp = createApp(DynamicInteger, {
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
