<template>
  <div class="prompt-box-root">
    <div class="header">
      <h4>Prompt Box</h4>
      <div class="actions">
        <button @click="clearText">Clear</button>
        <button @click="copyText">Copy</button>
        <button @click="pasteText">Paste</button>
        <button @click="saveText">Save</button>
      </div>
    </div>
    <div class="font-size-row">
      <label>Font Size</label>
      <input type="range" min="8" max="32" step="1" v-model.number="fontSize" @input="emitChange" @dblclick="resetFontSize" />
      <span class="font-size-val">{{ fontSize }}px</span>
    </div>
    <textarea
      ref="textareaRef"
      v-model="text"
      @input="emitChange"
      @paste="handleNativePaste"
      class="prompt-textarea"
      :style="{ fontSize: fontSize + 'px' }"
      placeholder="Enter your prompt here..."
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const DEFAULT_FONT_SIZE = 14;

const props = defineProps<{ onChange?: (json: string) => void }>();
const text = ref("");
const fontSize = ref(DEFAULT_FONT_SIZE);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function serialise() {
  return JSON.stringify({ text: text.value, fontSize: fontSize.value });
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (data.text !== undefined) text.value = data.text;
    if (data.fontSize !== undefined) fontSize.value = data.fontSize;
  } catch (e) {
    // ignore
  }
}

function resetFontSize() {
  fontSize.value = DEFAULT_FONT_SIZE;
  emitChange();
}

function emitChange() {
  props.onChange?.(serialise());
}

function handleNativePaste(e: ClipboardEvent) {
  // Let the browser perform the default paste into the textarea,
  // then sync v-model on the next tick.
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
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(text.value);
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
}

function cleanup() {}

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
.prompt-box-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 8px;
  background: var(--comfy-menu-bg, #222);
  color: var(--comfy-text-normal, #ddd);
  border-radius: 6px;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

h4 {
  margin: 0;
  font-size: 14px;
}

.actions button {
  margin-left: 4px;
  padding: 2px 6px;
  background: var(--comfy-input-bg, #333);
  color: var(--comfy-text-normal, #ddd);
  border: 1px solid var(--comfy-input-border, #444);
  border-radius: 4px;
  cursor: pointer;
}

.actions button:hover {
  background: var(--comfy-input-hover, #444);
}

.font-size-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.font-size-row label {
  font-size: 12px;
  white-space: nowrap;
}

.font-size-row input[type="range"] {
  flex: 1;
  cursor: pointer;
}

.font-size-val {
  font-size: 12px;
  min-width: 36px;
  text-align: right;
}

.prompt-textarea {
  flex-grow: 1;
  width: 100%;
  resize: none;
  background: var(--comfy-input-bg, #111);
  color: var(--comfy-text-normal, #eee);
  border: 1px solid var(--comfy-input-border, #333);
  border-radius: 4px;
  padding: 8px;
  font-family: inherit;
  box-sizing: border-box;
}
</style>
