<template>
  <div ref="widgetRoot" class="duffy-painter-modern" tabindex="0" @pointerdown="focusWidget">
    <div class="toolbar primary-toolbar">
      <div class="tool-group">
        <button :class="{ active: tool === 'pencil' }" type="button" title="Draw" @click="setTool('pencil')">✏️</button>
        <button :class="{ active: tool === 'eraser' }" type="button" title="Erase" @click="setTool('eraser')">🧽</button>
        <button :class="{ active: tool === 'select' }" type="button" title="Select and move" @click="setTool('select')">🖱️</button>
      </div>

      <div class="divider"></div>

      <div class="tool-group">
        <button type="button" title="Add text" @click="addText">🔤</button>
        <button type="button" title="Add rectangle" @click="addShape('rect')">▭</button>
        <button type="button" title="Add circle" @click="addShape('circle')">◯</button>
        <button type="button" title="Add triangle" @click="addShape('triangle')">△</button>
      </div>

      <div class="divider"></div>

      <div class="tool-group right-align">
        <button type="button" title="Upload background image" @click="triggerImageUpload">📁</button>
        <button :disabled="!hasSelection" type="button" title="Delete selected objects" @click="deleteSelectedObjects">⌫</button>
        <button type="button" title="Reset canvas" class="danger-btn" @click="resetCanvas">🗑️</button>
      </div>
    </div>

    <div class="toolbar secondary-toolbar">
      <div class="config-item">
        <label for="canvas-width">Width</label>
        <input id="canvas-width" v-model.number="localWidth" type="number" class="dim-input" @change="updateDimensions" />
      </div>
      <div class="config-item">
        <label for="canvas-height">Height</label>
        <input id="canvas-height" v-model.number="localHeight" type="number" class="dim-input" @change="updateDimensions" />
      </div>

      <div class="divider"></div>

      <div class="config-item">
        <label for="draw-color">Color</label>
        <div class="color-picker-wrapper">
          <input id="draw-color" v-model="color" type="color" @input="updateBrush" />
        </div>
      </div>
      <div class="config-item">
        <label for="background-color">Canvas</label>
        <div class="color-picker-wrapper">
          <input id="background-color" v-model="localBgColor" type="color" @input="updateBackground" />
        </div>
      </div>

      <div class="divider"></div>

      <div class="config-item mode-toggle">
        <span>Shape</span>
        <div class="toggle-group">
          <button :class="{ active: shapeStyle === 'filled' }" type="button" class="mode-button" @click="shapeStyle = 'filled'">Fill</button>
          <button :class="{ active: shapeStyle === 'outline' }" type="button" class="mode-button" @click="shapeStyle = 'outline'">Outline</button>
        </div>
      </div>
    </div>

    <div class="toolbar tertiary-toolbar">
      <div class="config-item size-control">
        <label for="brush-size">Tool size</label>
        <input id="brush-size" v-model.number="brushSize" type="range" min="1" max="150" class="styled-slider" @input="updateBrush" />
        <span class="size-label">{{ brushSize }}px</span>
      </div>
      <div class="status-text">{{ hasSelection ? 'Selection ready for move or delete' : 'Tip: focus the widget and press Delete to remove selected objects' }}</div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden-upload" @change="handleImageUpload" />

    <div ref="canvasWrapper" class="canvas-wrapper" @pointerdown.stop="focusWidget">
      <canvas ref="canvasEl"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { fabric } from "fabric";
import "fabric-eraser-brush";

type ToolMode = "pencil" | "eraser" | "select";
type ShapeStyle = "filled" | "outline";

const props = defineProps<{
  width: number;
  height: number;
  bgColor: string;
  onChange?: (json: string) => void;
  onUpdateDimensions?: (w: number, h: number) => void;
}>();

const widgetRoot = ref<HTMLElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const canvasWrapper = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const tool = ref<ToolMode>("pencil");
const shapeStyle = ref<ShapeStyle>("filled");
const color = ref("#ff5a36");
const brushSize = ref(10);
const localBgColor = ref(props.bgColor);
const localWidth = ref(props.width);
const localHeight = ref(props.height);
const hasSelection = ref(false);

let canvas: fabric.Canvas | null = null;
let emitTimer: ReturnType<typeof setTimeout> | null = null;
let isRestoring = false;

function focusWidget() {
  widgetRoot.value?.focus();
}

