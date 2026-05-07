<template>
  <div class="dynamic-integer-root">
    <div class="header">
      <h4>Dynamic Integer Provider</h4>
    </div>
    
    <div class="int-list">
      <div v-for="(intItem, index) in intList" :key="index" class="int-item glass-panel">
        <div class="int-controls">
          <label>Label</label>
          <input type="text" v-model="intItem.label" @change="emitChange" class="native-text-input" placeholder="Value Label" />
        </div>
        
        <div class="int-weights">
          <div class="weight-control">
            <label>Value</label>
            <input type="number" v-model.number="intItem.value" step="1" @change="emitChange" class="native-num-input" />
          </div>
        </div>

        <div class="int-actions">
          <button class="remove-btn" @click="removeInt(index)">✕</button>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="add-btn glass-btn" @click="addInt" :disabled="intList.length >= 10">+ Add Int</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{ onChange?: (json: string) => void }>();

interface IntEntry {
  label: string;
  value: number;
}

const intList = ref<IntEntry[]>([]);

function serialise() {
    return JSON.stringify(intList.value);
}

function deserialise(json: string) {
    try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
            intList.value = data.slice(0, 10).map(i => ({
                label: i.label || "Int",
                value: typeof i.value === "number" ? i.value : 0
            }));
        }
    } catch (e) {
        /* ignore */
    }
}

function emitChange() {
    props.onChange?.(serialise());
}

function addInt() {
    if (intList.value.length < 10) {
        const newIndex = intList.value.length + 1;
        intList.value.push({ label: `Int ${newIndex}`, value: 0 });
        emitChange();
    }
}

function removeInt(index: number) {
    intList.value.splice(index, 1);
    emitChange();
}

function cleanup() {
    // any listeners to remove
}

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
.dynamic-integer-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  background: rgba(30, 30, 30, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--fg-color, #ddd);
  border-radius: 8px;
  font-family: var(--font-family, sans-serif);
  overflow-y: auto;
}

.header {
  margin-bottom: 8px;
}

.header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--primary-color, #aaa);
}

.int-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-grow: 1;
}

.int-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 4px;
  position: relative;
  transition: opacity 0.2s ease;
}

.int-controls, .int-weights {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 2px;
}

.int-controls label, .weight-control label {
  font-size: 10px;
  color: #888;
}

.weight-control {
  display: flex;
  flex-direction: column;
}

.native-text-input, .native-num-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 4px;
  padding: 4px;
  min-width: 0;
}

.int-actions {
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn {
  background: rgba(255, 50, 50, 0.2);
  border: 1px solid rgba(255, 50, 50, 0.4);
  color: #fff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: rgba(255, 50, 50, 0.4);
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.add-btn {
  width: 100%;
  padding: 8px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.glass-panel {
  background: rgba(40, 40, 40, 0.5);
}
</style>
