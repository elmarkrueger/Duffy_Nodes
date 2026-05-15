import { app } from "../../../scripts/app.js";
import { d as defineComponent, b as ref, D as watch, f as onMounted, q as onBeforeUnmount, o as openBlock, c as createElementBlock, a as createBaseVNode, w as withDirectives, p as vModelSelect, F as Fragment, r as renderList, t as toDisplayString, j as normalizeClass, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-CusGlrPr.js";
const _hoisted_1 = { class: "selector-row" };
const _hoisted_2 = ["value"];
const _hoisted_3 = {
  key: 0,
  class: "preview-row"
};
const _hoisted_4 = { class: "preview-image-wrap" };
const _hoisted_5 = ["src", "alt"];
const _hoisted_6 = {
  key: 1,
  class: "preview-fallback"
};
const _hoisted_7 = { class: "preview-meta" };
const _hoisted_8 = { class: "preview-title" };
const _hoisted_9 = { class: "preview-id" };
const _hoisted_10 = {
  key: 1,
  class: "compact-meta"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ImageStyler",
  props: {
    options: {},
    initialStyle: {},
    thumbnailBaseUrl: {},
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const IMAGE_EXTENSIONS = [".jpeg", ".jpg", ".png", ".webp"];
    const props = __props;
    const selectedStyle = ref(
      props.initialStyle && props.options.includes(props.initialStyle) ? props.initialStyle : props.options[0] || ""
    );
    const extensionIndex = ref({});
    const missingStyles = ref({});
    const rootRef = ref(null);
    const isCompact = ref(false);
    let resizeObserver = null;
    function updateCompactMode() {
      var _a;
      const height = ((_a = rootRef.value) == null ? void 0 : _a.clientHeight) ?? 0;
      isCompact.value = height > 0 && height < 138;
    }
    function formatStyleName(style) {
      if (!style) return "No Style";
      return style.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    }
    function getImageSrc(style) {
      const idx = extensionIndex.value[style] ?? 0;
      const ext = IMAGE_EXTENSIONS[Math.min(idx, IMAGE_EXTENSIONS.length - 1)];
      return `${props.thumbnailBaseUrl}${style}${ext}`;
    }
    function onImageError(style) {
      const idx = extensionIndex.value[style] ?? 0;
      if (idx < IMAGE_EXTENSIONS.length - 1) {
        extensionIndex.value[style] = idx + 1;
        return;
      }
      missingStyles.value[style] = true;
    }
    function isMissing(style) {
      return !!missingStyles.value[style];
    }
    watch(
      () => selectedStyle.value,
      (style) => {
        var _a;
        if (style) (_a = props.onChange) == null ? void 0 : _a.call(props, style);
      },
      { immediate: true }
    );
    watch(
      () => props.options,
      (next) => {
        if (!next.length) {
          selectedStyle.value = "";
          return;
        }
        if (!next.includes(selectedStyle.value)) {
          selectedStyle.value = next[0];
        }
      }
    );
    function deserialise(style) {
      if (!style || !props.options.includes(style)) return;
      selectedStyle.value = style;
    }
    function cleanup() {
      resizeObserver == null ? void 0 : resizeObserver.disconnect();
      resizeObserver = null;
    }
    onMounted(() => {
      updateCompactMode();
      if (!rootRef.value) return;
      resizeObserver = new ResizeObserver(() => updateCompactMode());
      resizeObserver.observe(rootRef.value);
    });
    onBeforeUnmount(() => {
      cleanup();
    });
    __expose({ deserialise, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "rootRef",
        ref: rootRef,
        class: normalizeClass(["image-styler-root", { compact: isCompact.value }])
      }, [
        _cache[4] || (_cache[4] = createBaseVNode("div", { class: "styler-header" }, [
          createBaseVNode("p", { class: "eyebrow" }, "LLM STYLE CONTROLLER"),
          createBaseVNode("h3", null, "Image Styler")
        ], -1)),
        createBaseVNode("div", _hoisted_1, [
          _cache[2] || (_cache[2] = createBaseVNode("label", { for: "style-select" }, "Style", -1)),
          withDirectives(createBaseVNode("select", {
            id: "style-select",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedStyle.value = $event),
            class: "style-select"
          }, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(__props.options, (style) => {
              return openBlock(), createElementBlock("option", {
                key: style,
                value: style
              }, toDisplayString(formatStyleName(style)), 9, _hoisted_2);
            }), 128))
          ], 512), [
            [vModelSelect, selectedStyle.value]
          ])
        ]),
        !isCompact.value ? (openBlock(), createElementBlock("div", _hoisted_3, [
          createBaseVNode("div", _hoisted_4, [
            selectedStyle.value && !isMissing(selectedStyle.value) ? (openBlock(), createElementBlock("img", {
              key: 0,
              src: getImageSrc(selectedStyle.value),
              alt: selectedStyle.value,
              onError: _cache[1] || (_cache[1] = ($event) => onImageError(selectedStyle.value)),
              class: "preview-image"
            }, null, 40, _hoisted_5)) : (openBlock(), createElementBlock("div", _hoisted_6, "NO PREVIEW"))
          ]),
          createBaseVNode("div", _hoisted_7, [
            _cache[3] || (_cache[3] = createBaseVNode("p", { class: "preview-label" }, "Selected Style", -1)),
            createBaseVNode("p", _hoisted_8, toDisplayString(formatStyleName(selectedStyle.value)), 1),
            createBaseVNode("p", _hoisted_9, toDisplayString(selectedStyle.value), 1)
          ])
        ])) : (openBlock(), createElementBlock("div", _hoisted_10, " Selected: " + toDisplayString(formatStyleName(selectedStyle.value)), 1))
      ], 2);
    };
  }
});
const ImageStyler = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-6c57c0f0"]]);
app.registerExtension({
  name: "Duffy.ImageStyler.Vue",
  async nodeCreated(node) {
    var _a, _b, _c, _d;
    if (node.comfyClass !== "Duffy_ImageStyler") return;
    const styleWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "style");
    if (!styleWidget) return;
    styleWidget.type = "hidden";
    styleWidget.hidden = true;
    styleWidget.computeSize = () => [0, 0];
    styleWidget.draw = () => {
    };
    const options = Array.isArray(styleWidget.options) ? styleWidget.options : ((_b = styleWidget.options) == null ? void 0 : _b.values) || [];
    const container = document.createElement("div");
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("mousedown", (e) => e.stopPropagation());
    container.addEventListener("mouseup", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = app.canvas;
      if (canvas) canvas.processContextMenu(node, e);
    });
    const runtimeAssetBaseUrl = new URL(import.meta.url);
    runtimeAssetBaseUrl.pathname = runtimeAssetBaseUrl.pathname.replace(/\/js\/[^/]+$/, "/image_styler/");
    runtimeAssetBaseUrl.search = "";
    runtimeAssetBaseUrl.hash = "";
    const thumbnailBaseUrl = runtimeAssetBaseUrl.toString();
    const vueApp = createApp(ImageStyler, {
      options,
      initialStyle: styleWidget.value,
      thumbnailBaseUrl,
      onChange: (style) => {
        styleWidget.value = style;
        node.setDirtyCanvas(true, true);
      }
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    const VERTICAL_MARGIN = 8;
    const CONTENT_MIN_H = 156;
    domWidget.computeSize = () => {
      const currentW = Array.isArray(node.size) && node.size.length >= 2 ? node.size[0] : 340;
      const currentH = Array.isArray(node.size) && node.size.length >= 2 ? node.size[1] : 200;
      return [
        Math.max(340, currentW),
        Math.max(CONTENT_MIN_H, currentH - VERTICAL_MARGIN)
      ];
    };
    domWidget.content = container;
    const MIN_W = 340;
    const MIN_H = 214;
    function clampSize(size) {
      return [
        Math.max(MIN_W, size[0]),
        Math.max(MIN_H, size[1])
      ];
    }
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      const [nextW, nextH] = clampSize(size);
      size[0] = nextW;
      size[1] = nextH;
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    const initialSize = Array.isArray(node.size) && node.size.length >= 2 ? [node.size[0], node.size[1]] : [MIN_W, MIN_H];
    (_c = node.setSize) == null ? void 0 : _c.call(node, clampSize(initialSize));
    (_d = node.setDirtyCanvas) == null ? void 0 : _d.call(node, true, true);
    if (styleWidget.value) {
      instance.deserialise(styleWidget.value);
    }
    const origConfigure = node.configure;
    node.configure = function(info) {
      var _a2;
      origConfigure == null ? void 0 : origConfigure.call(this, info);
      if (styleWidget.value) instance.deserialise(styleWidget.value);
      if (Array.isArray(this.size) && this.size.length >= 2) {
        const nextSize = clampSize([this.size[0], this.size[1]]);
        (_a2 = this.setSize) == null ? void 0 : _a2.call(this, nextSize);
      }
    };
    const origWidgetCallback = styleWidget.callback;
    styleWidget.callback = function(value) {
      instance.deserialise(value);
      if (origWidgetCallback) origWidgetCallback.apply(this, arguments);
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
