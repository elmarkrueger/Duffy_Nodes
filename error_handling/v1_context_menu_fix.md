# Bug Fix: V1 Legacy Context Menu Inaccessible

## Symptom

Starting ComfyUI with the Duffy_Nodes pack caused the right-click context menu on **all** nodes (including non-Duffy nodes like KSampler, CheckpointLoader, etc.) to become completely inaccessible in the Legacy V1 view. Nodes 2.0 view was unaffected. All node functionality worked correctly otherwise.

## Root Cause

**File:** `web/js/seed.js`, line 223

```javascript
getNodeMenuItems(node) {
    if (node.comfyClass !== "Duffy_Seed") return;  // ← returns undefined
    // ...
}
```

The `getNodeMenuItems` hook returned `undefined` (implicit return) for every non-Duffy_Seed node. Here's the chain of failure:

1. ComfyUI's `useContextMenuTranslation.ts` wraps V1's `LGraphCanvas.prototype.getNodeMenuOptions` to integrate extension-provided menu items into the Legacy V1 context menu.
2. When any node is right-clicked, the wrapper calls `app.collectNodeMenuItems(node)`, which invokes `getNodeMenuItems` on **every** registered extension and flattens the results.
3. `seed.js` returned `undefined` → after `.flat()`, this became an `undefined` entry in the menu items array.
4. The `ContextMenu` constructor iterated over items and called `value.disabled` without optional chaining on the `undefined` entry.
5. This threw `TypeError: Cannot read properties of undefined (reading 'disabled')`, which aborted the entire `ContextMenu` constructor.
6. **No menu element was ever created** — the context menu simply never appeared for any node.

## Fix Applied

### Phase 1: Critical Fix

**`web/js/seed.js`** — Changed the early return to return an empty array:

```javascript
getNodeMenuItems(node) {
    if (node.comfyClass !== "Duffy_Seed") return [];  // ← returns empty array
    // ...
}
```

This prevents `undefined` from entering the menu items array. Extensions that don't contribute menu items for a given node should return `[]`.

### Phase 2: Secondary Bug Fixes

**`web/js/toggle_switch.js`** — Removed orphaned code after the valid `registerExtension` block (lines 68-75). This dangling code contained syntax errors (reference to nonexistent `setupToggleSwitch` function, unmatched braces) that caused a `SyntaxError` at parse time, preventing the entire Duffy.ToggleSwitch extension from loading.

**`web/js/image_compare.js`** — Fixed a memory leak where `window.addEventListener("mouseup"/"mousemove")` handlers were never removed when the node was deleted. Named the handler functions and added cleanup in `node.onRemoved`:

```javascript
const origOnRemoved = node.onRemoved;
node.onRemoved = function () {
    window.removeEventListener("mouseup", onWindowMouseUp);
    window.removeEventListener("mousemove", onWindowMouseMove);
    origOnRemoved?.apply(this, arguments);
};
```

### Phase 3: DOM Widget Right-Click Forwarding

All DOM widget containers use `pointerdown` + `wheel` `stopPropagation()` to prevent canvas drag/zoom interference. However, DOM widgets are positioned as sibling `<div>` elements above the `<canvas>` element — pointer events on widgets never reach the canvas regardless. This meant right-clicking on the widget area of any Duffy node with a custom UI would not open a context menu.

Added a `contextmenu` event handler to all 13 files with DOM widgets (8 TypeScript entry points + 5 hand-written JS files):

```javascript
container.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = app.canvas;
    if (canvas) canvas.processContextMenu(node, e);
});
```

This directly calls LiteGraph's `processContextMenu` to open the standard node context menu when right-clicking on the DOM widget overlay.

**Files modified:**
- `src/advanced_connected_image_stitch.ts`
- `src/advanced_image_adjuster.ts`
- `src/advanced_layer_control.ts`
- `src/advanced_text_overlay.ts`
- `src/interactive_relight.ts`
- `src/lora_loader.ts`
- `src/painter_node.ts`
- `src/prompt_box.ts`
- `web/js/advanced_folder_image_selector.js`
- `web/js/connected_image_stitch.js`
- `web/js/image_compare.js`
- `web/js/image_stitch.js`
- `web/js/image_text_overlay.js`

## Key Takeaway

**Any extension implementing `getNodeMenuItems` or `getCanvasMenuItems` must return `[]` (not `undefined`) when it has no items to contribute.** ComfyUI's `useContextMenuTranslation.ts` wrapper injects the return value directly into the V1 context menu items array. A single `undefined` entry crashes the `ContextMenu` constructor and breaks context menus for the entire application.
