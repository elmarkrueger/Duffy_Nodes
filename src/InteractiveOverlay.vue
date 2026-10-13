<template>
  <div
    ref="rootRef"
    class="io-root"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <div
      ref="viewportRef"
      class="io-viewport"
      :class="{ 'io-panning': panning }"
      @wheel="onWheel"
      @pointerdown="onViewportPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerenter="updateUnit"
    >
      <!-- Interactive stage (native background pixel space, aspect-fit via CSS transform) -->
      <div
        v-if="session"
        ref="stageRef"
        class="io-stage"
        :style="stageStyle"
      >
        <img
          class="io-bg"
          :src="session.bgUrl"
          :style="{ width: `${bg.w}px`, height: `${bg.h}px`, filter: `brightness(${1 - dim})` }"
          draggable="false"
          alt=""
        />
        <img
          class="io-ov"
          :src="session.ovUrl"
          :style="overlayStyle"
          draggable="false"
          alt=""
        />
        <OverlayGizmo
          v-if="mode === 'paused'"
          :state="state"
          :bg="bg"
          :ov="ov"
          :unit="unit"
          @handle-down="onHandleDown"
          @handle-dblclick="onHandleDblClick"
        />
      </div>

      <img
        v-else-if="resultUrl"
        class="io-result"
        :src="resultUrl"
        draggable="false"
        alt=""
      />

      <div v-else class="io-empty">
        <div class="io-empty-title">Interactive Overlay Compositor</div>
        <div class="io-empty-sub">Queue the workflow. It will pause here so you can place the overlay.</div>
      </div>

      <div v-if="mode === 'submitting'" class="io-busy">
        <div class="io-spinner" />
      </div>
    </div>

    <div class="io-hud">
      <span class="io-badge" :class="`io-badge-${mode}`">{{ badgeText }}</span>

      <template v-if="session">
        <span class="io-telemetry" :title="'Anchor position (px), scale, rotation'">
          X {{ telemetry.x }} · Y {{ telemetry.y }} · {{ telemetry.scale }} · {{ telemetry.rot }}°
        </span>
        <span class="io-spacer" />
        <label class="io-dim" title="Dim background">
          <span>Dim</span>
          <input
            v-model.number="dim"
            type="range"
            min="0"
            max="0.85"
            step="0.05"
          />
        </label>
        <button class="io-btn" :disabled="mode !== 'paused'" title="Reset transform (Esc)" @click="resetTransform">
          Reset
        </button>
        <button class="io-btn" :disabled="zoom === 1 && pan[0] === 0 && pan[1] === 0" title="Fit view" @click="resetView">
          Fit
        </button>
        <button class="io-btn io-continue" :disabled="mode !== 'paused'" @click="submit">
          {{ mode === 'submitting' ? 'Applying…' : 'Continue ▶' }}
        </button>
      </template>
      <span v-else class="io-spacer" />

      <span v-if="message" class="io-message">{{ message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue";
// @ts-ignore - resolved at runtime by ComfyUI
import { api } from "COMFY_API";
import OverlayGizmo, { type HandleKind } from "./components/OverlayGizmo.vue";
import {
  clamp,
  cloneState,
  coerceState,
  cssMatrix,
  defaultState,
  fitViewport,
  forwardMatrix,
  moveAnchor,
  rotate,
  scaleCorner,
  scaleEdge,
  setAnchor,
  SNAP_SCREEN_PX,
  translate,
  type OverlayState,
  type Size,
  type Vec2,
} from "./utils/overlay_transform";

const PAUSE_EVENT = "duffy-interactive-overlay-pause";
const RESUME_ROUTE = "/duffy/interactive_overlay/resume";
const PENDING_ROUTE = "/duffy/interactive_overlay/pending";
const BLEND_CSS: Record<string, string> = {
  normal: "normal",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  add: "plus-lighter",
};

type Mode = "idle" | "paused" | "submitting";

interface Session {
  sessionId: string;
  nodeId: string;
  bgUrl: string;
  ovUrl: string;
  inputSignature: string;
}

const props = defineProps<{
  getNodeId: () => string;
  getAppearance: () => { blend: string; opacity: number };
  onStateChange?: (json: string) => void;
}>();

const rootRef = ref<HTMLDivElement | null>(null);
const viewportRef = ref<HTMLDivElement | null>(null);
const stageRef = ref<HTMLDivElement | null>(null);

const mode = ref<Mode>("idle");
const session = ref<Session | null>(null);
const resultUrl = ref<string>("");
const message = ref<string>("");

const bg = reactive<Size>({ w: 1, h: 1 });
const ov = reactive<Size>({ w: 1, h: 1 });
const state = ref<OverlayState>(defaultState({ w: 1, h: 1 }, { w: 1, h: 1 }));
const initialState = ref<OverlayState>(cloneState(state.value));
const blendMode = ref("normal");
const opacity = ref(1);
const dim = ref(0);

const viewportSize = reactive({ w: 0, h: 0 });
const zoom = ref(1);
const pan = ref<Vec2>([0, 0]);
const unit = ref(1);
const panning = ref(false);

let resizeObserver: ResizeObserver | null = null;
let rehydrateTimer: ReturnType<typeof setTimeout> | null = null;
let rafId = 0;
let pendingMove: PointerEvent | null = null;

interface Drag {
  kind: HandleKind | "pan";
  pointerId: number;
  s0: OverlayState;
  p0: Vec2;
  screen0: Vec2;
  pan0: Vec2;
}
let drag: Drag | null = null;

// ---------------------------------------------------------------------------
// Derived view state
// ---------------------------------------------------------------------------

const fit = computed(() => fitViewport(bg.w, bg.h, viewportSize.w, viewportSize.h));

const stageStyle = computed(() => {
  const f = fit.value;
  const s = f.s * zoom.value;
  return {
    width: `${bg.w}px`,
    height: `${bg.h}px`,
    transform: `translate(${f.ox + pan.value[0]}px, ${f.oy + pan.value[1]}px) scale(${s})`,
  };
});

const overlayStyle = computed(() => ({
  width: `${ov.w}px`,
  height: `${ov.h}px`,
  transform: cssMatrix(forwardMatrix(state.value, bg, ov)),
  opacity: String(opacity.value),
  mixBlendMode: (BLEND_CSS[blendMode.value] ?? "normal") as any,
}));

const telemetry = computed(() => {
  const s = state.value;
  const [sx, sy] = s.scale_factors;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  return {
    x: Math.round(s.translation_norm[0] * bg.w),
    y: Math.round(s.translation_norm[1] * bg.h),
    scale: Math.abs(sx - sy) < 1e-4 ? pct(sx) : `${pct(sx)} × ${pct(sy)}`,
    rot: s.rotation_deg.toFixed(1),
  };
});

const badgeText = computed(() => {
  if (mode.value === "paused") return "⏸ Paused, adjust the overlay";
  if (mode.value === "submitting") return "Resuming…";
  return resultUrl.value ? "Last result" : "Idle";
});

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

function matchesNode(nodeId: unknown): boolean {
  const own = props.getNodeId();
  const id = String(nodeId ?? "");
  // Nodes inside subgraphs are addressed by their execution path ("12:5").
  return id === own || id.endsWith(`:${own}`);
}

function loadSession(payload: any) {
  if (!payload || !matchesNode(payload.node_id)) return;
  const [bw, bh] = Array.isArray(payload.bg_size) ? payload.bg_size : [1, 1];
  const [ow, oh] = Array.isArray(payload.overlay_size) ? payload.overlay_size : [1, 1];
  bg.w = Math.max(1, Number(bw) || 1);
  bg.h = Math.max(1, Number(bh) || 1);
  ov.w = Math.max(1, Number(ow) || 1);
  ov.h = Math.max(1, Number(oh) || 1);

  const fallback = defaultState(bg, ov);
  initialState.value = coerceState(payload.default_state, fallback);
  state.value = coerceState(payload.state, initialState.value);

  const appearance = props.getAppearance();
  blendMode.value = BLEND_CSS[appearance.blend] ? appearance.blend : String(payload.blend_mode ?? "normal");
  opacity.value = clamp(Number(appearance.opacity ?? payload.opacity ?? 1), 0, 1);

  session.value = {
    sessionId: String(payload.session_id),
    nodeId: String(payload.node_id),
    bgUrl: api.apiURL(String(payload.bg_preview_url ?? "")),
    ovUrl: api.apiURL(String(payload.ov_preview_url ?? "")),
    inputSignature: String(payload.input_signature ?? ""),
  };
  message.value = "";
  zoom.value = 1;
  pan.value = [0, 0];
  mode.value = "paused";
  nextTick(() => {
    measureViewport();
    updateUnit();
    rootRef.value?.focus({ preventScroll: true });
  });
}

function endSession(note = "") {
  session.value = null;
  drag = null;
  panning.value = false;
  mode.value = "idle";
  message.value = note;
}

async function submit() {
  if (mode.value !== "paused" || !session.value) return;
  const current = session.value;
  const transform = {
    ...cloneState(state.value),
    blend_mode: blendMode.value,
    opacity: opacity.value,
    input_signature: current.inputSignature,
  };
  mode.value = "submitting";
  message.value = "";
  try {
    const response = await api.fetchApi(RESUME_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: current.sessionId, node_id: current.nodeId, transform }),
    });
    if (response.ok) {
      props.onStateChange?.(JSON.stringify(transform));
      endSession();
      return;
    }
    const body = await response.json().catch(() => ({}));
    if (response.status === 404) {
      endSession("Session expired. Queue the workflow again.");
    } else {
      mode.value = "paused";
      message.value = String(body?.message ?? `Resume failed (${response.status})`);
    }
  } catch (error) {
    mode.value = "paused";
    message.value = "Network error while resuming.";
    console.error("[Duffy Overlay] Resume failed", error);
  }
}

