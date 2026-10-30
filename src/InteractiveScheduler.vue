<template>
  <div
    ref="rootEl"
    class="duffy-scheduler-root"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <!-- Top Control Toolbar -->
    <div class="scheduler-toolbar">
      <div class="toolbar-left">
        <span
          class="status-pill"
          :class="isModified ? 'status-custom' : 'status-preset'"
          :title="isModified ? 'Custom user-edited curve active' : 'Following mathematical baseline preset'"
        >
          {{ isModified ? "CUSTOM" : "PRESET" }}
        </span>
        <span class="meta-badge" :title="modelBounds.from_model ? 'Bounds extracted from connected MODEL' : 'Using fallback sigma bounds'">
          {{ modelBounds.from_model ? "Model σ" : "Fallback σ" }}:
          {{ formatCompact(modelBounds.sigma_max) }} → {{ formatCompact(modelBounds.sigma_min) }}
        </span>
        <span class="meta-badge">
          {{ activeSteps }} {{ activeSteps === 1 ? "step" : "steps" }} ({{ customSigmas.length }} pts)
        </span>
      </div>

      <div class="toolbar-right">
        <button
          type="button"
          class="tb-btn"
          :class="{ active: yScaleMode === 'log' }"
          title="Toggle Linear vs. Normalized Log Y-Axis scale for fine low-sigma control"
          @click="toggleYScale"
        >
          Y: {{ yScaleMode === "log" ? "Log" : "Lin" }}
        </button>
        <button
          type="button"
          class="tb-btn"
          :disabled="activeSteps >= 1000"
          title="Insert a new step midpoint on the schedule (or Double-Click / Shift+Click on curve)"
          @click="insertStepFromToolbar"
        >
          + Step
        </button>
        <button
          type="button"
          class="tb-btn"
          :disabled="activeSteps <= 1"
          title="Remove selected or penultimate step (minimum 1 step; or Right-Click / Alt+Click vertex)"
          @click="removeStepFromToolbar"
        >
          - Step
        </button>
        <button
          type="button"
          class="tb-btn tb-btn-reset"
          title="Reset schedule points to the unmodified mathematical preset curve"
          @click="resetToBaseline"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Non-blocking Preset Change Prompt when is_modified is true -->
    <div v-if="pendingPresetChange" class="preset-prompt-banner">
      <span class="prompt-text">
        Baseline preset changed to <strong>{{ baselineScheduler }}</strong> while custom edits are active:
      </span>
      <div class="prompt-actions">
        <button type="button" class="prompt-btn snap" @click="confirmSnapToNewPreset">
          Snap to {{ baselineScheduler }}
        </button>
        <button type="button" class="prompt-btn keep" @click="dismissPresetPrompt">
          Keep Custom Curve
        </button>
      </div>
    </div>

    <!-- Interactive 2D Graph Canvas Container -->
    <div ref="canvasWrapEl" class="canvas-wrapper">
      <canvas
        ref="canvasEl"
        class="schedule-canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerLeave"
        @dblclick="onDoubleClick"
        @wheel.prevent="onWheel"
        @contextmenu.prevent="onCanvasContextMenu"
      ></canvas>

      <!-- Live Coordinate HUD Tooltip -->
      <div
        v-if="hudInfo"
        class="hud-tooltip"
        :style="{ left: `${hudInfo.x}px`, top: `${hudInfo.y}px` }"
      >
        <div class="hud-title">
          Step {{ hudInfo.index }} / {{ activeSteps }}
          <span v-if="hudInfo.isTerminal" class="hud-locked">(Locked Terminal 0.0)</span>
        </div>
        <div class="hud-row">
          <span>σ:</span>
          <strong>{{ hudInfo.sigma.toFixed(4) }}</strong>
        </div>
        <div class="hud-row">
          <span>Δσ:</span>
          <strong>{{ hudInfo.delta.toFixed(4) }}</strong>
        </div>
        <div class="hud-row hud-sub">
          <span>Base:</span>
          <span>{{ hudInfo.baseline.toFixed(4) }}</span>
        </div>
      </div>
    </div>

    <!-- Footer Legend & Quick Help -->
    <div class="scheduler-footer">
      <div class="legend-items">
        <span class="legend-item">
          <span class="swatch swatch-active"></span> Active σ
        </span>
        <span class="legend-item">
          <span class="swatch swatch-base"></span> Baseline ({{ baselineScheduler }})
        </span>
        <span class="legend-item">
          <span class="swatch swatch-delta"></span> Step Δσ
        </span>
      </div>
      <div class="hint-text">
        Drag: edit σ · Wheel/↑↓: ±0.001 · DblClick/Shift+Click: +step · RightClick/Alt+Click: -step
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
// @ts-ignore - resolved at runtime by ComfyUI
import { api as comfyApi } from "COMFY_API";

export interface SchedulerSerialisedState {
  version: string;
  is_modified: boolean;
  baseline_scheduler: string;
  steps: number;
  denoise: number;
  y_scale_mode: "linear" | "log";
  model_bounds: {
    sigma_max: number;
    sigma_min: number;
    from_model?: boolean;
  };
  baseline_sigmas: number[];
  custom_sigmas: number[];
}

export interface WidgetParamsSnapshot {
  scheduler: string;
  steps: number;
  denoise: number;
  sigmaMaxFallback: number;
  sigmaMinFallback: number;
  enforceMonotonic: boolean;
}

const props = defineProps<{
  getNodeId: () => string;
  initialStateJson?: string;
  getWidgetParams: () => WidgetParamsSnapshot;
  onStateChange?: (json: string) => void;
  onStepsChange?: (steps: number) => void;
  onForwardContextMenu?: (event: MouseEvent) => void;
}>();

