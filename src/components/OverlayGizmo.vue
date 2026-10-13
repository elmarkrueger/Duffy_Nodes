<template>
  <svg
    class="io-gizmo"
    :viewBox="`0 0 ${bg.w} ${bg.h}`"
    :width="bg.w"
    :height="bg.h"
    preserveAspectRatio="none"
  >
    <!-- Interior body: translate -->
    <polygon
      class="io-body"
      :points="bodyPoints"
      :stroke-width="stroke"
      @pointerdown="emitDown('body', $event)"
    />

    <!-- Rotation lever -->
    <line
      class="io-lever"
      :x1="lever.from[0]"
      :y1="lever.from[1]"
      :x2="lever.to[0]"
      :y2="lever.to[1]"
      :stroke-width="stroke"
    />
    <circle
      class="io-handle io-rotate"
      :cx="lever.to[0]"
      :cy="lever.to[1]"
      :r="radius * 1.15"
      :stroke-width="stroke"
      @pointerdown="emitDown('rotate', $event)"
      @dblclick="emitDbl('rotate', $event)"
    >
      <title>Rotate (Shift: 15° steps, double-click: reset)</title>
    </circle>

    <!-- Edge handles: single-axis scale -->
    <rect
      v-for="h in edgeHandles"
      :key="h.id"
      class="io-handle io-edge"
      :style="{ cursor: h.cursor }"
      :x="h.p[0] - radius * 0.8"
      :y="h.p[1] - radius * 0.8"
      :width="radius * 1.6"
      :height="radius * 1.6"
      :rx="radius * 0.3"
      :stroke-width="stroke"
      @pointerdown="emitDown(h.id, $event)"
      @dblclick="emitDbl(h.id, $event)"
    />

    <!-- Corner handles: uniform scale (Shift: free) -->
    <rect
      v-for="h in cornerHandles"
      :key="h.id"
      class="io-handle io-corner"
      :style="{ cursor: h.cursor }"
      :x="h.p[0] - radius"
      :y="h.p[1] - radius"
      :width="radius * 2"
      :height="radius * 2"
      :stroke-width="stroke"
      @pointerdown="emitDown(h.id, $event)"
      @dblclick="emitDbl(h.id, $event)"
    />

    <!-- Anchor / pivot crosshair -->
    <g
      class="io-anchor"
      @pointerdown="emitDown('anchor', $event)"
      @dblclick="emitDbl('anchor', $event)"
    >
      <circle :cx="anchor[0]" :cy="anchor[1]" :r="radius * 1.6" class="io-anchor-hit" />
      <circle :cx="anchor[0]" :cy="anchor[1]" :r="radius * 0.9" :stroke-width="stroke" class="io-anchor-ring" />
      <line :x1="anchor[0] - radius * 1.6" :y1="anchor[1]" :x2="anchor[0] + radius * 1.6" :y2="anchor[1]" :stroke-width="stroke" />
      <line :x1="anchor[0]" :y1="anchor[1] - radius * 1.6" :x2="anchor[0]" :y2="anchor[1] + radius * 1.6" :stroke-width="stroke" />
      <title>Pivot (drag to move, double-click: center)</title>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  apply,
  forwardMatrix,
  toBgAxes,
  type OverlayState,
  type Size,
  type Vec2,
} from "../utils/overlay_transform";

export type HandleKind =
  | "body" | "rotate" | "anchor"
  | "tl" | "tr" | "br" | "bl"
  | "tc" | "bc" | "ml" | "mr";

const props = defineProps<{
  state: OverlayState;
  bg: Size;
  ov: Size;
  /** Background pixels per screen pixel (keeps handles a constant on-screen size). */
  unit: number;
}>();

const emit = defineEmits<{
  (e: "handle-down", kind: HandleKind, ev: PointerEvent): void;
  (e: "handle-dblclick", kind: HandleKind, ev: MouseEvent): void;
}>();

const radius = computed(() => 6 * props.unit);
const stroke = computed(() => 1.5 * props.unit);
const matrix = computed(() => forwardMatrix(props.state, props.bg, props.ov));
const at = (u: number, v: number): Vec2 => apply(matrix.value, [u * props.ov.w, v * props.ov.h]);

const bodyPoints = computed(() =>
  [at(0, 0), at(1, 0), at(1, 1), at(0, 1)].map((p) => `${p[0]},${p[1]}`).join(" "),
);

const cornerHandles = computed(() => [
  { id: "tl" as HandleKind, p: at(0, 0), cursor: "nwse-resize" },
  { id: "tr" as HandleKind, p: at(1, 0), cursor: "nesw-resize" },
  { id: "br" as HandleKind, p: at(1, 1), cursor: "nwse-resize" },
  { id: "bl" as HandleKind, p: at(0, 1), cursor: "nesw-resize" },
]);

const edgeHandles = computed(() => [
  { id: "tc" as HandleKind, p: at(0.5, 0), cursor: "ns-resize" },
  { id: "bc" as HandleKind, p: at(0.5, 1), cursor: "ns-resize" },
  { id: "ml" as HandleKind, p: at(0, 0.5), cursor: "ew-resize" },
  { id: "mr" as HandleKind, p: at(1, 0.5), cursor: "ew-resize" },
]);

const lever = computed(() => {
  const from = at(0.5, 0);
  // Local "up" (respecting a vertical flip), rotated into background axes.
  const up = toBgAxes([0, props.state.scale_factors[1] < 0 ? 1 : -1], props.state.rotation_deg);
  const length = 34 * props.unit;
  return { from, to: [from[0] + up[0] * length, from[1] + up[1] * length] as Vec2 };
});

const anchor = computed<Vec2>(() => [
  props.state.translation_norm[0] * props.bg.w,
  props.state.translation_norm[1] * props.bg.h,
]);

function emitDown(kind: HandleKind, ev: PointerEvent) {
  if (ev.button !== 0 || ev.altKey) return; // Alt+drag is reserved for view panning
  ev.preventDefault();
  ev.stopPropagation();
  emit("handle-down", kind, ev);
}

function emitDbl(kind: HandleKind, ev: MouseEvent) {
  ev.preventDefault();
  ev.stopPropagation();
  emit("handle-dblclick", kind, ev);
}
</script>

<style scoped>
.io-gizmo {
  position: absolute;
  left: 0;
  top: 0;
  overflow: visible;
  pointer-events: none;
}
.io-body {
  fill: rgba(255, 255, 255, 0.001);
  stroke: #4cc2ff;
  cursor: move;
  pointer-events: all;
}
.io-lever {
  stroke: #4cc2ff;
  pointer-events: none;
}
.io-handle {
  fill: #ffffff;
  stroke: #1e88e5;
  pointer-events: all;
}
.io-handle:hover {
  fill: #4cc2ff;
}
.io-rotate {
  cursor: grab;
}
.io-anchor {
  pointer-events: all;
  cursor: crosshair;
  stroke: #ff9f43;
}
.io-anchor-hit {
  fill: transparent;
  stroke: none;
}
.io-anchor-ring {
  fill: rgba(255, 159, 67, 0.25);
}
</style>
