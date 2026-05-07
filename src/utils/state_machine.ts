import type { BBox, Point2D, ViewTransform } from "./canvas_renderer";
import { clampToImage, getCanvasBBoxCorners, screenToImage } from "./canvas_renderer";

export enum EditorState {
  IDLE = "IDLE",
  DRAW_POINT = "DRAW_POINT",
  DRAW_BBOX_START = "DRAW_BBOX_START",
  DRAW_BBOX_DRAG = "DRAW_BBOX_DRAG",
  EDIT_POINT_DRAG = "EDIT_POINT_DRAG",
  RESIZE_BBOX = "RESIZE_BBOX",
  TRANSLATE_BBOX = "TRANSLATE_BBOX",
}

export enum ToolMode {
  SELECT = "SELECT",
  POINT = "POINT",
  POINT_NEGATIVE = "POINT_NEGATIVE",
  BOX = "BOX",
}

export interface HitResult {
  type: "point" | "bbox_corner" | "bbox_area" | "none";
  index: number;
  corner?: number;
}

type SelectionTarget =
  | { type: "point"; index: number }
  | { type: "bbox"; index: number };

let _idCounter = 0;
export function newId(): string {
  return `ann_${Date.now()}_${++_idCounter}`;
}

const HIT_THRESHOLD_SCREEN = 20;
const MIN_BBOX_DRAG_SCREEN = 4;

