/**
 * Pure transform math for the Interactive Overlay Compositor.
 *
 * Mirrors `nodes/interactive_overlay_math.py` one-to-one and is pinned by
 * `tests/fixtures/overlay_transform_cases.json`. All geometry here is expressed in
 * *native background pixel space* (screen convention, y axis down).
 *
 * Forward mapping (overlay pixel p_o -> background pixel p_b):
 *   p_b = T + R(theta) · S · (p_o - A),   R = [[cos, sin], [-sin, cos]]
 * so positive rotation_deg turns the overlay counter-clockwise on screen.
 */

export type Vec2 = [number, number];

export interface OverlayState {
  version?: number;
  translation_norm: Vec2;
  scale_factors: Vec2;
  rotation_deg: number;
  anchor_point: Vec2;
  input_signature?: string;
}

export interface Size {
  w: number;
  h: number;
}

/** CSS-compatible affine matrix: x' = a·x + c·y + e,  y' = b·x + d·y + f */
export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const MIN_SCALE = 0.01;
export const MAX_SCALE = 100;
export const ANCHOR_MIN = -1;
export const ANCHOR_MAX = 2;
export const SNAP_SCREEN_PX = 5;
export const ROTATION_STEP_DEG = 15;
export const DEFAULT_FIT_RATIO = 0.5;

const DEG = Math.PI / 180;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function cloneState(s: OverlayState): OverlayState {
  return {
    version: 1,
    translation_norm: [s.translation_norm[0], s.translation_norm[1]],
    scale_factors: [s.scale_factors[0], s.scale_factors[1]],
    rotation_deg: s.rotation_deg,
    anchor_point: [s.anchor_point[0], s.anchor_point[1]],
    ...(s.input_signature ? { input_signature: s.input_signature } : {}),
  };
}

export function defaultScale(bg: Size, ov: Size): number {
  if (bg.w <= 0 || bg.h <= 0 || ov.w <= 0 || ov.h <= 0) return 1;
  return Math.max(MIN_SCALE, Math.min((DEFAULT_FIT_RATIO * bg.w) / ov.w, (DEFAULT_FIT_RATIO * bg.h) / ov.h, 1));
}

export function defaultState(bg: Size, ov: Size): OverlayState {
  const s = defaultScale(bg, ov);
  return { version: 1, translation_norm: [0.5, 0.5], scale_factors: [s, s], rotation_deg: 0, anchor_point: [0.5, 0.5] };
}

/** Normalize rotation into [-180, 180). */
export function wrapDeg(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

function clampScale(value: number, sign: number): number {
  const s = sign < 0 ? -1 : 1;
  return s * clamp(Math.abs(value), MIN_SCALE, MAX_SCALE);
}

// ---------------------------------------------------------------------------
// Viewport fitting
// ---------------------------------------------------------------------------

export interface ViewportFit {
  s: number;
  Wd: number;
  Hd: number;
  ox: number;
  oy: number;
}

/** Aspect-fit the full background into the viewport with symmetric letterboxing. */
export function fitViewport(W: number, H: number, Wv: number, Hv: number): ViewportFit {
  if (W <= 0 || H <= 0 || Wv <= 0 || Hv <= 0) return { s: 1, Wd: 0, Hd: 0, ox: 0, oy: 0 };
  const s = Math.min(Wv / W, Hv / H);
  const Wd = W * s;
  const Hd = H * s;
  return { s, Wd, Hd, ox: (Wv - Wd) / 2, oy: (Hv - Hd) / 2 };
}

export function displayToNative(p: Vec2, fit: ViewportFit): Vec2 {
  return [(p[0] - fit.ox) / fit.s, (p[1] - fit.oy) / fit.s];
}

export function nativeToDisplay(p: Vec2, fit: ViewportFit): Vec2 {
  return [p[0] * fit.s + fit.ox, p[1] * fit.s + fit.oy];
}

export const toNormalized = (p: Vec2, bg: Size): Vec2 => [p[0] / bg.w, p[1] / bg.h];
export const fromNormalized = (p: Vec2, bg: Size): Vec2 => [p[0] * bg.w, p[1] * bg.h];

// ---------------------------------------------------------------------------
// Matrices
// ---------------------------------------------------------------------------

export function forwardMatrix(state: OverlayState, bg: Size, ov: Size): Affine {
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

export function apply(m: Affine, p: Vec2): Vec2 {
  return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f];
}

export function invert(m: Affine): Affine {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) throw new Error("Singular overlay matrix");
  const a = m.d / det;
  const b = -m.b / det;
  const c = -m.c / det;
  const d = m.a / det;
  return { a, b, c, d, e: -(a * m.e + c * m.f), f: -(b * m.e + d * m.f) };
}

export function cssMatrix(m: Affine): string {
  return `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`;
}

/** Corners TL, TR, BR, BL in background pixels. */
export function corners(state: OverlayState, bg: Size, ov: Size): Vec2[] {
  const m = forwardMatrix(state, bg, ov);
  return ([[0, 0], [ov.w, 0], [ov.w, ov.h], [0, ov.h]] as Vec2[]).map((p) => apply(m, p));
}

/** Rotate a background-space vector into the overlay's (unscaled) local axes. */
function toLocalAxes(v: Vec2, deg: number): Vec2 {
  const th = deg * DEG;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  // R^-1 = [[cos, -sin], [sin, cos]]
  return [cos * v[0] - sin * v[1], sin * v[0] + cos * v[1]];
}

