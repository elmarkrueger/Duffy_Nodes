import { d as defineComponent, f as onMounted, g as onUnmounted, o as openBlock, c as createElementBlock, a as createBaseVNode, k as withModifiers, j as normalizeClass, b as ref, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-CusGlrPr.js";
import { app } from "../../../scripts/app.js";
const _hoisted_1 = { class: "row" };
const _hoisted_2 = ["disabled"];
const _hoisted_3 = { class: "row" };
const _hoisted_4 = ["disabled"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "NodeAlignmentTool",
  props: {
    onAlignLeft: { type: Function },
    onAlignRight: { type: Function },
    onAlignTop: { type: Function },
    onAlignBottom: { type: Function },
    onCenterHorizontal: { type: Function },
    onCenterVertical: { type: Function },
    onDistributeHorizontal: { type: Function },
    onDistributeVertical: { type: Function },
    getSelectedCount: { type: Function }
  },
  setup(__props) {
    const props = __props;
    const isActive = ref(false);
    const canDistribute = ref(false);
    let checkInterval = null;
    function checkSelection() {
      const count = props.getSelectedCount();
      isActive.value = count >= 2;
      canDistribute.value = count >= 3;
    }
    onMounted(() => {
      checkInterval = setInterval(checkSelection, 200);
    });
    onUnmounted(() => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["alignment-tool-root", { "disabled": !isActive.value }])
      }, [
        createBaseVNode("div", _hoisted_1, [
          createBaseVNode("button", {
            onClick: _cache[0] || (_cache[0] = withModifiers(
              //@ts-ignore
              (...args) => __props.onAlignLeft && __props.onAlignLeft(...args),
              ["stop"]
            )),
            class: "icon-btn",
            title: "Align Left"
          }, [..._cache[8] || (_cache[8] = [
            createBaseVNode("svg", {
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              stroke: "currentColor",
              "stroke-width": "2",
              fill: "none",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              createBaseVNode("line", {
                x1: "4",
                y1: "2",
                x2: "4",
                y2: "22"
              }),
              createBaseVNode("rect", {
                x: "8",
                y: "6",
                width: "10",
                height: "4"
              }),
              createBaseVNode("rect", {
                x: "8",
                y: "14",
                width: "6",
                height: "4"
              })
            ], -1)
          ])]),
          createBaseVNode("button", {
            onClick: _cache[1] || (_cache[1] = withModifiers(
              //@ts-ignore
              (...args) => __props.onCenterHorizontal && __props.onCenterHorizontal(...args),
              ["stop"]
            )),
            class: "icon-btn",
            title: "Align Center (Horizontal)"
          }, [..._cache[9] || (_cache[9] = [
            createBaseVNode("svg", {
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              stroke: "currentColor",
              "stroke-width": "2",
              fill: "none",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              createBaseVNode("line", {
                x1: "12",
                y1: "2",
                x2: "12",
                y2: "22"
              }),
              createBaseVNode("rect", {
                x: "6",
                y: "6",
                width: "12",
                height: "4"
              }),
              createBaseVNode("rect", {
                x: "8",
                y: "14",
                width: "8",
                height: "4"
              })
            ], -1)
          ])]),
          createBaseVNode("button", {
            onClick: _cache[2] || (_cache[2] = withModifiers(
              //@ts-ignore
              (...args) => __props.onAlignRight && __props.onAlignRight(...args),
              ["stop"]
            )),
            class: "icon-btn",
            title: "Align Right"
          }, [..._cache[10] || (_cache[10] = [
            createBaseVNode("svg", {
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              stroke: "currentColor",
              "stroke-width": "2",
              fill: "none",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              createBaseVNode("line", {
                x1: "20",
                y1: "2",
                x2: "20",
                y2: "22"
              }),
              createBaseVNode("rect", {
                x: "6",
                y: "6",
                width: "10",
                height: "4"
              }),
              createBaseVNode("rect", {
                x: "10",
                y: "14",
                width: "6",
                height: "4"
              })
            ], -1)
          ])]),
          createBaseVNode("button", {
            onClick: _cache[3] || (_cache[3] = withModifiers(
              //@ts-ignore
              (...args) => __props.onDistributeHorizontal && __props.onDistributeHorizontal(...args),
              ["stop"]
            )),
            class: "icon-btn",
            title: "Distribute Horizontally",
            disabled: !canDistribute.value
          }, [..._cache[11] || (_cache[11] = [
            createBaseVNode("svg", {
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              stroke: "currentColor",
              "stroke-width": "2",
              fill: "none",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              createBaseVNode("line", {
                x1: "4",
                y1: "2",
                x2: "4",
                y2: "22"
              }),
              createBaseVNode("line", {
                x1: "20",
                y1: "2",
                x2: "20",
                y2: "22"
              }),
              createBaseVNode("rect", {
                x: "8",
                y: "10",
                width: "8",
                height: "4"
              })
            ], -1)
          ])], 8, _hoisted_2)
        ]),
        createBaseVNode("div", _hoisted_3, [
          createBaseVNode("button", {
            onClick: _cache[4] || (_cache[4] = withModifiers(
              //@ts-ignore
              (...args) => __props.onAlignTop && __props.onAlignTop(...args),
              ["stop"]
            )),
            class: "icon-btn",
            title: "Align Top"
          }, [..._cache[12] || (_cache[12] = [
            createBaseVNode("svg", {
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              stroke: "currentColor",
              "stroke-width": "2",
              fill: "none",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              createBaseVNode("line", {
                x1: "2",
                y1: "4",
                x2: "22",
                y2: "4"
              }),
              createBaseVNode("rect", {
                x: "6",
                y: "8",
                width: "4",
                height: "10"
              }),
              createBaseVNode("rect", {
                x: "14",
                y: "8",
                width: "4",
                height: "6"
              })
            ], -1)
          ])]),
          createBaseVNode("button", {
            onClick: _cache[5] || (_cache[5] = withModifiers(
              //@ts-ignore
              (...args) => __props.onCenterVertical && __props.onCenterVertical(...args),
              ["stop"]
            )),
            class: "icon-btn",
            title: "Align Center (Vertical)"
          }, [..._cache[13] || (_cache[13] = [
            createBaseVNode("svg", {
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              stroke: "currentColor",
              "stroke-width": "2",
              fill: "none",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              createBaseVNode("line", {
                x1: "2",
                y1: "12",
                x2: "22",
                y2: "12"
              }),
              createBaseVNode("rect", {
                x: "6",
                y: "6",
                width: "4",
                height: "12"
              }),
              createBaseVNode("rect", {
                x: "14",
                y: "8",
                width: "4",
                height: "8"
              })
            ], -1)
          ])]),
          createBaseVNode("button", {
            onClick: _cache[6] || (_cache[6] = withModifiers(
              //@ts-ignore
              (...args) => __props.onAlignBottom && __props.onAlignBottom(...args),
              ["stop"]
            )),
            class: "icon-btn",
            title: "Align Bottom"
          }, [..._cache[14] || (_cache[14] = [
            createBaseVNode("svg", {
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              stroke: "currentColor",
              "stroke-width": "2",
              fill: "none",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              createBaseVNode("line", {
                x1: "2",
                y1: "20",
                x2: "22",
                y2: "20"
              }),
              createBaseVNode("rect", {
                x: "6",
                y: "6",
                width: "4",
                height: "10"
              }),
              createBaseVNode("rect", {
                x: "14",
                y: "10",
                width: "4",
                height: "6"
              })
            ], -1)
          ])]),
          createBaseVNode("button", {
            onClick: _cache[7] || (_cache[7] = withModifiers(
              //@ts-ignore
              (...args) => __props.onDistributeVertical && __props.onDistributeVertical(...args),
              ["stop"]
            )),
            class: "icon-btn",
            title: "Distribute Vertically",
            disabled: !canDistribute.value
          }, [..._cache[15] || (_cache[15] = [
            createBaseVNode("svg", {
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              stroke: "currentColor",
              "stroke-width": "2",
              fill: "none",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              createBaseVNode("line", {
                x1: "2",
                y1: "4",
                x2: "22",
                y2: "4"
              }),
              createBaseVNode("line", {
                x1: "2",
                y1: "20",
                x2: "22",
                y2: "20"
              }),
              createBaseVNode("rect", {
                x: "10",
                y: "8",
                width: "4",
                height: "8"
              })
            ], -1)
          ])], 8, _hoisted_4)
        ])
      ], 2);
    };
  }
});
const NodeAlignmentTool = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-55067d46"]]);
function applyTranslation(item, deltaX, deltaY) {
  if (!item.pos) {
    if (item.bounding) {
      item.bounding[0] += deltaX;
      item.bounding[1] += deltaY;
    }
    return;
  }
  item.pos = [item.pos[0] + deltaX, item.pos[1] + deltaY];
  if (item.setDirtyCanvas) item.setDirtyCanvas(true, true);
  if (item.onDragDrop) item.onDragDrop();
  if (item.type === "group" || item.isGroup) {
    if (item._nodes) {
      item._nodes.forEach((n) => {
        n.pos = [n.pos[0] + deltaX, n.pos[1] + deltaY];
        if (n.setDirtyCanvas) n.setDirtyCanvas(true, true);
        if (n.onDragDrop) n.onDragDrop();
      });
    }
  }
}
function getSanitizedSelection(app2, excludeId = "Duffy_NodeAlignmentTool") {
  var _a;
  let items = [];
  const canvas = app2.canvas;
  const graph = app2.graph;
  if (app2.selection) {
    if (app2.selection.selectedNodes) {
      const selectedIds = app2.selection.selectedNodes.value || app2.selection.selectedNodes;
      if (selectedIds && selectedIds[Symbol.iterator]) {
        for (const id of Array.from(selectedIds)) {
          const node = (_a = graph == null ? void 0 : graph._nodes_by_id) == null ? void 0 : _a[id];
          if (node) items.push(node);
        }
      }
    }
  }
  if (canvas) {
    if (canvas.selected_nodes) {
      items.push(...Object.values(canvas.selected_nodes));
    }
    if (canvas.selectedItems && canvas.selectedItems[Symbol.iterator]) {
      for (const item of Array.from(canvas.selectedItems)) {
        if (typeof item === "string" && (graph == null ? void 0 : graph._nodes_by_id)) {
          const node = graph._nodes_by_id[item];
          if (node) items.push(node);
        } else {
          items.push(item);
        }
      }
    }
    if (canvas.selected_group) {
      items.push(canvas.selected_group);
    }
    if (canvas.selected_groups) {
      items.push(...Object.values(canvas.selected_groups));
    }
  }
  items = Array.from(new Set(items));
  const bounds = [];
  items.forEach((item) => {
    if (!item) return;
    if (item.comfyClass === excludeId || item.type === excludeId) return;
    let x = 0, y = 0, w = 0, h = 0;
    if (item.getBounding) {
      const b = item.getBounding();
      x = b[0];
      y = b[1];
      w = b[2];
      h = b[3];
    } else if (item.pos && item.size) {
      x = item.pos[0];
      y = item.pos[1];
      w = item.size[0];
      h = item.size[1];
    } else if (item.bounding) {
      x = item.bounding[0];
      y = item.bounding[1];
      w = item.bounding[2];
      h = item.bounding[3];
    } else {
      return;
    }
    bounds.push({ id: item.id || String(Math.random()), item, x, y, width: w, height: h });
  });
  const groupItems = bounds.filter((b) => b.item.type === "group" || b.item.isGroup);
  const nodesToExclude = /* @__PURE__ */ new Set();
  groupItems.forEach((g) => {
    if (g.item._nodes) {
      g.item._nodes.forEach((n) => nodesToExclude.add(n));
    }
  });
  return bounds.filter((b) => !nodesToExclude.has(b.item));
}
function alignLeft(bounds) {
  if (bounds.length < 2) return;
  const minX = Math.min(...bounds.map((b) => b.x));
  bounds.forEach((b) => {
    applyTranslation(b.item, minX - b.x, 0);
  });
}
function alignRight(bounds) {
  if (bounds.length < 2) return;
  const maxRight = Math.max(...bounds.map((b) => b.x + b.width));
  bounds.forEach((b) => {
    applyTranslation(b.item, maxRight - (b.x + b.width), 0);
  });
}
function alignTop(bounds) {
  if (bounds.length < 2) return;
  const minY = Math.min(...bounds.map((b) => b.y));
  bounds.forEach((b) => {
    applyTranslation(b.item, 0, minY - b.y);
  });
}
function alignBottom(bounds) {
  if (bounds.length < 2) return;
  const maxBottom = Math.max(...bounds.map((b) => b.y + b.height));
  bounds.forEach((b) => {
    applyTranslation(b.item, 0, maxBottom - (b.y + b.height));
  });
}
function centerHorizontal(bounds) {
  if (bounds.length < 2) return;
  const minX = Math.min(...bounds.map((b) => b.x));
  const maxX = Math.max(...bounds.map((b) => b.x + b.width));
  const centroidX = minX + (maxX - minX) / 2;
  bounds.forEach((b) => {
    const itemCenterX = b.x + b.width / 2;
    applyTranslation(b.item, centroidX - itemCenterX, 0);
  });
}
function centerVertical(bounds) {
  if (bounds.length < 2) return;
  const minY = Math.min(...bounds.map((b) => b.y));
  const maxY = Math.max(...bounds.map((b) => b.y + b.height));
  const centroidY = minY + (maxY - minY) / 2;
  bounds.forEach((b) => {
    const itemCenterY = b.y + b.height / 2;
    applyTranslation(b.item, 0, centroidY - itemCenterY);
  });
}
function distributeHorizontal(bounds) {
  if (bounds.length < 3) return;
  bounds.sort((a, b) => a.x - b.x);
  const first = bounds[0];
  const last = bounds[bounds.length - 1];
  const span = last.x + last.width - first.x;
  const totalWidths = bounds.reduce((sum, b) => sum + b.width, 0);
  let gap = (span - totalWidths) / (bounds.length - 1);
  if (gap <= 0) {
    gap = 20;
  }
  let currentX = first.x + first.width + gap;
  for (let i = 1; i < bounds.length - 1; i++) {
    const b = bounds[i];
    applyTranslation(b.item, currentX - b.x, 0);
    currentX += b.width + gap;
  }
  if (gap === 20) {
    applyTranslation(last.item, currentX - last.x, 0);
  }
}
function distributeVertical(bounds) {
  if (bounds.length < 3) return;
  bounds.sort((a, b) => a.y - b.y);
  const first = bounds[0];
  const last = bounds[bounds.length - 1];
  const span = last.y + last.height - first.y;
  const totalHeights = bounds.reduce((sum, b) => sum + b.height, 0);
  let gap = (span - totalHeights) / (bounds.length - 1);
  if (gap <= 0) {
    gap = 20;
  }
  let currentY = first.y + first.height + gap;
  for (let i = 1; i < bounds.length - 1; i++) {
    const b = bounds[i];
    applyTranslation(b.item, 0, currentY - b.y);
    currentY += b.height + gap;
  }
  if (gap === 20) {
    applyTranslation(last.item, 0, currentY - last.y);
  }
}
function executeAction(action) {
  if (!app.canvas) return;
  requestAnimationFrame(() => {
    const bounds = getSanitizedSelection(app, "Duffy_NodeAlignmentTool");
    if (bounds.length < 2) return;
    if (app.graph.list_of_graphcanvas && app.canvas) {
      app.canvas.setDirty(true, true);
    }
    app.graph.serialize();
    action(bounds);
    app.canvas.setDirty(true, true);
  });
}
const UI_WIDTH = 210;
const UI_HEIGHT = 100;
app.registerExtension({
  name: "Duffy.NodeAlignmentTool.Vue",
  async nodeCreated(node) {
    if (node.comfyClass !== "Duffy_NodeAlignmentTool") return;
    const container = document.createElement("div");
    container.style.cssText = `width:${UI_WIDTH}px; height:${UI_HEIGHT}px; box-sizing:border-box; overflow:hidden; display:flex; justify-content:center; align-items:center;`;
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    container.addEventListener("mousedown", (e) => e.stopPropagation());
    const vueApp = createApp(NodeAlignmentTool, {
      onAlignLeft: () => executeAction(alignLeft),
      onCenterHorizontal: () => executeAction(centerHorizontal),
      onAlignRight: () => executeAction(alignRight),
      onDistributeHorizontal: () => executeAction(distributeHorizontal),
      onAlignTop: () => executeAction(alignTop),
      onCenterVertical: () => executeAction(centerVertical),
      onAlignBottom: () => executeAction(alignBottom),
      onDistributeVertical: () => executeAction(distributeVertical),
      getSelectedCount: () => {
        return getSanitizedSelection(app, "Duffy_NodeAlignmentTool").length;
      }
    });
    vueApp.mount(container);
    const domWidget = node.addDOMWidget("align_vue_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => [UI_WIDTH, UI_HEIGHT];
    node.size = [UI_WIDTH + 20, UI_HEIGHT + 35];
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(UI_WIDTH + 20, size[0]);
      size[1] = Math.max(UI_HEIGHT + 35, size[1]);
      origOnResize == null ? void 0 : origOnResize.apply(this, arguments);
    };
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      vueApp.unmount();
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
  },
  getSelectionToolboxCommands(canvas) {
    const selection = getSanitizedSelection(app, "Duffy_NodeAlignmentTool");
    if (selection.length < 2) return [];
    const commands = [
      { id: "duffy-align.left", label: "Align Left", function: () => executeAction(alignLeft) },
      { id: "duffy-align.center-h", label: "Align Center H", function: () => executeAction(centerHorizontal) },
      { id: "duffy-align.right", label: "Align Right", function: () => executeAction(alignRight) },
      { id: "duffy-align.top", label: "Align Top", function: () => executeAction(alignTop) },
      { id: "duffy-align.center-v", label: "Align Center V", function: () => executeAction(centerVertical) },
      { id: "duffy-align.bottom", label: "Align Bottom", function: () => executeAction(alignBottom) }
    ];
    if (selection.length >= 3) {
      commands.push({ id: "duffy-align.distribute-h", label: "Distribute H", function: () => executeAction(distributeHorizontal) });
      commands.push({ id: "duffy-align.distribute-v", label: "Distribute V", function: () => executeAction(distributeVertical) });
    }
    return commands;
  }
});