const LOG_SCALE_K = 50.0;
const PAD_LEFT = 46;
const PAD_RIGHT = 18;
const PAD_TOP = 18;
const PAD_BOTTOM = 28;
const HIT_RADIUS_PX = 10;

const rootEl = ref<HTMLElement | null>(null);
const canvasWrapEl = ref<HTMLElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);

const isModified = ref<boolean>(false);
const baselineScheduler = ref<string>("normal");
const currentDenoise = ref<number>(1.0);
const enforceMonotonic = ref<boolean>(true);
const yScaleMode = ref<"linear" | "log">("linear");
const pendingPresetChange = ref<boolean>(false);

const modelBounds = ref<{ sigma_max: number; sigma_min: number; from_model: boolean }>({
  sigma_max: 1.0,
  sigma_min: 0.01,
  from_model: false,
});

const baselineSigmas = ref<number[]>([1.0, 0.5, 0.0]);
const customSigmas = ref<number[]>([1.0, 0.5, 0.0]);

const selectedIndex = ref<number | null>(null);
const hoveredIndex = ref<number | null>(null);
const draggingIndex = ref<number | null>(null);
const pointerPos = ref<{ x: number; y: number } | null>(null);

let resizeObserver: ResizeObserver | null = null;
let baselineAbortController: AbortController | null = null;

const activeSteps = computed(() => Math.max(1, customSigmas.value.length - 1));

const effectiveYMax = computed(() => {
  const bMax = modelBounds.value.sigma_max || 1.0;
  let maxVal = bMax;
  for (const v of baselineSigmas.value) {
    if (Number.isFinite(v) && v > maxVal) maxVal = v;
  }
  for (const v of customSigmas.value) {
    if (Number.isFinite(v) && v > maxVal) maxVal = v;
  }
  return Math.max(0.01, maxVal);
});

const hudInfo = computed(() => {
  const idx = draggingIndex.value ?? hoveredIndex.value;
  if (idx === null || idx < 0 || idx >= customSigmas.value.length) return null;
  const canvas = canvasEl.value;
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const pt = indexToCanvasXY(idx, customSigmas.value[idx], rect.width, rect.height);
  const sigma = customSigmas.value[idx] ?? 0.0;
  const nextSigma = idx < customSigmas.value.length - 1 ? customSigmas.value[idx + 1] : 0.0;
  const prevSigma = idx > 0 ? customSigmas.value[idx - 1] : sigma;
  const delta = idx < customSigmas.value.length - 1 ? sigma - nextSigma : prevSigma - sigma;
  const baseVal = baselineSigmas.value[idx] ?? 0.0;

  const tooltipW = 148;
  const tooltipH = 74;
  let tx = pt.x + 12;
  let ty = pt.y - tooltipH - 8;
  if (tx + tooltipW > rect.width - 6) tx = pt.x - tooltipW - 12;
  if (ty < 6) ty = pt.y + 12;

  return {
    index: idx,
    sigma,
    delta,
    baseline: baseVal,
    isTerminal: idx === customSigmas.value.length - 1,
    x: Math.max(4, tx),
    y: Math.max(4, ty),
  };
});

function formatCompact(val: number): string {
  if (!Number.isFinite(val)) return "0";
  if (val >= 100) return val.toFixed(1);
  if (val >= 1) return val.toFixed(3);
  return val.toFixed(4);
}

// ---------------------------------------------------------------------------
// Analytical Client-Side Schedule Generator & PCHIP Resampler
// ---------------------------------------------------------------------------

function generateAnalyticalSchedule(
  scheduler: string,
  steps: number,
  denoise: number,
  sigmaMax: number,
  sigmaMin: number
): number[] {
  const effSteps = Math.max(1, Math.min(1000, Math.round(steps || 20)));
  const effDenoise = Math.max(0.01, Math.min(1.0, Number(denoise) || 1.0));
  const sMax = Math.max(1e-4, Number(sigmaMax) || 1.0);
  const sMin = Math.max(1e-6, Math.min(Number(sigmaMin) || 0.01, sMax * 0.999));

  const totalSteps = effDenoise < 0.9999 ? Math.max(effSteps, Math.floor(effSteps / effDenoise)) : effSteps;
  const name = (scheduler || "normal").trim().toLowerCase();

  let full: number[] = [];
  if (totalSteps === 1) {
    full = [sMax, 0.0];
  } else {
    const pts: number[] = [];
    for (let i = 0; i < totalSteps; i++) {
      const t = totalSteps > 1 ? i / (totalSteps - 1) : 0.0;
      let s = sMax;
      if (name === "karras") {
        const rho = 7.0;
        const maxInv = Math.pow(sMax, 1.0 / rho);
        const minInv = Math.pow(sMin, 1.0 / rho);
        s = Math.pow(maxInv + t * (minInv - maxInv), rho);
      } else if (name === "exponential") {
        s = Math.exp(Math.log(sMax) * (1.0 - t) + Math.log(sMin) * t);
      } else if (name === "simple") {
        const u = 1.0 - t * (1.0 - sMin / sMax);
        s = u * sMax;
      } else if (name === "sgm_uniform") {
        const u = 1.0 - i / totalSteps;
        s = sMin + u * (sMax - sMin);
      } else if (name === "beta") {
        const u = Math.max(0.0, Math.min(1.0, 1.0 - t));
        const ua = Math.pow(u, 0.6);
        const ub = Math.pow(1.0 - u, 0.6);
        const w = ua / (ua + ub + 1e-8);
        s = Math.exp(Math.log(sMin) + w * (Math.log(sMax) - Math.log(sMin)));
      } else if (name === "linear_quadratic") {
        let val = 0.0;
        if (t <= 0.5) {
          val = 1.0 - t;
        } else {
          const rem = (t - 0.5) / 0.5;
          val = 0.5 * (1.0 - rem * rem * 0.5 - rem * 0.5);
        }
        s = sMin + val * (sMax - sMin);
      } else if (name === "kl_optimal") {
        const aMax = Math.atan(sMax);
        const aMin = Math.atan(sMin);
        s = Math.tan((1.0 - t) * aMax + t * aMin);
      } else if (name === "ddim_uniform") {
        const u = 1.0 - i / totalSteps;
        s = Math.exp(Math.log(sMin) + u * (Math.log(sMax) - Math.log(sMin)));
      } else {
        // normal
        s = Math.exp(Math.log(sMax) * (1.0 - t) + Math.log(sMin) * t);
      }
      pts.push(s);
    }
    pts.push(0.0);
    full = pts;
  }

  if (effDenoise < 0.9999 && full.length > effSteps + 1) {
    full = full.slice(full.length - (effSteps + 1));
  }
  full[full.length - 1] = 0.0;
  return full;
}