function configureCanvasObject(object: fabric.Object | undefined | null) {
  if (!canvas || !object || object === canvas.backgroundImage || object.type === "activeSelection") {
    return;
  }

  object.set({
    selectable: true,
    evented: true,
    erasable: true,
    cornerColor: "#0a84ff",
    cornerStrokeColor: "#ffffff",
    borderColor: "#0a84ff",
    cornerSize: 10,
    transparentCorners: false,
  });
}

function updateSelectionState() {
  hasSelection.value = Boolean(canvas?.getActiveObjects().length);
}

function updateBackgroundImageScale() {
  if (!canvas?.backgroundImage) {
    return;
  }

  const backgroundImage = canvas.backgroundImage as fabric.Image;
  const imageWidth = backgroundImage.width || localWidth.value;
  const imageHeight = backgroundImage.height || localHeight.value;

  backgroundImage.set({
    originX: "left",
    originY: "top",
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
    erasable: false,
    scaleX: localWidth.value / imageWidth,
    scaleY: localHeight.value / imageHeight,
  });
}

function queueEmitChange() {
  if (!canvas || !props.onChange || isRestoring) {
    return;
  }

  if (emitTimer) {
    clearTimeout(emitTimer);
  }

  emitTimer = setTimeout(() => {
    props.onChange?.(serialise());
  }, 25);
}

function handleKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const tag = target?.tagName;
  const editingText = canvas?.getActiveObject()?.type === "i-text" && (canvas.getActiveObject() as any).isEditing;
  const isTextInput = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;

  if (editingText || isTextInput) {
    return;
  }

  if ((event.key === "Delete" || event.key === "Backspace") && hasSelection.value) {
    event.preventDefault();
    deleteSelectedObjects();
  }
}

function bindCanvasEvents() {
  if (!canvas) {
    return;
  }

  canvas.on("path:created", (event) => {
    configureCanvasObject(event.path as fabric.Object | undefined);
    canvas?.requestRenderAll();
    updateSelectionState();
    queueEmitChange();
  });

  canvas.on("object:added", (event) => {
    configureCanvasObject(event.target as fabric.Object | undefined);
    canvas?.requestRenderAll();
    updateSelectionState();
    queueEmitChange();
  });

  canvas.on("object:modified", () => {
    canvas?.requestRenderAll();
    updateSelectionState();
    queueEmitChange();
  });

  canvas.on("object:removed", () => {
    canvas?.requestRenderAll();
    updateSelectionState();
    queueEmitChange();
  });

  canvas.on("selection:created", updateSelectionState);
  canvas.on("selection:updated", updateSelectionState);
  canvas.on("selection:cleared", updateSelectionState);
}

onMounted(() => {
  if (!canvasEl.value) {
    return;
  }

  canvas = new fabric.Canvas(canvasEl.value, {
    width: localWidth.value,
    height: localHeight.value,
    backgroundColor: localBgColor.value,
    isDrawingMode: true,
    preserveObjectStacking: true,
    stopContextMenu: true,
  });

  bindCanvasEvents();
  updateBrush();
  updateSelectionState();
  queueEmitChange();

  widgetRoot.value?.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  cleanup();
});

function cleanup() {
  if (emitTimer) {
    clearTimeout(emitTimer);
    emitTimer = null;
  }

  widgetRoot.value?.removeEventListener("keydown", handleKeydown);

  if (canvas) {
    canvas.dispose();
    canvas = null;
  }
}

function updateDimensions() {
  if (!canvas) {
    return;
  }

  localWidth.value = Math.max(64, Math.min(4096, Number(localWidth.value) || 512));
  localHeight.value = Math.max(64, Math.min(4096, Number(localHeight.value) || 512));

  canvas.setWidth(localWidth.value);
  canvas.setHeight(localHeight.value);
  updateBackgroundImageScale();
  canvas.requestRenderAll();

  props.onUpdateDimensions?.(localWidth.value, localHeight.value);
  queueEmitChange();
}

function updateBrush() {
  if (!canvas) {
    return;
  }

  canvas.selection = tool.value === "select";

  if (tool.value === "pencil") {
    canvas.isDrawingMode = true;
    const pencil = new fabric.PencilBrush(canvas);
    pencil.color = color.value;
    pencil.width = brushSize.value;
    canvas.freeDrawingBrush = pencil;
    return;
  }

  if (tool.value === "eraser") {
    canvas.isDrawingMode = true;
    // @ts-expect-error Fabric eraser brush is injected by fabric-eraser-brush.
    const eraser = new fabric.EraserBrush(canvas);
    eraser.width = brushSize.value;
    canvas.freeDrawingBrush = eraser;
    return;
  }

  canvas.isDrawingMode = false;
}

