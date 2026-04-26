<template>
  <div class="adaptive-resolution-root">
    <!-- Header: Model Context -->
    <div class="control-group">
      <label>ARCHITECTURAL CONTEXT:</label>
      <select v-model="modelContext" @change="onModelChange">
        <option v-for="model in availableModels" :key="model" :value="model">{{ model }}</option>
      </select>
    </div>

    <!-- Aspect Ratio Buttons -->
    <div class="aspect-ratio-grid">
      <button 
        v-for="ratio in aspectRatios" :key="ratio"
        :class="{ active: currentRatio === ratio && !isCustom }"
        @click="selectAspectRatio(ratio)"
      >{{ ratio }}</button>
    </div>

    <!-- Dynamic Resolution Filtering OR Custom Resolution Input -->
    <div class="resolution-control-area">
      <!-- Custom Resolution Toggle -->
      <button 
        class="custom-btn" 
        :class="{ active: isCustom }"
        @click="isCustom = true"
      >
        CUSTOM RESOLUTION
      </button>

      <div class="custom-inputs" v-if="isCustom">
        <div class="input-block">
          <label>WIDTH</label>
          <input type="number" v-model.number="width" :step="constraint" @change="updateFromCustom" />
        </div>
        <button class="swap-btn" @click="swapDimensions" title="Orientation Toggle">
          ⟲
        </button>
        <div class="input-block">
          <label>HEIGHT</label>
          <input type="number" v-model.number="height" :step="constraint" @change="updateFromCustom" />
        </div>
      </div>

      <!-- Filtered Resolutions for active preset -->
      <div class="filtered-list" v-else>
        <select v-model="selectedPreset" @change="applyPreset" class="preset-select" size="4">
          <option v-for="(preset, i) in filteredPresets" :key="i" :value="preset">
            {{ preset.width }} × {{ preset.height }} ({{ calculateMP(preset.width, preset.height) }} MP) - {{ preset.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Divisibility Constraints -->
    <div class="divisibility-controls">
      <label>DIVISIBILITY CONSTRAINT</label>
      <div class="constraint-group">
        <button 
          v-for="val in [8, 16, 32, 64]" :key="val"
          :class="{ active: constraint === val }"
          @click="setConstraint(val)"
        >{{ val }}</button>
      </div>
    </div>

    <!-- Real-Time Statistics -->
    <div class="stats-panel">
      <span>RATIO: ~{{ calculateRatio(width, height) }}:1</span>
      <span>DENSITY: {{ calculateMP(width, height) }} MP</span>
    </div>

    <!-- Interactive Visual Preview Box -->
    <div class="preview-container">
      <div class="preview-box" :style="previewStyle">
        <div class="grab-point bottom-right" @pointerdown="startDrag" title="Drag to Resize"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ onChange?: (json: string) => void }>();

// Core State
const modelContext = ref("SDXL");
const availableModels = ["SD 1.5", "SDXL", "Qwen-Image 2512", "Flux 1", "Flux 2", "Flux 2 Klein", "Z-Image", "Ernie-Image"];

const aspectRatios = ["1:1", "16:9", "9:16", "2:1", "3:2", "2:3", "3:4", "4:3", "9:21", "21:9"];
const currentRatio = ref("1:1");

const isCustom = ref(false);
const width = ref(1024);
const height = ref(1024);
const constraint = ref(8);

// Preset Configuration (simplified representations for PRD mapping)
interface Preset { width: number; height: number; label: string; }
const selectedPreset = ref<Preset | null>(null);

const filteredPresets = computed<Preset[]>(() => {
  const presets: Preset[] = [];
  const model = modelContext.value;
  const ratio = currentRatio.value;

  if (model.includes("Flux") || model === "Ernie-Image") {
    if (ratio === "1:1") presets.push({ width: 1024, height: 1024, label: "1.0 MP BASELINE" });
    if (ratio === "4:3") presets.push({ width: 1152, height: 896, label: "~1.0 MP ADJUSTED" });
    if (ratio === "3:4") presets.push({ width: 896, height: 1152, label: "~1.0 MP ADJUSTED" });
    if (ratio === "16:9") {
      presets.push({ width: 1344, height: 768, label: "~1.0 MP ADJUSTED" });
      presets.push({ width: 1920, height: 1088, label: "2.0 MP MAXIMUM" });
    }
    if (ratio === "9:16") presets.push({ width: 768, height: 1344, label: "~1.0 MP ADJUSTED" });
    if (ratio === "21:9") presets.push({ width: 1536, height: 640, label: "~1.0 MP ADJUSTED" });
    if (ratio === "3:2") presets.push({ width: 1728, height: 1152, label: "2.0 MP MAXIMUM" });
  } else if (model === "Z-Image") {
    if (ratio === "1:1") presets.push({ width: 1024, height: 1024, label: "1024 BASE" }, { width: 1280, height: 1280, label: "1280 BASE" }, { width: 1536, height: 1536, label: "1536 BASE" });
    if (ratio === "4:3") presets.push({ width: 1152, height: 864, label: "1024 BASE" }, { width: 1472, height: 1104, label: "1280 BASE" }, { width: 1728, height: 1296, label: "1536 BASE" });
    if (ratio === "3:4") presets.push({ width: 864, height: 1152, label: "1024 BASE" }, { width: 1104, height: 1472, label: "1280 BASE" }, { width: 1296, height: 1728, label: "1536 BASE" });
    if (ratio === "3:2") presets.push({ width: 1248, height: 832, label: "1024 BASE" }, { width: 1536, height: 1024, label: "1280 BASE" }, { width: 1872, height: 1248, label: "1536 BASE" });
    if (ratio === "16:9") presets.push({ width: 1280, height: 720, label: "1024 BASE" }, { width: 1536, height: 864, label: "1280 BASE" }, { width: 2048, height: 1152, label: "1536 BASE" });
    if (ratio === "9:16") presets.push({ width: 720, height: 1280, label: "1024 BASE" }, { width: 864, height: 1536, label: "1280 BASE" }, { width: 1152, height: 2048, label: "1536 BASE" });
    if (ratio === "21:9") presets.push({ width: 1344, height: 576, label: "1024 BASE" }, { width: 1680, height: 720, label: "1280 BASE" }, { width: 2016, height: 864, label: "1536 BASE" });
    if (ratio === "9:21") presets.push({ width: 576, height: 1344, label: "1024 BASE" }, { width: 720, height: 1680, label: "1280 BASE" }, { width: 864, height: 2016, label: "1536 BASE" });
  } else if (model === "SDXL" || model === "SD 1.5") {
    // SDXL Distributions
    if (ratio === "1:1") presets.push({ width: 1024, height: 1024, label: "STANDARD BASELINE" });
    if (ratio === "4:3") presets.push({ width: 1152, height: 896, label: "STANDARD BASELINE" });
    if (ratio === "16:9") presets.push({ width: 1344, height: 768, label: "STANDARD BASELINE" });
    if (ratio === "3:4" || ratio === "9:16") presets.push({ width: 896, height: 1152, label: "PORTRAIT (VERTICAL)" });
  }

  if (presets.length === 0) {
    const parts = ratio.split(':').map(Number);
    const rw = parts[0] || 1;
    const rh = parts[1] || 1;
    const aspect = rw / rh;
    
    // Determine target megapixel tiers based on model
    let targetMPs = [1.0];
    if (model === "SD 1.5") targetMPs = [0.26]; // 512x512
    else if (model === "Qwen-Image 2512") targetMPs = [0.75, 1.5, 3.0, 6.3]; // up to ~2512x2512
    else if (model === "Z-Image") targetMPs = [1.0, 1.6, 2.3]; // 1024, 1280, 1536 bases
    else if (model.includes("Flux") || model === "Ernie-Image") targetMPs = [1.0, 1.5, 2.0];
    else if (model === "SDXL") targetMPs = [1.0];
    
    const c = constraint.value;
    targetMPs.forEach(mp => {
      const targetPixels = mp * 1000000;
      let h = Math.sqrt(targetPixels / aspect);
      let w = h * aspect;
      
      // Snap to constraint
      w = Math.max(c, Math.round(w / c) * c);
      h = Math.max(c, Math.round(h / c) * c);
      
      // Prevent duplicates
      if (!presets.find(p => p.width === w && p.height === h)) {
        presets.push({ width: w, height: h, label: `~${mp.toFixed(1)} MP AUTO-CALCULATED` });
      }
    });

    if (presets.length === 0) {
      presets.push({ width: 1024, height: 1024, label: "FALLBACK DIMENSIONS" });
    }
  }

  return presets;
});

// Auto-enforce Divisibility rule on model change according to PRD
watch(modelContext, (newModel) => {
  if (newModel === "Flux 2 Klein") {
    constraint.value = 16;
  } else if (newModel.includes("Flux") || newModel === "Ernie-Image") {
    constraint.value = 16;
  } else {
    constraint.value = 8;
  }
  emitChange();
});

// Calculate metrics
const calculateMP = (w: number, h: number) => ((w * h) / 1000000).toFixed(2);
const calculateRatio = (w: number, h: number) => (w / h).toFixed(2);

// Computed visual bounding box mapping exactly to resolution at 1:12 scale
const previewStyle = computed(() => {
  const w = Math.max(10, width.value / 12);
  const h = Math.max(10, height.value / 12);
  return {
    width: `${w}px`,
    height: `${h}px`
  };
});

// Interactions
function selectAspectRatio(ratio: string) {
  isCustom.value = false;
  currentRatio.value = ratio;
  // Auto-select first preset
  if (filteredPresets.value.length > 0) {
    selectedPreset.value = filteredPresets.value[0];
    applyPreset();
  }
}

function applyPreset() {
  if (selectedPreset.value) {
    width.value = enforceConstraint(selectedPreset.value.width);
    height.value = enforceConstraint(selectedPreset.value.height);
    emitChange();
  }
}

function swapDimensions() {
  const t = width.value;
  width.value = height.value;
  height.value = t;
  emitChange();
}

function updateFromCustom() {
  width.value = enforceConstraint(width.value);
  height.value = enforceConstraint(height.value);
  emitChange();
}

function setConstraint(val: number) {
  constraint.value = val;
  updateFromCustom(); // snap existing values
}

function enforceConstraint(val: number) {
  const c = constraint.value;
  return Math.max(c, Math.round(val / c) * c);
}

// Data synchronization
function serialise() {
  return JSON.stringify({
    model: modelContext.value,
    width: width.value,
    height: height.value,
    constraint: constraint.value,
    isCustom: isCustom.value,
    ratio: currentRatio.value
  });
}

// Bounding Box Drag Logic
const isDragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let dragStartW = 0;
let dragStartH = 0;

function startDrag(e: PointerEvent) {
  isDragging.value = true;
  isCustom.value = true; // Switch to manual grid
  
  const target = e.target as HTMLElement;
  target.setPointerCapture(e.pointerId);

  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartW = width.value;
  dragStartH = height.value;
  
  target.addEventListener('pointermove', onDrag);
  target.addEventListener('pointerup', stopDrag);
  target.addEventListener('pointercancel', stopDrag);
  e.preventDefault();
}

function onDrag(e: PointerEvent) {
  if (!isDragging.value) return;
  
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  
  // Scale mapping: 1 DOM pixel drag = 12 resolution pixels (maps 1:1 with preview visual scale)
  const scale = 12;
  const rawNewW = dragStartW + (dx * scale);
  const rawNewH = dragStartH + (dy * scale);
  
  // Enforce mathematically safe divisibility immediately
  width.value = enforceConstraint(Math.max(constraint.value, rawNewW));
  height.value = enforceConstraint(Math.max(constraint.value, rawNewH));
  
  emitChange();
}

function stopDrag(e: PointerEvent) {
  isDragging.value = false;
  const target = e.target as HTMLElement;
  target.releasePointerCapture(e.pointerId);
  target.removeEventListener('pointermove', onDrag);
  target.removeEventListener('pointerup', stopDrag);
  target.removeEventListener('pointercancel', stopDrag);
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (data.model) modelContext.value = data.model;
    if (data.width) width.value = data.width;
    if (data.height) height.value = data.height;
    if (data.constraint) constraint.value = data.constraint;
    if (data.isCustom !== undefined) isCustom.value = data.isCustom;
    if (data.ratio) currentRatio.value = data.ratio;
  } catch (e) {
    console.error("Failed to parse node state JSON", e);
  }
}

