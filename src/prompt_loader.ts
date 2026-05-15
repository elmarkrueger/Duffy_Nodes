import { api } from "COMFY_API";
import { app as comfyApp } from "COMFY_APP";
import { createApp } from "vue";
import PromptLoaderWidget from "./PromptLoader.vue";

type PromptLoaderState = {
  filePath: string;
  separator: string;
  positiveMarker: string;
  negativeMarker: string;
  autoQueue: boolean;
  resetCounter: number;
};

function safeJsonStringify(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" ? serialized : "{}";
  } catch {
    return "{}";
  }
}

function hideWidget(widget: any) {
  if (!widget) return;
  widget.type = "hidden";
  widget.hidden = true;
  widget.computeSize = () => [0, -4];
}

comfyApp.registerExtension({
  name: "Duffy.PromptLoader.Vue",

  async setup() {
    const apiAny = api as any;
    if (apiAny.__duffyPromptLoaderQueuePatchApplied) {
      return;
    }

    if (typeof apiAny.queuePrompt !== "function") {
      return;
    }

    const originalQueuePrompt = apiAny.queuePrompt.bind(apiAny);
    apiAny.queuePrompt = async function (number: number, data: any) {
      const output = data?.output;
      const workflow = data?.workflow;

      if (output && typeof output === "object") {
        const queueNonce = `q_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const queueClientId = String((apiAny.clientId ?? apiAny.client_id ?? "")).trim();
        const promptJson = safeJsonStringify(output);
        const workflowJson = workflow && typeof workflow === "object" ? safeJsonStringify(workflow) : "{}";

        // Critical: mutate the outgoing serialized payload directly so backend
        // receives the full prompt/workflow snapshot in the same queued request.
        for (const [nodeId, nodeData] of Object.entries(output as Record<string, any>)) {
          if (!nodeData || typeof nodeData !== "object") continue;
          if (nodeData.class_type !== "Duffy_PromptLoader") continue;

          if (!nodeData.inputs || typeof nodeData.inputs !== "object") {
            nodeData.inputs = {};
          }

          nodeData.inputs.full_prompt_json = promptJson;
          nodeData.inputs.full_workflow_json = workflowJson;
          nodeData.inputs.queue_nonce = queueNonce;
          nodeData.inputs.queue_client_id = queueClientId;

          const workflowNodes: any[] = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
          const workflowNode = workflowNodes.find((n: any) => String(n?.id) === String(nodeId));
          if (workflowNode && Array.isArray(workflowNode.widgets_values) && workflowNode.widgets_values.length >= 5) {
            // Widget order follows schema input order.
            workflowNode.widgets_values[1] = promptJson;
            workflowNode.widgets_values[2] = workflowJson;
            workflowNode.widgets_values[3] = queueNonce;
            workflowNode.widgets_values[4] = queueClientId;
          }
        }

        const graphNodes: any[] = Array.isArray((comfyApp as any)?.graph?._nodes)
          ? (comfyApp as any).graph._nodes
          : [];

        for (const graphNode of graphNodes) {
          if (!graphNode || graphNode.comfyClass !== "Duffy_PromptLoader") continue;
          if (graphNode.mode === 2 || graphNode.mode === 4) continue;

          const promptJsonWidget = graphNode.widgets?.find((w: any) => w.name === "full_prompt_json");
          const workflowJsonWidget = graphNode.widgets?.find((w: any) => w.name === "full_workflow_json");
          const queueNonceWidget = graphNode.widgets?.find((w: any) => w.name === "queue_nonce");
          const queueClientIdWidget = graphNode.widgets?.find((w: any) => w.name === "queue_client_id");

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

  async nodeCreated(node: any) {
    if (node.comfyClass !== "Duffy_PromptLoader") return;

    const filePathWidget = node.widgets?.find((w: any) => w.name === "file_path");
    const fullPromptJsonWidget = node.widgets?.find((w: any) => w.name === "full_prompt_json");
    const fullWorkflowJsonWidget = node.widgets?.find((w: any) => w.name === "full_workflow_json");
    const queueNonceWidget = node.widgets?.find((w: any) => w.name === "queue_nonce");
    const queueClientIdWidget = node.widgets?.find((w: any) => w.name === "queue_client_id");
    const separatorWidget = node.widgets?.find((w: any) => w.name === "separator");
    const positiveMarkerWidget = node.widgets?.find((w: any) => w.name === "positive_marker");
    const negativeMarkerWidget = node.widgets?.find((w: any) => w.name === "negative_marker");
    const autoQueueWidget = node.widgets?.find((w: any) => w.name === "auto_queue");
    const resetCounterWidget = node.widgets?.find((w: any) => w.name === "reset_counter");

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
      const canvas = (comfyApp as any).canvas;
      if (canvas) canvas.processContextMenu(node, event);
    });

    const readState = (): PromptLoaderState => ({
      filePath: String(filePathWidget.value ?? ""),
      separator: String(separatorWidget.value ?? "|"),
      positiveMarker: String(positiveMarkerWidget.value ?? "(+)"),
      negativeMarker: String(negativeMarkerWidget.value ?? "(-)"),
      autoQueue: Boolean(autoQueueWidget.value),
      resetCounter: Number.isFinite(Number(resetCounterWidget.value)) ? Number(resetCounterWidget.value) : 0,
    });

    const writeState = (nextState: PromptLoaderState) => {
      filePathWidget.value = nextState.filePath;
      separatorWidget.value = nextState.separator;
      positiveMarkerWidget.value = nextState.positiveMarker;
      negativeMarkerWidget.value = nextState.negativeMarker;
      autoQueueWidget.value = nextState.autoQueue;
      resetCounterWidget.value = nextState.resetCounter;
    };

    async function browseFile(): Promise<string | null> {
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
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = `Browse failed (${response.status})`;
          try {
            const errJson = await response.json();
            if (typeof errJson?.error === "string" && errJson.error.trim().length > 0) {
              errorMessage = errJson.error;
            }
          } catch {
            // Keep fallback message.
          }
          instance.applyExecutionStatus?.({ error: errorMessage });
          return null;
        }

        const data = await response.json();
        if (typeof data?.name === "string" && data.name.trim().length > 0) {
          const subfolder = typeof data.subfolder === "string" ? data.subfolder.trim() : "";
          const typeTag = typeof data.type === "string" && data.type.trim().length > 0 ? data.type.trim() : "input";
          const relPath = subfolder ? `${subfolder}/${data.name}` : data.name;
          const annotatedPath = `${relPath} [${typeTag}]`;
          instance.applyExecutionStatus?.({ error: "" });
          return annotatedPath;
        }
        if (typeof data?.error === "string" && data.error.trim().length > 0) {
          instance.applyExecutionStatus?.({ error: data.error });
        } else {
          instance.applyExecutionStatus?.({ error: "Upload succeeded but no filename was returned." });
        }
      } catch (error) {
        console.warn("Prompt Loader browse failed:", error);
        instance.applyExecutionStatus?.({
          error: error instanceof Error ? error.message : "Browse failed due to an unexpected error.",
        });
      }
      return null;
    }

    async function pickLocalTextFile(): Promise<File | null> {
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
      onChange: (nextState: PromptLoaderState) => {
        writeState(nextState);
        node.setDirtyCanvas?.(true, true);
      },
      onBrowse: browseFile,
    });

    const instance = vueApp.mount(container) as any;

    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });

    const MIN_W = 420;
    const MIN_H = 336;

    // Fixed widget dimensions avoid size feedback loops in legacy/lightgraph view.
    domWidget.computeSize = () => [MIN_W, MIN_H];

    const origOnResize = node.onResize;
    node.onResize = function (size: [number, number]) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize?.call(this, size);
    };

    node.setSize?.([
      Math.max(MIN_W, Array.isArray(node.size) ? node.size[0] : MIN_W),
      Math.max(MIN_H, Array.isArray(node.size) ? node.size[1] : MIN_H),
    ]);

    setTimeout(() => {
      if (node.size && (node.size[0] < MIN_W || node.size[1] < MIN_H)) {
        node.size = [Math.max(MIN_W, node.size[0]), Math.max(MIN_H, node.size[1])];
        node.setDirtyCanvas?.(true, true);
      }
    }, 100);

    const syncFromWidgets = () => {
      instance.deserialise?.(readState());
    };

    syncFromWidgets();

    const origConfigure = node.configure;
    node.configure = function () {
      const result = origConfigure ? origConfigure.apply(this, arguments) : undefined;
      syncFromWidgets();
      return result;
    };

    const origOnExecuted = node.onExecuted;
    node.onExecuted = function (message: any) {
      origOnExecuted?.apply(this, arguments);
      instance.applyExecutionStatus?.({
        status: message?.status?.[0] ?? "",
        index: Number(message?.index?.[0] ?? 0),
        total: Number(message?.total?.[0] ?? 0),
        queued: Boolean(message?.queued?.[0] ?? false),
        queueMessage: message?.queue_message?.[0] ?? "",
        error: message?.error?.[0] ?? "",
        exhausted: Boolean(message?.exhausted?.[0] ?? false),
      });
    };

    const origRemoved = node.onRemoved;
    node.onRemoved = function () {
      instance.cleanup?.();
      vueApp.unmount();
      origRemoved?.apply(this, arguments);
    };
  },
});
