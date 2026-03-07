import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ComfyUI.Custom.DuffyImageTextOverlay",
    
    getCustomWidgets() {
        return {
            DUFFY_COLOR_PICKER: {
                element: (() => {
                    const container = document.createElement("div");
                    container.className = "duffy-color-picker-container";
                    container.style.padding = "4px";
                    container.style.backgroundColor = "#2b2b2b";
                    container.style.borderRadius = "4px";
                    container.style.display = "flex";
                    container.style.alignItems = "center";
                    container.style.gap = "8px";
                    container.style.marginTop = "4px";
                    
                    const label = document.createElement("span");
                    label.innerText = "Color:";
                    label.style.color = "#fff";
                    label.style.fontFamily = "sans-serif";
                    label.style.fontSize = "12px";

                    const colorInput = document.createElement("input");
                    colorInput.type = "color";
                    colorInput.value = "#ffffff";
                    colorInput.style.border = "none";
                    colorInput.style.background = "none";
                    colorInput.style.width = "40px";
                    colorInput.style.height = "30px";
                    colorInput.style.cursor = "pointer";

                    container.appendChild(label);
                    container.appendChild(colorInput);
                    
                    // Expose the input so we can bind to it later
                    container.__colorInput = colorInput;
                    
                    // Event listeners
                    colorInput.addEventListener("pointerdown", (e) => {
                        e.stopPropagation(); // Stop propagation to prevent node dragging
                    });

                    return container;
                })(),
                
                capturePointerEvents: true,
                captureWheelEvents: true,
                stretch: true,
                minHeight: 45
            }
        };
    },

    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_ImageTextOverlay") return;

        // Apply theme colors
        node.color = "#3a2b4c"; 
        node.bgcolor = "#2c1f3a";
        
        // Hide the original font_color widget if it exists to avoid duplication
        const fontColorWidget = node.widgets?.find(w => w.name === "font_color");
        if (fontColorWidget) {
            // Hide it visually, but keep it for serialization
            fontColorWidget.type = "hidden";
            fontColorWidget.computeSize = () => [0, -4];
        }

        // Add the custom widget
        const customWidget = node.addWidget("DUFFY_COLOR_PICKER", "custom_color_picker", null, () => {});
        
        // Bind the HTML input to the node's font_color property/widget
        if (customWidget && customWidget.element) {
            const input = customWidget.element.__colorInput;
            
            // Set initial value
            if (fontColorWidget && fontColorWidget.value) {
                input.value = fontColorWidget.value;
            }

            input.addEventListener("input", (e) => {
                const color = e.target.value;
                if (fontColorWidget) {
                    fontColorWidget.value = color;
                } else {
                    node.properties["font_color"] = color;
                }
                app.graph.setDirtyCanvas(true, true);
            });
        }
        
        const requiredSize = node.computeSize();
        node.size = [Math.max(280, requiredSize[0]), Math.max(220, requiredSize[1])];
    }
});