/** Rotate an overlay-local vector into background axes. */
export function toBgAxes(v: Vec2, deg: number): Vec2 {
  const th = deg * DEG;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  return [cos * v[0] + sin * v[1], -sin * v[0] + cos * v[1]];
}

// ---------------------------------------------------------------------------
// Drag solvers. Each takes the state at drag start (s0), the pointer at drag
// start (p0) and the current pointer (p), all in background pixels.
// ---------------------------------------------------------------------------

export function translate(
  s0: OverlayState, p0: Vec2, p: Vec2, bg: Size, opts: { snap: boolean; snapThresholdPx: number },
): OverlayState {
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

function anchorBg(s: OverlayState, bg: Size): Vec2 {
  return [s.translation_norm[0] * bg.w, s.translation_norm[1] * bg.h];
}

function localFromPointer(s0: OverlayState, p: Vec2, bg: Size): Vec2 {
  const T = anchorBg(s0, bg);
  return toLocalAxes([p[0] - T[0], p[1] - T[1]], s0.rotation_deg);
}

const SAFE = 1e-6;

/** Corner handle: uniform scaling around the anchor; `free` (Shift) scales each axis independently. */
export function scaleCorner(s0: OverlayState, p0: Vec2, p: Vec2, bg: Size, free: boolean): OverlayState {
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

/** Edge handle: single-axis scaling along the overlay's local axis. */
export function scaleEdge(s0: OverlayState, p0: Vec2, p: Vec2, bg: Size, axis: "x" | "y"): OverlayState {
  const out = cloneState(s0);
  const l0 = localFromPointer(s0, p0, bg);
  const l = localFromPointer(s0, p, bg);
  const i = axis === "x" ? 0 : 1;
  const k = Math.abs(l0[i]) > SAFE ? Math.max(l[i] / l0[i], 0) : 1;
  const next: Vec2 = [s0.scale_factors[0], s0.scale_factors[1]];
  next[i] = clampScale(s0.scale_factors[i] * k, s0.scale_factors[i]);
  out.scale_factors = next;
  return out;
}

/** Rotation handle: rotate around the anchor; `step` (Shift) snaps to 15° increments. */
export function rotate(s0: OverlayState, p0: Vec2, p: Vec2, bg: Size, step: boolean): OverlayState {
  const out = cloneState(s0);
  const T = anchorBg(s0, bg);
  const a0 = Math.atan2(p0[1] - T[1], p0[0] - T[0]);
  const a1 = Math.atan2(p[1] - T[1], p[0] - T[0]);
  // In y-down coordinates a CCW screen rotation decreases atan2.
  let deg = s0.rotation_deg - (a1 - a0) / DEG;
  if (step) deg = Math.round(deg / ROTATION_STEP_DEG) * ROTATION_STEP_DEG;
  out.rotation_deg = wrapDeg(deg);
  return out;
}

/** Move the pivot to the pointer without moving the overlay on screen. */
export function moveAnchor(s0: OverlayState, p: Vec2, bg: Size, ov: Size): OverlayState {
  const inv = invert(forwardMatrix(s0, bg, ov));
  const po = apply(inv, p);
  const ax = clamp(po[0] / ov.w, ANCHOR_MIN, ANCHOR_MAX);
  const ay = clamp(po[1] / ov.h, ANCHOR_MIN, ANCHOR_MAX);
  return setAnchor(s0, [ax, ay], bg, ov);
}

/** Change the anchor while keeping the overlay visually fixed. */
export function setAnchor(s0: OverlayState, anchor: Vec2, bg: Size, ov: Size): OverlayState {
  const m = forwardMatrix(s0, bg, ov);
  const T = apply(m, [anchor[0] * ov.w, anchor[1] * ov.h]);
  const out = cloneState(s0);
  out.anchor_point = [anchor[0], anchor[1]];
  out.translation_norm = [T[0] / bg.w, T[1] / bg.h];
  return out;
}

/** Validate/normalize an untrusted state (e.g. from the hidden widget). */
export function coerceState(raw: unknown, fallback: OverlayState): OverlayState {
  if (!raw || typeof raw !== "object") return cloneState(fallback);
  const r = raw as Record<string, unknown>;
  const pair = (v: unknown, fb: Vec2): Vec2 =>
    Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n))
      ? [v[0] as number, v[1] as number]
      : [fb[0], fb[1]];
  const rot = typeof r.rotation_deg === "number" && Number.isFinite(r.rotation_deg) ? r.rotation_deg : fallback.rotation_deg;
  const scale = pair(r.scale_factors, fallback.scale_factors);
  const state: OverlayState = {
    version: 1,
    translation_norm: pair(r.translation_norm, fallback.translation_norm),
    scale_factors: [
      clampScale(scale[0] === 0 ? fallback.scale_factors[0] : scale[0], scale[0]),
      clampScale(scale[1] === 0 ? fallback.scale_factors[1] : scale[1], scale[1]),
    ],
    rotation_deg: wrapDeg(rot),
    anchor_point: pair(r.anchor_point, fallback.anchor_point).map((v) => clamp(v, ANCHOR_MIN, ANCHOR_MAX)) as Vec2,
  };
  if (typeof r.input_signature === "string") state.input_signature = r.input_signature;
  return state;
}