function euclidean(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export class EditorStateMachine {
  state: EditorState = EditorState.IDLE;
  tool: ToolMode = ToolMode.SELECT;

  selectedPointIndex: number | null = null;
  selectedBBoxIndex: number | null = null;
  activeCorner: number | null = null;
  dragStartScreen: { x: number; y: number } | null = null;
  dragStartPointImg: { x: number; y: number } | null = null;
  bboxStartImg: { x: number; y: number } | null = null;
  bboxCurrentImg: { x: number; y: number } | null = null;

  private createdPoint: Point2D | null = null;
  private createdBBox: BBox | null = null;
  private lastSelected: SelectionTarget | null = null;

  constructor() {}

  reset(): void {
    this.state = EditorState.IDLE;
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

  private selectPoint(index: number): void {
    this.selectedPointIndex = index;
    this.selectedBBoxIndex = null;
    this.lastSelected = { type: "point", index };
  }

  private selectBBox(index: number): void {
    this.selectedBBoxIndex = index;
    this.selectedPointIndex = null;
    this.lastSelected = { type: "bbox", index };
  }

  private isValidPointIndex(index: number | null, points: Point2D[]): index is number {
    return index !== null && index >= 0 && index < points.length;
  }

  private isValidBBoxIndex(index: number | null, bboxes: BBox[]): index is number {
    return index !== null && index >= 0 && index < bboxes.length;
  }

  private clearSelection(): void {
    this.selectedPointIndex = null;
    this.selectedBBoxIndex = null;
  }

  private resolveSelectedTarget(points: Point2D[], bboxes: BBox[]): SelectionTarget | null {
    const selectedPointIndex = this.selectedPointIndex;
    const selectedBBoxIndex = this.selectedBBoxIndex;
    const hasPoint = this.isValidPointIndex(selectedPointIndex, points);
    const hasBBox = this.isValidBBoxIndex(selectedBBoxIndex, bboxes);

    if (hasPoint && hasBBox) {
      if (this.lastSelected?.type === "bbox" && this.lastSelected.index === selectedBBoxIndex) {
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

  private resolveHoveredTarget(
    hovered: HitResult | undefined,
    points: Point2D[],
    bboxes: BBox[]
  ): SelectionTarget | null {
    if (!hovered) return null;
    if (hovered.type === "point" && this.isValidPointIndex(hovered.index, points)) {
      return { type: "point", index: hovered.index };
    }
    if (
      (hovered.type === "bbox_corner" || hovered.type === "bbox_area") &&
      this.isValidBBoxIndex(hovered.index, bboxes)
    ) {
      return { type: "bbox", index: hovered.index };
    }
    return null;
  }

  private resolveLastSelectedTarget(points: Point2D[], bboxes: BBox[]): SelectionTarget | null {
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

  handlePointerDown(
    screenX: number,
    screenY: number,
    points: Point2D[],
    bboxes: BBox[],
    transform: ViewTransform
  ): void {
    this.createdPoint = null;
    this.createdBBox = null;

    if (this.tool === ToolMode.POINT || this.tool === ToolMode.POINT_NEGATIVE) {
      const coords = screenToImage(screenX, screenY, transform);
      this.createdPoint = {
        x: coords.x,
        y: coords.y,
        id: newId(),
        type: this.tool === ToolMode.POINT_NEGATIVE ? "negative" : "positive",
      };
      this.state = EditorState.IDLE;
      return;
    }

    if (this.tool === ToolMode.BOX) {
      const boxHit = hitTest(screenX, screenY, [], bboxes, transform);
      if (boxHit.type === "bbox_corner") {
        this.selectBBox(boxHit.index);
        this.activeCorner = boxHit.corner ?? null;
        this.dragStartScreen = { x: screenX, y: screenY };
        this.state = EditorState.RESIZE_BBOX;
        return;
      }

      if (boxHit.type === "bbox_area") {
        this.selectBBox(boxHit.index);
        this.dragStartScreen = { x: screenX, y: screenY };
        const box = bboxes[boxHit.index];
        this.dragStartPointImg = { x: box.x0, y: box.y0 };
        this.state = EditorState.TRANSLATE_BBOX;
        return;
      }

      const coords = screenToImage(screenX, screenY, transform);
      this.bboxStartImg = coords;
      this.bboxCurrentImg = coords;
      this.dragStartScreen = { x: screenX, y: screenY };
      this.state = EditorState.DRAW_BBOX_START;
      return;
    }

    const hit = hitTest(screenX, screenY, points, bboxes, transform);

    if (hit.type === "point") {
      this.selectPoint(hit.index);
      this.dragStartScreen = { x: screenX, y: screenY };
      this.dragStartPointImg = {
        x: points[hit.index].x,
        y: points[hit.index].y,
      };
      this.state = EditorState.EDIT_POINT_DRAG;
      return;
    }

    if (hit.type === "bbox_corner") {
      this.selectBBox(hit.index);
      this.activeCorner = hit.corner ?? null;
      this.dragStartScreen = { x: screenX, y: screenY };
      this.state = EditorState.RESIZE_BBOX;
      return;
    }

    if (hit.type === "bbox_area") {
      this.selectBBox(hit.index);
      this.dragStartScreen = { x: screenX, y: screenY };
      const box = bboxes[hit.index];
      this.dragStartPointImg = { x: box.x0, y: box.y0 };
      this.state = EditorState.TRANSLATE_BBOX;
      return;
    }

    this.clearSelection();
    this.state = EditorState.IDLE;
  }

  handlePointerMove(
    screenX: number,
    screenY: number,
    imgW: number,
    imgH: number,
    points: Point2D[],
    bboxes: BBox[],
    transform: ViewTransform
  ): void {
    if (this.state === EditorState.DRAW_BBOX_START || this.state === EditorState.DRAW_BBOX_DRAG) {
      this.state = EditorState.DRAW_BBOX_DRAG;
      this.bboxCurrentImg = screenToImage(screenX, screenY, transform);
      return;
    }

    if (this.state === EditorState.EDIT_POINT_DRAG && this.selectedPointIndex !== null && this.dragStartScreen) {
      const deltaX = screenX - this.dragStartScreen.x;
      const deltaY = screenY - this.dragStartScreen.y;
      const dx = deltaX / transform.scale;
      const dy = deltaY / transform.scale;
      const start = this.dragStartPointImg!;
      points[this.selectedPointIndex].x = Math.round(
        Math.max(0, Math.min(imgW - 1, start.x + dx))
      );
      points[this.selectedPointIndex].y = Math.round(
        Math.max(0, Math.min(imgH - 1, start.y + dy))
      );
      return;
    }

    if (this.state === EditorState.RESIZE_BBOX && this.selectedBBoxIndex !== null && this.activeCorner !== null) {
      const coords = screenToImage(screenX, screenY, transform);
      const cx = Math.max(0, Math.min(imgW - 1, coords.x));
      const cy = Math.max(0, Math.min(imgH - 1, coords.y));
      const box = bboxes[this.selectedBBoxIndex];
      const c = this.activeCorner;
      if (c === 0) { box.x0 = cx; box.y0 = cy; }
      else if (c === 1) { box.x1 = cx; box.y0 = cy; }
      else if (c === 2) { box.x0 = cx; box.y1 = cy; }
      else if (c === 3) { box.x1 = cx; box.y1 = cy; }
      return;
    }

    if (this.state === EditorState.TRANSLATE_BBOX && this.selectedBBoxIndex !== null && this.dragStartScreen && this.dragStartPointImg) {
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

  handlePointerUp(
    screenX: number,
    screenY: number,
    transform: ViewTransform,
    points: Point2D[],
    bboxes: BBox[],
    imgW: number,
    imgH: number
  ): {
    pointCreated?: Point2D;
    pointMoved?: { index: number; x: number; y: number };
    pointDeleted?: number;
    bboxCreated?: BBox;
    bboxMoved?: { index: number; x0: number; y0: number; x1: number; y1: number };
    bboxDeleted?: number;
  } | null {
    const result: any = {};

    if (this.state === EditorState.DRAW_BBOX_DRAG && this.bboxStartImg && this.bboxCurrentImg) {
      if (this.dragStartScreen) {
        const dragDistance = euclidean(
          { x: screenX, y: screenY },
          this.dragStartScreen
        );
        if (dragDistance < MIN_BBOX_DRAG_SCREEN) {
          this.bboxStartImg = null;
          this.bboxCurrentImg = null;
          this.dragStartScreen = null;
          this.state = EditorState.IDLE;
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
        this.state = EditorState.IDLE;
        return null;
      }

      this.createdBBox = {
        x0: clamped0.x,
        y0: clamped0.y,
        x1: clamped1.x,
        y1: clamped1.y,
        id: newId(),
      };
      result.bboxCreated = this.createdBBox;
      this.bboxStartImg = null;
      this.bboxCurrentImg = null;
      this.dragStartScreen = null;
      this.state = EditorState.IDLE;
      return result;
    }

    if (this.state === EditorState.DRAW_BBOX_START) {
      this.bboxStartImg = null;
      this.bboxCurrentImg = null;
      this.dragStartScreen = null;
      this.state = EditorState.IDLE;
      return null;
    }

    if (this.state === EditorState.EDIT_POINT_DRAG && this.selectedPointIndex !== null && this.dragStartPointImg) {
      const deltaX = screenX - (this.dragStartScreen?.x ?? screenX);
      const deltaY = screenY - (this.dragStartScreen?.y ?? screenY);
      const newImgX = this.dragStartPointImg.x + deltaX / transform.scale;
      const newImgY = this.dragStartPointImg.y + deltaY / transform.scale;
      const clamped = clampToImage(Math.round(newImgX), Math.round(newImgY), imgW, imgH);
      points[this.selectedPointIndex].x = clamped.x;
      points[this.selectedPointIndex].y = clamped.y;
      this.lastSelected = { type: "point", index: this.selectedPointIndex };
      result.pointMoved = { index: this.selectedPointIndex, x: clamped.x, y: clamped.y };
      this.dragStartScreen = null;
      this.dragStartPointImg = null;
      this.state = EditorState.IDLE;
      return result;
    }

    if (this.state === EditorState.RESIZE_BBOX && this.selectedBBoxIndex !== null && this.activeCorner !== null) {
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
      this.state = EditorState.IDLE;
      return result;
    }

    if (this.state === EditorState.TRANSLATE_BBOX && this.selectedBBoxIndex !== null && this.dragStartPointImg) {
      const box = bboxes[this.selectedBBoxIndex];
      this.lastSelected = { type: "bbox", index: this.selectedBBoxIndex };

      result.bboxMoved = { index: this.selectedBBoxIndex, x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1 };
      this.dragStartScreen = null;
      this.dragStartPointImg = null;
      this.state = EditorState.IDLE;
      return result;
    }

    this.state = EditorState.IDLE;
    return null;
  }

  setTool(tool: ToolMode): void {
    this.tool = tool;
    this.state = EditorState.IDLE;
    this.bboxStartImg = null;
    this.bboxCurrentImg = null;
    this.createdPoint = null;
    this.activeCorner = null;
    this.dragStartScreen = null;
    this.dragStartPointImg = null;
  }

  deleteSelected(
    points: Point2D[],
    bboxes: BBox[],
    hovered?: HitResult
  ): { pointIndex?: number; bboxIndex?: number } | null {
    const selectedTarget = this.resolveSelectedTarget(points, bboxes);
    const hoveredTarget = this.resolveHoveredTarget(hovered, points, bboxes);
    const lastSelectedTarget = this.resolveLastSelectedTarget(points, bboxes);

    const target = selectedTarget ?? hoveredTarget ?? lastSelectedTarget;
    if (!target) {
      return null;
    }

    this.state = EditorState.IDLE;
    this.clearSelection();

    if (target.type === "point") {
      this.lastSelected = null;
      return { pointIndex: target.index };
    }

    this.lastSelected = null;
    return { bboxIndex: target.index };
  }

  cancel(): void {
    this.state = EditorState.IDLE;
    this.bboxStartImg = null;
    this.bboxCurrentImg = null;
    this.createdPoint = null;
    this.createdBBox = null;
    this.activeCorner = null;
    this.dragStartScreen = null;
    this.dragStartPointImg = null;
  }

  getPreviewBox(): BBox | null {
    if (
      (this.state === EditorState.DRAW_BBOX_START ||
        this.state === EditorState.DRAW_BBOX_DRAG) &&
      this.bboxStartImg
    ) {
      const cur = this.bboxCurrentImg ?? this.bboxStartImg;
      return {
        x0: Math.min(this.bboxStartImg.x, cur.x),
        y0: Math.min(this.bboxStartImg.y, cur.y),
        x1: Math.max(this.bboxStartImg.x, cur.x),
        y1: Math.max(this.bboxStartImg.y, cur.y),
        id: "preview",
      };
    }
    return null;
  }

  consumeCreatedPoint(): Point2D | null {
    const pt = this.createdPoint;
    this.createdPoint = null;
    return pt;
  }

  consumeCreatedBBox(): BBox | null {
    const box = this.createdBBox;
    this.createdBBox = null;
    return box;
  }

  getHovered(
    screenX: number,
    screenY: number,
    points: Point2D[],
    bboxes: BBox[],
    transform: ViewTransform
  ): HitResult {
    if (this.state !== EditorState.IDLE) {
      return { type: "none", index: -1 };
    }
    return hitTest(screenX, screenY, points, bboxes, transform);
  }
}

function hitTest(
  screenX: number,
  screenY: number,
  points: Point2D[],
  bboxes: BBox[],
  t: ViewTransform
): HitResult {
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
        y: corners[c].y * t.scale + t.offsetY,
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
