<template>
  <div class="duffy-lora-loader">
    <button @click="openMenu" class="lora-btn">📂 {{ currentValue || 'Select LoRA...' }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{ 
  onChange?: (val: string) => void, 
  options: string[],
  initialValue?: string 
}>();

const currentValue = ref(props.initialValue || '');

function openMenu(event: MouseEvent) {
  // @ts-ignore
  if (typeof LiteGraph !== "undefined" && LiteGraph.ContextMenu) {
     // @ts-ignore
     new LiteGraph.ContextMenu(props.options, {
         event: event,
         title: "Select LoRA",
         className: "dark",
         callback: (value: any) => {
             if (typeof value === "string") {
                 currentValue.value = value;
                 props.onChange?.(value);
             }
         }
     });
  }
}

function deserialise(val: string) {
    currentValue.value = val;
}
function serialise() {
    return currentValue.value;
}
defineExpose({ deserialise, serialise });
</script>

<style scoped>
.duffy-lora-loader {
  padding: 4px;
  width: 100%;
  box-sizing: border-box;
}
.lora-btn {
  width: 100%;
  background: var(--comfy-input-bg, #222);
  color: var(--comfy-input-text, #ddd);
  border: 1px solid var(--comfy-border, #444);
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
  text-align: left;
  font-family: inherit;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lora-btn:hover {
  background: var(--comfy-hover-bg, #333);
}
</style>
