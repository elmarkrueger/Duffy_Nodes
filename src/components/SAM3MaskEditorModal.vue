<template>
  <div class="sam3-modal" @click.stop @keydown="onKeyDown" tabindex="-1">
    <div class="sam3-modal-header">
      <h3>Mask Editor</h3>
      <span class="sam3-dims" v-if="imgLoaded">
        {{ imgWidth }} &times; {{ imgHeight }}
      </span>
    </div>

    <div class="sam3-toolbar">
      <button
        :class="{ active: sm.tool === ToolMode.SELECT }"
        @click="sm.setTool(ToolMode.SELECT)"
        title="Select / Move (1)"
      >Select</button>
      <button
        :class="{ active: sm.tool === ToolMode.POINT }"
        @click="sm.setTool(ToolMode.POINT)"
        title="Point Tool (2)"
      >Point (Positive)</button>
      <button
        :class="{ active: sm.tool === ToolMode.POINT_NEGATIVE }"
        @click="sm.setTool(ToolMode.POINT_NEGATIVE)"
        title="Negative Point Tool (4)"
      >Point (Negative)</button>
      <button
        :class="{ active: sm.tool === ToolMode.BOX }"
        @click="sm.setTool(ToolMode.BOX)"
        title="Box Tool (3)"
      >Box</button>
      <span class="sam3-tb-sep"></span>
      <button
        @click="deleteSelected"
        title="Delete Selected (Del)"
      >Delete</button>
      <button
        @click="clearAll"
        title="Remove all points and boxes"
      >Clear All</button>
      <span class="sam3-tb-sep"></span>
      <button @click="fitToScreen" title="Fit to Screen">Fit</button>
      <div v-if="imgLoaded" class="sam3-resize-controls">
        <label class="sam3-resize-field">
          W
          <input
            v-model.number="resizeWidthInput"
            type="number"
            min="1"
            :max="MAX_RESIZE_DIM"
            @change="onResizeWidthChange"
            title="Target width"
          />
        </label>
        <label class="sam3-resize-field">
          H
          <input
            v-model.number="resizeHeightInput"
            type="number"
            min="1"
            :max="MAX_RESIZE_DIM"
            @change="onResizeHeightChange"
            title="Target height"
          />
        </label>
        <button
          :class="{ active: keepAspectLocked }"
          @click="toggleAspectLock"
          title="Toggle aspect ratio lock"
        >Lock</button>
        <button @click="applyResizeScale(0.5)" title="Scale to 50%">50%</button>
        <button @click="applyResizeScale(0.75)" title="Scale to 75%">75%</button>
        <button @click="applyResizeScale(1)" title="Restore source size">100%</button>
      </div>
      <span class="sam3-tb-sep"></span>
      <button @click="triggerLoadImage" title="Load Image">Load Image</button>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        style="display:none"
        @change="onFileSelected"
      />
    </div>

    <div
      v-if="uploadStatus === 'uploading'"
      class="sam3-upload-status sam3-upload-busy"
    >Uploading image to server...</div>
    <div
      v-if="uploadStatus === 'error'"
      class="sam3-upload-status sam3-upload-error"
    >Upload failed: {{ uploadErrorMessage }}. Click "Load Image" to retry.</div>

    <div class="sam3-canvas-area" ref="canvasAreaRef">
      <canvas ref="primaryCanvasRef" class="sam3-canvas-primary"></canvas>
      <canvas
        ref="overlayCanvasRef"
        class="sam3-canvas-overlay"
        :style="{ cursor: cursorStyle }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @wheel="onWheel"
        @contextmenu.prevent
      ></canvas>
    </div>

    <div class="sam3-modal-footer">
      <div class="sam3-fb-left">
        <span class="sam3-summary">
          {{ points.length }} point{{ points.length !== 1 ? 's' : '' }}
          &middot;
          {{ bboxes.length }} box{{ bboxes.length !== 1 ? 'es' : '' }}
        </span>
        <span v-if="actionNotice" class="sam3-notice">{{ actionNotice }}</span>
      </div>
      <div class="sam3-fb-right">
        <button class="sam3-cancel-btn" @click="$emit('cancel')">Cancel</button>
        <button class="sam3-save-btn" @click="save">Save &amp; Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, reactive } from "vue";