function sanitizeAndClampSigmas(
  points: number[],
  monotonic: boolean,
  fallbackMax = 1.0
): number[] {
  const cap = 10000.0;
  if (!Array.isArray(points) || points.length < 2) {
    return [Math.max(1e-4, fallbackMax), 0.0];
  }
  const out = points.slice(0, 1001).map((v) => {
    const num = Number(v);
    if (!Number.isFinite(num)) return 0.0;
    return Math.max(0.0, Math.min(cap, num));
  });
  if (monotonic && out.length > 2) {
    for (let i = 1; i < out.length - 1; i++) {
      if (out[i] > out[i - 1]) {
        out[i] = out[i - 1];
      }
    }
  }
  out[out.length - 1] = 0.0;
  return out;
}

function resampleCurvePchip(
  points: number[],
  newSteps: number,
  monotonic: boolean
): number[] {
  const targetSteps = Math.max(1, Math.min(1000, Math.round(newSteps)));
  const src = sanitizeAndClampSigmas(points, monotonic, modelBounds.value.sigma_max);
  const nSrc = src.length;
  const nDst = targetSteps + 1;

  if (nSrc === nDst) return src.slice();
  if (targetSteps === 1) return [src[0], 0.0];

  const x: number[] = [];
  for (let i = 0; i < nSrc; i++) x.push(i / (nSrc - 1));

  if (nSrc === 2) {
    const linear: number[] = [];
    for (let j = 0; j < nDst; j++) {
      const u = j / (nDst - 1);
      linear.push(src[0] * (1.0 - u) + src[1] * u);
    }
    return sanitizeAndClampSigmas(linear, monotonic, modelBounds.value.sigma_max);
  }

  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < nSrc - 1; i++) {
    const hi = Math.max(1e-12, x[i + 1] - x[i]);
    h.push(hi);
    delta.push((src[i + 1] - src[i]) / hi);
  }

  const d = new Array<number>(nSrc).fill(0.0);
  for (let k = 1; k < nSrc - 1; k++) {
    if (delta[k - 1] * delta[k] <= 0.0) {
      d[k] = 0.0;
    } else {
      const w1 = 2.0 * h[k] + h[k - 1];
      const w2 = h[k] + 2.0 * h[k - 1];
      d[k] = (w1 + w2) / (w1 / delta[k - 1] + w2 / delta[k]);
    }
  }

  let d0 = ((2.0 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1]);
  if (d0 * delta[0] <= 0.0) d0 = 0.0;
  else if (delta[0] * delta[1] <= 0.0 && Math.abs(d0) > Math.abs(3.0 * delta[0])) {
    d0 = 3.0 * delta[0];
  }
  d[0] = d0;

  const last = nSrc - 2;
  let dn =
    ((2.0 * h[last] + h[last - 1]) * delta[last] - h[last] * delta[last - 1]) /
    (h[last] + h[last - 1]);
  if (dn * delta[last] <= 0.0) dn = 0.0;
  else if (
    delta[last] * delta[last - 1] <= 0.0 &&
    Math.abs(dn) > Math.abs(3.0 * delta[last])
  ) {
    dn = 3.0 * delta[last];
  }
  d[nSrc - 1] = dn;

  const out = new Array<number>(nDst).fill(0.0);
  out[0] = src[0];
  out[nDst - 1] = 0.0;

  for (let j = 1; j < nDst - 1; j++) {
    const xVal = j / (nDst - 1);
    let idx = Math.min(nSrc - 2, Math.max(0, Math.floor(xVal * (nSrc - 1))));
    while (idx < nSrc - 2 && xVal > x[idx + 1]) idx++;
    while (idx > 0 && xVal < x[idx]) idx--;

    const hk = h[idx];
    const t = (xVal - x[idx]) / hk;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2.0 * t3 - 3.0 * t2 + 1.0;
    const h10 = t3 - 2.0 * t2 + t;
    const h01 = -2.0 * t3 + 3.0 * t2;
    const h11 = t3 - t2;

    out[j] =
      h00 * src[idx] +
      h10 * hk * d[idx] +
      h01 * src[idx + 1] +
      h11 * hk * d[idx + 1];
  }

  return sanitizeAndClampSigmas(out, monotonic, modelBounds.value.sigma_max);
}

// ---------------------------------------------------------------------------
// Coordinate Transformations (Linear & Normalized Log Y-Axis)
// ---------------------------------------------------------------------------

