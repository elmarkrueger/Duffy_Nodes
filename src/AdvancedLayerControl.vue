<template>
  <div v-if="isActive" class="layer-control-root">
    <div class="layer-header">
      <div>
        <h3>Advanced Layer Control</h3>
        <p>Drag layers directly on the canvas, then fine-tune scale, rotation, mirroring, and order.</p>
      </div>
      <button class="apply-button" type="button" @click="applyAndContinue">Apply & Continue</button>
    </div>

    <div class="workspace-grid">
      <div class="canvas-shell">
        <div class="canvas-meta">
          <span>{{ canvasWidth }} x {{ canvasHeight }}</span>
          <span>{{ availableLayerIds.length }} connected layer<span v-if="availableLayerIds.length !== 1">s</span></span>
        </div>
        <div class="canvas-stage" ref="stageRef">
          <canvas ref="canvasRef"></canvas>
        </div>
      </div>

      <div class="sidebar">
        <section class="sidebar-card">
          <div class="card-title-row">
            <h4>Layers</h4>
            <span class="card-kicker">Connected inputs only</span>
          </div>
          <div class="layer-list">
            <button
              v-for="slotId in availableLayerIds"
              :key="slotId"
              type="button"
              class="layer-item"
              :class="{ selected: slotId === selectedSlotId }"
              @click="selectLayer(slotId)"
            >
              <div>
                <strong>{{ slotId }}</strong>
                <small>Z {{ getLayerState(slotId).zIndex + 1 }}</small>
              </div>
              <label class="visibility-toggle" @click.stop>
                <input
                  :checked="getLayerState(slotId).enabled"
                  type="checkbox"
                  @change="toggleLayerEnabled(slotId, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ getLayerState(slotId).enabled ? 'Visible' : 'Hidden' }}</span>
              </label>
            </button>
          </div>
        </section>

        <section class="sidebar-card" v-if="selectedLayer">
          <div class="card-title-row">
            <h4>Selected Layer</h4>
            <span class="card-kicker">{{ selectedSlotId }}</span>
          </div>

          <div class="field-grid two-col">
            <label>
              <span>Center X</span>
              <input :value="selectedLayer.x.toFixed(3)" type="number" step="0.01" @input="updateSelectedNumber('x', $event)" />
            </label>
            <label>
              <span>Center Y</span>
              <input :value="selectedLayer.y.toFixed(3)" type="number" step="0.01" @input="updateSelectedNumber('y', $event)" />
            </label>
            <label>
              <span>Scale X</span>
              <input :value="selectedLayer.scaleX.toFixed(3)" type="number" min="0.01" step="0.01" @input="updateSelectedNumber('scaleX', $event)" />
            </label>
            <label>
              <span>Scale Y</span>
              <input :value="selectedLayer.scaleY.toFixed(3)" type="number" min="0.01" step="0.01" @input="updateSelectedNumber('scaleY', $event)" />
            </label>
            <label>
              <span>Rotation</span>
              <input :value="selectedLayer.angle.toFixed(1)" type="number" step="1" @input="updateSelectedNumber('angle', $event)" />
            </label>
            <label>
              <span>Width</span>
              <input :value="selectedLayer.sourceWidth" type="number" disabled />
            </label>
          </div>

          <div class="field-grid">
            <label>
              <span>Scale X</span>
              <input :value="selectedLayer.scaleX" type="range" min="0.05" max="3" step="0.01" @input="updateSelectedNumber('scaleX', $event)" />
            </label>
            <label>
              <span>Scale Y</span>
              <input :value="selectedLayer.scaleY" type="range" min="0.05" max="3" step="0.01" @input="updateSelectedNumber('scaleY', $event)" />
            </label>
            <label>
              <span>Rotation</span>
              <input :value="selectedLayer.angle" type="range" min="-180" max="180" step="1" @input="updateSelectedNumber('angle', $event)" />
            </label>
          </div>

          <div class="button-grid">
            <button type="button" @click="toggleFlip('flipX')">Mirror X</button>
            <button type="button" @click="toggleFlip('flipY')">Mirror Y</button>
            <button type="button" @click="bringSelectedForward">Bring Forward</button>
            <button type="button" @click="sendSelectedBackward">Send Backward</button>
            <button type="button" @click="centerSelectedLayer">Center</button>
            <button type="button" class="danger" @click="resetSelectedLayer">Reset Transform</button>
          </div>
        </section>

        <section v-else class="sidebar-card empty-card">
          <h4>No Layer Selected</h4>
          <p>Select a connected object layer to adjust its transform numerically or change its z-order.</p>
        </section>
      </div>
    </div>
  </div>

  <div v-else class="idle-state">
    <div class="pulse"></div>
    <p>Waiting for image pipeline...</p>
    <small v-if="savedLayerCount > 0">{{ savedLayerCount }} saved layer transform<span v-if="savedLayerCount !== 1">s</span> ready.</small>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { fabric } from "fabric";
