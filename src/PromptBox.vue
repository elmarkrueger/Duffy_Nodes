<template>
  <div class="prompt-box-root">
    <div class="header">
      <h4>Prompt Box</h4>
      <div class="actions">
        <button @click="clearText">Clear</button>
        <button @click="copyText">Copy</button>
        <button @click="saveText">Save</button>
      </div>
    </div>
    <textarea
      v-model="text"
      @input="emitChange"
      class="prompt-textarea"
      placeholder="Enter your prompt here..."
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{ onChange?: (json: string) => void }>();
const text = ref("");

function serialise() {
  return JSON.stringify({ text: text.value });
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (data.text !== undefined) text.value = data.text;
  } catch (e) {
    // ignore
  }
}

function emitChange() {
  props.onChange?.(serialise());
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
