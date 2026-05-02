import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import RichTextNoteWidget from "./components/RichTextNoteWidget.vue";

comfyApp.registerExtension({
  name: "Duffy.RichTextNote.Vue",

  async nodeCreated(node: any) {
    if (node.comfyClass !== "Duffy_RichTextNote") return;

    const dataWidget = node.widgets?.find(
      (w: any) => w.name === "rich_text"
    );
    if (dataWidget) {
      const idx = node.widgets.indexOf(dataWidget);
      if (idx !== -1) node.widgets.splice(idx, 1);
    }

    const container = document.createElement("div");
    container.style.cssText =
      "width:100%;height:100%;box-sizing:border-box;overflow:hidden;";
    container.addEventListener("pointerdown", (e: PointerEvent) =>
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

    const vueApp = createApp(RichTextNoteWidget, {
      initialHtml: dataWidget?.value || "",
      onChange: (html: string) => {
        if (dataWidget) dataWidget.value = html;
        node.setDirtyCanvas(true, true);
      },
    });

    const instance = vueApp.mount(container) as any;

    const domWidget = node.addDOMWidget(
      "vue_ui",
      "custom",
      container,
      { serialize: false }
    );
    domWidget.computeSize = () => [
      node.size[0],
      Math.max(200, (node.size[1] || 200) - 44),
    ];

    const origOnResize = node.onResize;
    node.onResize = function (size: [number, number]) {
      size[0] = Math.max(300, size[0]);
      size[1] = Math.max(250, size[1]);
      origOnResize?.call(this, size);
    };

    if (dataWidget?.value) {
      instance.deserialise(dataWidget.value);
    }

    const origSerialize = node.serialize;
    node.serialize = function () {
      if (dataWidget) node.widgets.unshift(dataWidget);
      const result = origSerialize?.call(this);
      if (dataWidget) {
        const i = node.widgets.indexOf(dataWidget);
        if (i !== -1) node.widgets.splice(i, 1);
      }
      return result;
    };

    const origConfigure = node.configure;
    node.configure = function (info: any) {
      if (dataWidget && info.widgets_values) {
        dataWidget.value = info.widgets_values[0] || "";
      }
      origConfigure?.call(this, info);
      if (dataWidget?.value) {
        instance.deserialise(dataWidget.value);
      }
    };

    const origRemoved = node.onRemoved;
    node.onRemoved = function () {
      instance.cleanup?.();
      vueApp.unmount();
      origRemoved?.apply(this, arguments as any);
    };
  },
});