import { EditorStateMachine, EditorState, ToolMode, type HitResult } from "../utils/state_machine";
import {
  fitTransform,
  setupHiDPICanvas,
  renderImageOnPrimary,
  renderOverlay,
  renderInteractionHighlights,
  screenToImage,
  clampToImage,
  type ViewTransform,
  type Point2D,
  type BBox,
} from "../utils/canvas_renderer";

interface ResizeMeta {
  targetWidth?: number;
  targetHeight?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  keepAspectLocked?: boolean;
}

const MAX_RESIZE_DIM = 8192;

const props = defineProps<{
  imageUrl: string;
  initialPoints: Point2D[];
  initialBboxes: BBox[];
  initialResizeMeta?: ResizeMeta;
}>();

const emit = defineEmits<{
  save: [positivePoints: Point2D[], negativePoints: Point2D[], bboxes: number[][], resizeMeta: ResizeMeta];
  cancel: [];
  loadImage: [filename: string];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);

const sm = reactive(new EditorStateMachine());

const primaryCanvasRef = ref<HTMLCanvasElement | null>(null);
const overlayCanvasRef = ref<HTMLCanvasElement | null>(null);
const canvasAreaRef = ref<HTMLDivElement | null>(null);

const img = new Image();
const imgLoaded = ref(false);
const imgWidth = ref(0);
const imgHeight = ref(0);
const sourceWidth = ref(0);
const sourceHeight = ref(0);
const resizeWidthInput = ref(0);
const resizeHeightInput = ref(0);
const keepAspectLocked = ref(props.initialResizeMeta?.keepAspectLocked ?? true);
const resizeDirty = ref(false);

const points = ref<Point2D[]>([...props.initialPoints]);
const bboxes = ref<BBox[]>([...props.initialBboxes]);

const uploadStatus = ref<"idle" | "uploading" | "success" | "error">("idle");
const uploadErrorMessage = ref("");
const serverFilename = ref("");

const transform = ref<ViewTransform>({ offsetX: 0, offsetY: 0, scale: 1 });
const panning = ref(false);
const panStart = { x: 0, y: 0 };
const panOffsetStart = { x: 0, y: 0 };

let primaryCtx: CanvasRenderingContext2D | null = null;
let overlayCtx: CanvasRenderingContext2D | null = null;
let canvasW = 0;
let canvasH = 0;
let rafId = 0;
let currentObjectUrl = "";
let imageLoadToken = 0;

const hoveredType = ref<HitResult["type"]>("none");
const hoveredCorner = ref<number>(-1);
const hoveredIndex = ref<number>(-1);
const actionNotice = ref("");
let actionNoticeTimer: ReturnType<typeof setTimeout> | null = null;

function setActionNotice(message: string) {
  actionNotice.value = message;
  if (actionNoticeTimer) {
    clearTimeout(actionNoticeTimer);
    actionNoticeTimer = null;
  }
  if (message) {
    actionNoticeTimer = setTimeout(() => {
      actionNotice.value = "";
      actionNoticeTimer = null;
    }, 1800);
  }
}

function sanitizeDim(value: number, fallback: number): number {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded) || rounded < 1) return fallback;
  return Math.min(MAX_RESIZE_DIM, rounded);
}

function clearInteractionState() {
  sm.reset();
  hoveredType.value = "none";
  hoveredCorner.value = -1;
  hoveredIndex.value = -1;
}

function updateResizeInputsFromCurrent() {
  resizeWidthInput.value = imgWidth.value;
  resizeHeightInput.value = imgHeight.value;
}

function updateResizeDirty() {
  resizeDirty.value = imgLoaded.value && (
    imgWidth.value !== sourceWidth.value || imgHeight.value !== sourceHeight.value
  );
}