function sigmaToNormY(sigma: number, yMax: number): number {
  const clamped = Math.max(0.0, Math.min(yMax, sigma));
  const ratio = yMax > 0 ? clamped / yMax : 0.0;
  if (yScaleMode.value === "log") {
    return Math.log(1.0 + LOG_SCALE_K * ratio) / Math.log(1.0 + LOG_SCALE_K);
  }
  return ratio;
}

function normYToSigma(normY: number, yMax: number): number {
  const u = Math.max(0.0, Math.min(1.0, normY));
  if (yScaleMode.value === "log") {
    const ratio = (Math.pow(1.0 + LOG_SCALE_K, u) - 1.0) / LOG_SCALE_K;
    return ratio * yMax;
  }
  return u * yMax;
}

function indexToCanvasXY(
  index: number,
  sigma: number,
  width: number,
  height: number
): { x: number; y: number } {
  const plotW = Math.max(10, width - PAD_LEFT - PAD_RIGHT);
  const plotH = Math.max(10, height - PAD_TOP - PAD_BOTTOM);
  const count = Math.max(2, customSigmas.value.length);
  const normX = index / (count - 1);
  const normY = sigmaToNormY(sigma, effectiveYMax.value);
  return {
    x: PAD_LEFT + normX * plotW,
    y: PAD_TOP + (1.0 - normY) * plotH,
  };
}

function canvasYToSigma(canvasY: number, height: number): number {
  const plotH = Math.max(10, height - PAD_TOP - PAD_BOTTOM);
  const normY = 1.0 - (canvasY - PAD_TOP) / plotH;
  return normYToSigma(normY, effectiveYMax.value);
}

// ---------------------------------------------------------------------------
// Canvas Rendering
// ---------------------------------------------------------------------------