function updateBackground() {
  if (!canvas) {
    return;
  }

  canvas.backgroundColor = localBgColor.value;
  canvas.requestRenderAll();
  queueEmitChange();
}

function setTool(nextTool: ToolMode) {
  tool.value = nextTool;
  updateBrush();
}

function triggerImageUpload() {
  fileInput.value?.click();
}

function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !canvas) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const dataUrl = loadEvent.target?.result as string;
    fabric.Image.fromURL(dataUrl, (image) => {
      if (!canvas) {
        return;
      }

      localWidth.value = image.width || 512;
      localHeight.value = image.height || 512;

      canvas.setWidth(localWidth.value);
      canvas.setHeight(localHeight.value);

      image.set({
        originX: "left",
        originY: "top",
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        erasable: false,
      });

      canvas.setBackgroundImage(image, () => {
        updateBackgroundImageScale();
        canvas?.requestRenderAll();
      });

      props.onUpdateDimensions?.(localWidth.value, localHeight.value);
      queueEmitChange();
    }, { crossOrigin: "anonymous" });
  };

  reader.readAsDataURL(file);
  target.value = "";
}

function buildShapeStyle() {
  if (shapeStyle.value === "outline") {
    return {
      fill: "rgba(0, 0, 0, 0)",
      stroke: color.value,
      strokeWidth: 4,
    };
  }

  return {
    fill: color.value,
    stroke: null,
    strokeWidth: 0,
  };
}

function addShape(shapeType: "rect" | "circle" | "triangle") {
  if (!canvas) {
    return;
  }

  const shapeOptions = {
    left: localWidth.value / 2 - 40,
    top: localHeight.value / 2 - 40,
    ...buildShapeStyle(),
  };

  let shape: fabric.Object | null = null;
  if (shapeType === "rect") {
    shape = new fabric.Rect({ ...shapeOptions, width: 80, height: 80 });
  } else if (shapeType === "circle") {
    shape = new fabric.Circle({ ...shapeOptions, radius: 40 });
  } else if (shapeType === "triangle") {
    shape = new fabric.Triangle({ ...shapeOptions, width: 80, height: 80 });
  }

  if (!shape) {
    return;
  }

  configureCanvasObject(shape);
  canvas.add(shape);
  canvas.setActiveObject(shape);
  setTool("select");
  updateSelectionState();
  queueEmitChange();
}

function addText() {
  if (!canvas) {
    return;
  }

  const text = new fabric.IText("Type here", {
    left: localWidth.value / 2 - 60,
    top: localHeight.value / 2 - 16,
    fill: color.value,
    fontSize: 28,
    fontFamily: "Segoe UI",
  });

  configureCanvasObject(text);
  canvas.add(text);
  canvas.setActiveObject(text);
  setTool("select");
  updateSelectionState();
  queueEmitChange();
}

function deleteSelectedObjects() {
  if (!canvas) {
    return;
  }

  const selectedObjects = canvas.getActiveObjects().filter((object) => object !== canvas?.backgroundImage);
  if (!selectedObjects.length) {
    return;
  }

  canvas.discardActiveObject();
  selectedObjects.forEach((object) => canvas?.remove(object));
  updateSelectionState();
  canvas.requestRenderAll();
  queueEmitChange();
}

function resetCanvas() {
  if (!canvas) {
    return;
  }

  canvas.clear();
  canvas.backgroundImage = undefined;
  canvas.backgroundColor = localBgColor.value;
  updateBrush();
  updateSelectionState();
  canvas.requestRenderAll();
  queueEmitChange();
}

function serialise() {
  if (!canvas) {
    return "{}";
  }

  return JSON.stringify({
    width: localWidth.value,
    height: localHeight.value,
    bgColor: localBgColor.value,
    state: canvas.toObject(),
    image: canvas.toDataURL({ format: "png", quality: 1.0 }),
  });
}

