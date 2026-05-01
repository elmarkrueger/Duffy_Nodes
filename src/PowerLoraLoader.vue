<template>
  <div class="power-lora-loader-root">
    <div class="header">
      <h4>Power LoRA Loader</h4>
    </div>
    
    <div class="lora-list">
      <div v-for="(lora, index) in loras" :key="index" class="lora-item glass-panel" :class="{ 'bypassed': lora.is_active === false }">
        <div class="lora-controls">
          <label>LoRA File</label>
          <div class="lora-input-row">
            <input type="checkbox" v-model="lora.is_active" @change="emitChange" class="bypass-toggle" title="Toggle Bypass" />
            <button class="lora-file-btn" @click="openLoraMenu($event, lora)">
              <span>📂 </span>
              <span class="lora-name-text">{{ lora.name || 'Select LoRA...' }}</span>
            </button>
          </div>
        </div>
        
        <div class="lora-weights">
          <div class="weight-control">
            <label>Strength Model</label>
            <input type="number" v-model.number="lora.strength_model" step="0.05" min="-10.0" max="10.0" @change="emitChange" class="native-num-input" />
          </div>
          <div class="weight-control">
            <label>Strength Clip</label>
            <input type="number" v-model.number="lora.strength_clip" step="0.05" min="-10.0" max="10.0" @change="emitChange" class="native-num-input" />
          </div>
        </div>

        <div class="lora-actions">
          <button class="remove-btn" @click="removeLora(index)">✕</button>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="add-btn glass-btn" @click="addLora">+ Add LoRA</button>
      <div class="global-toggles">
        <button class="global-btn glass-btn" @click="enableAll" title="Enable All">🟢</button>
        <button class="global-btn glass-btn" @click="bypassAll" title="Bypass All">🔴</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "COMFY_API";

const props = defineProps<{ onChange?: (json: string) => void }>();

interface LoraEntry {
  name: string;
  strength_model: number;
  strength_clip: number;
  is_active?: boolean;
}

const loras = ref<LoraEntry[]>([]);
const availableLoras = ref<string[]>([]);

onMounted(async () => {
    try {
        const response = await api.fetchApi("/duffynodes/api/v1/lora-list");
        if (response.ok) {
            const data = await response.json();
            availableLoras.value = data.loras || [];
        }
    } catch (e) {
        console.error("Failed to fetch LoRA list:", e);
    }
});

function serialise() {
    return JSON.stringify(loras.value);
}

function deserialise(json: string) {
    try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
            loras.value = data.map(l => ({
                ...l,
                is_active: l.is_active !== false
            }));
        }
    } catch (e) {
        /* ignore */
    }
}

function openLoraMenu(event: MouseEvent, lora: LoraEntry) {
    // @ts-ignore
    if (typeof LiteGraph !== "undefined" && LiteGraph.ContextMenu) {
         // @ts-ignore
         new LiteGraph.ContextMenu(availableLoras.value, {
             event: event,
             title: "Select LoRA",
             className: "dark",
             callback: (value: any) => {
                 if (typeof value === "string") {
                     lora.name = value;
                     emitChange();
                 }
             }
         });
    }
}

function emitChange() {
    props.onChange?.(serialise());
}

function addLora() {
    loras.value.push({ name: "", strength_model: 1.0, strength_clip: 1.0, is_active: true });
    emitChange();
}

function removeLora(index: number) {
    loras.value.splice(index, 1);
    emitChange();
}

function enableAll() {
    loras.value.forEach(l => l.is_active = true);
    emitChange();
}

function bypassAll() {
    loras.value.forEach(l => l.is_active = false);
    emitChange();
}

function cleanup() {
    // any listeners to remove
}

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
@import 'primevue/resources/themes/aura-dark-green/theme.css';

.power-lora-loader-root {
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

.lora-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-grow: 1;
}

.lora-item {
  transition: opacity 0.2s ease;
}

.lora-item.bypassed {
  opacity: 0.4;
  filter: grayscale(80%);
}

.lora-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bypass-toggle {
  cursor: pointer;
  margin: 0;
  transform: scale(1.2);
  accent-color: var(--primary-color, #10b981);
}

.glass-panel {
  background: rgba(40, 40, 40, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.lora-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lora-controls label, .weight-control label {
  font-size: 11px;
  color: #888;
}

.lora-weights {
  display: flex;
  gap: 8px;
}

.weight-control {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.native-num-input {
  width: 100%;
  background: var(--surface-800, #1e1e1e);
  border: 1px solid var(--surface-border, #3f3f46);
  color: var(--text-color, #ffffff);
  padding: 6px 8px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.native-num-input:focus {
  border-color: var(--primary-color, #10b981);
}

.actions {
  margin-top: 8px;
}

.glass-btn {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.glass-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.global-toggles {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.global-btn {
  flex: 1;
  font-size: 16px;
}

.lora-file-btn {
  width: 100%;
  background: var(--surface-800, #1e1e1e);
  border: 1px solid var(--surface-border, #3f3f46);
  color: var(--text-color, #ffffff);
  padding: 8px 12px;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s, border-color 0.2s;
  overflow: hidden;
}
.lora-file-btn:hover {
  border-color: var(--primary-color, #10b981);
}
.lora-name-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: transparent;
  border: none;
  color: #ff5555;
  cursor: pointer;
  font-size: 12px;
}

.remove-btn:hover {
  color: #ff0000;
}

/* Headless PrimeVue basic resets to ensure it looks okay */
:deep(.p-autocomplete) {
  width: 100%;
}
:deep(.p-autocomplete-input) {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  color: #ddd;
  padding: 4px;
  border-radius: 4px;
}
:deep(.p-inputnumber-input) {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  color: #ddd;
  padding: 4px;
  border-radius: 4px;
}
</style>
