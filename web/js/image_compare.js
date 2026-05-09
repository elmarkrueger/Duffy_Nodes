import { app } from "../../../scripts/app.js";
import { d as defineComponent, f as onMounted, o as openBlock, c as createElementBlock, a as createBaseVNode, j as normalizeClass, w as withDirectives, v as vModelText, i as createCommentVNode, m as normalizeStyle, b as ref, l as computed, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-CusGlrPr.js";
const _hoisted_1 = { class: "controls-panel" };
const _hoisted_2 = { class: "btn-group" };
const _hoisted_3 = { class: "btn-group" };
const _hoisted_4 = {
  key: 0,
  class: "placeholder"
};
const _hoisted_5 = ["src"];
const _hoisted_6 = ["src"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ImageCompare",
  props: {
    onChange: { type: Function },
    nodeId: {}
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const sliderMode = ref("horizontal");
    const sliderColor = ref("#00ffff");
    const sliderPercent = ref(50);
    const imgASrc = ref(null);
    const imgBSrc = ref(null);
    const containerRef = ref(null);
    let isDragging = false;
    const currentClipPath = computed(() => {
      if (sliderMode.value === "horizontal") {
        return `inset(0 ${100 - sliderPercent.value}% 0 0)`;
      } else {
        return `inset(0 0 ${100 - sliderPercent.value}% 0)`;
      }
    });
    const sliderLineStyle = computed(() => {
      if (sliderMode.value === "horizontal") {
        return {
          left: `${sliderPercent.value}%`,
          top: "0",
          bottom: "0",
          width: "2px",
          height: "100%",
          backgroundColor: sliderColor.value,
          boxShadow: `0 0 8px ${sliderColor.value}, 0 0 4px ${sliderColor.value}`,
          transform: "translateX(-50%)"
        };
      } else {
        return {
          top: `${sliderPercent.value}%`,
          left: "0",
          right: "0",
          height: "2px",
          width: "100%",
          backgroundColor: sliderColor.value,
          boxShadow: `0 0 8px ${sliderColor.value}, 0 0 4px ${sliderColor.value}`,
          transform: "translateY(-50%)"
        };
      }
    });
    function setMode(mode) {
      sliderMode.value = mode;
      emitChange();
    }
    function resetSlider() {
      sliderPercent.value = 50;
      emitChange();
    }
    function updateSlider(clientX, clientY) {
      if (!containerRef.value) return;
      const rect = containerRef.value.getBoundingClientRect();
      if (sliderMode.value === "horizontal") {
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        sliderPercent.value = x / rect.width * 100;
      } else {
        let y = clientY - rect.top;
        y = Math.max(0, Math.min(y, rect.height));
        sliderPercent.value = y / rect.height * 100;
      }
    }
    function onMouseDown(e) {
      isDragging = true;
      updateSlider(e.clientX, e.clientY);
      document.addEventListener("mousemove", onDocMouseMove);
      document.addEventListener("mouseup", onDocMouseUp);
    }
    function onMouseMove(e) {
      if (isDragging) return;
    }
    function onMouseUp() {
    }
    function onMouseLeave() {
    }
    function onDocMouseMove(e) {
      if (isDragging) {
        updateSlider(e.clientX, e.clientY);
      }
    }
    function onDocMouseUp() {
      if (isDragging) {
        isDragging = false;
        emitChange();
        document.removeEventListener("mousemove", onDocMouseMove);
        document.removeEventListener("mouseup", onDocMouseUp);
      }
    }
    function serialise() {
      return JSON.stringify({
        mode: sliderMode.value,
        color: sliderColor.value,
        percent: sliderPercent.value
      });
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (data.mode) sliderMode.value = data.mode;
        if (data.color) sliderColor.value = data.color;
        if (data.percent !== void 0) sliderPercent.value = data.percent;
      } catch (e) {
      }
    }
    function emitChange() {
      var _a;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function setImages(imgs) {
      if (imgs && imgs.length >= 2) {
        const makeUrl = (img) => {
          const params = new URLSearchParams({
            filename: img.filename,
            type: img.type || "temp"
          });
          if (img.subfolder) params.set("subfolder", img.subfolder);
          return `/view?${params.toString()}`;
        };
        const t = `&t=${Date.now()}`;
        imgASrc.value = makeUrl(imgs[0]) + t;
        imgBSrc.value = makeUrl(imgs[1]) + t;
      }
    }
    function cleanup() {
      document.removeEventListener("mousemove", onDocMouseMove);
      document.removeEventListener("mouseup", onDocMouseUp);
    }
    onMounted(() => {
    });
    __expose({ serialise, deserialise, cleanup, setImages });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "image-compare-wrapper",
        onMousemove: onMouseMove,
        onMouseup: onMouseUp,
        onMouseleave: onMouseLeave
      }, [
        createBaseVNode("div", _hoisted_1, [
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("button", {
              class: normalizeClass(["icon-btn", { active: sliderMode.value === "horizontal" }]),
              onClick: _cache[0] || (_cache[0] = ($event) => setMode("horizontal")),
              title: "Horizontal Split (Left/Right)"
            }, " ⬌ ", 2),
            createBaseVNode("button", {
              class: normalizeClass(["icon-btn", { active: sliderMode.value === "vertical" }]),
              onClick: _cache[1] || (_cache[1] = ($event) => setMode("vertical")),
              title: "Vertical Split (Top/Bottom)"
            }, " ⬍ ", 2)
          ]),
          createBaseVNode("div", _hoisted_3, [
            withDirectives(createBaseVNode("input", {
              type: "color",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => sliderColor.value = $event),
              onChange: emitChange,
              class: "color-picker",
              title: "Slider Color"
            }, null, 544), [
              [vModelText, sliderColor.value]
            ])
          ]),
          createBaseVNode("button", {
            class: "icon-btn reset-btn",
            onClick: resetSlider,
            title: "Reset to 50%"
          }, " Reset ")
        ]),
        createBaseVNode("div", {
          class: "canvas-container",
          ref_key: "containerRef",
          ref: containerRef,
          onMousedown: onMouseDown
        }, [
          !imgASrc.value || !imgBSrc.value ? (openBlock(), createElementBlock("div", _hoisted_4, " Execute to compare images ")) : createCommentVNode("", true),
          imgBSrc.value ? (openBlock(), createElementBlock("img", {
            key: 1,
            src: imgBSrc.value,
            class: "bg-img"
          }, null, 8, _hoisted_5)) : createCommentVNode("", true),
          imgASrc.value ? (openBlock(), createElementBlock("img", {
            key: 2,
            src: imgASrc.value,
            class: "fg-img",
            style: normalizeStyle({ clipPath: currentClipPath.value })
          }, null, 12, _hoisted_6)) : createCommentVNode("", true),
          imgASrc.value && imgBSrc.value ? (openBlock(), createElementBlock("div", {
            key: 3,
            class: "slider-line",
            style: normalizeStyle(sliderLineStyle.value)
          }, null, 4)) : createCommentVNode("", true)
        ], 544)
      ], 32);
    };
  }
});
const ImageCompare = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-68481dbe"]]);
app.registerExtension({
  name: "Duffy.ImageCompare.Vue",
  async nodeCreated(node) {
    var _a;
    if (node.comfyClass !== "Duffy_ImageCompare") return;
    node.color = "#2B4E5C";
    node.bgcolor = "#1A2F38";
    const MIN_W = 512;
    const MIN_H = 512;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "compare_state");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.hidden = true;
      dataWidget.computeSize = () => [0, 0];
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (app.canvas) app.canvas.processContextMenu(node, e);
    });
    const vueApp = createApp(ImageCompare, {
      onChange: (json) => {
        if (dataWidget) Object.assign(dataWidget, { value: json });
        node.setDirtyCanvas(true, true);
      },
      nodeId: node.id
    });
    const instance = vueApp.mount(container);
    const origOnExecuted = node.onExecuted;
    node.onExecuted = function(message) {
      origOnExecuted == null ? void 0 : origOnExecuted.apply(this, arguments);
      if (message == null ? void 0 : message.compare_images) {
        instance.setImages(message.compare_images);
      }
    };
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => [MIN_W, MIN_H];
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    setTimeout(() => {
      if (node.size && (node.size[0] < MIN_W || node.size[1] < MIN_H)) {
        node.size = [Math.max(MIN_W, node.size[0]), Math.max(MIN_H, node.size[1])];
        node.setDirtyCanvas(true, true);
      }
    }, 100);
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
