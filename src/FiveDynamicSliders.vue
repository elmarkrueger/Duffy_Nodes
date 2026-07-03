<template>
  <div class="five-sliders-root">
    <div class="header">
      <h4>Five Dynamic Sliders</h4>
    </div>

    <div class="sliders-list">
      <div v-for="(item, index) in sliders" :key="index" class="slider-row glass-panel">
        <div class="main-controls">
          <!-- Custom Label -->
          <input
            type="text"
            v-model="item.label"
            @change="onLabelChange(index, item.label)"
            class="label-input"
            placeholder="Slider Label"
          />

          <!-- Actual Slider -->
          <div class="slider-container">
            <input
              type="range"
              v-model.number="item.value"
              :min="item.min"
              :max="item.max"
              :step="item.step"
              @input="onSliderInput(item)"
              @change="emitChange"
              class="slider-bar"
            />
          </div>

          <!-- Numeric Value input -->
          <input
            type="number"
            v-model.number="item.value"
            :min="item.min"
            :max="item.max"
            :step="item.step"
            @change="onNumberChange(item)"
            class="number-input"
          />

          <!-- Settings Cog Toggle -->
          <button class="settings-toggle-btn" @click="toggleSettings(index)">
            <svg class="cog-icon" viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.03,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </button>
        </div>

        <!-- Collapsible Settings Panel -->
        <div :class="['settings-panel', { expanded: item.showSettings }]">
          <div class="setting-field">
            <label>Min</label>
            <input type="number" v-model.number="item.min" @change="onSettingsChange(item)" class="setting-input" step="any" />
          </div>
          <div class="setting-field">
            <label>Max</label>
            <input type="number" v-model.number="item.max" @change="onSettingsChange(item)" class="setting-input" step="any" />
          </div>
          <div class="setting-field">
            <label>Step</label>
            <input type="number" v-model.number="item.step" @change="onSettingsChange(item)" class="setting-input" min="0.0001" step="any" />
          </div>
          <div class="setting-field">
            <label>Decimals</label>
            <input type="number" v-model.number="item.decimals" @change="onSettingsChange(item)" class="setting-input" min="0" max="10" step="1" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  onChange?: (json: string) => void;
  onLabelChange?: (index: number, label: string) => void;
}>();

interface SliderEntry {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  showSettings: boolean;
}

const sliders = ref<SliderEntry[]>([
  { label: "Slider 1", value: 0.5, min: 0.0, max: 1.0, step: 0.01, decimals: 2, showSettings: false },
  { label: "Slider 2", value: 0.5, min: 0.0, max: 1.0, step: 0.01, decimals: 2, showSettings: false },
  { label: "Slider 3", value: 0.5, min: 0.0, max: 1.0, step: 0.01, decimals: 2, showSettings: false },
  { label: "Slider 4", value: 0.5, min: 0.0, max: 1.0, step: 0.01, decimals: 2, showSettings: false },
  { label: "Slider 5", value: 0.5, min: 0.0, max: 1.0, step: 0.01, decimals: 2, showSettings: false }
]);

function serialise() {
  const data = sliders.value.map(s => {
    const factor = Math.pow(10, s.decimals);
    const val = Math.round((s.value || 0) * factor) / factor;
    return {
      label: s.label,
      value: val,
      min: s.min,
      max: s.max,
      step: s.step,
      decimals: s.decimals
    };
  });
  return JSON.stringify(data);
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data)) {
      sliders.value = data.slice(0, 5).map((s, idx) => ({
        label: s.label || `Slider ${idx + 1}`,
        value: typeof s.value === "number" ? s.value : 0.5,
        min: typeof s.min === "number" ? s.min : 0.0,
        max: typeof s.max === "number" ? s.max : 1.0,
        step: typeof s.step === "number" ? s.step : 0.01,
        decimals: typeof s.decimals === "number" ? s.decimals : 2,
        showSettings: sliders.value[idx]?.showSettings ?? false
      }));
      
      while (sliders.value.length < 5) {
        const idx = sliders.value.length;
        sliders.value.push({
          label: `Slider ${idx + 1}`,
          value: 0.5,
          min: 0.0,
          max: 1.0,
          step: 0.01,
          decimals: 2,
          showSettings: false
        });
      }
    }
  } catch (e) {
    // ignore
  }
}

function emitChange() {
  props.onChange?.(serialise());
}

function onLabelChange(index: number, newLabel: string) {
  props.onLabelChange?.(index, newLabel);
  emitChange();
}

function onSliderInput(item: SliderEntry) {
  const factor = Math.pow(10, item.decimals);
  item.value = Math.round(item.value * factor) / factor;
}

function onNumberChange(item: SliderEntry) {
  // Clamp value to min/max
  if (item.value < item.min) item.value = item.min;
  if (item.value > item.max) item.value = item.max;
  
  const factor = Math.pow(10, item.decimals);
  item.value = Math.round(item.value * factor) / factor;
  emitChange();
}

function toggleSettings(index: number) {
  sliders.value[index].showSettings = !sliders.value[index].showSettings;
}

function onSettingsChange(item: SliderEntry) {
  if (item.min >= item.max) {
    item.max = item.min + 1.0;
  }
  if (item.decimals < 0) item.decimals = 0;
  if (item.decimals > 10) item.decimals = 10;
  if (item.step <= 0) item.step = 0.001;
  
  if (item.value < item.min) item.value = item.min;
  if (item.value > item.max) item.value = item.max;
  
  const factor = Math.pow(10, item.decimals);
  item.value = Math.round(item.value * factor) / factor;
  emitChange();
}

function cleanup() {
  // no-op
}

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
.five-sliders-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  background: rgba(20, 20, 20, 0.45);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border-radius: 8px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-sizing: border-box;
  overflow-y: auto;
}

.header {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #3b82f6;
  text-transform: uppercase;
}

.sliders-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-grow: 1;
}

.slider-row {
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.glass-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.glass-panel:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}

.main-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.label-input {
  width: 100px;
  background: transparent;
  border: none;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
  color: #f1f5f9;
  font-size: 11px;
  padding: 2px 4px;
  outline: none;
  transition: border-bottom-color 0.2s, background-color 0.2s;
  border-radius: 2px;
}

.label-input:focus {
  border-bottom-color: #3b82f6;
  background: rgba(255, 255, 255, 0.05);
}

.slider-container {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

.slider-bar {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
  margin: 0;
  padding: 0;
  cursor: pointer;
}

.slider-bar::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: transparent;
}

.slider-bar::-webkit-slider-thumb {
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  -webkit-appearance: none;
  margin-top: -4px;
  transition: background-color 0.2s, transform 0.1s ease;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.slider-bar::-webkit-slider-thumb:hover {
  background: #60a5fa;
  transform: scale(1.15);
}

.number-input {
  width: 60px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #fff;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 11px;
  text-align: right;
  outline: none;
  transition: border-color 0.2s;
  -moz-appearance: textfield;
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-input:focus {
  border-color: #3b82f6;
}

.settings-toggle-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.2s, background-color 0.2s;
}

.settings-toggle-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.settings-panel {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding 0.25s ease, margin-top 0.25s ease;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 4px;
  box-sizing: border-box;
}

.settings-panel.expanded {
  max-height: 52px;
  opacity: 1;
  padding: 6px;
  margin-top: 4px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.setting-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-field label {
  font-size: 9px;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 500;
}

.setting-input {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 10px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}

.setting-input:focus {
  border-color: #3b82f6;
}
</style>