// @ts-ignore
import { api } from "COMFY_API";

type LayerState = {
  enabled: boolean;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  zIndex: number;
  sourceWidth: number;
  sourceHeight: number;
};

type SavedState = {
  version: number;
  layers: Record<string, LayerState>;
};

type PauseObject = {
  slotId: string;
  label: string;
  image_b64: string;
  state?: Partial<LayerState>;
};

const props = defineProps<{
  nodeId: string;
  onChange?: (json: string) => void;
}>();

const LAYER_IDS = ["object_1", "object_2", "object_3", "object_4", "object_5"];
const DEFAULT_POSITIONS: Record<string, [number, number]> = {
  object_1: [0.5, 0.5],
  object_2: [0.32, 0.42],
  object_3: [0.68, 0.42],
  object_4: [0.4, 0.68],
  object_5: [0.6, 0.68],
};

const canvasRef = ref<HTMLCanvasElement | null>(null);
const stageRef = ref<HTMLDivElement | null>(null);
const isActive = ref(false);
const sessionId = ref("");
const selectedSlotId = ref<string | null>(null);
const savedState = ref<SavedState>({ version: 1, layers: {} });
const availableObjects = ref<Record<string, PauseObject>>({});

const canvasWidth = ref(0);
const canvasHeight = ref(0);

let canvas: fabric.Canvas | null = null;
let emitTimer: ReturnType<typeof setTimeout> | null = null;
let stageResizeObserver: ResizeObserver | null = null;
let isRestoring = false;
const fabricObjects = new Map<string, fabric.Image>();

function defaultLayerState(slotId: string, sourceWidth = 0, sourceHeight = 0): LayerState {
  const [x, y] = DEFAULT_POSITIONS[slotId] || [0.5, 0.5];
  const fitWidth = sourceWidth > 0 ? (canvasWidth.value * 0.45) / sourceWidth : 1;
  const fitHeight = sourceHeight > 0 ? (canvasHeight.value * 0.45) / sourceHeight : 1;
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
    sourceHeight,
  };
}

function toNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  if (typeof value === "number") return Boolean(value);
  return fallback;
}

function coerceSavedState(input: unknown): SavedState {
  let parsed = input;
  if (typeof input === "string" && input) {
    try {
      parsed = JSON.parse(input);
    } catch {
      parsed = { version: 1, layers: {} };
    }
  }

  const maybeObject = parsed && typeof parsed === "object" ? parsed as Record<string, any> : {};
  const rawLayers = maybeObject.layers && typeof maybeObject.layers === "object" ? maybeObject.layers : {};
  const layers: Record<string, LayerState> = {};

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
      sourceHeight: Math.max(0, Math.round(toNumber(raw.sourceHeight, base.sourceHeight))),
    };
  }

  return {
    version: Math.max(1, Math.round(toNumber(maybeObject.version, 1))),
    layers,
  };
}

function serialise() {
  return JSON.stringify(savedState.value);
}

function deserialise(json: string) {
  savedState.value = coerceSavedState(json);
}

function queueEmitChange() {
  if (!props.onChange || isRestoring) return;
  if (emitTimer) clearTimeout(emitTimer);
  emitTimer = setTimeout(() => {
    props.onChange?.(serialise());
  }, 40);
}

