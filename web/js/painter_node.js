import { d as defineComponent, h as ref, o as onMounted, a as onUnmounted, q as watch, b as openBlock, c as createElementBlock, e as createBaseVNode, k as normalizeClass, w as withDirectives, v as vModelText, t as toDisplayString, l as withModifiers, _ as _export_sfc, u as reactive, i as createApp, x as h } from "./_plugin-vue_export-helper-CojN6hzB.js";
import { f as fabric } from "./fabric-CMDe1F3Z.js";
import { app } from "../../../scripts/app.js";
(function() {
  fabric.fabric.Object.ENLIVEN_PROPS.push("eraser");
  let __drawClipPath = fabric.fabric.Object.prototype._drawClipPath;
  let _needsItsOwnCache = fabric.fabric.Object.prototype.needsItsOwnCache;
  let _toObject = fabric.fabric.Object.prototype.toObject;
  fabric.fabric.Object.prototype.getSvgCommons;
  fabric.fabric.Object.prototype._createBaseClipPathSVGMarkup;
  fabric.fabric.Object.prototype._createBaseSVGMarkup;
  fabric.fabric.Object.prototype.cacheProperties.push("eraser");
  fabric.fabric.Object.prototype.stateProperties.push("eraser");
  fabric.fabric.util.object.extend(fabric.fabric.Object.prototype, {
    /**
     * Indicates whether this object can be erased by {@link fabric.EraserBrush}
     * The `deep` option introduces fine grained control over a group's `erasable` property.
     * When set to `deep` the eraser will erase nested objects if they are erasable, leaving the group and the other objects untouched.
     * When set to `true` the eraser will erase the entire group. Once the group changes the eraser is propagated to its children for proper functionality.
     * When set to `false` the eraser will leave all objects including the group untouched.
     * @tutorial {@link http://fabricjs.com/erasing#erasable_property}
     * @type boolean | 'deep'
     * @default true
     */
    erasable: true,
    /**
     * @tutorial {@link http://fabricjs.com/erasing#eraser}
     * @type fabric.Eraser
     */
    eraser: void 0,
    /**
     * @override
     * @returns Boolean
     */
    needsItsOwnCache: function() {
      return _needsItsOwnCache.call(this) || !!this.eraser;
    },
    /**
     * draw eraser above clip path
     * @override
     * @private
     * @param {CanvasRenderingContext2D} ctx
     * @param {fabric.Object} clipPath
     */
    _drawClipPath: function(ctx, clipPath) {
      __drawClipPath.call(this, ctx, clipPath);
      if (this.eraser) {
        let size = this._getNonTransformedDimensions();
        this.eraser.isType("eraser") && this.eraser.set({
          width: size.x,
          height: size.y
        });
        __drawClipPath.call(this, ctx, this.eraser);
      }
    },
    /**
     * Returns an object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} Object representation of an instance
     */
    toObject: function(propertiesToInclude) {
      let object = _toObject.call(
        this,
        ["erasable"].concat(propertiesToInclude)
      );
      if (this.eraser && !this.eraser.excludeFromExport) {
        object.eraser = this.eraser.toObject(propertiesToInclude);
      }
      return object;
    }
  });
  let __restoreObjectsState = fabric.fabric.Group.prototype._restoreObjectsState;
  fabric.fabric.util.object.extend(fabric.fabric.Group.prototype, {
    /**
     * @private
     * @param {fabric.Path} path
     */
    _addEraserPathToObjects: function(path) {
      this._objects.forEach(function(object) {
        fabric.fabric.EraserBrush.prototype._addPathToObjectEraser.call(
          fabric.fabric.EraserBrush.prototype,
          object,
          path
        );
      });
    },
    /**
     * Applies the group's eraser to its objects
     * @tutorial {@link http://fabricjs.com/erasing#erasable_property}
     */
    applyEraserToObjects: function() {
      let _this = this;
      let eraser = this.eraser;
      if (eraser) {
        delete this.eraser;
        let transform = _this.calcTransformMatrix();
        eraser.clone(function(eraser2) {
          let clipPath = _this.clipPath;
          eraser2.getObjects("path").forEach(function(path) {
            let originalTransform = fabric.fabric.util.multiplyTransformMatrices(
              transform,
              path.calcTransformMatrix()
            );
            fabric.fabric.util.applyTransformToObject(path, originalTransform);
            if (clipPath) {
              clipPath.clone(
                function(_clipPath) {
                  let eraserPath = fabric.fabric.EraserBrush.prototype.applyClipPathToPath.call(
                    fabric.fabric.EraserBrush.prototype,
                    path,
                    _clipPath,
                    transform
                  );
                  _this._addEraserPathToObjects(eraserPath);
                },
                ["absolutePositioned", "inverted"]
              );
            } else {
              _this._addEraserPathToObjects(path);
            }
          });
        });
      }
    },
    /**
     * Propagate the group's eraser to its objects, crucial for proper functionality of the eraser within the group and nested objects.
     * @private
     */
    _restoreObjectsState: function() {
      this.erasable === true && this.applyEraserToObjects();
      return __restoreObjectsState.call(this);
    }
  });
  fabric.fabric.Eraser = fabric.fabric.util.createClass(fabric.fabric.Group, {
    /**
     * @readonly
     * @static
     */
    type: "eraser",
    /**
     * @default
     */
    originX: "center",
    /**
     * @default
     */
    originY: "center",
    drawObject: function(ctx) {
      ctx.save();
      ctx.fillStyle = "black";
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
      this.callSuper("drawObject", ctx);
    },
    /**
     * eraser should retain size
     * dimensions should not change when paths are added or removed
     * handled by {@link fabric.Object#_drawClipPath}
     * @override
     * @private
     */
    _getBounds: function() {
    }
  });
  fabric.fabric.Eraser.fromObject = function(object, callback) {
    let objects = object.objects;
    fabric.fabric.util.enlivenObjects(objects, function(enlivenedObjects) {
      let options = fabric.fabric.util.object.clone(object, true);
      delete options.objects;
      fabric.fabric.util.enlivenObjectEnlivables(object, options, function() {
        callback && callback(new fabric.fabric.Eraser(enlivenedObjects, options, true));
      });
    });
  };
  let __renderOverlay = fabric.fabric.Canvas.prototype._renderOverlay;
  fabric.fabric.util.object.extend(fabric.fabric.Canvas.prototype, {
    /**
     * Used by {@link #renderAll}
     * @returns boolean
     */
    isErasing: function() {
      return this.isDrawingMode && this.freeDrawingBrush && this.freeDrawingBrush.type === "eraser" && this.freeDrawingBrush._isErasing;
    },
    /**
     * While erasing the brush clips out the erasing path from canvas
     * so we need to render it on top of canvas every render
     * @param {CanvasRenderingContext2D} ctx
     */
    _renderOverlay: function(ctx) {
      __renderOverlay.call(this, ctx);
      if (this.isErasing() && !this.freeDrawingBrush.inverted) {
        this.freeDrawingBrush._render();
      }
    }
  });
  fabric.fabric.EraserBrush = fabric.fabric.util.createClass(
    fabric.fabric.PencilBrush,
    /** @lends fabric.EraserBrush.prototype */
    {
      type: "eraser",
      /**
       * When set to `true` the brush will create a visual effect of undoing erasing
       */
      inverted: false,
      /**
       * @private
       */
      _isErasing: false,
      /**
       *
       * @private
       * @param {fabric.Object} object
       * @returns boolean
       */
      _isErasable: function(object) {
        return object.erasable !== false;
      },
      /**
       * @private
       * This is designed to support erasing a collection with both erasable and non-erasable objects.
       * Iterates over collections to allow nested selective erasing.
       * Prepares the pattern brush that will draw on the top context to achieve the desired visual effect.
       * If brush is **NOT** inverted render all non-erasable objects.
       * If brush is inverted render all erasable objects that have been erased with their clip path inverted.
       * This will render the erased parts as if they were not erased.
       *
       * @param {fabric.Collection} collection
       * @param {CanvasRenderingContext2D} ctx
       * @param {{ visibility: fabric.Object[], eraser: fabric.Object[], collection: fabric.Object[] }} restorationContext
       */
      _prepareCollectionTraversal: function(collection, ctx, restorationContext) {
        collection.forEachObject(function(obj) {
          if (obj.forEachObject && obj.erasable === "deep") {
            this._prepareCollectionTraversal(obj, ctx, restorationContext);
          } else if (!this.inverted && obj.erasable && obj.visible) {
            obj.visible = false;
            collection.dirty = true;
            restorationContext.visibility.push(obj);
            restorationContext.collection.push(collection);
          } else if (this.inverted && obj.visible) {
            if (obj.erasable && obj.eraser) {
              obj.eraser.inverted = true;
              obj.dirty = true;
              collection.dirty = true;
              restorationContext.eraser.push(obj);
              restorationContext.collection.push(collection);
            } else {
              obj.visible = false;
              collection.dirty = true;
              restorationContext.visibility.push(obj);
              restorationContext.collection.push(collection);
            }
          }
        }, this);
      },
      /**
       * Prepare the pattern for the erasing brush
       * This pattern will be drawn on the top context, achieving a visual effect of erasing only erasable objects
       * @todo decide how overlay color should behave when `inverted === true`, currently draws over it which is undesirable
       * @private
       */
      preparePattern: function() {
        if (!this._patternCanvas) {
          this._patternCanvas = fabric.fabric.util.createCanvasElement();
        }
        let canvas = this._patternCanvas;
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        let patternCtx = canvas.getContext("2d");
        if (this.canvas._isRetinaScaling()) {
          let retinaScaling = this.canvas.getRetinaScaling();
          this.canvas.__initRetinaScaling(retinaScaling, canvas, patternCtx);
        }
        let backgroundImage = this.canvas.backgroundImage;
        let bgErasable = backgroundImage && this._isErasable(backgroundImage);
        let overlayImage = this.canvas.overlayImage;
        let overlayErasable = overlayImage && this._isErasable(overlayImage);
        if (!this.inverted && (backgroundImage && !bgErasable || !!this.canvas.backgroundColor)) {
          if (bgErasable) {
            this.canvas.backgroundImage = void 0;
          }
          this.canvas._renderBackground(patternCtx);
          if (bgErasable) {
            this.canvas.backgroundImage = backgroundImage;
          }
        } else if (this.inverted && backgroundImage && bgErasable) {
          var color = this.canvas.backgroundColor;
          this.canvas.backgroundColor = void 0;
          this.canvas._renderBackground(patternCtx);
          this.canvas.backgroundColor = color;
        }
        patternCtx.save();
        patternCtx.transform.apply(patternCtx, this.canvas.viewportTransform);
        let restorationContext = { visibility: [], eraser: [], collection: [] };
        this._prepareCollectionTraversal(
          this.canvas,
          patternCtx,
          restorationContext
        );
        this.canvas._renderObjects(patternCtx, this.canvas._objects);
        restorationContext.visibility.forEach(function(obj) {
          obj.visible = true;
        });
        restorationContext.eraser.forEach(function(obj) {
          obj.eraser.inverted = false;
          obj.dirty = true;
        });
        restorationContext.collection.forEach(function(obj) {
          obj.dirty = true;
        });
        patternCtx.restore();
        if (!this.inverted && (overlayImage && !overlayErasable || !!this.canvas.overlayColor)) {
          if (overlayErasable) {
            this.canvas.overlayImage = void 0;
          }
          __renderOverlay.call(this.canvas, patternCtx);
          if (overlayErasable) {
            this.canvas.overlayImage = overlayImage;
          }
        } else if (this.inverted && overlayImage && overlayErasable) {
          var color = this.canvas.overlayColor;
          this.canvas.overlayColor = void 0;
          __renderOverlay.call(this.canvas, patternCtx);
          this.canvas.overlayColor = color;
        }
      },
      /**
       * Sets brush styles
       * @private
       * @param {CanvasRenderingContext2D} ctx
       */
      _setBrushStyles: function(ctx) {
        this.callSuper("_setBrushStyles", ctx);
        ctx.strokeStyle = "black";
      },
      /**
       * **Customiztion**
       *
       * if you need the eraser to update on each render (i.e animating during erasing) override this method by **adding** the following (performance may suffer):
       * @example
       * ```
       * if(ctx === this.canvas.contextTop) {
       *  this.preparePattern();
       * }
       * ```
       *
       * @override fabric.BaseBrush#_saveAndTransform
       * @param {CanvasRenderingContext2D} ctx
       */
      _saveAndTransform: function(ctx) {
        this.callSuper("_saveAndTransform", ctx);
        this._setBrushStyles(ctx);
        ctx.globalCompositeOperation = ctx === this.canvas.getContext() ? "destination-out" : "source-over";
      },
      /**
       * We indicate {@link fabric.PencilBrush} to repaint itself if necessary
       * @returns
       */
      needsFullRender: function() {
        return true;
      },
      /**
       *
       * @param {fabric.Point} pointer
       * @param {fabric.IEvent} options
       * @returns
       */
      onMouseDown: function(pointer, options) {
        if (!this.canvas._isMainEvent(options.e)) {
          return;
        }
        this._prepareForDrawing(pointer);
        this._captureDrawingPath(pointer);
        this.preparePattern();
        this._isErasing = true;
        this.canvas.fire("erasing:start");
        this._render();
      },
      /**
       * Rendering Logic:
       * 1. Use brush to clip canvas by rendering it on top of canvas (unnecessary if `inverted === true`)
       * 2. Render brush with canvas pattern on top context
       *
       */
      _render: function() {
        let ctx;
        if (!this.inverted) {
          ctx = this.canvas.getContext();
          this.callSuper("_render", ctx);
        }
        ctx = this.canvas.contextTop;
        this.canvas.clearContext(ctx);
        this.callSuper("_render", ctx);
        ctx.save();
        let t = this.canvas.getRetinaScaling();
        let s = 1 / t;
        ctx.scale(s, s);
        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(this._patternCanvas, 0, 0);
        ctx.restore();
      },
      /**
       * Creates fabric.Path object
       * @override
       * @private
       * @param {(string|number)[][]} pathData Path data
       * @return {fabric.Path} Path to add on canvas
       * @returns
       */
      createPath: function(pathData) {
        let path = this.callSuper("createPath", pathData);
        path.globalCompositeOperation = this.inverted ? "source-over" : "destination-out";
        path.stroke = this.inverted ? "white" : "black";
        return path;
      },
      /**
       * Utility to apply a clip path to a path.
       * Used to preserve clipping on eraser paths in nested objects.
       * Called when a group has a clip path that should be applied to the path before applying erasing on the group's objects.
       * @param {fabric.Path} path The eraser path in canvas coordinate plane
       * @param {fabric.Object} clipPath The clipPath to apply to the path
       * @param {number[]} clipPathContainerTransformMatrix The transform matrix of the object that the clip path belongs to
       * @returns {fabric.Path} path with clip path
       */
      applyClipPathToPath: function(path, clipPath, clipPathContainerTransformMatrix) {
        let pathInvTransform = fabric.fabric.util.invertTransform(
          path.calcTransformMatrix()
        );
        let clipPathTransform = clipPath.calcTransformMatrix();
        let transform = clipPath.absolutePositioned ? pathInvTransform : fabric.fabric.util.multiplyTransformMatrices(
          pathInvTransform,
          clipPathContainerTransformMatrix
        );
        clipPath.absolutePositioned = false;
        fabric.fabric.util.applyTransformToObject(
          clipPath,
          fabric.fabric.util.multiplyTransformMatrices(transform, clipPathTransform)
        );
        path.clipPath = path.clipPath ? fabric.fabric.util.mergeClipPaths(clipPath, path.clipPath) : clipPath;
        return path;
      },
      /**
       * Utility to apply a clip path to a path.
       * Used to preserve clipping on eraser paths in nested objects.
       * Called when a group has a clip path that should be applied to the path before applying erasing on the group's objects.
       * @param {fabric.Path} path The eraser path
       * @param {fabric.Object} object The clipPath to apply to path belongs to object
       * @param {Function} callback Callback to be invoked with the cloned path after applying the clip path
       */
      clonePathWithClipPath: function(path, object, callback) {
        let objTransform = object.calcTransformMatrix();
        let clipPath = object.clipPath;
        let _this = this;
        path.clone(function(_path) {
          clipPath.clone(
            function(_clipPath) {
              callback(
                _this.applyClipPathToPath(_path, _clipPath, objTransform)
              );
            },
            ["absolutePositioned", "inverted"]
          );
        });
      },
      /**
       * Adds path to object's eraser, walks down object's descendants if necessary
       *
       * @fires erasing:end on object
       * @param {fabric.Object} obj
       * @param {fabric.Path} path
       */
      _addPathToObjectEraser: function(obj, path) {
        let _this = this;
        if (obj.forEachObject && obj.erasable === "deep") {
          let targets = obj._objects.filter(function(_obj) {
            return _obj.erasable;
          });
          if (targets.length > 0 && obj.clipPath) {
            this.clonePathWithClipPath(path, obj, function(_path) {
              targets.forEach(function(_obj) {
                _this._addPathToObjectEraser(_obj, _path);
              });
            });
          } else if (targets.length > 0) {
            targets.forEach(function(_obj) {
              _this._addPathToObjectEraser(_obj, path);
            });
          }
          return;
        }
        let eraser = obj.eraser;
        if (!eraser) {
          eraser = new fabric.fabric.Eraser();
          obj.eraser = eraser;
        }
        path.clone(function(path2) {
          let desiredTransform = fabric.fabric.util.multiplyTransformMatrices(
            fabric.fabric.util.invertTransform(obj.calcTransformMatrix()),
            path2.calcTransformMatrix()
          );
          fabric.fabric.util.applyTransformToObject(path2, desiredTransform);
          eraser.addWithUpdate(path2);
          obj.set("dirty", true);
          obj.fire("erasing:end", {
            path: path2
          });
          if (obj.group && Array.isArray(_this.__subTargets)) {
            _this.__subTargets.push(obj);
          }
        });
      },
      /**
       * Add the eraser path to canvas drawables' clip paths
       *
       * @param {fabric.Canvas} source
       * @param {fabric.Canvas} path
       * @returns {Object} canvas drawables that were erased by the path
       */
      applyEraserToCanvas: function(path) {
        let canvas = this.canvas;
        let drawables = {};
        ["backgroundImage", "overlayImage"].forEach(function(prop) {
          let drawable = canvas[prop];
          if (drawable && drawable.erasable) {
            this._addPathToObjectEraser(drawable, path);
            drawables[prop] = drawable;
          }
        }, this);
        return drawables;
      },
      /**
       * On mouseup after drawing the path on contextTop canvas
       * we use the points captured to create an new fabric path object
       * and add it to every intersected erasable object.
       */
      _finalizeAndAddPath: function() {
        let ctx = this.canvas.contextTop;
        let canvas = this.canvas;
        ctx.closePath();
        if (this.decimate) {
          this._points = this.decimatePoints(this._points, this.decimate);
        }
        canvas.clearContext(canvas.contextTop);
        this._isErasing = false;
        let pathData = this._points && this._points.length > 1 ? this.convertPointsToSVGPath(this._points) : null;
        if (!pathData || this._isEmptySVGPath(pathData)) {
          canvas.fire("erasing:end");
          canvas.requestRenderAll();
          return;
        }
        let path = this.createPath(pathData);
        path.setCoords();
        canvas.fire("before:path:created", { path });
        let drawables = this.applyEraserToCanvas(path);
        let _this = this;
        this.__subTargets = [];
        let targets = [];
        canvas.forEachObject(function(obj) {
          if (obj.erasable && obj.intersectsWithObject(path, true, true)) {
            _this._addPathToObjectEraser(obj, path);
            targets.push(obj);
          }
        });
        canvas.fire("erasing:end", {
          path,
          targets,
          subTargets: this.__subTargets,
          drawables
        });
        delete this.__subTargets;
        canvas.requestRenderAll();
        this._resetShadow();
        canvas.fire("path:created", { path });
      }
    }
  );
})();
const _hoisted_1 = { class: "toolbar primary-toolbar" };
const _hoisted_2 = { class: "tool-group" };
const _hoisted_3 = { class: "tool-group" };
const _hoisted_4 = { class: "tool-group right-align" };
const _hoisted_5 = ["disabled"];
const _hoisted_6 = { class: "toolbar secondary-toolbar" };
const _hoisted_7 = { class: "config-item" };
const _hoisted_8 = { class: "config-item" };
const _hoisted_9 = { class: "config-item" };
const _hoisted_10 = { class: "color-picker-wrapper" };
const _hoisted_11 = { class: "config-item" };
const _hoisted_12 = { class: "color-picker-wrapper" };
const _hoisted_13 = { class: "config-item mode-toggle" };
const _hoisted_14 = { class: "toggle-group" };
const _hoisted_15 = { class: "toolbar tertiary-toolbar" };
const _hoisted_16 = { class: "config-item size-control" };
const _hoisted_17 = { class: "size-label" };
const _hoisted_18 = { class: "status-text" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PainterWidget",
  props: {
    width: {},
    height: {},
    bgColor: {},
    onChange: { type: Function },
    onUpdateDimensions: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const widgetRoot = ref(null);
    const canvasEl = ref(null);
    const canvasWrapper = ref(null);
    const fileInput = ref(null);
    const tool = ref("pencil");
    const shapeStyle = ref("filled");
    const color = ref("#ff5a36");
    const brushSize = ref(10);
    const localBgColor = ref(props.bgColor);
    const localWidth = ref(props.width);
    const localHeight = ref(props.height);
    const hasSelection = ref(false);
    let canvas = null;
    let emitTimer = null;
    let isRestoring = false;
    function focusWidget() {
      var _a;
      (_a = widgetRoot.value) == null ? void 0 : _a.focus();
    }
    function configureCanvasObject(object) {
      if (!canvas || !object || object === canvas.backgroundImage || object.type === "activeSelection") {
        return;
      }
      object.set({
        selectable: true,
        evented: true,
        erasable: true,
        cornerColor: "#0a84ff",
        cornerStrokeColor: "#ffffff",
        borderColor: "#0a84ff",
        cornerSize: 10,
        transparentCorners: false
      });
    }
    function updateSelectionState() {
      hasSelection.value = Boolean(canvas == null ? void 0 : canvas.getActiveObjects().length);
    }
    function updateBackgroundImageScale() {
      if (!(canvas == null ? void 0 : canvas.backgroundImage)) {
        return;
      }
      const backgroundImage = canvas.backgroundImage;
      const imageWidth = backgroundImage.width || localWidth.value;
      const imageHeight = backgroundImage.height || localHeight.value;
      backgroundImage.set({
        originX: "left",
        originY: "top",
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        erasable: false,
        scaleX: localWidth.value / imageWidth,
        scaleY: localHeight.value / imageHeight
      });
    }
    function queueEmitChange() {
      if (!canvas || !props.onChange || isRestoring) {
        return;
      }
      if (emitTimer) {
        clearTimeout(emitTimer);
      }
      emitTimer = setTimeout(() => {
        var _a;
        (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
      }, 25);
    }
    function handleKeydown(event) {
      var _a;
      const target = event.target;
      const tag = target == null ? void 0 : target.tagName;
      const editingText = ((_a = canvas == null ? void 0 : canvas.getActiveObject()) == null ? void 0 : _a.type) === "i-text" && canvas.getActiveObject().isEditing;
      const isTextInput = tag === "INPUT" || tag === "TEXTAREA" || (target == null ? void 0 : target.isContentEditable);
      if (editingText || isTextInput) {
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && hasSelection.value) {
        event.preventDefault();
        deleteSelectedObjects();
      }
    }
    function bindCanvasEvents() {
      if (!canvas) {
        return;
      }
      canvas.on("path:created", (event) => {
        configureCanvasObject(event.path);
        canvas == null ? void 0 : canvas.requestRenderAll();
        updateSelectionState();
        queueEmitChange();
      });
      canvas.on("object:added", (event) => {
        configureCanvasObject(event.target);
        canvas == null ? void 0 : canvas.requestRenderAll();
        updateSelectionState();
        queueEmitChange();
      });
      canvas.on("object:modified", () => {
        canvas == null ? void 0 : canvas.requestRenderAll();
        updateSelectionState();
        queueEmitChange();
      });
      canvas.on("object:removed", () => {
        canvas == null ? void 0 : canvas.requestRenderAll();
        updateSelectionState();
        queueEmitChange();
      });
      canvas.on("selection:created", updateSelectionState);
      canvas.on("selection:updated", updateSelectionState);
      canvas.on("selection:cleared", updateSelectionState);
    }
    onMounted(() => {
      var _a;
      if (!canvasEl.value) {
        return;
      }
      canvas = new fabric.fabric.Canvas(canvasEl.value, {
        width: localWidth.value,
        height: localHeight.value,
        backgroundColor: localBgColor.value,
        isDrawingMode: true,
        preserveObjectStacking: true,
        stopContextMenu: true
      });
      bindCanvasEvents();
      updateBrush();
      updateSelectionState();
      queueEmitChange();
      (_a = widgetRoot.value) == null ? void 0 : _a.addEventListener("keydown", handleKeydown);
    });
    onUnmounted(() => {
      cleanup();
    });
    function cleanup() {
      var _a;
      if (emitTimer) {
        clearTimeout(emitTimer);
        emitTimer = null;
      }
      (_a = widgetRoot.value) == null ? void 0 : _a.removeEventListener("keydown", handleKeydown);
      if (canvas) {
        canvas.dispose();
        canvas = null;
      }
    }
    function updateDimensions() {
      var _a;
      if (!canvas) {
        return;
      }
      localWidth.value = Math.max(64, Math.min(4096, Number(localWidth.value) || 512));
      localHeight.value = Math.max(64, Math.min(4096, Number(localHeight.value) || 512));
      canvas.setWidth(localWidth.value);
      canvas.setHeight(localHeight.value);
      updateBackgroundImageScale();
      canvas.requestRenderAll();
      (_a = props.onUpdateDimensions) == null ? void 0 : _a.call(props, localWidth.value, localHeight.value);
      queueEmitChange();
    }
    function updateBrush() {
      if (!canvas) {
        return;
      }
      canvas.selection = tool.value === "select";
      if (tool.value === "pencil") {
        canvas.isDrawingMode = true;
        const pencil = new fabric.fabric.PencilBrush(canvas);
        pencil.color = color.value;
        pencil.width = brushSize.value;
        canvas.freeDrawingBrush = pencil;
        return;
      }
      if (tool.value === "eraser") {
        canvas.isDrawingMode = true;
        const eraser = new fabric.fabric.EraserBrush(canvas);
        eraser.width = brushSize.value;
        canvas.freeDrawingBrush = eraser;
        return;
      }
      canvas.isDrawingMode = false;
    }
    function updateBackground() {
      if (!canvas) {
        return;
      }
      canvas.backgroundColor = localBgColor.value;
      canvas.requestRenderAll();
      queueEmitChange();
    }
    function setTool(nextTool) {
      tool.value = nextTool;
      updateBrush();
    }
    function triggerImageUpload() {
      var _a;
      (_a = fileInput.value) == null ? void 0 : _a.click();
    }
    function handleImageUpload(event) {
      var _a;
      const target = event.target;
      const file = (_a = target.files) == null ? void 0 : _a[0];
      if (!file || !canvas) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        var _a2;
        const dataUrl = (_a2 = loadEvent.target) == null ? void 0 : _a2.result;
        fabric.fabric.Image.fromURL(dataUrl, (image) => {
          var _a3;
          if (!canvas) {
            return;
          }
          localWidth.value = image.width || 512;
          localHeight.value = image.height || 512;
          canvas.setWidth(localWidth.value);
          canvas.setHeight(localHeight.value);
          image.set({
            originX: "left",
            originY: "top",
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
            erasable: false
          });
          canvas.setBackgroundImage(image, () => {
            updateBackgroundImageScale();
            canvas == null ? void 0 : canvas.requestRenderAll();
          });
          (_a3 = props.onUpdateDimensions) == null ? void 0 : _a3.call(props, localWidth.value, localHeight.value);
          queueEmitChange();
        }, { crossOrigin: "anonymous" });
      };
      reader.readAsDataURL(file);
      target.value = "";
    }
    function buildShapeStyle() {
      if (shapeStyle.value === "outline") {
        return {
          fill: "rgba(0, 0, 0, 0)",
          stroke: color.value,
          strokeWidth: 4
        };
      }
      return {
        fill: color.value,
        stroke: null,
        strokeWidth: 0
      };
    }
    function addShape(shapeType) {
      if (!canvas) {
        return;
      }
      const shapeOptions = {
        left: localWidth.value / 2 - 40,
        top: localHeight.value / 2 - 40,
        ...buildShapeStyle()
      };
      let shape = null;
      if (shapeType === "rect") {
        shape = new fabric.fabric.Rect({ ...shapeOptions, width: 80, height: 80 });
      } else if (shapeType === "circle") {
        shape = new fabric.fabric.Circle({ ...shapeOptions, radius: 40 });
      } else if (shapeType === "triangle") {
        shape = new fabric.fabric.Triangle({ ...shapeOptions, width: 80, height: 80 });
      }
      if (!shape) {
        return;
      }
      configureCanvasObject(shape);
      canvas.add(shape);
      canvas.setActiveObject(shape);
      setTool("select");
      updateSelectionState();
      queueEmitChange();
    }
    function addText() {
      if (!canvas) {
        return;
      }
      const text = new fabric.fabric.IText("Type here", {
        left: localWidth.value / 2 - 60,
        top: localHeight.value / 2 - 16,
        fill: color.value,
        fontSize: 28,
        fontFamily: "Segoe UI"
      });
      configureCanvasObject(text);
      canvas.add(text);
      canvas.setActiveObject(text);
      setTool("select");
      updateSelectionState();
      queueEmitChange();
    }
    function deleteSelectedObjects() {
      if (!canvas) {
        return;
      }
      const selectedObjects = canvas.getActiveObjects().filter((object) => object !== (canvas == null ? void 0 : canvas.backgroundImage));
      if (!selectedObjects.length) {
        return;
      }
      canvas.discardActiveObject();
      selectedObjects.forEach((object) => canvas == null ? void 0 : canvas.remove(object));
      updateSelectionState();
      canvas.requestRenderAll();
      queueEmitChange();
    }
    function resetCanvas() {
      if (!canvas) {
        return;
      }
      canvas.clear();
      canvas.backgroundImage = void 0;
      canvas.backgroundColor = localBgColor.value;
      updateBrush();
      updateSelectionState();
      canvas.requestRenderAll();
      queueEmitChange();
    }
    function serialise() {
      if (!canvas) {
        return "{}";
      }
      return JSON.stringify({
        width: localWidth.value,
        height: localHeight.value,
        bgColor: localBgColor.value,
        state: canvas.toObject(),
        image: canvas.toDataURL({ format: "png", quality: 1 })
      });
    }
    function deserialise(json) {
      if (!canvas || !json) {
        return;
      }
      try {
        const data = JSON.parse(json);
        isRestoring = true;
        localWidth.value = Math.max(64, Number(data.width) || localWidth.value || 512);
        localHeight.value = Math.max(64, Number(data.height) || localHeight.value || 512);
        localBgColor.value = typeof data.bgColor === "string" ? data.bgColor : localBgColor.value;
        canvas.setWidth(localWidth.value);
        canvas.setHeight(localHeight.value);
        canvas.backgroundColor = localBgColor.value;
        if (data.state) {
          canvas.loadFromJSON(data.state, () => {
            canvas == null ? void 0 : canvas.getObjects().forEach((object) => configureCanvasObject(object));
            updateBackgroundImageScale();
            updateSelectionState();
            updateBrush();
            canvas == null ? void 0 : canvas.requestRenderAll();
            isRestoring = false;
          });
          return;
        }
      } catch (error) {
        console.error("Failed to deserialise painter state", error);
      }
      isRestoring = false;
    }
    watch(() => props.width, (value) => {
      if (value !== localWidth.value) {
        localWidth.value = value;
        updateDimensions();
      }
    });
    watch(() => props.height, (value) => {
      if (value !== localHeight.value) {
        localHeight.value = value;
        updateDimensions();
      }
    });
    watch(() => props.bgColor, (value) => {
      if (value !== localBgColor.value) {
        localBgColor.value = value;
        updateBackground();
      }
    });
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "widgetRoot",
        ref: widgetRoot,
        class: "duffy-painter-modern",
        tabindex: "0",
        onPointerdown: focusWidget
      }, [
        createBaseVNode("div", _hoisted_1, [
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("button", {
              class: normalizeClass({ active: tool.value === "pencil" }),
              type: "button",
              title: "Draw",
              onClick: _cache[0] || (_cache[0] = ($event) => setTool("pencil"))
            }, "✏️", 2),
            createBaseVNode("button", {
              class: normalizeClass({ active: tool.value === "eraser" }),
              type: "button",
              title: "Erase",
              onClick: _cache[1] || (_cache[1] = ($event) => setTool("eraser"))
            }, "🧽", 2),
            createBaseVNode("button", {
              class: normalizeClass({ active: tool.value === "select" }),
              type: "button",
              title: "Select and move",
              onClick: _cache[2] || (_cache[2] = ($event) => setTool("select"))
            }, "🖱️", 2)
          ]),
          _cache[13] || (_cache[13] = createBaseVNode("div", { class: "divider" }, null, -1)),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("button", {
              type: "button",
              title: "Add text",
              onClick: addText
            }, "🔤"),
            createBaseVNode("button", {
              type: "button",
              title: "Add rectangle",
              onClick: _cache[3] || (_cache[3] = ($event) => addShape("rect"))
            }, "▭"),
            createBaseVNode("button", {
              type: "button",
              title: "Add circle",
              onClick: _cache[4] || (_cache[4] = ($event) => addShape("circle"))
            }, "◯"),
            createBaseVNode("button", {
              type: "button",
              title: "Add triangle",
              onClick: _cache[5] || (_cache[5] = ($event) => addShape("triangle"))
            }, "△")
          ]),
          _cache[14] || (_cache[14] = createBaseVNode("div", { class: "divider" }, null, -1)),
          createBaseVNode("div", _hoisted_4, [
            createBaseVNode("button", {
              type: "button",
              title: "Upload background image",
              onClick: triggerImageUpload
            }, "📁"),
            createBaseVNode("button", {
              disabled: !hasSelection.value,
              type: "button",
              title: "Delete selected objects",
              onClick: deleteSelectedObjects
            }, "⌫", 8, _hoisted_5),
            createBaseVNode("button", {
              type: "button",
              title: "Reset canvas",
              class: "danger-btn",
              onClick: resetCanvas
            }, "🗑️")
          ])
        ]),
        createBaseVNode("div", _hoisted_6, [
          createBaseVNode("div", _hoisted_7, [
            _cache[15] || (_cache[15] = createBaseVNode("label", { for: "canvas-width" }, "Width", -1)),
            withDirectives(createBaseVNode("input", {
              id: "canvas-width",
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => localWidth.value = $event),
              type: "number",
              class: "dim-input",
              onChange: updateDimensions
            }, null, 544), [
              [
                vModelText,
                localWidth.value,
                void 0,
                { number: true }
              ]
            ])
          ]),
          createBaseVNode("div", _hoisted_8, [
            _cache[16] || (_cache[16] = createBaseVNode("label", { for: "canvas-height" }, "Height", -1)),
            withDirectives(createBaseVNode("input", {
              id: "canvas-height",
              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => localHeight.value = $event),
              type: "number",
              class: "dim-input",
              onChange: updateDimensions
            }, null, 544), [
              [
                vModelText,
                localHeight.value,
                void 0,
                { number: true }
              ]
            ])
          ]),
          _cache[20] || (_cache[20] = createBaseVNode("div", { class: "divider" }, null, -1)),
          createBaseVNode("div", _hoisted_9, [
            _cache[17] || (_cache[17] = createBaseVNode("label", { for: "draw-color" }, "Color", -1)),
            createBaseVNode("div", _hoisted_10, [
              withDirectives(createBaseVNode("input", {
                id: "draw-color",
                "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => color.value = $event),
                type: "color",
                onInput: updateBrush
              }, null, 544), [
                [vModelText, color.value]
              ])
            ])
          ]),
          createBaseVNode("div", _hoisted_11, [
            _cache[18] || (_cache[18] = createBaseVNode("label", { for: "background-color" }, "Canvas", -1)),
            createBaseVNode("div", _hoisted_12, [
              withDirectives(createBaseVNode("input", {
                id: "background-color",
                "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => localBgColor.value = $event),
                type: "color",
                onInput: updateBackground
              }, null, 544), [
                [vModelText, localBgColor.value]
              ])
            ])
          ]),
          _cache[21] || (_cache[21] = createBaseVNode("div", { class: "divider" }, null, -1)),
          createBaseVNode("div", _hoisted_13, [
            _cache[19] || (_cache[19] = createBaseVNode("span", null, "Shape", -1)),
            createBaseVNode("div", _hoisted_14, [
              createBaseVNode("button", {
                class: normalizeClass([{ active: shapeStyle.value === "filled" }, "mode-button"]),
                type: "button",
                onClick: _cache[10] || (_cache[10] = ($event) => shapeStyle.value = "filled")
              }, "Fill", 2),
              createBaseVNode("button", {
                class: normalizeClass([{ active: shapeStyle.value === "outline" }, "mode-button"]),
                type: "button",
                onClick: _cache[11] || (_cache[11] = ($event) => shapeStyle.value = "outline")
              }, "Outline", 2)
            ])
          ])
        ]),
        createBaseVNode("div", _hoisted_15, [
          createBaseVNode("div", _hoisted_16, [
            _cache[22] || (_cache[22] = createBaseVNode("label", { for: "brush-size" }, "Tool size", -1)),
            withDirectives(createBaseVNode("input", {
              id: "brush-size",
              "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => brushSize.value = $event),
              type: "range",
              min: "1",
              max: "150",
              class: "styled-slider",
              onInput: updateBrush
            }, null, 544), [
              [
                vModelText,
                brushSize.value,
                void 0,
                { number: true }
              ]
            ]),
            createBaseVNode("span", _hoisted_17, toDisplayString(brushSize.value) + "px", 1)
          ]),
          createBaseVNode("div", _hoisted_18, toDisplayString(hasSelection.value ? "Selection ready for move or delete" : "Tip: focus the widget and press Delete to remove selected objects"), 1)
        ]),
        createBaseVNode("input", {
          ref_key: "fileInput",
          ref: fileInput,
          type: "file",
          accept: "image/*",
          class: "hidden-upload",
          onChange: handleImageUpload
        }, null, 544),
        createBaseVNode("div", {
          ref_key: "canvasWrapper",
          ref: canvasWrapper,
          class: "canvas-wrapper",
          onPointerdown: withModifiers(focusWidget, ["stop"])
        }, [
          createBaseVNode("canvas", {
            ref_key: "canvasEl",
            ref: canvasEl
          }, null, 512)
        ], 544)
      ], 544);
    };
  }
});
const PainterWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3cee2115"]]);
const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 512;
const DEFAULT_BG_COLOR = "#ffffff";
const MIN_W = 480;
const MIN_H = 360;
const NODE_CHROME_HEIGHT = 220;
function parseStoredState(raw) {
  const fallback = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    bgColor: DEFAULT_BG_COLOR
  };
  if (typeof raw !== "string" || !raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      width: Number(parsed.width) || fallback.width,
      height: Number(parsed.height) || fallback.height,
      bgColor: typeof parsed.bgColor === "string" ? parsed.bgColor : fallback.bgColor
    };
  } catch {
    return fallback;
  }
}
function computeNodeSize(width, height) {
  return [Math.max(MIN_W, width + 48), Math.max(MIN_H, height + NODE_CHROME_HEIGHT)];
}
app.registerExtension({
  name: "Duffy.PainterNode.Vue",
  async nodeCreated(node) {
    var _a, _b;
    if (node.comfyClass !== "Duffy_PainterNode") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "json_data");
    if (!dataWidget) return;
    dataWidget.type = "hidden";
    dataWidget.hidden = true;
    dataWidget.computeSize = () => [0, 0];
    dataWidget.draw = () => {
    };
    const initialState = parseStoredState(dataWidget.value);
    const state = reactive({
      width: initialState.width,
      height: initialState.height,
      bgColor: initialState.bgColor
    });
    const container = document.createElement("div");
    container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden; position:relative; isolation:isolate;";
    const stopCanvasEvent = (event) => event.stopPropagation();
    container.addEventListener("pointerdown", stopCanvasEvent);
    container.addEventListener("wheel", stopCanvasEvent);
    let widgetRef = null;
    const vueApp = createApp({
      render() {
        return h(PainterWidget, {
          ref: (r) => {
            widgetRef = r;
          },
          width: state.width,
          height: state.height,
          bgColor: state.bgColor,
          onChange: (json) => {
            dataWidget.value = json;
            const nextState = parseStoredState(json);
            state.width = nextState.width;
            state.height = nextState.height;
            state.bgColor = nextState.bgColor;
            if (node.setSize) {
              node.setSize(computeNodeSize(state.width, state.height));
            }
            node.setDirtyCanvas(true, true);
          },
          onUpdateDimensions: (newWidth, newHeight) => {
            state.width = newWidth;
            state.height = newHeight;
            if (node.setSize) {
              node.setSize(computeNodeSize(newWidth, newHeight));
            }
          }
        });
      }
    });
    vueApp.mount(container);
    const domWidget = node.addDOMWidget("painter_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => computeNodeSize(state.width, state.height);
    if (dataWidget == null ? void 0 : dataWidget.value) {
      widgetRef == null ? void 0 : widgetRef.deserialise(dataWidget.value);
    }
    (_b = node.setSize) == null ? void 0 : _b.call(node, computeNodeSize(state.width, state.height));
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      (_a2 = widgetRef == null ? void 0 : widgetRef.cleanup) == null ? void 0 : _a2.call(widgetRef);
      vueApp.unmount();
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
  }
});
(function() {
  "use strict";
  try {
    if (typeof document != "undefined") {
      var elementStyle = document.createElement("style");
      elementStyle.appendChild(document.createTextNode(`.interactive-relight-root[data-v-3aa67706] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 600px;\r
  background: #1a1a1a;\r
  color: #e0e0e0;\r
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\r
  box-sizing: border-box;\r
  border-radius: 8px;\r
  overflow: hidden;\r
  border: 1px solid #333;
}
.canvas-container[data-v-3aa67706] {\r
  flex: 1;\r
  background: #000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;\r
  position: relative;\r
  min-height: 300px;
}
canvas[data-v-3aa67706] {\r
  max-width: 100%;\r
  max-height: 100%;\r
  object-fit: contain;\r
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
}
.controls-panel[data-v-3aa67706] {\r
  height: 280px;\r
  padding: 16px;\r
  background: #252525;\r
  border-top: 1px solid #333;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 12px;
}
.panel-header[data-v-3aa67706] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;
}
.panel-header h4[data-v-3aa67706] {\r
  margin: 0;\r
  font-size: 16px;\r
  color: #fff;\r
  letter-spacing: 0.5px;
}
.lights-scroll-area[data-v-3aa67706] {\r
  flex: 1;\r
  overflow-x: auto;\r
  overflow-y: hidden;\r
  display: flex;\r
  gap: 12px;\r
  padding-bottom: 8px;
}\r
\r
/* Custom Scrollbar */
.lights-scroll-area[data-v-3aa67706]::-webkit-scrollbar {\r
  height: 6px;
}
.lights-scroll-area[data-v-3aa67706]::-webkit-scrollbar-track {\r
  background: #1a1a1a;
}
.lights-scroll-area[data-v-3aa67706]::-webkit-scrollbar-thumb {\r
  background: #444;\r
  border-radius: 3px;
}
.lights-scroll-area[data-v-3aa67706]::-webkit-scrollbar-thumb:hover {\r
  background: #555;
}
.light-item[data-v-3aa67706] {\r
  min-width: 220px;\r
  background: #323232;\r
  padding: 12px;\r
  border-radius: 6px;\r
  font-size: 12px;\r
  border: 1px solid #444;\r
  transition: border-color 0.2s;
}
.light-item[data-v-3aa67706]:hover {\r
  border-color: #555;
}
.light-header[data-v-3aa67706] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  margin-bottom: 10px;\r
  font-weight: 600;\r
  border-bottom: 1px solid #444;\r
  padding-bottom: 6px;
}
.light-controls-grid[data-v-3aa67706] {\r
  display: grid;\r
  grid-template-columns: 1fr;\r
  gap: 8px;
}
.control-row[data-v-3aa67706] {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;
}
.control-row label[data-v-3aa67706] {\r
  flex: 0 0 70px;\r
  color: #aaa;
}
.control-row input[data-v-3aa67706], .control-row select[data-v-3aa67706] {\r
  flex: 1;\r
  background: #1a1a1a;\r
  color: #fff;\r
  border: 1px solid #444;\r
  border-radius: 3px;\r
  padding: 2px 4px;
}
.control-row input[type="range"][data-v-3aa67706] {\r
  height: 4px;\r
  appearance: none;\r
  background: #444;\r
  outline: none;\r
  border-radius: 2px;
}
.control-row input[type="range"][data-v-3aa67706]::-webkit-slider-thumb {\r
  appearance: none;\r
  width: 12px;\r
  height: 12px;\r
  background: #278;\r
  border-radius: 50%;\r
  cursor: pointer;
}
.footer-actions[data-v-3aa67706] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  gap: 16px;
}
.add-buttons[data-v-3aa67706] {\r
  display: flex;\r
  gap: 8px;
}
.btn[data-v-3aa67706] {\r
  background: #3a3a3a;\r
  color: #fff;\r
  border: 1px solid #555;\r
  border-radius: 4px;\r
  padding: 6px 12px;\r
  cursor: pointer;\r
  font-size: 13px;\r
  transition: all 0.2s;\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;
}
.btn[data-v-3aa67706]:hover {\r
  background: #4a4a4a;\r
  border-color: #666;
}
.btn-danger[data-v-3aa67706] {\r
  background: #622;\r
  border-color: #833;\r
  padding: 2px 6px;\r
  font-size: 11px;
}
.btn-danger[data-v-3aa67706]:hover {\r
  background: #833;
}
.btn-primary[data-v-3aa67706] {\r
  background: #165;\r
  border-color: #286;\r
  font-weight: 600;\r
  padding: 8px 24px;\r
  font-size: 14px;\r
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.btn-primary[data-v-3aa67706]:hover {\r
  background: #286;\r
  transform: translateY(-1px);\r
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}
.idle-state[data-v-3aa67706] {\r
  height: 600px;\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  background: #111;\r
  color: #666;\r
  gap: 12px;
}
.pulse[data-v-3aa67706] {\r
  width: 12px;\r
  height: 12px;\r
  background: #379;\r
  border-radius: 50%;\r
  animation: pulse-animation-3aa67706 2s infinite;
}
@keyframes pulse-animation-3aa67706 {
0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7);
}
70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0);
}
100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0);
}
}\r

.layer-control-root[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 100%;\r
  padding: 16px;\r
  color: #f1ecdf;\r
  background:\r
    radial-gradient(circle at top left, rgba(224, 123, 43, 0.22), transparent 34%),\r
    linear-gradient(180deg, #171a1f 0%, #0f1218 100%);\r
  border-radius: 18px;\r
  box-sizing: border-box;\r
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;\r
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.layer-header[data-v-a197c0be] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: flex-start;\r
  gap: 16px;\r
  margin-bottom: 14px;
}
.layer-header h3[data-v-a197c0be] {\r
  margin: 0;\r
  font-size: 22px;\r
  letter-spacing: 0.04em;
}
.layer-header p[data-v-a197c0be] {\r
  margin: 6px 0 0;\r
  max-width: 720px;\r
  color: #c7c0b2;\r
  font-size: 13px;
}
.apply-button[data-v-a197c0be] {\r
  min-width: 180px;\r
  height: 42px;\r
  padding: 0 18px;\r
  color: #fff6eb;\r
  background: linear-gradient(180deg, #dd7a31, #a8481a);\r
  border: 1px solid rgba(255, 240, 220, 0.28);\r
  border-radius: 12px;\r
  cursor: pointer;\r
  font-weight: 700;\r
  letter-spacing: 0.04em;
}
.workspace-grid[data-v-a197c0be] {\r
  display: grid;\r
  grid-template-columns: minmax(0, 1.75fr) minmax(320px, 0.95fr);\r
  gap: 14px;\r
  min-height: 0;\r
  flex: 1;
}
.canvas-shell[data-v-a197c0be],\r
.sidebar-card[data-v-a197c0be] {\r
  background: rgba(25, 28, 34, 0.92);\r
  border: 1px solid rgba(255, 255, 255, 0.06);\r
  border-radius: 16px;\r
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.canvas-shell[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  min-height: 0;\r
  overflow: hidden;
}
.canvas-meta[data-v-a197c0be] {\r
  display: flex;\r
  justify-content: space-between;\r
  padding: 12px 14px;\r
  font-size: 12px;\r
  text-transform: uppercase;\r
  letter-spacing: 0.06em;\r
  color: #d7cab5;\r
  background: rgba(255, 255, 255, 0.03);
}
.canvas-stage[data-v-a197c0be] {\r
  flex: 1;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  min-height: 0;\r
  padding: 16px;\r
  overflow: hidden;\r
  background:\r
    linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%),\r
    linear-gradient(-45deg, rgba(255,255,255,0.03) 25%, transparent 25%),\r
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.03) 75%),\r
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.03) 75%);\r
  background-size: 24px 24px;\r
  background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
}
.canvas-stage canvas[data-v-a197c0be] {\r
  border-radius: 10px;\r
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45);
}
[data-v-a197c0be] .canvas-container {\r
  flex-shrink: 0;\r
  margin: auto;
}
.sidebar[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 14px;\r
  min-height: 0;\r
  padding-bottom: 16px;
}
.sidebar-card[data-v-a197c0be] {\r
  padding: 14px;
}
.card-title-row[data-v-a197c0be] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: baseline;\r
  gap: 8px;\r
  margin-bottom: 12px;
}
.card-title-row h4[data-v-a197c0be] {\r
  margin: 0;\r
  font-size: 15px;\r
  letter-spacing: 0.04em;
}
.card-kicker[data-v-a197c0be] {\r
  color: #9eaaba;\r
  font-size: 11px;\r
  text-transform: uppercase;\r
  letter-spacing: 0.06em;
}
.layer-list[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 8px;
}
.layer-item[data-v-a197c0be] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  gap: 10px;\r
  width: 100%;\r
  padding: 10px 12px;\r
  color: inherit;\r
  background: linear-gradient(180deg, rgba(62, 67, 75, 0.72), rgba(43, 47, 53, 0.72));\r
  border: 1px solid rgba(255, 255, 255, 0.08);\r
  border-radius: 12px;\r
  cursor: pointer;\r
  text-align: left;
}
.layer-item.selected[data-v-a197c0be] {\r
  border-color: rgba(233, 149, 79, 0.72);\r
  box-shadow: inset 0 0 0 1px rgba(233, 149, 79, 0.3);
}
.layer-item strong[data-v-a197c0be],\r
.layer-item small[data-v-a197c0be] {\r
  display: block;
}
.layer-item small[data-v-a197c0be] {\r
  margin-top: 3px;\r
  color: #a8b3c3;
}
.visibility-toggle[data-v-a197c0be] {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 8px;\r
  font-size: 11px;\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
  color: #d2d9e3;
}
.field-grid[data-v-a197c0be] {\r
  display: grid;\r
  gap: 10px;
}
.field-grid.two-col[data-v-a197c0be] {\r
  grid-template-columns: repeat(2, minmax(0, 1fr));\r
  margin-bottom: 12px;
}
.field-grid label[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 6px;\r
  font-size: 11px;\r
  text-transform: uppercase;\r
  letter-spacing: 0.06em;\r
  color: #cfd8e3;
}
.field-grid input[data-v-a197c0be] {\r
  width: 100%;\r
  box-sizing: border-box;
}
input[type="number"][data-v-a197c0be],\r
input[type="range"][data-v-a197c0be] {\r
  accent-color: #d97833;
}
input[type="number"][data-v-a197c0be] {\r
  padding: 8px 10px;\r
  color: #f4efe7;\r
  background: #11141a;\r
  border: 1px solid rgba(255, 255, 255, 0.09);\r
  border-radius: 10px;
}
.button-grid[data-v-a197c0be] {\r
  display: grid;\r
  grid-template-columns: repeat(2, minmax(0, 1fr));\r
  gap: 8px;\r
  margin-top: 14px;
}
.button-grid button[data-v-a197c0be],\r
.apply-button[data-v-a197c0be] {\r
  transition: transform 0.18s ease, filter 0.18s ease;
}
.button-grid button[data-v-a197c0be] {\r
  min-height: 38px;\r
  padding: 0 12px;\r
  color: #fff4e5;\r
  background: linear-gradient(180deg, #464c55, #343941);\r
  border: 1px solid rgba(255, 255, 255, 0.08);\r
  border-radius: 10px;\r
  cursor: pointer;\r
  font-weight: 600;
}
.button-grid button.danger[data-v-a197c0be] {\r
  background: linear-gradient(180deg, #82473d, #633129);
}
.button-grid button[data-v-a197c0be]:hover,\r
.apply-button[data-v-a197c0be]:hover {\r
  filter: brightness(1.06);\r
  transform: translateY(-1px);
}
.empty-card[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  justify-content: center;\r
  min-height: 180px;
}
.empty-card h4[data-v-a197c0be],\r
.empty-card p[data-v-a197c0be] {\r
  margin: 0;
}
.empty-card p[data-v-a197c0be] {\r
  margin-top: 8px;\r
  color: #b0b7c0;\r
  line-height: 1.5;
}
.idle-state[data-v-a197c0be] {\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  gap: 10px;\r
  width: 100%;\r
  height: 720px;\r
  color: #d7d0c3;\r
  background:\r
    radial-gradient(circle at center, rgba(223, 121, 51, 0.12), transparent 38%),\r
    linear-gradient(180deg, #16191e 0%, #101318 100%);\r
  border-radius: 18px;
}
.idle-state p[data-v-a197c0be],\r
.idle-state small[data-v-a197c0be] {\r
  margin: 0;
}
.pulse[data-v-a197c0be] {\r
  width: 14px;\r
  height: 14px;\r
  border-radius: 999px;\r
  background: #df7f2f;\r
  box-shadow: 0 0 0 0 rgba(223, 127, 47, 0.55);\r
  animation: pulse-a197c0be 1.8s infinite;
}
@keyframes pulse-a197c0be {
0% {\r
    box-shadow: 0 0 0 0 rgba(223, 127, 47, 0.55);
}
70% {\r
    box-shadow: 0 0 0 14px rgba(223, 127, 47, 0);
}
100% {\r
    box-shadow: 0 0 0 0 rgba(223, 127, 47, 0);
}
}
@media (max-width: 1100px) {
.workspace-grid[data-v-a197c0be] {\r
    grid-template-columns: 1fr;
}
.layer-control-root[data-v-a197c0be] {\r
    height: auto;\r
    min-height: 720px;
}
.canvas-shell[data-v-a197c0be] {\r
    min-height: 420px;
}
}\r

.advanced-adjuster-root[data-v-69d000bf] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 600px;\r
  background: #1a1a1a;\r
  color: #e0e0e0;\r
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\r
  box-sizing: border-box;\r
  border-radius: 8px;\r
  overflow: hidden;\r
  border: 1px solid #333;
}
.preview-container[data-v-69d000bf] {\r
  flex: 1;\r
  background: #000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;\r
  position: relative;\r
  min-height: 300px;
}
.preview-image[data-v-69d000bf] {\r
  max-width: 100%;\r
  max-height: 100%;\r
  object-fit: contain;\r
  box-shadow: 0 0 20px rgba(0,0,0,0.8);\r
  transition: filter 0.1s;
}
.controls-panel[data-v-69d000bf] {\r
  padding: 16px;\r
  background: #252525;\r
  border-top: 1px solid #333;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 16px;
}
.panel-header[data-v-69d000bf] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;
}
.panel-header h4[data-v-69d000bf] {\r
  margin: 0;\r
  font-size: 16px;\r
  color: #fff;\r
  letter-spacing: 0.5px;
}
.adjustments-area[data-v-69d000bf] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 12px;
}
.control-row[data-v-69d000bf] {\r
  display: flex;\r
  align-items: center;\r
  gap: 16px;\r
  background: #323232;\r
  padding: 8px 12px;\r
  border-radius: 6px;\r
  border: 1px solid #444;
}
.label-col[data-v-69d000bf] {\r
  width: 120px;\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;
}
.label-col label[data-v-69d000bf] {\r
  color: #aaa;\r
  font-size: 13px;\r
  font-weight: 500;
}
.label-col .val[data-v-69d000bf] {\r
  color: #fff;\r
  font-family: monospace;\r
  font-size: 12px;\r
  background: #1a1a1a;\r
  padding: 2px 6px;\r
  border-radius: 3px;\r
  min-width: 36px;\r
  text-align: right;
}
.control-row input[type="range"][data-v-69d000bf] {\r
  flex: 1;\r
  height: 6px;\r
  appearance: none;\r
  background: #1a1a1a;\r
  outline: none;\r
  border-radius: 3px;\r
  border: 1px solid #444;
}
.control-row input[type="range"][data-v-69d000bf]::-webkit-slider-thumb {\r
  appearance: none;\r
  width: 16px;\r
  height: 16px;\r
  background: #379;\r
  border-radius: 50%;\r
  cursor: pointer;\r
  border: 2px solid #fff;\r
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
.control-row input[type="range"][data-v-69d000bf]::-webkit-slider-thumb:hover {\r
  background: #48a;\r
  transform: scale(1.1);
}
.reset-row[data-v-69d000bf] {\r
  display: flex;\r
  justify-content: flex-end;\r
  margin-top: 4px;
}
.btn[data-v-69d000bf] {\r
  background: #3a3a3a;\r
  color: #fff;\r
  border: 1px solid #555;\r
  border-radius: 4px;\r
  padding: 6px 12px;\r
  cursor: pointer;\r
  font-size: 13px;\r
  transition: all 0.2s;
}
.btn[data-v-69d000bf]:hover {\r
  background: #4a4a4a;\r
  border-color: #666;
}
.btn-secondary[data-v-69d000bf] {\r
  background: #444;\r
  border-color: #555;\r
  font-size: 12px;\r
  padding: 4px 10px;
}
.btn-secondary[data-v-69d000bf]:hover {\r
  background: #555;\r
  border-color: #777;
}
.btn-primary[data-v-69d000bf] {\r
  background: #165;\r
  border-color: #286;\r
  font-weight: 600;\r
  padding: 8px 24px;\r
  font-size: 14px;\r
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.btn-primary[data-v-69d000bf]:hover {\r
  background: #286;\r
  transform: translateY(-1px);\r
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}
.idle-state[data-v-69d000bf] {\r
  height: 600px;\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  background: #111;\r
  color: #666;\r
  gap: 12px;
}
.pulse[data-v-69d000bf] {\r
  width: 12px;\r
  height: 12px;\r
  background: #379;\r
  border-radius: 50%;\r
  animation: pulse-animation-69d000bf 2s infinite;
}
@keyframes pulse-animation-69d000bf {
0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7);
}
70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0);
}
100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0);
}
}\r

.advanced-text-overlay-root[data-v-cf15eb50] {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 700px;\r
  background: #1a1a1a;\r
  color: #e0e0e0;\r
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\r
  box-sizing: border-box;\r
  border-radius: 8px;\r
  overflow: hidden;\r
  border: 1px solid #333;
}
.canvas-container[data-v-cf15eb50] {\r
  flex: 1;\r
  background: #000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;\r
  position: relative;\r
  min-height: 200px;
}
canvas[data-v-cf15eb50] {\r
  max-width: 100%;\r
  max-height: 100%;\r
  object-fit: contain;\r
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
}
.controls-panel[data-v-cf15eb50] {\r
  height: 340px;\r
  padding: 16px;\r
  background: #252525;\r
  border-top: 1px solid #333;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 12px;
}
.panel-header[data-v-cf15eb50] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;
}
.panel-header h4[data-v-cf15eb50] {\r
  margin: 0;\r
  font-size: 16px;\r
  color: #fff;\r
  letter-spacing: 0.5px;
}
.overlays-scroll-area[data-v-cf15eb50] {\r
  flex: 1;\r
  overflow-x: auto;\r
  overflow-y: auto;\r
  display: flex;\r
  gap: 12px;\r
  padding-bottom: 8px;
}
.overlays-scroll-area[data-v-cf15eb50]::-webkit-scrollbar {\r
  height: 6px;
}
.overlays-scroll-area[data-v-cf15eb50]::-webkit-scrollbar-track {\r
  background: #1a1a1a;
}
.overlays-scroll-area[data-v-cf15eb50]::-webkit-scrollbar-thumb {\r
  background: #444;\r
  border-radius: 3px;
}
.overlays-scroll-area[data-v-cf15eb50]::-webkit-scrollbar-thumb:hover {\r
  background: #555;
}
.overlay-item[data-v-cf15eb50] {\r
  min-width: 240px;\r
  background: #323232;\r
  padding: 12px;\r
  border-radius: 6px;\r
  font-size: 12px;\r
  border: 1px solid #444;\r
  transition: border-color 0.2s;
}
.overlay-item[data-v-cf15eb50]:hover {\r
  border-color: #555;
}
.overlay-header[data-v-cf15eb50] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  margin-bottom: 10px;\r
  font-weight: 600;\r
  border-bottom: 1px solid #444;\r
  padding-bottom: 6px;
}
.overlay-controls-grid[data-v-cf15eb50] {\r
  display: grid;\r
  grid-template-columns: 1fr;\r
  gap: 8px;
}
.control-row[data-v-cf15eb50] {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;
}
.control-row label[data-v-cf15eb50] {\r
  flex: 0 0 50px;\r
  color: #aaa;
}
.control-row input[data-v-cf15eb50], .control-row select[data-v-cf15eb50] {\r
  flex: 1;\r
  background: #1a1a1a;\r
  color: #fff;\r
  border: 1px solid #444;\r
  border-radius: 3px;\r
  padding: 4px;
}
.control-row input[type="range"][data-v-cf15eb50] {\r
  height: 4px;\r
  appearance: none;\r
  background: #444;\r
  outline: none;\r
  border-radius: 2px;\r
  padding: 0;
}
.control-row input[type="range"][data-v-cf15eb50]::-webkit-slider-thumb {\r
  appearance: none;\r
  width: 12px;\r
  height: 12px;\r
  background: #278;\r
  border-radius: 50%;\r
  cursor: pointer;
}
.control-row input[type="color"][data-v-cf15eb50] {\r
  padding: 0;\r
  height: 24px;
}
.footer-actions[data-v-cf15eb50] {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  gap: 16px;
}
.btn[data-v-cf15eb50] {\r
  background: #3a3a3a;\r
  color: #fff;\r
  border: 1px solid #555;\r
  border-radius: 4px;\r
  padding: 6px 12px;\r
  cursor: pointer;\r
  font-size: 13px;\r
  transition: all 0.2s;\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;
}
.btn[data-v-cf15eb50]:hover {\r
  background: #4a4a4a;\r
  border-color: #666;
}
.btn-danger[data-v-cf15eb50] {\r
  background: #622;\r
  border-color: #833;\r
  padding: 2px 6px;\r
  font-size: 11px;
}
.btn-danger[data-v-cf15eb50]:hover {\r
  background: #833;
}
.btn-primary[data-v-cf15eb50] {\r
  background: #165;\r
  border-color: #286;\r
  font-weight: 600;\r
  padding: 8px 24px;\r
  font-size: 14px;\r
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.btn-primary[data-v-cf15eb50]:hover {\r
  background: #286;\r
  transform: translateY(-1px);\r
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}
.idle-state[data-v-cf15eb50] {\r
  height: 600px;\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  background: #111;\r
  color: #666;\r
  gap: 12px;
}
.pulse[data-v-cf15eb50] {\r
  width: 12px;\r
  height: 12px;\r
  background: #379;\r
  border-radius: 50%;\r
  animation: pulse-animation-cf15eb50 2s infinite;
}
@keyframes pulse-animation-cf15eb50 {
0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7);
}
70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0);
}
100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0);
}
}\r

.advanced-stitch-root[data-v-d59fd744] {\r
  display: flex;\r
  flex-direction: row;\r
  width: 100%;\r
  height: 640px;\r
  background: #1a1a1a;\r
  color: #e0e0e0;\r
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\r
  box-sizing: border-box;\r
  border-radius: 8px;\r
  overflow: hidden;\r
  border: 1px solid #333;
}
.preview-container[data-v-d59fd744] {\r
  flex: 1;\r
  background: #000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;\r
  position: relative;\r
  padding: 16px;
}
.preview-layout[data-v-d59fd744] {\r
  display: flex;\r
  max-width: 100%;\r
  max-height: 100%;\r
  border: 1px dashed #444;\r
  background: rgba(255,255,255,0.02);
}
.layout-horizontal[data-v-d59fd744] {\r
  flex-direction: row;\r
  align-items: stretch;
}
.layout-horizontal img[data-v-d59fd744] {\r
  height: 100%;\r
  width: auto;\r
  object-fit: contain;
}
.layout-vertical[data-v-d59fd744] {\r
  flex-direction: column;\r
  align-items: center;
}
.layout-vertical img[data-v-d59fd744] {\r
  width: 100%;\r
  height: auto;\r
  object-fit: contain;
}
.layout-grid[data-v-d59fd744] {\r
  display: grid;\r
  grid-template-columns: repeat(3, 1fr);\r
  grid-template-rows: repeat(3, 1fr);\r
  gap: 2px;\r
  background: #222;\r
  aspect-ratio: 1;\r
  height: 100%;\r
  max-height: 100%;
}
.preview-cell[data-v-d59fd744] {\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  overflow: hidden;
}
.grid-cell[data-v-d59fd744] {\r
  background: #000;
}
.grid-cell img[data-v-d59fd744] {\r
  width: 100%;\r
  height: 100%;\r
  object-fit: cover;
}
.controls-panel[data-v-d59fd744] {\r
  width: 320px;\r
  background: #252525;\r
  border-left: 1px solid #333;\r
  display: flex;\r
  flex-direction: column;
}
.panel-header[data-v-d59fd744] {\r
  padding: 16px;\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  border-bottom: 1px solid #333;\r
  flex-direction: column;\r
  gap: 12px;\r
  align-items: flex-start;
}
.panel-header h4[data-v-d59fd744] {\r
  margin: 0;\r
  font-size: 16px;\r
  color: #fff;\r
  letter-spacing: 0.5px;
}
.controls-body[data-v-d59fd744] {\r
  padding: 16px;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 16px;\r
  overflow-y: auto;
}
.control-row[data-v-d59fd744] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 8px;
}
.control-row label[data-v-d59fd744] {\r
  color: #aaa;\r
  font-size: 13px;\r
  font-weight: 500;
}
select[data-v-d59fd744] {\r
  background: #1a1a1a;\r
  color: #fff;\r
  border: 1px solid #444;\r
  border-radius: 4px;\r
  padding: 6px 8px;\r
  outline: none;\r
  font-size: 13px;
}
.section-subtitle[data-v-d59fd744] {\r
  font-size: 13px;\r
  color: #888;\r
  margin: 0 0 12px 0;\r
  border-bottom: 1px solid #333;\r
  padding-bottom: 4px;
}
.grid-controls[data-v-d59fd744] {\r
  display: flex;\r
  flex-direction: column;
}
.mapping-grid[data-v-d59fd744] {\r
  display: grid;\r
  grid-template-columns: repeat(3, 1fr);\r
  gap: 8px;
}
.mapping-cell[data-v-d59fd744] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 4px;\r
  background: #323232;\r
  padding: 6px;\r
  border-radius: 4px;\r
  border: 1px solid #444;
}
.mapping-cell label[data-v-d59fd744] {\r
  font-size: 11px;\r
  color: #aaa;\r
  text-align: center;
}
.mapping-cell select[data-v-d59fd744] {\r
  font-size: 11px;\r
  padding: 2px 4px;
}
.info-text[data-v-d59fd744] {\r
  font-size: 13px;\r
  color: #aaa;\r
  line-height: 1.4;\r
  background: #323232;\r
  padding: 12px;\r
  border-radius: 6px;\r
  border: 1px solid #444;
}
.btn-primary[data-v-d59fd744] {\r
  width: 100%;\r
  background: #165;\r
  color: #fff;\r
  border: 1px solid #286;\r
  border-radius: 4px;\r
  padding: 10px;\r
  font-weight: 600;\r
  font-size: 14px;\r
  cursor: pointer;\r
  transition: all 0.2s;\r
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.btn-primary[data-v-d59fd744]:hover {\r
  background: #286;\r
  transform: translateY(-1px);\r
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}
.idle-state[data-v-d59fd744] {\r
  height: 640px;\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  justify-content: center;\r
  background: #111;\r
  color: #666;\r
  gap: 12px;
}
.pulse[data-v-d59fd744] {\r
  width: 12px;\r
  height: 12px;\r
  background: #379;\r
  border-radius: 50%;\r
  animation: pulse-animation-d59fd744 2s infinite;
}
@keyframes pulse-animation-d59fd744 {
0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7);
}
70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0);
}
100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0);
}
}\r

.duffy-painter-modern[data-v-3cee2115] {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 8px;\r
  width: 100%;\r
  padding: 12px;\r
  color: #f4f1ea;\r
  background:\r
    linear-gradient(180deg, rgba(31, 33, 36, 0.98), rgba(22, 24, 28, 0.98)),\r
    radial-gradient(circle at top left, rgba(255, 154, 88, 0.18), transparent 28%);\r
  border-radius: 14px;\r
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 24px rgba(0, 0, 0, 0.32);\r
  font-family: "Segoe UI", "Trebuchet MS", sans-serif;\r
  isolation: isolate;\r
  outline: none;
}
.toolbar[data-v-3cee2115] {\r
  display: flex;\r
  flex-wrap: wrap;\r
  gap: 12px;\r
  align-items: center;\r
  padding: 8px 14px;\r
  background: rgba(48, 51, 57, 0.88);\r
  border: 1px solid rgba(255, 255, 255, 0.06);\r
  border-radius: 10px;
}
.tertiary-toolbar[data-v-3cee2115] {\r
  align-items: flex-start;
}
.tool-group[data-v-3cee2115] {\r
  display: flex;\r
  gap: 6px;
}
.tool-group.right-align[data-v-3cee2115] {\r
  margin-left: auto;
}
.divider[data-v-3cee2115] {\r
  width: 1px;\r
  height: 24px;\r
  background: rgba(255, 255, 255, 0.14);
}
button[data-v-3cee2115] {\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  min-width: 38px;\r
  height: 38px;\r
  padding: 0 12px;\r
  color: #fff9f0;\r
  background: linear-gradient(180deg, #484c55, #373a42);\r
  border: 1px solid rgba(255, 255, 255, 0.08);\r
  border-radius: 8px;\r
  cursor: pointer;\r
  transition: background 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
}
button[data-v-3cee2115]:hover:not(:disabled) {\r
  background: linear-gradient(180deg, #585d67, #3f434b);\r
  transform: translateY(-1px);
}
button.active[data-v-3cee2115] {\r
  background: linear-gradient(180deg, #d16b2d, #aa4a16);\r
  border-color: rgba(255, 206, 150, 0.45);
}
button[data-v-3cee2115]:disabled {\r
  opacity: 0.45;\r
  cursor: default;
}
button.danger-btn[data-v-3cee2115] {\r
  background: linear-gradient(180deg, #944343, #702d2d);
}
.mode-button[data-v-3cee2115] {\r
  min-width: 74px;\r
  font-size: 12px;\r
  font-weight: 600;
}
.config-item[data-v-3cee2115] {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  font-size: 12px;\r
  font-weight: 700;\r
  letter-spacing: 0.04em;\r
  text-transform: uppercase;\r
  color: #c8d0db;
}
.mode-toggle[data-v-3cee2115] {\r
  margin-left: auto;
}
.toggle-group[data-v-3cee2115] {\r
  display: flex;\r
  gap: 6px;
}
.dim-input[data-v-3cee2115] {\r
  width: 64px;\r
  padding: 5px 6px;\r
  color: #f6f2eb;\r
  background: #17191d;\r
  border: 1px solid rgba(255, 255, 255, 0.1);\r
  border-radius: 6px;\r
  font-family: Consolas, monospace;\r
  text-align: center;
}
.dim-input[data-v-3cee2115]:focus {\r
  outline: none;\r
  border-color: rgba(255, 154, 88, 0.8);
}
.color-picker-wrapper[data-v-3cee2115] {\r
  width: 30px;\r
  height: 30px;\r
  overflow: hidden;\r
  border: 2px solid rgba(255, 255, 255, 0.12);\r
  border-radius: 8px;
}
input[type="color"][data-v-3cee2115] {\r
  width: 150%;\r
  height: 150%;\r
  margin: -25%;\r
  padding: 0;\r
  cursor: pointer;\r
  border: none;
}
.size-control[data-v-3cee2115] {\r
  flex: 1 1 320px;
}
.styled-slider[data-v-3cee2115] {\r
  flex: 1 1 auto;\r
  height: 6px;\r
  background: #595e66;\r
  border-radius: 999px;\r
  outline: none;\r
  -webkit-appearance: none;
}
.styled-slider[data-v-3cee2115]::-webkit-slider-thumb {\r
  width: 16px;\r
  height: 16px;\r
  background: #ff9a58;\r
  border-radius: 50%;\r
  cursor: pointer;\r
  -webkit-appearance: none;
}
.size-label[data-v-3cee2115] {\r
  min-width: 46px;\r
  font-family: Consolas, monospace;\r
  text-align: right;
}
.status-text[data-v-3cee2115] {\r
  flex: 1 1 220px;\r
  padding-top: 2px;\r
  color: #9ea7b4;\r
  font-size: 12px;
}
.hidden-upload[data-v-3cee2115] {\r
  display: none;
}
.canvas-wrapper[data-v-3cee2115] {\r
  display: flex;\r
  justify-content: center;\r
  align-items: center;\r
  position: relative;\r
  overflow: hidden;\r
  min-height: 160px;\r
  background:\r
    linear-gradient(45deg, #2a2d32 25%, transparent 25%),\r
    linear-gradient(-45deg, #2a2d32 25%, transparent 25%),\r
    linear-gradient(45deg, transparent 75%, #2a2d32 75%),\r
    linear-gradient(-45deg, transparent 75%, #2a2d32 75%);\r
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;\r
  background-size: 20px 20px;\r
  border: 1px solid rgba(255, 255, 255, 0.08);\r
  border-radius: 10px;\r
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}
canvas[data-v-3cee2115] {\r
  display: block;
}`));
      document.head.appendChild(elementStyle);
    }
  } catch (e) {
    console.error("vite-plugin-css-injected-by-js", e);
  }
})();
