/**
 * Connected Image Stitch – Frontend UI (Nodes 2.0 Compatible)
 *
 * Provides an orientation toggle (Horizontal / Vertical / Layout) and a
 * 3×3 layout mapping grid for the connection-based image stitch node.
 * In Layout mode each grid cell has a dropdown to pick which image input
 * (1–9) occupies that position. Images arrive via connections, so no
 * upload UI is needed.
 */

import { app } from "../../../scripts/app.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NODE_CLASS = "Duffy_ConnectedImageStitch";
const SLOTS = 9;

const COLORS = {
    header:      "#2B4E5C",
    body:        "#1A2F38",
    panel:       "#222",
    cell:        "#2a2a2a",
    cellBorder:  "#555",
    accent:      "#4ea8de",
    text:        "#ddd",
    textMuted:   "#999",
    activeBtn:   "#1a2a3a",
    activeBorder:"#4ea8de",
    inactiveBtn: "#333",
    badge:       "#3d3d3d",
    badgeText:   "#ccc",
    warning:     "#e67e22",
};

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------
app.registerExtension({
    name: "Duffy.ConnectedImageStitch",

    async nodeCreated(node) {
        if (node.comfyClass !== NODE_CLASS) return;

        // -- Theme --
        node.color = COLORS.header;
        node.bgcolor = COLORS.body;

        // -- Locate widgets --
        const orientationWidget = node.widgets?.find(w => w.name === "orientation");

        const layoutWidgets = [];
        for (let i = 1; i <= SLOTS; i++) {
            layoutWidgets.push(node.widgets?.find(w => w.name === `layout_pos_${i}`));
        }

        // Ensure layout widgets have their default values before hiding
        for (let i = 0; i < SLOTS; i++) {
            const w = layoutWidgets[i];
            if (w && (!w.value || w.value === "")) {
                w.value = String(i + 1);
            }
        }

        // Hide all managed combo widgets (we render our own UI)
        const hiddenWidgets = [orientationWidget, ...layoutWidgets];
        for (const w of hiddenWidgets) {
            if (w) {
                w.type = "hidden";
                w.computeSize = () => [0, 0];
            }
        }

        // ================================================================
        // DOM STRUCTURE
        // ================================================================

        const container = document.createElement("div");
        Object.assign(container.style, {
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontFamily: "'Segoe UI', Arial, sans-serif",
            color: COLORS.text,
            backgroundColor: COLORS.panel,
            padding: "14px",
            borderRadius: "8px",
            boxSizing: "border-box",
            border: "1px solid #444",
        });

        // Prevent canvas drag / zoom inside widget
        container.addEventListener("pointerdown", e => e.stopPropagation());
        container.addEventListener("wheel", e => e.stopPropagation());

        // -- Title --
        const titleRow = document.createElement("div");
        Object.assign(titleRow.style, { textAlign: "center" });

        const title = document.createElement("div");
        title.textContent = "Connected ImageStitch";
        Object.assign(title.style, {
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "2px",
        });

        const subtitle = document.createElement("div");
        subtitle.textContent = "Connect up to 9 images and stitch them together.";
        Object.assign(subtitle.style, {
            fontSize: "11px",
            color: COLORS.textMuted,
        });

        titleRow.appendChild(title);
        titleRow.appendChild(subtitle);
        container.appendChild(titleRow);

        // -- Orientation Toggle --
        const toggleRow = document.createElement("div");
        Object.assign(toggleRow.style, {
            display: "flex",
            justifyContent: "center",
            gap: "0",
            borderRadius: "6px",
            overflow: "hidden",
            border: `1px solid ${COLORS.cellBorder}`,
            alignSelf: "center",
        });

        function createToggleBtn(label, value) {
            const btn = document.createElement("button");
            btn.textContent = label;
            btn.dataset.value = value;
            Object.assign(btn.style, {
                padding: "8px 20px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                border: "none",
                outline: "none",
                color: COLORS.text,
                transition: "background-color 0.15s, color 0.15s",
                backgroundColor: COLORS.inactiveBtn,
            });
            return btn;
        }

        const btnHorizontal = createToggleBtn("\u2192 Horizontal", "Horizontal");
        const btnVertical = createToggleBtn("\u2193 Vertical", "Vertical");
        const btnLayout = createToggleBtn("\u229E Layout", "Layout");
        toggleRow.appendChild(btnHorizontal);
        toggleRow.appendChild(btnVertical);
        toggleRow.appendChild(btnLayout);
        container.appendChild(toggleRow);

        // ================================================================
        // LAYOUT MAPPING GRID (visible only in Layout mode)
        // ================================================================

        const gridSection = document.createElement("div");
        Object.assign(gridSection.style, {
            display: "none",
            flexDirection: "column",
            gap: "8px",
        });

        // Grid label
        const gridLabel = document.createElement("div");
        gridLabel.textContent = "Layout Grid — assign inputs to positions";
        Object.assign(gridLabel.style, {
            fontSize: "11px",
            color: COLORS.textMuted,
            textAlign: "center",
        });
        gridSection.appendChild(gridLabel);

        // 3×3 CSS grid with dropdowns
        const grid = document.createElement("div");
        Object.assign(grid.style, {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(3, auto)",
            gap: "6px",
            backgroundColor: "#1a1a1a",
            padding: "10px",
            borderRadius: "8px",
        });

        const selects = [];
        for (let i = 0; i < SLOTS; i++) {
            const cellWrapper = document.createElement("div");
            Object.assign(cellWrapper.style, {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                backgroundColor: COLORS.cell,
                border: `1px solid ${COLORS.cellBorder}`,
                borderRadius: "6px",
                padding: "8px 4px",
            });

            // Position badge
            const badge = document.createElement("div");
            const row = Math.floor(i / 3) + 1;
            const col = (i % 3) + 1;
            badge.textContent = `Pos ${row},${col}`;
            Object.assign(badge.style, {
                fontSize: "10px",
                fontWeight: "bold",
                color: COLORS.badgeText,
                backgroundColor: COLORS.badge,
                padding: "2px 6px",
                borderRadius: "4px",
            });
            cellWrapper.appendChild(badge);

            // Dropdown
            const select = document.createElement("select");
            select.dataset.pos = i + 1;
            Object.assign(select.style, {
                width: "100%",
                padding: "5px 4px",
                fontSize: "12px",
                fontWeight: "bold",
                backgroundColor: "#333",
                color: COLORS.text,
                border: `1px solid ${COLORS.cellBorder}`,
                borderRadius: "4px",
                cursor: "pointer",
                outline: "none",
                textAlign: "center",
            });

            // Options: None + Image 1–9
            const noneOpt = document.createElement("option");
            noneOpt.value = "none";
            noneOpt.textContent = "None";
            select.appendChild(noneOpt);

            for (let j = 1; j <= SLOTS; j++) {
                const opt = document.createElement("option");
                opt.value = String(j);
                opt.textContent = `Image ${j}`;
                select.appendChild(opt);
            }

            // Set initial value from widget
            const widget = layoutWidgets[i];
            if (widget) {
                select.value = widget.value || String(i + 1);
            }

            // Sync dropdown changes back to the hidden widget
            select.addEventListener("change", () => {
                if (widget) {
                    widget.value = select.value;
                    widget.callback?.(select.value);
                }
            });

            selects.push(select);
            cellWrapper.appendChild(select);
            grid.appendChild(cellWrapper);
        }

        gridSection.appendChild(grid);

        // Reset button
        const resetRow = document.createElement("div");
        Object.assign(resetRow.style, {
            display: "flex",
            justifyContent: "center",
        });
        const resetBtn = document.createElement("button");
        resetBtn.textContent = "Reset to Default (1–9)";
        Object.assign(resetBtn.style, {
            padding: "5px 14px",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: "pointer",
            border: `1px solid ${COLORS.cellBorder}`,
            borderRadius: "4px",
            backgroundColor: COLORS.inactiveBtn,
            color: COLORS.text,
            outline: "none",
        });
        resetBtn.addEventListener("click", () => {
            for (let i = 0; i < SLOTS; i++) {
                const val = String(i + 1);
                selects[i].value = val;
                if (layoutWidgets[i]) {
                    layoutWidgets[i].value = val;
                    layoutWidgets[i].callback?.(val);
                }
            }
        });
        resetRow.appendChild(resetBtn);
        gridSection.appendChild(resetRow);

        container.appendChild(gridSection);

        // ================================================================
        // ORIENTATION SYNC & GRID VISIBILITY
        // ================================================================

        function syncToggleUI() {
            const current = orientationWidget?.value || "Horizontal";
            for (const btn of [btnHorizontal, btnVertical, btnLayout]) {
                const active = btn.dataset.value === current;
                btn.style.backgroundColor = active ? COLORS.activeBtn : COLORS.inactiveBtn;
                btn.style.borderBottom = active ? `2px solid ${COLORS.activeBorder}` : "2px solid transparent";
            }
            // Show/hide layout grid
            gridSection.style.display = current === "Layout" ? "flex" : "none";

            // Recalculate node size after visibility change
            requestAnimationFrame(() => {
                const sz = node.computeSize();
                node.size = [Math.max(MIN_W, sz[0]), Math.max(MIN_H, sz[1])];
                app.graph.setDirtyCanvas(true, true);
            });
        }

        btnHorizontal.addEventListener("click", () => {
            if (orientationWidget) orientationWidget.value = "Horizontal";
            syncToggleUI();
        });
        btnVertical.addEventListener("click", () => {
            if (orientationWidget) orientationWidget.value = "Vertical";
            syncToggleUI();
        });
        btnLayout.addEventListener("click", () => {
            if (orientationWidget) orientationWidget.value = "Layout";
            syncToggleUI();
        });
        syncToggleUI();

        // ================================================================
        // ADD DOM WIDGET TO NODE
        // ================================================================

        const domWidget = node.addDOMWidget("connected_stitch_ui", "custom", container, {
            serialize: false,
            hideOnZoom: false,
        });
        const MIN_W = 360;
        const MIN_H = 180;
        domWidget.computeSize = () => {
            const isLayout = (orientationWidget?.value || "Horizontal") === "Layout";
            return [MIN_W, isLayout ? 440 : 120];
        };

        // Enforce minimum node size on user resize
        const origOnResize = node.onResize;
        node.onResize = function (size) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };

        // Initial size
        setTimeout(() => {
            const sz = node.computeSize();
            node.size = [Math.max(MIN_W, sz[0]), Math.max(MIN_H, sz[1])];
            app.graph.setDirtyCanvas(true, true);
        }, 100);
    },
});
