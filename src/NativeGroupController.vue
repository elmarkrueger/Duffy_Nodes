<template>
  <div class="native-group-controller-root">
    <div class="header">
      <h4>Native Group Controller</h4>
    </div>
    
    <div class="actions-bar">
      <div class="sort-buttons">
        <button 
          class="glass-btn" 
          :class="{ active: sortBy === 'None' }" 
          @click="setSort('None')">None</button>
        <button 
          class="glass-btn" 
          :class="{ active: sortBy === 'Alphanumeric (A-Z)' }" 
          @click="setSort('Alphanumeric (A-Z)')">A-Z</button>
        <button 
          class="glass-btn" 
          :class="{ active: sortBy === 'Alphanumeric (Z-A)' }" 
          @click="setSort('Alphanumeric (Z-A)')">Z-A</button>
      </div>

      <div class="exclusive-toggle glass-panel">
        <label>Exclusive Mode</label>
        <input 
          type="checkbox" 
          class="switch-toggle" 
          :checked="exclusiveMode" 
          @change="toggleExclusive" 
        />
      </div>
    </div>

    <div class="group-list">
      <div 
        v-for="group in sortedGroups" 
        :key="group" 
        class="group-item glass-panel" 
        :class="{ 'inactive': !groupStates[group] }"
      >
        <div class="group-row">
          <input 
            type="checkbox" 
            class="switch-toggle" 
            :checked="groupStates[group] || false" 
            @change="toggleGroup(group)" 
          />
          <span class="group-name">{{ group }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
    onToggleGroup?: (group: string, isActive: boolean) => void;
    onSetSort?: (mode: string) => void;
    onToggleExclusive?: (isActive: boolean) => void;
}>();

const groups = ref<string[]>([]);
const groupStates = ref<Record<string, boolean>>({});
const exclusiveMode = ref(false);
const sortBy = ref("None");

const sortedGroups = computed(() => {
    let sorted = [...groups.value];
    if (sortBy.value === "Alphanumeric (A-Z)") {
        sorted.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy.value === "Alphanumeric (Z-A)") {
        sorted.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
    }
    return sorted;
});

function setGroups(newGroups: string[]) {
    groups.value = newGroups;
}

function setGroupStates(newStates: Record<string, boolean>) {
    groupStates.value = { ...newStates };
}

function setExclusiveMode(val: boolean) {
    exclusiveMode.value = val;
}

function setSortBy(val: string) {
    sortBy.value = val;
}

function toggleGroup(group: string) {
    const newVal = !groupStates.value[group];
    
    if (exclusiveMode.value && newVal) {
        Object.keys(groupStates.value).forEach(k => {
            if (k !== group) groupStates.value[k] = false;
        });
    }
    
    groupStates.value[group] = newVal;
    props.onToggleGroup?.(group, newVal);
}

function toggleExclusive() {
    exclusiveMode.value = !exclusiveMode.value;
    props.onToggleExclusive?.(exclusiveMode.value);
}

function setSort(mode: string) {
    sortBy.value = mode;
    props.onSetSort?.(mode);
}

defineExpose({ setGroups, setGroupStates, setExclusiveMode, setSortBy });
</script>

<style scoped>
.native-group-controller-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  background: rgba(30, 30, 30, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ddd;
  border-radius: 8px;
  font-family: sans-serif;
  overflow-y: auto;
}

.header {
  margin-bottom: 8px;
}

.header h4 {
  margin: 0;
  font-size: 14px;
  color: #aaa;
}

.actions-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.sort-buttons {
  display: flex;
  gap: 4px;
}

.glass-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #bbb;
  padding: 6px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.glass-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.glass-btn.active {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
  color: #10b981;
}

.glass-panel {
  background: rgba(40, 40, 40, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px;
}

.exclusive-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
}

.exclusive-toggle label {
  font-size: 12px;
  color: #ccc;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-grow: 1;
}

.group-item {
  transition: opacity 0.2s ease;
}

.group-item.inactive {
  opacity: 0.6;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.switch-toggle {
  cursor: pointer;
  margin: 0;
  width: 14px;
  height: 14px;
  accent-color: #10b981;
}
</style>