function drawCanvas() {
  const canvas = canvasEl.value;
  const wrap = canvasWrapEl.value;
  if (!canvas || !wrap) return;

  const rect = wrap.getBoundingClientRect();
  const cssW = Math.max(200, Math.floor(rect.width));
  const cssH = Math.max(150, Math.floor(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);

  const plotW = Math.max(10, cssW - PAD_LEFT - PAD_RIGHT);
  const plotH = Math.max(10, cssH - PAD_TOP - PAD_BOTTOM);
  const yMax = effectiveYMax.value;
  const pts = customSigmas.value;
  const basePts = baselineSigmas.value;
  const nSteps = Math.max(1, pts.length - 1);

  // Background fill
  ctx.fillStyle = "#12151c";
  ctx.fillRect(0, 0, cssW, cssH);

  // Plot area background
  ctx.fillStyle = "#171b24";
  ctx.fillRect(PAD_LEFT, PAD_TOP, plotW, plotH);

  // Horizontal grid lines + Y-axis labels
  const yTicks = 4;
  ctx.lineWidth = 1;
  ctx.font = "10px 'JetBrains Mono', Consolas, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let t = 0; t <= yTicks; t++) {
    const normY = t / yTicks;
    const py = PAD_TOP + (1.0 - normY) * plotH;
    const sigmaVal = normYToSigma(normY, yMax);

    ctx.strokeStyle = t === 0 ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, py);
    ctx.lineTo(PAD_LEFT + plotW, py);
    ctx.stroke();

    ctx.fillStyle = "rgba(185, 195, 215, 0.72)";
    const label = sigmaVal >= 10 ? sigmaVal.toFixed(1) : sigmaVal.toFixed(2);
    ctx.fillText(label, PAD_LEFT - 6, py);
  }

  // Vertical step grid lines + X-axis step labels
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const maxXLabels = Math.min(nSteps, Math.max(2, Math.floor(plotW / 38)));
  const labelStride = Math.max(1, Math.ceil(nSteps / maxXLabels));

  for (let i = 0; i <= nSteps; i++) {
    const px = PAD_LEFT + (i / nSteps) * plotW;
    const isMajor = i === 0 || i === nSteps || i % labelStride === 0;

    ctx.strokeStyle = isMajor ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.moveTo(px, PAD_TOP);
    ctx.lineTo(px, PAD_TOP + plotH);
    ctx.stroke();

    if (isMajor) {
      ctx.fillStyle = "rgba(185, 195, 215, 0.72)";
      ctx.fillText(String(i), px, PAD_TOP + plotH + 6);
    }
  }

  // Layer 1: Background Step Delta (Δσ) Bar Chart
  if (pts.length >= 2) {
    const barSlotW = plotW / nSteps;
    const barW = Math.max(2, barSlotW * 0.68);

    for (let i = 0; i < nSteps; i++) {
      const delta = Math.abs(pts[i] - pts[i + 1]);
      const barH = Math.min(plotH, (delta / yMax) * plotH * 1.6);
      const cx = PAD_LEFT + ((i + 0.5) / nSteps) * plotW;
      const bx = cx - barW * 0.5;
      const by = PAD_TOP + plotH - barH;

      const isReversed = pts[i + 1] > pts[i] + 1e-6;
      ctx.fillStyle = isReversed
        ? "rgba(248, 113, 113, 0.25)"
        : "rgba(56, 189, 248, 0.14)";
      ctx.fillRect(bx, by, barW, barH);
    }
  }

  // Layer 2: Dashed Baseline Reference Curve
  if (basePts.length >= 2) {
    const baseN = basePts.length - 1;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(160, 174, 198, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= baseN; i++) {
      const px = PAD_LEFT + (i / baseN) * plotW;
      const py = PAD_TOP + (1.0 - sigmaToNormY(basePts[i], yMax)) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Layer 3: Active Schedule Curve + Subtle Area Gradient
  if (pts.length >= 2) {
    const coords = pts.map((s, idx) => indexToCanvasXY(idx, s, cssW, cssH));

    // Area fill under active curve
    const grad = ctx.createLinearGradient(0, PAD_TOP, 0, PAD_TOP + plotH);
    grad.addColorStop(0, isModified.value ? "rgba(245, 158, 11, 0.22)" : "rgba(56, 189, 248, 0.22)");
    grad.addColorStop(1, "rgba(18, 21, 28, 0.0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(coords[0].x, PAD_TOP + plotH);
    for (const pt of coords) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.lineTo(coords[coords.length - 1].x, PAD_TOP + plotH);
    ctx.closePath();
    ctx.fill();

    // Active polyline
    ctx.strokeStyle = isModified.value ? "#f59e0b" : "#38bdf8";
    ctx.lineWidth = 2.25;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    coords.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Control vertices
    coords.forEach((pt, idx) => {
      const isTerminal = idx === coords.length - 1;
      const isHovered = hoveredIndex.value === idx;
      const isSelected = selectedIndex.value === idx;
      const isDragging = draggingIndex.value === idx;

      if (isTerminal) {
        // Locked anchor diamond/square at Step N (σ = 0.0)
        const sz = 5;
        ctx.fillStyle = "#ef4444";
        ctx.strokeStyle = "#12151c";
        ctx.lineWidth = 1.5;
        ctx.fillRect(pt.x - sz, pt.y - sz, sz * 2, sz * 2);
        ctx.strokeRect(pt.x - sz, pt.y - sz, sz * 2, sz * 2);
      } else {
        const radius = isDragging || isHovered ? 6.0 : isSelected ? 5.2 : 4.2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isDragging
          ? "#ffffff"
          : isHovered || isSelected
          ? "#fde047"
          : isModified.value
          ? "#f59e0b"
          : "#38bdf8";
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "#0f172a";
        ctx.stroke();
      }
    });
  }

  // Plot border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD_LEFT, PAD_TOP, plotW, plotH);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Hit-Testing & Interactive Point Manipulation
// ---------------------------------------------------------------------------

function getCanvasPointerCoords(event: MouseEvent | PointerEvent | WheelEvent): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const canvas = canvasEl.value!;
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function findNearestVertex(x: number, y: number, width: number, height: number): number | null {
  let bestIdx: number | null = null;
  let bestDist = HIT_RADIUS_PX * HIT_RADIUS_PX;
  for (let i = 0; i < customSigmas.value.length; i++) {
    const pt = indexToCanvasXY(i, customSigmas.value[i], width, height);
    const dx = x - pt.x;
    const dy = y - pt.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestDist) {
      bestDist = d2;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function findSegmentIndexAtX(x: number, width: number): number {
  const plotW = Math.max(10, width - PAD_LEFT - PAD_RIGHT);
  const nSteps = Math.max(1, customSigmas.value.length - 1);
  const normX = Math.max(0.0, Math.min(0.9999, (x - PAD_LEFT) / plotW));
  return Math.max(0, Math.min(nSteps - 1, Math.floor(normX * nSteps)));
}

function clampSingleVertexValue(index: number, rawSigma: number): number {
  const n = customSigmas.value.length - 1;
  if (index >= n) return 0.0;
  let val = Math.max(0.0, Math.min(10000.0, rawSigma));
  if (enforceMonotonic.value) {
    const upper = index > 0 ? customSigmas.value[index - 1] : 10000.0;
    const lower = index < n - 1 ? customSigmas.value[index + 1] : 0.0;
    val = Math.max(lower, Math.min(upper, val));
  }
  return Number(val.toFixed(6));
}

function onPointerDown(event: PointerEvent) {
  rootEl.value?.focus();
  const { x, y, width, height } = getCanvasPointerCoords(event);
  const hitIdx = findNearestVertex(x, y, width, height);

  // Alt + Left-Click removes non-terminal step
  if (event.button === 0 && event.altKey && hitIdx !== null && hitIdx < customSigmas.value.length - 1) {
    removeStepAt(hitIdx);
    return;
  }

  // Shift + Left-Click inserts a new step on the clicked segment
  if (event.button === 0 && event.shiftKey && hitIdx === null) {
    const segIdx = findSegmentIndexAtX(x, width);
    insertStepAfter(segIdx);
    return;
  }

  if (event.button === 0 && hitIdx !== null) {
    selectedIndex.value = hitIdx;
    hoveredIndex.value = hitIdx;
    if (hitIdx < customSigmas.value.length - 1) {
      draggingIndex.value = hitIdx;
      (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
    }
    drawCanvas();
  }
}

function onPointerMove(event: PointerEvent) {
  const { x, y, width, height } = getCanvasPointerCoords(event);
  pointerPos.value = { x, y };

  if (draggingIndex.value !== null) {
    const idx = draggingIndex.value;
    if (idx >= 0 && idx < customSigmas.value.length - 1) {
      const rawSigma = canvasYToSigma(y, height);
      customSigmas.value[idx] = clampSingleVertexValue(idx, rawSigma);
      isModified.value = true;
      emitState();
      drawCanvas();
    }
    return;
  }

  const hitIdx = findNearestVertex(x, y, width, height);
  if (hoveredIndex.value !== hitIdx) {
    hoveredIndex.value = hitIdx;
    drawCanvas();
  }
}

function onPointerUp(event: PointerEvent) {
  if (draggingIndex.value !== null) {
    (event.target as HTMLElement)?.releasePointerCapture?.(event.pointerId);
    draggingIndex.value = null;
    emitState();
    drawCanvas();
  }
}

function onPointerLeave() {
  if (draggingIndex.value === null) {
    hoveredIndex.value = null;
    drawCanvas();
  }
}

function onDoubleClick(event: MouseEvent) {
  const { x, width } = getCanvasPointerCoords(event);
  const segIdx = findSegmentIndexAtX(x, width);
  insertStepAfter(segIdx);
}

function onCanvasContextMenu(event: MouseEvent) {
  const { x, y, width, height } = getCanvasPointerCoords(event);
  const hitIdx = findNearestVertex(x, y, width, height);
  if (hitIdx !== null && hitIdx < customSigmas.value.length - 1) {
    removeStepAt(hitIdx);
    return;
  }
  props.onForwardContextMenu?.(event);
}

function onWheel(event: WheelEvent) {
  const idx = hoveredIndex.value ?? selectedIndex.value;
  if (idx === null || idx < 0 || idx >= customSigmas.value.length - 1) return;

  const direction = event.deltaY < 0 ? 1 : -1;
  const fineDelta = Math.max(0.0001, effectiveYMax.value * 0.001) * direction;
  const nextVal = clampSingleVertexValue(idx, customSigmas.value[idx] + fineDelta);
  customSigmas.value[idx] = nextVal;
  selectedIndex.value = idx;
  isModified.value = true;
  emitState();
  drawCanvas();
}

function onKeyDown(event: KeyboardEvent) {
  const idx = selectedIndex.value ?? hoveredIndex.value;
  if (idx === null || idx < 0 || idx >= customSigmas.value.length - 1) return;

  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    const dir = event.key === "ArrowUp" ? 1 : -1;
    const stepMult = event.shiftKey ? 0.01 : 0.001;
    const delta = Math.max(0.0001, effectiveYMax.value * stepMult) * dir;
    customSigmas.value[idx] = clampSingleVertexValue(idx, customSigmas.value[idx] + delta);
    isModified.value = true;
    emitState();
    drawCanvas();
  } else if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    removeStepAt(idx);
  }
}

// ---------------------------------------------------------------------------
// Point Insertion, Deletion, and Reset Workflows
// ---------------------------------------------------------------------------

function insertStepAfter(segmentIndex: number) {
  if (activeSteps.value >= 1000) return;
  const i = Math.max(0, Math.min(customSigmas.value.length - 2, segmentIndex));
  const midSigma = Number(((customSigmas.value[i] + customSigmas.value[i + 1]) * 0.5).toFixed(6));

  const nextPts = customSigmas.value.slice();
  nextPts.splice(i + 1, 0, midSigma);
  customSigmas.value = sanitizeAndClampSigmas(nextPts, enforceMonotonic.value, modelBounds.value.sigma_max);

  const newStepCount = customSigmas.value.length - 1;
  isModified.value = true;
  selectedIndex.value = i + 1;

  // Synchronize node's steps widget without triggering a baseline reset
  props.onStepsChange?.(newStepCount);
  // Also refresh reference baseline curve for the new step count
  void refreshBaselineFromBackend(false);
  emitState();
  drawCanvas();
}

function insertStepFromToolbar() {
  if (selectedIndex.value !== null && selectedIndex.value < customSigmas.value.length - 1) {
    insertStepAfter(selectedIndex.value);
    return;
  }
  // Find segment with largest Δσ jump
  let maxDelta = -1;
  let bestSeg = 0;
  for (let i = 0; i < customSigmas.value.length - 1; i++) {
    const d = Math.abs(customSigmas.value[i] - customSigmas.value[i + 1]);
    if (d > maxDelta) {
      maxDelta = d;
      bestSeg = i;
    }
  }
  insertStepAfter(bestSeg);
}

function removeStepAt(vertexIndex: number) {
  // Enforce Minimum Step Floor (N = 1 -> 2 vertices: [sigmas[0], 0.0])
  if (customSigmas.value.length <= 2) return;
  if (vertexIndex < 0 || vertexIndex >= customSigmas.value.length - 1) return;

  const nextPts = customSigmas.value.slice();
  nextPts.splice(vertexIndex, 1);
  nextPts[nextPts.length - 1] = 0.0;
  customSigmas.value = sanitizeAndClampSigmas(nextPts, enforceMonotonic.value, modelBounds.value.sigma_max);

  const newStepCount = customSigmas.value.length - 1;
  isModified.value = true;
  selectedIndex.value = Math.min(vertexIndex, customSigmas.value.length - 2);
  if (hoveredIndex.value !== null && hoveredIndex.value >= customSigmas.value.length) {
    hoveredIndex.value = null;
  }

  props.onStepsChange?.(newStepCount);
  void refreshBaselineFromBackend(false);
  emitState();
  drawCanvas();
}

function removeStepFromToolbar() {
  if (customSigmas.value.length <= 2) return;
  const target =
    selectedIndex.value !== null && selectedIndex.value < customSigmas.value.length - 1
      ? selectedIndex.value
      : customSigmas.value.length - 2;
  removeStepAt(target);
}

function toggleYScale() {
  yScaleMode.value = yScaleMode.value === "linear" ? "log" : "linear";
  emitState();
  drawCanvas();
}

async function resetToBaseline() {
  pendingPresetChange.value = false;
  isModified.value = false;
  await refreshBaselineFromBackend(true);
  emitState();
  drawCanvas();
}

function confirmSnapToNewPreset() {
  pendingPresetChange.value = false;
  isModified.value = false;
  customSigmas.value = baselineSigmas.value.slice();
  emitState();
  drawCanvas();
}

function dismissPresetPrompt() {
  pendingPresetChange.value = false;
}

// ---------------------------------------------------------------------------
// Backend Baseline Synchronization & Serialization
// ---------------------------------------------------------------------------

async function refreshBaselineFromBackend(snapActiveToBaseline: boolean) {
  const w = props.getWidgetParams();
  baselineScheduler.value = w.scheduler;
  currentDenoise.value = w.denoise;
  enforceMonotonic.value = w.enforceMonotonic;

  const targetSteps = snapActiveToBaseline ? w.steps : activeSteps.value;

  // Immediate client-side analytical update for zero-latency responsiveness
  const effectiveMax = modelBounds.value.from_model ? modelBounds.value.sigma_max : w.sigmaMaxFallback;
  const effectiveMin = modelBounds.value.from_model ? modelBounds.value.sigma_min : w.sigmaMinFallback;
  if (!modelBounds.value.from_model) {
    modelBounds.value = {
      sigma_max: effectiveMax,
      sigma_min: effectiveMin,
      from_model: false,
    };
  }

  const localBase = generateAnalyticalSchedule(
    w.scheduler,
    targetSteps,
    w.denoise,
    effectiveMax,
    effectiveMin
  );
  baselineSigmas.value = localBase;
  if (snapActiveToBaseline || !isModified.value) {
    customSigmas.value = localBase.slice();
  }
  drawCanvas();

  // Query backend route for exact ComfyUI calculate_sigmas parity
  try {
    baselineAbortController?.abort();
    baselineAbortController = new AbortController();

    const fetchFn =
      typeof comfyApi?.fetchApi === "function"
        ? (url: string, init: RequestInit) => comfyApi.fetchApi(url, init)
        : (url: string, init: RequestInit) => fetch(url, init);

    const response = await fetchFn("/duffy/interactive_scheduler/calculate_baseline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        node_id: props.getNodeId(),
        scheduler: w.scheduler,
        steps: targetSteps,
        denoise: w.denoise,
        sigma_max_fallback: w.sigmaMaxFallback,
        sigma_min_fallback: w.sigmaMinFallback,
        use_cached_model_bounds: true,
      }),
      signal: baselineAbortController.signal,
    });

    if (response && response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.baseline_sigmas) && data.baseline_sigmas.length >= 2) {
        baselineSigmas.value = data.baseline_sigmas.map((v: any) => Number(v));
        if (data.model_bounds) {
          modelBounds.value = {
            sigma_max: Number(data.model_bounds.sigma_max ?? effectiveMax),
            sigma_min: Number(data.model_bounds.sigma_min ?? effectiveMin),
            from_model: Boolean(data.model_bounds.from_model),
          };
        }
        if (snapActiveToBaseline || !isModified.value) {
          customSigmas.value = baselineSigmas.value.slice();
        }
        emitState();
        drawCanvas();
      }
    }
  } catch {
    // Offline or aborted request: local analytical curve remains active
  }
}

