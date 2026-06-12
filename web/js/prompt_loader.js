import { api } from "../../../scripts/api.js";
import { app } from "../../../scripts/app.js";
import { d as defineComponent, G as reactive, o as openBlock, c as createElementBlock, a as createBaseVNode, j as normalizeClass, t as toDisplayString, i as createCommentVNode, l as computed, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-CusGlrPr.js";
const _hoisted_1 = { class: "panel-header" };
const _hoisted_2 = { class: "panel-grid" };
const _hoisted_3 = { class: "field file-field" };
const _hoisted_4 = { class: "file-row" };
const _hoisted_5 = ["value"];
const _hoisted_6 = { class: "field-row" };
const _hoisted_7 = { class: "field" };
const _hoisted_8 = ["value"];
const _hoisted_9 = { class: "field" };
const _hoisted_10 = ["value"];
const _hoisted_11 = { class: "field" };
const _hoisted_12 = ["value"];
const _hoisted_13 = { class: "action-row" };
const _hoisted_14 = { class: "toggle" };
const _hoisted_15 = ["checked"];
const _hoisted_16 = { class: "runtime-card" };
const _hoisted_17 = { class: "metric" };
const _hoisted_18 = { class: "metric" };
const _hoisted_19 = { class: "metric wide" };
const _hoisted_20 = {
  key: 0,
  class: "error-text"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PromptLoader",
  props: {
    initialState: {},
    onChange: { type: Function },
    onBrowse: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const state = reactive({
      filePath: props.initialState.filePath || "",
      separator: props.initialState.separator || "|",
      positiveMarker: props.initialState.positiveMarker || "(+)",
      negativeMarker: props.initialState.negativeMarker || "(-)",
      autoQueue: Boolean(props.initialState.autoQueue),
      resetCounter: Number.isFinite(props.initialState.resetCounter) ? Number(props.initialState.resetCounter) : 0
    });
    const execution = reactive({
      status: "Idle",
      index: 0,
      total: 0,
      queued: false,
      queueMessage: "",
      error: "",
      exhausted: false
    });
    const statusClass = computed(() => {
      if (execution.error) return "error";
      if (execution.exhausted) return "done";
      if (execution.status.toLowerCase().includes("processing")) return "active";
      return "idle";
    });
    function emitChange() {
      var _a;
      (_a = props.onChange) == null ? void 0 : _a.call(props, {
        filePath: state.filePath,
        separator: state.separator,
        positiveMarker: state.positiveMarker,
        negativeMarker: state.negativeMarker,
        autoQueue: state.autoQueue,
        resetCounter: state.resetCounter
      });
    }
    function onFilePathInput(event) {
      state.filePath = event.target.value;
      emitChange();
    }
    function onSeparatorInput(event) {
      state.separator = event.target.value;
      emitChange();
    }
    function onPositiveMarkerInput(event) {
      state.positiveMarker = event.target.value;
      emitChange();
    }
    function onNegativeMarkerInput(event) {
      state.negativeMarker = event.target.value;
      emitChange();
    }
    function onAutoQueueChange(event) {
      state.autoQueue = event.target.checked;
      emitChange();
    }
    async function browseFile() {
      if (!props.onBrowse) return;
      const nextPath = await props.onBrowse();
      if (typeof nextPath === "string" && nextPath.length > 0) {
        state.filePath = nextPath;
        emitChange();
      }
    }
    function resetLoop() {
      state.resetCounter += 1;
      execution.exhausted = false;
      execution.error = "";
      emitChange();
    }
    function deserialise(nextState) {
      state.filePath = nextState.filePath ?? state.filePath;
      state.separator = nextState.separator ?? state.separator;
      state.positiveMarker = nextState.positiveMarker ?? state.positiveMarker;
      state.negativeMarker = nextState.negativeMarker ?? state.negativeMarker;
      if (typeof nextState.autoQueue === "boolean") {
        state.autoQueue = nextState.autoQueue;
      }
      if (typeof nextState.resetCounter === "number") {
        state.resetCounter = nextState.resetCounter;
      }
    }
    function applyExecutionStatus(next) {
      execution.status = next.status ?? execution.status;
      execution.index = typeof next.index === "number" ? next.index : execution.index;
      execution.total = typeof next.total === "number" ? next.total : execution.total;
      execution.queued = typeof next.queued === "boolean" ? next.queued : execution.queued;
      execution.queueMessage = next.queueMessage ?? execution.queueMessage;
      execution.error = next.error ?? execution.error;
      execution.exhausted = typeof next.exhausted === "boolean" ? next.exhausted : execution.exhausted;
    }
    function cleanup() {
    }
    __expose({ deserialise, applyExecutionStatus, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["prompt-loader-root", { "has-error": execution.error }])
      }, [
        createBaseVNode("div", _hoisted_1, [
          _cache[0] || (_cache[0] = createBaseVNode("div", null, [
            createBaseVNode("h3", null, "Prompt Loader"),
            createBaseVNode("p", null, "Iterate prompt pairs from a text file with custom markers.")
          ], -1)),
          createBaseVNode("span", {
            class: normalizeClass(["status-pill", statusClass.value])
          }, toDisplayString(execution.status || "Idle"), 3)
        ]),
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("label", _hoisted_3, [
            _cache[1] || (_cache[1] = createBaseVNode("span", null, "Prompt File", -1)),
            createBaseVNode("div", _hoisted_4, [
              createBaseVNode("input", {
                value: state.filePath,
                type: "text",
                placeholder: "Select a .txt, .csv, or .md file",
                onInput: onFilePathInput
              }, null, 40, _hoisted_5),
              createBaseVNode("button", {
                type: "button",
                class: "btn secondary",
                onClick: browseFile
              }, "Browse")
            ])
          ]),
          createBaseVNode("div", _hoisted_6, [
            createBaseVNode("label", _hoisted_7, [
              _cache[2] || (_cache[2] = createBaseVNode("span", null, "Separator", -1)),
              createBaseVNode("input", {
                value: state.separator,
                type: "text",
                onInput: onSeparatorInput
              }, null, 40, _hoisted_8)
            ]),
            createBaseVNode("label", _hoisted_9, [
              _cache[3] || (_cache[3] = createBaseVNode("span", null, "Positive Marker", -1)),
              createBaseVNode("input", {
                value: state.positiveMarker,
                type: "text",
                onInput: onPositiveMarkerInput
              }, null, 40, _hoisted_10)
            ]),
            createBaseVNode("label", _hoisted_11, [
              _cache[4] || (_cache[4] = createBaseVNode("span", null, "Negative Marker", -1)),
              createBaseVNode("input", {
                value: state.negativeMarker,
                type: "text",
                onInput: onNegativeMarkerInput
              }, null, 40, _hoisted_12)
            ])
          ]),
          createBaseVNode("div", _hoisted_13, [
            createBaseVNode("label", _hoisted_14, [
              createBaseVNode("input", {
                checked: state.autoQueue,
                type: "checkbox",
                onChange: onAutoQueueChange
              }, null, 40, _hoisted_15),
              _cache[5] || (_cache[5] = createBaseVNode("span", null, "Auto-Queue", -1))
            ]),
            createBaseVNode("button", {
              type: "button",
              class: "btn warn",
              onClick: resetLoop
            }, "Reset Loop")
          ]),
          createBaseVNode("div", _hoisted_16, [
            createBaseVNode("div", _hoisted_17, [
              createBaseVNode("strong", null, toDisplayString(execution.index), 1),
              _cache[6] || (_cache[6] = createBaseVNode("small", null, "Current", -1))
            ]),
            createBaseVNode("div", _hoisted_18, [
              createBaseVNode("strong", null, toDisplayString(execution.total), 1),
              _cache[7] || (_cache[7] = createBaseVNode("small", null, "Total", -1))
            ]),
            createBaseVNode("div", _hoisted_19, [
              createBaseVNode("strong", null, toDisplayString(execution.queued ? "Queued" : "Not Queued"), 1),
              createBaseVNode("small", null, toDisplayString(execution.queueMessage || "Queue idle"), 1)
            ])
          ]),
          execution.error ? (openBlock(), createElementBlock("p", _hoisted_20, toDisplayString(execution.error), 1)) : createCommentVNode("", true)
        ])
      ], 2);
    };
  }
});
const PromptLoaderWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b88fa84e"]]);
function safeJsonStringify(value) {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" ? serialized : "{}";
  } catch {
    return "{}";
  }
}
function hideWidget(widget) {
  if (!widget) return;
  widget.type = "hidden";
  widget.hidden = true;
  widget.computeSize = () => [0, -4];
}
app.registerExtension({
  name: "Duffy.PromptLoader.Vue",
  async setup() {
    const apiAny = api;
    if (apiAny.__duffyPromptLoaderQueuePatchApplied) {
      return;
    }
    if (typeof apiAny.queuePrompt !== "function") {
      return;
    }
    const originalQueuePrompt = apiAny.queuePrompt.bind(apiAny);
    apiAny.queuePrompt = async function(number, data) {
      var _a, _b, _c, _d, _e, _f;
      const output = data == null ? void 0 : data.output;
      const workflow = data == null ? void 0 : data.workflow;
      if (output && typeof output === "object") {
        const queueNonce = `q_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const queueClientId = String(apiAny.clientId ?? apiAny.client_id ?? "").trim();
        const promptJson = safeJsonStringify(output);
        const workflowJson = workflow && typeof workflow === "object" ? safeJsonStringify(workflow) : "{}";
        for (const [nodeId, nodeData] of Object.entries(output)) {
          if (!nodeData || typeof nodeData !== "object") continue;
          if (nodeData.class_type !== "Duffy_PromptLoader") continue;
          if (!nodeData.inputs || typeof nodeData.inputs !== "object") {
            nodeData.inputs = {};
          }
          nodeData.inputs.full_prompt_json = promptJson;
          nodeData.inputs.full_workflow_json = workflowJson;
          nodeData.inputs.queue_nonce = queueNonce;
          nodeData.inputs.queue_client_id = queueClientId;
          const workflowNodes = Array.isArray(workflow == null ? void 0 : workflow.nodes) ? workflow.nodes : [];
          const workflowNode = workflowNodes.find((n) => String(n == null ? void 0 : n.id) === String(nodeId));
          if (workflowNode && Array.isArray(workflowNode.widgets_values) && workflowNode.widgets_values.length >= 5) {
            workflowNode.widgets_values[1] = promptJson;
            workflowNode.widgets_values[2] = workflowJson;
            workflowNode.widgets_values[3] = queueNonce;
            workflowNode.widgets_values[4] = queueClientId;
          }
        }
        const graphNodes = Array.isArray((_b = (_a = app) == null ? void 0 : _a.graph) == null ? void 0 : _b._nodes) ? app.graph._nodes : [];
        for (const graphNode of graphNodes) {
          if (!graphNode || graphNode.comfyClass !== "Duffy_PromptLoader") continue;
          if (graphNode.mode === 2 || graphNode.mode === 4) continue;
          const promptJsonWidget = (_c = graphNode.widgets) == null ? void 0 : _c.find((w) => w.name === "full_prompt_json");
          const workflowJsonWidget = (_d = graphNode.widgets) == null ? void 0 : _d.find((w) => w.name === "full_workflow_json");
          const queueNonceWidget = (_e = graphNode.widgets) == null ? void 0 : _e.find((w) => w.name === "queue_nonce");
          const queueClientIdWidget = (_f = graphNode.widgets) == null ? void 0 : _f.find((w) => w.name === "queue_client_id");
          if (promptJsonWidget) {
            promptJsonWidget.value = promptJson;
          }
          if (workflowJsonWidget) {
            workflowJsonWidget.value = workflowJson;
          }
          if (queueNonceWidget) {
            queueNonceWidget.value = queueNonce;
          }
          if (queueClientIdWidget) {
            queueClientIdWidget.value = queueClientId;
          }
        }
      }
      return originalQueuePrompt(number, data);
    };
    apiAny.__duffyPromptLoaderQueuePatchApplied = true;
  },
  async nodeCreated(node) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    if (node.comfyClass !== "Duffy_PromptLoader") return;
    const filePathWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "file_path");
    const fullPromptJsonWidget = (_b = node.widgets) == null ? void 0 : _b.find((w) => w.name === "full_prompt_json");
    const fullWorkflowJsonWidget = (_c = node.widgets) == null ? void 0 : _c.find((w) => w.name === "full_workflow_json");
    const queueNonceWidget = (_d = node.widgets) == null ? void 0 : _d.find((w) => w.name === "queue_nonce");
    const queueClientIdWidget = (_e = node.widgets) == null ? void 0 : _e.find((w) => w.name === "queue_client_id");
    const separatorWidget = (_f = node.widgets) == null ? void 0 : _f.find((w) => w.name === "separator");
    const positiveMarkerWidget = (_g = node.widgets) == null ? void 0 : _g.find((w) => w.name === "positive_marker");
    const negativeMarkerWidget = (_h = node.widgets) == null ? void 0 : _h.find((w) => w.name === "negative_marker");
    const autoQueueWidget = (_i = node.widgets) == null ? void 0 : _i.find((w) => w.name === "auto_queue");
    const resetCounterWidget = (_j = node.widgets) == null ? void 0 : _j.find((w) => w.name === "reset_counter");
    if (!filePathWidget || !separatorWidget || !positiveMarkerWidget || !negativeMarkerWidget || !autoQueueWidget || !resetCounterWidget) {
      return;
    }
    hideWidget(separatorWidget);
    hideWidget(positiveMarkerWidget);
    hideWidget(negativeMarkerWidget);
    hideWidget(autoQueueWidget);
    hideWidget(resetCounterWidget);
    hideWidget(filePathWidget);
    hideWidget(fullPromptJsonWidget);
    hideWidget(fullWorkflowJsonWidget);
    hideWidget(queueNonceWidget);
    hideWidget(queueClientIdWidget);
    const container = document.createElement("div");
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:auto;";
    container.addEventListener("pointerdown", (event) => event.stopPropagation());
    container.addEventListener("wheel", (event) => event.stopPropagation());
    container.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const canvas = app.canvas;
      if (canvas) canvas.processContextMenu(node, event);
    });
    const readState = () => ({
      filePath: String(filePathWidget.value ?? ""),
      separator: String(separatorWidget.value ?? "|"),
      positiveMarker: String(positiveMarkerWidget.value ?? "(+)"),
      negativeMarker: String(negativeMarkerWidget.value ?? "(-)"),
      autoQueue: Boolean(autoQueueWidget.value),
      resetCounter: Number.isFinite(Number(resetCounterWidget.value)) ? Number(resetCounterWidget.value) : 0
    });
    const writeState = (nextState) => {
      filePathWidget.value = nextState.filePath;
      separatorWidget.value = nextState.separator;
      positiveMarkerWidget.value = nextState.positiveMarker;
      negativeMarkerWidget.value = nextState.negativeMarker;
      autoQueueWidget.value = nextState.autoQueue;
      resetCounterWidget.value = nextState.resetCounter;
    };
    async function browseFile() {
      var _a2, _b2, _c2, _d2, _e2;
      const file = await pickLocalTextFile();
      if (!file) {
        return null;
      }
      try {
        const formData = new FormData();
        formData.append("image", file, file.name);
        formData.append("type", "input");
        formData.append("overwrite", "true");
        const response = await api.fetchApi("/upload/image", {
          method: "POST",
          body: formData
        });
        if (!response.ok) {
          let errorMessage = `Browse failed (${response.status})`;
          try {
            const errJson = await response.json();
            if (typeof (errJson == null ? void 0 : errJson.error) === "string" && errJson.error.trim().length > 0) {
              errorMessage = errJson.error;
            }
          } catch {
          }
          (_a2 = instance.applyExecutionStatus) == null ? void 0 : _a2.call(instance, { error: errorMessage });
          return null;
        }
        const data = await response.json();
        if (typeof (data == null ? void 0 : data.name) === "string" && data.name.trim().length > 0) {
          const subfolder = typeof data.subfolder === "string" ? data.subfolder.trim() : "";
          const typeTag = typeof data.type === "string" && data.type.trim().length > 0 ? data.type.trim() : "input";
          const relPath = subfolder ? `${subfolder}/${data.name}` : data.name;
          const annotatedPath = `${relPath} [${typeTag}]`;
          (_b2 = instance.applyExecutionStatus) == null ? void 0 : _b2.call(instance, { error: "" });
          return annotatedPath;
        }
        if (typeof (data == null ? void 0 : data.error) === "string" && data.error.trim().length > 0) {
          (_c2 = instance.applyExecutionStatus) == null ? void 0 : _c2.call(instance, { error: data.error });
        } else {
          (_d2 = instance.applyExecutionStatus) == null ? void 0 : _d2.call(instance, { error: "Upload succeeded but no filename was returned." });
        }
      } catch (error) {
        console.warn("Prompt Loader browse failed:", error);
        (_e2 = instance.applyExecutionStatus) == null ? void 0 : _e2.call(instance, {
          error: error instanceof Error ? error.message : "Browse failed due to an unexpected error."
        });
      }
      return null;
    }
    async function pickLocalTextFile() {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.csv,.md,text/plain,text/csv,text/markdown";
        input.style.display = "none";
        input.addEventListener(
          "change",
          () => {
            const chosen = input.files && input.files.length > 0 ? input.files[0] : null;
            input.remove();
            resolve(chosen);
          },
          { once: true }
        );
        document.body.appendChild(input);
        input.click();
      });
    }
    const vueApp = createApp(PromptLoaderWidget, {
      initialState: readState(),
      onChange: (nextState) => {
        var _a2;
        writeState(nextState);
        (_a2 = node.setDirtyCanvas) == null ? void 0 : _a2.call(node, true, true);
      },
      onBrowse: browseFile
    });
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    const MIN_W = 420;
    const MIN_H = 336;
    domWidget.computeSize = () => [MIN_W, MIN_H];
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    (_k = node.setSize) == null ? void 0 : _k.call(node, [
      Math.max(MIN_W, Array.isArray(node.size) ? node.size[0] : MIN_W),
      Math.max(MIN_H, Array.isArray(node.size) ? node.size[1] : MIN_H)
    ]);
    setTimeout(() => {
      var _a2;
      if (node.size && (node.size[0] < MIN_W || node.size[1] < MIN_H)) {
        node.size = [Math.max(MIN_W, node.size[0]), Math.max(MIN_H, node.size[1])];
        (_a2 = node.setDirtyCanvas) == null ? void 0 : _a2.call(node, true, true);
      }
    }, 100);
    const syncFromWidgets = () => {
      var _a2;
      (_a2 = instance.deserialise) == null ? void 0 : _a2.call(instance, readState());
    };
    syncFromWidgets();
    const origConfigure = node.configure;
    node.configure = function() {
      const result = origConfigure ? origConfigure.apply(this, arguments) : void 0;
      syncFromWidgets();
      return result;
    };
    const origOnExecuted = node.onExecuted;
    node.onExecuted = function(message) {
      var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2;
      origOnExecuted == null ? void 0 : origOnExecuted.apply(this, arguments);
      (_h2 = instance.applyExecutionStatus) == null ? void 0 : _h2.call(instance, {
        status: ((_a2 = message == null ? void 0 : message.status) == null ? void 0 : _a2[0]) ?? "",
        index: Number(((_b2 = message == null ? void 0 : message.index) == null ? void 0 : _b2[0]) ?? 0),
        total: Number(((_c2 = message == null ? void 0 : message.total) == null ? void 0 : _c2[0]) ?? 0),
        queued: Boolean(((_d2 = message == null ? void 0 : message.queued) == null ? void 0 : _d2[0]) ?? false),
        queueMessage: ((_e2 = message == null ? void 0 : message.queue_message) == null ? void 0 : _e2[0]) ?? "",
        error: ((_f2 = message == null ? void 0 : message.error) == null ? void 0 : _f2[0]) ?? "",
        exhausted: Boolean(((_g2 = message == null ? void 0 : message.exhausted) == null ? void 0 : _g2[0]) ?? false)
      });
    };
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      (_a2 = instance.cleanup) == null ? void 0 : _a2.call(instance);
      vueApp.unmount();
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
  }
});
