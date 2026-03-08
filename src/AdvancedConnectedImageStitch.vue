<template>
  <div class="advanced-stitch-root" v-if="isActive">
    <div class="preview-container">
      <div :class="previewClass" class="preview-layout">
        <template v-if="layoutData.orientation === 'Horizontal' || layoutData.orientation === 'Vertical'">
          <div v-for="id in sortedImageIds" :key="'hv-'+id" class="preview-cell" :style="getCellStyle(id)">
            <img :src="availableImages[id]" alt="Preview" />
          </div>
        </template>
        
        <template v-else-if="layoutData.orientation === 'Layout'">
          <div v-for="cell in 9" :key="'grid-'+cell" class="preview-cell grid-cell" :style="getGridCellStyle(cell)">
            <img v-if="hasImageForCell(cell)" :src="getImageForCell(cell)" alt="Preview" />
          </div>
        </template>
      </div>
    </div>
    
    <div class="controls-panel">
      <div class="panel-header">
        <h4>Image Stitch Configuration</h4>
        <div class="footer-actions">
          <button class="btn btn-primary" @click="applyAndContinue">Apply & Continue</button>
        </div>
      </div>
      
      <div class="controls-body">
        <div class="control-row">
          <label>Orientation</label>
          <select v-model="layoutData.orientation" @change="onChange">
            <option value="Horizontal">Horizontal</option>
            <option value="Vertical">Vertical</option>
            <option value="Layout">3x3 Grid Layout</option>
          </select>
        </div>

        <div v-if="layoutData.orientation === 'Layout'" class="grid-controls">
          <p class="section-subtitle">Map Connected Images to Grid (1-9)</p>
          <div class="mapping-grid">
            <div v-for="cell in 9" :key="'ctrl-'+cell" class="mapping-cell">
              <label>Pos {{ cell }}</label>
              <select v-model="layoutData.layout_pos[cell]" @change="onChange">
                <option value="none">Empty</option>
                <option v-for="id in availableImageIds" :key="id" :value="id">Image {{ id }}</option>
              </select>
            </div>
          </div>
        </div>
        
        <div v-else class="info-text">
          Images will be combined {{ layoutData.orientation.toLowerCase() }} in numerical order of their connected inputs.
          <br><br>
          Connected inputs: {{ sortedImageIds.length > 0 ? sortedImageIds.join(', ') : 'None' }}
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="idle-state">
    <div class="pulse"></div>
    <p style="font-size: 14px; font-weight: 500;">Waiting for image pipeline...</p>
    <p style="font-size: 12px; color: #444;">
      Mode: {{ layoutData.orientation }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
// @ts-ignore
import { api } from 'COMFY_API';

const props = defineProps<{
  nodeId: string;
  onChange?: (json: string) => void;
}>();

const isActive = ref(false);
const sessionId = ref('');
const availableImages = ref<Record<string, string>>({});

const layoutData = ref({
  orientation: "Horizontal",
  layout_pos: {} as Record<string, string>
});

// Ensure 1-9 exist in layout_pos
for (let i = 1; i <= 9; i++) {
    if (!layoutData.value.layout_pos[i.toString()]) {
        layoutData.value.layout_pos[i.toString()] = "none";
    }
}

const availableImageIds = computed(() => {
    return Object.keys(availableImages.value).sort((a, b) => parseInt(a) - parseInt(b));
});

const sortedImageIds = computed(() => availableImageIds.value);

const previewClass = computed(() => {
    return {
        'layout-horizontal': layoutData.value.orientation === 'Horizontal',
        'layout-vertical': layoutData.value.orientation === 'Vertical',
        'layout-grid': layoutData.value.orientation === 'Layout'
    };
});

function hasImageForCell(cell: number) {
    const mappedId = layoutData.value.layout_pos[cell.toString()];
    return mappedId && mappedId !== "none" && availableImages.value[mappedId];
}

function getImageForCell(cell: number) {
    const mappedId = layoutData.value.layout_pos[cell.toString()];
    return availableImages.value[mappedId] || '';
}

function getCellStyle(id: string) {
    return {};
}

function getGridCellStyle(cell: number) {
    // If no image, give it an empty background
    if (!hasImageForCell(cell)) {
        return { background: 'rgba(255, 255, 255, 0.05)' };
    }
    return {};
}

function serialise() {
  return JSON.stringify(layoutData.value);
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (data && typeof data === 'object') {
      if (data.orientation) layoutData.value.orientation = data.orientation;
      if (data.layout_pos) {
          layoutData.value.layout_pos = { ...layoutData.value.layout_pos, ...data.layout_pos };
      }
    }
  } catch (e) {}
}

