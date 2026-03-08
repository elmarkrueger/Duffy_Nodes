import { d as defineComponent, o as onMounted, a as onUnmounted, b as openBlock, c as createElementBlock, e as createBaseVNode, f as createTextVNode, F as Fragment, r as renderList, t as toDisplayString, g as createCommentVNode, h as ref, n as nextTick, s as shallowRef, w as withDirectives, v as vModelText, l as vModelSelect, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-iKdnqS1F.js";
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
const _hoisted_1 = {
  key: 0,
  class: "advanced-text-overlay-root"
};
const _hoisted_2 = { class: "canvas-container" };
const _hoisted_3 = { class: "controls-panel" };
const _hoisted_4 = { class: "overlays-scroll-area" };
const _hoisted_5 = { class: "overlay-header" };
const _hoisted_6 = ["onClick"];
const _hoisted_7 = { class: "overlay-controls-grid" };
const _hoisted_8 = { class: "control-row" };
const _hoisted_9 = ["onUpdate:modelValue"];
const _hoisted_10 = { class: "control-row" };
const _hoisted_11 = ["onUpdate:modelValue", "onChange"];
const _hoisted_12 = ["value"];
const _hoisted_13 = { class: "control-row" };
const _hoisted_14 = ["onUpdate:modelValue"];
const _hoisted_15 = { style: { "min-width": "30px", "text-align": "right" } };
const _hoisted_16 = { class: "control-row" };
const _hoisted_17 = ["onUpdate:modelValue"];
const _hoisted_18 = { style: { "font-family": "monospace", "font-size": "10px", "min-width": "50px" } };
const _hoisted_19 = { class: "control-row" };
const _hoisted_20 = ["onUpdate:modelValue"];
const _hoisted_21 = { class: "control-row" };
const _hoisted_22 = ["onUpdate:modelValue"];
const _hoisted_23 = {
  key: 1,
  class: "idle-state"
};
const _hoisted_24 = {
  key: 0,
  style: { "font-size": "12px", "color": "#444" }
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AdvancedTextOverlay",
  props: {
    nodeId: {},
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const isActive = ref(false);
    const sessionId = ref("");
    const canvasRef = ref(null);
    const baseImage = shallowRef(null);
    const overlays = ref([]);
    const availableFonts = ref(["Arial", "Courier New", "Times New Roman", "Impact"]);
    const loadedFonts = /* @__PURE__ */ new Set();
    async function loadFont(fontName) {
      if (loadedFonts.has(fontName)) return;
      if (fontName.match(/\.(ttf|otf|ttc)$/i)) {
        try {
          const fontFace = new FontFace(fontName, `url(/duffy/fonts/${fontName})`);
          const loadedFace = await fontFace.load();
          document.fonts.add(loadedFace);
          loadedFonts.add(fontName);
          console.log(`Loaded font: ${fontName}`);
          renderCanvas();
        } catch (err) {
          console.error(`Error loading font ${fontName}:`, err);
        }
      } else {
        loadedFonts.add(fontName);
      }
    }
    function serialise() {
      return JSON.stringify(overlays.value);
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
          overlays.value = data;
          overlays.value.forEach((layer) => {
            if (layer.font) loadFont(layer.font);
          });
        }
      } catch (e) {
      }
    }
    function addOverlay() {
      var _a;
      const defaultFont = availableFonts.value[0] || "Arial";
      overlays.value.push({
        text: "New Text",
        font: defaultFont,
        size: 64,
        hexColor: "#ffffff",
        x: 0.5,
        y: 0.5
      });
      loadFont(defaultFont);
      renderCanvas();
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function onFontChange(layer) {
      loadFont(layer.font);
      renderCanvas();
    }
    function removeOverlay(index) {
      var _a;
      overlays.value.splice(index, 1);
      renderCanvas();
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
    function onTextOverlayPause(e) {
      const data = e.detail;
      sessionId.value = data.session_id;
      if (data.fonts && Array.isArray(data.fonts)) {
        availableFonts.value = data.fonts;
      }
      const img = new Image();
      img.onload = () => {
        baseImage.value = img;
        isActive.value = true;
        nextTick(() => renderCanvas());
      };
      img.onerror = (err) => {
        console.error("Text Overlay failed to load base image:", err);
      };
      img.src = data.image_b64;
    }
    function renderCanvas() {
      if (!canvasRef.value || !baseImage.value) return;
      const canvas = canvasRef.value;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = baseImage.value;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      for (const layer of overlays.value) {
        if (!layer.text) continue;
        ctx.save();
        ctx.font = `${layer.size}px "${layer.font}", sans-serif`;
        ctx.fillStyle = layer.hexColor;
        ctx.textBaseline = "top";
        const px = layer.x * canvas.width;
        const py = layer.y * canvas.height;
        ctx.fillText(layer.text, px, py);
        ctx.restore();
      }
    }
    async function applyAndContinue() {
      var _a;
      if (!sessionId.value) return;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
      try {
        await fetch("/duffy/text_overlay/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId.value,
            overlays: overlays.value
          })
        });
        isActive.value = false;
        sessionId.value = "";
        baseImage.value = null;
      } catch (err) {
        console.error("Failed to resume text overlay:", err);
      }
    }
    function cleanup() {
      api.removeEventListener("executing", onExecuting);
      api.removeEventListener("duffy-text-overlay-pause", onTextOverlayPause);
    }
    onMounted(() => {
      api.addEventListener("executing", onExecuting);
      api.addEventListener("duffy-text-overlay-pause", onTextOverlayPause);
    });
    onUnmounted(() => {
      cleanup();
    });
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return isActive.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("canvas", {
            ref_key: "canvasRef",
            ref: canvasRef
          }, null, 512)
        ]),
        createBaseVNode("div", _hoisted_3, [
          createBaseVNode("div", { class: "panel-header" }, [
            _cache[1] || (_cache[1] = createBaseVNode("h4", null, "Text Overlay Management", -1)),
            createBaseVNode("div", { class: "footer-actions" }, [
              createBaseVNode("button", {
                class: "btn",
                onClick: addOverlay
              }, [..._cache[0] || (_cache[0] = [
                createBaseVNode("span", null, "+", -1),
                createTextVNode(" Add Text", -1)
              ])]),
              createBaseVNode("button", {
                class: "btn btn-primary",
                onClick: applyAndContinue
              }, "Apply & Continue")
            ])
          ]),
          createBaseVNode("div", _hoisted_4, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(overlays.value, (overlay, index) => {
              return openBlock(), createElementBlock("div", {
                key: index,
                class: "overlay-item"
              }, [
                createBaseVNode("div", _hoisted_5, [
                  createBaseVNode("span", null, "LAYER " + toDisplayString(index + 1), 1),
                  createBaseVNode("button", {
                    onClick: ($event) => removeOverlay(index),
                    class: "btn btn-danger"
                  }, "Delete", 8, _hoisted_6)
                ]),
                createBaseVNode("div", _hoisted_7, [
                  createBaseVNode("div", _hoisted_8, [
                    _cache[2] || (_cache[2] = createBaseVNode("label", null, "Text", -1)),
                    withDirectives(createBaseVNode("input", {
                      type: "text",
                      "onUpdate:modelValue": ($event) => overlay.text = $event,
                      onInput: renderCanvas,
                      placeholder: "Enter text..."
                    }, null, 40, _hoisted_9), [
                      [vModelText, overlay.text]
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_10, [
                    _cache[3] || (_cache[3] = createBaseVNode("label", null, "Font", -1)),
                    withDirectives(createBaseVNode("select", {
                      "onUpdate:modelValue": ($event) => overlay.font = $event,
                      onChange: ($event) => onFontChange(overlay)
                    }, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(availableFonts.value, (font) => {
                        return openBlock(), createElementBlock("option", {
                          key: font,
                          value: font
                        }, toDisplayString(font), 9, _hoisted_12);
                      }), 128))
                    ], 40, _hoisted_11), [
                      [vModelSelect, overlay.font]
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_13, [
                    _cache[4] || (_cache[4] = createBaseVNode("label", null, "Size", -1)),
                    withDirectives(createBaseVNode("input", {
                      type: "range",
                      min: "8",
                      max: "1024",
                      step: "1",
                      "onUpdate:modelValue": ($event) => overlay.size = $event,
                      onInput: renderCanvas
                    }, null, 40, _hoisted_14), [
                      [
                        vModelText,
                        overlay.size,
                        void 0,
                        { number: true }
                      ]
                    ]),
                    createBaseVNode("span", _hoisted_15, toDisplayString(overlay.size), 1)
                  ]),
                  createBaseVNode("div", _hoisted_16, [
                    _cache[5] || (_cache[5] = createBaseVNode("label", null, "Color", -1)),
                    withDirectives(createBaseVNode("input", {
                      type: "color",
                      "onUpdate:modelValue": ($event) => overlay.hexColor = $event,
                      onInput: renderCanvas
                    }, null, 40, _hoisted_17), [
                      [vModelText, overlay.hexColor]
                    ]),
                    createBaseVNode("span", _hoisted_18, toDisplayString(overlay.hexColor), 1)
                  ]),
                  createBaseVNode("div", _hoisted_19, [
                    _cache[6] || (_cache[6] = createBaseVNode("label", null, "Pos X", -1)),
                    withDirectives(createBaseVNode("input", {
                      type: "range",
                      min: "0",
                      max: "1",
                      step: "0.01",
                      "onUpdate:modelValue": ($event) => overlay.x = $event,
                      onInput: renderCanvas
                    }, null, 40, _hoisted_20), [
                      [
                        vModelText,
                        overlay.x,
                        void 0,
                        { number: true }
                      ]
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_21, [
                    _cache[7] || (_cache[7] = createBaseVNode("label", null, "Pos Y", -1)),
                    withDirectives(createBaseVNode("input", {
                      type: "range",
                      min: "0",
                      max: "1",
                      step: "0.01",
                      "onUpdate:modelValue": ($event) => overlay.y = $event,
                      onInput: renderCanvas
                    }, null, 40, _hoisted_22), [
                      [
                        vModelText,
                        overlay.y,
                        void 0,
                        { number: true }
                      ]
                    ])
                  ])
                ])
              ]);
            }), 128))
          ])
        ])
      ])) : (openBlock(), createElementBlock("div", _hoisted_23, [
        _cache[8] || (_cache[8] = createBaseVNode("div", { class: "pulse" }, null, -1)),
        _cache[9] || (_cache[9] = createBaseVNode("p", { style: { "font-size": "14px", "font-weight": "500" } }, "Waiting for image pipeline...", -1)),
        overlays.value.length > 0 ? (openBlock(), createElementBlock("p", _hoisted_24, toDisplayString(overlays.value.length) + " text layer(s) defined in workflow state.", 1)) : createCommentVNode("", true)
      ]));
    };
  }
});
const AdvancedTextOverlay = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-cf15eb50"]]);
app.registerExtension({
  name: "Duffy.AdvancedTextOverlay.Vue",
  async nodeCreated(node) {
    var _a;
    if (node.comfyClass !== "Duffy_AdvancedTextOverlay") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "saved_overlays");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.computeSize = () => [0, -4];
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    const vueApp = createApp(AdvancedTextOverlay, {
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
    domWidget.computeSize = () => [800, 740];
    domWidget.content = container;
    const MIN_W = 800, MIN_H = 740;
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
}`));
      document.head.appendChild(elementStyle);
    }
  } catch (e) {
    console.error("vite-plugin-css-injected-by-js", e);
  }
})();