function remapAnnotations(oldW: number, oldH: number, newW: number, newH: number) {
  const sx = newW / oldW;
  const sy = newH / oldH;

  points.value = points.value.map((p) => {
    const clamped = clampToImage(
      Math.round(p.x * sx),
      Math.round(p.y * sy),
      newW,
      newH
    );
    return {
      ...p,
      x: clamped.x,
      y: clamped.y,
    };
  });

  bboxes.value = bboxes.value.map((b) => {
    const p0 = clampToImage(
      Math.round(b.x0 * sx),
      Math.round(b.y0 * sy),
      newW,
      newH
    );
    const p1 = clampToImage(
      Math.round(b.x1 * sx),
      Math.round(b.y1 * sy),
      newW,
      newH
    );
    return {
      ...b,
      x0: Math.min(p0.x, p1.x),
      y0: Math.min(p0.y, p1.y),
      x1: Math.max(p0.x, p1.x),
      y1: Math.max(p0.y, p1.y),
    };
  });
}

function applyResizePreview(targetW: number, targetH: number) {
  if (!imgLoaded.value || imgWidth.value < 1 || imgHeight.value < 1) return;

  const newW = sanitizeDim(targetW, imgWidth.value);
  const newH = sanitizeDim(targetH, imgHeight.value);
  if (newW === imgWidth.value && newH === imgHeight.value) {
    updateResizeInputsFromCurrent();
    return;
  }

  const oldW = imgWidth.value;
  const oldH = imgHeight.value;
  remapAnnotations(oldW, oldH, newW, newH);

  imgWidth.value = newW;
  imgHeight.value = newH;
  updateResizeInputsFromCurrent();
  updateResizeDirty();
  clearInteractionState();
  fitToScreen();
}

function onResizeWidthChange() {
  if (!imgLoaded.value) return;
  const nextW = sanitizeDim(resizeWidthInput.value, imgWidth.value);
  let nextH = resizeHeightInput.value;
  if (keepAspectLocked.value && imgWidth.value > 0) {
    const ratio = imgHeight.value / imgWidth.value;
    nextH = sanitizeDim(Math.round(nextW * ratio), imgHeight.value);
  }
  applyResizePreview(nextW, nextH);
}

function onResizeHeightChange() {
  if (!imgLoaded.value) return;
  const nextH = sanitizeDim(resizeHeightInput.value, imgHeight.value);
  let nextW = resizeWidthInput.value;
  if (keepAspectLocked.value && imgHeight.value > 0) {
    const ratio = imgWidth.value / imgHeight.value;
    nextW = sanitizeDim(Math.round(nextH * ratio), imgWidth.value);
  }
  applyResizePreview(nextW, nextH);
}

function toggleAspectLock() {
  keepAspectLocked.value = !keepAspectLocked.value;
}

function applyResizeScale(scale: number) {
  if (!imgLoaded.value || sourceWidth.value < 1 || sourceHeight.value < 1) return;
  const nextW = sanitizeDim(Math.round(sourceWidth.value * scale), imgWidth.value);
  const nextH = sanitizeDim(Math.round(sourceHeight.value * scale), imgHeight.value);
  applyResizePreview(nextW, nextH);
}

const cursorStyle = computed(() => {
  if (sm.state !== EditorState.IDLE) return "move";

  if (sm.tool === ToolMode.BOX) {
    if (hoveredType.value === "bbox_corner") {
      const c = hoveredCorner.value;
      if (c === 0 || c === 3) return "nwse-resize";
      if (c === 1 || c === 2) return "nesw-resize";
      return "move";
    }
    if (hoveredType.value === "bbox_area") return "move";
    return "crosshair";
  }

  if (sm.tool === ToolMode.POINT || sm.tool === ToolMode.POINT_NEGATIVE) return "crosshair";

  if (hoveredType.value === "point") return "move";
  if (hoveredType.value === "bbox_corner") {
    const c = hoveredCorner.value;
    if (c === 0) return "nwse-resize";
    if (c === 3) return "nwse-resize";
    if (c === 1) return "nesw-resize";
    if (c === 2) return "nesw-resize";
    return "move";
  }
  if (hoveredType.value === "bbox_area") return "move";
  return "default";
});

