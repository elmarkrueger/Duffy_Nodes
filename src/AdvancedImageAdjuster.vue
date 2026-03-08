<template>
  <div class="advanced-adjuster-root" v-if="isActive">
    <div class="preview-container">
      <img 
        v-if="baseImageUrl" 
        :src="baseImageUrl" 
        :style="imageFilterStyle" 
        alt="Preview" 
        class="preview-image"
      />
    </div>
    
    <div class="controls-panel">
      <div class="panel-header">
        <h4>Image Adjustments</h4>
        <div class="footer-actions">
          <button class="btn btn-primary" @click="applyAndContinue">Apply & Continue</button>
        </div>
      </div>
      
      <div class="adjustments-area">
        <div class="control-row">
          <div class="label-col">
            <label>Brightness</label>
            <span class="val">{{ adjustments.brightness.toFixed(2) }}</span>
          </div>
          <input type="range" min="0" max="3" step="0.05" v-model.number="adjustments.brightness" @input="updatePreview" @dblclick="resetValue('brightness', 1.0)" />
        </div>

        <div class="control-row">
          <div class="label-col">
            <label>Contrast</label>
            <span class="val">{{ adjustments.contrast.toFixed(2) }}</span>
          </div>
          <input type="range" min="0" max="3" step="0.05" v-model.number="adjustments.contrast" @input="updatePreview" @dblclick="resetValue('contrast', 1.0)" />
        </div>

        <div class="control-row">
          <div class="label-col">
            <label>Saturation</label>
            <span class="val">{{ adjustments.saturation.toFixed(2) }}</span>
          </div>
          <input type="range" min="0" max="3" step="0.05" v-model.number="adjustments.saturation" @input="updatePreview" @dblclick="resetValue('saturation', 1.0)" />
        </div>

        <div class="control-row">
          <div class="label-col">
            <label>Hue</label>
            <span class="val">{{ adjustments.hue.toFixed(2) }}</span>
          </div>
          <input type="range" min="-0.5" max="0.5" step="0.01" v-model.number="adjustments.hue" @input="updatePreview" @dblclick="resetValue('hue', 0.0)" />
        </div>
        
        <div class="reset-row">
          <button class="btn btn-secondary" @click="resetAll">Reset All</button>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="idle-state">
    <div class="pulse"></div>
    <p style="font-size: 14px; font-weight: 500;">Waiting for image pipeline...</p>
    <p style="font-size: 12px; color: #444;">
      B: {{ adjustments.brightness.toFixed(2) }} | 
      C: {{ adjustments.contrast.toFixed(2) }} | 
      S: {{ adjustments.saturation.toFixed(2) }} | 
      H: {{ adjustments.hue.toFixed(2) }}
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
const baseImageUrl = ref<string | null>(null);

const adjustments = ref({
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  hue: 0.0
});

// CSS filters are an approximation of PyTorch transforms.
// Hue rotate in CSS takes degrees. PyTorch TF.adjust_hue takes a float between -0.5 and 0.5.
// PyTorch maps -0.5 -> -180 deg, 0.5 -> +180 deg.
const imageFilterStyle = computed(() => {
  const b = adjustments.value.brightness;
  const c = adjustments.value.contrast;
  const s = adjustments.value.saturation;
  const hDeg = adjustments.value.hue * 360;
  
  return {
    filter: `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${hDeg}deg)`
  };
});

function serialise() {
  return JSON.stringify(adjustments.value);
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (data && typeof data === 'object') {
      if (data.brightness !== undefined) adjustments.value.brightness = data.brightness;
      if (data.contrast !== undefined) adjustments.value.contrast = data.contrast;
      if (data.saturation !== undefined) adjustments.value.saturation = data.saturation;
      if (data.hue !== undefined) adjustments.value.hue = data.hue;
    }
  } catch (e) {}
}

function updatePreview() {
  props.onChange?.(serialise());
}

function resetValue(key: keyof typeof adjustments.value, defaultVal: number) {
  adjustments.value[key] = defaultVal;
  updatePreview();
}

function resetAll() {
  adjustments.value = {
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    hue: 0.0
  };
  updatePreview();
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

function onAdjustPause(e: any) {
  const data = e.detail;
  sessionId.value = data.session_id;
  baseImageUrl.value = data.image_b64;
  isActive.value = true;
}

async function applyAndContinue() {
  if (!sessionId.value) return;
  
  // Save to hidden widget
  props.onChange?.(serialise());
  
  // POST to backend
  try {
    await fetch('/duffy/adjust/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId.value,
        adjustments: adjustments.value
      })
    });
    isActive.value = false;
    sessionId.value = '';
    baseImageUrl.value = null;
  } catch (err) {
    console.error("Failed to resume adjustment:", err);
  }
}

function cleanup() {
  api.removeEventListener("executing", onExecuting);
  api.removeEventListener("duffy-adjust-pause", onAdjustPause);
}

onMounted(() => {
  api.addEventListener("executing", onExecuting);
  api.addEventListener("duffy-adjust-pause", onAdjustPause);
});

onUnmounted(() => {
  cleanup();
});

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
.advanced-adjuster-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 600px;
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
  min-height: 300px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
  transition: filter 0.1s;
}

.controls-panel {
  padding: 16px;
  background: #252525;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h4 {
  margin: 0;
  font-size: 16px;
  color: #fff;
  letter-spacing: 0.5px;
}

.adjustments-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #323232;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #444;
}

.label-col {
  width: 120px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label-col label {
  color: #aaa;
  font-size: 13px;
  font-weight: 500;
}

.label-col .val {
  color: #fff;
  font-family: monospace;
  font-size: 12px;
  background: #1a1a1a;
  padding: 2px 6px;
  border-radius: 3px;
  min-width: 36px;
  text-align: right;
}

.control-row input[type="range"] {
  flex: 1;
  height: 6px;
  appearance: none;
  background: #1a1a1a;
  outline: none;
  border-radius: 3px;
  border: 1px solid #444;
}

.control-row input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #379;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
}

.control-row input[type="range"]::-webkit-slider-thumb:hover {
  background: #48a;
  transform: scale(1.1);
}

.reset-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.btn {
  background: #3a3a3a;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:hover {
  background: #4a4a4a;
  border-color: #666;
}

.btn-secondary {
  background: #444;
  border-color: #555;
  font-size: 12px;
  padding: 4px 10px;
}

.btn-secondary:hover {
  background: #555;
  border-color: #777;
}

.btn-primary {
  background: #165;
  border-color: #286;
  font-weight: 600;
  padding: 8px 24px;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.btn-primary:hover {
  background: #286;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}

.idle-state {
  height: 600px;
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