function serialiseState(): string {
  const payload: SchedulerSerialisedState = {
    version: "1.0",
    is_modified: isModified.value,
    baseline_scheduler: baselineScheduler.value,
    steps: activeSteps.value,
    denoise: currentDenoise.value,
    y_scale_mode: yScaleMode.value,
    model_bounds: {
      sigma_max: Number(modelBounds.value.sigma_max.toFixed(6)),
      sigma_min: Number(modelBounds.value.sigma_min.toFixed(6)),
      from_model: modelBounds.value.from_model,
    },
    baseline_sigmas: baselineSigmas.value.map((v) => Number(v.toFixed(6))),
    custom_sigmas: customSigmas.value.map((v) => Number(v.toFixed(6))),
  };
  return JSON.stringify(payload);
}

function emitState() {
  props.onStateChange?.(serialiseState());
}

function hydrateState(rawJson: string): boolean {
  if (!rawJson || typeof rawJson !== "string") return false;
  const trimmed = rawJson.trim();
  if (!trimmed || trimmed === "{}") return false;

  try {
    const parsed = JSON.parse(trimmed) as Partial<SchedulerSerialisedState>;
    if (!parsed || typeof parsed !== "object") return false;

    if (typeof parsed.is_modified === "boolean") {
      isModified.value = parsed.is_modified;
    }
    if (typeof parsed.baseline_scheduler === "string" && parsed.baseline_scheduler) {
      baselineScheduler.value = parsed.baseline_scheduler;
    }
    if (typeof parsed.denoise === "number" && Number.isFinite(parsed.denoise)) {
      currentDenoise.value = parsed.denoise;
    }
    if (parsed.y_scale_mode === "linear" || parsed.y_scale_mode === "log") {
      yScaleMode.value = parsed.y_scale_mode;
    }
    if (parsed.model_bounds && typeof parsed.model_bounds === "object") {
      modelBounds.value = {
        sigma_max: Number(parsed.model_bounds.sigma_max ?? 1.0),
        sigma_min: Number(parsed.model_bounds.sigma_min ?? 0.01),
        from_model: Boolean(parsed.model_bounds.from_model),
      };
    }

    const w = props.getWidgetParams();
    enforceMonotonic.value = w.enforceMonotonic;

    if (Array.isArray(parsed.baseline_sigmas) && parsed.baseline_sigmas.length >= 2) {
      baselineSigmas.value = sanitizeAndClampSigmas(
        parsed.baseline_sigmas,
        true,
        modelBounds.value.sigma_max
      );
    }
    if (Array.isArray(parsed.custom_sigmas) && parsed.custom_sigmas.length >= 2) {
      customSigmas.value = sanitizeAndClampSigmas(
        parsed.custom_sigmas,
        enforceMonotonic.value,
        modelBounds.value.sigma_max
      );
      const restoredSteps = customSigmas.value.length - 1;
      props.onStepsChange?.(restoredSteps);
      drawCanvas();
      return true;
    }
  } catch {
    // Ignore malformed JSON and initialize from widget defaults
  }
  return false;
}