function getLayerState(slotId: string): LayerState {
  if (!savedState.value.layers[slotId]) {
    const sourceWidth = fabricObjects.get(slotId)?.width ?? 0;
    const sourceHeight = fabricObjects.get(slotId)?.height ?? 0;
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

function configureObject(object: fabric.Image) {
  object.set({
    originX: "center",
    originY: "center",
    cornerColor: "#df7f2f",
    cornerStrokeColor: "#fff2dc",
    borderColor: "#df7f2f",
    cornerSize: 10,
    transparentCorners: false,
    padding: 4,
    lockUniScaling: false,
  });
}

function updateSelectionFromCanvas() {
  const active = canvas?.getActiveObject() as fabric.Image | undefined;
  const slotId = active?.data?.slotId;
  selectedSlotId.value = typeof slotId === "string" ? slotId : null;
}

function updateZIndicesFromCanvas() {
  if (!canvas) return;
  const objects = canvas.getObjects();
  objects.forEach((object, index) => {
    const slotId = (object as any).data?.slotId;
    if (typeof slotId === "string") {
      getLayerState(slotId).zIndex = index;
    }
  });
}

function syncStateFromObject(slotId: string) {
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

function applyStateToObject(slotId: string) {
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
    selectable: layer.enabled,
  });

  canvas.requestRenderAll();
}

function syncAllStateFromCanvas() {
  for (const slotId of availableLayerIds.value) {
    syncStateFromObject(slotId);
  }
  updateZIndicesFromCanvas();
}

function selectLayer(slotId: string) {
  selectedSlotId.value = slotId;
  const object = fabricObjects.get(slotId);
  if (!object || !canvas || object.visible === false) {
    canvas?.discardActiveObject();
    canvas?.requestRenderAll();
    return;
  }

  canvas.setActiveObject(object);
  canvas.requestRenderAll();
}

function toggleLayerEnabled(slotId: string, enabled: boolean) {
  const layer = getLayerState(slotId);
  layer.enabled = enabled;
  applyStateToObject(slotId);
  if (!enabled && selectedSlotId.value === slotId) {
    selectedSlotId.value = null;
    canvas?.discardActiveObject();
  }
  queueEmitChange();
}

function updateSelectedNumber(key: keyof LayerState, event: Event) {
  if (!selectedSlotId.value) return;
  const target = event.target as HTMLInputElement;
  const layer = getLayerState(selectedSlotId.value);
  const nextValue = toNumber(target.value, layer[key] as number);
  if (key === "scaleX" || key === "scaleY") {
    (layer[key] as number) = Math.max(0.01, Math.abs(nextValue));
  } else {
    (layer[key] as number) = nextValue;
  }
  applyStateToObject(selectedSlotId.value);
  queueEmitChange();
}

function toggleFlip(key: "flipX" | "flipY") {
  if (!selectedSlotId.value) return;
  const layer = getLayerState(selectedSlotId.value);
  layer[key] = !layer[key];
  applyStateToObject(selectedSlotId.value);
  queueEmitChange();
}

function resetSelectedLayer() {
  if (!selectedSlotId.value) return;
  const object = fabricObjects.get(selectedSlotId.value);
  const layer = defaultLayerState(selectedSlotId.value, Math.round(object?.width ?? 0), Math.round(object?.height ?? 0));
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

function loadFabricImage(url: string): Promise<fabric.Image> {
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(
      url,
      (image) => {
        if (image) {
          resolve(image);
          return;
        }
        reject(new Error(`Failed to load image: ${url.slice(0, 40)}`));
      },
      { crossOrigin: "anonymous" },
    );
  });
}

async function loadPauseData(payload: any) {
  isActive.value = true;
  await nextTick();

  if (!canvas && canvasRef.value) {
    canvas = new fabric.Canvas(canvasRef.value, {
      width: 768,
      height: 512,
      backgroundColor: "#0e1116",
      preserveObjectStacking: true,
      stopContextMenu: true,
      selection: true,
    });

    canvas.on("selection:created", updateSelectionFromCanvas);
    canvas.on("selection:updated", updateSelectionFromCanvas);
    canvas.on("selection:cleared", updateSelectionFromCanvas);
    canvas.on("object:moving", (e) => {
      const slotId = (e.target as any)?.data?.slotId;
      if (typeof slotId === "string") syncStateFromObject(slotId);
    });
    canvas.on("object:scaling", (e) => {
      const slotId = (e.target as any)?.data?.slotId;
      if (typeof slotId === "string") syncStateFromObject(slotId);
    });
    canvas.on("object:rotating", (e) => {
      const slotId = (e.target as any)?.data?.slotId;
      if (typeof slotId === "string") syncStateFromObject(slotId);
    });
    canvas.on("object:modified", (e) => {
      const slotId = (e.target as any)?.data?.slotId;
      if (typeof slotId === "string") {
        syncStateFromObject(slotId);
        updateZIndicesFromCanvas();
        queueEmitChange();
      }
    });
  }

  if (!canvas) return;

  isRestoring = true;
  sessionId.value = String(payload?.session_id ?? "");
  const nextState = coerceSavedState(payload?.saved_state ?? savedState.value);
  savedState.value = nextState;
  availableObjects.value = {};
  selectedSlotId.value = null;
  fabricObjects.clear();
  canvas.clear();
  canvas.backgroundColor = "#0e1116";

  const background = await loadFabricImage(String(payload?.background_image ?? ""));
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
    evented: false,
  });

  canvas.setBackgroundImage(background, () => {
    canvas?.requestRenderAll();
  });
  canvas.calcOffset();

  const payloadObjects = Array.isArray(payload?.objects) ? payload.objects as PauseObject[] : [];
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
      ...(item.state ?? {}),
      ...(existing ?? {}),
      sourceWidth,
      sourceHeight,
    } as LayerState;
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
      evented: merged.enabled,
    });
    (image as any).data = { slotId: item.slotId };
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
  if (!sessionId.value) return;
  syncAllStateFromCanvas();
  props.onChange?.(serialise());

  try {
    await fetch("/duffy/layer_control/continue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId.value,
        state: savedState.value,
      }),
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

