import { app } from "../../../scripts/app.js";

app.registerExtension({
    name: "Duffy.ImageCompare",

    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_ImageCompare") return;

        // Theme colors
        node.color = "#2B4E5C";
        node.bgcolor = "#1A2F38";

        // Main container
        const container = document.createElement("div");
        Object.assign(container.style, {
            width: "100%",
            height: "100%",
            position: "relative",
            backgroundColor: "#111",
            borderRadius: "6px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            border: "1px solid #444",
        });

        // Prevent dragging the canvas when interacting with the widget
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = app.canvas;
            if (canvas) canvas.processContextMenu(node, e);
        });

        // Background Image (image_b / Right)
        const imgB = document.createElement("img");
        Object.assign(imgB.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            userSelect: "none",
            pointerEvents: "none",
        });

        // Foreground Image (image_a / Left)
        const imgA = document.createElement("img");
        Object.assign(imgA.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            userSelect: "none",
            pointerEvents: "none",
            clipPath: "inset(0 50% 0 0)", // Start with 50% split
        });

        // Laser-sharp Slider Line
        const sliderLine = document.createElement("div");
        Object.assign(sliderLine.style, {
            position: "absolute",
            left: "50%",
            top: "0",
            bottom: "0",
            width: "2px",
            backgroundColor: "#00ffff", // Laser sharp cyan
            boxShadow: "0 0 8px #00ffff, 0 0 4px #00ffff",
            pointerEvents: "none",
            transform: "translateX(-50%)",
            zIndex: "10",
        });

        // Placeholder Text
        const placeholder = document.createElement("div");
        placeholder.textContent = "Execute to compare images";
        Object.assign(placeholder.style, {
            color: "#666",
            fontFamily: "sans-serif",
            fontSize: "14px",
            zIndex: "1",
            pointerEvents: "none",
        });

        container.appendChild(placeholder);
        container.appendChild(imgB);
        container.appendChild(imgA);
        container.appendChild(sliderLine);

        // Interaction Logic
        let isDragging = false;
        const updateSlider = (clientX) => {
            const rect = container.getBoundingClientRect();
            let x = clientX - rect.left;
            x = Math.max(0, Math.min(x, rect.width));
            const percent = (x / rect.width) * 100;
            
            // Clip the right side of imgA: 100% - percent
            imgA.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
            sliderLine.style.left = `${percent}%`;
        };

        container.addEventListener("mousedown", (e) => {
            isDragging = true;
            updateSlider(e.clientX);
        });

        const onWindowMouseUp = () => {
            isDragging = false;
        };

        const onWindowMouseMove = (e) => {
            // Update on drag OR on hover (adjusts to mouse position dynamically)
            if (isDragging || container.contains(e.target) || e.target === container) {
                updateSlider(e.clientX);
            }
        };

        window.addEventListener("mouseup", onWindowMouseUp);
        window.addEventListener("mousemove", onWindowMouseMove);

        // Add to DOM Widget
        const domWidget = node.addDOMWidget("compare_slider", "custom", container, {
            serialize: false,
            hideOnZoom: false,
        });

        // Enforce minimum and default sizes
        const MIN_W = 512;
        const MIN_H = 512;
        domWidget.computeSize = () => [MIN_W, MIN_H];

        const origOnResize = node.onResize;
        node.onResize = function (size) {
            size[0] = Math.max(MIN_W, size[0]);
            size[1] = Math.max(MIN_H, size[1]);
            origOnResize?.call(this, size);
        };

        setTimeout(() => {
            const sz = node.computeSize();
            node.size = [Math.max(MIN_W, sz[0]), Math.max(MIN_H, sz[1])];
            app.graph.setDirtyCanvas(true, true);
        }, 100);

        // Handle Execution Results
        const origOnExecuted = node.onExecuted;
        node.onExecuted = function (message) {
            origOnExecuted?.apply(this, arguments);

            if (message?.compare_images && message.compare_images.length >= 2) {
                const makeUrl = (img) => {
                    const params = new URLSearchParams({
                        filename: img.filename,
                        type: img.type || "temp"
                    });
                    if (img.subfolder) params.set("subfolder", img.subfolder);
                    return `/view?${params.toString()}`;
                };

                const t = `&t=${Date.now()}`; // Bypass caching
                imgA.src = makeUrl(message.compare_images[0]) + t;
                imgB.src = makeUrl(message.compare_images[1]) + t;
                
                placeholder.style.display = "none";
            }
        };

        // Cleanup global listeners when node is removed
        const origOnRemoved = node.onRemoved;
        node.onRemoved = function () {
            window.removeEventListener("mouseup", onWindowMouseUp);
            window.removeEventListener("mousemove", onWindowMouseMove);
            origOnRemoved?.apply(this, arguments);
        };
    },
});
