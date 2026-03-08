import { d as defineComponent, o as onMounted, a as onUnmounted, b as openBlock, c as createElementBlock, e as createBaseVNode, m as normalizeClass, F as Fragment, r as renderList, j as normalizeStyle, g as createCommentVNode, w as withDirectives, l as vModelSelect, t as toDisplayString, f as createTextVNode, h as ref, k as computed, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-BoKuGgvu.js";
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
const _hoisted_1 = {
  key: 0,
  class: "advanced-stitch-root"
};
const _hoisted_2 = { class: "preview-container" };
const _hoisted_3 = ["src"];
const _hoisted_4 = ["src"];
const _hoisted_5 = { class: "controls-panel" };
const _hoisted_6 = { class: "controls-body" };
const _hoisted_7 = { class: "control-row" };
const _hoisted_8 = {
  key: 0,
  class: "grid-controls"
};
const _hoisted_9 = { class: "mapping-grid" };
const _hoisted_10 = ["onUpdate:modelValue"];
const _hoisted_11 = ["value"];
const _hoisted_12 = {
  key: 1,
  class: "info-text"
};
const _hoisted_13 = {
  key: 1,
  class: "idle-state"
};
const _hoisted_14 = { style: { "font-size": "12px", "color": "#444" } };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AdvancedConnectedImageStitch",
  props: {
    nodeId: {},
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const isActive = ref(false);
    const sessionId = ref("");
    const availableImages = ref({});
    const layoutData = ref({
      orientation: "Horizontal",
      layout_pos: {}
    });
    for (let i = 1; i <= 9; i++) {
      if (!layoutData.value.layout_pos[i.toString()]) {
        layoutData.value.layout_pos[i.toString()] = "none";
      }
    }
    const availableImageIds = computed(() => {
      return Object.keys(availableImages.value).sort((a, b) => parseInt(a) - parseInt(b));
    });
    const sortedImageIds = computed(() => availableImageIds.value);
    const previewClass = computed(() => {
      return {
        "layout-horizontal": layoutData.value.orientation === "Horizontal",
        "layout-vertical": layoutData.value.orientation === "Vertical",
        "layout-grid": layoutData.value.orientation === "Layout"
      };
    });
    function hasImageForCell(cell) {
      const mappedId = layoutData.value.layout_pos[cell.toString()];
      return mappedId && mappedId !== "none" && availableImages.value[mappedId];
    }
    function getImageForCell(cell) {
      const mappedId = layoutData.value.layout_pos[cell.toString()];
      return availableImages.value[mappedId] || "";
    }
    function getCellStyle(id) {
      return {};
    }
    function getGridCellStyle(cell) {
      if (!hasImageForCell(cell)) {
        return { background: "rgba(255, 255, 255, 0.05)" };
      }
      return {};
    }
    function serialise() {
      return JSON.stringify(layoutData.value);
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (data && typeof data === "object") {
          if (data.orientation) layoutData.value.orientation = data.orientation;
          if (data.layout_pos) {
            layoutData.value.layout_pos = { ...layoutData.value.layout_pos, ...data.layout_pos };
          }
        }
      } catch (e) {
      }
    }
    function onChange() {
      var _a;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function onExecuting(e) {
      const executingId = e.detail ? String(e.detail) : null;
      const myId = String(props.nodeId);
      if (executingId === myId) ;
      else if (executingId === null || executingId === "-1") {
        isActive.value = false;
      } else ;
    }
    function onStitchPause(e) {
      const data = e.detail;
      sessionId.value = data.session_id;
      availableImages.value = data.images || {};
      isActive.value = true;
    }
    async function applyAndContinue() {
      var _a;
      if (!sessionId.value) return;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
      try {
        await fetch("/duffy/stitch/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId.value,
            layout: layoutData.value
          })
        });
        isActive.value = false;
        sessionId.value = "";
        availableImages.value = {};
      } catch (err) {
        console.error("Failed to resume stitch:", err);
      }
    }
    function cleanup() {
      api.removeEventListener("executing", onExecuting);
      api.removeEventListener("duffy-stitch-pause", onStitchPause);
    }
    onMounted(() => {
      api.addEventListener("executing", onExecuting);
      api.addEventListener("duffy-stitch-pause", onStitchPause);
    });
    onUnmounted(() => {
      cleanup();
    });
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return isActive.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", {
            class: normalizeClass([previewClass.value, "preview-layout"])
          }, [
            layoutData.value.orientation === "Horizontal" || layoutData.value.orientation === "Vertical" ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(sortedImageIds.value, (id) => {
              return openBlock(), createElementBlock("div", {
                key: "hv-" + id,
                class: "preview-cell",
                style: normalizeStyle(getCellStyle())
              }, [
                createBaseVNode("img", {
                  src: availableImages.value[id],
                  alt: "Preview"
                }, null, 8, _hoisted_3)
              ], 4);
            }), 128)) : layoutData.value.orientation === "Layout" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, renderList(9, (cell) => {
              return createBaseVNode("div", {
                key: "grid-" + cell,
                class: "preview-cell grid-cell",
                style: normalizeStyle(getGridCellStyle(cell))
              }, [
                hasImageForCell(cell) ? (openBlock(), createElementBlock("img", {
                  key: 0,
                  src: getImageForCell(cell),
                  alt: "Preview"
                }, null, 8, _hoisted_4)) : createCommentVNode("", true)
              ], 4);
            }), 64)) : createCommentVNode("", true)
          ], 2)
        ]),
        createBaseVNode("div", _hoisted_5, [
          createBaseVNode("div", { class: "panel-header" }, [
            _cache[1] || (_cache[1] = createBaseVNode("h4", null, "Image Stitch Configuration", -1)),
            createBaseVNode("div", { class: "footer-actions" }, [
              createBaseVNode("button", {
                class: "btn btn-primary",
                onClick: applyAndContinue
              }, "Apply & Continue")
            ])
          ]),
          createBaseVNode("div", _hoisted_6, [
            createBaseVNode("div", _hoisted_7, [
              _cache[3] || (_cache[3] = createBaseVNode("label", null, "Orientation", -1)),
              withDirectives(createBaseVNode("select", {
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => layoutData.value.orientation = $event),
                onChange
              }, [..._cache[2] || (_cache[2] = [
                createBaseVNode("option", { value: "Horizontal" }, "Horizontal", -1),
                createBaseVNode("option", { value: "Vertical" }, "Vertical", -1),
                createBaseVNode("option", { value: "Layout" }, "3x3 Grid Layout", -1)
              ])], 544), [
                [vModelSelect, layoutData.value.orientation]
              ])
            ]),
            layoutData.value.orientation === "Layout" ? (openBlock(), createElementBlock("div", _hoisted_8, [
              _cache[5] || (_cache[5] = createBaseVNode("p", { class: "section-subtitle" }, "Map Connected Images to Grid (1-9)", -1)),
              createBaseVNode("div", _hoisted_9, [
                (openBlock(), createElementBlock(Fragment, null, renderList(9, (cell) => {
                  return createBaseVNode("div", {
                    key: "ctrl-" + cell,
                    class: "mapping-cell"
                  }, [
                    createBaseVNode("label", null, "Pos " + toDisplayString(cell), 1),
                    withDirectives(createBaseVNode("select", {
                      "onUpdate:modelValue": ($event) => layoutData.value.layout_pos[cell] = $event,
                      onChange
                    }, [
                      _cache[4] || (_cache[4] = createBaseVNode("option", { value: "none" }, "Empty", -1)),
                      (openBlock(true), createElementBlock(Fragment, null, renderList(availableImageIds.value, (id) => {
                        return openBlock(), createElementBlock("option", {
                          key: id,
                          value: id
                        }, "Image " + toDisplayString(id), 9, _hoisted_11);
                      }), 128))
                    ], 40, _hoisted_10), [
                      [vModelSelect, layoutData.value.layout_pos[cell]]
                    ])
                  ]);
                }), 64))
              ])
            ])) : (openBlock(), createElementBlock("div", _hoisted_12, [
              createTextVNode(" Images will be combined " + toDisplayString(layoutData.value.orientation.toLowerCase()) + " in numerical order of their connected inputs. ", 1),
              _cache[6] || (_cache[6] = createBaseVNode("br", null, null, -1)),
              _cache[7] || (_cache[7] = createBaseVNode("br", null, null, -1)),
              createTextVNode(" Connected inputs: " + toDisplayString(sortedImageIds.value.length > 0 ? sortedImageIds.value.join(", ") : "None"), 1)
            ]))
          ])
        ])
      ])) : (openBlock(), createElementBlock("div", _hoisted_13, [
        _cache[8] || (_cache[8] = createBaseVNode("div", { class: "pulse" }, null, -1)),
        _cache[9] || (_cache[9] = createBaseVNode("p", { style: { "font-size": "14px", "font-weight": "500" } }, "Waiting for image pipeline...", -1)),
        createBaseVNode("p", _hoisted_14, " Mode: " + toDisplayString(layoutData.value.orientation), 1)
      ]));
    };
  }
});
const AdvancedConnectedImageStitch = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d59fd744"]]);
app.registerExtension({
  name: "Duffy.AdvancedConnectedImageStitch.Vue",
  async nodeCreated(node) {
    var _a;
    if (node.comfyClass !== "Duffy_AdvancedConnectedImageStitch") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "saved_layout");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.computeSize = () => [0, -4];
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    const vueApp = createApp(AdvancedConnectedImageStitch, {
      nodeId: String(node.id),
      onChange: (json) => {
        if (dataWidget) {
          dataWidget.value = json;
        }
        node.setDirtyCanvas(true, true);
      }
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => [800, 680];
    domWidget.content = container;
    const MIN_W = 800, MIN_H = 680;
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    node.size = [MIN_W, MIN_H];
    if (dataWidget == null ? void 0 : dataWidget.value) {
      instance.deserialise(dataWidget.value);
    }
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      (_a2 = instance.cleanup) == null ? void 0 : _a2.call(instance);
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
}`));
      document.head.appendChild(elementStyle);
    }
  } catch (e) {
    console.error("vite-plugin-css-injected-by-js", e);
  }
})();
