<template>
  <div class="alignment-tool-root" :class="{ 'disabled': !isActive }">
    <div class="row">
      <button @click.stop="onAlignLeft" class="icon-btn" title="Align Left">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="2" x2="4" y2="22"></line>
          <rect x="8" y="6" width="10" height="4"></rect>
          <rect x="8" y="14" width="6" height="4"></rect>
        </svg>
      </button>
      <button @click.stop="onCenterHorizontal" class="icon-btn" title="Align Center (Horizontal)">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="22"></line>
          <rect x="6" y="6" width="12" height="4"></rect>
          <rect x="8" y="14" width="8" height="4"></rect>
        </svg>
      </button>
      <button @click.stop="onAlignRight" class="icon-btn" title="Align Right">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="20" y1="2" x2="20" y2="22"></line>
          <rect x="6" y="6" width="10" height="4"></rect>
          <rect x="10" y="14" width="6" height="4"></rect>
        </svg>
      </button>
      <button @click.stop="onDistributeHorizontal" class="icon-btn" title="Distribute Horizontally" :disabled="!canDistribute">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="2" x2="4" y2="22"></line>
          <line x1="20" y1="2" x2="20" y2="22"></line>
          <rect x="8" y="10" width="8" height="4"></rect>
        </svg>
      </button>
    </div>
    
    <div class="row">
      <button @click.stop="onAlignTop" class="icon-btn" title="Align Top">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="2" y1="4" x2="22" y2="4"></line>
          <rect x="6" y="8" width="4" height="10"></rect>
          <rect x="14" y="8" width="4" height="6"></rect>
        </svg>
      </button>
      <button @click.stop="onCenterVertical" class="icon-btn" title="Align Center (Vertical)">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <rect x="6" y="6" width="4" height="12"></rect>
          <rect x="14" y="8" width="4" height="8"></rect>
        </svg>
      </button>
      <button @click.stop="onAlignBottom" class="icon-btn" title="Align Bottom">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="2" y1="20" x2="22" y2="20"></line>
          <rect x="6" y="6" width="4" height="10"></rect>
          <rect x="14" y="10" width="4" height="6"></rect>
        </svg>
      </button>
      <button @click.stop="onDistributeVertical" class="icon-btn" title="Distribute Vertically" :disabled="!canDistribute">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="2" y1="4" x2="22" y2="4"></line>
          <line x1="2" y1="20" x2="22" y2="20"></line>
          <rect x="10" y="8" width="4" height="8"></rect>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
// @ts-ignore
import { api } from "COMFY_API";

const props = defineProps<{
  onAlignLeft: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignBottom: () => void;
  onCenterHorizontal: () => void;
  onCenterVertical: () => void;
  onDistributeHorizontal: () => void;
  onDistributeVertical: () => void;
  getSelectedCount: () => number;
}>();

const isActive = ref(false);
const canDistribute = ref(false);
let checkInterval: any = null;

function checkSelection() {
  const count = props.getSelectedCount();
  isActive.value = count >= 2;
  canDistribute.value = count >= 3;
}

// Set up polling interval to check selected items length
// Alternatively, we could hook into LiteGraph onSelectionChange if we pass the app down
onMounted(() => {
  checkInterval = setInterval(checkSelection, 200);
});

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
});
</script>

<style scoped>
.alignment-tool-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: #252424;
  border-radius: 6px;
  justify-content: center;
  align-items: center;
}

.alignment-tool-root.disabled {
  opacity: 0.4;
}

.row {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  width: 100%;
}

.icon-btn {
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
  color: #fff;
  border-radius: 4px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.icon-btn:hover:not(:disabled) {
  background: #505050;
  transform: scale(1.05);
}

.icon-btn:active:not(:disabled) {
  background: #606060;
  transform: scale(0.95);
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

svg {
  pointer-events: none; /* Let the button handle the click */
}
</style>
