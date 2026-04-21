<template>
  <div class="show-anything-widget">
    <div v-if="items.length > 0" class="items-container">
      <div v-for="(item, index) in items" :key="index" class="item-display">
        {{ item }}
      </div>
    </div>
    <div v-else class="empty-state">
      No data to display. Run workflow.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const items = ref<string[]>([]);

function setValues(newItems: string[]) {
  items.value = newItems;
}

function cleanup() {
  // Empty
}

defineExpose({ setValues, cleanup });
</script>

<style scoped>
.show-anything-widget {
  padding: 8px;
  background: var(--comfy-input-bg, #222);
  color: var(--comfy-input-text, #ddd);
  border-radius: 6px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-display {
  background: rgba(0, 0, 0, 0.2);
  padding: 6px;
  border-radius: 4px;
}

.empty-state {
  color: #777;
  font-style: italic;
  text-align: center;
  margin-top: 20px;
}
</style>