// ---------------------------------------------------------------------------
// External Widget Change Handlers (Two-Way Synchronization)
// ---------------------------------------------------------------------------

function onExternalStepsWidgetChanged(newSteps: number) {
  const targetSteps = Math.max(1, Math.min(1000, Math.round(newSteps || 20)));
  if (targetSteps === activeSteps.value) return;

  if (isModified.value) {
    // Preserve custom trajectory shape across N_new + 1 points via PCHIP resampling
    customSigmas.value = resampleCurvePchip(
      customSigmas.value,
      targetSteps,
      enforceMonotonic.value
    );
    void refreshBaselineFromBackend(false);
    emitState();
    drawCanvas();
  } else {
    void refreshBaselineFromBackend(true);
  }
}

function onExternalSchedulerWidgetChanged(newScheduler: string) {
  const prevScheduler = baselineScheduler.value;
  baselineScheduler.value = newScheduler;
  if (isModified.value && newScheduler !== prevScheduler) {
    pendingPresetChange.value = true;
    void refreshBaselineFromBackend(false);
  } else {
    pendingPresetChange.value = false;
    void refreshBaselineFromBackend(true);
  }
}

function onExternalBoundsOrDenoiseChanged() {
  const w = props.getWidgetParams();
  enforceMonotonic.value = w.enforceMonotonic;
  if (isModified.value) {
    customSigmas.value = sanitizeAndClampSigmas(
      customSigmas.value,
      enforceMonotonic.value,
      modelBounds.value.sigma_max
    );
    void refreshBaselineFromBackend(false);
    emitState();
    drawCanvas();
  } else {
    void refreshBaselineFromBackend(true);
  }
}

