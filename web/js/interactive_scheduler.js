import { d as defineComponent, f as onMounted, j as nextTick, q as onBeforeUnmount, o as openBlock, c as createElementBlock, a as createBaseVNode, n as normalizeClass, t as toDisplayString, h as createTextVNode, i as createCommentVNode, k as withModifiers, m as normalizeStyle, b as ref, l as computed, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-Bcfa1sBX.js";
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
const _hoisted_1 = { class: "scheduler-toolbar" };
const _hoisted_2 = { class: "toolbar-left" };
const _hoisted_3 = ["title"];
const _hoisted_4 = ["title"];
const _hoisted_5 = { class: "meta-badge" };
const _hoisted_6 = { class: "toolbar-right" };
const _hoisted_7 = ["disabled"];
const _hoisted_8 = ["disabled"];
const _hoisted_9 = {
  key: 0,
  class: "preset-prompt-banner"
};
const _hoisted_10 = { class: "prompt-text" };
const _hoisted_11 = { class: "prompt-actions" };
const _hoisted_12 = { class: "hud-title" };
const _hoisted_13 = {
  key: 0,
  class: "hud-locked"
};
const _hoisted_14 = { class: "hud-row" };
const _hoisted_15 = { class: "hud-row" };
const _hoisted_16 = { class: "hud-row hud-sub" };
const _hoisted_17 = { class: "scheduler-footer" };
const _hoisted_18 = { class: "legend-items" };
const _hoisted_19 = { class: "legend-item" };
const LOG_SCALE_K = 50;
const PAD_LEFT = 46;
const PAD_RIGHT = 18;
const PAD_TOP = 18;
const PAD_BOTTOM = 28;
const HIT_RADIUS_PX = 10;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "InteractiveScheduler",
  props: {
    getNodeId: { type: Function },
    initialStateJson: {},
    getWidgetParams: { type: Function },
    onStateChange: { type: Function },
    onStepsChange: { type: Function },
    onForwardContextMenu: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const rootEl = ref(null);
    const canvasWrapEl = ref(null);
    const canvasEl = ref(null);
    const isModified = ref(false);
    const baselineScheduler = ref("normal");
    const currentDenoise = ref(1);
    const enforceMonotonic = ref(true);
    const yScaleMode = ref("linear");
    const pendingPresetChange = ref(false);
    const modelBounds = ref({
      sigma_max: 1,
      sigma_min: 0.01,
      from_model: false
    });
    const baselineSigmas = ref([1, 0.5, 0]);
    const customSigmas = ref([1, 0.5, 0]);
    const selectedIndex = ref(null);
    const hoveredIndex = ref(null);
    const draggingIndex = ref(null);
    const pointerPos = ref(null);
    let resizeObserver = null;
    let baselineAbortController = null;
    const activeSteps = computed(() => Math.max(1, customSigmas.value.length - 1));
    const effectiveYMax = computed(() => {
      const bMax = modelBounds.value.sigma_max || 1;
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
      const sigma = customSigmas.value[idx] ?? 0;
      const nextSigma = idx < customSigmas.value.length - 1 ? customSigmas.value[idx + 1] : 0;
      const prevSigma = idx > 0 ? customSigmas.value[idx - 1] : sigma;
      const delta = idx < customSigmas.value.length - 1 ? sigma - nextSigma : prevSigma - sigma;
      const baseVal = baselineSigmas.value[idx] ?? 0;
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
        y: Math.max(4, ty)
      };
    });
    function formatCompact(val) {
      if (!Number.isFinite(val)) return "0";
      if (val >= 100) return val.toFixed(1);
      if (val >= 1) return val.toFixed(3);
      return val.toFixed(4);
    }
    function generateAnalyticalSchedule(scheduler, steps, denoise, sigmaMax, sigmaMin) {
      const effSteps = Math.max(1, Math.min(1e3, Math.round(steps || 20)));
      const effDenoise = Math.max(0.01, Math.min(1, Number(denoise) || 1));
      const sMax = Math.max(1e-4, Number(sigmaMax) || 1);
      const sMin = Math.max(1e-6, Math.min(Number(sigmaMin) || 0.01, sMax * 0.999));
      const totalSteps = effDenoise < 0.9999 ? Math.max(effSteps, Math.floor(effSteps / effDenoise)) : effSteps;
      const name = (scheduler || "normal").trim().toLowerCase();
      let full = [];
      if (totalSteps === 1) {
        full = [sMax, 0];
      } else {
        const pts = [];
        for (let i = 0; i < totalSteps; i++) {
          const t = totalSteps > 1 ? i / (totalSteps - 1) : 0;
          let s = sMax;
          if (name === "karras") {
            const rho = 7;
            const maxInv = Math.pow(sMax, 1 / rho);
            const minInv = Math.pow(sMin, 1 / rho);
            s = Math.pow(maxInv + t * (minInv - maxInv), rho);
          } else if (name === "exponential") {
            s = Math.exp(Math.log(sMax) * (1 - t) + Math.log(sMin) * t);
          } else if (name === "simple") {
            const u = 1 - t * (1 - sMin / sMax);
            s = u * sMax;
          } else if (name === "sgm_uniform") {
            const u = 1 - i / totalSteps;
            s = sMin + u * (sMax - sMin);
          } else if (name === "beta") {
            const u = Math.max(0, Math.min(1, 1 - t));
            const ua = Math.pow(u, 0.6);
            const ub = Math.pow(1 - u, 0.6);
            const w = ua / (ua + ub + 1e-8);
            s = Math.exp(Math.log(sMin) + w * (Math.log(sMax) - Math.log(sMin)));
          } else if (name === "linear_quadratic") {
            let val = 0;
            if (t <= 0.5) {
              val = 1 - t;
            } else {
              const rem = (t - 0.5) / 0.5;
              val = 0.5 * (1 - rem * rem * 0.5 - rem * 0.5);
            }
            s = sMin + val * (sMax - sMin);
          } else if (name === "kl_optimal") {
            const aMax = Math.atan(sMax);
            const aMin = Math.atan(sMin);
            s = Math.tan((1 - t) * aMax + t * aMin);
          } else if (name === "ddim_uniform") {
            const u = 1 - i / totalSteps;
            s = Math.exp(Math.log(sMin) + u * (Math.log(sMax) - Math.log(sMin)));
          } else {
            s = Math.exp(Math.log(sMax) * (1 - t) + Math.log(sMin) * t);
          }
          pts.push(s);
        }
        pts.push(0);
        full = pts;
      }
      if (effDenoise < 0.9999 && full.length > effSteps + 1) {
        full = full.slice(full.length - (effSteps + 1));
      }
      full[full.length - 1] = 0;
      return full;
    }
    function sanitizeAndClampSigmas(points, monotonic, fallbackMax = 1) {
      const cap = 1e4;
      if (!Array.isArray(points) || points.length < 2) {
        return [Math.max(1e-4, fallbackMax), 0];
      }
      const out = points.slice(0, 1001).map((v) => {
        const num = Number(v);
        if (!Number.isFinite(num)) return 0;
        return Math.max(0, Math.min(cap, num));
      });
      if (monotonic && out.length > 2) {
        for (let i = 1; i < out.length - 1; i++) {
          if (out[i] > out[i - 1]) {
            out[i] = out[i - 1];
          }
        }
      }
      out[out.length - 1] = 0;
      return out;
    }
    function resampleCurvePchip(points, newSteps, monotonic) {
      const targetSteps = Math.max(1, Math.min(1e3, Math.round(newSteps)));
      const src = sanitizeAndClampSigmas(points, monotonic, modelBounds.value.sigma_max);
      const nSrc = src.length;
      const nDst = targetSteps + 1;
      if (nSrc === nDst) return src.slice();
      if (targetSteps === 1) return [src[0], 0];
      const x = [];
      for (let i = 0; i < nSrc; i++) x.push(i / (nSrc - 1));
      if (nSrc === 2) {
        const linear = [];
        for (let j = 0; j < nDst; j++) {
          const u = j / (nDst - 1);
          linear.push(src[0] * (1 - u) + src[1] * u);
        }
        return sanitizeAndClampSigmas(linear, monotonic, modelBounds.value.sigma_max);
      }
      const h = [];
      const delta = [];
      for (let i = 0; i < nSrc - 1; i++) {
        const hi = Math.max(1e-12, x[i + 1] - x[i]);
        h.push(hi);
        delta.push((src[i + 1] - src[i]) / hi);
      }
      const d = new Array(nSrc).fill(0);
      for (let k = 1; k < nSrc - 1; k++) {
        if (delta[k - 1] * delta[k] <= 0) {
          d[k] = 0;
        } else {
          const w1 = 2 * h[k] + h[k - 1];
          const w2 = h[k] + 2 * h[k - 1];
          d[k] = (w1 + w2) / (w1 / delta[k - 1] + w2 / delta[k]);
        }
      }
      let d0 = ((2 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1]);
      if (d0 * delta[0] <= 0) d0 = 0;
      else if (delta[0] * delta[1] <= 0 && Math.abs(d0) > Math.abs(3 * delta[0])) {
        d0 = 3 * delta[0];
      }
      d[0] = d0;
      const last = nSrc - 2;
      let dn = ((2 * h[last] + h[last - 1]) * delta[last] - h[last] * delta[last - 1]) / (h[last] + h[last - 1]);
      if (dn * delta[last] <= 0) dn = 0;
      else if (delta[last] * delta[last - 1] <= 0 && Math.abs(dn) > Math.abs(3 * delta[last])) {
        dn = 3 * delta[last];
      }
      d[nSrc - 1] = dn;
      const out = new Array(nDst).fill(0);
      out[0] = src[0];
      out[nDst - 1] = 0;
      for (let j = 1; j < nDst - 1; j++) {
        const xVal = j / (nDst - 1);
        let idx = Math.min(nSrc - 2, Math.max(0, Math.floor(xVal * (nSrc - 1))));
        while (idx < nSrc - 2 && xVal > x[idx + 1]) idx++;
        while (idx > 0 && xVal < x[idx]) idx--;
        const hk = h[idx];
        const t = (xVal - x[idx]) / hk;
        const t2 = t * t;
        const t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;
        out[j] = h00 * src[idx] + h10 * hk * d[idx] + h01 * src[idx + 1] + h11 * hk * d[idx + 1];
      }
      return sanitizeAndClampSigmas(out, monotonic, modelBounds.value.sigma_max);
    }
    function sigmaToNormY(sigma, yMax) {
      const clamped = Math.max(0, Math.min(yMax, sigma));
      const ratio = yMax > 0 ? clamped / yMax : 0;
      if (yScaleMode.value === "log") {
        return Math.log(1 + LOG_SCALE_K * ratio) / Math.log(1 + LOG_SCALE_K);
      }
      return ratio;
    }
    function normYToSigma(normY, yMax) {
      const u = Math.max(0, Math.min(1, normY));
      if (yScaleMode.value === "log") {
        const ratio = (Math.pow(1 + LOG_SCALE_K, u) - 1) / LOG_SCALE_K;
        return ratio * yMax;
      }
      return u * yMax;
    }
    function indexToCanvasXY(index, sigma, width, height) {
      const plotW = Math.max(10, width - PAD_LEFT - PAD_RIGHT);
      const plotH = Math.max(10, height - PAD_TOP - PAD_BOTTOM);
      const count = Math.max(2, customSigmas.value.length);
      const normX = index / (count - 1);
      const normY = sigmaToNormY(sigma, effectiveYMax.value);
      return {
        x: PAD_LEFT + normX * plotW,
        y: PAD_TOP + (1 - normY) * plotH
      };
    }
    function canvasYToSigma(canvasY, height) {
      const plotH = Math.max(10, height - PAD_TOP - PAD_BOTTOM);
      const normY = 1 - (canvasY - PAD_TOP) / plotH;
      return normYToSigma(normY, effectiveYMax.value);
    }
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
      ctx.fillStyle = "#12151c";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.fillStyle = "#171b24";
      ctx.fillRect(PAD_LEFT, PAD_TOP, plotW, plotH);
      const yTicks = 4;
      ctx.lineWidth = 1;
      ctx.font = "10px 'JetBrains Mono', Consolas, monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let t = 0; t <= yTicks; t++) {
        const normY = t / yTicks;
        const py = PAD_TOP + (1 - normY) * plotH;
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
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const maxXLabels = Math.min(nSteps, Math.max(2, Math.floor(plotW / 38)));
      const labelStride = Math.max(1, Math.ceil(nSteps / maxXLabels));
      for (let i = 0; i <= nSteps; i++) {
        const px = PAD_LEFT + i / nSteps * plotW;
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
      if (pts.length >= 2) {
        const barSlotW = plotW / nSteps;
        const barW = Math.max(2, barSlotW * 0.68);
        for (let i = 0; i < nSteps; i++) {
          const delta = Math.abs(pts[i] - pts[i + 1]);
          const barH = Math.min(plotH, delta / yMax * plotH * 1.6);
          const cx = PAD_LEFT + (i + 0.5) / nSteps * plotW;
          const bx = cx - barW * 0.5;
          const by = PAD_TOP + plotH - barH;
          const isReversed = pts[i + 1] > pts[i] + 1e-6;
          ctx.fillStyle = isReversed ? "rgba(248, 113, 113, 0.25)" : "rgba(56, 189, 248, 0.14)";
          ctx.fillRect(bx, by, barW, barH);
        }
      }
      if (basePts.length >= 2) {
        const baseN = basePts.length - 1;
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "rgba(160, 174, 198, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= baseN; i++) {
          const px = PAD_LEFT + i / baseN * plotW;
          const py = PAD_TOP + (1 - sigmaToNormY(basePts[i], yMax)) * plotH;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
      if (pts.length >= 2) {
        const coords = pts.map((s, idx) => indexToCanvasXY(idx, s, cssW, cssH));
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
        coords.forEach((pt, idx) => {
          const isTerminal = idx === coords.length - 1;
          const isHovered = hoveredIndex.value === idx;
          const isSelected = selectedIndex.value === idx;
          const isDragging = draggingIndex.value === idx;
          if (isTerminal) {
            const sz = 5;
            ctx.fillStyle = "#ef4444";
            ctx.strokeStyle = "#12151c";
            ctx.lineWidth = 1.5;
            ctx.fillRect(pt.x - sz, pt.y - sz, sz * 2, sz * 2);
            ctx.strokeRect(pt.x - sz, pt.y - sz, sz * 2, sz * 2);
          } else {
            const radius = isDragging || isHovered ? 6 : isSelected ? 5.2 : 4.2;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = isDragging ? "#ffffff" : isHovered || isSelected ? "#fde047" : isModified.value ? "#f59e0b" : "#38bdf8";
            ctx.fill();
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = "#0f172a";
            ctx.stroke();
          }
        });
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD_LEFT, PAD_TOP, plotW, plotH);
      ctx.restore();
    }
    function getCanvasPointerCoords(event) {
      const canvas = canvasEl.value;
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        width: rect.width,
        height: rect.height
      };
    }
    function findNearestVertex(x, y, width, height) {
      let bestIdx = null;
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
    function findSegmentIndexAtX(x, width) {
      const plotW = Math.max(10, width - PAD_LEFT - PAD_RIGHT);
      const nSteps = Math.max(1, customSigmas.value.length - 1);
      const normX = Math.max(0, Math.min(0.9999, (x - PAD_LEFT) / plotW));
      return Math.max(0, Math.min(nSteps - 1, Math.floor(normX * nSteps)));
    }
    function clampSingleVertexValue(index, rawSigma) {
      const n = customSigmas.value.length - 1;
      if (index >= n) return 0;
      let val = Math.max(0, Math.min(1e4, rawSigma));
      if (enforceMonotonic.value) {
        const upper = index > 0 ? customSigmas.value[index - 1] : 1e4;
        const lower = index < n - 1 ? customSigmas.value[index + 1] : 0;
        val = Math.max(lower, Math.min(upper, val));
      }
      return Number(val.toFixed(6));
    }
    function onPointerDown(event) {
      var _a, _b, _c;
      (_a = rootEl.value) == null ? void 0 : _a.focus();
      const { x, y, width, height } = getCanvasPointerCoords(event);
      const hitIdx = findNearestVertex(x, y, width, height);
      if (event.button === 0 && event.altKey && hitIdx !== null && hitIdx < customSigmas.value.length - 1) {
        removeStepAt(hitIdx);
        return;
      }
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
          (_c = (_b = event.target) == null ? void 0 : _b.setPointerCapture) == null ? void 0 : _c.call(_b, event.pointerId);
        }
        drawCanvas();
      }
    }
    function onPointerMove(event) {
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
    function onPointerUp(event) {
      var _a, _b;
      if (draggingIndex.value !== null) {
        (_b = (_a = event.target) == null ? void 0 : _a.releasePointerCapture) == null ? void 0 : _b.call(_a, event.pointerId);
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
    function onDoubleClick(event) {
      const { x, width } = getCanvasPointerCoords(event);
      const segIdx = findSegmentIndexAtX(x, width);
      insertStepAfter(segIdx);
    }
    function onCanvasContextMenu(event) {
      var _a;
      const { x, y, width, height } = getCanvasPointerCoords(event);
      const hitIdx = findNearestVertex(x, y, width, height);
      if (hitIdx !== null && hitIdx < customSigmas.value.length - 1) {
        removeStepAt(hitIdx);
        return;
      }
      (_a = props.onForwardContextMenu) == null ? void 0 : _a.call(props, event);
    }
    function onWheel(event) {
      const idx = hoveredIndex.value ?? selectedIndex.value;
      if (idx === null || idx < 0 || idx >= customSigmas.value.length - 1) return;
      const direction = event.deltaY < 0 ? 1 : -1;
      const fineDelta = Math.max(1e-4, effectiveYMax.value * 1e-3) * direction;
      const nextVal = clampSingleVertexValue(idx, customSigmas.value[idx] + fineDelta);
      customSigmas.value[idx] = nextVal;
      selectedIndex.value = idx;
      isModified.value = true;
      emitState();
      drawCanvas();
    }
    function onKeyDown(event) {
      const idx = selectedIndex.value ?? hoveredIndex.value;
      if (idx === null || idx < 0 || idx >= customSigmas.value.length - 1) return;
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const dir = event.key === "ArrowUp" ? 1 : -1;
        const stepMult = event.shiftKey ? 0.01 : 1e-3;
        const delta = Math.max(1e-4, effectiveYMax.value * stepMult) * dir;
        customSigmas.value[idx] = clampSingleVertexValue(idx, customSigmas.value[idx] + delta);
        isModified.value = true;
        emitState();
        drawCanvas();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeStepAt(idx);
      }
    }
    function insertStepAfter(segmentIndex) {
      var _a;
      if (activeSteps.value >= 1e3) return;
      const i = Math.max(0, Math.min(customSigmas.value.length - 2, segmentIndex));
      const midSigma = Number(((customSigmas.value[i] + customSigmas.value[i + 1]) * 0.5).toFixed(6));
      const nextPts = customSigmas.value.slice();
      nextPts.splice(i + 1, 0, midSigma);
      customSigmas.value = sanitizeAndClampSigmas(nextPts, enforceMonotonic.value, modelBounds.value.sigma_max);
      const newStepCount = customSigmas.value.length - 1;
      isModified.value = true;
      selectedIndex.value = i + 1;
      (_a = props.onStepsChange) == null ? void 0 : _a.call(props, newStepCount);
      void refreshBaselineFromBackend(false);
      emitState();
      drawCanvas();
    }
    function insertStepFromToolbar() {
      if (selectedIndex.value !== null && selectedIndex.value < customSigmas.value.length - 1) {
        insertStepAfter(selectedIndex.value);
        return;
      }
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
    function removeStepAt(vertexIndex) {
      var _a;
      if (customSigmas.value.length <= 2) return;
      if (vertexIndex < 0 || vertexIndex >= customSigmas.value.length - 1) return;
      const nextPts = customSigmas.value.slice();
      nextPts.splice(vertexIndex, 1);
      nextPts[nextPts.length - 1] = 0;
      customSigmas.value = sanitizeAndClampSigmas(nextPts, enforceMonotonic.value, modelBounds.value.sigma_max);
      const newStepCount = customSigmas.value.length - 1;
      isModified.value = true;
      selectedIndex.value = Math.min(vertexIndex, customSigmas.value.length - 2);
      if (hoveredIndex.value !== null && hoveredIndex.value >= customSigmas.value.length) {
        hoveredIndex.value = null;
      }
      (_a = props.onStepsChange) == null ? void 0 : _a.call(props, newStepCount);
      void refreshBaselineFromBackend(false);
      emitState();
      drawCanvas();
    }
    function removeStepFromToolbar() {
      if (customSigmas.value.length <= 2) return;
      const target = selectedIndex.value !== null && selectedIndex.value < customSigmas.value.length - 1 ? selectedIndex.value : customSigmas.value.length - 2;
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
    async function refreshBaselineFromBackend(snapActiveToBaseline) {
      var _a;
      const w = props.getWidgetParams();
      baselineScheduler.value = w.scheduler;
      currentDenoise.value = w.denoise;
      enforceMonotonic.value = w.enforceMonotonic;
      const targetSteps = snapActiveToBaseline ? w.steps : activeSteps.value;
      const effectiveMax = modelBounds.value.from_model ? modelBounds.value.sigma_max : w.sigmaMaxFallback;
      const effectiveMin = modelBounds.value.from_model ? modelBounds.value.sigma_min : w.sigmaMinFallback;
      if (!modelBounds.value.from_model) {
        modelBounds.value = {
          sigma_max: effectiveMax,
          sigma_min: effectiveMin,
          from_model: false
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
      try {
        baselineAbortController == null ? void 0 : baselineAbortController.abort();
        baselineAbortController = new AbortController();
        const fetchFn = typeof ((_a = api) == null ? void 0 : _a.fetchApi) === "function" ? (url, init) => api.fetchApi(url, init) : (url, init) => fetch(url, init);
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
            use_cached_model_bounds: true
          }),
          signal: baselineAbortController.signal
        });
        if (response && response.ok) {
          const data = await response.json();
          if (Array.isArray(data == null ? void 0 : data.baseline_sigmas) && data.baseline_sigmas.length >= 2) {
            baselineSigmas.value = data.baseline_sigmas.map((v) => Number(v));
            if (data.model_bounds) {
              modelBounds.value = {
                sigma_max: Number(data.model_bounds.sigma_max ?? effectiveMax),
                sigma_min: Number(data.model_bounds.sigma_min ?? effectiveMin),
                from_model: Boolean(data.model_bounds.from_model)
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
      }
    }
    function serialiseState() {
      const payload = {
        version: "1.0",
        is_modified: isModified.value,
        baseline_scheduler: baselineScheduler.value,
        steps: activeSteps.value,
        denoise: currentDenoise.value,
        y_scale_mode: yScaleMode.value,
        model_bounds: {
          sigma_max: Number(modelBounds.value.sigma_max.toFixed(6)),
          sigma_min: Number(modelBounds.value.sigma_min.toFixed(6)),
          from_model: modelBounds.value.from_model
        },
        baseline_sigmas: baselineSigmas.value.map((v) => Number(v.toFixed(6))),
        custom_sigmas: customSigmas.value.map((v) => Number(v.toFixed(6)))
      };
      return JSON.stringify(payload);
    }
    function emitState() {
      var _a;
      (_a = props.onStateChange) == null ? void 0 : _a.call(props, serialiseState());
    }
    function hydrateState(rawJson) {
      var _a;
      if (!rawJson || typeof rawJson !== "string") return false;
      const trimmed = rawJson.trim();
      if (!trimmed || trimmed === "{}") return false;
      try {
        const parsed = JSON.parse(trimmed);
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
            sigma_max: Number(parsed.model_bounds.sigma_max ?? 1),
            sigma_min: Number(parsed.model_bounds.sigma_min ?? 0.01),
            from_model: Boolean(parsed.model_bounds.from_model)
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
          (_a = props.onStepsChange) == null ? void 0 : _a.call(props, restoredSteps);
          drawCanvas();
          return true;
        }
      } catch {
      }
      return false;
    }
    function onExternalStepsWidgetChanged(newSteps) {
      const targetSteps = Math.max(1, Math.min(1e3, Math.round(newSteps || 20)));
      if (targetSteps === activeSteps.value) return;
      if (isModified.value) {
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
    function onExternalSchedulerWidgetChanged(newScheduler) {
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
    function onBackendExecuted(statePayload) {
      if (!statePayload || typeof statePayload !== "object") return;
      if (statePayload.model_bounds) {
        modelBounds.value = {
          sigma_max: Number(statePayload.model_bounds.sigma_max ?? modelBounds.value.sigma_max),
          sigma_min: Number(statePayload.model_bounds.sigma_min ?? modelBounds.value.sigma_min),
          from_model: Boolean(statePayload.model_bounds.from_model)
        };
      }
      if (Array.isArray(statePayload.baseline_sigmas) && statePayload.baseline_sigmas.length >= 2) {
        baselineSigmas.value = statePayload.baseline_sigmas.map((v) => Number(v));
      }
      if (!isModified.value && Array.isArray(statePayload.effective_sigmas) && statePayload.effective_sigmas.length >= 2) {
        customSigmas.value = statePayload.effective_sigmas.map((v) => Number(v));
      }
      emitState();
      drawCanvas();
    }
    function cleanup() {
      baselineAbortController == null ? void 0 : baselineAbortController.abort();
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    }
    __expose({
      hydrateState,
      resetToBaseline,
      onExternalStepsWidgetChanged,
      onExternalSchedulerWidgetChanged,
      onExternalBoundsOrDenoiseChanged,
      onBackendExecuted,
      cleanup
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
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "rootEl",
        ref: rootEl,
        class: "duffy-scheduler-root",
        tabindex: "0",
        onKeydown: onKeyDown
      }, [
        createBaseVNode("div", _hoisted_1, [
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("span", {
              class: normalizeClass(["status-pill", isModified.value ? "status-custom" : "status-preset"]),
              title: isModified.value ? "Custom user-edited curve active" : "Following mathematical baseline preset"
            }, toDisplayString(isModified.value ? "CUSTOM" : "PRESET"), 11, _hoisted_3),
            createBaseVNode("span", {
              class: "meta-badge",
              title: modelBounds.value.from_model ? "Bounds extracted from connected MODEL" : "Using fallback sigma bounds"
            }, toDisplayString(modelBounds.value.from_model ? "Model σ" : "Fallback σ") + ": " + toDisplayString(formatCompact(modelBounds.value.sigma_max)) + " → " + toDisplayString(formatCompact(modelBounds.value.sigma_min)), 9, _hoisted_4),
            createBaseVNode("span", _hoisted_5, toDisplayString(activeSteps.value) + " " + toDisplayString(activeSteps.value === 1 ? "step" : "steps") + " (" + toDisplayString(customSigmas.value.length) + " pts) ", 1)
          ]),
          createBaseVNode("div", _hoisted_6, [
            createBaseVNode("button", {
              type: "button",
              class: normalizeClass(["tb-btn", { active: yScaleMode.value === "log" }]),
              title: "Toggle Linear vs. Normalized Log Y-Axis scale for fine low-sigma control",
              onClick: toggleYScale
            }, " Y: " + toDisplayString(yScaleMode.value === "log" ? "Log" : "Lin"), 3),
            createBaseVNode("button", {
              type: "button",
              class: "tb-btn",
              disabled: activeSteps.value >= 1e3,
              title: "Insert a new step midpoint on the schedule (or Double-Click / Shift+Click on curve)",
              onClick: insertStepFromToolbar
            }, " + Step ", 8, _hoisted_7),
            createBaseVNode("button", {
              type: "button",
              class: "tb-btn",
              disabled: activeSteps.value <= 1,
              title: "Remove selected or penultimate step (minimum 1 step; or Right-Click / Alt+Click vertex)",
              onClick: removeStepFromToolbar
            }, " - Step ", 8, _hoisted_8),
            createBaseVNode("button", {
              type: "button",
              class: "tb-btn tb-btn-reset",
              title: "Reset schedule points to the unmodified mathematical preset curve",
              onClick: resetToBaseline
            }, " Reset ")
          ])
        ]),
        pendingPresetChange.value ? (openBlock(), createElementBlock("div", _hoisted_9, [
          createBaseVNode("span", _hoisted_10, [
            _cache[0] || (_cache[0] = createTextVNode(" Baseline preset changed to ", -1)),
            createBaseVNode("strong", null, toDisplayString(baselineScheduler.value), 1),
            _cache[1] || (_cache[1] = createTextVNode(" while custom edits are active: ", -1))
          ]),
          createBaseVNode("div", _hoisted_11, [
            createBaseVNode("button", {
              type: "button",
              class: "prompt-btn snap",
              onClick: confirmSnapToNewPreset
            }, " Snap to " + toDisplayString(baselineScheduler.value), 1),
            createBaseVNode("button", {
              type: "button",
              class: "prompt-btn keep",
              onClick: dismissPresetPrompt
            }, " Keep Custom Curve ")
          ])
        ])) : createCommentVNode("", true),
        createBaseVNode("div", {
          ref_key: "canvasWrapEl",
          ref: canvasWrapEl,
          class: "canvas-wrapper"
        }, [
          createBaseVNode("canvas", {
            ref_key: "canvasEl",
            ref: canvasEl,
            class: "schedule-canvas",
            onPointerdown: onPointerDown,
            onPointermove: onPointerMove,
            onPointerup: onPointerUp,
            onPointerleave: onPointerLeave,
            onDblclick: onDoubleClick,
            onWheel: withModifiers(onWheel, ["prevent"]),
            onContextmenu: withModifiers(onCanvasContextMenu, ["prevent"])
          }, null, 544),
          hudInfo.value ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: "hud-tooltip",
            style: normalizeStyle({ left: `${hudInfo.value.x}px`, top: `${hudInfo.value.y}px` })
          }, [
            createBaseVNode("div", _hoisted_12, [
              createTextVNode(" Step " + toDisplayString(hudInfo.value.index) + " / " + toDisplayString(activeSteps.value) + " ", 1),
              hudInfo.value.isTerminal ? (openBlock(), createElementBlock("span", _hoisted_13, "(Locked Terminal 0.0)")) : createCommentVNode("", true)
            ]),
            createBaseVNode("div", _hoisted_14, [
              _cache[2] || (_cache[2] = createBaseVNode("span", null, "σ:", -1)),
              createBaseVNode("strong", null, toDisplayString(hudInfo.value.sigma.toFixed(4)), 1)
            ]),
            createBaseVNode("div", _hoisted_15, [
              _cache[3] || (_cache[3] = createBaseVNode("span", null, "Δσ:", -1)),
              createBaseVNode("strong", null, toDisplayString(hudInfo.value.delta.toFixed(4)), 1)
            ]),
            createBaseVNode("div", _hoisted_16, [
              _cache[4] || (_cache[4] = createBaseVNode("span", null, "Base:", -1)),
              createBaseVNode("span", null, toDisplayString(hudInfo.value.baseline.toFixed(4)), 1)
            ])
          ], 4)) : createCommentVNode("", true)
        ], 512),
        createBaseVNode("div", _hoisted_17, [
          createBaseVNode("div", _hoisted_18, [
            _cache[6] || (_cache[6] = createBaseVNode("span", { class: "legend-item" }, [
              createBaseVNode("span", { class: "swatch swatch-active" }),
              createTextVNode(" Active σ ")
            ], -1)),
            createBaseVNode("span", _hoisted_19, [
              _cache[5] || (_cache[5] = createBaseVNode("span", { class: "swatch swatch-base" }, null, -1)),
              createTextVNode(" Baseline (" + toDisplayString(baselineScheduler.value) + ") ", 1)
            ]),
            _cache[7] || (_cache[7] = createBaseVNode("span", { class: "legend-item" }, [
              createBaseVNode("span", { class: "swatch swatch-delta" }),
              createTextVNode(" Step Δσ ")
            ], -1))
          ]),
          _cache[8] || (_cache[8] = createBaseVNode("div", { class: "hint-text" }, " Drag: edit σ · Wheel/↑↓: ±0.001 · DblClick/Shift+Click: +step · RightClick/Alt+Click: -step ", -1))
        ])
      ], 544);
    };
  }
});
const InteractiveScheduler = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-593f134d"]]);
const NODE_CLASS = "Duffy_InteractiveScheduler";
const DEFAULT_SIZE = [480, 490];
const MIN_WIDGET_HEIGHT = 270;
const ISOLATED_EVENTS = [
  "pointerdown",
  "mousedown",
  "mouseup",
  "dblclick",
  "wheel"
];
app.registerExtension({
  name: "Duffy.InteractiveScheduler.Vue",
  getNodeMenuItems(node) {
    if ((node == null ? void 0 : node.comfyClass) !== NODE_CLASS) return [];
    return [
      {
        content: "Duffy: Reset Sigma Curve to Baseline",
        callback: () => {
          var _a, _b;
          (_b = (_a = node.__duffySchedulerInstance) == null ? void 0 : _a.resetToBaseline) == null ? void 0 : _b.call(_a);
        }
      }
    ];
  },
  async nodeCreated(node) {
    var _a, _b, _c;
    if (node.comfyClass !== NODE_CLASS) return;
    const findWidget = (name) => {
      var _a2;
      return (_a2 = node.widgets) == null ? void 0 : _a2.find((w) => w.name === name);
    };
    const schedulerWidget = findWidget("scheduler");
    const stepsWidget = findWidget("steps");
    const denoiseWidget = findWidget("denoise");
    const sigmaMaxWidget = findWidget("sigma_max_fallback");
    const sigmaMinWidget = findWidget("sigma_min_fallback");
    const monotonicWidget = findWidget("enforce_monotonic");
    const stateWidget = findWidget("custom_sigmas_json");
    if (stateWidget) {
      stateWidget.type = "hidden";
      stateWidget.hidden = true;
      stateWidget.computeSize = () => [0, -4];
      stateWidget.draw = () => {
      };
    }
    const container = document.createElement("div");
    container.className = "duffy-interactive-scheduler-container";
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; position:relative; isolation:isolate;";
    for (const type of ISOLATED_EVENTS) {
      container.addEventListener(type, (event) => event.stopPropagation());
    }
    container.addEventListener("contextmenu", (event) => {
      var _a2, _b2, _c2, _d;
      event.preventDefault();
      event.stopPropagation();
      if (((_b2 = (_a2 = event.target) == null ? void 0 : _a2.tagName) == null ? void 0 : _b2.toLowerCase()) !== "canvas") {
        (_d = (_c2 = app.canvas) == null ? void 0 : _c2.processContextMenu) == null ? void 0 : _d.call(_c2, node, event);
      }
    });
    let isInternalStepsUpdate = false;
    const getWidgetParams = () => ({
      scheduler: String((schedulerWidget == null ? void 0 : schedulerWidget.value) ?? "normal"),
      steps: Math.max(1, Math.min(1e3, Math.round(Number((stepsWidget == null ? void 0 : stepsWidget.value) ?? 20)))),
      denoise: Math.max(0.01, Math.min(1, Number((denoiseWidget == null ? void 0 : denoiseWidget.value) ?? 1))),
      sigmaMaxFallback: Math.max(1e-4, Number((sigmaMaxWidget == null ? void 0 : sigmaMaxWidget.value) ?? 1)),
      sigmaMinFallback: Math.max(1e-6, Number((sigmaMinWidget == null ? void 0 : sigmaMinWidget.value) ?? 0.01)),
      enforceMonotonic: Boolean((monotonicWidget == null ? void 0 : monotonicWidget.value) ?? true)
    });
    const writeStateJson = (json) => {
      var _a2;
      if (!stateWidget) return;
      stateWidget.value = json;
      (_a2 = node.setDirtyCanvas) == null ? void 0 : _a2.call(node, true, true);
    };
    const writeStepsFromGraph = (newSteps) => {
      var _a2;
      if (!stepsWidget) return;
      const clamped = Math.max(1, Math.min(1e3, Math.round(newSteps)));
      if (Number(stepsWidget.value) === clamped) return;
      isInternalStepsUpdate = true;
      try {
        stepsWidget.value = clamped;
      } finally {
        isInternalStepsUpdate = false;
      }
      (_a2 = node.setDirtyCanvas) == null ? void 0 : _a2.call(node, true, true);
    };
    const initialStateStr = typeof (stateWidget == null ? void 0 : stateWidget.value) === "string" ? stateWidget.value : "{}";
    const vueApp = createApp(InteractiveScheduler, {
      getNodeId: () => String(node.id ?? ""),
      initialStateJson: initialStateStr,
      getWidgetParams,
      onStateChange: writeStateJson,
      onStepsChange: writeStepsFromGraph,
      onForwardContextMenu: (event) => {
        var _a2, _b2;
        (_b2 = (_a2 = app.canvas) == null ? void 0 : _a2.processContextMenu) == null ? void 0 : _b2.call(_a2, node, event);
      }
    });
    const instance = vueApp.mount(container);
    node.__duffySchedulerInstance = instance;
    const domWidget = node.addDOMWidget("interactive_scheduler_ui", "custom", container, {
      serialize: false,
      hideOnZoom: false,
      getMinHeight: () => MIN_WIDGET_HEIGHT
    });
    domWidget.content = container;
    if (stepsWidget) {
      const origStepsCb = stepsWidget.callback;
      stepsWidget.callback = function(...args) {
        var _a2;
        const res = origStepsCb == null ? void 0 : origStepsCb.apply(this, args);
        if (!isInternalStepsUpdate) {
          (_a2 = instance.onExternalStepsWidgetChanged) == null ? void 0 : _a2.call(instance, Number(stepsWidget.value ?? 20));
        }
        return res;
      };
    }
    if (schedulerWidget) {
      const origSchedCb = schedulerWidget.callback;
      schedulerWidget.callback = function(...args) {
        var _a2;
        const res = origSchedCb == null ? void 0 : origSchedCb.apply(this, args);
        (_a2 = instance.onExternalSchedulerWidgetChanged) == null ? void 0 : _a2.call(instance, String(schedulerWidget.value ?? "normal"));
        return res;
      };
    }
    for (const w of [denoiseWidget, sigmaMaxWidget, sigmaMinWidget, monotonicWidget]) {
      if (!w) continue;
      const origCb = w.callback;
      w.callback = function(...args) {
        var _a2;
        const res = origCb == null ? void 0 : origCb.apply(this, args);
        (_a2 = instance.onExternalBoundsOrDenoiseChanged) == null ? void 0 : _a2.call(instance);
        return res;
      };
    }
    if (!node.size || node.size[0] < DEFAULT_SIZE[0] || node.size[1] < DEFAULT_SIZE[1]) {
      (_c = node.setSize) == null ? void 0 : _c.call(node, [
        Math.max(((_a = node.size) == null ? void 0 : _a[0]) ?? 0, DEFAULT_SIZE[0]),
        Math.max(((_b = node.size) == null ? void 0 : _b[1]) ?? 0, DEFAULT_SIZE[1])
      ]);
    }
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      if (Array.isArray(size)) {
        size[0] = Math.max(380, size[0]);
        size[1] = Math.max(420, size[1]);
      }
      origOnResize == null ? void 0 : origOnResize.apply(this, arguments);
    };
    const origConfigure = node.configure;
    node.configure = function(info) {
      var _a2;
      const result = origConfigure == null ? void 0 : origConfigure.apply(this, arguments);
      if (typeof (stateWidget == null ? void 0 : stateWidget.value) === "string" && stateWidget.value.trim()) {
        (_a2 = instance.hydrateState) == null ? void 0 : _a2.call(instance, stateWidget.value);
      }
      return result;
    };
    const origExecuted = node.onExecuted;
    node.onExecuted = function(message) {
      var _a2, _b2;
      origExecuted == null ? void 0 : origExecuted.apply(this, arguments);
      const statePayload = (_a2 = message == null ? void 0 : message.scheduler_state) == null ? void 0 : _a2[0];
      if (statePayload) {
        (_b2 = instance.onBackendExecuted) == null ? void 0 : _b2.call(instance, statePayload);
      }
    };
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      (_a2 = instance.cleanup) == null ? void 0 : _a2.call(instance);
      vueApp.unmount();
      delete node.__duffySchedulerInstance;
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
  }
});
