<template>
  <div class="prompt-loader-root" :class="{ 'has-error': execution.error }">
    <div class="panel-header">
      <div>
        <h3>Prompt Loader</h3>
        <p>Iterate prompt pairs from a text file with custom markers.</p>
      </div>
      <span class="status-pill" :class="statusClass">{{ execution.status || "Idle" }}</span>
    </div>

    <div class="panel-grid">
      <label class="field file-field">
        <span>Prompt File</span>
        <div class="file-row">
          <input
            :value="state.filePath"
            type="text"
            placeholder="Select a .txt, .csv, or .md file"
            @input="onFilePathInput"
          />
          <button type="button" class="btn secondary" @click="browseFile">Browse</button>
        </div>
      </label>

      <div class="field-row">
        <label class="field">
          <span>Separator</span>
          <input :value="state.separator" type="text" @input="onSeparatorInput" />
        </label>
        <label class="field">
          <span>Positive Marker</span>
          <input :value="state.positiveMarker" type="text" @input="onPositiveMarkerInput" />
        </label>
        <label class="field">
          <span>Negative Marker</span>
          <input :value="state.negativeMarker" type="text" @input="onNegativeMarkerInput" />
        </label>
      </div>

      <div class="action-row">
        <label class="toggle">
          <input :checked="state.autoQueue" type="checkbox" @change="onAutoQueueChange" />
          <span>Auto-Queue</span>
        </label>
        <button type="button" class="btn warn" @click="resetLoop">Reset Loop</button>
      </div>

      <div class="runtime-card">
        <div class="metric">
          <strong>{{ execution.index }}</strong>
          <small>Current</small>
        </div>
        <div class="metric">
          <strong>{{ execution.total }}</strong>
          <small>Total</small>
        </div>
        <div class="metric wide">
          <strong>{{ execution.queued ? "Queued" : "Not Queued" }}</strong>
          <small>{{ execution.queueMessage || "Queue idle" }}</small>
        </div>
      </div>

      <p v-if="execution.error" class="error-text">{{ execution.error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";

type PromptLoaderWidgetState = {
  filePath: string;
  separator: string;
  positiveMarker: string;
  negativeMarker: string;
  autoQueue: boolean;
  resetCounter: number;
};

type ExecutionStatus = {
  status: string;
  index: number;
  total: number;
  queued: boolean;
  queueMessage: string;
  error: string;
  exhausted: boolean;
};

const props = defineProps<{
  initialState: PromptLoaderWidgetState;
  onChange?: (nextState: PromptLoaderWidgetState) => void;
  onBrowse?: () => Promise<string | null>;
}>();

const state = reactive<PromptLoaderWidgetState>({
  filePath: props.initialState.filePath || "",
  separator: props.initialState.separator || "|",
  positiveMarker: props.initialState.positiveMarker || "(+)",
  negativeMarker: props.initialState.negativeMarker || "(-)",
  autoQueue: Boolean(props.initialState.autoQueue),
  resetCounter: Number.isFinite(props.initialState.resetCounter)
    ? Number(props.initialState.resetCounter)
    : 0,
});

const execution = reactive<ExecutionStatus>({
  status: "Idle",
  index: 0,
  total: 0,
  queued: false,
  queueMessage: "",
  error: "",
  exhausted: false,
});

const statusClass = computed(() => {
  if (execution.error) return "error";
  if (execution.exhausted) return "done";
  if (execution.status.toLowerCase().includes("processing")) return "active";
  return "idle";
});

function emitChange() {
  props.onChange?.({
    filePath: state.filePath,
    separator: state.separator,
    positiveMarker: state.positiveMarker,
    negativeMarker: state.negativeMarker,
    autoQueue: state.autoQueue,
    resetCounter: state.resetCounter,
  });
}

function onFilePathInput(event: Event) {
  state.filePath = (event.target as HTMLInputElement).value;
  emitChange();
}

function onSeparatorInput(event: Event) {
  state.separator = (event.target as HTMLInputElement).value;
  emitChange();
}

function onPositiveMarkerInput(event: Event) {
  state.positiveMarker = (event.target as HTMLInputElement).value;
  emitChange();
}

function onNegativeMarkerInput(event: Event) {
  state.negativeMarker = (event.target as HTMLInputElement).value;
  emitChange();
}

function onAutoQueueChange(event: Event) {
  state.autoQueue = (event.target as HTMLInputElement).checked;
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

function deserialise(nextState: Partial<PromptLoaderWidgetState>) {
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

function applyExecutionStatus(next: Partial<ExecutionStatus>) {
  execution.status = next.status ?? execution.status;
  execution.index = typeof next.index === "number" ? next.index : execution.index;
  execution.total = typeof next.total === "number" ? next.total : execution.total;
  execution.queued = typeof next.queued === "boolean" ? next.queued : execution.queued;
  execution.queueMessage = next.queueMessage ?? execution.queueMessage;
  execution.error = next.error ?? execution.error;
  execution.exhausted = typeof next.exhausted === "boolean" ? next.exhausted : execution.exhausted;
}

function cleanup() {
  // No-op for API consistency with other Vue node widgets.
}

defineExpose({ deserialise, applyExecutionStatus, cleanup });
</script>

<style scoped>
.prompt-loader-root {
  width: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  padding: 14px;
  color: #efe6d8;
  background:
    radial-gradient(circle at top right, rgba(193, 102, 28, 0.24), transparent 40%),
    linear-gradient(180deg, #191c22 0%, #11141b 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
}

.prompt-loader-root.has-error {
  border-color: rgba(204, 77, 77, 0.9);
  box-shadow: 0 0 0 1px rgba(204, 77, 77, 0.35) inset;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.panel-header h3 {
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.02em;
}

.panel-header p {
  margin: 4px 0 0;
  color: #c8b8a3;
  font-size: 12px;
}

.status-pill {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  border: 1px solid transparent;
}

.status-pill.idle {
  background: rgba(120, 132, 152, 0.2);
  border-color: rgba(120, 132, 152, 0.45);
}

.status-pill.active {
  background: rgba(220, 138, 66, 0.24);
  border-color: rgba(220, 138, 66, 0.6);
}

.status-pill.done {
  background: rgba(107, 176, 115, 0.22);
  border-color: rgba(107, 176, 115, 0.55);
}

.status-pill.error {
  background: rgba(209, 82, 82, 0.25);
  border-color: rgba(209, 82, 82, 0.75);
}

.panel-grid {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field > span {
  color: #cec0ad;
  font-size: 12px;
}

.field input[type="text"] {
  height: 33px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 12, 17, 0.55);
  color: #f4ecdf;
  padding: 0 10px;
  font-size: 13px;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.file-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.toggle {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: #efe5d6;
}

.btn {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 6px 10px;
  color: #fff4e8;
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.btn.secondary {
  background: linear-gradient(180deg, #2f3947 0%, #242c38 100%);
}

.btn.warn {
  background: linear-gradient(180deg, #c56a2a 0%, #8f3f18 100%);
}

.runtime-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.metric {
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric.wide {
  grid-column: span 1;
}

.metric strong {
  font-size: 14px;
  color: #fff0de;
}

.metric small {
  color: #c3b29c;
  font-size: 11px;
}

.error-text {
  margin: 0;
  padding: 8px;
  border-radius: 8px;
  color: #ffb1b1;
  background: rgba(128, 24, 24, 0.35);
  border: 1px solid rgba(209, 82, 82, 0.55);
  font-size: 12px;
}

@media (max-width: 840px) {
  .field-row,
  .runtime-card {
    grid-template-columns: 1fr;
  }
}
</style>