function onBackendExecuted(statePayload: any) {
  if (!statePayload || typeof statePayload !== "object") return;
  if (statePayload.model_bounds) {
    modelBounds.value = {
      sigma_max: Number(statePayload.model_bounds.sigma_max ?? modelBounds.value.sigma_max),
      sigma_min: Number(statePayload.model_bounds.sigma_min ?? modelBounds.value.sigma_min),
      from_model: Boolean(statePayload.model_bounds.from_model),
    };
  }
  if (Array.isArray(statePayload.baseline_sigmas) && statePayload.baseline_sigmas.length >= 2) {
    baselineSigmas.value = statePayload.baseline_sigmas.map((v: any) => Number(v));
  }
  if (!isModified.value && Array.isArray(statePayload.effective_sigmas) && statePayload.effective_sigmas.length >= 2) {
    customSigmas.value = statePayload.effective_sigmas.map((v: any) => Number(v));
  }
  emitState();
  drawCanvas();
}

function cleanup() {
  baselineAbortController?.abort();
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
}

defineExpose({
  hydrateState,
  resetToBaseline,
  onExternalStepsWidgetChanged,
  onExternalSchedulerWidgetChanged,
  onExternalBoundsOrDenoiseChanged,
  onBackendExecuted,
  cleanup,
});

onMounted(async () => {
  await nextTick();
  if (canvasWrapEl.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      drawCanvas();
    });
    resizeObserver.observe(canvasWrapEl.value);
  }

  const hydrated = props.initialStateJson ? hydrateState(props.initialStateJson) : false;
  if (!hydrated) {
    await refreshBaselineFromBackend(true);
    emitState();
  } else {
    void refreshBaselineFromBackend(false);
  }
  drawCanvas();
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

<style scoped>
.duffy-scheduler-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 250px;
  box-sizing: border-box;
  padding: 8px;
  gap: 6px;
  background: #0f1218;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 8px;
  color: #e2e8f0;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
  outline: none;
}

.scheduler-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.status-pill {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-preset {
  background: rgba(56, 189, 248, 0.16);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.status-custom {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.meta-badge {
  font-size: 11px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "JetBrains Mono", Consolas, monospace;
}

.tb-btn {
  background: #1e2430;
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.tb-btn:hover:not(:disabled) {
  background: #2a3242;
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.24);
}

.tb-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tb-btn.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.5);
}

.tb-btn-reset {
  background: rgba(239, 68, 68, 0.14);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.32);
}

.tb-btn-reset:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.26);
  color: #fecaca;
}

.preset-prompt-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  padding: 5px 8px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 5px;
  font-size: 11px;
}

.prompt-actions {
  display: flex;
  gap: 5px;
}

.prompt-btn {
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.prompt-btn.snap {
  background: #f59e0b;
  color: #0f172a;
}

.prompt-btn.keep {
  background: #1e293b;
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.16);
}

.canvas-wrapper {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-height: 175px;
  border-radius: 6px;
  overflow: hidden;
}

.schedule-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.hud-tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(56, 189, 248, 0.4);
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 10px;
  font-family: "JetBrains Mono", Consolas, monospace;
  color: #f8fafc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  z-index: 10;
}

.hud-title {
  font-weight: 700;
  color: #38bdf8;
  margin-bottom: 2px;
}

.hud-locked {
  color: #f87171;
  font-weight: 600;
  margin-left: 3px;
}

.hud-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.hud-sub {
  color: #94a3b8;
}

.scheduler-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 10px;
  color: #94a3b8;
}

.legend-items {
  display: flex;
  align-items: center;
  gap: 10px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.swatch {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 2px;
}

.swatch-active {
  background: #38bdf8;
}

.swatch-base {
  background: rgba(160, 174, 198, 0.65);
}

.swatch-delta {
  background: rgba(56, 189, 248, 0.35);
}

.hint-text {
  color: #64748b;
  font-size: 9.5px;
}
</style>
