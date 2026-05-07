import { app } from "../../../scripts/app.js";
import { d as defineComponent, b as ref, D as watch, f as onMounted, n as nextTick, q as onBeforeUnmount, o as openBlock, c as createElementBlock, k as withModifiers, a as createBaseVNode, t as toDisplayString, i as createCommentVNode, A as unref, j as normalizeClass, h as createTextVNode, w as withDirectives, v as vModelText, m as normalizeStyle, G as reactive, l as computed, _ as _export_sfc, E as createBlock, C as createVNode, T as Teleport, e as createApp } from "./_plugin-vue_export-helper-CusGlrPr.js";
const POINT_RADIUS = 6;
const HANDLE_SIZE = 8;
const POINT_COLOR_POSITIVE = "rgba(76, 175, 80, 0.85)";
const POINT_COLOR_NEGATIVE = "rgba(244, 67, 54, 0.85)";
const POINT_STROKE = "#fff";
const BBOX_STROKE = "rgba(33, 150, 243, 0.9)";
const BBOX_FILL = "rgba(33, 150, 243, 0.08)";
const HANDLE_FILL = "#fff";
const HANDLE_STROKE = "rgba(33, 150, 243, 0.9)";
const PREVIEW_COLOR = "rgba(255, 255, 255, 0.6)";
const ACTIVE_HIGHLIGHT = "rgba(255, 214, 64, 0.95)";
const HOVER_HIGHLIGHT = "rgba(150, 224, 255, 0.95)";
function screenToImage(screenX, screenY, t) {
  return {
    x: Math.round((screenX - t.offsetX) / t.scale),
    y: Math.round((screenY - t.offsetY) / t.scale)
  };
}
function imageToScreen(imgX, imgY, t) {
  return {
    x: imgX * t.scale + t.offsetX,
    y: imgY * t.scale + t.offsetY
  };
}
function clampToImage(x, y, imgW, imgH) {
  return {
    x: Math.max(0, Math.min(imgW - 1, x)),
    y: Math.max(0, Math.min(imgH - 1, y))
  };
}
function fitTransform(imgW, imgH, canvasW, canvasH) {
  const scaleX = canvasW / imgW;
  const scaleY = canvasH / imgH;
  const scale = Math.min(scaleX, scaleY, 1);
  const offsetX = (canvasW - imgW * scale) / 2;
  const offsetY = (canvasH - imgH * scale) / 2;
  return { offsetX, offsetY, scale };
}
function renderImageOnPrimary(ctx, img, t, canvasW, canvasH, imageW, imageH) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.drawImage(
    img,
    t.offsetX,
    t.offsetY,
    imageW * t.scale,
    imageH * t.scale
  );
}
function renderOverlay(ctx, points, bboxes, previewBox, t, canvasW, canvasH) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  for (const bbox of bboxes) {
    drawBBox(ctx, bbox, t);
  }
  for (const pt of points) {
    drawPoint(ctx, pt, t);
  }
  if (previewBox) {
    drawPreviewBox(ctx, previewBox, t);
  }
}
function renderInteractionHighlights(ctx, points, bboxes, t, state) {
  const selectedPoint = typeof state.selectedPointIndex === "number" && state.selectedPointIndex >= 0 && state.selectedPointIndex < points.length ? state.selectedPointIndex : null;
  const selectedBBox = typeof state.selectedBBoxIndex === "number" && state.selectedBBoxIndex >= 0 && state.selectedBBoxIndex < bboxes.length ? state.selectedBBoxIndex : null;
  const hoveredPoint = state.hoveredType === "point" && typeof state.hoveredIndex === "number" && state.hoveredIndex >= 0 && state.hoveredIndex < points.length ? state.hoveredIndex : null;
  const hoveredBBox = (state.hoveredType === "bbox_corner" || state.hoveredType === "bbox_area") && typeof state.hoveredIndex === "number" && state.hoveredIndex >= 0 && state.hoveredIndex < bboxes.length ? state.hoveredIndex : null;
  if (selectedBBox !== null) {
    drawBBoxHighlight(ctx, bboxes[selectedBBox], t, ACTIVE_HIGHLIGHT, 3, false);
  }
  if (selectedPoint !== null) {
    drawPointHighlight(ctx, points[selectedPoint], t, ACTIVE_HIGHLIGHT, false);
  }
  if (hoveredBBox !== null && hoveredBBox !== selectedBBox) {
    drawBBoxHighlight(ctx, bboxes[hoveredBBox], t, HOVER_HIGHLIGHT, 2, true);
  }
  if (hoveredPoint !== null && hoveredPoint !== selectedPoint) {
    drawPointHighlight(ctx, points[hoveredPoint], t, HOVER_HIGHLIGHT, true);
  }
  if (state.hoveredType === "bbox_corner" && hoveredBBox !== null && typeof state.hoveredCorner === "number" && state.hoveredCorner >= 0 && state.hoveredCorner <= 3) {
    drawCornerHighlight(
      ctx,
      bboxes[hoveredBBox],
      t,
      state.hoveredCorner,
      hoveredBBox === selectedBBox ? ACTIVE_HIGHLIGHT : HOVER_HIGHLIGHT
    );
  }
}
function drawPointHighlight(ctx, pt, t, color, dashed) {
  const { x, y } = imageToScreen(pt.x, pt.y, t);
  const ring = Math.max(6, POINT_RADIUS * t.scale + 4);
  ctx.beginPath();
  ctx.arc(x, y, ring, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([4, 3]);
  ctx.stroke();
  if (dashed) ctx.setLineDash([]);
}
function drawBBoxHighlight(ctx, box, t, color, lineWidth, dashed) {
  const p0 = imageToScreen(box.x0, box.y0, t);
  const p1 = imageToScreen(box.x1, box.y1, t);
  const minX = Math.min(p0.x, p1.x);
  const minY = Math.min(p0.y, p1.y);
  const w = Math.abs(p1.x - p0.x);
  const h = Math.abs(p1.y - p0.y);
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(minX, minY, w, h);
  if (dashed) ctx.setLineDash([]);
}
function drawCornerHighlight(ctx, box, t, corner, color) {
  const corners = getCanvasBBoxCorners(box);
  const c = corners[corner];
  const p = imageToScreen(c.x, c.y, t);
  const size = Math.max(9, HANDLE_SIZE * t.scale + 3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
}
function drawPoint(ctx, pt, t) {
  const { x, y } = imageToScreen(pt.x, pt.y, t);
  const r = POINT_RADIUS * t.scale;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = pt.type === "negative" ? POINT_COLOR_NEGATIVE : POINT_COLOR_POSITIVE;
  ctx.fill();
  ctx.strokeStyle = POINT_STROKE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 1.6, y);
  ctx.lineTo(x + r * 1.6, y);
  ctx.moveTo(x, y - r * 1.6);
  ctx.lineTo(x, y + r * 1.6);
  ctx.strokeStyle = POINT_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function drawBBox(ctx, box, t) {
  const p0 = imageToScreen(box.x0, box.y0, t);
  const p1 = imageToScreen(box.x1, box.y1, t);
  const w = p1.x - p0.x;
  const h = p1.y - p0.y;
  ctx.fillStyle = BBOX_FILL;
  ctx.fillRect(p0.x, p0.y, w, h);
  ctx.strokeStyle = BBOX_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(p0.x, p0.y, w, h);
  const hs = HANDLE_SIZE * t.scale;
  const corners = [
    { x: p0.x, y: p0.y },
    { x: p1.x, y: p0.y },
    { x: p0.x, y: p1.y },
    { x: p1.x, y: p1.y }
  ];
  for (const c of corners) {
    ctx.fillStyle = HANDLE_FILL;
    ctx.fillRect(c.x - hs / 2, c.y - hs / 2, hs, hs);
    ctx.strokeStyle = HANDLE_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x - hs / 2, c.y - hs / 2, hs, hs);
  }
}
function drawPreviewBox(ctx, box, t) {
  const p0 = imageToScreen(box.x0, box.y0, t);
  const p1 = imageToScreen(box.x1, box.y1, t);
  const w = p1.x - p0.x;
  const h = p1.y - p0.y;
  ctx.strokeStyle = PREVIEW_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(p0.x, p0.y, w, h);
  ctx.setLineDash([]);
}
function getCanvasBBoxCorners(box) {
  return [
    { x: box.x0, y: box.y0 },
    { x: box.x1, y: box.y0 },
    { x: box.x0, y: box.y1 },
    { x: box.x1, y: box.y1 }
  ];
}
function setupHiDPICanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return ctx;
}
var EditorState = /* @__PURE__ */ ((EditorState2) => {
  EditorState2["IDLE"] = "IDLE";
  EditorState2["DRAW_POINT"] = "DRAW_POINT";
  EditorState2["DRAW_BBOX_START"] = "DRAW_BBOX_START";
  EditorState2["DRAW_BBOX_DRAG"] = "DRAW_BBOX_DRAG";
  EditorState2["EDIT_POINT_DRAG"] = "EDIT_POINT_DRAG";
  EditorState2["RESIZE_BBOX"] = "RESIZE_BBOX";
  EditorState2["TRANSLATE_BBOX"] = "TRANSLATE_BBOX";
  return EditorState2;
})(EditorState || {});
var ToolMode = /* @__PURE__ */ ((ToolMode2) => {
  ToolMode2["SELECT"] = "SELECT";
  ToolMode2["POINT"] = "POINT";
  ToolMode2["POINT_NEGATIVE"] = "POINT_NEGATIVE";
  ToolMode2["BOX"] = "BOX";
  return ToolMode2;
})(ToolMode || {});
let _idCounter = 0;
function newId() {
  return `ann_${Date.now()}_${++_idCounter}`;
}
const HIT_THRESHOLD_SCREEN = 20;
const MIN_BBOX_DRAG_SCREEN = 4;
function euclidean(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
class EditorStateMachine {
  constructor() {
    this.state = "IDLE";
    this.tool = "SELECT";
    this.selectedPointIndex = null;
    this.selectedBBoxIndex = null;
    this.activeCorner = null;
    this.dragStartScreen = null;
    this.dragStartPointImg = null;
    this.bboxStartImg = null;
    this.bboxCurrentImg = null;
    this.createdPoint = null;
    this.createdBBox = null;
    this.lastSelected = null;
  }
  reset() {
    this.state = "IDLE";
    this.selectedPointIndex = null;
    this.selectedBBoxIndex = null;
    this.activeCorner = null;
    this.dragStartScreen = null;
    this.dragStartPointImg = null;
    this.bboxStartImg = null;
    this.bboxCurrentImg = null;
    this.createdPoint = null;
    this.createdBBox = null;
    this.lastSelected = null;
  }
  selectPoint(index) {
    this.selectedPointIndex = index;
    this.selectedBBoxIndex = null;
    this.lastSelected = { type: "point", index };
  }
  selectBBox(index) {
    this.selectedBBoxIndex = index;
    this.selectedPointIndex = null;
    this.lastSelected = { type: "bbox", index };
  }
  isValidPointIndex(index, points) {
    return index !== null && index >= 0 && index < points.length;
  }
  isValidBBoxIndex(index, bboxes) {
    return index !== null && index >= 0 && index < bboxes.length;
  }
  clearSelection() {
    this.selectedPointIndex = null;
    this.selectedBBoxIndex = null;
  }
  resolveSelectedTarget(points, bboxes) {
    var _a;
    const selectedPointIndex = this.selectedPointIndex;
    const selectedBBoxIndex = this.selectedBBoxIndex;
    const hasPoint = this.isValidPointIndex(selectedPointIndex, points);
    const hasBBox = this.isValidBBoxIndex(selectedBBoxIndex, bboxes);
    if (hasPoint && hasBBox) {
      if (((_a = this.lastSelected) == null ? void 0 : _a.type) === "bbox" && this.lastSelected.index === selectedBBoxIndex) {
        return { type: "bbox", index: selectedBBoxIndex };
      }
      return { type: "point", index: selectedPointIndex };
    }
    if (hasPoint) {
      return { type: "point", index: selectedPointIndex };
    }
    if (hasBBox) {
      return { type: "bbox", index: selectedBBoxIndex };
    }
    this.clearSelection();
    return null;
  }
  resolveHoveredTarget(hovered, points, bboxes) {
    if (!hovered) return null;
    if (hovered.type === "point" && this.isValidPointIndex(hovered.index, points)) {
      return { type: "point", index: hovered.index };
    }
    if ((hovered.type === "bbox_corner" || hovered.type === "bbox_area") && this.isValidBBoxIndex(hovered.index, bboxes)) {
      return { type: "bbox", index: hovered.index };
    }
    return null;
  }
  resolveLastSelectedTarget(points, bboxes) {
    if (!this.lastSelected) return null;
    if (this.lastSelected.type === "point" && this.isValidPointIndex(this.lastSelected.index, points)) {
      return this.lastSelected;
    }
    if (this.lastSelected.type === "bbox" && this.isValidBBoxIndex(this.lastSelected.index, bboxes)) {
      return this.lastSelected;
    }
    this.lastSelected = null;
    return null;
  }
  handlePointerDown(screenX, screenY, points, bboxes, transform) {
    this.createdPoint = null;
    this.createdBBox = null;
    if (this.tool === "POINT" || this.tool === "POINT_NEGATIVE") {
      const coords = screenToImage(screenX, screenY, transform);
      this.createdPoint = {
        x: coords.x,
        y: coords.y,
        id: newId(),
        type: this.tool === "POINT_NEGATIVE" ? "negative" : "positive"
      };
      this.state = "IDLE";
      return;
    }
    if (this.tool === "BOX") {
      const boxHit = hitTest(screenX, screenY, [], bboxes, transform);
      if (boxHit.type === "bbox_corner") {
        this.selectBBox(boxHit.index);
        this.activeCorner = boxHit.corner ?? null;
        this.dragStartScreen = { x: screenX, y: screenY };
        this.state = "RESIZE_BBOX";
        return;
      }
      if (boxHit.type === "bbox_area") {
        this.selectBBox(boxHit.index);
        this.dragStartScreen = { x: screenX, y: screenY };
        const box = bboxes[boxHit.index];
        this.dragStartPointImg = { x: box.x0, y: box.y0 };
        this.state = "TRANSLATE_BBOX";
        return;
      }
      const coords = screenToImage(screenX, screenY, transform);
      this.bboxStartImg = coords;
      this.bboxCurrentImg = coords;
      this.dragStartScreen = { x: screenX, y: screenY };
      this.state = "DRAW_BBOX_START";
      return;
    }
    const hit = hitTest(screenX, screenY, points, bboxes, transform);
    if (hit.type === "point") {
      this.selectPoint(hit.index);
      this.dragStartScreen = { x: screenX, y: screenY };
      this.dragStartPointImg = {
        x: points[hit.index].x,
        y: points[hit.index].y
      };
      this.state = "EDIT_POINT_DRAG";
      return;
    }
    if (hit.type === "bbox_corner") {
      this.selectBBox(hit.index);
      this.activeCorner = hit.corner ?? null;
      this.dragStartScreen = { x: screenX, y: screenY };
      this.state = "RESIZE_BBOX";
      return;
    }
    if (hit.type === "bbox_area") {
      this.selectBBox(hit.index);
      this.dragStartScreen = { x: screenX, y: screenY };
      const box = bboxes[hit.index];
      this.dragStartPointImg = { x: box.x0, y: box.y0 };
      this.state = "TRANSLATE_BBOX";
      return;
    }
    this.clearSelection();
    this.state = "IDLE";
  }
  handlePointerMove(screenX, screenY, imgW, imgH, points, bboxes, transform) {
    if (this.state === "DRAW_BBOX_START" || this.state === "DRAW_BBOX_DRAG") {
      this.state = "DRAW_BBOX_DRAG";
      this.bboxCurrentImg = screenToImage(screenX, screenY, transform);
      return;
    }
    if (this.state === "EDIT_POINT_DRAG" && this.selectedPointIndex !== null && this.dragStartScreen) {
      const deltaX = screenX - this.dragStartScreen.x;
      const deltaY = screenY - this.dragStartScreen.y;
      const dx = deltaX / transform.scale;
      const dy = deltaY / transform.scale;
      const start = this.dragStartPointImg;
      points[this.selectedPointIndex].x = Math.round(
        Math.max(0, Math.min(imgW - 1, start.x + dx))
      );
      points[this.selectedPointIndex].y = Math.round(
        Math.max(0, Math.min(imgH - 1, start.y + dy))
      );
      return;
    }
    if (this.state === "RESIZE_BBOX" && this.selectedBBoxIndex !== null && this.activeCorner !== null) {
      const coords = screenToImage(screenX, screenY, transform);
      const cx = Math.max(0, Math.min(imgW - 1, coords.x));
      const cy = Math.max(0, Math.min(imgH - 1, coords.y));
      const box = bboxes[this.selectedBBoxIndex];
      const c = this.activeCorner;
      if (c === 0) {
        box.x0 = cx;
        box.y0 = cy;
      } else if (c === 1) {
        box.x1 = cx;
        box.y0 = cy;
      } else if (c === 2) {
        box.x0 = cx;
        box.y1 = cy;
      } else if (c === 3) {
        box.x1 = cx;
        box.y1 = cy;
      }
      return;
    }
    if (this.state === "TRANSLATE_BBOX" && this.selectedBBoxIndex !== null && this.dragStartScreen && this.dragStartPointImg) {
      const deltaX = screenX - this.dragStartScreen.x;
      const deltaY = screenY - this.dragStartScreen.y;
      const dImgX = Math.round(deltaX / transform.scale);
      const dImgY = Math.round(deltaY / transform.scale);
      const box = bboxes[this.selectedBBoxIndex];
      const bw = box.x1 - box.x0;
      const bh = box.y1 - box.y0;
      let nx0 = this.dragStartPointImg.x + dImgX;
      let ny0 = this.dragStartPointImg.y + dImgY;
      nx0 = Math.max(0, Math.min(imgW - bw, nx0));
      ny0 = Math.max(0, Math.min(imgH - bh, ny0));
      box.x0 = nx0;
      box.y0 = ny0;
      box.x1 = nx0 + bw;
      box.y1 = ny0 + bh;
    }
  }
  handlePointerUp(screenX, screenY, transform, points, bboxes, imgW, imgH) {
    var _a, _b;
    const result = {};
    if (this.state === "DRAW_BBOX_DRAG" && this.bboxStartImg && this.bboxCurrentImg) {
      if (this.dragStartScreen) {
        const dragDistance = euclidean(
          { x: screenX, y: screenY },
          this.dragStartScreen
        );
        if (dragDistance < MIN_BBOX_DRAG_SCREEN) {
          this.bboxStartImg = null;
          this.bboxCurrentImg = null;
          this.dragStartScreen = null;
          this.state = "IDLE";
          return null;
        }
      }
      const final = this.bboxCurrentImg;
      const x0 = Math.min(this.bboxStartImg.x, final.x);
      const y0 = Math.min(this.bboxStartImg.y, final.y);
      const x1 = Math.max(this.bboxStartImg.x, final.x);
      const y1 = Math.max(this.bboxStartImg.y, final.y);
      const clamped0 = clampToImage(x0, y0, imgW, imgH);
      const clamped1 = clampToImage(x1, y1, imgW, imgH);
      if (clamped1.x <= clamped0.x || clamped1.y <= clamped0.y) {
        this.bboxStartImg = null;
        this.bboxCurrentImg = null;
        this.dragStartScreen = null;
        this.state = "IDLE";
        return null;
      }
      this.createdBBox = {
        x0: clamped0.x,
        y0: clamped0.y,
        x1: clamped1.x,
        y1: clamped1.y,
        id: newId()
      };
      result.bboxCreated = this.createdBBox;
      this.bboxStartImg = null;
      this.bboxCurrentImg = null;
      this.dragStartScreen = null;
      this.state = "IDLE";
      return result;
    }
    if (this.state === "DRAW_BBOX_START") {
      this.bboxStartImg = null;
      this.bboxCurrentImg = null;
      this.dragStartScreen = null;
      this.state = "IDLE";
      return null;
    }
    if (this.state === "EDIT_POINT_DRAG" && this.selectedPointIndex !== null && this.dragStartPointImg) {
      const deltaX = screenX - (((_a = this.dragStartScreen) == null ? void 0 : _a.x) ?? screenX);
      const deltaY = screenY - (((_b = this.dragStartScreen) == null ? void 0 : _b.y) ?? screenY);
      const newImgX = this.dragStartPointImg.x + deltaX / transform.scale;
      const newImgY = this.dragStartPointImg.y + deltaY / transform.scale;
      const clamped = clampToImage(Math.round(newImgX), Math.round(newImgY), imgW, imgH);
      points[this.selectedPointIndex].x = clamped.x;
      points[this.selectedPointIndex].y = clamped.y;
      this.lastSelected = { type: "point", index: this.selectedPointIndex };
      result.pointMoved = { index: this.selectedPointIndex, x: clamped.x, y: clamped.y };
      this.dragStartScreen = null;
      this.dragStartPointImg = null;
      this.state = "IDLE";
      return result;
    }
    if (this.state === "RESIZE_BBOX" && this.selectedBBoxIndex !== null && this.activeCorner !== null) {
      const box = bboxes[this.selectedBBoxIndex];
      const x0 = Math.min(box.x0, box.x1);
      const y0 = Math.min(box.y0, box.y1);
      const x1 = Math.max(box.x0, box.x1);
      const y1 = Math.max(box.y0, box.y1);
      box.x0 = x0;
      box.y0 = y0;
      box.x1 = x1;
      box.y1 = y1;
      this.lastSelected = { type: "bbox", index: this.selectedBBoxIndex };
      result.bboxMoved = { index: this.selectedBBoxIndex, x0, y0, x1, y1 };
      this.state = "IDLE";
      return result;
    }
    if (this.state === "TRANSLATE_BBOX" && this.selectedBBoxIndex !== null && this.dragStartPointImg) {
      const box = bboxes[this.selectedBBoxIndex];
      this.lastSelected = { type: "bbox", index: this.selectedBBoxIndex };
      result.bboxMoved = { index: this.selectedBBoxIndex, x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1 };
      this.dragStartScreen = null;
      this.dragStartPointImg = null;
      this.state = "IDLE";
      return result;
    }
    this.state = "IDLE";
    return null;
  }
  setTool(tool) {
    this.tool = tool;
    this.state = "IDLE";
    this.bboxStartImg = null;
    this.bboxCurrentImg = null;
    this.createdPoint = null;
    this.activeCorner = null;
    this.dragStartScreen = null;
    this.dragStartPointImg = null;
  }
  deleteSelected(points, bboxes, hovered) {
    const selectedTarget = this.resolveSelectedTarget(points, bboxes);
    const hoveredTarget = this.resolveHoveredTarget(hovered, points, bboxes);
    const lastSelectedTarget = this.resolveLastSelectedTarget(points, bboxes);
    const target = selectedTarget ?? hoveredTarget ?? lastSelectedTarget;
    if (!target) {
      return null;
    }
    this.state = "IDLE";
    this.clearSelection();
    if (target.type === "point") {
      this.lastSelected = null;
      return { pointIndex: target.index };
    }
    this.lastSelected = null;
    return { bboxIndex: target.index };
  }
  cancel() {
    this.state = "IDLE";
    this.bboxStartImg = null;
    this.bboxCurrentImg = null;
    this.createdPoint = null;
    this.createdBBox = null;
    this.activeCorner = null;
    this.dragStartScreen = null;
    this.dragStartPointImg = null;
  }
  getPreviewBox() {
    if ((this.state === "DRAW_BBOX_START" || this.state === "DRAW_BBOX_DRAG") && this.bboxStartImg) {
      const cur = this.bboxCurrentImg ?? this.bboxStartImg;
      return {
        x0: Math.min(this.bboxStartImg.x, cur.x),
        y0: Math.min(this.bboxStartImg.y, cur.y),
        x1: Math.max(this.bboxStartImg.x, cur.x),
        y1: Math.max(this.bboxStartImg.y, cur.y),
        id: "preview"
      };
    }
    return null;
  }
  consumeCreatedPoint() {
    const pt = this.createdPoint;
    this.createdPoint = null;
    return pt;
  }
  consumeCreatedBBox() {
    const box = this.createdBBox;
    this.createdBBox = null;
    return box;
  }
  getHovered(screenX, screenY, points, bboxes, transform) {
    if (this.state !== "IDLE") {
      return { type: "none", index: -1 };
    }
    return hitTest(screenX, screenY, points, bboxes, transform);
  }
}
function hitTest(screenX, screenY, points, bboxes, t) {
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    const scr = { x: p.x * t.scale + t.offsetX, y: p.y * t.scale + t.offsetY };
    if (euclidean({ x: screenX, y: screenY }, scr) <= HIT_THRESHOLD_SCREEN) {
      return { type: "point", index: i };
    }
  }
  for (let i = bboxes.length - 1; i >= 0; i--) {
    const box = bboxes[i];
    const corners = getCanvasBBoxCorners(box);
    for (let c = 0; c < 4; c++) {
      const scr = {
        x: corners[c].x * t.scale + t.offsetX,
        y: corners[c].y * t.scale + t.offsetY
      };
      if (euclidean({ x: screenX, y: screenY }, scr) <= HIT_THRESHOLD_SCREEN) {
        return { type: "bbox_corner", index: i, corner: c };
      }
    }
  }
  for (let i = bboxes.length - 1; i >= 0; i--) {
    const box = bboxes[i];
    const p0 = { x: box.x0 * t.scale + t.offsetX, y: box.y0 * t.scale + t.offsetY };
    const p1 = { x: box.x1 * t.scale + t.offsetX, y: box.y1 * t.scale + t.offsetY };
    const minX = Math.min(p0.x, p1.x);
    const maxX = Math.max(p0.x, p1.x);
    const minY = Math.min(p0.y, p1.y);
    const maxY = Math.max(p0.y, p1.y);
    if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
      return { type: "bbox_area", index: i };
    }
  }
  return { type: "none", index: -1 };
}
const _hoisted_1$1 = { class: "sam3-modal-header" };
const _hoisted_2$1 = {
  key: 0,
  class: "sam3-dims"
};
const _hoisted_3$1 = { class: "sam3-toolbar" };
const _hoisted_4$1 = {
  key: 0,
  class: "sam3-resize-controls"
};
const _hoisted_5 = { class: "sam3-resize-field" };
const _hoisted_6 = { class: "sam3-resize-field" };
const _hoisted_7 = {
  key: 0,
  class: "sam3-upload-status sam3-upload-busy"
};
const _hoisted_8 = {
  key: 1,
  class: "sam3-upload-status sam3-upload-error"
};
const _hoisted_9 = { class: "sam3-modal-footer" };
const _hoisted_10 = { class: "sam3-fb-left" };
const _hoisted_11 = { class: "sam3-summary" };
const _hoisted_12 = {
  key: 0,
  class: "sam3-notice"
};
const _hoisted_13 = { class: "sam3-fb-right" };
const MAX_RESIZE_DIM = 8192;
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "SAM3MaskEditorModal",
  props: {
    imageUrl: {},
    initialPoints: {},
    initialBboxes: {},
    initialResizeMeta: {}
  },
  emits: ["save", "cancel", "loadImage"],
  setup(__props, { emit: __emit }) {
    var _a;
    const props = __props;
    const emit = __emit;
    const fileInputRef = ref(null);
    const sm = reactive(new EditorStateMachine());
    const primaryCanvasRef = ref(null);
    const overlayCanvasRef = ref(null);
    const canvasAreaRef = ref(null);
    const img = new Image();
    const imgLoaded = ref(false);
    const imgWidth = ref(0);
    const imgHeight = ref(0);
    const sourceWidth = ref(0);
    const sourceHeight = ref(0);
    const resizeWidthInput = ref(0);
    const resizeHeightInput = ref(0);
    const keepAspectLocked = ref(((_a = props.initialResizeMeta) == null ? void 0 : _a.keepAspectLocked) ?? true);
    const resizeDirty = ref(false);
    const points = ref([...props.initialPoints]);
    const bboxes = ref([...props.initialBboxes]);
    const uploadStatus = ref("idle");
    const uploadErrorMessage = ref("");
    const serverFilename = ref("");
    const transform = ref({ offsetX: 0, offsetY: 0, scale: 1 });
    const panning = ref(false);
    const panStart = { x: 0, y: 0 };
    const panOffsetStart = { x: 0, y: 0 };
    let primaryCtx = null;
    let overlayCtx = null;
    let canvasW = 0;
    let canvasH = 0;
    let rafId = 0;
    let currentObjectUrl = "";
    let imageLoadToken = 0;
    const hoveredType = ref("none");
    const hoveredCorner = ref(-1);
    const hoveredIndex = ref(-1);
    const actionNotice = ref("");
    let actionNoticeTimer = null;
    function setActionNotice(message) {
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
    function sanitizeDim(value, fallback) {
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
      resizeDirty.value = imgLoaded.value && (imgWidth.value !== sourceWidth.value || imgHeight.value !== sourceHeight.value);
    }
    function remapAnnotations(oldW, oldH, newW, newH) {
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
          y: clamped.y
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
          y1: Math.max(p0.y, p1.y)
        };
      });
    }
    function applyResizePreview(targetW, targetH) {
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
    function applyResizeScale(scale) {
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
          hoveredCorner: hoveredCorner.value
        }
      );
    }
    function scheduleOverlayRedraw() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(redrawOverlay);
    }
    function onPointerDown(e) {
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
    function onPointerMove(e) {
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
          sx,
          sy,
          imgWidth.value,
          imgHeight.value,
          points.value,
          bboxes.value,
          transform.value
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
    function onPointerUp(e) {
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
    function onWheel(e) {
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
    function onKeyDown(e) {
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
      if (e.key === "1") {
        sm.setTool(ToolMode.SELECT);
        return;
      }
      if (e.key === "2") {
        sm.setTool(ToolMode.POINT);
        return;
      }
      if (e.key === "3") {
        sm.setTool(ToolMode.BOX);
        return;
      }
      if (e.key === "4") {
        sm.setTool(ToolMode.POINT_NEGATIVE);
        return;
      }
    }
    function deleteSelected() {
      const hovered = hoveredType.value !== "none" && hoveredIndex.value >= 0 ? {
        type: hoveredType.value,
        index: hoveredIndex.value,
        corner: hoveredCorner.value >= 0 ? hoveredCorner.value : void 0
      } : void 0;
      const sel = sm.deleteSelected(points.value, bboxes.value, hovered);
      if (sel) {
        if (sel.pointIndex !== void 0) {
          points.value.splice(sel.pointIndex, 1);
          points.value = [...points.value];
          setActionNotice("Point deleted.");
        }
        if (sel.bboxIndex !== void 0) {
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
      var _a2;
      (_a2 = fileInputRef.value) == null ? void 0 : _a2.click();
    }
    async function uploadBlobToServer(blob, filename) {
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      const formData = new FormData();
      formData.append("image", file);
      const resp = await fetch("/duffy/sam3/upload_image", {
        method: "POST",
        body: formData
      });
      const result = await resp.json();
      if (!resp.ok || result.status !== "ok") {
        throw new Error(result.message || "Upload failed");
      }
      return result.filename;
    }
    async function createResizedBlob(targetW, targetH) {
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not create resize canvas context");
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to generate resized image blob"));
            return;
          }
          resolve(blob);
        }, "image/png");
      });
    }
    async function onFileSelected(e) {
      var _a2;
      const input = e.target;
      const file = (_a2 = input.files) == null ? void 0 : _a2[0];
      if (!file) return;
      uploadStatus.value = "idle";
      uploadErrorMessage.value = "";
      serverFilename.value = "";
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
            (b) => b.x0 >= 0 && b.x1 <= newW && b.y0 >= 0 && b.y1 <= newH
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
          img.src = reader.result;
          img.onload = () => {
            initCanvas();
            fitToScreen();
            if (removedPts > 0 || removedBoxes > 0) {
              alert(
                `Image dimensions changed to ${newW}x${newH}.
Removed ${removedPts} out-of-bounds point(s) and ${removedBoxes} out-of-bounds box(es).`
              );
            }
          };
        };
        tempImg.src = reader.result;
      };
      reader.readAsDataURL(file);
      uploadStatus.value = "uploading";
      try {
        const formData = new FormData();
        formData.append("image", file);
        const resp = await fetch("/duffy/sam3/upload_image", {
          method: "POST",
          body: formData
        });
        const result = await resp.json();
        if (!resp.ok || result.status !== "ok") {
          throw new Error(result.message || "Upload failed");
        }
        uploadStatus.value = "success";
        serverFilename.value = result.filename;
        emit("loadImage", result.filename);
      } catch (err) {
        uploadStatus.value = "error";
        uploadErrorMessage.value = err.message || "Network error";
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
        } catch (err) {
          uploadStatus.value = "error";
          uploadErrorMessage.value = (err == null ? void 0 : err.message) || "Resize upload failed";
          return;
        }
      }
      const serializedPoints = points.value.map((p) => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
        id: p.id,
        type: p.type ?? "positive"
      }));
      const positivePoints = serializedPoints.filter((p) => p.type !== "negative");
      const negativePoints = serializedPoints.filter((p) => p.type === "negative");
      const serializedBBoxes = bboxes.value.map((b) => [
        Math.round(b.x0),
        Math.round(b.y0),
        Math.round(b.x1),
        Math.round(b.y1)
      ]);
      emit("save", positivePoints, negativePoints, serializedBBoxes, {
        targetWidth: imgWidth.value,
        targetHeight: imgHeight.value,
        sourceWidth: sourceWidth.value,
        sourceHeight: sourceHeight.value,
        keepAspectLocked: keepAspectLocked.value
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
        fetch(url).then((r) => {
          if (!r.ok) throw new Error("Image fetch failed");
          return r.blob();
        }).then((blob) => {
          if (loadToken !== imageLoadToken) return;
          if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = "";
          }
          currentObjectUrl = URL.createObjectURL(blob);
          img.src = currentObjectUrl;
        }).catch(() => {
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
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "sam3-modal",
        onClick: _cache[11] || (_cache[11] = withModifiers(() => {
        }, ["stop"])),
        onKeydown: onKeyDown,
        tabindex: "-1"
      }, [
        createBaseVNode("div", _hoisted_1$1, [
          _cache[12] || (_cache[12] = createBaseVNode("h3", null, "Mask Editor", -1)),
          imgLoaded.value ? (openBlock(), createElementBlock("span", _hoisted_2$1, toDisplayString(imgWidth.value) + " × " + toDisplayString(imgHeight.value), 1)) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_3$1, [
          createBaseVNode("button", {
            class: normalizeClass({ active: sm.tool === unref(ToolMode).SELECT }),
            onClick: _cache[0] || (_cache[0] = ($event) => sm.setTool(unref(ToolMode).SELECT)),
            title: "Select / Move (1)"
          }, "Select", 2),
          createBaseVNode("button", {
            class: normalizeClass({ active: sm.tool === unref(ToolMode).POINT }),
            onClick: _cache[1] || (_cache[1] = ($event) => sm.setTool(unref(ToolMode).POINT)),
            title: "Point Tool (2)"
          }, "Point (Positive)", 2),
          createBaseVNode("button", {
            class: normalizeClass({ active: sm.tool === unref(ToolMode).POINT_NEGATIVE }),
            onClick: _cache[2] || (_cache[2] = ($event) => sm.setTool(unref(ToolMode).POINT_NEGATIVE)),
            title: "Negative Point Tool (4)"
          }, "Point (Negative)", 2),
          createBaseVNode("button", {
            class: normalizeClass({ active: sm.tool === unref(ToolMode).BOX }),
            onClick: _cache[3] || (_cache[3] = ($event) => sm.setTool(unref(ToolMode).BOX)),
            title: "Box Tool (3)"
          }, "Box", 2),
          _cache[15] || (_cache[15] = createBaseVNode("span", { class: "sam3-tb-sep" }, null, -1)),
          createBaseVNode("button", {
            onClick: deleteSelected,
            title: "Delete Selected (Del)"
          }, "Delete"),
          createBaseVNode("button", {
            onClick: clearAll,
            title: "Remove all points and boxes"
          }, "Clear All"),
          _cache[16] || (_cache[16] = createBaseVNode("span", { class: "sam3-tb-sep" }, null, -1)),
          createBaseVNode("button", {
            onClick: fitToScreen,
            title: "Fit to Screen"
          }, "Fit"),
          imgLoaded.value ? (openBlock(), createElementBlock("div", _hoisted_4$1, [
            createBaseVNode("label", _hoisted_5, [
              _cache[13] || (_cache[13] = createTextVNode(" W ", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => resizeWidthInput.value = $event),
                type: "number",
                min: "1",
                max: MAX_RESIZE_DIM,
                onChange: onResizeWidthChange,
                title: "Target width"
              }, null, 544), [
                [
                  vModelText,
                  resizeWidthInput.value,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("label", _hoisted_6, [
              _cache[14] || (_cache[14] = createTextVNode(" H ", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => resizeHeightInput.value = $event),
                type: "number",
                min: "1",
                max: MAX_RESIZE_DIM,
                onChange: onResizeHeightChange,
                title: "Target height"
              }, null, 544), [
                [
                  vModelText,
                  resizeHeightInput.value,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("button", {
              class: normalizeClass({ active: keepAspectLocked.value }),
              onClick: toggleAspectLock,
              title: "Toggle aspect ratio lock"
            }, "Lock", 2),
            createBaseVNode("button", {
              onClick: _cache[6] || (_cache[6] = ($event) => applyResizeScale(0.5)),
              title: "Scale to 50%"
            }, "50%"),
            createBaseVNode("button", {
              onClick: _cache[7] || (_cache[7] = ($event) => applyResizeScale(0.75)),
              title: "Scale to 75%"
            }, "75%"),
            createBaseVNode("button", {
              onClick: _cache[8] || (_cache[8] = ($event) => applyResizeScale(1)),
              title: "Restore source size"
            }, "100%")
          ])) : createCommentVNode("", true),
          _cache[17] || (_cache[17] = createBaseVNode("span", { class: "sam3-tb-sep" }, null, -1)),
          createBaseVNode("button", {
            onClick: triggerLoadImage,
            title: "Load Image"
          }, "Load Image"),
          createBaseVNode("input", {
            ref_key: "fileInputRef",
            ref: fileInputRef,
            type: "file",
            accept: "image/*",
            style: { "display": "none" },
            onChange: onFileSelected
          }, null, 544)
        ]),
        uploadStatus.value === "uploading" ? (openBlock(), createElementBlock("div", _hoisted_7, "Uploading image to server...")) : createCommentVNode("", true),
        uploadStatus.value === "error" ? (openBlock(), createElementBlock("div", _hoisted_8, "Upload failed: " + toDisplayString(uploadErrorMessage.value) + '. Click "Load Image" to retry.', 1)) : createCommentVNode("", true),
        createBaseVNode("div", {
          class: "sam3-canvas-area",
          ref_key: "canvasAreaRef",
          ref: canvasAreaRef
        }, [
          createBaseVNode("canvas", {
            ref_key: "primaryCanvasRef",
            ref: primaryCanvasRef,
            class: "sam3-canvas-primary"
          }, null, 512),
          createBaseVNode("canvas", {
            ref_key: "overlayCanvasRef",
            ref: overlayCanvasRef,
            class: "sam3-canvas-overlay",
            style: normalizeStyle({ cursor: cursorStyle.value }),
            onPointerdown: onPointerDown,
            onPointermove: onPointerMove,
            onPointerup: onPointerUp,
            onWheel,
            onContextmenu: _cache[9] || (_cache[9] = withModifiers(() => {
            }, ["prevent"]))
          }, null, 36)
        ], 512),
        createBaseVNode("div", _hoisted_9, [
          createBaseVNode("div", _hoisted_10, [
            createBaseVNode("span", _hoisted_11, toDisplayString(points.value.length) + " point" + toDisplayString(points.value.length !== 1 ? "s" : "") + " · " + toDisplayString(bboxes.value.length) + " box" + toDisplayString(bboxes.value.length !== 1 ? "es" : ""), 1),
            actionNotice.value ? (openBlock(), createElementBlock("span", _hoisted_12, toDisplayString(actionNotice.value), 1)) : createCommentVNode("", true)
          ]),
          createBaseVNode("div", _hoisted_13, [
            createBaseVNode("button", {
              class: "sam3-cancel-btn",
              onClick: _cache[10] || (_cache[10] = ($event) => _ctx.$emit("cancel"))
            }, "Cancel"),
            createBaseVNode("button", {
              class: "sam3-save-btn",
              onClick: save
            }, "Save & Close")
          ])
        ])
      ], 32);
    };
  }
});
const SAM3MaskEditorModal = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-e174365a"]]);
const _hoisted_1 = { class: "sam3-widget" };
const _hoisted_2 = { class: "sam3-summary" };
const _hoisted_3 = {
  key: 0,
  class: "sam3-summary-has"
};
const _hoisted_4 = {
  key: 1,
  class: "sam3-summary-none"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SAM3MaskEditorWidget",
  props: {
    initialPrompt: {},
    initialCoordsJson: {},
    initialNegativeCoordsJson: {},
    initialBboxesJson: {},
    initialResizeMetaJson: {},
    imageUrl: {},
    onPromptChange: { type: Function },
    onAnnotationsChange: { type: Function },
    onImageFileChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const points = ref([
      ...parsePoints(props.initialCoordsJson, "positive"),
      ...parsePoints(props.initialNegativeCoordsJson, "negative")
    ]);
    const bboxes = ref(parseBBoxes(props.initialBboxesJson));
    const resizeMeta = ref(parseResizeMeta(props.initialResizeMetaJson));
    const editorVisible = ref(false);
    const imageUrl = ref(props.imageUrl || "");
    const hasAnnotations = computed(
      () => points.value.length > 0 || bboxes.value.length > 0
    );
    function parsePoints(json, pointType = "positive") {
      if (!json) return [];
      try {
        const arr = JSON.parse(json);
        if (!Array.isArray(arr)) return [];
        return arr.map((p, i) => ({
          x: typeof p.x === "number" ? Math.round(p.x) : 0,
          y: typeof p.y === "number" ? Math.round(p.y) : 0,
          id: p.id || `pt_${i}`,
          type: p.type === "negative" ? "negative" : pointType
        }));
      } catch {
        return [];
      }
    }
    function parseBBoxes(json) {
      if (!json) return [];
      try {
        const arr = JSON.parse(json);
        if (!Array.isArray(arr)) return [];
        return arr.map((b, i) => {
          if (Array.isArray(b) && b.length === 4) {
            return {
              x0: Math.round(b[0]),
              y0: Math.round(b[1]),
              x1: Math.round(b[2]),
              y1: Math.round(b[3]),
              id: `bbox_${i}`
            };
          }
          return {
            x0: Math.round(b.x0 ?? b.x ?? 0),
            y0: Math.round(b.y0 ?? b.y ?? 0),
            x1: Math.round(b.x1 ?? 0),
            y1: Math.round(b.y1 ?? 0),
            id: b.id || `bbox_${i}`
          };
        });
      } catch {
        return [];
      }
    }
    function serializeCoords() {
      return JSON.stringify(
        points.value.filter((p) => p.type !== "negative").map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
      );
    }
    function serializeNegativeCoords() {
      return JSON.stringify(
        points.value.filter((p) => p.type === "negative").map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
      );
    }
    function serializeBBoxes() {
      return JSON.stringify(
        bboxes.value.map((b) => [
          Math.round(b.x0),
          Math.round(b.y0),
          Math.round(b.x1),
          Math.round(b.y1)
        ])
      );
    }
    function parseResizeMeta(json) {
      if (!json) return {};
      try {
        const data = JSON.parse(json);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          return {};
        }
        const meta = {};
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
    function serializeResizeMeta() {
      return JSON.stringify({
        targetWidth: resizeMeta.value.targetWidth,
        targetHeight: resizeMeta.value.targetHeight,
        sourceWidth: resizeMeta.value.sourceWidth,
        sourceHeight: resizeMeta.value.sourceHeight,
        keepAspectLocked: resizeMeta.value.keepAspectLocked ?? true
      });
    }
    function emitAnnotations() {
      var _a;
      (_a = props.onAnnotationsChange) == null ? void 0 : _a.call(
        props,
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
    function onLoadImage(filename) {
      var _a;
      (_a = props.onImageFileChange) == null ? void 0 : _a.call(props, filename);
    }
    function onSave(newPositivePoints, newNegativePoints, newBboxes, newResizeMeta) {
      const parsedPositive = newPositivePoints.map((p, i) => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
        id: p.id || `pt_${i}`,
        type: "positive"
      }));
      const parsedNegative = newNegativePoints.map((p, i) => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
        id: p.id || `npt_${i}`,
        type: "negative"
      }));
      points.value = [...parsedPositive, ...parsedNegative];
      bboxes.value = newBboxes.map((b, i) => {
        if (Array.isArray(b)) {
          return {
            x0: Math.round(b[0]),
            y0: Math.round(b[1]),
            x1: Math.round(b[2]),
            y1: Math.round(b[3]),
            id: `bbox_${i}`
          };
        }
        return {
          x0: Math.round(b.x0 ?? b.x ?? 0),
          y0: Math.round(b.y0 ?? b.y ?? 0),
          x1: Math.round(b.x1 ?? 0),
          y1: Math.round(b.y1 ?? 0),
          id: b.id || `bbox_${i}`
        };
      });
      if (newResizeMeta) {
        resizeMeta.value = {
          targetWidth: newResizeMeta.targetWidth,
          targetHeight: newResizeMeta.targetHeight,
          sourceWidth: newResizeMeta.sourceWidth,
          sourceHeight: newResizeMeta.sourceHeight,
          keepAspectLocked: newResizeMeta.keepAspectLocked ?? true
        };
      }
      editorVisible.value = false;
      emitAnnotations();
    }
    function deserialise(data) {
      if (data.coordsJson !== void 0) {
        const currentNegative = points.value.filter((p) => p.type === "negative");
        points.value = [...parsePoints(data.coordsJson, "positive"), ...currentNegative];
      }
      if (data.negativeCoordsJson !== void 0) {
        const currentPositive = points.value.filter((p) => p.type !== "negative");
        points.value = [
          ...currentPositive,
          ...parsePoints(data.negativeCoordsJson, "negative")
        ];
      }
      if (data.bboxesJson !== void 0) {
        bboxes.value = parseBBoxes(data.bboxesJson);
      }
      if (data.resizeMetaJson !== void 0) {
        resizeMeta.value = parseResizeMeta(data.resizeMetaJson);
      }
    }
    function setImageUrl(url) {
      imageUrl.value = url;
    }
    function cleanup() {
    }
    __expose({ deserialise, setImageUrl, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          hasAnnotations.value ? (openBlock(), createElementBlock("span", _hoisted_3, toDisplayString(points.value.length) + " point" + toDisplayString(points.value.length !== 1 ? "s" : "") + " · " + toDisplayString(bboxes.value.length) + " box" + toDisplayString(bboxes.value.length !== 1 ? "es" : ""), 1)) : (openBlock(), createElementBlock("span", _hoisted_4, "No annotations"))
        ]),
        createBaseVNode("button", {
          class: "sam3-open-btn",
          onClick: withModifiers(openEditor, ["stop"])
        }, " Open Mask Editor "),
        (openBlock(), createBlock(Teleport, { to: "body" }, [
          editorVisible.value ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: "sam3-overlay",
            onClick: withModifiers(closeEditor, ["self"])
          }, [
            createVNode(SAM3MaskEditorModal, {
              "image-url": imageUrl.value,
              "initial-points": points.value,
              "initial-bboxes": bboxes.value,
              "initial-resize-meta": resizeMeta.value,
              onSave,
              onCancel: closeEditor,
              onLoadImage
            }, null, 8, ["image-url", "initial-points", "initial-bboxes", "initial-resize-meta"])
          ])) : createCommentVNode("", true)
        ]))
      ]);
    };
  }
});
const SAM3MaskEditorWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-66e13d69"]]);
app.registerExtension({
  name: "Duffy.SAM3MaskEditor.Vue",
  async nodeCreated(node) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    if (node.comfyClass !== "Duffy_SAM3MaskEditor") return;
    const imageFileWidget = (_a = node.widgets) == null ? void 0 : _a.find(
      (w) => w.name === "image_file"
    );
    const promptWidget = (_b = node.widgets) == null ? void 0 : _b.find(
      (w) => w.name === "prompt_text"
    );
    const bboxWidget = (_c = node.widgets) == null ? void 0 : _c.find(
      (w) => w.name === "internal_bboxes"
    );
    const coordWidget = (_d = node.widgets) == null ? void 0 : _d.find(
      (w) => w.name === "internal_coords"
    );
    const negativeCoordWidget = (_e = node.widgets) == null ? void 0 : _e.find(
      (w) => w.name === "internal_negative_coords"
    );
    const resizeMetaWidget = (_f = node.widgets) == null ? void 0 : _f.find(
      (w) => w.name === "internal_resize_meta"
    );
    if (!promptWidget || !bboxWidget || !coordWidget || !negativeCoordWidget) return;
    const hiddenWidgets = [bboxWidget, coordWidget, negativeCoordWidget, resizeMetaWidget].filter(Boolean);
    hiddenWidgets.forEach((w) => {
      w.type = "hidden";
      w.computeSize = () => [0, -4];
      w.options = w.options || {};
      w.options.hidden = true;
      w.hidden = true;
    });
    if (imageFileWidget) {
      if (imageFileWidget.inputEl) {
        imageFileWidget.inputEl.readOnly = true;
      }
      imageFileWidget.disabled = true;
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%;box-sizing:border-box;overflow:hidden;padding:4px 8px;";
    container.addEventListener(
      "pointerdown",
      (e) => e.stopPropagation()
    );
    container.addEventListener(
      "mousedown",
      (e) => e.stopPropagation()
    );
    container.addEventListener(
      "mouseup",
      (e) => e.stopPropagation()
    );
    container.addEventListener(
      "wheel",
      (e) => e.stopPropagation()
    );
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = app.canvas;
      if (canvas) canvas.processContextMenu(node, e);
    });
    function getImageUrl() {
      const fname = (imageFileWidget == null ? void 0 : imageFileWidget.value) || "";
      if (!fname) return "";
      return "/view?filename=" + encodeURIComponent(fname) + "&type=input";
    }
    const vueApp = createApp(SAM3MaskEditorWidget, {
      initialPrompt: promptWidget.value || "",
      initialCoordsJson: coordWidget.value || "[]",
      initialNegativeCoordsJson: negativeCoordWidget.value || "[]",
      initialBboxesJson: bboxWidget.value || "[]",
      initialResizeMetaJson: (resizeMetaWidget == null ? void 0 : resizeMetaWidget.value) || "{}",
      imageUrl: getImageUrl(),
      onPromptChange: (text) => {
        if (promptWidget) promptWidget.value = text;
      },
      onAnnotationsChange: (coords, negativeCoords, bboxes, resizeMeta) => {
        if (coordWidget) coordWidget.value = coords;
        if (negativeCoordWidget) negativeCoordWidget.value = negativeCoords;
        if (bboxWidget) bboxWidget.value = bboxes;
        if (resizeMetaWidget && resizeMeta !== void 0) {
          resizeMetaWidget.value = resizeMeta;
        }
        node.setDirtyCanvas(true, true);
      },
      onImageFileChange: (filename) => {
        if (imageFileWidget) {
          imageFileWidget.value = filename;
          instance.setImageUrl(getImageUrl());
          node.setDirtyCanvas(true, true);
        }
      }
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget(
      "vue_ui",
      "custom",
      container,
      { serialize: false }
    );
    domWidget.content = container;
    domWidget.computeSize = () => [
      node.size[0],
      60
    ];
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(320, size[0]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    (_i = node.setSize) == null ? void 0 : _i.call(node, [Math.max(320, ((_g = node.size) == null ? void 0 : _g[0]) ?? 320), ((_h = node.size) == null ? void 0 : _h[1]) ?? 120]);
    if ((coordWidget == null ? void 0 : coordWidget.value) || (bboxWidget == null ? void 0 : bboxWidget.value)) {
      instance.deserialise({
        coordsJson: coordWidget.value || "[]",
        negativeCoordsJson: (negativeCoordWidget == null ? void 0 : negativeCoordWidget.value) || "[]",
        bboxesJson: bboxWidget.value || "[]",
        resizeMetaJson: (resizeMetaWidget == null ? void 0 : resizeMetaWidget.value) || "{}"
      });
    }
    const origConfigure = node.configure;
    node.configure = function(info) {
      if (info.widgets_values) {
        if (bboxWidget && info.widgets_values.length > 2) bboxWidget.value = info.widgets_values[2];
        if (coordWidget && info.widgets_values.length > 3) coordWidget.value = info.widgets_values[3];
        if (negativeCoordWidget && info.widgets_values.length > 4) negativeCoordWidget.value = info.widgets_values[4];
        if (resizeMetaWidget && info.widgets_values.length > 5) resizeMetaWidget.value = info.widgets_values[5];
      }
      origConfigure == null ? void 0 : origConfigure.call(this, info);
      instance.deserialise({
        coordsJson: (coordWidget == null ? void 0 : coordWidget.value) || "[]",
        negativeCoordsJson: (negativeCoordWidget == null ? void 0 : negativeCoordWidget.value) || "[]",
        bboxesJson: (bboxWidget == null ? void 0 : bboxWidget.value) || "[]",
        resizeMetaJson: (resizeMetaWidget == null ? void 0 : resizeMetaWidget.value) || "{}"
      });
      instance.setImageUrl(getImageUrl());
    };
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      (_a2 = instance.cleanup) == null ? void 0 : _a2.call(instance);
      vueApp.unmount();
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
  }
});
