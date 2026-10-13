import { d as defineComponent, o as openBlock, c as createElementBlock, a as createBaseVNode, F as Fragment, r as renderList, m as normalizeStyle, l as computed, _ as _export_sfc, b as ref, f as onMounted, j as nextTick, g as onUnmounted, E as createBlock, i as createCommentVNode, n as normalizeClass, t as toDisplayString, w as withDirectives, v as vModelText, G as reactive, e as createApp } from "./_plugin-vue_export-helper-CRxIfRw1.js";
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
const MIN_SCALE = 0.01;
const MAX_SCALE = 100;
const ANCHOR_MIN = -1;
const ANCHOR_MAX = 2;
const SNAP_SCREEN_PX = 5;
const ROTATION_STEP_DEG = 15;
const DEFAULT_FIT_RATIO = 0.5;
const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function cloneState(s) {
  return {
    version: 1,
    translation_norm: [s.translation_norm[0], s.translation_norm[1]],
    scale_factors: [s.scale_factors[0], s.scale_factors[1]],
    rotation_deg: s.rotation_deg,
    anchor_point: [s.anchor_point[0], s.anchor_point[1]],
    ...s.input_signature ? { input_signature: s.input_signature } : {}
  };
}
function defaultScale(bg, ov) {
  if (bg.w <= 0 || bg.h <= 0 || ov.w <= 0 || ov.h <= 0) return 1;
  return Math.max(MIN_SCALE, Math.min(DEFAULT_FIT_RATIO * bg.w / ov.w, DEFAULT_FIT_RATIO * bg.h / ov.h, 1));
}
function defaultState(bg, ov) {
  const s = defaultScale(bg, ov);
  return { version: 1, translation_norm: [0.5, 0.5], scale_factors: [s, s], rotation_deg: 0, anchor_point: [0.5, 0.5] };
}
function wrapDeg(deg) {
  return ((deg + 180) % 360 + 360) % 360 - 180;
}
function clampScale(value, sign) {
  const s = sign < 0 ? -1 : 1;
  return s * clamp(Math.abs(value), MIN_SCALE, MAX_SCALE);
}
function fitViewport(W, H, Wv, Hv) {
  if (W <= 0 || H <= 0 || Wv <= 0 || Hv <= 0) return { s: 1, Wd: 0, Hd: 0, ox: 0, oy: 0 };
  const s = Math.min(Wv / W, Hv / H);
  const Wd = W * s;
  const Hd = H * s;
  return { s, Wd, Hd, ox: (Wv - Wd) / 2, oy: (Hv - Hd) / 2 };
}
function forwardMatrix(state, bg, ov) {
  const th = state.rotation_deg * DEG;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const [sx, sy] = state.scale_factors;
  const Tx = state.translation_norm[0] * bg.w;
  const Ty = state.translation_norm[1] * bg.h;
  const Ax = state.anchor_point[0] * ov.w;
  const Ay = state.anchor_point[1] * ov.h;
  const a = cos * sx;
  const b = -sin * sx;
  const c = sin * sy;
  const d = cos * sy;
  return { a, b, c, d, e: Tx - a * Ax - c * Ay, f: Ty - b * Ax - d * Ay };
}
function apply(m, p) {
  return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f];
}
function invert(m) {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) throw new Error("Singular overlay matrix");
  const a = m.d / det;
  const b = -m.b / det;
  const c = -m.c / det;
  const d = m.a / det;
  return { a, b, c, d, e: -(a * m.e + c * m.f), f: -(b * m.e + d * m.f) };
}
function cssMatrix(m) {
  return `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`;
}
function toLocalAxes(v, deg) {
  const th = deg * DEG;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  return [cos * v[0] - sin * v[1], sin * v[0] + cos * v[1]];
}
function toBgAxes(v, deg) {
  const th = deg * DEG;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  return [cos * v[0] + sin * v[1], -sin * v[0] + cos * v[1]];
}
function translate(s0, p0, p, bg, opts) {
  const out = cloneState(s0);
  let x = s0.translation_norm[0] * bg.w + (p[0] - p0[0]);
  let y = s0.translation_norm[1] * bg.h + (p[1] - p0[1]);
  if (opts.snap) {
    if (Math.abs(x - bg.w / 2) <= opts.snapThresholdPx) x = bg.w / 2;
    if (Math.abs(y - bg.h / 2) <= opts.snapThresholdPx) y = bg.h / 2;
  }
  out.translation_norm = [x / bg.w, y / bg.h];
  return out;
}
function anchorBg(s, bg) {
  return [s.translation_norm[0] * bg.w, s.translation_norm[1] * bg.h];
}
function localFromPointer(s0, p, bg) {
  const T = anchorBg(s0, bg);
  return toLocalAxes([p[0] - T[0], p[1] - T[1]], s0.rotation_deg);
}
const SAFE = 1e-6;
function scaleCorner(s0, p0, p, bg, free) {
  const out = cloneState(s0);
  const l0 = localFromPointer(s0, p0, bg);
  const l = localFromPointer(s0, p, bg);
  const [sx0, sy0] = s0.scale_factors;
  if (free) {
    const kx = Math.abs(l0[0]) > SAFE ? l[0] / l0[0] : 1;
    const ky = Math.abs(l0[1]) > SAFE ? l[1] / l0[1] : 1;
    out.scale_factors = [clampScale(sx0 * Math.max(kx, 0), sx0), clampScale(sy0 * Math.max(ky, 0), sy0)];
  } else {
    const denom = l0[0] * l0[0] + l0[1] * l0[1];
    const k = denom > SAFE ? Math.max((l[0] * l0[0] + l[1] * l0[1]) / denom, 0) : 1;
    out.scale_factors = [clampScale(sx0 * k, sx0), clampScale(sy0 * k, sy0)];
  }
  return out;
}
function scaleEdge(s0, p0, p, bg, axis) {
  const out = cloneState(s0);
  const l0 = localFromPointer(s0, p0, bg);
  const l = localFromPointer(s0, p, bg);
  const i = axis === "x" ? 0 : 1;
  const k = Math.abs(l0[i]) > SAFE ? Math.max(l[i] / l0[i], 0) : 1;
  const next = [s0.scale_factors[0], s0.scale_factors[1]];
  next[i] = clampScale(s0.scale_factors[i] * k, s0.scale_factors[i]);
  out.scale_factors = next;
  return out;
}
function rotate(s0, p0, p, bg, step) {
  const out = cloneState(s0);
  const T = anchorBg(s0, bg);
  const a0 = Math.atan2(p0[1] - T[1], p0[0] - T[0]);
  const a1 = Math.atan2(p[1] - T[1], p[0] - T[0]);
  let deg = s0.rotation_deg - (a1 - a0) / DEG;
  if (step) deg = Math.round(deg / ROTATION_STEP_DEG) * ROTATION_STEP_DEG;
  out.rotation_deg = wrapDeg(deg);
  return out;
}
function moveAnchor(s0, p, bg, ov) {
  const inv = invert(forwardMatrix(s0, bg, ov));
  const po = apply(inv, p);
  const ax = clamp(po[0] / ov.w, ANCHOR_MIN, ANCHOR_MAX);
  const ay = clamp(po[1] / ov.h, ANCHOR_MIN, ANCHOR_MAX);
  return setAnchor(s0, [ax, ay], bg, ov);
}
function setAnchor(s0, anchor, bg, ov) {
  const m = forwardMatrix(s0, bg, ov);
  const T = apply(m, [anchor[0] * ov.w, anchor[1] * ov.h]);
  const out = cloneState(s0);
  out.anchor_point = [anchor[0], anchor[1]];
  out.translation_norm = [T[0] / bg.w, T[1] / bg.h];
  return out;
}
function coerceState(raw, fallback) {
  if (!raw || typeof raw !== "object") return cloneState(fallback);
  const r = raw;
  const pair = (v, fb) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n)) ? [v[0], v[1]] : [fb[0], fb[1]];
  const rot = typeof r.rotation_deg === "number" && Number.isFinite(r.rotation_deg) ? r.rotation_deg : fallback.rotation_deg;
  const scale = pair(r.scale_factors, fallback.scale_factors);
  const state = {
    version: 1,
    translation_norm: pair(r.translation_norm, fallback.translation_norm),
    scale_factors: [
      clampScale(scale[0] === 0 ? fallback.scale_factors[0] : scale[0], scale[0]),
      clampScale(scale[1] === 0 ? fallback.scale_factors[1] : scale[1], scale[1])
    ],
    rotation_deg: wrapDeg(rot),
    anchor_point: pair(r.anchor_point, fallback.anchor_point).map((v) => clamp(v, ANCHOR_MIN, ANCHOR_MAX))
  };
  if (typeof r.input_signature === "string") state.input_signature = r.input_signature;
  return state;
}
const _hoisted_1$1 = ["viewBox", "width", "height"];
const _hoisted_2$1 = ["points", "stroke-width"];
const _hoisted_3$1 = ["x1", "y1", "x2", "y2", "stroke-width"];
const _hoisted_4$1 = ["cx", "cy", "r", "stroke-width"];
const _hoisted_5$1 = ["x", "y", "width", "height", "rx", "stroke-width", "onPointerdown", "onDblclick"];
const _hoisted_6$1 = ["x", "y", "width", "height", "stroke-width", "onPointerdown", "onDblclick"];
const _hoisted_7$1 = ["cx", "cy", "r"];
const _hoisted_8$1 = ["cx", "cy", "r", "stroke-width"];
const _hoisted_9$1 = ["x1", "y1", "x2", "y2", "stroke-width"];
const _hoisted_10$1 = ["x1", "y1", "x2", "y2", "stroke-width"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "OverlayGizmo",
  props: {
    state: {},
    bg: {},
    ov: {},
    unit: {}
  },
  emits: ["handle-down", "handle-dblclick"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const radius = computed(() => 6 * props.unit);
    const stroke = computed(() => 1.5 * props.unit);
    const matrix = computed(() => forwardMatrix(props.state, props.bg, props.ov));
    const at = (u, v) => apply(matrix.value, [u * props.ov.w, v * props.ov.h]);
    const bodyPoints = computed(
      () => [at(0, 0), at(1, 0), at(1, 1), at(0, 1)].map((p) => `${p[0]},${p[1]}`).join(" ")
    );
    const cornerHandles = computed(() => [
      { id: "tl", p: at(0, 0), cursor: "nwse-resize" },
      { id: "tr", p: at(1, 0), cursor: "nesw-resize" },
      { id: "br", p: at(1, 1), cursor: "nwse-resize" },
      { id: "bl", p: at(0, 1), cursor: "nesw-resize" }
    ]);
    const edgeHandles = computed(() => [
      { id: "tc", p: at(0.5, 0), cursor: "ns-resize" },
      { id: "bc", p: at(0.5, 1), cursor: "ns-resize" },
      { id: "ml", p: at(0, 0.5), cursor: "ew-resize" },
      { id: "mr", p: at(1, 0.5), cursor: "ew-resize" }
    ]);
    const lever = computed(() => {
      const from = at(0.5, 0);
      const up = toBgAxes([0, props.state.scale_factors[1] < 0 ? 1 : -1], props.state.rotation_deg);
      const length = 34 * props.unit;
      return { from, to: [from[0] + up[0] * length, from[1] + up[1] * length] };
    });
    const anchor = computed(() => [
      props.state.translation_norm[0] * props.bg.w,
      props.state.translation_norm[1] * props.bg.h
    ]);
    function emitDown(kind, ev) {
      if (ev.button !== 0 || ev.altKey) return;
      ev.preventDefault();
      ev.stopPropagation();
      emit("handle-down", kind, ev);
    }
    function emitDbl(kind, ev) {
      ev.preventDefault();
      ev.stopPropagation();
      emit("handle-dblclick", kind, ev);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("svg", {
        class: "io-gizmo",
        viewBox: `0 0 ${__props.bg.w} ${__props.bg.h}`,
        width: __props.bg.w,
        height: __props.bg.h,
        preserveAspectRatio: "none"
      }, [
        createBaseVNode("polygon", {
          class: "io-body",
          points: bodyPoints.value,
          "stroke-width": stroke.value,
          onPointerdown: _cache[0] || (_cache[0] = ($event) => emitDown("body", $event))
        }, null, 40, _hoisted_2$1),
        createBaseVNode("line", {
          class: "io-lever",
          x1: lever.value.from[0],
          y1: lever.value.from[1],
          x2: lever.value.to[0],
          y2: lever.value.to[1],
          "stroke-width": stroke.value
        }, null, 8, _hoisted_3$1),
        createBaseVNode("circle", {
          class: "io-handle io-rotate",
          cx: lever.value.to[0],
          cy: lever.value.to[1],
          r: radius.value * 1.15,
          "stroke-width": stroke.value,
          onPointerdown: _cache[1] || (_cache[1] = ($event) => emitDown("rotate", $event)),
          onDblclick: _cache[2] || (_cache[2] = ($event) => emitDbl("rotate", $event))
        }, [..._cache[5] || (_cache[5] = [
          createBaseVNode("title", null, "Rotate (Shift: 15° steps, double-click: reset)", -1)
        ])], 40, _hoisted_4$1),
        (openBlock(true), createElementBlock(Fragment, null, renderList(edgeHandles.value, (h) => {
          return openBlock(), createElementBlock("rect", {
            key: h.id,
            class: "io-handle io-edge",
            style: normalizeStyle({ cursor: h.cursor }),
            x: h.p[0] - radius.value * 0.8,
            y: h.p[1] - radius.value * 0.8,
            width: radius.value * 1.6,
            height: radius.value * 1.6,
            rx: radius.value * 0.3,
            "stroke-width": stroke.value,
            onPointerdown: ($event) => emitDown(h.id, $event),
            onDblclick: ($event) => emitDbl(h.id, $event)
          }, null, 44, _hoisted_5$1);
        }), 128)),
        (openBlock(true), createElementBlock(Fragment, null, renderList(cornerHandles.value, (h) => {
          return openBlock(), createElementBlock("rect", {
            key: h.id,
            class: "io-handle io-corner",
            style: normalizeStyle({ cursor: h.cursor }),
            x: h.p[0] - radius.value,
            y: h.p[1] - radius.value,
            width: radius.value * 2,
            height: radius.value * 2,
            "stroke-width": stroke.value,
            onPointerdown: ($event) => emitDown(h.id, $event),
            onDblclick: ($event) => emitDbl(h.id, $event)
          }, null, 44, _hoisted_6$1);
        }), 128)),
        createBaseVNode("g", {
          class: "io-anchor",
          onPointerdown: _cache[3] || (_cache[3] = ($event) => emitDown("anchor", $event)),
          onDblclick: _cache[4] || (_cache[4] = ($event) => emitDbl("anchor", $event))
        }, [
          createBaseVNode("circle", {
            cx: anchor.value[0],
            cy: anchor.value[1],
            r: radius.value * 1.6,
            class: "io-anchor-hit"
          }, null, 8, _hoisted_7$1),
          createBaseVNode("circle", {
            cx: anchor.value[0],
            cy: anchor.value[1],
            r: radius.value * 0.9,
            "stroke-width": stroke.value,
            class: "io-anchor-ring"
          }, null, 8, _hoisted_8$1),
          createBaseVNode("line", {
            x1: anchor.value[0] - radius.value * 1.6,
            y1: anchor.value[1],
            x2: anchor.value[0] + radius.value * 1.6,
            y2: anchor.value[1],
            "stroke-width": stroke.value
          }, null, 8, _hoisted_9$1),
          createBaseVNode("line", {
            x1: anchor.value[0],
            y1: anchor.value[1] - radius.value * 1.6,
            x2: anchor.value[0],
            y2: anchor.value[1] + radius.value * 1.6,
            "stroke-width": stroke.value
          }, null, 8, _hoisted_10$1),
          _cache[6] || (_cache[6] = createBaseVNode("title", null, "Pivot (drag to move, double-click: center)", -1))
        ], 32)
      ], 8, _hoisted_1$1);
    };
  }
});
const OverlayGizmo = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-34a5ea11"]]);
const _hoisted_1 = ["src"];
const _hoisted_2 = ["src"];
const _hoisted_3 = ["src"];
const _hoisted_4 = {
  key: 2,
  class: "io-empty"
};
const _hoisted_5 = {
  key: 3,
  class: "io-busy"
};
const _hoisted_6 = { class: "io-hud" };
const _hoisted_7 = {
  class: "io-telemetry",
  title: "Anchor position (px), scale, rotation"
};
const _hoisted_8 = {
  class: "io-dim",
  title: "Dim background"
};
const _hoisted_9 = ["disabled"];
const _hoisted_10 = ["disabled"];
const _hoisted_11 = ["disabled"];
const _hoisted_12 = {
  key: 1,
  class: "io-spacer"
};
const _hoisted_13 = {
  key: 2,
  class: "io-message"
};
const PAUSE_EVENT = "duffy-interactive-overlay-pause";
const RESUME_ROUTE = "/duffy/interactive_overlay/resume";
const PENDING_ROUTE = "/duffy/interactive_overlay/pending";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "InteractiveOverlay",
  props: {
    getNodeId: { type: Function },
    getAppearance: { type: Function },
    onStateChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const BLEND_CSS = {
      normal: "normal",
      multiply: "multiply",
      screen: "screen",
      overlay: "overlay",
      add: "plus-lighter"
    };
    const props = __props;
    const rootRef = ref(null);
    const viewportRef = ref(null);
    const stageRef = ref(null);
    const mode = ref("idle");
    const session = ref(null);
    const resultUrl = ref("");
    const message = ref("");
    const bg = reactive({ w: 1, h: 1 });
    const ov = reactive({ w: 1, h: 1 });
    const state = ref(defaultState({ w: 1, h: 1 }, { w: 1, h: 1 }));
    const initialState = ref(cloneState(state.value));
    const blendMode = ref("normal");
    const opacity = ref(1);
    const dim = ref(0);
    const viewportSize = reactive({ w: 0, h: 0 });
    const zoom = ref(1);
    const pan = ref([0, 0]);
    const unit = ref(1);
    const panning = ref(false);
    let resizeObserver = null;
    let rehydrateTimer = null;
    let rafId = 0;
    let pendingMove = null;
    let drag = null;
    const fit = computed(() => fitViewport(bg.w, bg.h, viewportSize.w, viewportSize.h));
    const stageStyle = computed(() => {
      const f = fit.value;
      const s = f.s * zoom.value;
      return {
        width: `${bg.w}px`,
        height: `${bg.h}px`,
        transform: `translate(${f.ox + pan.value[0]}px, ${f.oy + pan.value[1]}px) scale(${s})`
      };
    });
    const overlayStyle = computed(() => ({
      width: `${ov.w}px`,
      height: `${ov.h}px`,
      transform: cssMatrix(forwardMatrix(state.value, bg, ov)),
      opacity: String(opacity.value),
      mixBlendMode: BLEND_CSS[blendMode.value] ?? "normal"
    }));
    const telemetry = computed(() => {
      const s = state.value;
      const [sx, sy] = s.scale_factors;
      const pct = (v) => `${(v * 100).toFixed(1)}%`;
      return {
        x: Math.round(s.translation_norm[0] * bg.w),
        y: Math.round(s.translation_norm[1] * bg.h),
        scale: Math.abs(sx - sy) < 1e-4 ? pct(sx) : `${pct(sx)} × ${pct(sy)}`,
        rot: s.rotation_deg.toFixed(1)
      };
    });
    const badgeText = computed(() => {
      if (mode.value === "paused") return "⏸ Paused, adjust the overlay";
      if (mode.value === "submitting") return "Resuming…";
      return resultUrl.value ? "Last result" : "Idle";
    });
    function matchesNode(nodeId) {
      const own = props.getNodeId();
      const id = String(nodeId ?? "");
      return id === own || id.endsWith(`:${own}`);
    }
    function loadSession(payload) {
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
        inputSignature: String(payload.input_signature ?? "")
      };
      message.value = "";
      zoom.value = 1;
      pan.value = [0, 0];
      mode.value = "paused";
      nextTick(() => {
        var _a;
        measureViewport();
        updateUnit();
        (_a = rootRef.value) == null ? void 0 : _a.focus({ preventScroll: true });
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
      var _a;
      if (mode.value !== "paused" || !session.value) return;
      const current = session.value;
      const transform = {
        ...cloneState(state.value),
        blend_mode: blendMode.value,
        opacity: opacity.value,
        input_signature: current.inputSignature
      };
      mode.value = "submitting";
      message.value = "";
      try {
        const response = await api.fetchApi(RESUME_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: current.sessionId, node_id: current.nodeId, transform })
        });
        if (response.ok) {
          (_a = props.onStateChange) == null ? void 0 : _a.call(props, JSON.stringify(transform));
          endSession();
          return;
        }
        const body = await response.json().catch(() => ({}));
        if (response.status === 404) {
          endSession("Session expired. Queue the workflow again.");
        } else {
          mode.value = "paused";
          message.value = String((body == null ? void 0 : body.message) ?? `Resume failed (${response.status})`);
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
        const match = ((body == null ? void 0 : body.sessions) ?? []).find((s) => matchesNode(s == null ? void 0 : s.node_id));
        if (match) loadSession(match);
      } catch {
      }
    }
    function measureViewport() {
      const el = viewportRef.value;
      if (!el) return;
      viewportSize.w = el.clientWidth;
      viewportSize.h = el.clientHeight;
    }
    function updateUnit() {
      var _a;
      const rect = (_a = stageRef.value) == null ? void 0 : _a.getBoundingClientRect();
      if (rect && rect.width > 0) unit.value = bg.w / rect.width;
    }
    function pointerToBg(ev) {
      const rect = stageRef.value.getBoundingClientRect();
      return [(ev.clientX - rect.left) * bg.w / rect.width, (ev.clientY - rect.top) * bg.h / rect.height];
    }
    function viewportCssScale() {
      const el = viewportRef.value;
      if (!el || !el.clientWidth) return 1;
      return el.getBoundingClientRect().width / el.clientWidth;
    }
    function capture(ev) {
      var _a;
      try {
        (_a = viewportRef.value) == null ? void 0 : _a.setPointerCapture(ev.pointerId);
      } catch {
      }
    }
    function onHandleDown(kind, ev) {
      var _a;
      if (mode.value !== "paused" || !stageRef.value) return;
      (_a = rootRef.value) == null ? void 0 : _a.focus({ preventScroll: true });
      updateUnit();
      drag = {
        kind,
        pointerId: ev.pointerId,
        s0: cloneState(state.value),
        p0: pointerToBg(ev),
        screen0: [ev.clientX, ev.clientY],
        pan0: [pan.value[0], pan.value[1]]
      };
      capture(ev);
    }
    function onViewportPointerDown(ev) {
      if (!session.value) return;
      if (ev.button === 0 && ev.altKey || ev.button === 1) {
        ev.preventDefault();
        drag = {
          kind: "pan",
          pointerId: ev.pointerId,
          s0: cloneState(state.value),
          p0: [0, 0],
          screen0: [ev.clientX, ev.clientY],
          pan0: [pan.value[0], pan.value[1]]
        };
        panning.value = true;
        capture(ev);
      }
    }
    function onPointerMove(ev) {
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
            snapThresholdPx: SNAP_SCREEN_PX * unit.value
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
    function onPointerUp(ev) {
      var _a;
      if (!drag || ev.pointerId !== drag.pointerId) return;
      ev.stopPropagation();
      if (pendingMove) flushMove();
      try {
        (_a = viewportRef.value) == null ? void 0 : _a.releasePointerCapture(ev.pointerId);
      } catch {
      }
      drag = null;
      panning.value = false;
    }
    function onHandleDblClick(kind) {
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
    function onWheel(ev) {
      if (!session.value || !ev.altKey) return;
      ev.preventDefault();
      const el = viewportRef.value;
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
    function onKeyDown(ev) {
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
    function onPause(event) {
      loadSession(event == null ? void 0 : event.detail);
    }
    function onExecutionStopped() {
      if (mode.value !== "idle") endSession("Execution was cancelled.");
    }
    function onReconnected() {
      rehydrate();
    }
    function setResult(url) {
      resultUrl.value = url;
    }
    function setAppearance(blend, value) {
      if (BLEND_CSS[blend]) blendMode.value = blend;
      if (Number.isFinite(value)) opacity.value = clamp(value, 0, 1);
    }
    function cleanup() {
      api.removeEventListener(PAUSE_EVENT, onPause);
      api.removeEventListener("execution_interrupted", onExecutionStopped);
      api.removeEventListener("execution_error", onExecutionStopped);
      api.removeEventListener("reconnected", onReconnected);
      resizeObserver == null ? void 0 : resizeObserver.disconnect();
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
      rehydrateTimer = setTimeout(rehydrate, 400);
    });
    onUnmounted(cleanup);
    __expose({ loadSession, setResult, setAppearance, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "rootRef",
        ref: rootRef,
        class: "io-root",
        tabindex: "0",
        onKeydown: onKeyDown
      }, [
        createBaseVNode("div", {
          ref_key: "viewportRef",
          ref: viewportRef,
          class: normalizeClass(["io-viewport", { "io-panning": panning.value }]),
          onWheel,
          onPointerdown: onViewportPointerDown,
          onPointermove: onPointerMove,
          onPointerup: onPointerUp,
          onPointercancel: onPointerUp,
          onPointerenter: updateUnit
        }, [
          session.value ? (openBlock(), createElementBlock("div", {
            key: 0,
            ref_key: "stageRef",
            ref: stageRef,
            class: "io-stage",
            style: normalizeStyle(stageStyle.value)
          }, [
            createBaseVNode("img", {
              class: "io-bg",
              src: session.value.bgUrl,
              style: normalizeStyle({ width: `${bg.w}px`, height: `${bg.h}px`, filter: `brightness(${1 - dim.value})` }),
              draggable: "false",
              alt: ""
            }, null, 12, _hoisted_1),
            createBaseVNode("img", {
              class: "io-ov",
              src: session.value.ovUrl,
              style: normalizeStyle(overlayStyle.value),
              draggable: "false",
              alt: ""
            }, null, 12, _hoisted_2),
            mode.value === "paused" ? (openBlock(), createBlock(OverlayGizmo, {
              key: 0,
              state: state.value,
              bg,
              ov,
              unit: unit.value,
              onHandleDown,
              onHandleDblclick: onHandleDblClick
            }, null, 8, ["state", "bg", "ov", "unit"])) : createCommentVNode("", true)
          ], 4)) : resultUrl.value ? (openBlock(), createElementBlock("img", {
            key: 1,
            class: "io-result",
            src: resultUrl.value,
            draggable: "false",
            alt: ""
          }, null, 8, _hoisted_3)) : (openBlock(), createElementBlock("div", _hoisted_4, [..._cache[1] || (_cache[1] = [
            createBaseVNode("div", { class: "io-empty-title" }, "Interactive Overlay Compositor", -1),
            createBaseVNode("div", { class: "io-empty-sub" }, "Queue the workflow. It will pause here so you can place the overlay.", -1)
          ])])),
          mode.value === "submitting" ? (openBlock(), createElementBlock("div", _hoisted_5, [..._cache[2] || (_cache[2] = [
            createBaseVNode("div", { class: "io-spinner" }, null, -1)
          ])])) : createCommentVNode("", true)
        ], 34),
        createBaseVNode("div", _hoisted_6, [
          createBaseVNode("span", {
            class: normalizeClass(["io-badge", `io-badge-${mode.value}`])
          }, toDisplayString(badgeText.value), 3),
          session.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            createBaseVNode("span", _hoisted_7, " X " + toDisplayString(telemetry.value.x) + " · Y " + toDisplayString(telemetry.value.y) + " · " + toDisplayString(telemetry.value.scale) + " · " + toDisplayString(telemetry.value.rot) + "° ", 1),
            _cache[4] || (_cache[4] = createBaseVNode("span", { class: "io-spacer" }, null, -1)),
            createBaseVNode("label", _hoisted_8, [
              _cache[3] || (_cache[3] = createBaseVNode("span", null, "Dim", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => dim.value = $event),
                type: "range",
                min: "0",
                max: "0.85",
                step: "0.05"
              }, null, 512), [
                [
                  vModelText,
                  dim.value,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("button", {
              class: "io-btn",
              disabled: mode.value !== "paused",
              title: "Reset transform (Esc)",
              onClick: resetTransform
            }, " Reset ", 8, _hoisted_9),
            createBaseVNode("button", {
              class: "io-btn",
              disabled: zoom.value === 1 && pan.value[0] === 0 && pan.value[1] === 0,
              title: "Fit view",
              onClick: resetView
            }, " Fit ", 8, _hoisted_10),
            createBaseVNode("button", {
              class: "io-btn io-continue",
              disabled: mode.value !== "paused",
              onClick: submit
            }, toDisplayString(mode.value === "submitting" ? "Applying…" : "Continue ▶"), 9, _hoisted_11)
          ], 64)) : (openBlock(), createElementBlock("span", _hoisted_12)),
          message.value ? (openBlock(), createElementBlock("span", _hoisted_13, toDisplayString(message.value), 1)) : createCommentVNode("", true)
        ])
      ], 544);
    };
  }
});
const InteractiveOverlay = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-95d53ba2"]]);
const NODE_CLASS = "Duffy_InteractiveOverlayCompositor";
const DEFAULT_SIZE = [520, 660];
const MIN_WIDGET_HEIGHT = 300;
const ISOLATED_EVENTS = ["pointerdown", "mousedown", "mouseup", "dblclick", "wheel"];
app.registerExtension({
  name: "Duffy.InteractiveOverlayCompositor.Vue",
  async nodeCreated(node) {
    var _a, _b, _c;
    if (node.comfyClass !== NODE_CLASS) return;
    const findWidget = (name) => {
      var _a2;
      return (_a2 = node.widgets) == null ? void 0 : _a2.find((w) => w.name === name);
    };
    const stateWidget = findWidget("transform_state");
    const blendWidget = findWidget("blend_mode");
    const opacityWidget = findWidget("opacity");
    if (stateWidget) {
      stateWidget.type = "hidden";
      stateWidget.hidden = true;
      stateWidget.computeSize = () => [0, -4];
      stateWidget.draw = () => {
      };
    }
    const container = document.createElement("div");
    container.className = "duffy-interactive-overlay-container";
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; position:relative; isolation:isolate;";
    for (const type of ISOLATED_EVENTS) {
      container.addEventListener(type, (event) => event.stopPropagation());
    }
    container.addEventListener("contextmenu", (event) => {
      var _a2, _b2;
      event.preventDefault();
      event.stopPropagation();
      (_b2 = (_a2 = app.canvas) == null ? void 0 : _a2.processContextMenu) == null ? void 0 : _b2.call(_a2, node, event);
    });
    const writeState = (json) => {
      var _a2;
      if (!stateWidget) return;
      stateWidget.value = json;
      (_a2 = node.setDirtyCanvas) == null ? void 0 : _a2.call(node, true, true);
    };
    const vueApp = createApp(InteractiveOverlay, {
      getNodeId: () => String(node.id),
      getAppearance: () => ({
        blend: String((blendWidget == null ? void 0 : blendWidget.value) ?? "normal"),
        opacity: Number((opacityWidget == null ? void 0 : opacityWidget.value) ?? 1)
      }),
      onStateChange: writeState
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("interactive_overlay_ui", "custom", container, {
      serialize: false,
      hideOnZoom: false,
      getMinHeight: () => MIN_WIDGET_HEIGHT
    });
    domWidget.content = container;
    const syncAppearance = () => {
      var _a2;
      return (_a2 = instance.setAppearance) == null ? void 0 : _a2.call(instance, String((blendWidget == null ? void 0 : blendWidget.value) ?? "normal"), Number((opacityWidget == null ? void 0 : opacityWidget.value) ?? 1));
    };
    for (const widget of [blendWidget, opacityWidget]) {
      if (!widget) continue;
      const original = widget.callback;
      widget.callback = function(...args) {
        const result = original == null ? void 0 : original.apply(this, args);
        syncAppearance();
        return result;
      };
    }
    if (!node.size || node.size[0] < DEFAULT_SIZE[0] || node.size[1] < DEFAULT_SIZE[1]) {
      (_c = node.setSize) == null ? void 0 : _c.call(node, [Math.max(((_a = node.size) == null ? void 0 : _a[0]) ?? 0, DEFAULT_SIZE[0]), Math.max(((_b = node.size) == null ? void 0 : _b[1]) ?? 0, DEFAULT_SIZE[1])]);
    }
    const originalExecuted = node.onExecuted;
    node.onExecuted = function(message) {
      var _a2, _b2, _c2;
      originalExecuted == null ? void 0 : originalExecuted.apply(this, arguments);
      const result = (_a2 = message == null ? void 0 : message.overlay_result) == null ? void 0 : _a2[0];
      if (result == null ? void 0 : result.filename) {
        const params = new URLSearchParams({
          filename: String(result.filename),
          subfolder: String(result.subfolder ?? ""),
          type: String(result.type ?? "temp"),
          rand: String(Math.random()).slice(2, 10)
        });
        (_b2 = instance.setResult) == null ? void 0 : _b2.call(instance, api.apiURL(`/view?${params.toString()}`));
      }
      const savedState = (_c2 = message == null ? void 0 : message.overlay_state) == null ? void 0 : _c2[0];
      if (typeof savedState === "string" && savedState.length < 8192) writeState(savedState);
    };
    const originalRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      (_a2 = instance.cleanup) == null ? void 0 : _a2.call(instance);
      vueApp.unmount();
      originalRemoved == null ? void 0 : originalRemoved.apply(this, arguments);
    };
  }
});
