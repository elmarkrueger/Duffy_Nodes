<template>
  <div ref="rootRef" class="image-styler-root" :class="{ compact: isCompact }">
    <div class="styler-header">
      <p class="eyebrow">LLM STYLE CONTROLLER</p>
      <h3>Image Styler</h3>
    </div>

    <div class="selector-row">
      <label for="style-select">Style</label>
      <select id="style-select" v-model="selectedStyle" class="style-select">
        <option v-for="style in options" :key="style" :value="style">
          {{ formatStyleName(style) }}
        </option>
      </select>
    </div>

    <div v-if="!isCompact" class="preview-row">
      <div class="preview-image-wrap">
        <img
          v-if="selectedStyle && !isMissing(selectedStyle)"
          :src="getImageSrc(selectedStyle)"
          :alt="selectedStyle"
          @error="onImageError(selectedStyle)"
          class="preview-image"
        />
        <div v-else class="preview-fallback">NO PREVIEW</div>
      </div>
      <div class="preview-meta">
        <p class="preview-label">Selected Style</p>
        <p class="preview-title">{{ formatStyleName(selectedStyle) }}</p>
        <p class="preview-id">{{ selectedStyle }}</p>
      </div>
    </div>

    <div v-else class="compact-meta">
      Selected: {{ formatStyleName(selectedStyle) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const IMAGE_EXTENSIONS = [".jpeg", ".jpg", ".png", ".webp"];

const props = defineProps<{
  options: string[];
  initialStyle?: string;
  thumbnailBaseUrl: string;
  onChange?: (style: string) => void;
}>();

const selectedStyle = ref(
  props.initialStyle && props.options.includes(props.initialStyle)
    ? props.initialStyle
    : (props.options[0] || "")
);

const extensionIndex = ref<Record<string, number>>({});
const missingStyles = ref<Record<string, boolean>>({});
const rootRef = ref<HTMLElement | null>(null);
const isCompact = ref(false);
let resizeObserver: ResizeObserver | null = null;

function updateCompactMode() {
  const height = rootRef.value?.clientHeight ?? 0;
  // In LiteGraph/legacy mode the available widget height can be smaller.
  // Hide preview panel there to avoid clipping artifacts.
  isCompact.value = height > 0 && height < 138;
}

function formatStyleName(style: string): string {
  if (!style) return "No Style";
  return style
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getImageSrc(style: string): string {
  const idx = extensionIndex.value[style] ?? 0;
  const ext = IMAGE_EXTENSIONS[Math.min(idx, IMAGE_EXTENSIONS.length - 1)];
  return `${props.thumbnailBaseUrl}${style}${ext}`;
}

function onImageError(style: string) {
  const idx = extensionIndex.value[style] ?? 0;
  if (idx < IMAGE_EXTENSIONS.length - 1) {
    extensionIndex.value[style] = idx + 1;
    return;
  }
  missingStyles.value[style] = true;
}

function isMissing(style: string): boolean {
  return !!missingStyles.value[style];
}

watch(
  () => selectedStyle.value,
  (style) => {
    if (style) props.onChange?.(style);
  },
  { immediate: true }
);

watch(
  () => props.options,
  (next) => {
    if (!next.length) {
      selectedStyle.value = "";
      return;
    }
    if (!next.includes(selectedStyle.value)) {
      selectedStyle.value = next[0];
    }
  }
);

function deserialise(style: string) {
  if (!style || !props.options.includes(style)) return;
  selectedStyle.value = style;
}

function cleanup() {
  resizeObserver?.disconnect();
  resizeObserver = null;
}

onMounted(() => {
  updateCompactMode();
  if (!rootRef.value) return;
  resizeObserver = new ResizeObserver(() => updateCompactMode());
  resizeObserver.observe(rootRef.value);
});

onBeforeUnmount(() => {
  cleanup();
});

defineExpose({ deserialise, cleanup });
</script>

<style scoped>
.image-styler-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 10px;
  color: #f3f6f8;
  background:
    radial-gradient(120% 140% at 8% 0%, rgba(28, 64, 74, 0.32) 0%, rgba(18, 20, 24, 0.94) 58%),
    linear-gradient(155deg, rgba(12, 16, 20, 0.95) 0%, rgba(20, 22, 29, 0.95) 100%);
  font-family: "Space Grotesk", "Segoe UI", sans-serif;
}

.image-styler-root.compact {
  padding: 8px;
  gap: 6px;
}

.image-styler-root.compact .eyebrow {
  display: none;
}

.image-styler-root.compact .styler-header h3 {
  font-size: 15px;
}

.styler-header {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.eyebrow {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: #8cc9cf;
}

.styler-header h3 {
  margin: 0;
  font-size: 17px;
  line-height: 1.1;
  font-weight: 700;
  color: #f8fafc;
}

.selector-row {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 8px;
  align-items: center;
}

.selector-row label {
  margin: 0;
  font-size: 12px;
  color: #a7bac8;
}

.style-select {
  color-scheme: dark;
  appearance: none;
  width: 100%;
  height: 32px;
  padding: 4px 10px;
  border: 1px solid rgba(120, 155, 171, 0.34);
  border-radius: 8px;
  background: linear-gradient(155deg, rgba(21, 30, 41, 0.86), rgba(17, 24, 31, 0.86));
  color: #f0f6fc;
  font-size: 12px;
  line-height: 1.2;
  outline: none;
}

.style-select:focus {
  border-color: rgba(126, 208, 182, 0.75);
  box-shadow: 0 0 0 1px rgba(126, 208, 182, 0.35) inset;
}

.style-select option {
  background: #111922;
  color: #e7f0f8;
}

.style-select option:checked {
  background: #1d3a4a;
  color: #ffffff;
}

.preview-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px;
  padding: 7px;
  border-radius: 10px;
  background: linear-gradient(155deg, rgba(32, 44, 56, 0.55), rgba(24, 28, 36, 0.5));
  border: 1px solid rgba(116, 160, 176, 0.22);
}

.preview-image-wrap {
  width: 110px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(10, 12, 16, 0.75);
  border: 1px solid rgba(138, 171, 183, 0.22);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #8ea2b4;
  font-size: 9px;
  letter-spacing: 0.1em;
}

.preview-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.preview-label {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: #78bfcb;
}

.preview-title {
  margin: 0;
  font-size: 14px;
  line-height: 1.1;
  font-weight: 700;
}

.preview-id {
  margin: 0;
  font-size: 10px;
  color: #8ea2b4;
}

.compact-meta {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(116, 160, 176, 0.22);
  background: linear-gradient(155deg, rgba(32, 44, 56, 0.38), rgba(24, 28, 36, 0.36));
  color: #9db2c3;
  font-size: 11px;
  line-height: 1.2;
}

@media (max-width: 700px) {
  .preview-row {
    grid-template-columns: 1fr;
  }

  .preview-image-wrap {
    width: 100%;
    height: 120px;
  }
}
</style>