function initCanvas() {
  if (!primaryCanvasRef.value || !overlayCanvasRef.value || !canvasAreaRef.value) return;
  const rect = canvasAreaRef.value.getBoundingClientRect();
  canvasW = rect.width;
  canvasH = rect.height;
  primaryCtx = setupHiDPICanvas(primaryCanvasRef.value, canvasW, canvasH);
  overlayCtx = setupHiDPICanvas(overlayCanvasRef.value, canvasW, canvasH);
}

function redrawPrimary() {
  if (!primaryCtx) return;
  if (imgLoaded.value) {
    renderImageOnPrimary(
      primaryCtx,
      img,
      transform.value,
      canvasW,
      canvasH,
      imgWidth.value,
      imgHeight.value
    );
  } else {
    primaryCtx.clearRect(0, 0, canvasW, canvasH);
    primaryCtx.fillStyle = "#1a1a1a";
    primaryCtx.fillRect(0, 0, canvasW, canvasH);
  }
}

function redrawOverlay() {
  if (!overlayCtx) return;
  const preview = sm.getPreviewBox();
  renderOverlay(
    overlayCtx,
    points.value,
    bboxes.value,
    preview,
    transform.value,
    canvasW,
    canvasH
  );
  renderInteractionHighlights(
    overlayCtx,
    points.value,
    bboxes.value,
    transform.value,
    {
      selectedPointIndex: sm.selectedPointIndex,
      selectedBBoxIndex: sm.selectedBBoxIndex,
      hoveredType: hoveredType.value,
      hoveredIndex: hoveredIndex.value,
      hoveredCorner: hoveredCorner.value,
    }
  );
}

function scheduleOverlayRedraw() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(redrawOverlay);
}

function onPointerDown(e: PointerEvent) {
  if (!overlayCanvasRef.value) return;
  overlayCanvasRef.value.setPointerCapture(e.pointerId);

  if (e.button === 1) {
    panning.value = true;
    panStart.x = e.clientX;
    panStart.y = e.clientY;
    panOffsetStart.x = transform.value.offsetX;
    panOffsetStart.y = transform.value.offsetY;
    return;
  }

  if (e.button !== 0) return;

  const rect = overlayCanvasRef.value.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  sm.handlePointerDown(sx, sy, points.value, bboxes.value, transform.value);

  const createdPt = sm.consumeCreatedPoint();
  if (createdPt) {
    const clamped = clampToImage(createdPt.x, createdPt.y, imgWidth.value, imgHeight.value);
    createdPt.x = clamped.x;
    createdPt.y = clamped.y;
    points.value.push(createdPt);
  }

  redrawOverlay();
}

function onPointerMove(e: PointerEvent) {
  if (panning.value) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    transform.value.offsetX = panOffsetStart.x + dx;
    transform.value.offsetY = panOffsetStart.y + dy;
    redrawPrimary();
    scheduleOverlayRedraw();
    return;
  }

  if (!overlayCanvasRef.value) return;

  const rect = overlayCanvasRef.value.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (sm.state !== EditorState.IDLE) {
    sm.handlePointerMove(
      sx, sy, imgWidth.value, imgHeight.value,
      points.value, bboxes.value, transform.value
    );
    hoveredType.value = "none";
    hoveredCorner.value = -1;
    hoveredIndex.value = -1;
    scheduleOverlayRedraw();
    return;
  }

  const hit = sm.getHovered(sx, sy, points.value, bboxes.value, transform.value);
  hoveredType.value = hit.type;
  hoveredCorner.value = hit.corner ?? -1;
  hoveredIndex.value = hit.index;
}

