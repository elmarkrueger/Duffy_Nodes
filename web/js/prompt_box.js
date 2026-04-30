import { app } from "../../../scripts/app.js";
import { d as defineComponent, b as openBlock, c as createElementBlock, e as createBaseVNode, k as normalizeClass, t as toDisplayString, w as withDirectives, v as vModelText, m as normalizeStyle, h as ref, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-C_mSG4ak.js";
const _hoisted_1 = { class: "prompt-box-root" };
const _hoisted_2 = { class: "header" };
const _hoisted_3 = { class: "actions" };
const _hoisted_4 = { class: "font-size-row" };
const _hoisted_5 = { class: "font-size-val" };
const DEFAULT_FONT_SIZE = 14;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PromptBox",
  props: {
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const text = ref("");
    const fontSize = ref(DEFAULT_FONT_SIZE);
    const textareaRef = ref(null);
    const feedbackButton = ref(null);
    let feedbackTimer = null;
    function showFeedback(name) {
      if (feedbackTimer) clearTimeout(feedbackTimer);
      feedbackButton.value = name;
      feedbackTimer = setTimeout(() => {
        feedbackButton.value = null;
        feedbackTimer = null;
      }, 800);
    }
    function serialise() {
      return JSON.stringify({ text: text.value, fontSize: fontSize.value });
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (data.text !== void 0) text.value = data.text;
        if (data.fontSize !== void 0) fontSize.value = data.fontSize;
      } catch (e) {
      }
    }
    function resetFontSize() {
      fontSize.value = DEFAULT_FONT_SIZE;
      emitChange();
    }
    function emitChange() {
      var _a;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function handleNativePaste(e) {
      setTimeout(() => {
        if (textareaRef.value) {
          text.value = textareaRef.value.value;
        }
        emitChange();
      }, 0);
    }
    function clearText() {
      text.value = "";
      emitChange();
      showFeedback("clear");
    }
    async function copyText() {
      try {
        await navigator.clipboard.writeText(text.value);
        showFeedback("copy");
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    }
    async function pasteText() {
      try {
        const pasteStr = await navigator.clipboard.readText();
        if (textareaRef.value) {
          const el = textareaRef.value;
          const start = el.selectionStart;
          const end = el.selectionEnd;
          text.value = text.value.substring(0, start) + pasteStr + text.value.substring(end);
          setTimeout(() => {
            el.selectionStart = el.selectionEnd = start + pasteStr.length;
            el.focus();
          }, 0);
        } else {
          text.value += pasteStr;
        }
        emitChange();
        showFeedback("paste");
      } catch (err) {
        console.error("Failed to paste text: ", err);
        alert("Clipboard read permission denied. Please use Ctrl+V or Right Click -> Paste instead.");
      }
    }
    function saveText() {
      if (!text.value) return;
      const blob = new Blob([text.value], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "prompt.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback("save");
    }
    function cleanup() {
      if (feedbackTimer) clearTimeout(feedbackTimer);
    }
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          _cache[2] || (_cache[2] = createBaseVNode("h4", null, "Prompt Box", -1)),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("button", {
              onClick: clearText,
              class: normalizeClass({ "btn-feedback": feedbackButton.value === "clear" })
            }, toDisplayString(feedbackButton.value === "clear" ? "Cleared ✓" : "Clear"), 3),
            createBaseVNode("button", {
              onClick: copyText,
              class: normalizeClass({ "btn-feedback": feedbackButton.value === "copy" })
            }, toDisplayString(feedbackButton.value === "copy" ? "Copied ✓" : "Copy"), 3),
            createBaseVNode("button", {
              onClick: pasteText,
              class: normalizeClass({ "btn-feedback": feedbackButton.value === "paste" })
            }, toDisplayString(feedbackButton.value === "paste" ? "Pasted ✓" : "Paste"), 3),
            createBaseVNode("button", {
              onClick: saveText,
              class: normalizeClass({ "btn-feedback": feedbackButton.value === "save" })
            }, toDisplayString(feedbackButton.value === "save" ? "Saved ✓" : "Save"), 3)
          ])
        ]),
        createBaseVNode("div", _hoisted_4, [
          _cache[3] || (_cache[3] = createBaseVNode("label", null, "Font Size", -1)),
          withDirectives(createBaseVNode("input", {
            type: "range",
            min: "8",
            max: "32",
            step: "1",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => fontSize.value = $event),
            onInput: emitChange,
            onDblclick: resetFontSize
          }, null, 544), [
            [
              vModelText,
              fontSize.value,
              void 0,
              { number: true }
            ]
          ]),
          createBaseVNode("span", _hoisted_5, toDisplayString(fontSize.value) + "px", 1)
        ]),
        withDirectives(createBaseVNode("textarea", {
          ref_key: "textareaRef",
          ref: textareaRef,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => text.value = $event),
          onInput: emitChange,
          onPaste: handleNativePaste,
          class: "prompt-textarea",
          style: normalizeStyle({ fontSize: fontSize.value + "px" }),
          placeholder: "Enter your prompt here..."
        }, null, 36), [
          [vModelText, text.value]
        ])
      ]);
    };
  }
});
const PromptBoxWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e0c93561"]]);
app.registerExtension({
  name: "Duffy.PromptBox.Vue",
  async nodeCreated(node) {
    var _a, _b;
    if (node.comfyClass !== "Duffy_PromptBox") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "json_data");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.hidden = true;
      dataWidget.computeSize = () => [0, 0];
      dataWidget.draw = () => {
      };
    }
    const optWidget = (_b = node.widgets) == null ? void 0 : _b.find((w) => w.name === "optional_input");
    if (optWidget) {
      optWidget.type = "hidden";
      optWidget.hidden = true;
      optWidget.computeSize = () => [0, 0];
      optWidget.draw = () => {
      };
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = app.canvas;
      if (canvas) canvas.processContextMenu(node, e);
    });
    function captureKeyboard(e) {
      if (!container.contains(e.target)) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["v", "c", "x", "a", "z"].includes(key)) {
        e.stopPropagation();
      }
    }
    document.addEventListener("keydown", captureKeyboard, true);
    const vueApp = createApp(PromptBoxWidget, {
      onChange: (json) => {
        if (dataWidget) dataWidget.value = json;
        node.setDirtyCanvas(true, true);
      }
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => [
      node.size[0],
      Math.max(200, (node.size[1] || 200) - 44)
    ];
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(300, size[0]);
      size[1] = Math.max(200, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    if (dataWidget == null ? void 0 : dataWidget.value) instance.deserialise(dataWidget.value);
    const origConfigure = node.configure;
    node.configure = function(info) {
      origConfigure == null ? void 0 : origConfigure.call(this, info);
      if (dataWidget == null ? void 0 : dataWidget.value) instance.deserialise(dataWidget.value);
    };
    const origOnExecuted = node.onExecuted;
    node.onExecuted = function(message) {
      origOnExecuted == null ? void 0 : origOnExecuted.apply(this, arguments);
      if ((message == null ? void 0 : message.text) && message.text.length > 0) {
        instance.deserialise(JSON.stringify({ text: message.text[0] }));
      }
    };
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      document.removeEventListener("keydown", captureKeyboard, true);
      (_a2 = instance.cleanup) == null ? void 0 : _a2.call(instance);
      vueApp.unmount();
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
  }
});