function emitChange() {
  if (props.onChange) {
    props.onChange(serialise());
  }
}

function cleanup() {
  // If dragging when unmounted, we can't easily release capture here, 
  // but it's safe since the element will be destroyed.
}

defineExpose({ serialise, deserialise, cleanup });

// Initial setup
onMounted(() => {
  if (!isCustom.value && filteredPresets.value.length > 0 && !selectedPreset.value) {
    selectedPreset.value = filteredPresets.value[0];
  }
});
</script>

<style scoped>
.adaptive-resolution-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background-color: #242424;
  color: #ccc;
  font-family: inherit;
  border-radius: 8px;
  height: 100%;
  min-width: 430px;
}

.control-group, .divisibility-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

label {
  font-size: 10px;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.5px;
}

select {
  background: #333;
  border: 1px solid #444;
  color: #eee;
  padding: 4px 8px;
  border-radius: 4px;
  outline: none;
}

.aspect-ratio-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

button {
  background: #333;
  border: 1px solid #444;
  color: #ccc;
  border-radius: 4px;
  cursor: pointer;
  padding: 4px;
  font-size: 11px;
}

button:hover { background: #444; }
button.active {
  background: #0d47a1;
  color: #fff;
  border-color: #1565c0;
}

.resolution-control-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-btn {
  background: #1e3a5f;
  color: #90caf9;
  border: 1px solid #1e3a5f;
  font-weight: bold;
}
.custom-btn.active {
  background: #2196f3;
  color: #fff;
}

.preset-select {
  width: 100%;
  font-size: 11px;
}

.custom-inputs {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.input-block {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.input-block input {
  background: #222;
  border: 1px solid #444;
  color: #eee;
  padding: 4px;
  border-radius: 4px;
  text-align: center;
}

.swap-btn {
  padding: 4px 8px;
  font-size: 14px;
  margin-bottom: 2px;
}

.constraint-group {
  display: flex;
  gap: 4px;
}
.constraint-group button { flex: 1; }

.stats-panel {
  display: flex;
  justify-content: space-between;
  background: #111;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  color: #aaa;
  border: 1px solid #333;
}

.preview-container {
  flex: 1;
  min-height: 150px;
  background: #111;
  border-radius: 6px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  border: 1px solid #333;
  padding: 10px;
  overflow: auto;
}

.preview-box {
  border: 2px solid #fff;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.05);
  position: relative;
}

.grab-point {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #2196f3;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: nwse-resize;
  transform: translate(50%, 50%);
}

.grab-point.bottom-right {
  bottom: 0;
  right: 0;
}
</style>
