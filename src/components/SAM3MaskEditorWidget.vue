<template>
  <div class="sam3-widget">
    <div class="sam3-summary">
      <span v-if="hasAnnotations" class="sam3-summary-has">
        {{ points.length }} point{{ points.length !== 1 ? 's' : '' }}
        &middot;
        {{ bboxes.length }} box{{ bboxes.length !== 1 ? 'es' : '' }}
      </span>
      <span v-else class="sam3-summary-none">No annotations</span>
    </div>
    <button class="sam3-open-btn" @click.stop="openEditor">
      Open Mask Editor
    </button>

    <Teleport to="body">
      <div
        v-if="editorVisible"
        class="sam3-overlay"
        @click.self="closeEditor"
      >
        <SAM3MaskEditorModal
          :image-url="imageUrl"
          :initial-points="points"
          :initial-bboxes="bboxes"
          :initial-resize-meta="resizeMeta"
          @save="onSave"
          @cancel="closeEditor"
          @loadImage="onLoadImage"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import SAM3MaskEditorModal from "./SAM3MaskEditorModal.vue";
import type { Point2D, BBox } from "../utils/canvas_renderer";

interface ResizeMeta {
  targetWidth?: number;
  targetHeight?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  keepAspectLocked?: boolean;
}

const props = defineProps<{
  initialPrompt?: string;
  initialCoordsJson?: string;
  initialNegativeCoordsJson?: string;
  initialBboxesJson?: string;
  initialResizeMetaJson?: string;
  imageUrl?: string;
  onPromptChange?: (text: string) => void;
  onAnnotationsChange?: (coords: string, negativeCoords: string, bboxes: string, resizeMeta: string) => void;
  onImageFileChange?: (filename: string) => void;
}>();

const points = ref<Point2D[]>([
  ...parsePoints(props.initialCoordsJson, "positive"),
  ...parsePoints(props.initialNegativeCoordsJson, "negative"),
]);
const bboxes = ref<BBox[]>(parseBBoxes(props.initialBboxesJson));
const resizeMeta = ref<ResizeMeta>(parseResizeMeta(props.initialResizeMetaJson));
const editorVisible = ref(false);
const imageUrl = ref(props.imageUrl || "");

const hasAnnotations = computed(
  () => points.value.length > 0 || bboxes.value.length > 0
);

function parsePoints(
  json?: string,
  pointType: "positive" | "negative" = "positive"
): Point2D[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.map((p: any, i: number) => ({
      x: typeof p.x === "number" ? Math.round(p.x) : 0,
      y: typeof p.y === "number" ? Math.round(p.y) : 0,
      id: p.id || `pt_${i}`,
      type: p.type === "negative" ? "negative" : pointType,
    }));
  } catch {
    return [];
  }
}

function parseBBoxes(json?: string): BBox[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.map((b: any, i: number) => {
      if (Array.isArray(b) && b.length === 4) {
        return {
          x0: Math.round(b[0]),
          y0: Math.round(b[1]),
          x1: Math.round(b[2]),
          y1: Math.round(b[3]),
          id: `bbox_${i}`,
        };
      }
      return {
        x0: Math.round(b.x0 ?? b.x ?? 0),
        y0: Math.round(b.y0 ?? b.y ?? 0),
        x1: Math.round(b.x1 ?? 0),
        y1: Math.round(b.y1 ?? 0),
        id: b.id || `bbox_${i}`,
      };
    });
  } catch {
    return [];
  }
}

function serializeCoords(): string {
  return JSON.stringify(
    points.value
      .filter((p) => p.type !== "negative")
      .map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  );
}

function serializeNegativeCoords(): string {
  return JSON.stringify(
    points.value
      .filter((p) => p.type === "negative")
      .map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  );
}

function serializeBBoxes(): string {
  return JSON.stringify(
    bboxes.value.map((b) => [
      Math.round(b.x0),
      Math.round(b.y0),
      Math.round(b.x1),
      Math.round(b.y1),
    ])
  );
}

function parseResizeMeta(json?: string): ResizeMeta {
  if (!json) return {};
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {};
    }
    const meta: ResizeMeta = {};
    if (typeof data.targetWidth === "number" && Number.isFinite(data.targetWidth)) {
      meta.targetWidth = Math.max(1, Math.round(data.targetWidth));
    }
    if (typeof data.targetHeight === "number" && Number.isFinite(data.targetHeight)) {
      meta.targetHeight = Math.max(1, Math.round(data.targetHeight));
    }
    if (typeof data.sourceWidth === "number" && Number.isFinite(data.sourceWidth)) {
      meta.sourceWidth = Math.max(1, Math.round(data.sourceWidth));
    }
    if (typeof data.sourceHeight === "number" && Number.isFinite(data.sourceHeight)) {
      meta.sourceHeight = Math.max(1, Math.round(data.sourceHeight));
    }
    if (typeof data.keepAspectLocked === "boolean") {
      meta.keepAspectLocked = data.keepAspectLocked;
    }
    return meta;
  } catch {
    return {};
  }
}

