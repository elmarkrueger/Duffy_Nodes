<template>
  <div class="crop-backdrop" @pointerdown.self="cancel" @keydown.esc="cancel" @keydown.enter="apply" tabindex="0" ref="backdropRef">
    <div class="crop-modal">
      <!-- Toolbar -->
      <div class="crop-toolbar">
        <div class="crop-ratios">
          <button
            v-for="r in ratios"
            :key="r.label"
            :class="{ active: activeRatio === r.value }"
            @click="setRatio(r.value)"
          >{{ r.label }}</button>
        </div>
        <div class="crop-info">{{ infoText }}</div>
        <div class="crop-actions">
          <button class="btn-secondary" @click="reset">Reset</button>
          <button class="btn-secondary" @click="cancel">Cancel</button>
          <button class="btn-primary" @click="apply">Apply</button>
        </div>
      </div>

      <!-- Image workspace -->
      <div class="crop-workspace">
        <img ref="imgRef" :src="imageUrl" crossorigin="anonymous" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";

export interface CropData {
  x: number;
  y: number;
  w: number;
  h: number;
}

const props = defineProps<{
  imageUrl: string;
  initialCrop?: CropData | null;
  onApply: (data: CropData) => void;
  onCancel: () => void;
}>();

const ratios = [
  { label: "Free", value: NaN },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:3", value: 2 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "21:9", value: 21 / 9 },
  { label: "9:21", value: 9 / 21 },
];

const imgRef = ref<HTMLImageElement | null>(null);
const backdropRef = ref<HTMLDivElement | null>(null);
const activeRatio = ref<number>(NaN);
const liveData = ref<{ x: number; y: number; width: number; height: number } | null>(null);

let cropper: Cropper | null = null;

const infoText = computed(() => {
  if (!liveData.value) return "Draw a crop selection";
  const d = liveData.value;
  if (d.width <= 0 || d.height <= 0) return "Draw a crop selection";
  return `${Math.round(d.width)} × ${Math.round(d.height)}  at  (${Math.round(d.x)}, ${Math.round(d.y)})`;
});

function setRatio(value: number) {
  activeRatio.value = value;
  cropper?.setAspectRatio(value);
}

function reset() {
  cropper?.clear();
  liveData.value = null;
}

function apply() {
  if (!cropper) return;
  const data = cropper.getData(true);
  if (data.width <= 0 || data.height <= 0) {
    props.onCancel();
    return;
  }
  props.onApply({ x: data.x, y: data.y, w: data.width, h: data.height });
}

function cancel() {
  props.onCancel();
}

function cleanup() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

onMounted(() => {
  backdropRef.value?.focus();

  if (!imgRef.value) return;

  const initialAspect = props.initialCrop ? NaN : NaN;
  activeRatio.value = initialAspect;

  cropper = new Cropper(imgRef.value, {
    viewMode: 1,
    dragMode: "crop",
    autoCrop: !!props.initialCrop,
    checkOrientation: false,
    guides: true,
    center: true,
    highlight: true,
    background: true,
    responsive: true,
    aspectRatio: initialAspect,
    crop(event) {
      liveData.value = {
        x: event.detail.x,
        y: event.detail.y,
        width: event.detail.width,
        height: event.detail.height,
      };
    },
    ready() {
      if (props.initialCrop && cropper) {
        cropper.setData({
          x: props.initialCrop.x,
          y: props.initialCrop.y,
          width: props.initialCrop.w,
          height: props.initialCrop.h,
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        });
      }
    },
  });
});

onBeforeUnmount(() => {
  cleanup();
});

defineExpose({ cleanup });
</script>

<style scoped>
.crop-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
}

.crop-modal {
  display: flex;
  flex-direction: column;
  width: 90vw;
  height: 90vh;
  max-width: 1400px;
  background: var(--bg-color, #1e1e1e);
  border: 1px solid var(--border-color, #444);
  border-radius: 8px;
  overflow: hidden;
}

.crop-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--primary-bg, #2a2a2a);
  border-bottom: 1px solid var(--border-color, #444);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.crop-ratios {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.crop-ratios button {
  padding: 4px 10px;
  border: 1px solid var(--border-color, #555);
  border-radius: 4px;
  background: var(--bg-color, #1e1e1e);
  color: var(--fg-color, #ccc);
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s, border-color 0.15s;
}

.crop-ratios button:hover {
  background: var(--primary-bg, #3a3a3a);
}

.crop-ratios button.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.crop-info {
  flex: 1;
  text-align: center;
  color: var(--fg-color, #aaa);
  font-size: 13px;
  font-family: monospace;
  white-space: nowrap;
}

.crop-actions {
  display: flex;
  gap: 6px;
}

.crop-actions button {
  padding: 6px 16px;
  border: 1px solid var(--border-color, #555);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

.btn-secondary {
  background: var(--bg-color, #1e1e1e);
  color: var(--fg-color, #ccc);
}

.btn-secondary:hover {
  background: var(--primary-bg, #3a3a3a);
}

.btn-primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.btn-primary:hover {
  background: #2563eb;
}

.crop-workspace {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.crop-workspace img {
  display: block;
  max-width: 100%;
}
</style>
