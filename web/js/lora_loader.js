import { app } from "../../../scripts/app.js";
import { d as defineComponent, h as ref, b as openBlock, c as createElementBlock, e as createBaseVNode, t as toDisplayString, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-C_mSG4ak.js";
const _hoisted_1 = { class: "duffy-lora-loader" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "LoraLoader",
  props: {
    onChange: { type: Function },
    options: {},
    initialValue: {}
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const currentValue = ref(props.initialValue || "");
    function openMenu(event) {
      if (typeof LiteGraph !== "undefined" && LiteGraph.ContextMenu) {
        new LiteGraph.ContextMenu(props.options, {
          event,
          title: "Select LoRA",
          className: "dark",
          callback: (value) => {
            var _a;
            if (typeof value === "string") {
              currentValue.value = value;
              (_a = props.onChange) == null ? void 0 : _a.call(props, value);
            }
          }
        });
      }
    }
    function deserialise(val) {
      currentValue.value = val;
    }
    function serialise() {
      return currentValue.value;
    }
    __expose({ deserialise, serialise });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("button", {
          onClick: openMenu,
          class: "lora-btn"
        }, "📂 " + toDisplayString(currentValue.value || "Select LoRA..."), 1)
      ]);
    };
  }
});
const LoraLoaderWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-baf4f2eb"]]);
app.registerExtension({
  name: "Duffy.LoraLoader.Vue",
  async nodeCreated(node) {
    var _a, _b;
    if (node.comfyClass !== "Duffy_LoraLoader") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "lora_name");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.computeSize = () => [0, -4];
    } else {
      return;
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; box-sizing:border-box; overflow:visible;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = app.canvas;
      if (canvas) canvas.processContextMenu(node, e);
    });
    const options = Array.isArray(dataWidget.options) ? dataWidget.options : ((_b = dataWidget.options) == null ? void 0 : _b.values) || [];
    const vueApp = createApp(LoraLoaderWidget, {
      options,
      initialValue: dataWidget.value,
      onChange: (val) => {
        dataWidget.value = val;
        node.setDirtyCanvas(true, true);
      }
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => [node.size ? Math.max(300, node.size[0]) : 300, 40];
    const MIN_W = 340, MIN_H = 180;
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize == null ? void 0 : origOnResize.apply(this, arguments);
    };
    if (dataWidget == null ? void 0 : dataWidget.value) instance.deserialise(dataWidget.value);
    const origCallback = dataWidget.callback;
    dataWidget.callback = function(val) {
      instance.deserialise(val);
      if (origCallback) origCallback.apply(this, arguments);
    };
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      vueApp.unmount();
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
  }
});
