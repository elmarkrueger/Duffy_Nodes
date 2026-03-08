import { d as defineComponent, o as onMounted, a as onUnmounted, b as openBlock, c as createElementBlock, e as createBaseVNode, f as createTextVNode, F as Fragment, r as renderList, t as toDisplayString, w as withDirectives, v as vModelText, g as createCommentVNode, h as ref, n as nextTick, s as shallowRef, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-BoKuGgvu.js";
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
const _hoisted_1 = {
  key: 0,
  class: "interactive-relight-root"
};
const _hoisted_2 = { class: "canvas-container" };
const _hoisted_3 = { class: "controls-panel" };
const _hoisted_4 = { class: "panel-header" };
const _hoisted_5 = { class: "footer-actions" };
const _hoisted_6 = { class: "add-buttons" };
const _hoisted_7 = { class: "lights-scroll-area" };
const _hoisted_8 = { class: "light-header" };
const _hoisted_9 = ["onClick"];
const _hoisted_10 = { class: "light-controls-grid" };
const _hoisted_11 = { class: "control-row" };
const _hoisted_12 = ["onUpdate:modelValue", "onInput"];
const _hoisted_13 = { style: { "font-family": "monospace", "font-size": "10px", "min-width": "50px" } };
const _hoisted_14 = { class: "control-row" };
const _hoisted_15 = ["onUpdate:modelValue"];
const _hoisted_16 = { style: { "min-width": "25px", "text-align": "right" } };
const _hoisted_17 = { class: "control-row" };
const _hoisted_18 = ["onUpdate:modelValue"];
const _hoisted_19 = { class: "control-row" };
const _hoisted_20 = ["onUpdate:modelValue"];
const _hoisted_21 = { class: "control-row" };
const _hoisted_22 = ["onUpdate:modelValue"];
const _hoisted_23 = {
  key: 1,
  class: "control-row"
};
const _hoisted_24 = ["onUpdate:modelValue"];
const _hoisted_25 = { style: { "min-width": "25px", "text-align": "right" } };
const _hoisted_26 = {
  key: 1,
  class: "idle-state"
};
const _hoisted_27 = {
  key: 0,
  style: { "font-size": "12px", "color": "#444" }
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "InteractiveRelight",
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
    const lights = ref([]);
    function serialise() {
      return JSON.stringify(lights.value);
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
          lights.value = data;
          lights.value.forEach((l) => {
            if (!l.hexColor && l.color) {
              l.hexColor = rgbToHex(l.color.r, l.color.g, l.color.b);
            }
          });
        }
      } catch (e) {
      }
    }
    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 255, b: 255 };
    }
    function rgbToHex(r, g, b) {
      return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
    }
    function updateColor(light) {
      light.color = hexToRgb(light.hexColor);
      renderCanvas();
    }
    function addLight(type) {
      var _a;
      lights.value.push({
        type,
        hexColor: "#ffffff",
        color: { r: 255, g: 255, b: 255 },
        intensity: 1,
        x: 0.5,
        y: 0.5,
        radius: 0.5,
        angle: 0
      });
      renderCanvas();
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function removeLight(index) {
      var _a;
      lights.value.splice(index, 1);
      renderCanvas();
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function onExecuting(e) {
      const executingId = e.detail ? String(e.detail) : null;
      const myId = String(props.nodeId);
      console.log(`Relight node ${myId} executing event:`, executingId);
      if (executingId === myId) ;
      else if (executingId === null || executingId === "-1") {
        isActive.value = false;
      } else ;
    }
    function onRelightPause(e) {
      const data = e.detail;
      console.log("Relight pause event received for session:", data.session_id);
      sessionId.value = data.session_id;
      const img = new Image();
      img.onload = () => {
        console.log("Relight base image loaded, activating UI");
        baseImage.value = img;
        isActive.value = true;
        nextTick(() => renderCanvas());
      };
      img.onerror = (err) => {
        console.error("Relight failed to load base image:", err);
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
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      for (const light of lights.value) {
        if (light.intensity <= 0) continue;
        ctx.save();
        if (light.type === "point") {
          const cx = light.x * canvas.width;
          const cy = light.y * canvas.height;
          const r = light.radius * canvas.width;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          const colorStr = `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, ${light.intensity})`;
          grad.addColorStop(0, colorStr);
          grad.addColorStop(1, `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, 0)`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (light.type === "directional") {
          const angleRad = light.angle * Math.PI / 180;
          const dx = Math.cos(angleRad);
          const dy = Math.sin(angleRad);
          const diag = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const x0 = cx - dx * diag / 2;
          const y0 = cy - dy * diag / 2;
          const x1 = cx + dx * diag / 2;
          const y1 = cy + dy * diag / 2;
          const grad = ctx.createLinearGradient(x0, y0, x1, y1);
          const colorStr = `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, ${light.intensity})`;
          grad.addColorStop(0, colorStr);
          grad.addColorStop(1, `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, 0)`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (light.type === "ambient") {
          ctx.fillStyle = `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, ${light.intensity})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
      }
    }
    async function applyAndContinue() {
      var _a;
      if (!sessionId.value) return;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
      try {
        await fetch("/duffy/relight/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId.value,
            lights: lights.value
          })
        });
        isActive.value = false;
        sessionId.value = "";
        baseImage.value = null;
      } catch (err) {
        console.error("Failed to resume relight:", err);
      }
    }
    function cleanup() {
      api.removeEventListener("executing", onExecuting);
      api.removeEventListener("duffy-relight-pause", onRelightPause);
    }
    onMounted(() => {
      api.addEventListener("executing", onExecuting);
      api.addEventListener("duffy-relight-pause", onRelightPause);
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
          createBaseVNode("div", _hoisted_4, [
            _cache[6] || (_cache[6] = createBaseVNode("h4", null, "Light Management", -1)),
            createBaseVNode("div", _hoisted_5, [
              createBaseVNode("div", _hoisted_6, [
                createBaseVNode("button", {
                  class: "btn",
                  onClick: _cache[0] || (_cache[0] = ($event) => addLight("point"))
                }, [..._cache[3] || (_cache[3] = [
                  createBaseVNode("span", null, "+", -1),
                  createTextVNode(" Point", -1)
                ])]),
                createBaseVNode("button", {
                  class: "btn",
                  onClick: _cache[1] || (_cache[1] = ($event) => addLight("directional"))
                }, [..._cache[4] || (_cache[4] = [
                  createBaseVNode("span", null, "+", -1),
                  createTextVNode(" Directional", -1)
                ])]),
                createBaseVNode("button", {
                  class: "btn",
                  onClick: _cache[2] || (_cache[2] = ($event) => addLight("ambient"))
                }, [..._cache[5] || (_cache[5] = [
                  createBaseVNode("span", null, "+", -1),
                  createTextVNode(" Ambient", -1)
                ])])
              ]),
              createBaseVNode("button", {
                class: "btn btn-primary",
                onClick: applyAndContinue
              }, "Apply & Continue")
            ])
          ]),
          createBaseVNode("div", _hoisted_7, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(lights.value, (light, index) => {
              return openBlock(), createElementBlock("div", {
                key: index,
                class: "light-item"
              }, [
                createBaseVNode("div", _hoisted_8, [
                  createBaseVNode("span", null, toDisplayString(light.type.toUpperCase()) + " LIGHT", 1),
                  createBaseVNode("button", {
                    onClick: ($event) => removeLight(index),
                    class: "btn btn-danger"
                  }, "Delete", 8, _hoisted_9)
                ]),
                createBaseVNode("div", _hoisted_10, [
                  createBaseVNode("div", _hoisted_11, [
                    _cache[7] || (_cache[7] = createBaseVNode("label", null, "Color", -1)),
                    withDirectives(createBaseVNode("input", {
                      type: "color",
                      "onUpdate:modelValue": ($event) => light.hexColor = $event,
                      onInput: ($event) => updateColor(light)
                    }, null, 40, _hoisted_12), [
                      [vModelText, light.hexColor]
                    ]),
                    createBaseVNode("span", _hoisted_13, toDisplayString(light.hexColor), 1)
                  ]),
                  createBaseVNode("div", _hoisted_14, [
                    _cache[8] || (_cache[8] = createBaseVNode("label", null, "Power", -1)),
                    withDirectives(createBaseVNode("input", {
                      type: "range",
                      min: "0",
                      max: "5",
                      step: "0.1",
                      "onUpdate:modelValue": ($event) => light.intensity = $event,
                      onInput: renderCanvas
                    }, null, 40, _hoisted_15), [
                      [
                        vModelText,
                        light.intensity,
                        void 0,
                        { number: true }
                      ]
                    ]),
                    createBaseVNode("span", _hoisted_16, toDisplayString(light.intensity.toFixed(1)), 1)
                  ]),
                  light.type === "point" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    createBaseVNode("div", _hoisted_17, [
                      _cache[9] || (_cache[9] = createBaseVNode("label", null, "Pos X", -1)),
                      withDirectives(createBaseVNode("input", {
                        type: "range",
                        min: "0",
                        max: "1",
                        step: "0.01",
                        "onUpdate:modelValue": ($event) => light.x = $event,
                        onInput: renderCanvas
                      }, null, 40, _hoisted_18), [
                        [
                          vModelText,
                          light.x,
                          void 0,
                          { number: true }
                        ]
                      ])
                    ]),
                    createBaseVNode("div", _hoisted_19, [
                      _cache[10] || (_cache[10] = createBaseVNode("label", null, "Pos Y", -1)),
                      withDirectives(createBaseVNode("input", {
                        type: "range",
                        min: "0",
                        max: "1",
                        step: "0.01",
                        "onUpdate:modelValue": ($event) => light.y = $event,
                        onInput: renderCanvas
                      }, null, 40, _hoisted_20), [
                        [
                          vModelText,
                          light.y,
                          void 0,
                          { number: true }
                        ]
                      ])
                    ]),
                    createBaseVNode("div", _hoisted_21, [
                      _cache[11] || (_cache[11] = createBaseVNode("label", null, "Radius", -1)),
                      withDirectives(createBaseVNode("input", {
                        type: "range",
                        min: "0.1",
                        max: "2",
                        step: "0.05",
                        "onUpdate:modelValue": ($event) => light.radius = $event,
                        onInput: renderCanvas
                      }, null, 40, _hoisted_22), [
                        [
                          vModelText,
                          light.radius,
                          void 0,
                          { number: true }
                        ]
                      ])
                    ])
                  ], 64)) : createCommentVNode("", true),
                  light.type === "directional" ? (openBlock(), createElementBlock("div", _hoisted_23, [
                    _cache[12] || (_cache[12] = createBaseVNode("label", null, "Angle", -1)),
                    withDirectives(createBaseVNode("input", {
                      type: "range",
                      min: "0",
                      max: "360",
                      step: "1",
                      "onUpdate:modelValue": ($event) => light.angle = $event,
                      onInput: renderCanvas
                    }, null, 40, _hoisted_24), [
                      [
                        vModelText,
                        light.angle,
                        void 0,
                        { number: true }
                      ]
                    ]),
                    createBaseVNode("span", _hoisted_25, toDisplayString(light.angle) + "°", 1)
                  ])) : createCommentVNode("", true)
                ])
              ]);
            }), 128))
          ])
        ])
      ])) : (openBlock(), createElementBlock("div", _hoisted_26, [
        _cache[13] || (_cache[13] = createBaseVNode("div", { class: "pulse" }, null, -1)),
        _cache[14] || (_cache[14] = createBaseVNode("p", { style: { "font-size": "14px", "font-weight": "500" } }, "Waiting for image pipeline...", -1)),
        lights.value.length > 0 ? (openBlock(), createElementBlock("p", _hoisted_27, toDisplayString(lights.value.length) + " light(s) defined in workflow state.", 1)) : createCommentVNode("", true)
      ]));
    };
  }
});
const InteractiveRelight = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3aa67706"]]);
app.registerExtension({
  name: "Duffy.InteractiveRelight.Vue",
  async nodeCreated(node) {
    var _a;
    if (node.comfyClass !== "Duffy_InteractiveRelight") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "saved_lights");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.computeSize = () => [0, -4];
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    console.log(`Duffy_InteractiveRelight nodeCreated: ${node.id}`);
    const vueApp = createApp(InteractiveRelight, {
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
    domWidget.computeSize = () => [800, 640];
    domWidget.content = container;
    const MIN_W = 800, MIN_H = 640;
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
