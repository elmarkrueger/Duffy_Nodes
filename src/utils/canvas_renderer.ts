export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface Point2D {
  x: number;
  y: number;
  id: string;
  type?: "positive" | "negative";
}

export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  id: string;
}

export type OverlayHitType = "point" | "bbox_corner" | "bbox_area" | "none";

export interface OverlayHighlightState {
  selectedPointIndex?: number | null;
  selectedBBoxIndex?: number | null;
  hoveredType?: OverlayHitType;
  hoveredIndex?: number;
  hoveredCorner?: number;
}

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

export function screenToImage(
  screenX: number,
  screenY: number,
  t: ViewTransform
): { x: number; y: number } {
  return {
    x: Math.round((screenX - t.offsetX) / t.scale),
    y: Math.round((screenY - t.offsetY) / t.scale),
  };
}

export function imageToScreen(
  imgX: number,
  imgY: number,
  t: ViewTransform
): { x: number; y: number } {
  return {
    x: imgX * t.scale + t.offsetX,
    y: imgY * t.scale + t.offsetY,
  };
}

export function clampToImage(
  x: number,
  y: number,
  imgW: number,
  imgH: number
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(imgW - 1, x)),
    y: Math.max(0, Math.min(imgH - 1, y)),
  };
}

export function fitTransform(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number
): ViewTransform {
  const scaleX = canvasW / imgW;
  const scaleY = canvasH / imgH;
  const scale = Math.min(scaleX, scaleY, 1.0);
  const offsetX = (canvasW - imgW * scale) / 2;
  const offsetY = (canvasH - imgH * scale) / 2;
  return { offsetX, offsetY, scale };
}

export function renderImageOnPrimary(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  t: ViewTransform,
  canvasW: number,
  canvasH: number,
  imageW: number,
  imageH: number
): void {
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

export function renderOverlay(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  bboxes: BBox[],
  previewBox: BBox | null,
  t: ViewTransform,
  canvasW: number,
  canvasH: number
): void {
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

export function renderInteractionHighlights(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  bboxes: BBox[],
  t: ViewTransform,
  state: OverlayHighlightState
): void {
  const selectedPoint =
    typeof state.selectedPointIndex === "number" &&
    state.selectedPointIndex >= 0 &&
    state.selectedPointIndex < points.length
      ? state.selectedPointIndex
      : null;

  const selectedBBox =
    typeof state.selectedBBoxIndex === "number" &&
    state.selectedBBoxIndex >= 0 &&
    state.selectedBBoxIndex < bboxes.length
      ? state.selectedBBoxIndex
      : null;

  const hoveredPoint =
    state.hoveredType === "point" &&
    typeof state.hoveredIndex === "number" &&
    state.hoveredIndex >= 0 &&
    state.hoveredIndex < points.length
      ? state.hoveredIndex
      : null;

  const hoveredBBox =
    (state.hoveredType === "bbox_corner" || state.hoveredType === "bbox_area") &&
    typeof state.hoveredIndex === "number" &&
    state.hoveredIndex >= 0 &&
    state.hoveredIndex < bboxes.length
      ? state.hoveredIndex
      : null;

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

  if (
    state.hoveredType === "bbox_corner" &&
    hoveredBBox !== null &&
    typeof state.hoveredCorner === "number" &&
    state.hoveredCorner >= 0 &&
    state.hoveredCorner <= 3
  ) {
    drawCornerHighlight(
      ctx,
      bboxes[hoveredBBox],
      t,
      state.hoveredCorner,
      hoveredBBox === selectedBBox ? ACTIVE_HIGHLIGHT : HOVER_HIGHLIGHT
    );
  }
}

function drawPointHighlight(
  ctx: CanvasRenderingContext2D,
  pt: Point2D,
  t: ViewTransform,
  color: string,
  dashed: boolean
): void {
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

function drawBBoxHighlight(
  ctx: CanvasRenderingContext2D,
  box: BBox,
  t: ViewTransform,
  color: string,
  lineWidth: number,
  dashed: boolean
): void {
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

function drawCornerHighlight(
  ctx: CanvasRenderingContext2D,
  box: BBox,
  t: ViewTransform,
  corner: number,
  color: string
): void {
  const corners = getCanvasBBoxCorners(box);
  const c = corners[corner];
  const p = imageToScreen(c.x, c.y, t);
  const size = Math.max(9, HANDLE_SIZE * t.scale + 3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  pt: Point2D,
  t: ViewTransform
): void {
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

function drawBBox(
  ctx: CanvasRenderingContext2D,
  box: BBox,
  t: ViewTransform
): void {
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
    { x: p1.x, y: p1.y },
  ];
  for (const c of corners) {
    ctx.fillStyle = HANDLE_FILL;
    ctx.fillRect(c.x - hs / 2, c.y - hs / 2, hs, hs);
    ctx.strokeStyle = HANDLE_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x - hs / 2, c.y - hs / 2, hs, hs);
  }
}

function drawPreviewBox(
  ctx: CanvasRenderingContext2D,
  box: BBox,
  t: ViewTransform
): void {
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

export function getCanvasBBoxCorners(box: BBox): {
  x: number;
  y: number;
}[] {
  return [
    { x: box.x0, y: box.y0 },
    { x: box.x1, y: box.y0 },
    { x: box.x0, y: box.y1 },
    { x: box.x1, y: box.y1 },
  ];
}

export function setupHiDPICanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return ctx;
}
