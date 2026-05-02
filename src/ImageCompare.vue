<template>
  <div class="image-compare-wrapper" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseLeave">
    
    <!-- Controls Layout -->
    <div class="controls-panel">
      <div class="btn-group">
        <button 
          :class="['icon-btn', { active: sliderMode === 'horizontal' }]" 
          @click="setMode('horizontal')" 
          title="Horizontal Split (Left/Right)">
          ⬌
        </button>
        <button 
          :class="['icon-btn', { active: sliderMode === 'vertical' }]" 
          @click="setMode('vertical')" 
          title="Vertical Split (Top/Bottom)">
          ⬍
        </button>
      </div>

      <div class="btn-group">
        <input 
          type="color" 
          v-model="sliderColor" 
          @change="emitChange" 
          class="color-picker" 
          title="Slider Color"
        />
      </div>

      <button class="icon-btn reset-btn" @click="resetSlider" title="Reset to 50%">
        Reset
      </button>
    </div>

    <!-- Image Canvas -->
    <div class="canvas-container" ref="containerRef" @mousedown="onMouseDown">
      
      <div v-if="!imgASrc || !imgBSrc" class="placeholder">
        Execute to compare images
      </div>

      <!-- Image B (Background) -->
      <img v-if="imgBSrc" :src="imgBSrc" class="bg-img" />

      <!-- Image A (Foreground / Clipped) -->
      <img v-if="imgASrc" :src="imgASrc" class="fg-img" :style="{ clipPath: currentClipPath }" />

      <!-- The Slider Line -->
      <div v-if="imgASrc && imgBSrc" class="slider-line" :style="sliderLineStyle"></div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
// @ts-ignore
import { api } from "COMFY_API";

const props = defineProps<{
  onChange?: (json: string) => void;
  nodeId?: number;
}>();

// State
const sliderMode = ref<"horizontal" | "vertical">("horizontal");
const sliderColor = ref<string>("#00ffff");
const sliderPercent = ref<number>(50);

const imgASrc = ref<string | null>(null);
const imgBSrc = ref<string | null>(null);

const containerRef = ref<HTMLElement | null>(null);
let isDragging = false;

// Computed styles
const currentClipPath = computed(() => {
  if (sliderMode.value === "horizontal") {
    return `inset(0 ${100 - sliderPercent.value}% 0 0)`;
  } else {
    // Vertical mode (top/bottom split - crop the bottom)
    return `inset(0 0 ${100 - sliderPercent.value}% 0)`;
  }
});

const sliderLineStyle = computed(() => {
  if (sliderMode.value === "horizontal") {
    return {
      left: `${sliderPercent.value}%`,
      top: '0',
      bottom: '0',
      width: '2px',
      height: '100%',
      backgroundColor: sliderColor.value,
      boxShadow: `0 0 8px ${sliderColor.value}, 0 0 4px ${sliderColor.value}`,
      transform: 'translateX(-50%)',
    };
  } else {
    return {
      top: `${sliderPercent.value}%`,
      left: '0',
      right: '0',
      height: '2px',
      width: '100%',
      backgroundColor: sliderColor.value,
      boxShadow: `0 0 8px ${sliderColor.value}, 0 0 4px ${sliderColor.value}`,
      transform: 'translateY(-50%)',
    };
  }
});

// Interaction Logic
function setMode(mode: "horizontal" | "vertical") {
  sliderMode.value = mode;
  emitChange();
}

function resetSlider() {
  sliderPercent.value = 50;
  emitChange();
}

function updateSlider(clientX: number, clientY: number) {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  
  if (sliderMode.value === "horizontal") {
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    sliderPercent.value = (x / rect.width) * 100;
  } else {
    let y = clientY - rect.top;
    y = Math.max(0, Math.min(y, rect.height));
    sliderPercent.value = (y / rect.height) * 100;
  }
}

function onMouseDown(e: MouseEvent) {
  isDragging = true;
  updateSlider(e.clientX, e.clientY);
  document.addEventListener('mousemove', onDocMouseMove);
  document.addEventListener('mouseup', onDocMouseUp);
}

function onMouseMove(e: MouseEvent) {
  if (isDragging) return; // Handled by document listener to prevent escaping
  
  // While just moving over (hover), we do not change standard slider.
  // Wait, the original script updated on mouse hover as well:
  // `if (isDragging || container.contains(e.target) || e.target === container) { updateSlider(e.clientX); }`
  // We can replicate hover-drag if desired, but click-drag is generally better UX for toggles. 
  // Let's stick to click-drag being the primary update (like standard compare sliders) to prevent jarring jumps when just crossing the node, but keeping with original, we'll update on hover too if they expect it. Let's make it click-to-drag only as it's cleaner, unless they complain. The original code did `isDragging = true` on mousedown.
}

function onMouseUp() {
  // handeled by doc
}

function onMouseLeave() {
  // handeled by doc
}

// Global Drag handling to allow smooth dragging outside bounds
function onDocMouseMove(e: MouseEvent) {
  if (isDragging) {
    updateSlider(e.clientX, e.clientY);
  }
}

function onDocMouseUp() {
  if (isDragging) {
    isDragging = false;
    emitChange(); // Save position state when dragging finishes
    document.removeEventListener('mousemove', onDocMouseMove);
    document.removeEventListener('mouseup', onDocMouseUp);
  }
}

// JSON state integration
function serialise() {
  return JSON.stringify({
    mode: sliderMode.value,
    color: sliderColor.value,
    percent: sliderPercent.value
  });
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (data.mode) sliderMode.value = data.mode;
    if (data.color) sliderColor.value = data.color;
    if (data.percent !== undefined) sliderPercent.value = data.percent;
  } catch (e) {}
}

function emitChange() {
  props.onChange?.(serialise());
}

function setImages(imgs: any[]) {
  if (imgs && imgs.length >= 2) {
    const makeUrl = (img: any) => {
      const params = new URLSearchParams({
        filename: img.filename,
        type: img.type || "temp"
      });
      if (img.subfolder) params.set("subfolder", img.subfolder);
      return `/view?${params.toString()}`;
    };

    const t = `&t=${Date.now()}`;
    imgASrc.value = makeUrl(imgs[0]) + t;
    imgBSrc.value = makeUrl(imgs[1]) + t;
  }
}

function cleanup() {
  document.removeEventListener('mousemove', onDocMouseMove);
  document.removeEventListener('mouseup', onDocMouseUp);
}

onMounted(() => {
  // Empty, keeping hook for consistency
});

defineExpose({ serialise, deserialise, cleanup, setImages });
</script>

<style scoped>
.image-compare-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #111;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #444;
}

.controls-panel {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 10px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  gap: 12px;
}

.btn-group {
  display: flex;
  gap: 4px;
}

.icon-btn {
  background: #2a2a2a;
  color: #ccc;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: #333;
  color: #fff;
}

.icon-btn.active {
  background: #2b4e5c;
  color: #00ffff;
  border-color: #00ffff;
}

.reset-btn {
  font-size: 12px;
  padding: 4px 10px;
  margin-left: auto;
}

.color-picker {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 26px;
  height: 26px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: 1px solid #444;
  border-radius: 4px;
}

.canvas-container {
  position: relative;
  flex-grow: 1;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: crosshair;
}

.placeholder {
  color: #666;
  font-family: sans-serif;
  font-size: 14px;
  z-index: 1;
  pointer-events: none;
}

.bg-img, .fg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}

.slider-line {
  position: absolute;
  pointer-events: none;
  z-index: 10;
}
</style>
