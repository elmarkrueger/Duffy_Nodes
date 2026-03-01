import { app } from "../../scripts/app.js";

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
        infoWidget.computeSize = () => [0, 90];

        // Update info when execution finishes for this node
        const origOnExecuted = node.onExecuted;
        node.onExecuted = function (output) {
            if (origOnExecuted) origOnExecuted.call(this, output);

            if (!output) return;

            const w = output.width?.[0];
            const h = output.height?.[0];
            const origW = output.original_width?.[0];
            const origH = output.original_height?.[0];
            const fname = output.filename?.[0] ?? "—";
            const mp = output.megapixels?.[0];
            const ar = output.aspect_ratio_str?.[0] ?? "—";

            const lines = [];
            lines.push(`File:   ${fname}`);
            if (origW != null && origH != null) {
                lines.push(`Source: ${origW} × ${origH}`);
            }
            if (w != null && h != null) {
                lines.push(`Output: ${w} × ${h}`);
            }
            if (ar) lines.push(`Ratio:  ${ar}`);
            if (mp != null) lines.push(`MP:     ${mp}`);

            infoDiv.textContent = lines.join("\n");
        };

        // Resize the node to comfortably fit everything
        requestAnimationFrame(() => {
            const size = node.computeSize();
            node.size = [
                Math.max(300, size[0]),
                Math.max(280, size[1]),
            ];
        });
    },
});