function onChange() {
  props.onChange?.(serialise());
}

let isExecuting = false;

function onExecuting(e: any) {
  const executingId = e.detail ? String(e.detail) : null;
  const myId = String(props.nodeId);
  
  if (executingId === myId) {
    isExecuting = true;
  } else if (executingId === null || executingId === "-1") {
    isExecuting = false;
    isActive.value = false;
  } else {
    isExecuting = false;
  }
}

function onStitchPause(e: any) {
  const data = e.detail;
  sessionId.value = data.session_id;
  availableImages.value = data.images || {};
  isActive.value = true;
}

async function applyAndContinue() {
  if (!sessionId.value) return;
  
  props.onChange?.(serialise());
  
  try {
    await fetch('/duffy/stitch/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId.value,
        layout: layoutData.value
      })
    });
    isActive.value = false;
    sessionId.value = '';
    availableImages.value = {};
  } catch (err) {
    console.error("Failed to resume stitch:", err);
  }
}

function cleanup() {
  api.removeEventListener("executing", onExecuting);
  api.removeEventListener("duffy-stitch-pause", onStitchPause);
}

onMounted(() => {
  api.addEventListener("executing", onExecuting);
  api.addEventListener("duffy-stitch-pause", onStitchPause);
});

onUnmounted(() => {
  cleanup();
});

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
.advanced-stitch-root {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 640px;
  background: #1a1a1a;
  color: #e0e0e0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-sizing: border-box;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #333;
}

.preview-container {
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  padding: 16px;
}

.preview-layout {
  display: flex;
  max-width: 100%;
  max-height: 100%;
  border: 1px dashed #444;
  background: rgba(255,255,255,0.02);
}

.layout-horizontal {
  flex-direction: row;
  align-items: stretch;
}

.layout-horizontal img {
  height: 100%;
  width: auto;
  object-fit: contain;
}

.layout-vertical {
  flex-direction: column;
  align-items: center;
}

.layout-vertical img {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.layout-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
  background: #222;
  aspect-ratio: 1;
  height: 100%;
  max-height: 100%;
}

.preview-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.grid-cell {
  background: #000;
}

.grid-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.controls-panel {
  width: 320px;
  background: #252525;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.panel-header h4 {
  margin: 0;
  font-size: 16px;
  color: #fff;
  letter-spacing: 0.5px;
}

.controls-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-row label {
  color: #aaa;
  font-size: 13px;
  font-weight: 500;
}

select {
  background: #1a1a1a;
  color: #fff;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 8px;
  outline: none;
  font-size: 13px;
}

.section-subtitle {
  font-size: 13px;
  color: #888;
  margin: 0 0 12px 0;
  border-bottom: 1px solid #333;
  padding-bottom: 4px;
}

.grid-controls {
  display: flex;
  flex-direction: column;
}

.mapping-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mapping-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #323232;
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #444;
}

.mapping-cell label {
  font-size: 11px;
  color: #aaa;
  text-align: center;
}

.mapping-cell select {
  font-size: 11px;
  padding: 2px 4px;
}

.info-text {
  font-size: 13px;
  color: #aaa;
  line-height: 1.4;
  background: #323232;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #444;
}

.btn-primary {
  width: 100%;
  background: #165;
  color: #fff;
  border: 1px solid #286;
  border-radius: 4px;
  padding: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.btn-primary:hover {
  background: #286;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}

.idle-state {
  height: 640px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #111;
  color: #666;
  gap: 12px;
}

.pulse {
  width: 12px;
  height: 12px;
  background: #379;
  border-radius: 50%;
  animation: pulse-animation 2s infinite;
}

@keyframes pulse-animation {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0); }
}
</style>