import { app } from "../../../scripts/app.js";
import { d as defineComponent, b as openBlock, c as createElementBlock, F as Fragment, r as renderList, t as toDisplayString, h as ref, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-u6YluKsh.js";
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
(function() {
  "use strict";
  try {
    if (typeof document != "undefined") {
      var elementStyle = document.createElement("style");
      elementStyle.appendChild(document.createTextNode(`.interactive-relight-root[data-v-3aa67706] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 600px;\r
  background: #1a1a1a;\r
  color: #e0e0e0;\r
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\r
  box-sizing: border-box;\r
  border-radius: 8px;\r
  overflow: hidden;\r
  border: 1px solid #333;
}
.canvas-container[data-v-3aa67706] {\r
  flex: 1;\r
  background: #000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;\r
  position: relative;\r
  min-height: 300px;
}
canvas[data-v-3aa67706] {\r
  max-width: 100%;\r
  max-height: 100%;\r
  object-fit: contain;\r
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
}
.controls-panel[data-v-3aa67706] {\r
  height: 280px;\r
  padding: 16px;\r
  background: #252525;\r
  border-top: 1px solid #333;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 12px;
}
.panel-header[data-v-3aa67706] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;
}
.panel-header h4[data-v-3aa67706] {\r
  margin: 0;\r
  font-size: 16px;\r
  color: #fff;\r
  letter-spacing: 0.5px;
}
.lights-scroll-area[data-v-3aa67706] {\r
  flex: 1;\r
  overflow-x: auto;\r
  overflow-y: hidden;\r
  display: flex;\r
  gap: 12px;\r
  padding-bottom: 8px;
}\r
\r
/* Custom Scrollbar */
.lights-scroll-area[data-v-3aa67706]::-webkit-scrollbar {\r
  height: 6px;
}
.lights-scroll-area[data-v-3aa67706]::-webkit-scrollbar-track {\r
  background: #1a1a1a;
}
.lights-scroll-area[data-v-3aa67706]::-webkit-scrollbar-thumb {\r
  background: #444;\r
  border-radius: 3px;
}
.lights-scroll-area[data-v-3aa67706]::-webkit-scrollbar-thumb:hover {\r
  background: #555;
}
.light-item[data-v-3aa67706] {\r
  min-width: 220px;\r
  background: #323232;\r
  padding: 12px;\r
  border-radius: 6px;\r
  font-size: 12px;\r
  border: 1px solid #444;\r
  transition: border-color 0.2s;
}
.light-item[data-v-3aa67706]:hover {\r
  border-color: #555;
}
.light-header[data-v-3aa67706] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  margin-bottom: 10px;\r
  font-weight: 600;\r
  border-bottom: 1px solid #444;\r
  padding-bottom: 6px;
}
.light-controls-grid[data-v-3aa67706] {\r
  display: grid;\r
  grid-template-columns: 1fr;\r
  gap: 8px;
}
.control-row[data-v-3aa67706] {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;
}
.control-row label[data-v-3aa67706] {\r
  flex: 0 0 70px;\r
  color: #aaa;
}
.control-row input[data-v-3aa67706], .control-row select[data-v-3aa67706] {\r
  flex: 1;\r
  background: #1a1a1a;\r
  color: #fff;\r
  border: 1px solid #444;\r
  border-radius: 3px;\r
  padding: 2px 4px;
}
.control-row input[type="range"][data-v-3aa67706] {\r
  height: 4px;\r
  appearance: none;\r
  background: #444;\r
  outline: none;\r
  border-radius: 2px;
}
.control-row input[type="range"][data-v-3aa67706]::-webkit-slider-thumb {\r
  appearance: none;\r
  width: 12px;\r
  height: 12px;\r
  background: #278;\r
  border-radius: 50%;\r
  cursor: pointer;
}
.footer-actions[data-v-3aa67706] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  gap: 16px;
}
.add-buttons[data-v-3aa67706] {\r
  display: flex;\r
  gap: 8px;
}
.btn[data-v-3aa67706] {\r
  background: #3a3a3a;\r
  color: #fff;\r
  border: 1px solid #555;\r
  border-radius: 4px;\r
  padding: 6px 12px;\r
  cursor: pointer;\r
  font-size: 13px;\r
  transition: all 0.2s;\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;
}
.btn[data-v-3aa67706]:hover {\r
  background: #4a4a4a;\r
  border-color: #666;
}
.btn-danger[data-v-3aa67706] {\r
  background: #622;\r
  border-color: #833;\r
  padding: 2px 6px;\r
  font-size: 11px;
}
.btn-danger[data-v-3aa67706]:hover {\r
  background: #833;
}
.btn-primary[data-v-3aa67706] {\r
  background: #165;\r
  border-color: #286;\r
  font-weight: 600;\r
  padding: 8px 24px;\r
  font-size: 14px;\r
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.btn-primary[data-v-3aa67706]:hover {\r
  background: #286;\r
  transform: translateY(-1px);\r
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}
.idle-state[data-v-3aa67706] {\r
  height: 600px;\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  background: #111;\r
  color: #666;\r
  gap: 12px;
}
.pulse[data-v-3aa67706] {\r
  width: 12px;\r
  height: 12px;\r
  background: #379;\r
  border-radius: 50%;\r
  animation: pulse-animation-3aa67706 2s infinite;
}
@keyframes pulse-animation-3aa67706 {
0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7);
}
70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0);
}
100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0);
}
}\r

.layer-control-root[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 100%;\r
  padding: 16px;\r
  color: #f1ecdf;\r
  background:\r
    radial-gradient(circle at top left, rgba(224, 123, 43, 0.22), transparent 34%),\r
    linear-gradient(180deg, #171a1f 0%, #0f1218 100%);\r
  border-radius: 18px;\r
  box-sizing: border-box;\r
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;\r
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.layer-header[data-v-a197c0be] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: flex-start;\r
  gap: 16px;\r
  margin-bottom: 14px;
}
.layer-header h3[data-v-a197c0be] {\r
  margin: 0;\r
  font-size: 22px;\r
  letter-spacing: 0.04em;
}
.layer-header p[data-v-a197c0be] {\r
  margin: 6px 0 0;\r
  max-width: 720px;\r
  color: #c7c0b2;\r
  font-size: 13px;
}
.apply-button[data-v-a197c0be] {\r
  min-width: 180px;\r
  height: 42px;\r
  padding: 0 18px;\r
  color: #fff6eb;\r
  background: linear-gradient(180deg, #dd7a31, #a8481a);\r
  border: 1px solid rgba(255, 240, 220, 0.28);\r
  border-radius: 12px;\r
  cursor: pointer;\r
  font-weight: 700;\r
  letter-spacing: 0.04em;
}
.workspace-grid[data-v-a197c0be] {\r
  display: grid;\r
  grid-template-columns: minmax(0, 1.75fr) minmax(320px, 0.95fr);\r
  gap: 14px;\r
  min-height: 0;\r
  flex: 1;
}
.canvas-shell[data-v-a197c0be],\r
.sidebar-card[data-v-a197c0be] {\r
  background: rgba(25, 28, 34, 0.92);\r
  border: 1px solid rgba(255, 255, 255, 0.06);\r
  border-radius: 16px;\r
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.canvas-shell[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  min-height: 0;\r
  overflow: hidden;
}
.canvas-meta[data-v-a197c0be] {\r
  display: flex;\r
  justify-content: space-between;\r
  padding: 12px 14px;\r
  font-size: 12px;\r
  text-transform: uppercase;\r
  letter-spacing: 0.06em;\r
  color: #d7cab5;\r
  background: rgba(255, 255, 255, 0.03);
}
.canvas-stage[data-v-a197c0be] {\r
  flex: 1;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  min-height: 0;\r
  padding: 16px;\r
  overflow: hidden;\r
  background:\r
    linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%),\r
    linear-gradient(-45deg, rgba(255,255,255,0.03) 25%, transparent 25%),\r
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.03) 75%),\r
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.03) 75%);\r
  background-size: 24px 24px;\r
  background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
}
.canvas-stage canvas[data-v-a197c0be] {\r
  border-radius: 10px;\r
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45);
}
[data-v-a197c0be] .canvas-container {\r
  flex-shrink: 0;\r
  margin: auto;
}
.sidebar[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 14px;\r
  min-height: 0;\r
  padding-bottom: 16px;
}
.sidebar-card[data-v-a197c0be] {\r
  padding: 14px;
}
.card-title-row[data-v-a197c0be] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: baseline;\r
  gap: 8px;\r
  margin-bottom: 12px;
}
.card-title-row h4[data-v-a197c0be] {\r
  margin: 0;\r
  font-size: 15px;\r
  letter-spacing: 0.04em;
}
.card-kicker[data-v-a197c0be] {\r
  color: #9eaaba;\r
  font-size: 11px;\r
  text-transform: uppercase;\r
  letter-spacing: 0.06em;
}
.layer-list[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 8px;
}
.layer-item[data-v-a197c0be] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  gap: 10px;\r
  width: 100%;\r
  padding: 10px 12px;\r
  color: inherit;\r
  background: linear-gradient(180deg, rgba(62, 67, 75, 0.72), rgba(43, 47, 53, 0.72));\r
  border: 1px solid rgba(255, 255, 255, 0.08);\r
  border-radius: 12px;\r
  cursor: pointer;\r
  text-align: left;
}
.layer-item.selected[data-v-a197c0be] {\r
  border-color: rgba(233, 149, 79, 0.72);\r
  box-shadow: inset 0 0 0 1px rgba(233, 149, 79, 0.3);
}
.layer-item strong[data-v-a197c0be],\r
.layer-item small[data-v-a197c0be] {\r
  display: block;
}
.layer-item small[data-v-a197c0be] {\r
  margin-top: 3px;\r
  color: #a8b3c3;
}
.visibility-toggle[data-v-a197c0be] {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 8px;\r
  font-size: 11px;\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
  color: #d2d9e3;
}
.field-grid[data-v-a197c0be] {\r
  display: grid;\r
  gap: 10px;
}
.field-grid.two-col[data-v-a197c0be] {\r
  grid-template-columns: repeat(2, minmax(0, 1fr));\r
  margin-bottom: 12px;
}
.field-grid label[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 6px;\r
  font-size: 11px;\r
  text-transform: uppercase;\r
  letter-spacing: 0.06em;\r
  color: #cfd8e3;
}
.field-grid input[data-v-a197c0be] {\r
  width: 100%;\r
  box-sizing: border-box;
}
input[type="number"][data-v-a197c0be],\r
input[type="range"][data-v-a197c0be] {\r
  accent-color: #d97833;
}
input[type="number"][data-v-a197c0be] {\r
  padding: 8px 10px;\r
  color: #f4efe7;\r
  background: #11141a;\r
  border: 1px solid rgba(255, 255, 255, 0.09);\r
  border-radius: 10px;
}
.button-grid[data-v-a197c0be] {\r
  display: grid;\r
  grid-template-columns: repeat(2, minmax(0, 1fr));\r
  gap: 8px;\r
  margin-top: 14px;
}
.button-grid button[data-v-a197c0be],\r
.apply-button[data-v-a197c0be] {\r
  transition: transform 0.18s ease, filter 0.18s ease;
}
.button-grid button[data-v-a197c0be] {\r
  min-height: 38px;\r
  padding: 0 12px;\r
  color: #fff4e5;\r
  background: linear-gradient(180deg, #464c55, #343941);\r
  border: 1px solid rgba(255, 255, 255, 0.08);\r
  border-radius: 10px;\r
  cursor: pointer;\r
  font-weight: 600;
}
.button-grid button.danger[data-v-a197c0be] {\r
  background: linear-gradient(180deg, #82473d, #633129);
}
.button-grid button[data-v-a197c0be]:hover,\r
.apply-button[data-v-a197c0be]:hover {\r
  filter: brightness(1.06);\r
  transform: translateY(-1px);
}
.empty-card[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  justify-content: center;\r
  min-height: 180px;
}
.empty-card h4[data-v-a197c0be],\r
.empty-card p[data-v-a197c0be] {\r
  margin: 0;
}
.empty-card p[data-v-a197c0be] {\r
  margin-top: 8px;\r
  color: #b0b7c0;\r
  line-height: 1.5;
}
.idle-state[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  gap: 10px;\r
  width: 100%;\r
  height: 720px;\r
  color: #d7d0c3;\r
  background:\r
    radial-gradient(circle at center, rgba(223, 121, 51, 0.12), transparent 38%),\r
    linear-gradient(180deg, #16191e 0%, #101318 100%);\r
  border-radius: 18px;
}
.idle-state p[data-v-a197c0be],\r
.idle-state small[data-v-a197c0be] {\r
  margin: 0;
}
.pulse[data-v-a197c0be] {\r
  width: 14px;\r
  height: 14px;\r
  border-radius: 999px;\r
  background: #df7f2f;\r
  box-shadow: 0 0 0 0 rgba(223, 127, 47, 0.55);\r
  animation: pulse-a197c0be 1.8s infinite;
}
@keyframes pulse-a197c0be {
0% {\r
    box-shadow: 0 0 0 0 rgba(223, 127, 47, 0.55);
}
70% {\r
    box-shadow: 0 0 0 14px rgba(223, 127, 47, 0);
}
100% {\r
    box-shadow: 0 0 0 0 rgba(223, 127, 47, 0);
}
}
@media (max-width: 1100px) {
.workspace-grid[data-v-a197c0be] {\r
    grid-template-columns: 1fr;
}
.layer-control-root[data-v-a197c0be] {\r
    height: auto;\r
    min-height: 720px;
}
.canvas-shell[data-v-a197c0be] {\r
    min-height: 420px;
}
}\r

.advanced-adjuster-root[data-v-69d000bf] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 600px;\r
  background: #1a1a1a;\r
  color: #e0e0e0;\r
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\r
  box-sizing: border-box;\r
  border-radius: 8px;\r
  overflow: hidden;\r
  border: 1px solid #333;
}
.preview-container[data-v-69d000bf] {\r
  flex: 1;\r
  background: #000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;\r
  position: relative;\r
  min-height: 300px;
}
.preview-image[data-v-69d000bf] {\r
  max-width: 100%;\r
  max-height: 100%;\r
  object-fit: contain;\r
  box-shadow: 0 0 20px rgba(0,0,0,0.8);\r
  transition: filter 0.1s;
}
.controls-panel[data-v-69d000bf] {\r
  padding: 16px;\r
  background: #252525;\r
  border-top: 1px solid #333;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 16px;
}
.panel-header[data-v-69d000bf] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;
}
.panel-header h4[data-v-69d000bf] {\r
  margin: 0;\r
  font-size: 16px;\r
  color: #fff;\r
  letter-spacing: 0.5px;
}
.adjustments-area[data-v-69d000bf] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 12px;
}
.control-row[data-v-69d000bf] {\r
  display: flex;\r
  align-items: center;\r
  gap: 16px;\r
  background: #323232;\r
  padding: 8px 12px;\r
  border-radius: 6px;\r
  border: 1px solid #444;
}
.label-col[data-v-69d000bf] {\r
  width: 120px;\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;
}
.label-col label[data-v-69d000bf] {\r
  color: #aaa;\r
  font-size: 13px;\r
  font-weight: 500;
}
.label-col .val[data-v-69d000bf] {\r
  color: #fff;\r
  font-family: monospace;\r
  font-size: 12px;\r
  background: #1a1a1a;\r
  padding: 2px 6px;\r
  border-radius: 3px;\r
  min-width: 36px;\r
  text-align: right;
}
.control-row input[type="range"][data-v-69d000bf] {\r
  flex: 1;\r
  height: 6px;\r
  appearance: none;\r
  background: #1a1a1a;\r
  outline: none;\r
  border-radius: 3px;\r
  border: 1px solid #444;
}
.control-row input[type="range"][data-v-69d000bf]::-webkit-slider-thumb {\r
  appearance: none;\r
  width: 16px;\r
  height: 16px;\r
  background: #379;\r
  border-radius: 50%;\r
  cursor: pointer;\r
  border: 2px solid #fff;\r
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
.control-row input[type="range"][data-v-69d000bf]::-webkit-slider-thumb:hover {\r
  background: #48a;\r
  transform: scale(1.1);
}
.reset-row[data-v-69d000bf] {\r
  display: flex;\r
  justify-content: flex-end;\r
  margin-top: 4px;
}
.btn[data-v-69d000bf] {\r
  background: #3a3a3a;\r
  color: #fff;\r
  border: 1px solid #555;\r
  border-radius: 4px;\r
  padding: 6px 12px;\r
  cursor: pointer;\r
  font-size: 13px;\r
  transition: all 0.2s;
}
.btn[data-v-69d000bf]:hover {\r
  background: #4a4a4a;\r
  border-color: #666;
}
.btn-secondary[data-v-69d000bf] {\r
  background: #444;\r
  border-color: #555;\r
  font-size: 12px;\r
  padding: 4px 10px;
}
.btn-secondary[data-v-69d000bf]:hover {\r
  background: #555;\r
  border-color: #777;
}
.btn-primary[data-v-69d000bf] {\r
  background: #165;\r
  border-color: #286;\r
  font-weight: 600;\r
  padding: 8px 24px;\r
  font-size: 14px;\r
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.btn-primary[data-v-69d000bf]:hover {\r
  background: #286;\r
  transform: translateY(-1px);\r
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}
.idle-state[data-v-69d000bf] {\r
  height: 600px;\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  background: #111;\r
  color: #666;\r
  gap: 12px;
}
.pulse[data-v-69d000bf] {\r
  width: 12px;\r
  height: 12px;\r
  background: #379;\r
  border-radius: 50%;\r
  animation: pulse-animation-69d000bf 2s infinite;
}
@keyframes pulse-animation-69d000bf {
0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7);
}
70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0);
}
100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0);
}
}\r

.advanced-text-overlay-root[data-v-cf15eb50] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 700px;\r
  background: #1a1a1a;\r
  color: #e0e0e0;\r
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\r
  box-sizing: border-box;\r
  border-radius: 8px;\r
  overflow: hidden;\r
  border: 1px solid #333;
}
.canvas-container[data-v-cf15eb50] {\r
  flex: 1;\r
  background: #000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;\r
  position: relative;\r
  min-height: 200px;
}
canvas[data-v-cf15eb50] {\r
  max-width: 100%;\r
  max-height: 100%;\r
  object-fit: contain;\r
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
}
.controls-panel[data-v-cf15eb50] {\r
  height: 340px;\r
  padding: 16px;\r
  background: #252525;\r
  border-top: 1px solid #333;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 12px;
}
.panel-header[data-v-cf15eb50] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;
}
.panel-header h4[data-v-cf15eb50] {\r
  margin: 0;\r
  font-size: 16px;\r
  color: #fff;\r
  letter-spacing: 0.5px;
}
.overlays-scroll-area[data-v-cf15eb50] {\r
  flex: 1;\r
  overflow-x: auto;\r
  overflow-y: auto;\r
  display: flex;\r
  gap: 12px;\r
  padding-bottom: 8px;
}
.overlays-scroll-area[data-v-cf15eb50]::-webkit-scrollbar {\r
  height: 6px;
}
.overlays-scroll-area[data-v-cf15eb50]::-webkit-scrollbar-track {\r
  background: #1a1a1a;
}
.overlays-scroll-area[data-v-cf15eb50]::-webkit-scrollbar-thumb {\r
  background: #444;\r
  border-radius: 3px;
}
.overlays-scroll-area[data-v-cf15eb50]::-webkit-scrollbar-thumb:hover {\r
  background: #555;
}
.overlay-item[data-v-cf15eb50] {\r
  min-width: 240px;\r
  background: #323232;\r
  padding: 12px;\r
  border-radius: 6px;\r
  font-size: 12px;\r
  border: 1px solid #444;\r
  transition: border-color 0.2s;
}
.overlay-item[data-v-cf15eb50]:hover {\r
  border-color: #555;
}
.overlay-header[data-v-cf15eb50] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  margin-bottom: 10px;\r
  font-weight: 600;\r
  border-bottom: 1px solid #444;\r
  padding-bottom: 6px;
}
.overlay-controls-grid[data-v-cf15eb50] {\r
  display: grid;\r
  grid-template-columns: 1fr;\r
  gap: 8px;
}
.control-row[data-v-cf15eb50] {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;
}
.control-row label[data-v-cf15eb50] {\r
  flex: 0 0 50px;\r
  color: #aaa;
}
.control-row input[data-v-cf15eb50], .control-row select[data-v-cf15eb50] {\r
  flex: 1;\r
  background: #1a1a1a;\r
  color: #fff;\r
  border: 1px solid #444;\r
  border-radius: 3px;\r
  padding: 4px;
}
.control-row input[type="range"][data-v-cf15eb50] {\r
  height: 4px;\r
  appearance: none;\r
  background: #444;\r
  outline: none;\r
  border-radius: 2px;\r
  padding: 0;
}
.control-row input[type="range"][data-v-cf15eb50]::-webkit-slider-thumb {\r
  appearance: none;\r
  width: 12px;\r
  height: 12px;\r
  background: #278;\r
  border-radius: 50%;\r
  cursor: pointer;
}
.control-row input[type="color"][data-v-cf15eb50] {\r
  padding: 0;\r
  height: 24px;
}
.footer-actions[data-v-cf15eb50] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  gap: 16px;
}
.btn[data-v-cf15eb50] {\r
  background: #3a3a3a;\r
  color: #fff;\r
  border: 1px solid #555;\r
  border-radius: 4px;\r
  padding: 6px 12px;\r
  cursor: pointer;\r
  font-size: 13px;\r
  transition: all 0.2s;\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;
}
.btn[data-v-cf15eb50]:hover {\r
  background: #4a4a4a;\r
  border-color: #666;
}
.btn-danger[data-v-cf15eb50] {\r
  background: #622;\r
  border-color: #833;\r
  padding: 2px 6px;\r
  font-size: 11px;
}
.btn-danger[data-v-cf15eb50]:hover {\r
  background: #833;
}
.btn-primary[data-v-cf15eb50] {\r
  background: #165;\r
  border-color: #286;\r
  font-weight: 600;\r
  padding: 8px 24px;\r
  font-size: 14px;\r
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.btn-primary[data-v-cf15eb50]:hover {\r
  background: #286;\r
  transform: translateY(-1px);\r
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}
.idle-state[data-v-cf15eb50] {\r
  height: 600px;\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  background: #111;\r
  color: #666;\r
  gap: 12px;
}
.pulse[data-v-cf15eb50] {\r
  width: 12px;\r
  height: 12px;\r
  background: #379;\r
  border-radius: 50%;\r
  animation: pulse-animation-cf15eb50 2s infinite;
}
@keyframes pulse-animation-cf15eb50 {
0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7);
}
70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0);
}
100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0);
}
}\r

.advanced-stitch-root[data-v-d59fd744] {\r
  display: flex;\r
  flex-direction: row;\r
  width: 100%;\r
  height: 640px;\r
  background: #1a1a1a;\r
  color: #e0e0e0;\r
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\r
  box-sizing: border-box;\r
  border-radius: 8px;\r
  overflow: hidden;\r
  border: 1px solid #333;
}
.preview-container[data-v-d59fd744] {\r
  flex: 1;\r
  background: #000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;\r
  position: relative;\r
  padding: 16px;
}
.preview-layout[data-v-d59fd744] {\r
  display: flex;\r
  max-width: 100%;\r
  max-height: 100%;\r
  border: 1px dashed #444;\r
  background: rgba(255,255,255,0.02);
}
.layout-horizontal[data-v-d59fd744] {\r
  flex-direction: row;\r
  align-items: stretch;
}
.layout-horizontal img[data-v-d59fd744] {\r
  height: 100%;\r
  width: auto;\r
  object-fit: contain;
}
.layout-vertical[data-v-d59fd744] {\r
  flex-direction: column;\r
  align-items: center;
}
.layout-vertical img[data-v-d59fd744] {\r
  width: 100%;\r
  height: auto;\r
  object-fit: contain;
}
.layout-grid[data-v-d59fd744] {\r
  display: grid;\r
  grid-template-columns: repeat(3, 1fr);\r
  grid-template-rows: repeat(3, 1fr);\r
  gap: 2px;\r
  background: #222;\r
  aspect-ratio: 1;\r
  height: 100%;\r
  max-height: 100%;
}
.preview-cell[data-v-d59fd744] {\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;
}
.grid-cell[data-v-d59fd744] {\r
  background: #000;
}
.grid-cell img[data-v-d59fd744] {\r
  width: 100%;\r
  height: 100%;\r
  object-fit: cover;
}
.controls-panel[data-v-d59fd744] {\r
  width: 320px;\r
  background: #252525;\r
  border-left: 1px solid #333;\r
  display: flex;\r
  flex-direction: column;
}
.panel-header[data-v-d59fd744] {\r
  padding: 16px;\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  border-bottom: 1px solid #333;\r
  flex-direction: column;\r
  gap: 12px;\r
  align-items: flex-start;
}
.panel-header h4[data-v-d59fd744] {\r
  margin: 0;\r
  font-size: 16px;\r
  color: #fff;\r
  letter-spacing: 0.5px;
}
.controls-body[data-v-d59fd744] {\r
  padding: 16px;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 16px;\r
  overflow-y: auto;
}
.control-row[data-v-d59fd744] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 8px;
}
.control-row label[data-v-d59fd744] {\r
  color: #aaa;\r
  font-size: 13px;\r
  font-weight: 500;
}
select[data-v-d59fd744] {\r
  background: #1a1a1a;\r
  color: #fff;\r
  border: 1px solid #444;\r
  border-radius: 4px;\r
  padding: 6px 8px;\r
  outline: none;\r
  font-size: 13px;
}
.section-subtitle[data-v-d59fd744] {\r
  font-size: 13px;\r
  color: #888;\r
  margin: 0 0 12px 0;\r
  border-bottom: 1px solid #333;\r
  padding-bottom: 4px;
}
.grid-controls[data-v-d59fd744] {\r
  display: flex;\r
  flex-direction: column;
}
.mapping-grid[data-v-d59fd744] {\r
  display: grid;\r
  grid-template-columns: repeat(3, 1fr);\r
  gap: 8px;
}
.mapping-cell[data-v-d59fd744] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 4px;\r
  background: #323232;\r
  padding: 6px;\r
  border-radius: 4px;\r
  border: 1px solid #444;
}
.mapping-cell label[data-v-d59fd744] {\r
  font-size: 11px;\r
  color: #aaa;\r
  text-align: center;
}
.mapping-cell select[data-v-d59fd744] {\r
  font-size: 11px;\r
  padding: 2px 4px;
}
.info-text[data-v-d59fd744] {\r
  font-size: 13px;\r
  color: #aaa;\r
  line-height: 1.4;\r
  background: #323232;\r
  padding: 12px;\r
  border-radius: 6px;\r
  border: 1px solid #444;
}
.btn-primary[data-v-d59fd744] {\r
  width: 100%;\r
  background: #165;\r
  color: #fff;\r
  border: 1px solid #286;\r
  border-radius: 4px;\r
  padding: 10px;\r
  font-weight: 600;\r
  font-size: 14px;\r
  cursor: pointer;\r
  transition: all 0.2s;\r
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.btn-primary[data-v-d59fd744]:hover {\r
  background: #286;\r
  transform: translateY(-1px);\r
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}
.idle-state[data-v-d59fd744] {\r
  height: 640px;\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  background: #111;\r
  color: #666;\r
  gap: 12px;
}
.pulse[data-v-d59fd744] {\r
  width: 12px;\r
  height: 12px;\r
  background: #379;\r
  border-radius: 50%;\r
  animation: pulse-animation-d59fd744 2s infinite;
}
@keyframes pulse-animation-d59fd744 {
0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7);
}
70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0);
}
100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0);
}
}\r

.duffy-lora-loader[data-v-baf4f2eb] {\r
  padding: 4px;\r
  width: 100%;\r
  box-sizing: border-box;
}
.lora-btn[data-v-baf4f2eb] {\r
  width: 100%;\r
  background: var(--comfy-input-bg, #222);\r
  color: var(--comfy-input-text, #ddd);\r
  border: 1px solid var(--comfy-border, #444);\r
  padding: 6px 10px;\r
  cursor: pointer;\r
  border-radius: 4px;\r
  text-align: left;\r
  font-family: inherit;\r
  font-size: 12px;\r
  overflow: hidden;\r
  text-overflow: ellipsis;\r
  white-space: nowrap;
}
.lora-btn[data-v-baf4f2eb]:hover {\r
  background: var(--comfy-hover-bg, #333);
}\r

.prompt-box-root[data-v-e0c93561] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 100%;\r
  padding: 8px;\r
  background: var(--comfy-menu-bg, #222);\r
  color: var(--comfy-text-normal, #ddd);\r
  border-radius: 6px;\r
  box-sizing: border-box;
}
.header[data-v-e0c93561] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  margin-bottom: 8px;
}
h4[data-v-e0c93561] {\r
  margin: 0;\r
  font-size: 14px;
}
.actions button[data-v-e0c93561] {\r
  margin-left: 4px;\r
  padding: 2px 6px;\r
  background: var(--comfy-input-bg, #333);\r
  color: var(--comfy-text-normal, #ddd);\r
  border: 1px solid var(--comfy-input-border, #444);\r
  border-radius: 4px;\r
  cursor: pointer;
}
.actions button[data-v-e0c93561]:hover {\r
  background: var(--comfy-input-hover, #444);
}
.actions button.btn-feedback[data-v-e0c93561] {\r
  background: rgba(76, 175, 80, 0.35);\r
  border-color: rgba(76, 175, 80, 0.6);\r
  color: #a5d6a7;\r
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.font-size-row[data-v-e0c93561] {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  margin-bottom: 6px;
}
.font-size-row label[data-v-e0c93561] {\r
  font-size: 12px;\r
  white-space: nowrap;
}
.font-size-row input[type="range"][data-v-e0c93561] {\r
  flex: 1;\r
  cursor: pointer;
}
.font-size-val[data-v-e0c93561] {\r
  font-size: 12px;\r
  min-width: 36px;\r
  text-align: right;
}
.prompt-textarea[data-v-e0c93561] {\r
  flex-grow: 1;\r
  width: 100%;\r
  resize: none;\r
  background: var(--comfy-input-bg, #111);\r
  color: var(--comfy-text-normal, #eee);\r
  border: 1px solid var(--comfy-input-border, #333);\r
  border-radius: 4px;\r
  padding: 8px;\r
  font-family: inherit;\r
  box-sizing: border-box;
}\r
/*!
 * Cropper.js v1.6.2
 * https://fengyuanchen.github.io/cropperjs
 *
 * Copyright 2015-present Chen Fengyuan
 * Released under the MIT license
 *
 * Date: 2024-04-21T07:43:02.731Z
 */

.cropper-container {
  direction: ltr;
  font-size: 0;
  line-height: 0;
  position: relative;
  -ms-touch-action: none;
      touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
     -moz-user-select: none;
      -ms-user-select: none;
          user-select: none;
}

.cropper-container img {
    backface-visibility: hidden;
    display: block;
    height: 100%;
    image-orientation: 0deg;
    max-height: none !important;
    max-width: none !important;
    min-height: 0 !important;
    min-width: 0 !important;
    width: 100%;
  }

.cropper-wrap-box,
.cropper-canvas,
.cropper-drag-box,
.cropper-crop-box,
.cropper-modal {
  bottom: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.cropper-wrap-box,
.cropper-canvas {
  overflow: hidden;
}

.cropper-drag-box {
  background-color: #fff;
  opacity: 0;
}

.cropper-modal {
  background-color: #000;
  opacity: 0.5;
}

.cropper-view-box {
  display: block;
  height: 100%;
  outline: 1px solid #39f;
  outline-color: rgba(51, 153, 255, 0.75);
  overflow: hidden;
  width: 100%;
}

.cropper-dashed {
  border: 0 dashed #eee;
  display: block;
  opacity: 0.5;
  position: absolute;
}

.cropper-dashed.dashed-h {
    border-bottom-width: 1px;
    border-top-width: 1px;
    height: calc(100% / 3);
    left: 0;
    top: calc(100% / 3);
    width: 100%;
  }

.cropper-dashed.dashed-v {
    border-left-width: 1px;
    border-right-width: 1px;
    height: 100%;
    left: calc(100% / 3);
    top: 0;
    width: calc(100% / 3);
  }

.cropper-center {
  display: block;
  height: 0;
  left: 50%;
  opacity: 0.75;
  position: absolute;
  top: 50%;
  width: 0;
}

.cropper-center::before,
  .cropper-center::after {
    background-color: #eee;
    content: ' ';
    display: block;
    position: absolute;
  }

.cropper-center::before {
    height: 1px;
    left: -3px;
    top: 0;
    width: 7px;
  }

.cropper-center::after {
    height: 7px;
    left: 0;
    top: -3px;
    width: 1px;
  }

.cropper-face,
.cropper-line,
.cropper-point {
  display: block;
  height: 100%;
  opacity: 0.1;
  position: absolute;
  width: 100%;
}

.cropper-face {
  background-color: #fff;
  left: 0;
  top: 0;
}

.cropper-line {
  background-color: #39f;
}

.cropper-line.line-e {
    cursor: ew-resize;
    right: -3px;
    top: 0;
    width: 5px;
  }

.cropper-line.line-n {
    cursor: ns-resize;
    height: 5px;
    left: 0;
    top: -3px;
  }

.cropper-line.line-w {
    cursor: ew-resize;
    left: -3px;
    top: 0;
    width: 5px;
  }

.cropper-line.line-s {
    bottom: -3px;
    cursor: ns-resize;
    height: 5px;
    left: 0;
  }

.cropper-point {
  background-color: #39f;
  height: 5px;
  opacity: 0.75;
  width: 5px;
}

.cropper-point.point-e {
    cursor: ew-resize;
    margin-top: -3px;
    right: -3px;
    top: 50%;
  }

.cropper-point.point-n {
    cursor: ns-resize;
    left: 50%;
    margin-left: -3px;
    top: -3px;
  }

.cropper-point.point-w {
    cursor: ew-resize;
    left: -3px;
    margin-top: -3px;
    top: 50%;
  }

.cropper-point.point-s {
    bottom: -3px;
    cursor: s-resize;
    left: 50%;
    margin-left: -3px;
  }

.cropper-point.point-ne {
    cursor: nesw-resize;
    right: -3px;
    top: -3px;
  }

.cropper-point.point-nw {
    cursor: nwse-resize;
    left: -3px;
    top: -3px;
  }

.cropper-point.point-sw {
    bottom: -3px;
    cursor: nesw-resize;
    left: -3px;
  }

.cropper-point.point-se {
    bottom: -3px;
    cursor: nwse-resize;
    height: 20px;
    opacity: 1;
    right: -3px;
    width: 20px;
  }

@media (min-width: 768px) {

.cropper-point.point-se {
      height: 15px;
      width: 15px;
  }
    }

@media (min-width: 992px) {

.cropper-point.point-se {
      height: 10px;
      width: 10px;
  }
    }

@media (min-width: 1200px) {

.cropper-point.point-se {
      height: 5px;
      opacity: 0.75;
      width: 5px;
  }
    }

.cropper-point.point-se::before {
    background-color: #39f;
    bottom: -50%;
    content: ' ';
    display: block;
    height: 200%;
    opacity: 0;
    position: absolute;
    right: -50%;
    width: 200%;
  }

.cropper-invisible {
  opacity: 0;
}

.cropper-bg {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC');
}

.cropper-hide {
  display: block;
  height: 0;
  position: absolute;
  width: 0;
}

.cropper-hidden {
  display: none !important;
}

.cropper-move {
  cursor: move;
}

.cropper-crop {
  cursor: crosshair;
}

.cropper-disabled .cropper-drag-box,
.cropper-disabled .cropper-face,
.cropper-disabled .cropper-line,
.cropper-disabled .cropper-point {
  cursor: not-allowed;
}

.crop-backdrop[data-v-3ba189c2] {\r
  position: fixed;\r
  inset: 0;\r
  z-index: 9999;\r
  background: rgba(0, 0, 0, 0.85);\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  outline: none;
}
.crop-modal[data-v-3ba189c2] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 90vw;\r
  height: 90vh;\r
  max-width: 1400px;\r
  background: var(--bg-color, #1e1e1e);\r
  border: 1px solid var(--border-color, #444);\r
  border-radius: 8px;\r
  overflow: hidden;
}
.crop-toolbar[data-v-3ba189c2] {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  padding: 8px 12px;\r
  background: var(--primary-bg, #2a2a2a);\r
  border-bottom: 1px solid var(--border-color, #444);\r
  flex-shrink: 0;\r
  flex-wrap: wrap;
}
.crop-ratios[data-v-3ba189c2] {\r
  display: flex;\r
  gap: 4px;\r
  flex-wrap: wrap;
}
.crop-ratios button[data-v-3ba189c2] {\r
  padding: 4px 10px;\r
  border: 1px solid var(--border-color, #555);\r
  border-radius: 4px;\r
  background: var(--bg-color, #1e1e1e);\r
  color: var(--fg-color, #ccc);\r
  cursor: pointer;\r
  font-size: 12px;\r
  transition: background 0.15s, border-color 0.15s;
}
.crop-ratios button[data-v-3ba189c2]:hover {\r
  background: var(--primary-bg, #3a3a3a);
}
.crop-ratios button.active[data-v-3ba189c2] {\r
  background: #3b82f6;\r
  border-color: #3b82f6;\r
  color: #fff;
}
.crop-info[data-v-3ba189c2] {\r
  flex: 1;\r
  text-align: center;\r
  color: var(--fg-color, #aaa);\r
  font-size: 13px;\r
  font-family: monospace;\r
  white-space: nowrap;
}
.crop-actions[data-v-3ba189c2] {\r
  display: flex;\r
  gap: 6px;
}
.crop-actions button[data-v-3ba189c2] {\r
  padding: 6px 16px;\r
  border: 1px solid var(--border-color, #555);\r
  border-radius: 4px;\r
  cursor: pointer;\r
  font-size: 13px;\r
  transition: background 0.15s;
}
.btn-secondary[data-v-3ba189c2] {\r
  background: var(--bg-color, #1e1e1e);\r
  color: var(--fg-color, #ccc);
}
.btn-secondary[data-v-3ba189c2]:hover {\r
  background: var(--primary-bg, #3a3a3a);
}
.btn-primary[data-v-3ba189c2] {\r
  background: #3b82f6;\r
  border-color: #3b82f6;\r
  color: #fff;
}
.btn-primary[data-v-3ba189c2]:hover {\r
  background: #2563eb;
}
.crop-workspace[data-v-3ba189c2] {\r
  flex: 1;\r
  overflow: hidden;\r
  position: relative;
}
.crop-workspace img[data-v-3ba189c2] {\r
  display: block;\r
  max-width: 100%;
}\r

.show-anything-widget[data-v-2db531e1] {\r
  padding: 8px;\r
  background: var(--comfy-input-bg, #222);\r
  color: var(--comfy-input-text, #ddd);\r
  border-radius: 6px;\r
  width: 100%;\r
  height: 100%;\r
  box-sizing: border-box;\r
  overflow-y: auto;\r
  font-family: monospace;\r
  white-space: pre-wrap;\r
  word-break: break-all;
}
.items-container[data-v-2db531e1] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 8px;
}
.item-display[data-v-2db531e1] {\r
  background: rgba(0, 0, 0, 0.2);\r
  padding: 6px;\r
  border-radius: 4px;
}
.empty-state[data-v-2db531e1] {\r
  color: #777;\r
  font-style: italic;\r
  text-align: center;\r
  margin-top: 20px;
}`));
      document.head.appendChild(elementStyle);
    }
  } catch (e) {
    console.error("vite-plugin-css-injected-by-js", e);
  }
})();