function serializeResizeMeta(): string {
  return JSON.stringify({
    targetWidth: resizeMeta.value.targetWidth,
    targetHeight: resizeMeta.value.targetHeight,
    sourceWidth: resizeMeta.value.sourceWidth,
    sourceHeight: resizeMeta.value.sourceHeight,
    keepAspectLocked: resizeMeta.value.keepAspectLocked ?? true,
  });
}

function emitAnnotations() {
  props.onAnnotationsChange?.(
    serializeCoords(),
    serializeNegativeCoords(),
    serializeBBoxes(),
    serializeResizeMeta()
  );
}

function openEditor() {
  editorVisible.value = true;
}

function closeEditor() {
  editorVisible.value = false;
}

function onLoadImage(filename: string) {
  props.onImageFileChange?.(filename);
}

function onSave(
  newPositivePoints: Point2D[],
  newNegativePoints: Point2D[],
  newBboxes: any[][],
  newResizeMeta?: ResizeMeta
) {
  const parsedPositive = newPositivePoints.map((p: any, i: number) => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
    id: p.id || `pt_${i}`,
    type: "positive" as const,
  }));
  const parsedNegative = newNegativePoints.map((p: any, i: number) => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
    id: p.id || `npt_${i}`,
    type: "negative" as const,
  }));
  points.value = [...parsedPositive, ...parsedNegative];
  bboxes.value = newBboxes.map((b: any, i: number) => {
    if (Array.isArray(b)) {
      return {
        x0: Math.round(b[0]),
        y0: Math.round(b[1]),
        x1: Math.round(b[2]),
        y1: Math.round(b[3]),
        id: `bbox_${i}`,
      };
    }
    return {
      x0: Math.round(b.x0 ?? b.x ?? 0),
      y0: Math.round(b.y0 ?? b.y ?? 0),
      x1: Math.round(b.x1 ?? 0),
      y1: Math.round(b.y1 ?? 0),
      id: b.id || `bbox_${i}`,
    };
  });
  if (newResizeMeta) {
    resizeMeta.value = {
      targetWidth: newResizeMeta.targetWidth,
      targetHeight: newResizeMeta.targetHeight,
      sourceWidth: newResizeMeta.sourceWidth,
      sourceHeight: newResizeMeta.sourceHeight,
      keepAspectLocked: newResizeMeta.keepAspectLocked ?? true,
    };
  }
  editorVisible.value = false;
  emitAnnotations();
}

function deserialise(data: { coordsJson?: string; negativeCoordsJson?: string; bboxesJson?: string; resizeMetaJson?: string }) {
  if (data.coordsJson !== undefined) {
    const currentNegative = points.value.filter((p) => p.type === "negative");
    points.value = [...parsePoints(data.coordsJson, "positive"), ...currentNegative];
  }
  if (data.negativeCoordsJson !== undefined) {
    const currentPositive = points.value.filter((p) => p.type !== "negative");
    points.value = [
      ...currentPositive,
      ...parsePoints(data.negativeCoordsJson, "negative"),
    ];
  }
  if (data.bboxesJson !== undefined) {
    bboxes.value = parseBBoxes(data.bboxesJson);
  }
  if (data.resizeMetaJson !== undefined) {
    resizeMeta.value = parseResizeMeta(data.resizeMetaJson);
  }
}

function setImageUrl(url: string) {
  imageUrl.value = url;
}

function cleanup() {}

defineExpose({ deserialise, setImageUrl, cleanup });
</script>

<style scoped>
.sam3-widget {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
}

.sam3-summary {
  padding: 2px 0 4px;
  font-size: 11px;
}

.sam3-summary-has {
  color: #a5d6a7;
}

.sam3-summary-none {
  color: #666;
}

.sam3-open-btn {
  width: 100%;
  padding: 4px 12px;
  background: var(--comfy-input-bg, #333);
  color: var(--comfy-text-normal, #ddd);
  border: 1px solid var(--comfy-input-border, #555);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  transition: background 0.15s;
}

.sam3-open-btn:hover {
  background: var(--comfy-input-hover, #444);
}

.sam3-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}
</style>
