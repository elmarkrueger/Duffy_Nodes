/**
 * Image Stitch – Frontend UI (Nodes 2.0 Compatible)
 *
 * Provides an interactive 3×3 grid for uploading up to 9 images,
 * drag-and-drop reordering, and a Horizontal/Vertical orientation toggle.
 * All visual state is synced back to the hidden combo widgets so the
 * backend receives the correct image filenames in the correct order.
 */

import { api } from "../../../scripts/api.js";
import { app } from "../../../scripts/app.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NODE_CLASS = "Duffy_ImageStitch";
const SLOTS = 9;

const COLORS = {
    header:     "#2B4E5C",
    body:       "#1A2F38",
    panel:      "#222",
    cell:       "#2a2a2a",
    cellBorder: "#555",
    cellHover:  "#3a3a3a",
    accent:     "#4ea8de",
    badge:      "#3d3d3d",
    badgeText:  "#ccc",
    text:       "#ddd",
    textMuted:  "#999",
    activeBtn:  "#1a2a3a",
    activeBorder:"#4ea8de",
    inactiveBtn:"#333",
    danger:     "#c0392b",
    dragOver:   "rgba(78,168,222,0.25)",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a /view URL for a ComfyUI input image filename. */
function viewURL(filename) {
    if (!filename || filename === "none") return null;
    const parts = filename.split("/");
    const name = parts.pop();
    const subfolder = parts.join("/");
    const params = new URLSearchParams({ filename: name, type: "input" });
    if (subfolder) params.set("subfolder", subfolder);
    return `/view?${params.toString()}`;
}

/** Upload a File object to ComfyUI and return the server filename. */
async function uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", "input");
    formData.append("subfolder", "");

    const resp = await api.fetchApi("/upload/image", {
        method: "POST",
        body: formData,
    });

    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
    const data = await resp.json();
    // Server returns { name, subfolder, type }
    return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

/** Set a combo widget value and refresh its options if the value is new. */
function setComboValue(widget, value) {
    if (!widget) return;
    // Ensure the value exists in the widget's options
    if (widget.options && widget.options.values) {
        if (!widget.options.values.includes(value) && value !== "none") {
            widget.options.values.push(value);
        }
    }
    widget.value = value;
    widget.callback?.(value);
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------
app.registerExtension({
    name: "Duffy.ImageStitch",

    async nodeCreated(node) {
        if (node.comfyClass !== NODE_CLASS) return;

        // -- Theme --
        node.color = COLORS.header;
        node.bgcolor = COLORS.body;

        // -- Locate widgets --
        const orientationWidget = node.widgets?.find(w => w.name === "orientation");
        const imageWidgets = [];
        for (let i = 1; i <= SLOTS; i++) {
            imageWidgets.push(node.widgets?.find(w => w.name === `image_${i}`));
        }

        // -- Hide all combo widgets (we render our own UI) --
        const allCombos = [orientationWidget, ...imageWidgets];
        for (const w of allCombos) {
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
        Object.assign(titleRow.style, {
            textAlign: "center",
        });
        const title = document.createElement("div");
        title.textContent = "ImageStitch";
        Object.assign(title.style, {
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "2px",
        });
        const subtitle = document.createElement("div");
        subtitle.textContent = "Upload up to 9 images and stitch them together.";
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
        toggleRow.appendChild(btnHorizontal);
        toggleRow.appendChild(btnVertical);
        container.appendChild(toggleRow);

        function syncToggleUI() {
            const current = orientationWidget?.value || "Horizontal";
            const isH = current === "Horizontal";
            btnHorizontal.style.backgroundColor = isH ? COLORS.activeBtn : COLORS.inactiveBtn;
            btnHorizontal.style.borderBottom = isH ? `2px solid ${COLORS.activeBorder}` : "2px solid transparent";
            btnVertical.style.backgroundColor = !isH ? COLORS.activeBtn : COLORS.inactiveBtn;
            btnVertical.style.borderBottom = !isH ? `2px solid ${COLORS.activeBorder}` : "2px solid transparent";
        }

        btnHorizontal.addEventListener("click", () => {
            if (orientationWidget) orientationWidget.value = "Horizontal";
            syncToggleUI();
        });
        btnVertical.addEventListener("click", () => {
            if (orientationWidget) orientationWidget.value = "Vertical";
            syncToggleUI();
        });
        syncToggleUI();

        // -- 3×3 Grid --
        const grid = document.createElement("div");
        Object.assign(grid.style, {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(3, 1fr)",
            gap: "8px",
            backgroundColor: "#1a1a1a",
            padding: "10px",
            borderRadius: "8px",
            aspectRatio: "1 / 1",
        });
        container.appendChild(grid);

        // ================================================================
        // CELL RENDERING
        // ================================================================

        /** Shared hidden file input (reused for every slot). */
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/png,image/jpeg,image/webp,image/bmp,image/tiff";
        fileInput.style.display = "none";
        container.appendChild(fileInput);

        /** Track which slot triggered the file picker. */
        let uploadTargetSlot = -1;

        /** Currently dragged slot index (-1 = none). */
        let dragSourceSlot = -1;

        /**
         * Build (or rebuild) a single grid cell.
         * @param {number} idx 0-based slot index
         */
        function buildCell(idx) {
            const slotNum = idx + 1;
            const widget = imageWidgets[idx];
            const filename = widget?.value || "none";
            const hasImage = filename && filename !== "none";

            const cell = document.createElement("div");
            cell.dataset.slot = idx;
            Object.assign(cell.style, {
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: COLORS.cell,
                border: `2px dashed ${COLORS.cellBorder}`,
                borderRadius: "6px",
                cursor: "pointer",
                overflow: "hidden",
                transition: "border-color 0.15s, background-color 0.15s",
                userSelect: "none",
            });

            // --- Badge (always visible) ---
            const badge = document.createElement("div");
            badge.textContent = `Image ${slotNum}`;
            Object.assign(badge.style, {
                position: "absolute",
                top: "4px",
                left: "4px",
                backgroundColor: COLORS.badge,
                color: COLORS.badgeText,
                fontSize: "10px",
                fontWeight: "bold",
                padding: "2px 6px",
                borderRadius: "4px",
                zIndex: "3",
                pointerEvents: "none",
                lineHeight: "1.3",
            });
            cell.appendChild(badge);

            if (hasImage) {
                // --- Thumbnail ---
                const thumb = document.createElement("div");
                const url = viewURL(filename);
                Object.assign(thumb.style, {
                    position: "absolute",
                    inset: "0",
                    backgroundImage: url ? `url('${url}')` : "none",
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    zIndex: "1",
                    // Leave space for the badge at the top
                    top: "22px",
                });
                cell.appendChild(thumb);

                // --- Clear button ---
                const clearBtn = document.createElement("div");
                clearBtn.textContent = "\u00D7";
                Object.assign(clearBtn.style, {
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: COLORS.danger,
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: "4",
                    lineHeight: "1",
                });
                clearBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    setComboValue(widget, "none");
                    renderGrid();
                });
                cell.appendChild(clearBtn);

                // --- Drag support for filled cells ---
                cell.draggable = true;
                cell.addEventListener("dragstart", (e) => {
                    dragSourceSlot = idx;
                    e.dataTransfer.effectAllowed = "move";
                    // Semi-transparent drag ghost
                    cell.style.opacity = "0.5";
                });
                cell.addEventListener("dragend", () => {
                    cell.style.opacity = "1";
                    dragSourceSlot = -1;
                });
            } else {
                // --- Upload prompt ---
                const uploadIcon = document.createElement("div");
                uploadIcon.innerHTML = `
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${COLORS.textMuted}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>`;
                Object.assign(uploadIcon.style, {
                    marginTop: "10px",
                    pointerEvents: "none",
                });
                cell.appendChild(uploadIcon);

                const uploadLabel = document.createElement("div");
                uploadLabel.textContent = "Upload";
                Object.assign(uploadLabel.style, {
                    fontSize: "11px",
                    color: COLORS.textMuted,
                    marginTop: "4px",
                    pointerEvents: "none",
                });
                cell.appendChild(uploadLabel);
            }

            // --- Click to upload (if empty) or re-upload (if filled) ---
            cell.addEventListener("click", () => {
                uploadTargetSlot = idx;
                fileInput.value = "";
                fileInput.click();
            });

            // --- Drop target ---
            cell.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                cell.style.backgroundColor = COLORS.dragOver;
            });
            cell.addEventListener("dragleave", () => {
                cell.style.backgroundColor = COLORS.cell;
            });
            cell.addEventListener("drop", (e) => {
                e.preventDefault();
                cell.style.backgroundColor = COLORS.cell;
                if (dragSourceSlot < 0 || dragSourceSlot === idx) return;

                // Swap the two combo widget values
                const srcWidget = imageWidgets[dragSourceSlot];
                const dstWidget = imageWidgets[idx];
                const srcVal = srcWidget?.value || "none";
                const dstVal = dstWidget?.value || "none";
                setComboValue(srcWidget, dstVal);
                setComboValue(dstWidget, srcVal);
                dragSourceSlot = -1;
                renderGrid();
            });

            // Hover highlight
            cell.addEventListener("pointerenter", () => {
                if (!cell.style.backgroundColor.includes("rgba")) {
                    cell.style.borderColor = COLORS.accent;
                }
            });
            cell.addEventListener("pointerleave", () => {
                cell.style.borderColor = COLORS.cellBorder;
                cell.style.backgroundColor = COLORS.cell;
            });

            return cell;
        }

        function renderGrid() {
            grid.innerHTML = "";
            for (let i = 0; i < SLOTS; i++) {
                grid.appendChild(buildCell(i));
            }
            app.graph.setDirtyCanvas(true, true);
        }

        // --- File input change handler ---
        fileInput.addEventListener("change", async () => {
            const file = fileInput.files?.[0];
            if (!file || uploadTargetSlot < 0) return;

            const slot = uploadTargetSlot;
            uploadTargetSlot = -1;

            try {
                const serverFilename = await uploadImage(file);
                const widget = imageWidgets[slot];
                setComboValue(widget, serverFilename);
                renderGrid();
            } catch (err) {
                console.error("Image upload failed:", err);
            }
        });

        // Initial render
        renderGrid();

        // ================================================================
        // ADD DOM WIDGET TO NODE
        // ================================================================

        const domWidget = node.addDOMWidget("image_stitch_grid", "custom", container, {
            serialize: false,
            hideOnZoom: false,
        });
        domWidget.computeSize = () => [420, 540];

        // Resize node to fit
        setTimeout(() => {
            const sz = node.computeSize();
            node.size = [Math.max(420, sz[0]), Math.max(580, sz[1])];
            app.graph.setDirtyCanvas(true, true);
        }, 100);
    },
});