function onExecuting(event: any) {
  const executingId = event.detail ? String(event.detail) : null;
  if (executingId === null || executingId === "-1") {
    isActive.value = false;
  }
}

function onLayerControlPause(event: any) {
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

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
.layer-control-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 16px;
  color: #f1ecdf;
  background:
    radial-gradient(circle at top left, rgba(224, 123, 43, 0.22), transparent 34%),
    linear-gradient(180deg, #171a1f 0%, #0f1218 100%);
  border-radius: 18px;
  box-sizing: border-box;
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.layer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 14px;
}

.layer-header h3 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.04em;
}

.layer-header p {
  margin: 6px 0 0;
  max-width: 720px;
  color: #c7c0b2;
  font-size: 13px;
}

.apply-button {
  min-width: 180px;
  height: 42px;
  padding: 0 18px;
  color: #fff6eb;
  background: linear-gradient(180deg, #dd7a31, #a8481a);
  border: 1px solid rgba(255, 240, 220, 0.28);
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(320px, 0.95fr);
  gap: 14px;
  min-height: 0;
  flex: 1;
}

.canvas-shell,
.sidebar-card {
  background: rgba(25, 28, 34, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.canvas-shell {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.canvas-meta {
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #d7cab5;
  background: rgba(255, 255, 255, 0.03);
}

.canvas-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 16px;
  overflow: hidden;
  background:
    linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.03) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.03) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.03) 75%);
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
}

.canvas-stage canvas {
  border-radius: 10px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45);
}

:deep(.canvas-container) {
  flex-shrink: 0;
  margin: auto;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding-bottom: 16px;
}

.sidebar-card {
  padding: 14px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.card-title-row h4 {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.04em;
}

.card-kicker {
  color: #9eaaba;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  color: inherit;
  background: linear-gradient(180deg, rgba(62, 67, 75, 0.72), rgba(43, 47, 53, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
}

.layer-item.selected {
  border-color: rgba(233, 149, 79, 0.72);
  box-shadow: inset 0 0 0 1px rgba(233, 149, 79, 0.3);
}

.layer-item strong,
.layer-item small {
  display: block;
}

.layer-item small {
  margin-top: 3px;
  color: #a8b3c3;
}

.visibility-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #d2d9e3;
}

.field-grid {
  display: grid;
  gap: 10px;
}

.field-grid.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 12px;
}

.field-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #cfd8e3;
}

.field-grid input {
  width: 100%;
  box-sizing: border-box;
}

input[type="number"],
input[type="range"] {
  accent-color: #d97833;
}

input[type="number"] {
  padding: 8px 10px;
  color: #f4efe7;
  background: #11141a;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.button-grid button,
.apply-button {
  transition: transform 0.18s ease, filter 0.18s ease;
}

.button-grid button {
  min-height: 38px;
  padding: 0 12px;
  color: #fff4e5;
  background: linear-gradient(180deg, #464c55, #343941);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

.button-grid button.danger {
  background: linear-gradient(180deg, #82473d, #633129);
}

.button-grid button:hover,
.apply-button:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.empty-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 180px;
}

.empty-card h4,
.empty-card p {
  margin: 0;
}

.empty-card p {
  margin-top: 8px;
  color: #b0b7c0;
  line-height: 1.5;
}

.idle-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 720px;
  color: #d7d0c3;
  background:
    radial-gradient(circle at center, rgba(223, 121, 51, 0.12), transparent 38%),
    linear-gradient(180deg, #16191e 0%, #101318 100%);
  border-radius: 18px;
}

.idle-state p,
.idle-state small {
  margin: 0;
}

.pulse {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #df7f2f;
  box-shadow: 0 0 0 0 rgba(223, 127, 47, 0.55);
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(223, 127, 47, 0.55);
  }
  70% {
    box-shadow: 0 0 0 14px rgba(223, 127, 47, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(223, 127, 47, 0);
  }
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .layer-control-root {
    height: auto;
    min-height: 720px;
  }

  .canvas-shell {
    min-height: 420px;
  }
}
</style>