function onPointerUp(e: PointerEvent) {
  if (!overlayCanvasRef.value) return;
  overlayCanvasRef.value.releasePointerCapture(e.pointerId);

  if (panning.value) {
    panning.value = false;
    return;
  }

  const rect = overlayCanvasRef.value.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  const result = sm.handlePointerUp(
    sx,
    sy,
    transform.value,
    points.value,
    bboxes.value,
    imgWidth.value,
    imgHeight.value
  );

  if (result) {
    if (result.bboxCreated) {
      bboxes.value.push(result.bboxCreated);
    }
    if (result.pointMoved || result.bboxMoved) {
      points.value = [...points.value];
      bboxes.value = [...bboxes.value];
    }
  }

  const hit = sm.getHovered(sx, sy, points.value, bboxes.value, transform.value);
  hoveredType.value = hit.type;
  hoveredCorner.value = hit.corner ?? -1;
  hoveredIndex.value = hit.index;

  scheduleOverlayRedraw();
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  if (!overlayCanvasRef.value) return;

  const rect = overlayCanvasRef.value.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  const newScale = Math.max(0.1, Math.min(20, transform.value.scale * factor));

  transform.value.offsetX = mx - (mx - transform.value.offsetX) * (newScale / transform.value.scale);
  transform.value.offsetY = my - (my - transform.value.offsetY) * (newScale / transform.value.scale);
  transform.value.scale = newScale;

  redrawPrimary();
  scheduleOverlayRedraw();
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    sm.cancel();
    redrawOverlay();
    return;
  }

  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    deleteSelected();
    return;
  }

  if (e.key === "1") { sm.setTool(ToolMode.SELECT); return; }
  if (e.key === "2") { sm.setTool(ToolMode.POINT); return; }
  if (e.key === "3") { sm.setTool(ToolMode.BOX); return; }
  if (e.key === "4") { sm.setTool(ToolMode.POINT_NEGATIVE); return; }
}

function deleteSelected() {
  const hovered: HitResult | undefined =
    hoveredType.value !== "none" && hoveredIndex.value >= 0
      ? {
          type: hoveredType.value as HitResult["type"],
          index: hoveredIndex.value,
          corner: hoveredCorner.value >= 0 ? hoveredCorner.value : undefined,
        }
      : undefined;

  const sel = sm.deleteSelected(points.value, bboxes.value, hovered);
  if (sel) {
    if (sel.pointIndex !== undefined) {
      points.value.splice(sel.pointIndex, 1);
      points.value = [...points.value];
      setActionNotice("Point deleted.");
    }
    if (sel.bboxIndex !== undefined) {
      bboxes.value.splice(sel.bboxIndex, 1);
      bboxes.value = [...bboxes.value];
      setActionNotice("Box deleted.");
    }
    hoveredType.value = "none";
    hoveredCorner.value = -1;
    hoveredIndex.value = -1;
    redrawOverlay();
    return;
  }

  setActionNotice("Nothing to delete.");
}

function clearAll() {
  points.value = [];
  bboxes.value = [];
  sm.reset();
  hoveredType.value = "none";
  hoveredCorner.value = -1;
  hoveredIndex.value = -1;
  setActionNotice("");
  redrawOverlay();
}

function fitToScreen() {
  if (!imgLoaded.value) return;
  transform.value = fitTransform(
    imgWidth.value,
    imgHeight.value,
    canvasW,
    canvasH
  );
  redrawPrimary();
  scheduleOverlayRedraw();
}

function triggerLoadImage() {
  fileInputRef.value?.click();
}

async function uploadBlobToServer(blob: Blob, filename: string): Promise<string> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });
  const formData = new FormData();
  formData.append("image", file);

  const resp = await fetch("/duffy/sam3/upload_image", {
    method: "POST",
    body: formData,
  });
  const result = await resp.json();
  if (!resp.ok || result.status !== "ok") {
    throw new Error(result.message || "Upload failed");
  }
  return result.filename;
}