async function rehydrate() {
  if (session.value) return;
  try {
    const response = await api.fetchApi(PENDING_ROUTE);
    if (!response.ok) return;
    const body = await response.json();
    const match = (body?.sessions ?? []).find((s: any) => matchesNode(s?.node_id));
    if (match) loadSession(match);
  } catch {
    /* server not reachable yet; ignored */
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function measureViewport() {
  const el = viewportRef.value;
  if (!el) return;
  viewportSize.w = el.clientWidth;
  viewportSize.h = el.clientHeight;
}

/** Background pixels per *screen* pixel (accounts for fit, view zoom and graph canvas zoom). */
function updateUnit() {
  const rect = stageRef.value?.getBoundingClientRect();
  if (rect && rect.width > 0) unit.value = bg.w / rect.width;
}

function pointerToBg(ev: PointerEvent | MouseEvent): Vec2 {
  const rect = stageRef.value!.getBoundingClientRect();
  return [((ev.clientX - rect.left) * bg.w) / rect.width, ((ev.clientY - rect.top) * bg.h) / rect.height];
}

/** Ratio between viewport CSS pixels and screen pixels (graph canvas zoom). */
function viewportCssScale(): number {
  const el = viewportRef.value;
  if (!el || !el.clientWidth) return 1;
  return el.getBoundingClientRect().width / el.clientWidth;
}

// ---------------------------------------------------------------------------
// Pointer handling
// ---------------------------------------------------------------------------

function capture(ev: PointerEvent) {
  try {
    viewportRef.value?.setPointerCapture(ev.pointerId);
  } catch {
    /* pointer already released */
  }
}

function onHandleDown(kind: HandleKind, ev: PointerEvent) {
  if (mode.value !== "paused" || !stageRef.value) return;
  rootRef.value?.focus({ preventScroll: true });
  updateUnit();
  drag = {
    kind,
    pointerId: ev.pointerId,
    s0: cloneState(state.value),
    p0: pointerToBg(ev),
    screen0: [ev.clientX, ev.clientY],
    pan0: [pan.value[0], pan.value[1]],
  };
  capture(ev);
}

function onViewportPointerDown(ev: PointerEvent) {
  // Alt + left drag or middle drag pans the zoomed view (never alters the transform).
  if (!session.value) return;
  if ((ev.button === 0 && ev.altKey) || ev.button === 1) {
    ev.preventDefault();
    drag = {
      kind: "pan",
      pointerId: ev.pointerId,
      s0: cloneState(state.value),
      p0: [0, 0],
      screen0: [ev.clientX, ev.clientY],
      pan0: [pan.value[0], pan.value[1]],
    };
    panning.value = true;
    capture(ev);
  }
}

function onPointerMove(ev: PointerEvent) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  ev.stopPropagation();
  pendingMove = ev;
  if (!rafId) rafId = requestAnimationFrame(flushMove);
}

function flushMove() {
  rafId = 0;
  const ev = pendingMove;
  pendingMove = null;
  if (!ev || !drag || !stageRef.value) return;

  if (drag.kind === "pan") {
    const k = viewportCssScale();
    pan.value = [drag.pan0[0] + (ev.clientX - drag.screen0[0]) / k, drag.pan0[1] + (ev.clientY - drag.screen0[1]) / k];
    return;
  }

  const p = pointerToBg(ev);
  const { s0, p0 } = drag;
  switch (drag.kind) {
    case "body":
      state.value = translate(s0, p0, p, bg, {
        snap: !(ev.ctrlKey || ev.metaKey),
        snapThresholdPx: SNAP_SCREEN_PX * unit.value,
      });
      break;
    case "tl":
    case "tr":
    case "br":
    case "bl":
      state.value = scaleCorner(s0, p0, p, bg, ev.shiftKey);
      break;
    case "ml":
    case "mr":
      state.value = scaleEdge(s0, p0, p, bg, "x");
      break;
    case "tc":
    case "bc":
      state.value = scaleEdge(s0, p0, p, bg, "y");
      break;
    case "rotate":
      state.value = rotate(s0, p0, p, bg, ev.shiftKey);
      break;
    case "anchor":
      state.value = moveAnchor(s0, p, bg, ov);
      break;
  }
}

function onPointerUp(ev: PointerEvent) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  ev.stopPropagation();
  if (pendingMove) flushMove();
  try {
    viewportRef.value?.releasePointerCapture(ev.pointerId);
  } catch {
    /* already released */
  }
  drag = null;
  panning.value = false;
}

