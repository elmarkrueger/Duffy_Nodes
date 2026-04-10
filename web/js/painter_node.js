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
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = app.canvas;
      if (canvas) canvas.processContextMenu(node, e);
    });
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
