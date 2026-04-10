import { d as defineComponent, o as onMounted, a as onUnmounted, b as openBlock, c as createElementBlock, e as createBaseVNode, t as toDisplayString, f as createTextVNode, g as createCommentVNode, F as Fragment, r as renderList, h as ref, j as computed, n as nextTick, k as normalizeClass, l as withModifiers, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-CojN6hzB.js";
import { app } from "../../../scripts/app.js";
import { f as fabric } from "./fabric-CMDe1F3Z.js";
import { api } from "../../../scripts/api.js";
const _hoisted_1 = {
  key: 0,
  class: "layer-control-root"
};
const _hoisted_2 = { class: "workspace-grid" };
const _hoisted_3 = { class: "canvas-shell" };
const _hoisted_4 = { class: "canvas-meta" };
const _hoisted_5 = { key: 0 };
const _hoisted_6 = { class: "sidebar" };
const _hoisted_7 = { class: "sidebar-card" };
const _hoisted_8 = { class: "layer-list" };
const _hoisted_9 = ["onClick"];
const _hoisted_10 = ["checked", "onChange"];
const _hoisted_11 = {
  key: 0,
  class: "sidebar-card"
};
const _hoisted_12 = { class: "card-title-row" };
const _hoisted_13 = { class: "card-kicker" };
const _hoisted_14 = { class: "field-grid two-col" };
const _hoisted_15 = ["value"];
const _hoisted_16 = ["value"];
const _hoisted_17 = ["value"];
const _hoisted_18 = ["value"];
const _hoisted_19 = ["value"];
const _hoisted_20 = ["value"];
const _hoisted_21 = { class: "field-grid" };
const _hoisted_22 = ["value"];
const _hoisted_23 = ["value"];
const _hoisted_24 = ["value"];
const _hoisted_25 = { class: "button-grid" };
const _hoisted_26 = {
  key: 1,
  class: "sidebar-card empty-card"
};
const _hoisted_27 = {
  key: 1,
  class: "idle-state"
};
const _hoisted_28 = { key: 0 };
const _hoisted_29 = { key: 0 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AdvancedLayerControl",
  props: {
    nodeId: {},
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const LAYER_IDS = ["object_1", "object_2", "object_3", "object_4", "object_5"];
    const DEFAULT_POSITIONS = {
      object_1: [0.5, 0.5],
      object_2: [0.32, 0.42],
      object_3: [0.68, 0.42],
      object_4: [0.4, 0.68],
      object_5: [0.6, 0.68]
    };
    const canvasRef = ref(null);
    const stageRef = ref(null);
    const isActive = ref(false);
    const sessionId = ref("");
    const selectedSlotId = ref(null);
    const savedState = ref({ version: 1, layers: {} });
    const availableObjects = ref({});
    const canvasWidth = ref(0);
    const canvasHeight = ref(0);
    let canvas = null;
    let emitTimer = null;
    let stageResizeObserver = null;
    let isRestoring = false;
    const fabricObjects = /* @__PURE__ */ new Map();
    function defaultLayerState(slotId, sourceWidth = 0, sourceHeight = 0) {
      const [x, y] = DEFAULT_POSITIONS[slotId] || [0.5, 0.5];
      const fitWidth = sourceWidth > 0 ? canvasWidth.value * 0.45 / sourceWidth : 1;
      const fitHeight = sourceHeight > 0 ? canvasHeight.value * 0.45 / sourceHeight : 1;
      const scale = Math.max(0.05, Math.min(1, fitWidth || 1, fitHeight || 1));
      return {
        enabled: true,
        x,
        y,
        scaleX: scale,
        scaleY: scale,
        angle: 0,
        flipX: false,
        flipY: false,
        zIndex: LAYER_IDS.indexOf(slotId),
        sourceWidth,
        sourceHeight
      };
    }
    function toNumber(value, fallback) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : fallback;
    }
    function toBool(value, fallback) {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
      if (typeof value === "number") return Boolean(value);
      return fallback;
    }
    function coerceSavedState(input) {
      let parsed = input;
      if (typeof input === "string" && input) {
        try {
          parsed = JSON.parse(input);
        } catch {
          parsed = { version: 1, layers: {} };
        }
      }
      const maybeObject = parsed && typeof parsed === "object" ? parsed : {};
      const rawLayers = maybeObject.layers && typeof maybeObject.layers === "object" ? maybeObject.layers : {};
      const layers = {};
      for (const slotId of LAYER_IDS) {
        const raw = rawLayers[slotId];
        if (!raw || typeof raw !== "object") continue;
        const base = defaultLayerState(slotId, toNumber(raw.sourceWidth, 0), toNumber(raw.sourceHeight, 0));
        layers[slotId] = {
          enabled: toBool(raw.enabled, base.enabled),
          x: toNumber(raw.x, base.x),
          y: toNumber(raw.y, base.y),
          scaleX: Math.max(0.01, Math.abs(toNumber(raw.scaleX, base.scaleX))),
          scaleY: Math.max(0.01, Math.abs(toNumber(raw.scaleY, base.scaleY))),
          angle: toNumber(raw.angle, base.angle),
          flipX: toBool(raw.flipX, base.flipX),
          flipY: toBool(raw.flipY, base.flipY),
          zIndex: Math.max(0, Math.round(toNumber(raw.zIndex, base.zIndex))),
          sourceWidth: Math.max(0, Math.round(toNumber(raw.sourceWidth, base.sourceWidth))),
          sourceHeight: Math.max(0, Math.round(toNumber(raw.sourceHeight, base.sourceHeight)))
        };
      }
      return {
        version: Math.max(1, Math.round(toNumber(maybeObject.version, 1))),
        layers
      };
    }
    function serialise() {
      return JSON.stringify(savedState.value);
    }
    function deserialise(json) {
      savedState.value = coerceSavedState(json);
    }
    function queueEmitChange() {
      if (!props.onChange || isRestoring) return;
      if (emitTimer) clearTimeout(emitTimer);
      emitTimer = setTimeout(() => {
        var _a;
        (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
      }, 40);
    }
    function getLayerState(slotId) {
      var _a, _b;
      if (!savedState.value.layers[slotId]) {
        const sourceWidth = ((_a = fabricObjects.get(slotId)) == null ? void 0 : _a.width) ?? 0;
        const sourceHeight = ((_b = fabricObjects.get(slotId)) == null ? void 0 : _b.height) ?? 0;
        savedState.value.layers[slotId] = defaultLayerState(slotId, sourceWidth, sourceHeight);
      }
      return savedState.value.layers[slotId];
    }
    const availableLayerIds = computed(() => {
      return Object.keys(availableObjects.value).sort((left, right) => LAYER_IDS.indexOf(left) - LAYER_IDS.indexOf(right));
    });
    const selectedLayer = computed(() => {
      if (!selectedSlotId.value) return null;
      return getLayerState(selectedSlotId.value);
    });
    const savedLayerCount = computed(() => Object.keys(savedState.value.layers).length);
    function configureObject(object) {
      object.set({
        originX: "center",
        originY: "center",
        cornerColor: "#df7f2f",
        cornerStrokeColor: "#fff2dc",
        borderColor: "#df7f2f",
        cornerSize: 10,
        transparentCorners: false,
        padding: 4,
        lockUniScaling: false
      });
    }
    function updateSelectionFromCanvas() {
      var _a;
      const active = canvas == null ? void 0 : canvas.getActiveObject();
      const slotId = (_a = active == null ? void 0 : active.data) == null ? void 0 : _a.slotId;
      selectedSlotId.value = typeof slotId === "string" ? slotId : null;
    }
    function updateZIndicesFromCanvas() {
      if (!canvas) return;
      const objects = canvas.getObjects();
      objects.forEach((object, index) => {
        var _a;
        const slotId = (_a = object.data) == null ? void 0 : _a.slotId;
        if (typeof slotId === "string") {
          getLayerState(slotId).zIndex = index;
        }
      });
    }
    function syncStateFromObject(slotId) {
      const object = fabricObjects.get(slotId);
      if (!object) return;
      const layer = getLayerState(slotId);
      layer.x = canvasWidth.value > 0 ? Number(((object.left ?? 0) / canvasWidth.value).toFixed(6)) : layer.x;
      layer.y = canvasHeight.value > 0 ? Number(((object.top ?? 0) / canvasHeight.value).toFixed(6)) : layer.y;
      layer.scaleX = Math.max(0.01, Math.abs(object.scaleX ?? layer.scaleX));
      layer.scaleY = Math.max(0.01, Math.abs(object.scaleY ?? layer.scaleY));
      layer.angle = Number((object.angle ?? 0).toFixed(3));
      layer.flipX = Boolean(object.flipX);
      layer.flipY = Boolean(object.flipY);
      layer.enabled = object.visible !== false;
      layer.sourceWidth = Math.round(object.width ?? layer.sourceWidth);
      layer.sourceHeight = Math.round(object.height ?? layer.sourceHeight);
    }
    function applyStateToObject(slotId) {
      const object = fabricObjects.get(slotId);
      if (!object || !canvas) return;
      const layer = getLayerState(slotId);
      object.set({
        left: layer.x * canvasWidth.value,
        top: layer.y * canvasHeight.value,
        scaleX: Math.max(0.01, layer.scaleX),
        scaleY: Math.max(0.01, layer.scaleY),
        angle: layer.angle,
        flipX: layer.flipX,
        flipY: layer.flipY,
        visible: layer.enabled,
        evented: layer.enabled,
        selectable: layer.enabled
      });
      canvas.requestRenderAll();
    }
    function syncAllStateFromCanvas() {
      for (const slotId of availableLayerIds.value) {
        syncStateFromObject(slotId);
      }
      updateZIndicesFromCanvas();
    }
    function selectLayer(slotId) {
      selectedSlotId.value = slotId;
      const object = fabricObjects.get(slotId);
      if (!object || !canvas || object.visible === false) {
        canvas == null ? void 0 : canvas.discardActiveObject();
        canvas == null ? void 0 : canvas.requestRenderAll();
        return;
      }
      canvas.setActiveObject(object);
      canvas.requestRenderAll();
    }
    function toggleLayerEnabled(slotId, enabled) {
      const layer = getLayerState(slotId);
      layer.enabled = enabled;
      applyStateToObject(slotId);
      if (!enabled && selectedSlotId.value === slotId) {
        selectedSlotId.value = null;
        canvas == null ? void 0 : canvas.discardActiveObject();
      }
      queueEmitChange();
    }
    function updateSelectedNumber(key, event) {
      if (!selectedSlotId.value) return;
      const target = event.target;
      const layer = getLayerState(selectedSlotId.value);
      const nextValue = toNumber(target.value, layer[key]);
      if (key === "scaleX" || key === "scaleY") {
        layer[key] = Math.max(0.01, Math.abs(nextValue));
      } else {
        layer[key] = nextValue;
      }
      applyStateToObject(selectedSlotId.value);
      queueEmitChange();
    }
    function toggleFlip(key) {
      if (!selectedSlotId.value) return;
      const layer = getLayerState(selectedSlotId.value);
      layer[key] = !layer[key];
      applyStateToObject(selectedSlotId.value);
      queueEmitChange();
    }
    function resetSelectedLayer() {
      if (!selectedSlotId.value) return;
      const object = fabricObjects.get(selectedSlotId.value);
      const layer = defaultLayerState(selectedSlotId.value, Math.round((object == null ? void 0 : object.width) ?? 0), Math.round((object == null ? void 0 : object.height) ?? 0));
      layer.zIndex = getLayerState(selectedSlotId.value).zIndex;
      savedState.value.layers[selectedSlotId.value] = layer;
      applyStateToObject(selectedSlotId.value);
      queueEmitChange();
    }
    function centerSelectedLayer() {
      if (!selectedSlotId.value) return;
      const layer = getLayerState(selectedSlotId.value);
      layer.x = 0.5;
      layer.y = 0.5;
      applyStateToObject(selectedSlotId.value);
      queueEmitChange();
    }
    function bringSelectedForward() {
      if (!selectedSlotId.value || !canvas) return;
      const object = fabricObjects.get(selectedSlotId.value);
      if (!object) return;
      canvas.bringForward(object);
      updateZIndicesFromCanvas();
      canvas.requestRenderAll();
      queueEmitChange();
    }
    function sendSelectedBackward() {
      if (!selectedSlotId.value || !canvas) return;
      const object = fabricObjects.get(selectedSlotId.value);
      if (!object) return;
      canvas.sendBackwards(object);
      updateZIndicesFromCanvas();
      canvas.requestRenderAll();
      queueEmitChange();
    }
    function loadFabricImage(url) {
      return new Promise((resolve, reject) => {
        fabric.fabric.Image.fromURL(
          url,
          (image) => {
            if (image) {
              resolve(image);
              return;
            }
            reject(new Error(`Failed to load image: ${url.slice(0, 40)}`));
          },
          { crossOrigin: "anonymous" }
        );
      });
    }
    async function loadPauseData(payload) {
      isActive.value = true;
      await nextTick();
      if (!canvas && canvasRef.value) {
        canvas = new fabric.fabric.Canvas(canvasRef.value, {
          width: 768,
          height: 512,
          backgroundColor: "#0e1116",
          preserveObjectStacking: true,
          stopContextMenu: true,
          selection: true
        });
        canvas.on("selection:created", updateSelectionFromCanvas);
        canvas.on("selection:updated", updateSelectionFromCanvas);
        canvas.on("selection:cleared", updateSelectionFromCanvas);
        canvas.on("object:moving", (e) => {
          var _a, _b;
          const slotId = (_b = (_a = e.target) == null ? void 0 : _a.data) == null ? void 0 : _b.slotId;
          if (typeof slotId === "string") syncStateFromObject(slotId);
        });
        canvas.on("object:scaling", (e) => {
          var _a, _b;
          const slotId = (_b = (_a = e.target) == null ? void 0 : _a.data) == null ? void 0 : _b.slotId;
          if (typeof slotId === "string") syncStateFromObject(slotId);
        });
        canvas.on("object:rotating", (e) => {
          var _a, _b;
          const slotId = (_b = (_a = e.target) == null ? void 0 : _a.data) == null ? void 0 : _b.slotId;
          if (typeof slotId === "string") syncStateFromObject(slotId);
        });
        canvas.on("object:modified", (e) => {
          var _a, _b;
          const slotId = (_b = (_a = e.target) == null ? void 0 : _a.data) == null ? void 0 : _b.slotId;
          if (typeof slotId === "string") {
            syncStateFromObject(slotId);
            updateZIndicesFromCanvas();
            queueEmitChange();
          }
        });
      }
      if (!canvas) return;
      isRestoring = true;
      sessionId.value = String((payload == null ? void 0 : payload.session_id) ?? "");
      const nextState = coerceSavedState((payload == null ? void 0 : payload.saved_state) ?? savedState.value);
      savedState.value = nextState;
      availableObjects.value = {};
      selectedSlotId.value = null;
      fabricObjects.clear();
      canvas.clear();
      canvas.backgroundColor = "#0e1116";
      const background = await loadFabricImage(String((payload == null ? void 0 : payload.background_image) ?? ""));
      canvasWidth.value = Math.round(background.width ?? 1);
      canvasHeight.value = Math.round(background.height ?? 1);
      canvas.setWidth(canvasWidth.value);
      canvas.setHeight(canvasHeight.value);
      background.set({
        originX: "left",
        originY: "top",
        left: 0,
        top: 0,
        selectable: false,
        evented: false
      });
      canvas.setBackgroundImage(background, () => {
        canvas == null ? void 0 : canvas.requestRenderAll();
      });
      canvas.calcOffset();
      const payloadObjects = Array.isArray(payload == null ? void 0 : payload.objects) ? payload.objects : [];
      payloadObjects.sort((left, right) => {
        const leftState = savedState.value.layers[left.slotId] ?? defaultLayerState(left.slotId);
        const rightState = savedState.value.layers[right.slotId] ?? defaultLayerState(right.slotId);
        return leftState.zIndex - rightState.zIndex;
      });
      for (const item of payloadObjects) {
        availableObjects.value[item.slotId] = item;
        const image = await loadFabricImage(item.image_b64);
        const sourceWidth = Math.round(image.width ?? 0);
        const sourceHeight = Math.round(image.height ?? 0);
        const existing = savedState.value.layers[item.slotId];
        const baseState = defaultLayerState(item.slotId, sourceWidth, sourceHeight);
        const merged = {
          ...baseState,
          ...item.state ?? {},
          ...existing ?? {},
          sourceWidth,
          sourceHeight
        };
        merged.scaleX = Math.max(0.01, Math.abs(merged.scaleX));
        merged.scaleY = Math.max(0.01, Math.abs(merged.scaleY));
        savedState.value.layers[item.slotId] = merged;
        image.set({
          left: merged.x * canvasWidth.value,
          top: merged.y * canvasHeight.value,
          scaleX: merged.scaleX,
          scaleY: merged.scaleY,
          angle: merged.angle,
          flipX: merged.flipX,
          flipY: merged.flipY,
          visible: merged.enabled,
          selectable: merged.enabled,
          evented: merged.enabled
        });
        image.data = { slotId: item.slotId };
        configureObject(image);
        canvas.add(image);
        fabricObjects.set(item.slotId, image);
      }
      updateZIndicesFromCanvas();
      if (availableLayerIds.value.length > 0) {
        const nextSelected = availableLayerIds.value.find((slotId) => getLayerState(slotId).enabled) ?? availableLayerIds.value[0];
        selectLayer(nextSelected);
      }
      if (!stageResizeObserver && stageRef.value) {
        stageResizeObserver = new ResizeObserver((entries) => {
          if (!canvas || canvasWidth.value === 0 || canvasHeight.value === 0) return;
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            const scaleX = width / canvasWidth.value;
            const scaleY = height / canvasHeight.value;
            const scale = Math.min(scaleX, scaleY);
            canvas.setZoom(scale);
            canvas.setWidth(canvasWidth.value * scale);
            canvas.setHeight(canvasHeight.value * scale);
          }
        });
        stageResizeObserver.observe(stageRef.value);
      }
      canvas.requestRenderAll();
      isRestoring = false;
      queueEmitChange();
    }
    async function applyAndContinue() {
      var _a;
      if (!sessionId.value) return;
      syncAllStateFromCanvas();
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
      try {
        await fetch("/duffy/layer_control/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId.value,
            state: savedState.value
          })
        });
        isActive.value = false;
        sessionId.value = "";
        if (canvas) {
          canvas.dispose();
          canvas = null;
        }
        fabricObjects.clear();
      } catch (error) {
        console.error("Failed to resume layer control", error);
      }
    }
    function onExecuting(event) {
      const executingId = event.detail ? String(event.detail) : null;
      if (executingId === null || executingId === "-1") {
        isActive.value = false;
      }
    }
    function onLayerControlPause(event) {
      loadPauseData(event.detail).catch((error) => {
        console.error("Failed to initialise Advanced Layer Control", error);
      });
    }
    function cleanup() {
      api.removeEventListener("executing", onExecuting);
      api.removeEventListener("duffy-layer-control-pause", onLayerControlPause);
      if (stageResizeObserver) {
        stageResizeObserver.disconnect();
        stageResizeObserver = null;
      }
      if (emitTimer) {
        clearTimeout(emitTimer);
        emitTimer = null;
      }
      if (canvas) {
        canvas.dispose();
        canvas = null;
      }
      fabricObjects.clear();
    }
    onMounted(() => {
      api.addEventListener("executing", onExecuting);
      api.addEventListener("duffy-layer-control-pause", onLayerControlPause);
    });
    onUnmounted(() => {
      cleanup();
    });
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return isActive.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", { class: "layer-header" }, [
          _cache[11] || (_cache[11] = createBaseVNode("div", null, [
            createBaseVNode("h3", null, "Advanced Layer Control"),
            createBaseVNode("p", null, "Drag layers directly on the canvas, then fine-tune scale, rotation, mirroring, and order.")
          ], -1)),
          createBaseVNode("button", {
            class: "apply-button",
            type: "button",
            onClick: applyAndContinue
          }, "Apply & Continue")
        ]),
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("div", _hoisted_4, [
              createBaseVNode("span", null, toDisplayString(canvasWidth.value) + " x " + toDisplayString(canvasHeight.value), 1),
              createBaseVNode("span", null, [
                createTextVNode(toDisplayString(availableLayerIds.value.length) + " connected layer", 1),
                availableLayerIds.value.length !== 1 ? (openBlock(), createElementBlock("span", _hoisted_5, "s")) : createCommentVNode("", true)
              ])
            ]),
            createBaseVNode("div", {
              class: "canvas-stage",
              ref_key: "stageRef",
              ref: stageRef
            }, [
              createBaseVNode("canvas", {
                ref_key: "canvasRef",
                ref: canvasRef
              }, null, 512)
            ], 512)
          ]),
          createBaseVNode("div", _hoisted_6, [
            createBaseVNode("section", _hoisted_7, [
              _cache[12] || (_cache[12] = createBaseVNode("div", { class: "card-title-row" }, [
                createBaseVNode("h4", null, "Layers"),
                createBaseVNode("span", { class: "card-kicker" }, "Connected inputs only")
              ], -1)),
              createBaseVNode("div", _hoisted_8, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(availableLayerIds.value, (slotId) => {
                  return openBlock(), createElementBlock("button", {
                    key: slotId,
                    type: "button",
                    class: normalizeClass(["layer-item", { selected: slotId === selectedSlotId.value }]),
                    onClick: ($event) => selectLayer(slotId)
                  }, [
                    createBaseVNode("div", null, [
                      createBaseVNode("strong", null, toDisplayString(slotId), 1),
                      createBaseVNode("small", null, "Z " + toDisplayString(getLayerState(slotId).zIndex + 1), 1)
                    ]),
                    createBaseVNode("label", {
                      class: "visibility-toggle",
                      onClick: _cache[0] || (_cache[0] = withModifiers(() => {
                      }, ["stop"]))
                    }, [
                      createBaseVNode("input", {
                        checked: getLayerState(slotId).enabled,
                        type: "checkbox",
                        onChange: ($event) => toggleLayerEnabled(slotId, $event.target.checked)
                      }, null, 40, _hoisted_10),
                      createBaseVNode("span", null, toDisplayString(getLayerState(slotId).enabled ? "Visible" : "Hidden"), 1)
                    ])
                  ], 10, _hoisted_9);
                }), 128))
              ])
            ]),
            selectedLayer.value ? (openBlock(), createElementBlock("section", _hoisted_11, [
              createBaseVNode("div", _hoisted_12, [
                _cache[13] || (_cache[13] = createBaseVNode("h4", null, "Selected Layer", -1)),
                createBaseVNode("span", _hoisted_13, toDisplayString(selectedSlotId.value), 1)
              ]),
              createBaseVNode("div", _hoisted_14, [
                createBaseVNode("label", null, [
                  _cache[14] || (_cache[14] = createBaseVNode("span", null, "Center X", -1)),
                  createBaseVNode("input", {
                    value: selectedLayer.value.x.toFixed(3),
                    type: "number",
                    step: "0.01",
                    onInput: _cache[1] || (_cache[1] = ($event) => updateSelectedNumber("x", $event))
                  }, null, 40, _hoisted_15)
                ]),
                createBaseVNode("label", null, [
                  _cache[15] || (_cache[15] = createBaseVNode("span", null, "Center Y", -1)),
                  createBaseVNode("input", {
                    value: selectedLayer.value.y.toFixed(3),
                    type: "number",
                    step: "0.01",
                    onInput: _cache[2] || (_cache[2] = ($event) => updateSelectedNumber("y", $event))
                  }, null, 40, _hoisted_16)
                ]),
                createBaseVNode("label", null, [
                  _cache[16] || (_cache[16] = createBaseVNode("span", null, "Scale X", -1)),
                  createBaseVNode("input", {
                    value: selectedLayer.value.scaleX.toFixed(3),
                    type: "number",
                    min: "0.01",
                    step: "0.01",
                    onInput: _cache[3] || (_cache[3] = ($event) => updateSelectedNumber("scaleX", $event))
                  }, null, 40, _hoisted_17)
                ]),
                createBaseVNode("label", null, [
                  _cache[17] || (_cache[17] = createBaseVNode("span", null, "Scale Y", -1)),
                  createBaseVNode("input", {
                    value: selectedLayer.value.scaleY.toFixed(3),
                    type: "number",
                    min: "0.01",
                    step: "0.01",
                    onInput: _cache[4] || (_cache[4] = ($event) => updateSelectedNumber("scaleY", $event))
                  }, null, 40, _hoisted_18)
                ]),
                createBaseVNode("label", null, [
                  _cache[18] || (_cache[18] = createBaseVNode("span", null, "Rotation", -1)),
                  createBaseVNode("input", {
                    value: selectedLayer.value.angle.toFixed(1),
                    type: "number",
                    step: "1",
                    onInput: _cache[5] || (_cache[5] = ($event) => updateSelectedNumber("angle", $event))
                  }, null, 40, _hoisted_19)
                ]),
                createBaseVNode("label", null, [
                  _cache[19] || (_cache[19] = createBaseVNode("span", null, "Width", -1)),
                  createBaseVNode("input", {
                    value: selectedLayer.value.sourceWidth,
                    type: "number",
                    disabled: ""
                  }, null, 8, _hoisted_20)
                ])
              ]),
              createBaseVNode("div", _hoisted_21, [
                createBaseVNode("label", null, [
                  _cache[20] || (_cache[20] = createBaseVNode("span", null, "Scale X", -1)),
                  createBaseVNode("input", {
                    value: selectedLayer.value.scaleX,
                    type: "range",
                    min: "0.05",
                    max: "3",
                    step: "0.01",
                    onInput: _cache[6] || (_cache[6] = ($event) => updateSelectedNumber("scaleX", $event))
                  }, null, 40, _hoisted_22)
                ]),
                createBaseVNode("label", null, [
                  _cache[21] || (_cache[21] = createBaseVNode("span", null, "Scale Y", -1)),
                  createBaseVNode("input", {
                    value: selectedLayer.value.scaleY,
                    type: "range",
                    min: "0.05",
                    max: "3",
                    step: "0.01",
                    onInput: _cache[7] || (_cache[7] = ($event) => updateSelectedNumber("scaleY", $event))
                  }, null, 40, _hoisted_23)
                ]),
                createBaseVNode("label", null, [
                  _cache[22] || (_cache[22] = createBaseVNode("span", null, "Rotation", -1)),
                  createBaseVNode("input", {
                    value: selectedLayer.value.angle,
                    type: "range",
                    min: "-180",
                    max: "180",
                    step: "1",
                    onInput: _cache[8] || (_cache[8] = ($event) => updateSelectedNumber("angle", $event))
                  }, null, 40, _hoisted_24)
                ])
              ]),
              createBaseVNode("div", _hoisted_25, [
                createBaseVNode("button", {
                  type: "button",
                  onClick: _cache[9] || (_cache[9] = ($event) => toggleFlip("flipX"))
                }, "Mirror X"),
                createBaseVNode("button", {
                  type: "button",
                  onClick: _cache[10] || (_cache[10] = ($event) => toggleFlip("flipY"))
                }, "Mirror Y"),
                createBaseVNode("button", {
                  type: "button",
                  onClick: bringSelectedForward
                }, "Bring Forward"),
                createBaseVNode("button", {
                  type: "button",
                  onClick: sendSelectedBackward
                }, "Send Backward"),
                createBaseVNode("button", {
                  type: "button",
                  onClick: centerSelectedLayer
                }, "Center"),
                createBaseVNode("button", {
                  type: "button",
                  class: "danger",
                  onClick: resetSelectedLayer
                }, "Reset Transform")
              ])
            ])) : (openBlock(), createElementBlock("section", _hoisted_26, [..._cache[23] || (_cache[23] = [
              createBaseVNode("h4", null, "No Layer Selected", -1),
              createBaseVNode("p", null, "Select a connected object layer to adjust its transform numerically or change its z-order.", -1)
            ])]))
          ])
        ])
      ])) : (openBlock(), createElementBlock("div", _hoisted_27, [
        _cache[25] || (_cache[25] = createBaseVNode("div", { class: "pulse" }, null, -1)),
        _cache[26] || (_cache[26] = createBaseVNode("p", null, "Waiting for image pipeline...", -1)),
        savedLayerCount.value > 0 ? (openBlock(), createElementBlock("small", _hoisted_28, [
          createTextVNode(toDisplayString(savedLayerCount.value) + " saved layer transform", 1),
          savedLayerCount.value !== 1 ? (openBlock(), createElementBlock("span", _hoisted_29, "s")) : createCommentVNode("", true),
          _cache[24] || (_cache[24] = createTextVNode(" ready.", -1))
        ])) : createCommentVNode("", true)
      ]));
    };
  }
});
const AdvancedLayerControl = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a197c0be"]]);
const MIN_W = 980;
const MIN_H = 760;
app.registerExtension({
  name: "Duffy.AdvancedLayerControl.Vue",
  async nodeCreated(node) {
    var _a, _b, _c;
    if (node.comfyClass !== "Duffy_AdvancedLayerControl") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((widget) => widget.name === "saved_layers");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.hidden = true;
      dataWidget.computeSize = () => [0, 0];
      dataWidget.draw = () => {
      };
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden; position:relative; isolation:isolate;";
    container.addEventListener("pointerdown", (event) => event.stopPropagation());
    container.addEventListener("wheel", (event) => event.stopPropagation());
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = app.canvas;
      if (canvas) canvas.processContextMenu(node, e);
    });
    const vueApp = createApp(AdvancedLayerControl, {
      nodeId: String(node.id),
      onChange: (json) => {
        var _a2;
        if (dataWidget) {
          dataWidget.value = json;
        }
        (_a2 = node.setDirtyCanvas) == null ? void 0 : _a2.call(node, true, true);
      }
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("advanced_layer_control_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => [MIN_W, MIN_H];
    domWidget.content = container;
    (_b = node.setSize) == null ? void 0 : _b.call(node, [MIN_W, MIN_H]);
    (_c = node.setDirtyCanvas) == null ? void 0 : _c.call(node, true, true);
    if (dataWidget == null ? void 0 : dataWidget.value) {
      instance.deserialise(dataWidget.value);
    }
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
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
