import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "Duffy.MultiPassSampling",

    async nodeCreated(node) {
        if (node.comfyClass !== "Duffy_MultiPassSampling") return;

        // Visual distinction within the workspace
        node.color = "#2E3B4E";
        node.bgcolor = "#1C2430";

        // Recalculate dimensions to ensure sliders render correctly
        const optimalSize = node.computeSize();
        node.size = [
            Math.max(280, optimalSize[0] + 20),
            Math.max(200, optimalSize[1] + 15),
        ];
    },
});
