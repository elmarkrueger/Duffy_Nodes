import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import SAM3MaskEditorWidget from "./components/SAM3MaskEditorWidget.vue";

comfyApp.registerExtension({
  name: "Duffy.SAM3MaskEditor.Vue",

  async nodeCreated(node: any) {
    if (node.comfyClass !== "Duffy_SAM3MaskEditor") return;

    const imageFileWidget = node.widgets?.find(
      (w: any) => w.name === "image_file"
    );
    const promptWidget = node.widgets?.find(
      (w: any) => w.name === "prompt_text"
    );
    const bboxWidget = node.widgets?.find(
      (w: any) => w.name === "internal_bboxes"
    );
    const coordWidget = node.widgets?.find(
      (w: any) => w.name === "internal_coords"
    );
    const negativeCoordWidget = node.widgets?.find(
      (w: any) => w.name === "internal_negative_coords"
    );
    const resizeMetaWidget = node.widgets?.find(
      (w: any) => w.name === "internal_resize_meta"
    );

    if (!promptWidget || !bboxWidget || !coordWidget || !negativeCoordWidget) return;

    const hiddenWidgets = [bboxWidget, coordWidget, negativeCoordWidget, resizeMetaWidget].filter(Boolean);
    hiddenWidgets.forEach(w => {
      w.type = "hidden";
      w.computeSize = () => [0, -4];
      w.options = w.options || {};
      w.options.hidden = true;
      w.hidden = true;
    });

    if (imageFileWidget) {
      if (imageFileWidget.inputEl) {
        imageFileWidget.inputEl.readOnly = true;
      }
      imageFileWidget.disabled = true;
    }

    const container = document.createElement("div");
    container.style.cssText =
      "width:100%;box-sizing:border-box;overflow:hidden;padding:4px 8px;";
    container.addEventListener("pointerdown", (e: PointerEvent) =>
      e.stopPropagation()
    );
    container.addEventListener("mousedown", (e: MouseEvent) =>
      e.stopPropagation()
    );
    container.addEventListener("mouseup", (e: MouseEvent) =>
      e.stopPropagation()
    );
    container.addEventListener("wheel", (e: WheelEvent) =>
      e.stopPropagation()
    );
    container.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = (comfyApp as any).canvas;
      if (canvas) canvas.processContextMenu(node, e);
    });

    function getImageUrl(): string {
      const fname = imageFileWidget?.value || "";
      if (!fname) return "";
      return "/view?filename=" + encodeURIComponent(fname) + "&type=input";
    }

    const vueApp = createApp(SAM3MaskEditorWidget, {
      initialPrompt: promptWidget.value || "",
      initialCoordsJson: coordWidget.value || "[]",
      initialNegativeCoordsJson: negativeCoordWidget.value || "[]",
      initialBboxesJson: bboxWidget.value || "[]",
      initialResizeMetaJson: resizeMetaWidget?.value || "{}",
      imageUrl: getImageUrl(),
      onPromptChange: (text: string) => {
        if (promptWidget) promptWidget.value = text;
      },
      onAnnotationsChange: (coords: string, negativeCoords: string, bboxes: string, resizeMeta?: string) => {
        if (coordWidget) coordWidget.value = coords;
        if (negativeCoordWidget) negativeCoordWidget.value = negativeCoords;
        if (bboxWidget) bboxWidget.value = bboxes;
        if (resizeMetaWidget && resizeMeta !== undefined) {
          resizeMetaWidget.value = resizeMeta;
        }
        node.setDirtyCanvas(true, true);
      },
      onImageFileChange: (filename: string) => {
        if (imageFileWidget) {
          imageFileWidget.value = filename;
          instance.setImageUrl(getImageUrl());
          node.setDirtyCanvas(true, true);
        }
      },
    });

    const instance = vueApp.mount(container) as any;

    const domWidget = node.addDOMWidget(
      "vue_ui",
      "custom",
      container,
      { serialize: false }
    );
    domWidget.content = container;
    domWidget.computeSize = () => [
      node.size[0],
      60,
    ];

    const origOnResize = node.onResize;
    node.onResize = function (size: [number, number]) {
      size[0] = Math.max(320, size[0]);
      origOnResize?.call(this, size);
    };
    node.setSize?.([Math.max(320, node.size?.[0] ?? 320), node.size?.[1] ?? 120]);

    // Hydrate Vue state from widget values
    if (coordWidget?.value || bboxWidget?.value) {
      instance.deserialise({
        coordsJson: coordWidget.value || "[]",
        negativeCoordsJson: negativeCoordWidget?.value || "[]",
        bboxesJson: bboxWidget.value || "[]",
        resizeMetaJson: resizeMetaWidget?.value || "{}",
      });
    }

    // Restore widget values on workflow load
    const origConfigure = node.configure;
    node.configure = function (info: any) {
      if (info.widgets_values) {
        if (bboxWidget && info.widgets_values.length > 2) bboxWidget.value = info.widgets_values[2];
        if (coordWidget && info.widgets_values.length > 3) coordWidget.value = info.widgets_values[3];
        if (negativeCoordWidget && info.widgets_values.length > 4) negativeCoordWidget.value = info.widgets_values[4];
        if (resizeMetaWidget && info.widgets_values.length > 5) resizeMetaWidget.value = info.widgets_values[5];
      }
      origConfigure?.call(this, info);
      instance.deserialise({
        coordsJson: coordWidget?.value || "[]",
        negativeCoordsJson: negativeCoordWidget?.value || "[]",
        bboxesJson: bboxWidget?.value || "[]",
        resizeMetaJson: resizeMetaWidget?.value || "{}",
      });
      instance.setImageUrl(getImageUrl());
    };

    const origRemoved = node.onRemoved;
    node.onRemoved = function () {
      instance.cleanup?.();
      vueApp.unmount();
      origRemoved?.apply(this, arguments as any);
    };
  },
});
