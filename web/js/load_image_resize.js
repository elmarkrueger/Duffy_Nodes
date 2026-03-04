import { app } from "../../../scripts/app.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function gcd(a, b) { return b ? gcd(b, a % b) : a; }

function aspectRatioString(w, h) {
    const g = gcd(w, h);
    const rw = w / g, rh = h / g;
    return (rw > 100 || rh > 100) ? `${(w / h).toFixed(2)}:1` : `${rw}:${rh}`;
}

const ASPECT_RATIOS = {
    "original": null,
    "1:1": 1.0,
    "4:3": 4 / 3,
    "3:2": 3 / 2,
    "16:9": 16 / 9,
    "21:9": 21 / 9,
    "3:4": 3 / 4,
    "2:3": 2 / 3,
    "9:16": 9 / 16,
    "9:21": 9 / 21,
};

/**
 * Compute the expected output dimensions from target megapixels,
 * aspect ratio, and original image size — mirrors the Python logic.
 */
function computeOutputDims(origW, origH, targetMP, arKey) {
    let targetAR;
    if (arKey === "original" || ASPECT_RATIOS[arKey] == null) {
        targetAR = origW / origH;
    } else {
        targetAR = ASPECT_RATIOS[arKey];
    }

    const targetPx = targetMP * 1_000_000;
    const newHf = Math.sqrt(targetPx / targetAR);
    const newWf = newHf * targetAR;

    const newW = Math.max(Math.round(newWf / 8) * 8, 8);
    const newH = Math.max(Math.round(newHf / 8) * 8, 8);
    return { w: newW, h: newH };
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------
app.registerExtension({
    name: "Duffy.LoadImageResize",

    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_LoadImageResize") return;

        // Visual theme consistent with other Duffy image nodes
        node.color = "#2B4E5C";
        node.bgcolor = "#1A2F38";

        // Create the info display widget
        const infoDiv = document.createElement("div");
        infoDiv.className = "duffy-image-info";
        infoDiv.style.cssText = [
            "padding: 6px 10px",
            "font-family: monospace",
            "font-size: 11px",
            "line-height: 1.5",
            "color: #c8c8c8",
            "background: #1e1e1e",
            "border: 1px solid #3a3a3a",
            "border-radius: 4px",
            "white-space: pre",
            "pointer-events: none",
            "user-select: none",
        ].join(";");
        infoDiv.textContent = "No image selected";

        const infoWidget = node.addDOMWidget(
            "image_info_display",
            "custom",
            infoDiv,
            {
                serialize: false,
                hideOnZoom: false,
            }
        );
        infoWidget.computeSize = () => [0, 110];

        // -----------------------------------------------------------------
        // State: remember original dimensions so other widgets can trigger
        // a recalculation of the output preview.
        // -----------------------------------------------------------------
        let srcW = 0, srcH = 0;

        function getWidgetValue(name) {
            const w = node.widgets?.find(x => x.name === name);
            return w ? w.value : undefined;
        }

        /**
         * Refresh the info display using the current widget values and
         * the known source dimensions.
         */
        function refreshDisplay() {
            const filename = getWidgetValue("image");
            if (!filename) {
                infoDiv.textContent = "No image selected";
                return;
            }

            const displayName = filename.split("/").pop();
            const lines = [`File:   ${displayName}`];

            if (srcW > 0 && srcH > 0) {
                lines.push(`Source: ${srcW} × ${srcH}`);

                const targetMP = parseFloat(getWidgetValue("target_megapixels")) || 1.0;
                const arKey = getWidgetValue("aspect_ratio") || "original";
                const out = computeOutputDims(srcW, srcH, targetMP, arKey);

                lines.push(`Output: ${out.w} × ${out.h}`);
                lines.push(`Ratio:  ${aspectRatioString(out.w, out.h)}`);
                lines.push(`MP:     ${((out.w * out.h) / 1_000_000).toFixed(4)}`);
            }

            infoDiv.textContent = lines.join("\n");
        }

        /**
         * Load the selected image via ComfyUI's /view endpoint to read
         * its native dimensions, then refresh the display.
         */
        function loadImageMeta(filename) {
            if (!filename) {
                srcW = 0; srcH = 0;
                refreshDisplay();
                return;
            }

            const parts = filename.split("/");
            const name = parts.pop();
            const subfolder = parts.join("/");

            const params = new URLSearchParams({ filename: name, type: "input" });
            if (subfolder) params.set("subfolder", subfolder);

            const img = new Image();
            img.onload = () => {
                srcW = img.naturalWidth;
                srcH = img.naturalHeight;
                refreshDisplay();
            };
            img.onerror = () => {
                srcW = 0; srcH = 0;
                infoDiv.textContent = `File: ${name}`;
            };
            img.src = `/view?${params.toString()}`;
        }

        // -----------------------------------------------------------------
        // Hook into widget callbacks so the display updates live when the
        // user changes image, target megapixels, or aspect ratio.
        // -----------------------------------------------------------------
        function hookWidget(name, needsReload) {
            const w = node.widgets?.find(x => x.name === name);
            if (!w) return;

            const orig = w.callback;
            w.callback = function (value) {
                if (orig) orig.apply(this, arguments);
                if (needsReload) {
                    loadImageMeta(value);
                } else {
                    refreshDisplay();
                }
            };
        }

        // Allow widgets to settle (V3 may add them asynchronously)
        setTimeout(() => {
            hookWidget("image", true);
            hookWidget("target_megapixels", false);
            hookWidget("aspect_ratio", false);

            // Trigger initial load if a file is already selected
            const current = getWidgetValue("image");
            if (current) {
                loadImageMeta(current);
            }
        }, 150);

        // Resize the node to comfortably fit everything
        requestAnimationFrame(() => {
            const size = node.computeSize();
            node.size = [
                Math.max(300, size[0]),
                Math.max(280, size[1]),
            ];
        });
    },

    // Re-apply when a saved workflow is loaded
    loadedGraphNode(node) {
        if (node.comfyClass !== "Duffy_LoadImageResize") return;
        // nodeCreated already runs for loaded nodes in most scenarios,
        // but this catches edge cases with late-loaded graphs.
    },
});
