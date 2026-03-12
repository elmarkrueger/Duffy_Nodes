import { d as defineComponent, o as onMounted, a as onUnmounted, b as openBlock, c as createElementBlock, e as createBaseVNode, k as normalizeClass, F as Fragment, r as renderList, m as normalizeStyle, g as createCommentVNode, w as withDirectives, p as vModelSelect, t as toDisplayString, f as createTextVNode, h as ref, j as computed, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-CojN6hzB.js";
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
    var _a, _b, _c;
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