function onHandleDblClick(kind: HandleKind) {
  if (mode.value !== "paused") return;
  const next = cloneState(state.value);
  if (kind === "rotate") {
    next.rotation_deg = 0;
    state.value = next;
  } else if (kind === "anchor") {
    state.value = setAnchor(next, [0.5, 0.5], bg, ov);
  } else if (kind !== "body") {
    next.scale_factors = [initialState.value.scale_factors[0], initialState.value.scale_factors[1]];
    state.value = next;
  }
}

function onWheel(ev: WheelEvent) {
  if (!session.value || !ev.altKey) return;
  ev.preventDefault();
  const el = viewportRef.value!;
  const rect = el.getBoundingClientRect();
  const k = viewportCssScale();
  const vx = (ev.clientX - rect.left) / k;
  const vy = (ev.clientY - rect.top) / k;
  const f = fit.value;
  const before = f.s * zoom.value;
  const nextZoom = clamp(zoom.value * (ev.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 16);
  const qx = (vx - f.ox - pan.value[0]) / before;
  const qy = (vy - f.oy - pan.value[1]) / before;
  zoom.value = nextZoom;
  pan.value = nextZoom === 1 ? [0, 0] : [vx - f.ox - qx * f.s * nextZoom, vy - f.oy - qy * f.s * nextZoom];
  nextTick(updateUnit);
}

function onKeyDown(ev: KeyboardEvent) {
  if (ev.key === "Escape" && mode.value === "paused") {
    ev.preventDefault();
    ev.stopPropagation();
    resetTransform();
  }
}

function resetTransform() {
  state.value = cloneState(initialState.value);
}

function resetView() {
  zoom.value = 1;
  pan.value = [0, 0];
  nextTick(updateUnit);
}

// ---------------------------------------------------------------------------
// API events
// ---------------------------------------------------------------------------

function onPause(event: any) {
  loadSession(event?.detail);
}

function onExecutionStopped() {
  if (mode.value !== "idle") endSession("Execution was cancelled.");
}

function onReconnected() {
  rehydrate();
}

// ---------------------------------------------------------------------------
// Public API (called by the extension wrapper)
// ---------------------------------------------------------------------------

function setResult(url: string) {
  resultUrl.value = url;
}

function setAppearance(blend: string, value: number) {
  if (BLEND_CSS[blend]) blendMode.value = blend;
  if (Number.isFinite(value)) opacity.value = clamp(value, 0, 1);
}

function cleanup() {
  api.removeEventListener(PAUSE_EVENT, onPause);
  api.removeEventListener("execution_interrupted", onExecutionStopped);
  api.removeEventListener("execution_error", onExecutionStopped);
  api.removeEventListener("reconnected", onReconnected);
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  if (rehydrateTimer) clearTimeout(rehydrateTimer);
  rehydrateTimer = null;
  drag = null;
}

onMounted(() => {
  api.addEventListener(PAUSE_EVENT, onPause);
  api.addEventListener("execution_interrupted", onExecutionStopped);
  api.addEventListener("execution_error", onExecutionStopped);
  api.addEventListener("reconnected", onReconnected);
  if (viewportRef.value) {
    resizeObserver = new ResizeObserver(() => {
      measureViewport();
      nextTick(updateUnit);
    });
    resizeObserver.observe(viewportRef.value);
  }
  // Node ids are assigned after creation when a workflow loads, so rehydrate a moment later.
  rehydrateTimer = setTimeout(rehydrate, 400);
});

onUnmounted(cleanup);

defineExpose({ loadSession, setResult, setAppearance, cleanup });
</script>

<style scoped>
.io-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: var(--comfy-menu-bg, #1f1f23);
  border-radius: 6px;
  overflow: hidden;
  outline: none;
  color: var(--fg-color, #e8e8ec);
  font: 12px/1.3 system-ui, sans-serif;
  user-select: none;
}
.io-root:focus-visible {
  box-shadow: inset 0 0 0 1px #4cc2ff;
}
.io-viewport {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background:
    repeating-conic-gradient(#2a2a30 0% 25%, #232328 0% 50%) 50% / 16px 16px;
  touch-action: none;
}
.io-viewport.io-panning {
  cursor: grabbing;
}
.io-stage {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  isolation: isolate;
  will-change: transform;
}
.io-bg,
.io-ov {
  position: absolute;
  left: 0;
  top: 0;
  max-width: none;
  pointer-events: none;
}
.io-ov {
  transform-origin: 0 0;
  will-change: transform;
}
.io-result {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
.io-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  padding: 16px;
  opacity: 0.75;
}
.io-empty-title {
  font-size: 14px;
  font-weight: 600;
}
.io-busy {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
}
.io-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #4cc2ff;
  animation: io-spin 0.8s linear infinite;
}
@keyframes io-spin {
  to {
    transform: rotate(360deg);
  }
}
.io-hud {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.35);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.io-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
  background: #3a3a42;
  white-space: nowrap;
}
.io-badge-paused {
  background: #b26a00;
  color: #fff;
  animation: io-pulse 1.6s ease-in-out infinite;
}
.io-badge-submitting {
  background: #1e88e5;
  color: #fff;
}
@keyframes io-pulse {
  50% {
    opacity: 0.7;
  }
}
.io-telemetry {
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
  white-space: nowrap;
}
.io-spacer {
  flex: 1 1 auto;
}
.io-dim {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.io-dim input {
  width: 70px;
}
.io-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #34343c;
  color: inherit;
  cursor: pointer;
}
.io-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.io-btn:not(:disabled):hover {
  background: #43434d;
}
.io-continue {
  background: #2e7d32;
  border-color: #43a047;
  font-weight: 700;
}
.io-continue:not(:disabled):hover {
  background: #388e3c;
}
.io-message {
  width: 100%;
  color: #ffb74d;
}
</style>
