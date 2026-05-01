import { app } from "../../../scripts/app.js";
import { d as defineComponent, b as openBlock, c as createElementBlock, F as Fragment, r as renderList, t as toDisplayString, h as ref, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-CRnbZd-0.js";
const _hoisted_1 = { class: "show-anything-widget" };
const _hoisted_2 = {
  key: 0,
  class: "items-container"
};
const _hoisted_3 = {
  key: 1,
  class: "empty-state"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ShowAnything",
  setup(__props, { expose: __expose }) {
    const items = ref([]);
    function setValues(newItems) {
      items.value = newItems;
    }
    function cleanup() {
    }
    __expose({ setValues, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        items.value.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(items.value, (item, index) => {
            return openBlock(), createElementBlock("div", {
              key: index,
              class: "item-display"
            }, toDisplayString(item), 1);
          }), 128))
        ])) : (openBlock(), createElementBlock("div", _hoisted_3, " No data to display. Run workflow. "))
      ]);
    };
  }
});
const ShowAnythingWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2db531e1"]]);
app.registerExtension({
  name: "Duffy.ShowAnything.Vue",
  async nodeCreated(node) {
    if (node.comfyClass !== "Duffy_ShowAnything") return;
    const container = document.createElement("div");
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    const vueApp = createApp(ShowAnythingWidget);
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_show_anything", "custom", container, { serialize: false });
    domWidget.computeSize = () => [300, 200];
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(300, size[0]);
      size[1] = Math.max(200, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    const origOnExecuted = node.onExecuted;
    node.onExecuted = function(message) {
      origOnExecuted == null ? void 0 : origOnExecuted.apply(this, arguments);
      if ((message == null ? void 0 : message.text) && Array.isArray(message.text)) {
        instance.setValues(message.text);
      }
    };
    const origConfigure = node.configure;
    node.configure = function(info) {
      var _a;
      origConfigure == null ? void 0 : origConfigure.call(this, info);
      if ((_a = this.widgets_values) == null ? void 0 : _a.length) {
        const vals = this.widgets_values[0];
        if (Array.isArray(vals)) {
          instance.setValues(vals.map(String));
        } else {
          instance.setValues([String(vals)]);
        }
      }
    };
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a;
      (_a = instance.cleanup) == null ? void 0 : _a.call(instance);
      vueApp.unmount();
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
  }
});
