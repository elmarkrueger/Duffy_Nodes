// Parity + invariant tests for src/utils/overlay_transform.ts.
// Run with: node tests/test_overlay_transform.mjs
// Uses the esbuild that ships with Vite to transpile the TS module on the fly.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { transformSync } from "esbuild";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "src", "utils", "overlay_transform.ts"), "utf8");
const { code } = transformSync(source, { loader: "ts", format: "esm" });
const dir = mkdtempSync(join(tmpdir(), "overlay-transform-"));
const modulePath = join(dir, "overlay_transform.mjs");
writeFileSync(modulePath, code);
const T = await import(pathToFileURL(modulePath).href);
rmSync(dir, { recursive: true, force: true });

const fixtures = JSON.parse(readFileSync(join(root, "tests", "fixtures", "overlay_transform_cases.json"), "utf8"));
let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}\n     ${error.message}`);
    process.exitCode = 1;
  }
};
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const base = (o = {}) => ({ translation_norm: [0.5, 0.5], scale_factors: [1, 1], rotation_deg: 0, anchor_point: [0.5, 0.5], ...o });
const size = (w, h) => ({ w, h });

for (const c of fixtures.cases) {
  test(`fixture corners: ${c.name}`, () => {
    const got = T.corners(c.state, size(...c.bg_size), size(...c.overlay_size));
    got.forEach((p, i) => {
      near(p[0], c.expected_corners_px[i][0], 1e-4, `corner ${i} x`);
      near(p[1], c.expected_corners_px[i][1], 1e-4, `corner ${i} y`);
    });
  });
}

test("fitViewport: 1MP, 4MP and widescreen fill with symmetric letterbox", () => {
  for (const [W, H] of [[1024, 1024], [2048, 2048], [2560, 1080]]) {
    const f = T.fitViewport(W, H, 512, 512);
    assert.ok(f.Wd <= 512 + 1e-9 && f.Hd <= 512 + 1e-9, "no clipping");
    near(f.Wd / f.Hd, W / H, 1e-9, "aspect preserved");
    near(f.ox * 2 + f.Wd, 512, 1e-9, "symmetric x");
    near(f.oy * 2 + f.Hd, 512, 1e-9, "symmetric y");
  }
  const a = T.fitViewport(1024, 1024, 512, 512);
  const b = T.fitViewport(2048, 2048, 512, 512);
  near(a.Wd, b.Wd, 1e-9, "1MP and 4MP frame identically");
});

test("display <-> native roundtrip", () => {
  const f = T.fitViewport(2560, 1080, 500, 400);
  const p = T.displayToNative(T.nativeToDisplay([1234.5, 777.25], f), f);
  near(p[0], 1234.5, 1e-9, "x");
  near(p[1], 777.25, 1e-9, "y");
});

test("invert(forwardMatrix) is an exact inverse", () => {
  const bg = size(1920, 800), ov = size(300, 120);
  const m = T.forwardMatrix(base({ rotation_deg: 37, scale_factors: [1.3, 0.7], anchor_point: [0.2, 0.9] }), bg, ov);
  const p = T.apply(T.invert(m), T.apply(m, [17, 99]));
  near(p[0], 17, 1e-9, "x");
  near(p[1], 99, 1e-9, "y");
});

test("translate snaps to center unless disabled", () => {
  const bg = size(1000, 500);
  const s0 = base({ translation_norm: [0.2, 0.2] });
  const snapped = T.translate(s0, [200, 100], [497, 248], bg, { snap: true, snapThresholdPx: 5 });
  assert.deepEqual(snapped.translation_norm, [0.5, 0.5]);
  const free = T.translate(s0, [200, 100], [497, 248], bg, { snap: false, snapThresholdPx: 5 });
  near(free.translation_norm[0], 0.497, 1e-9, "free x");
});

test("corner scaling is uniform, Shift is free; pivot stays put", () => {
  const bg = size(1000, 1000), ov = size(100, 100);
  const s0 = base();
  const uni = T.scaleCorner(s0, [550, 550], [600, 600], bg, false);
  near(uni.scale_factors[0], 2, 1e-9, "uniform sx");
  near(uni.scale_factors[1], 2, 1e-9, "uniform sy");
  const free = T.scaleCorner(s0, [550, 550], [600, 550], bg, true);
  near(free.scale_factors[0], 2, 1e-9, "free sx");
  near(free.scale_factors[1], 1, 1e-9, "free sy");
  assert.deepEqual(uni.translation_norm, s0.translation_norm);
  const tiny = T.scaleCorner(s0, [550, 550], [400, 400], bg, false);
  assert.ok(tiny.scale_factors[0] >= T.MIN_SCALE, "min scale clamp");
  void ov;
});

test("edge scaling only touches one local axis (also when rotated)", () => {
  const bg = size(1000, 1000);
  const s0 = base({ rotation_deg: 90 });
  // Rotated +90 (CCW): local +x points up on screen.
  const out = T.scaleEdge(s0, [500, 450], [500, 400], bg, "x");
  near(out.scale_factors[0], 2, 1e-9, "sx");
  near(out.scale_factors[1], 1, 1e-9, "sy");
});

test("rotation: dragging counter-clockwise on screen increases rotation_deg; Shift snaps", () => {
  const bg = size(1000, 1000);
  const s0 = base();
  // Start right of center, move to above center = 90° CCW on screen.
  const out = T.rotate(s0, [600, 500], [500, 400], bg, false);
  near(out.rotation_deg, 90, 1e-9, "ccw positive");
  const stepped = T.rotate(s0, [600, 500], [600, 470], bg, true);
  assert.equal(stepped.rotation_deg % 15, 0);
});

test("moving the anchor keeps the overlay visually fixed", () => {
  const bg = size(1600, 900), ov = size(400, 200);
  const s0 = base({ rotation_deg: 33, scale_factors: [1.2, 0.8] });
  const before = T.corners(s0, bg, ov);
  const moved = T.moveAnchor(s0, [700, 400], bg, ov);
  const after = T.corners(moved, bg, ov);
  before.forEach((p, i) => {
    near(after[i][0], p[0], 1e-6, `corner ${i} x`);
    near(after[i][1], p[1], 1e-6, `corner ${i} y`);
  });
  near(moved.translation_norm[0] * bg.w, 700, 1e-6, "anchor follows pointer x");
});

test("coerceState rejects garbage and clamps", () => {
  const fb = T.defaultState(size(1000, 1000), size(4000, 1000));
  near(fb.scale_factors[0], 0.125, 1e-12, "default fit 50%");
  const s = T.coerceState({ translation_norm: [NaN, 1], scale_factors: [1e9, 0], rotation_deg: 540, anchor_point: [9, -9] }, fb);
  assert.deepEqual(s.translation_norm, fb.translation_norm);
  assert.equal(s.scale_factors[0], T.MAX_SCALE);
  near(s.rotation_deg, -180, 1e-9, "wrapped");
  assert.deepEqual(s.anchor_point, [T.ANCHOR_MAX, T.ANCHOR_MIN]);
  assert.deepEqual(T.coerceState("nope", fb).translation_norm, fb.translation_norm);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
