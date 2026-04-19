import { d as defineComponent, o as onMounted, a as onUnmounted, b as openBlock, c as createElementBlock, e as createBaseVNode, f as createTextVNode, F as Fragment, r as renderList, t as toDisplayString, w as withDirectives, v as vModelText, p as vModelSelect, g as createCommentVNode, h as ref, n as nextTick, s as shallowRef, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-u6YluKsh.js";
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
    var _a, _b, _c;
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
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = app.canvas;
      if (canvas) canvas.processContextMenu(node, e);
    });
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
    (_b = node.setSize) == null ? void 0 : _b.call(node, [MIN_W, MIN_H]);
    (_c = node.setDirtyCanvas) == null ? void 0 : _c.call(node, true, true);
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