async function createResizedBlob(targetW: number, targetH: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create resize canvas context");
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to generate resized image blob"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploadStatus.value = "idle";
  uploadErrorMessage.value = "";
  serverFilename.value = "";

  // Start local display via FileReader (does not block on network)
  const reader = new FileReader();
  reader.onload = () => {
    const tempImg = new Image();
    tempImg.onload = () => {
      const newW = tempImg.naturalWidth;
      const newH = tempImg.naturalHeight;

      const oldPtCount = points.value.length;
      const oldBoxCount = bboxes.value.length;

      points.value = points.value.filter(
        (p) => p.x >= 0 && p.x < newW && p.y >= 0 && p.y < newH
      );
      bboxes.value = bboxes.value.filter(
        (b) =>
          b.x0 >= 0 && b.x1 <= newW &&
          b.y0 >= 0 && b.y1 <= newH
      );

      const removedPts = oldPtCount - points.value.length;
      const removedBoxes = oldBoxCount - bboxes.value.length;

      imgWidth.value = newW;
      imgHeight.value = newH;
      sourceWidth.value = newW;
      sourceHeight.value = newH;
      imgLoaded.value = true;
      updateResizeInputsFromCurrent();
      updateResizeDirty();
      clearInteractionState();
      img.src = reader.result as string;
      img.onload = () => {
        initCanvas();
        fitToScreen();
        if (removedPts > 0 || removedBoxes > 0) {
          alert(
            `Image dimensions changed to ${newW}x${newH}.\n` +
            `Removed ${removedPts} out-of-bounds point(s) ` +
            `and ${removedBoxes} out-of-bounds box(es).`
          );
        }
      };
    };
    tempImg.src = reader.result as string;
  };
  reader.readAsDataURL(file);

  // Upload file to ComfyUI server so it exists in input/ at execution time
  uploadStatus.value = "uploading";
  try {
    const formData = new FormData();
    formData.append("image", file);
    const resp = await fetch("/duffy/sam3/upload_image", {
      method: "POST",
      body: formData,
    });
    const result = await resp.json();
    if (!resp.ok || result.status !== "ok") {
      throw new Error(result.message || "Upload failed");
    }
    uploadStatus.value = "success";
    serverFilename.value = result.filename;
    emit("loadImage", result.filename);
  } catch (err: any) {
    uploadStatus.value = "error";
    uploadErrorMessage.value = err.message || "Network error";
    // Clear displayed image since it won't be available at execution time
    imgLoaded.value = false;
    img.src = "";
    if (primaryCtx) {
      redrawPrimary();
    }
  }

  input.value = "";
}

async function save() {
  if (resizeDirty.value && imgLoaded.value) {
    uploadStatus.value = "uploading";
    uploadErrorMessage.value = "";
    try {
      const targetW = sanitizeDim(imgWidth.value, imgWidth.value);
      const targetH = sanitizeDim(imgHeight.value, imgHeight.value);
      const resizedBlob = await createResizedBlob(targetW, targetH);
      const resizedName = `sam3_resized_${targetW}x${targetH}.png`;
      const filename = await uploadBlobToServer(resizedBlob, resizedName);
      serverFilename.value = filename;
      emit("loadImage", filename);
      sourceWidth.value = targetW;
      sourceHeight.value = targetH;
      updateResizeDirty();
      uploadStatus.value = "success";
    } catch (err: any) {
      uploadStatus.value = "error";
      uploadErrorMessage.value = err?.message || "Resize upload failed";
      return;
    }
  }

  const serializedPoints = points.value.map((p) => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
    id: p.id,
    type: p.type ?? "positive",
  }));
  const positivePoints = serializedPoints.filter((p) => p.type !== "negative");
  const negativePoints = serializedPoints.filter((p) => p.type === "negative");
  const serializedBBoxes = bboxes.value.map((b) => [
    Math.round(b.x0),
    Math.round(b.y0),
    Math.round(b.x1),
    Math.round(b.y1),
  ]);
  emit("save", positivePoints, negativePoints, serializedBBoxes, {
    targetWidth: imgWidth.value,
    targetHeight: imgHeight.value,
    sourceWidth: sourceWidth.value,
    sourceHeight: sourceHeight.value,
    keepAspectLocked: keepAspectLocked.value,
  });
}

watch(
  () => props.imageUrl,
  (url) => {
    if (!url) return;
    const loadToken = ++imageLoadToken;
    img.onload = () => {
      if (loadToken !== imageLoadToken) return;
      imgWidth.value = img.naturalWidth;
      imgHeight.value = img.naturalHeight;
      sourceWidth.value = img.naturalWidth;
      sourceHeight.value = img.naturalHeight;
      imgLoaded.value = true;
      updateResizeInputsFromCurrent();
      updateResizeDirty();
      clearInteractionState();
      initCanvas();
      fitToScreen();
    };
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Image fetch failed");
        return r.blob();
      })
      .then((blob) => {
        if (loadToken !== imageLoadToken) return;
        if (currentObjectUrl) {
          URL.revokeObjectURL(currentObjectUrl);
          currentObjectUrl = "";
        }
        currentObjectUrl = URL.createObjectURL(blob);
        img.src = currentObjectUrl;
      })
      .catch(() => {
        // image will remain unloaded
      });
  },
  { immediate: true }
);