function deserialise(json: string) {
  if (!canvas || !json) {
    return;
  }

  try {
    const data = JSON.parse(json);
    isRestoring = true;

    localWidth.value = Math.max(64, Number(data.width) || localWidth.value || 512);
    localHeight.value = Math.max(64, Number(data.height) || localHeight.value || 512);
    localBgColor.value = typeof data.bgColor === "string" ? data.bgColor : localBgColor.value;

    canvas.setWidth(localWidth.value);
    canvas.setHeight(localHeight.value);
    canvas.backgroundColor = localBgColor.value;

    if (data.state) {
      canvas.loadFromJSON(data.state, () => {
        canvas?.getObjects().forEach((object) => configureCanvasObject(object));
        updateBackgroundImageScale();
        updateSelectionState();
        updateBrush();
        canvas?.requestRenderAll();
        isRestoring = false;
      });
      return;
    }
  } catch (error) {
    console.error("Failed to deserialise painter state", error);
  }

  isRestoring = false;
}

watch(() => props.width, (value) => {
  if (value !== localWidth.value) {
    localWidth.value = value;
    updateDimensions();
  }
});

watch(() => props.height, (value) => {
  if (value !== localHeight.value) {
    localHeight.value = value;
    updateDimensions();
  }
});

watch(() => props.bgColor, (value) => {
  if (value !== localBgColor.value) {
    localBgColor.value = value;
    updateBackground();
  }
});

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
.duffy-painter-modern {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 12px;
  color: #f4f1ea;
  background:
    linear-gradient(180deg, rgba(31, 33, 36, 0.98), rgba(22, 24, 28, 0.98)),
    radial-gradient(circle at top left, rgba(255, 154, 88, 0.18), transparent 28%);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 24px rgba(0, 0, 0, 0.32);
  font-family: "Segoe UI", "Trebuchet MS", sans-serif;
  isolation: isolate;
  outline: none;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 8px 14px;
  background: rgba(48, 51, 57, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.tertiary-toolbar {
  align-items: flex-start;
}

.tool-group {
  display: flex;
  gap: 6px;
}

.tool-group.right-align {
  margin-left: auto;
}

.divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.14);
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 38px;
  padding: 0 12px;
  color: #fff9f0;
  background: linear-gradient(180deg, #484c55, #373a42);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
}

button:hover:not(:disabled) {
  background: linear-gradient(180deg, #585d67, #3f434b);
  transform: translateY(-1px);
}

button.active {
  background: linear-gradient(180deg, #d16b2d, #aa4a16);
  border-color: rgba(255, 206, 150, 0.45);
}

button:disabled {
  opacity: 0.45;
  cursor: default;
}

button.danger-btn {
  background: linear-gradient(180deg, #944343, #702d2d);
}

.mode-button {
  min-width: 74px;
  font-size: 12px;
  font-weight: 600;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #c8d0db;
}

.mode-toggle {
  margin-left: auto;
}

.toggle-group {
  display: flex;
  gap: 6px;
}

.dim-input {
  width: 64px;
  padding: 5px 6px;
  color: #f6f2eb;
  background: #17191d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-family: Consolas, monospace;
  text-align: center;
}

.dim-input:focus {
  outline: none;
  border-color: rgba(255, 154, 88, 0.8);
}

.color-picker-wrapper {
  width: 30px;
  height: 30px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
}

input[type="color"] {
  width: 150%;
  height: 150%;
  margin: -25%;
  padding: 0;
  cursor: pointer;
  border: none;
}

.size-control {
  flex: 1 1 320px;
}

.styled-slider {
  flex: 1 1 auto;
  height: 6px;
  background: #595e66;
  border-radius: 999px;
  outline: none;
  -webkit-appearance: none;
}

.styled-slider::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  background: #ff9a58;
  border-radius: 50%;
  cursor: pointer;
  -webkit-appearance: none;
}

.size-label {
  min-width: 46px;
  font-family: Consolas, monospace;
  text-align: right;
}

.status-text {
  flex: 1 1 220px;
  padding-top: 2px;
  color: #9ea7b4;
  font-size: 12px;
}

.hidden-upload {
  display: none;
}

.canvas-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  min-height: 160px;
  background:
    linear-gradient(45deg, #2a2d32 25%, transparent 25%),
    linear-gradient(-45deg, #2a2d32 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2a2d32 75%),
    linear-gradient(-45deg, transparent 75%, #2a2d32 75%);
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

canvas {
  display: block;
}
</style>
