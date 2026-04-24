export interface Bounds {
    id: string;
    item: any; // The original LiteGraph node or group
    x: number;
    y: number;
    width: number;
    height: number;
}

// Ensure groups have children updated alongside them
function applyTranslation(item: any, deltaX: number, deltaY: number) {
    if (!item.pos) {
        // Fallback for some strange node types
        if (item.bounding) {
            item.bounding[0] += deltaX;
            item.bounding[1] += deltaY;
        }
        return;
    }
    
    item.pos = [item.pos[0] + deltaX, item.pos[1] + deltaY];
    if (item.setDirtyCanvas) item.setDirtyCanvas(true, true);
    if (item.onDragDrop) item.onDragDrop();

    // Is it a group? Move contained nodes.
    if (item.type === "group" || item.isGroup) {
        if (item._nodes) {
            item._nodes.forEach((n: any) => {
                // Ensure we don't double-translate if it's also selected
                n.pos = [n.pos[0] + deltaX, n.pos[1] + deltaY];
                if (n.setDirtyCanvas) n.setDirtyCanvas(true, true);
                if (n.onDragDrop) n.onDragDrop();
            });
        }
    }
}

export function getSanitizedSelection(app: any, excludeId: string = "Duffy_NodeAlignmentTool"): Bounds[] {
    let items: any[] = [];
    const canvas = app.canvas;
    const graph = app.graph;

    // Check V2 selection in `app.selection` if it exists
    if (app.selection) {
        if (app.selection.selectedNodes) {
             const selectedIds = app.selection.selectedNodes.value || app.selection.selectedNodes;
             if (selectedIds && selectedIds[Symbol.iterator]) {
                 for (const id of Array.from(selectedIds)) {
                     const node = graph?._nodes_by_id?.[id as string];
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
                // If it's a string ID, look it up
                if (typeof item === 'string' && graph?._nodes_by_id) {
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
    
    // Deduplicate
    items = Array.from(new Set(items));
    
    // Convert to normalized bounds objects
    const bounds: Bounds[] = [];
    items.forEach(item => {
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

    // Remove children of a group if the group itself is selected, to avoid double-translation
    const groupItems = bounds.filter(b => b.item.type === "group" || b.item.isGroup);
    const nodesToExclude = new Set<any>();
    
    groupItems.forEach(g => {
        if (g.item._nodes) {
            g.item._nodes.forEach((n: any) => nodesToExclude.add(n));
        }
    });

    return bounds.filter(b => !nodesToExclude.has(b.item));
}

export function alignLeft(bounds: Bounds[]) {
    if (bounds.length < 2) return;
    const minX = Math.min(...bounds.map(b => b.x));
    bounds.forEach(b => {
        applyTranslation(b.item, minX - b.x, 0);
    });
}

export function alignRight(bounds: Bounds[]) {
    if (bounds.length < 2) return;
    const maxRight = Math.max(...bounds.map(b => b.x + b.width));
    bounds.forEach(b => {
        applyTranslation(b.item, maxRight - (b.x + b.width), 0);
    });
}

export function alignTop(bounds: Bounds[]) {
    if (bounds.length < 2) return;
    const minY = Math.min(...bounds.map(b => b.y));
    bounds.forEach(b => {
        applyTranslation(b.item, 0, minY - b.y);
    });
}

export function alignBottom(bounds: Bounds[]) {
    if (bounds.length < 2) return;
    const maxBottom = Math.max(...bounds.map(b => b.y + b.height));
    bounds.forEach(b => {
        applyTranslation(b.item, 0, maxBottom - (b.y + b.height));
    });
}

export function centerHorizontal(bounds: Bounds[]) {
    if (bounds.length < 2) return;
    const minX = Math.min(...bounds.map(b => b.x));
    const maxX = Math.max(...bounds.map(b => b.x + b.width));
    const centroidX = minX + (maxX - minX) / 2;
    
    bounds.forEach(b => {
        const itemCenterX = b.x + (b.width / 2);
        applyTranslation(b.item, centroidX - itemCenterX, 0);
    });
}

export function centerVertical(bounds: Bounds[]) {
    if (bounds.length < 2) return;
    const minY = Math.min(...bounds.map(b => b.y));
    const maxY = Math.max(...bounds.map(b => b.y + b.height));
    const centroidY = minY + (maxY - minY) / 2;
    
    bounds.forEach(b => {
        const itemCenterY = b.y + (b.height / 2);
        applyTranslation(b.item, 0, centroidY - itemCenterY);
    });
}

export function distributeHorizontal(bounds: Bounds[]) {
    if (bounds.length < 3) return;
    
    // Sort array based on X coordinates
    bounds.sort((a, b) => a.x - b.x);
    
    const first = bounds[0];
    const last = bounds[bounds.length - 1];
    
    const span = (last.x + last.width) - first.x;
    const totalWidths = bounds.reduce((sum, b) => sum + b.width, 0);
    
    let gap = (span - totalWidths) / (bounds.length - 1);
    
    // Collision resolution push
    if (gap <= 0) {
        gap = 20; 
    }
    
    let currentX = first.x + first.width + gap;
    
    for (let i = 1; i < bounds.length - 1; i++) {
        const b = bounds[i];
        applyTranslation(b.item, currentX - b.x, 0);
        currentX += b.width + gap;
    }
    
    // If we applied collision resolution, move the last item too
    if (gap === 20) {
        applyTranslation(last.item, currentX - last.x, 0);
    }
}

export function distributeVertical(bounds: Bounds[]) {
    if (bounds.length < 3) return;
    
    // Sort array based on Y coordinates
    bounds.sort((a, b) => a.y - b.y);
    
    const first = bounds[0];
    const last = bounds[bounds.length - 1];
    
    const span = (last.y + last.height) - first.y;
    const totalHeights = bounds.reduce((sum, b) => sum + b.height, 0);
    
    let gap = (span - totalHeights) / (bounds.length - 1);
    
    // Collision resolution push
    if (gap <= 0) {
        gap = 20; 
    }
    
    let currentY = first.y + first.height + gap;
    
    for (let i = 1; i < bounds.length - 1; i++) {
        const b = bounds[i];
        applyTranslation(b.item, 0, currentY - b.y);
        currentY += b.height + gap;
    }
    
    // If we applied collision resolution, move the last item too
    if (gap === 20) {
        applyTranslation(last.item, 0, currentY - last.y);
    }
}