onMounted(() => {
  nextTick(() => {
    initCanvas();
    if (imgLoaded.value) {
      fitToScreen();
    } else {
      redrawPrimary();
    }
    redrawOverlay();
  });

  window.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown);
  cancelAnimationFrame(rafId);
  if (actionNoticeTimer) {
    clearTimeout(actionNoticeTimer);
    actionNoticeTimer = null;
  }
  sm.reset();
  if (primaryCtx) {
    primaryCtx.clearRect(0, 0, canvasW, canvasH);
  }
  if (overlayCtx) {
    overlayCtx.clearRect(0, 0, canvasW, canvasH);
  }
  img.onload = null;
  img.src = "";
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = "";
  }
});
</script>

<style scoped>
.sam3-modal {
  display: flex;
  flex-direction: column;
  width: 95vw;
  max-width: 1400px;
  height: 92vh;
  max-height: 1000px;
  background: var(--comfy-menu-bg, #2a2a2a);
  border: 1px solid var(--comfy-input-border, #555);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  outline: none;
}

.sam3-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--comfy-input-border, #444);
  flex-shrink: 0;
}

.sam3-modal-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.sam3-dims {
  font-size: 11px;
  color: #888;
  font-family: monospace;
}

.sam3-toolbar {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--comfy-input-border, #444);
  background: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.sam3-toolbar button {
  padding: 4px 12px;
  background: transparent;
  color: var(--comfy-text-normal, #ddd);
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.sam3-toolbar button:hover {
  background: rgba(255, 255, 255, 0.08);
}

.sam3-toolbar button.active {
  background: rgba(76, 175, 80, 0.35);
  border-color: rgba(76, 175, 80, 0.7);
  color: #c8e6c9;
}

.sam3-tb-sep {
  width: 1px;
  height: 16px;
  background: var(--comfy-input-border, #555);
  margin: 0 4px;
  display: inline-block;
}

.sam3-resize-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
}

.sam3-resize-field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #aaa;
}

.sam3-resize-field input {
  width: 68px;
  padding: 2px 6px;
  background: var(--comfy-input-bg, #333);
  color: var(--comfy-text-normal, #ddd);
  border: 1px solid var(--comfy-input-border, #555);
  border-radius: 3px;
  font-size: 11px;
}

.sam3-canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #1a1a1a;
  min-height: 0;
}

.sam3-canvas-primary,
.sam3-canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.sam3-canvas-overlay {
  z-index: 2;
  touch-action: none;
}

.sam3-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--comfy-input-border, #444);
  flex-shrink: 0;
}

.sam3-fb-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #888;
}

.sam3-notice {
  color: #9ec7ff;
}

.sam3-fb-right {
  display: flex;
  gap: 8px;
}

.sam3-cancel-btn,
.sam3-save-btn {
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  border: 1px solid var(--comfy-input-border, #555);
}

.sam3-cancel-btn {
  background: var(--comfy-input-bg, #333);
  color: var(--comfy-text-normal, #ddd);
}

.sam3-save-btn {
  background: rgba(76, 175, 80, 0.3);
  color: #a5d6a7;
  border-color: rgba(76, 175, 80, 0.5);
  font-weight: 600;
}

.sam3-cancel-btn:hover {
  background: var(--comfy-input-hover, #444);
}

.sam3-save-btn:hover {
  background: rgba(76, 175, 80, 0.5);
}

.sam3-upload-status {
  padding: 8px 12px;
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
}

.sam3-upload-busy {
  background: rgba(33, 150, 243, 0.15);
  color: #90caf9;
  border-bottom: 1px solid rgba(33, 150, 243, 0.25);
}

.sam3-upload-error {
  background: rgba(244, 67, 54, 0.15);
  color: #ef9a9a;
  border-bottom: 1px solid rgba(244, 67, 54, 0.25);
}
</style>
