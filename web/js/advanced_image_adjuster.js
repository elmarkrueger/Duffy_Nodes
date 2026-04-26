import { d as defineComponent, o as onMounted, a as onUnmounted, b as openBlock, c as createElementBlock, e as createBaseVNode, m as normalizeStyle, g as createCommentVNode, t as toDisplayString, w as withDirectives, v as vModelText, h as ref, j as computed, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-vZrGLxpk.js";
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
const _hoisted_1 = {
  key: 0,
  class: "advanced-adjuster-root"
};
const _hoisted_2 = { class: "preview-container" };
const _hoisted_3 = ["src"];
const _hoisted_4 = { class: "controls-panel" };
const _hoisted_5 = { class: "adjustments-area" };
const _hoisted_6 = { class: "control-row" };
const _hoisted_7 = { class: "label-col" };
const _hoisted_8 = { class: "val" };
const _hoisted_9 = { class: "control-row" };
const _hoisted_10 = { class: "label-col" };
const _hoisted_11 = { class: "val" };
const _hoisted_12 = { class: "control-row" };
const _hoisted_13 = { class: "label-col" };
const _hoisted_14 = { class: "val" };
const _hoisted_15 = { class: "control-row" };
const _hoisted_16 = { class: "label-col" };
const _hoisted_17 = { class: "val" };
const _hoisted_18 = {
  key: 1,
  class: "idle-state"
};
const _hoisted_19 = { style: { "font-size": "12px", "color": "#444" } };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AdvancedImageAdjuster",
  props: {
    nodeId: {},
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const isActive = ref(false);
    const sessionId = ref("");
    const baseImageUrl = ref(null);
    const adjustments = ref({
      brightness: 1,
      contrast: 1,
      saturation: 1,
      hue: 0
    });
    const imageFilterStyle = computed(() => {
      const b = adjustments.value.brightness;
      const c = adjustments.value.contrast;
      const s = adjustments.value.saturation;
      const hDeg = adjustments.value.hue * 360;
      return {
        filter: `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${hDeg}deg)`
      };
    });
    function serialise() {
      return JSON.stringify(adjustments.value);
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (data && typeof data === "object") {
          if (data.brightness !== void 0) adjustments.value.brightness = data.brightness;
          if (data.contrast !== void 0) adjustments.value.contrast = data.contrast;
          if (data.saturation !== void 0) adjustments.value.saturation = data.saturation;
          if (data.hue !== void 0) adjustments.value.hue = data.hue;
        }
      } catch (e) {
      }
    }
    function updatePreview() {
      var _a;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function resetValue(key, defaultVal) {
      adjustments.value[key] = defaultVal;
      updatePreview();
    }
    function resetAll() {
      adjustments.value = {
        brightness: 1,
        contrast: 1,
        saturation: 1,
        hue: 0
      };
      updatePreview();
    }
    function onExecuting(e) {
      const executingId = e.detail ? String(e.detail) : null;
      const myId = String(props.nodeId);
      if (executingId === myId) ;
      else if (executingId === null || executingId === "-1") {
        isActive.value = false;
      } else ;
    }
    function onAdjustPause(e) {
      const data = e.detail;
      sessionId.value = data.session_id;
      baseImageUrl.value = data.image_b64;
      isActive.value = true;
    }
    async function applyAndContinue() {
      var _a;
      if (!sessionId.value) return;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
      try {
        await fetch("/duffy/adjust/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId.value,
            adjustments: adjustments.value
          })
        });
        isActive.value = false;
        sessionId.value = "";
        baseImageUrl.value = null;
      } catch (err) {
        console.error("Failed to resume adjustment:", err);
      }
    }
    function cleanup() {
      api.removeEventListener("executing", onExecuting);
      api.removeEventListener("duffy-adjust-pause", onAdjustPause);
    }
    onMounted(() => {
      api.addEventListener("executing", onExecuting);
      api.addEventListener("duffy-adjust-pause", onAdjustPause);
    });
    onUnmounted(() => {
      cleanup();
    });
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return isActive.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          baseImageUrl.value ? (openBlock(), createElementBlock("img", {
            key: 0,
            src: baseImageUrl.value,
            style: normalizeStyle(imageFilterStyle.value),
            alt: "Preview",
            class: "preview-image"
          }, null, 12, _hoisted_3)) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_4, [
          createBaseVNode("div", { class: "panel-header" }, [
            _cache[8] || (_cache[8] = createBaseVNode("h4", null, "Image Adjustments", -1)),
            createBaseVNode("div", { class: "footer-actions" }, [
              createBaseVNode("button", {
                class: "btn btn-primary",
                onClick: applyAndContinue
              }, "Apply & Continue")
            ])
          ]),
          createBaseVNode("div", _hoisted_5, [
            createBaseVNode("div", _hoisted_6, [
              createBaseVNode("div", _hoisted_7, [
                _cache[9] || (_cache[9] = createBaseVNode("label", null, "Brightness", -1)),
                createBaseVNode("span", _hoisted_8, toDisplayString(adjustments.value.brightness.toFixed(2)), 1)
              ]),
              withDirectives(createBaseVNode("input", {
                type: "range",
                min: "0",
                max: "3",
                step: "0.05",
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => adjustments.value.brightness = $event),
                onInput: updatePreview,
                onDblclick: _cache[1] || (_cache[1] = ($event) => resetValue("brightness", 1))
              }, null, 544), [
                [
                  vModelText,
                  adjustments.value.brightness,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("div", _hoisted_9, [
              createBaseVNode("div", _hoisted_10, [
                _cache[10] || (_cache[10] = createBaseVNode("label", null, "Contrast", -1)),
                createBaseVNode("span", _hoisted_11, toDisplayString(adjustments.value.contrast.toFixed(2)), 1)
              ]),
              withDirectives(createBaseVNode("input", {
                type: "range",
                min: "0",
                max: "3",
                step: "0.05",
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => adjustments.value.contrast = $event),
                onInput: updatePreview,
                onDblclick: _cache[3] || (_cache[3] = ($event) => resetValue("contrast", 1))
              }, null, 544), [
                [
                  vModelText,
                  adjustments.value.contrast,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("div", _hoisted_12, [
              createBaseVNode("div", _hoisted_13, [
                _cache[11] || (_cache[11] = createBaseVNode("label", null, "Saturation", -1)),
                createBaseVNode("span", _hoisted_14, toDisplayString(adjustments.value.saturation.toFixed(2)), 1)
              ]),
              withDirectives(createBaseVNode("input", {
                type: "range",
                min: "0",
                max: "3",
                step: "0.05",
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => adjustments.value.saturation = $event),
                onInput: updatePreview,
                onDblclick: _cache[5] || (_cache[5] = ($event) => resetValue("saturation", 1))
              }, null, 544), [
                [
                  vModelText,
                  adjustments.value.saturation,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("div", _hoisted_15, [
              createBaseVNode("div", _hoisted_16, [
                _cache[12] || (_cache[12] = createBaseVNode("label", null, "Hue", -1)),
                createBaseVNode("span", _hoisted_17, toDisplayString(adjustments.value.hue.toFixed(2)), 1)
              ]),
              withDirectives(createBaseVNode("input", {
                type: "range",
                min: "-0.5",
                max: "0.5",
                step: "0.01",
                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => adjustments.value.hue = $event),
                onInput: updatePreview,
                onDblclick: _cache[7] || (_cache[7] = ($event) => resetValue("hue", 0))
              }, null, 544), [
                [
                  vModelText,
                  adjustments.value.hue,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("div", { class: "reset-row" }, [
              createBaseVNode("button", {
                class: "btn btn-secondary",
                onClick: resetAll
              }, "Reset All")
            ])
          ])
        ])
      ])) : (openBlock(), createElementBlock("div", _hoisted_18, [
        _cache[13] || (_cache[13] = createBaseVNode("div", { class: "pulse" }, null, -1)),
        _cache[14] || (_cache[14] = createBaseVNode("p", { style: { "font-size": "14px", "font-weight": "500" } }, "Waiting for image pipeline...", -1)),
        createBaseVNode("p", _hoisted_19, " B: " + toDisplayString(adjustments.value.brightness.toFixed(2)) + " | C: " + toDisplayString(adjustments.value.contrast.toFixed(2)) + " | S: " + toDisplayString(adjustments.value.saturation.toFixed(2)) + " | H: " + toDisplayString(adjustments.value.hue.toFixed(2)), 1)
      ]));
    };
  }
});
const AdvancedImageAdjuster = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-69d000bf"]]);
app.registerExtension({
  name: "Duffy.AdvancedImageAdjuster.Vue",
  async nodeCreated(node) {
    var _a, _b, _c;
    if (node.comfyClass !== "Duffy_AdvancedImageAdjuster") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "saved_adjustments");
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
    console.log(`Duffy_AdvancedImageAdjuster nodeCreated: ${node.id}`);
    const vueApp = createApp(AdvancedImageAdjuster, {
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
