import { createApp } from "vue";
// @ts-ignore
import { app as comfyApp } from "COMFY_APP";
// @ts-ignore
import { api } from "COMFY_API";
import type { CropData } from "./LoadImageResizeCrop.vue";
import LoadImageResizeCrop from "./LoadImageResizeCrop.vue";

/** Build ComfyUI /view URL for an input image. */
function buildViewUrl(imageName: string): string {
    // ComfyUI annotated filenames may contain subfolder: "subfolder/file.png"
    let filename = imageName;
    let subfolder = "";
    const sep = imageName.lastIndexOf("/");
    if (sep !== -1) {
        subfolder = imageName.substring(0, sep);
        filename = imageName.substring(sep + 1);
    }
    const params = new URLSearchParams({
        filename,
        type: "input",
        subfolder,
    });
    return api.apiURL(`/view?${params.toString()}`);
}

/** Parse crop_data JSON into CropData or null. */
function parseCropData(value: string | undefined): CropData | null {
    if (!value) return null;
    try {
        const d = JSON.parse(value);
        if (d && d.w > 0 && d.h > 0) {
            return { x: d.x ?? 0, y: d.y ?? 0, w: d.w, h: d.h };
        }
    } catch { /* empty */ }
    return null;
}

let activeCropModal: { unmount: () => void; container: HTMLDivElement } | null = null;

function destroyActiveModal() {
    if (activeCropModal) {
        activeCropModal.unmount();
        activeCropModal.container.remove();
        activeCropModal = null;
    }
}

comfyApp.registerExtension({
    name: "Duffy.LoadImageResize.Vue",

    async nodeCreated(node: any) {
        if (node.comfyClass !== "Duffy_LoadImageResize") return;

        // ── Locate widgets ───────────────────────────────────────────
        const cropWidget = node.widgets?.find((w: any) => w.name === "crop_data");
        const imageWidget = node.widgets?.find((w: any) => w.name === "image");

        // Hide the crop_data text widget
        if (cropWidget) {
            cropWidget.type = "hidden";
            cropWidget.computeSize = () => [0, -4];
        }

        // ── Reset crop on image change ───────────────────────────────
        if (imageWidget && cropWidget) {
            const origCallback = imageWidget.callback;
            imageWidget.callback = function (...args: any[]) {
                cropWidget.value = "{}";
                node.setDirtyCanvas(true, true);
                if (origCallback) origCallback.apply(this, args);
            };
        }

        // ── Add "Crop Image" button ──────────────────────────────────
        node.addWidget("button", "\u2702 Crop Image", null, () => {
            const imageName = imageWidget?.value;
            if (!imageName) return;

            const imageUrl = buildViewUrl(imageName);
            const initialCrop = parseCropData(cropWidget?.value);

            // Prevent multiple modals
            destroyActiveModal();

            const container = document.createElement("div");
            document.body.appendChild(container);

            const vueApp = createApp(LoadImageResizeCrop, {
                imageUrl,
                initialCrop,
                onApply: (data: CropData) => {
                    if (cropWidget) {
                        cropWidget.value = JSON.stringify(data);
                    }
                    node.setDirtyCanvas(true, true);
                    destroyActiveModal();
                },
                onCancel: () => {
                    destroyActiveModal();
                },
            });

            const instance = vueApp.mount(container) as any;
            activeCropModal = {
                unmount: () => {
                    instance.cleanup?.();
                    vueApp.unmount();
                },
                container,
            };
        });

        // ── Cleanup on node removal ──────────────────────────────────
        const origRemoved = node.onRemoved;
        node.onRemoved = function () {
            destroyActiveModal();
            origRemoved?.apply(this, arguments);
        };
    },
});
