import { app } from "../../../scripts/app.js";

app.registerExtension({
    name: "ComfyUI.Custom.DuffyImageTextOverlay",

    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_ImageTextOverlay") return;

        // Apply theme colors
        node.color = "#3a2b4c";
        node.bgcolor = "#2c1f3a";

        // Find the original font_color string widget and hide it
        const fontColorWidget = node.widgets?.find(w => w.name === "font_color");
        if (fontColorWidget) {
            fontColorWidget.type = "hidden";
            fontColorWidget.computeSize = () => [0, -4];
        }

        // Create color picker DOM element
        const container = document.createElement("div");
        Object.assign(container.style, {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 8px",
        });

        const label = document.createElement("span");
        label.textContent = "Font Color";
        Object.assign(label.style, {
            color: "#ccc",
            fontSize: "13px",
            fontFamily: "sans-serif",
            minWidth: "70px",
        });

        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = fontColorWidget?.value || "#FFFFFF";
        colorInput.title = "Click to pick a color";
        Object.assign(colorInput.style, {
            border: "2px solid #555",
            borderRadius: "4px",
            background: "none",
            width: "44px",
            height: "30px",
            cursor: "pointer",
            padding: "0",
        });

        const hexLabel = document.createElement("span");
        hexLabel.textContent = colorInput.value;
        Object.assign(hexLabel.style, {
            color: "#aaa",
            fontSize: "12px",
            fontFamily: "monospace",
        });

        const hint = document.createElement("span");
        hint.textContent = "\u25C0 click to pick";
        Object.assign(hint.style, {
            color: "#777",
            fontSize: "10px",
            fontFamily: "sans-serif",
            fontStyle: "italic",
        });

        container.appendChild(label);
        container.appendChild(colorInput);
        container.appendChild(hexLabel);
        container.appendChild(hint);

        // Prevent canvas drag/zoom when interacting with the picker
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = app.canvas;
            if (canvas) canvas.processContextMenu(node, e);
        });

        // Bind color picker to the hidden font_color widget
        colorInput.addEventListener("input", (e) => {
            const color = e.target.value;
            if (fontColorWidget) {
                fontColorWidget.value = color;
            }
            hexLabel.textContent = color;
            hint.style.display = "none";
            app.graph.setDirtyCanvas(true, true);
        });

        // Add as a DOM widget (proven working pattern)
        const domWidget = node.addDOMWidget("font_color_picker", "custom", container, {
            serialize: false,
            hideOnZoom: false,
        });
        domWidget.computeSize = () => [200, 36];

        const requiredSize = node.computeSize();
        node.size = [Math.max(280, requiredSize[0]), Math.max(220, requiredSize[1])];
    }
});
