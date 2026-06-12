<template>
  <div class="gisa-root">
    <!-- Header banner -->
    <div class="gisa-header">
      <span class="gisa-title">GEMMA IDEOGRAM SPATIAL ARCHITECT</span>
      <div v-if="isPaused" class="status-badge pulse">PAUSED - INTERACTION REQUIRED</div>
      <div v-else class="status-badge idle">READY / IDLE</div>
    </div>

    <!-- Main Workspace -->
    <div class="gisa-workspace">
      <!-- Left: Interactive Canvas Overlay -->
      <div class="canvas-section">
        <!-- Aspect Ratio Selector -->
        <div class="canvas-toolbar">
          <label>ASPECT RATIO:</label>
          <div class="ratio-buttons">
            <button 
              v-for="preset in aspectPresets" 
              :key="preset.ratio"
              :class="{ active: currentAspect === preset.ratio }"
              @click="setAspect(preset)"
            >
              {{ preset.ratio }}
            </button>
          </div>
        </div>

        <!-- Layout Workspace Container -->
        <div class="canvas-container" ref="canvasContainer">
          <div 
            class="canvas-grid" 
            :style="gridStyle"
            ref="gridCanvas"
            @pointerdown="deselectAll"
          >
            <!-- Background Sketch / Reference Image -->
            <img 
              v-if="bgImage" 
              :src="bgImage" 
              class="bg-layer" 
              :style="{ opacity: bgOpacity / 100 }"
              alt="Reference Layout"
            />

            <!-- Preview Image (output of VAE Decode) -->
            <img 
              v-if="previewImage" 
              :src="previewImage" 
              class="preview-layer" 
              alt="Generated Output Preview"
            />

            <!-- Interactive Bounding Boxes -->
            <div 
              v-for="(el, index) in elements" 
              :key="index"
              class="bbox-rect"
              :class="{ selected: selectedIndex === index, text: el.type === 'text' }"
              :style="getBboxStyle(el.bbox)"
              @pointerdown.stop="selectElement(index, $event)"
            >
              <!-- Inside info -->
              <div class="bbox-label">
                <span class="bbox-index">#{{ index + 1 }}</span>
                <span class="bbox-type">{{ el.type.toUpperCase() }}</span>
              </div>
              <div class="bbox-desc-summary" v-if="el.desc">{{ el.desc }}</div>
              <div class="bbox-text-literal" v-if="el.type === 'text' && el.text">"{{ el.text }}"</div>

              <!-- Resize handles -->
              <div class="resize-handle top-left" @pointerdown.stop="startResize(index, 'tl', $event)"></div>
              <div class="resize-handle top-right" @pointerdown.stop="startResize(index, 'tr', $event)"></div>
              <div class="resize-handle bottom-left" @pointerdown.stop="startResize(index, 'bl', $event)"></div>
              <div class="resize-handle bottom-right" @pointerdown.stop="startResize(index, 'br', $event)"></div>
            </div>
          </div>
        </div>

        <!-- Opacity Slider -->
        <div class="slider-group" v-if="bgImage">
          <label>Background Opacity ({{ bgOpacity }}%)</label>
          <input type="range" v-model="bgOpacity" min="0" max="100" />
        </div>
      </div>

      <!-- Right: Inspector Sidebar -->
      <div class="sidebar-section">
        <!-- Global Style Settings -->
        <div class="sidebar-block">
          <h3>GLOBAL STYLE DESCRIPTION</h3>
          
          <div class="form-row">
            <label>Background Scene</label>
            <textarea v-model="backgroundText" @input="emitChange" placeholder="Description of the overall background scene..." rows="2"></textarea>
          </div>
          
          <div class="form-row">
            <label>Aesthetics</label>
            <input type="text" v-model="style.aesthetics" @change="emitChange" placeholder="e.g. cinematic, 3d render" />
          </div>

          <div class="form-row">
            <label>Lighting</label>
            <input type="text" v-model="style.lighting" @change="emitChange" placeholder="e.g. volumetric, studio" />
          </div>

          <!-- Photographic vs Artistic Toggle -->
          <div class="form-row toggle-row">
            <label>Medium Type</label>
            <div class="toggle-group">
              <button 
                :class="{ active: isPhotographic }" 
                @click="setMediumType('photo')"
              >PHOTO</button>
              <button 
                :class="{ active: !isPhotographic }" 
                @click="setMediumType('art')"
              >ARTISTIC</button>
            </div>
          </div>

          <div class="form-row">
            <label>Medium</label>
            <input type="text" v-model="style.medium" @change="emitChange" placeholder="e.g. digital painting, analog photo" />
          </div>

          <!-- Color Palette Picker -->
          <div class="form-row color-row">
            <label>Color Palette (Max 16)</label>
            <div class="palette-swatches">
              <div 
                v-for="(color, idx) in style.color_palette" 
                :key="idx" 
                class="swatch"
                :style="{ backgroundColor: color }"
                @click="removeGlobalColor(idx)"
                title="Click to remove"
              >
                <span class="remove-x">×</span>
              </div>
              <div class="add-swatch" v-if="style.color_palette.length < 16">
                <input type="color" @change="addGlobalColor" class="color-picker-input" />
                <span class="add-plus">+</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Layers / Bounding Box List -->
        <div class="sidebar-block layers-block">
          <div class="block-header">
            <h3>LAYERS & Z-ORDER</h3>
            <button class="add-element-btn" @click="addElement">+ ADD BOX</button>
          </div>
          
          <div class="layers-list">
            <div 
              v-for="(el, index) in elements" 
              :key="index"
              class="layer-item"
              :class="{ active: selectedIndex === index }"
              @click="selectedIndex = index"
            >
              <span class="layer-num">#{{ index + 1 }}</span>
              <span class="layer-type" :class="el.type">{{ el.type.toUpperCase() }}</span>
              <span class="layer-desc" :title="el.desc">{{ el.desc || 'No description' }}</span>
              
              <!-- Z-Order manipulation -->
              <div class="layer-actions">
                <button class="layer-btn" @click.stop="moveLayerUp(index)" :disabled="index === 0" title="Move Up (Bring Forward)">▲</button>
                <button class="layer-btn" @click.stop="moveLayerDown(index)" :disabled="index === elements.length - 1" title="Move Down (Send Backward)">▼</button>
                <button class="layer-btn delete" @click.stop="deleteElement(index)" title="Delete Element">×</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Element Properties Inspector -->
        <div class="sidebar-block inspector-block" v-if="selectedElement">
          <h3>ELEMENT #{{ selectedIndex + 1 }} INSPECTOR</h3>

          <div class="form-row">
            <label>Type</label>
            <select v-model="selectedElement.type" @change="onElementTypeChange">
              <option value="obj">Object (obj)</option>
              <option value="text">Typography (text)</option>
            </select>
          </div>

          <div class="form-row" v-if="selectedElement.type === 'text'">
            <label>Literal Text</label>
            <input type="text" v-model="selectedElement.text" @input="emitChange" placeholder="Exact text to render" />
          </div>

          <div class="form-row">
            <label>Visual Description</label>
            <textarea v-model="selectedElement.desc" @input="emitChange" placeholder="Detailed element description" rows="3"></textarea>
          </div>

          <!-- Local element color palette -->
          <div class="form-row color-row">
            <label>Local Color Palette (Max 5)</label>
            <div class="palette-swatches">
              <div 
                v-for="(color, idx) in selectedElement.color_palette" 
                :key="idx" 
                class="swatch"
                :style="{ backgroundColor: color }"
                @click="removeLocalColor(idx)"
                title="Click to remove"
              >
                <span class="remove-x">×</span>
              </div>
              <div class="add-swatch" v-if="!selectedElement.color_palette || selectedElement.color_palette.length < 5">
                <input type="color" @change="addLocalColor" class="color-picker-input" />
                <span class="add-plus">+</span>
              </div>
            </div>
          </div>

          <!-- Bbox raw display -->
          <div class="form-row bbox-display">
            <label>BBOX Coordinate Matrix [0-1000]</label>
            <div class="bbox-grid-inputs">
              <div><span>YMIN</span><input type="number" v-model.number="selectedElement.bbox[0]" min="0" max="1000" @change="emitChange" /></div>
              <div><span>XMIN</span><input type="number" v-model.number="selectedElement.bbox[1]" min="0" max="1000" @change="emitChange" /></div>
              <div><span>YMAX</span><input type="number" v-model.number="selectedElement.bbox[2]" min="0" max="1000" @change="emitChange" /></div>
              <div><span>XMAX</span><input type="number" v-model.number="selectedElement.bbox[3]" min="0" max="1000" @change="emitChange" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Dialog banner when execution is paused -->
    <div v-if="isPaused" class="confirm-bar">
      <div class="confirm-msg">
        <span class="gisa-icon">⚠</span> Execution is paused. Fine-tune layout and press Confirm when ready.
      </div>
      <button class="confirm-btn" @click="confirmLayout">CONFIRM LAYOUT</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { api as comfyApi } from "COMFY_API";

const props = defineProps<{ onChange?: (json: string) => void }>();

// ---------------------------------------------------------------------------
// Aspect Ratio and Preset Resolution Configurations
// ---------------------------------------------------------------------------
interface AspectPreset {
  ratio: string;
  widthRatio: number;
  heightRatio: number;
}

const aspectPresets: AspectPreset[] = [
  { ratio: "1:1", widthRatio: 1, heightRatio: 1 },
  { ratio: "16:9", widthRatio: 16, heightRatio: 9 },
  { ratio: "9:16", widthRatio: 9, heightRatio: 16 },
  { ratio: "4:3", widthRatio: 4, heightRatio: 3 },
  { ratio: "3:4", widthRatio: 3, heightRatio: 4 },
  { ratio: "3:2", widthRatio: 3, heightRatio: 2 },
  { ratio: "2:3", widthRatio: 2, heightRatio: 3 }
];

const currentAspect = ref("1:1");
const aspectMultiplier = ref({ w: 1, h: 1 });

const gridStyle = computed(() => {
  const containerW = 400; // max reference visual layout width
  const containerH = 400;
  
  const wRatio = aspectMultiplier.value.w;
  const hRatio = aspectMultiplier.value.h;
  
  let targetW = containerW;
  let targetH = containerH;
  
  if (wRatio > hRatio) {
    targetH = containerW * (hRatio / wRatio);
  } else {
    targetW = containerH * (wRatio / hRatio);
  }
  
  return {
    width: `${targetW}px`,
    height: `${targetH}px`
  };
});

function setAspect(preset: AspectPreset) {
  currentAspect.value = preset.ratio;
  aspectMultiplier.value = { w: preset.widthRatio, h: preset.heightRatio };
  emitChange();
}

// ---------------------------------------------------------------------------
// Main State Variables
// ---------------------------------------------------------------------------
const isPaused = ref(false);
const currentSessionId = ref("");
const bgImage = ref<string | null>(null);
const previewImage = ref<string | null>(null);
const bgOpacity = ref(50);

const selectedIndex = ref<number>(-1);
const backgroundText = ref("A layout composition background");

// Ideogram 4 prompt schema structures
const style = ref({
  aesthetics: "masterpiece, high fidelity",
  lighting: "cinematic sunset lighting",
  photo: {}, // Photographic / Artistic mutual exclusive objects
  medium: "photograph",
  color_palette: ["#FF6B35", "#004E64", "#25A18E"] as string[]
});

interface LayoutElement {
  type: "obj" | "text";
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  desc: string;
  text?: string;
  color_palette?: string[];
}

const elements = ref<LayoutElement[]>([
  {
    type: "obj",
    bbox: [200, 100, 800, 900],
    desc: "A futuristic athletic running sneaker floating in mid-air",
    color_palette: ["#25A18E"]
  },
  {
    type: "text",
    bbox: [50, 200, 150, 800],
    desc: "A neon green typography text slogan",
    text: "RUN FAST"
  }
]);

const selectedElement = computed(() => {
  if (selectedIndex.value >= 0 && selectedIndex.value < elements.value.length) {
    return elements.value[selectedIndex.value];
  }
  return null;
});

const isPhotographic = computed(() => {
  return 'photo' in style.value;
});

function setMediumType(type: 'photo' | 'art') {
  if (type === 'photo') {
    style.value.photo = {};
    if ('art_style' in style.value) {
      delete (style.value as any).art_style;
    }
  } else {
    (style.value as any).art_style = {};
    if ('photo' in style.value) {
      delete (style.value as any).photo;
    }
  }
  emitChange();
}

// ---------------------------------------------------------------------------
// Interactive Bounding Box Render and Resizing Physics
// ---------------------------------------------------------------------------
const gridCanvas = ref<HTMLElement | null>(null);

function getBboxStyle(bbox: [number, number, number, number]) {
  // bbox is [ymin, xmin, ymax, xmax] on a [0-1000] scale.
  // Visual output must translate this to % percentages to fit the decoupled visual aspect ratio cleanly.
  const top = bbox[0] / 10;
  const left = bbox[1] / 10;
  const height = (bbox[2] - bbox[0]) / 10;
  const width = (bbox[3] - bbox[1]) / 10;
  
  return {
    top: `${top}%`,
    left: `${left}%`,
    width: `${width}%`,
    height: `${height}%`
  };
}

function selectElement(index: number, e: PointerEvent) {
  selectedIndex.value = index;
  startMove(index, e);
}

function deselectAll() {
  selectedIndex.value = -1;
}

// Drag element movement logic
let isDragging = false;
let startX = 0;
let startY = 0;
let startBbox: [number, number, number, number] = [0, 0, 0, 0];

function startMove(index: number, e: PointerEvent) {
  isDragging = true;
  selectedIndex.value = index;
  
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);
  
  startX = e.clientX;
  startY = e.clientY;
  startBbox = [...elements.value[index].bbox];
  
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', stopMove);
  target.addEventListener('pointercancel', stopMove);
}

function onMove(e: PointerEvent) {
  if (!isDragging || selectedIndex.value === -1 || !gridCanvas.value) return;
  
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  
  const rect = gridCanvas.value.getBoundingClientRect();
  
  // Convert visual drag offset pixels to 0-1000 coordinate scale
  const scaleX = 1000 / rect.width;
  const scaleY = 1000 / rect.height;
  
  const moveX = Math.round(dx * scaleX);
  const moveY = Math.round(dy * scaleY);
  
  const [ymin, xmin, ymax, xmax] = startBbox;
  const h = ymax - ymin;
  const w = xmax - xmin;
  
  let newYmin = ymin + moveY;
  let newXmin = xmin + moveX;
  
  // Bound checks to prevent elements exiting canvas boundary
  newYmin = Math.max(0, Math.min(1000 - h, newYmin));
  newXmin = Math.max(0, Math.min(1000 - w, newXmin));
  
  elements.value[selectedIndex.value].bbox = [
    newYmin,
    newXmin,
    newYmin + h,
    newXmin + w
  ];
  
  emitChange();
}

function stopMove(e: PointerEvent) {
  isDragging = false;
  const target = e.currentTarget as HTMLElement;
  target.releasePointerCapture(e.pointerId);
  target.removeEventListener('pointermove', onMove);
  target.removeEventListener('pointerup', stopMove);
  target.removeEventListener('pointercancel', stopMove);
}

// Bounding Box Edge Resizing Physics
let isResizing = false;
let resizeHandle = '';

function startResize(index: number, handle: string, e: PointerEvent) {
  isResizing = true;
  resizeHandle = handle;
  selectedIndex.value = index;
  
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);
  
  startX = e.clientX;
  startY = e.clientY;
  startBbox = [...elements.value[index].bbox];
  
  target.addEventListener('pointermove', onResize);
  target.addEventListener('pointerup', stopResize);
  target.addEventListener('pointercancel', stopResize);
}

function onResize(e: PointerEvent) {
  if (!isResizing || selectedIndex.value === -1 || !gridCanvas.value) return;
  
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  
  const rect = gridCanvas.value.getBoundingClientRect();
  const scaleX = 1000 / rect.width;
  const scaleY = 1000 / rect.height;
  
  const moveX = Math.round(dx * scaleX);
  const moveY = Math.round(dy * scaleY);
  
  let [ymin, xmin, ymax, xmax] = startBbox;
  
  if (resizeHandle.includes('t')) {
    ymin = Math.max(0, Math.min(ymax - 20, ymin + moveY));
  }
  if (resizeHandle.includes('b')) {
    ymax = Math.max(ymin + 20, Math.min(1000, ymax + moveY));
  }
  if (resizeHandle.includes('l')) {
    xmin = Math.max(0, Math.min(xmax - 20, xmin + moveX));
  }
  if (resizeHandle.includes('r')) {
    xmax = Math.max(xmin + 20, Math.min(1000, xmax + moveX));
  }
  
  elements.value[selectedIndex.value].bbox = [ymin, xmin, ymax, xmax];
  emitChange();
}

function stopResize(e: PointerEvent) {
  isResizing = false;
  const target = e.currentTarget as HTMLElement;
  target.releasePointerCapture(e.pointerId);
  target.removeEventListener('pointermove', onResize);
  target.removeEventListener('pointerup', stopResize);
  target.removeEventListener('pointercancel', stopResize);
}

// ---------------------------------------------------------------------------
// Sidebar Elements Modification Handlers
// ---------------------------------------------------------------------------
function addElement() {
  elements.value.push({
    type: "obj",
    bbox: [300, 300, 600, 600],
    desc: "A new design element",
    color_palette: []
  });
  selectedIndex.value = elements.value.length - 1;
  emitChange();
}

function deleteElement(index: number) {
  elements.value.splice(index, 1);
  if (selectedIndex.value === index) {
    selectedIndex.value = -1;
  } else if (selectedIndex.value > index) {
    selectedIndex.value--;
  }
  emitChange();
}

function onElementTypeChange() {
  const el = selectedElement.value;
  if (!el) return;
  if (el.type === 'text') {
    el.text = el.text || "SAMPLE TEXT";
  } else {
    delete el.text;
  }
  emitChange();
}

// Global Swatches Color management
function addGlobalColor(e: Event) {
  const input = e.target as HTMLInputElement;
  const color = input.value.toUpperCase();
  if (!style.value.color_palette) style.value.color_palette = [];
  if (style.value.color_palette.length < 16) {
    style.value.color_palette.push(color);
    emitChange();
  }
}

function removeGlobalColor(index: number) {
  style.value.color_palette.splice(index, 1);
  emitChange();
}

// Local Swatches Color management
function addLocalColor(e: Event) {
  const el = selectedElement.value;
  if (!el) return;
  const input = e.target as HTMLInputElement;
  const color = input.value.toUpperCase();
  if (!el.color_palette) el.color_palette = [];
  if (el.color_palette.length < 5) {
    el.color_palette.push(color);
    emitChange();
  }
}

function removeLocalColor(index: number) {
  const el = selectedElement.value;
  if (!el || !el.color_palette) return;
  el.color_palette.splice(index, 1);
  emitChange();
}

// Z-Order Manipulation / Layer List
function moveLayerUp(index: number) {
  if (index <= 0) return;
  const temp = elements.value[index];
  elements.value[index] = elements.value[index - 1];
  elements.value[index - 1] = temp;
  selectedIndex.value = index - 1;
  emitChange();
}

function moveLayerDown(index: number) {
  if (index >= elements.value.length - 1) return;
  const temp = elements.value[index];
  elements.value[index] = elements.value[index + 1];
  elements.value[index + 1] = temp;
  selectedIndex.value = index + 1;
  emitChange();
}

// ---------------------------------------------------------------------------
// Serialization and Synchronization Hooks
// ---------------------------------------------------------------------------
function serialise() {
  return JSON.stringify({
    aspect: currentAspect.value,
    style: style.value,
    background: backgroundText.value,
    elements: elements.value
  });
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (data.aspect) {
      currentAspect.value = data.aspect;
      const preset = aspectPresets.find(p => p.ratio === data.aspect);
      if (preset) {
        aspectMultiplier.value = { w: preset.widthRatio, h: preset.heightRatio };
      }
    }
    if (data.style) style.value = data.style;
    if (data.background) backgroundText.value = data.background;
    if (data.elements) elements.value = data.elements;
  } catch (e) {
    console.error("[GISA] State parsing error:", e);
  }
}

function emitChange() {
  if (props.onChange) {
    props.onChange(serialise());
  }
}

// WebSocket Event Handler for paused executions
function handlePauseEvent(e: CustomEvent) {
  const detail = e.detail;
  if (!detail) return;
  
  isPaused.value = true;
  currentSessionId.value = detail.session_id;
  bgImage.value = detail.image_b64 || null;
  previewImage.value = detail.preview_b64 || null;
  
  if (detail.layout) {
    if (detail.layout.style_description) {
      const styleDesc = detail.layout.style_description;
      style.value.aesthetics = styleDesc.aesthetics || "";
      style.value.lighting = styleDesc.lighting || "";
      style.value.medium = styleDesc.medium || "";
      
      if ('photo' in styleDesc) {
        style.value.photo = styleDesc.photo || {};
        delete (style.value as any).art_style;
      } else if ('art_style' in styleDesc) {
        (style.value as any).art_style = styleDesc.art_style || {};
        delete (style.value as any).photo;
      }
      style.value.color_palette = styleDesc.color_palette || [];
    }
    
    if (detail.layout.compositional_deconstruction) {
      if (detail.layout.compositional_deconstruction.background) {
        backgroundText.value = detail.layout.compositional_deconstruction.background;
      }
      if (detail.layout.compositional_deconstruction.elements) {
        elements.value = detail.layout.compositional_deconstruction.elements;
      }
    }
  }
  emitChange();
}

async function confirmLayout() {
  if (!currentSessionId.value) return;
  
  // Map reactive state back to strict Ideogram 4 prompt JSON structure
  const formattedLayout: any = {
    high_level_description: style.value.aesthetics + ", " + style.value.medium,
    style_description: {
      aesthetics: style.value.aesthetics,
      lighting: style.value.lighting,
      medium: style.value.medium,
      color_palette: style.value.color_palette
    },
    compositional_deconstruction: {
      background: backgroundText.value,
      elements: elements.value
    }
  };
  
  // Set photographic / artistic property
  if (isPhotographic.value) {
    formattedLayout.style_description.photo = style.value.photo;
  } else {
    formattedLayout.style_description.art_style = (style.value as any).art_style;
  }

  try {
    const response = await fetch("/duffy/gisa/continue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: currentSessionId.value,
        layout: formattedLayout
      })
    });
    
    if (response.ok) {
      isPaused.value = false;
      currentSessionId.value = "";
      // Keep changes serialized to layout state widget
      emitChange();
    } else {
      console.error("[GISA] Failed to resume backend execution.");
    }
  } catch (error) {
    console.error("[GISA] Error posting layout confirmation:", error);
  }
}

function cleanup() {
  comfyApi.removeEventListener("duffy-gisa-pause", handlePauseEvent as any);
}

defineExpose({ serialise, deserialise, cleanup });

onMounted(() => {
  comfyApi.addEventListener("duffy-gisa-pause", handlePauseEvent as any);
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
.gisa-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #1a1a1a;
  color: #e0e0e0;
  font-family: 'Inter', 'Roboto', sans-serif;
  box-sizing: border-box;
  font-size: 11px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #333;
}

/* Header Banner */
.gisa-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #111;
  border-bottom: 1px solid #292929;
}
.gisa-title {
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #00ff66;
  text-shadow: 0 0 4px rgba(0, 255, 102, 0.2);
}
.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 9px;
  text-transform: uppercase;
}
.status-badge.pulse {
  background-color: #ff3366;
  color: #fff;
  animation: pulse-animation 2s infinite;
}
.status-badge.idle {
  background-color: #2a2a2a;
  color: #888;
}
@keyframes pulse-animation {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

/* Main Workspace */
.gisa-workspace {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Left: Interactive Canvas Overlay */
.canvas-section {
  display: flex;
  flex-direction: column;
  width: 320px;
  padding: 12px;
  border-right: 1px solid #292929;
  background-color: #141414;
  box-sizing: border-box;
  justify-content: space-between;
  align-items: center;
}
.canvas-toolbar {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 4px;
  margin-bottom: 8px;
}
.canvas-toolbar label {
  font-size: 9px;
  color: #777;
  text-transform: uppercase;
  font-weight: bold;
}
.ratio-buttons {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.ratio-buttons button {
  background: #252525;
  border: 1px solid #383838;
  color: #aaa;
  border-radius: 3px;
  font-size: 9px;
  padding: 4px 0;
  cursor: pointer;
  transition: all 0.2s ease;
}
.ratio-buttons button:hover {
  background: #2f2f2f;
  color: #fff;
}
.ratio-buttons button.active {
  background: #00ff66;
  color: #111;
  border-color: #00ff66;
  font-weight: bold;
}

.canvas-container {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  background-color: #0d0d0d;
  border-radius: 4px;
  border: 1px solid #222;
  overflow: hidden;
  position: relative;
  margin: 8px 0;
}
.canvas-grid {
  position: relative;
  background: repeating-conic-gradient(#1e1e1e 0% 25%, #151515 0% 50%) 50% / 16px 16px;
  border: 1px dashed #444;
  box-sizing: border-box;
}

.bg-layer, .preview-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.preview-layer {
  z-index: 1;
}

/* Bounding Box Elements */
.bbox-rect {
  position: absolute;
  border: 1.5px solid #00ffff;
  background: rgba(0, 255, 255, 0.08);
  box-sizing: border-box;
  cursor: move;
  z-index: 2;
  transition: border-color 0.15s, background-color 0.15s;
}
.bbox-rect:hover {
  border-color: #00ff66;
  background: rgba(0, 255, 102, 0.12);
}
.bbox-rect.selected {
  border-color: #ff3366;
  background: rgba(255, 51, 102, 0.15);
  box-shadow: 0 0 8px rgba(255, 51, 102, 0.3);
  z-index: 3;
}
.bbox-rect.text {
  border-style: dashed;
}

.bbox-label {
  position: absolute;
  top: 2px;
  left: 4px;
  display: flex;
  gap: 4px;
  font-size: 8px;
  font-weight: bold;
  pointer-events: none;
}
.bbox-index {
  background: rgba(0, 0, 0, 0.8);
  padding: 1px 3px;
  border-radius: 2px;
  color: #fff;
}
.bbox-type {
  background: #2196f3;
  color: #fff;
  padding: 1px 3px;
  border-radius: 2px;
}
.bbox-rect.text .bbox-type {
  background: #ff9800;
}
.bbox-rect.selected .bbox-type {
  background: #ff3366;
}

.bbox-desc-summary {
  position: absolute;
  bottom: 2px;
  left: 4px;
  right: 4px;
  font-size: 7.5px;
  color: #eee;
  background: rgba(0, 0, 0, 0.6);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.bbox-text-literal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  color: #ff9800;
  text-shadow: 1px 1px 2px #000;
  pointer-events: none;
  font-size: 10px;
}

/* Resize Handles */
.resize-handle {
  position: absolute;
  width: 7px;
  height: 7px;
  background-color: #fff;
  border: 1px solid #111;
  border-radius: 50%;
  z-index: 4;
}
.resize-handle:hover {
  background-color: #00ff66;
  transform: scale(1.3);
}
.top-left { top: -4px; left: -4px; cursor: nwse-resize; }
.top-right { top: -4px; right: -4px; cursor: nesw-resize; }
.bottom-left { bottom: -4px; left: -4px; cursor: nesw-resize; }
.bottom-right { bottom: -4px; right: -4px; cursor: nwse-resize; }

.slider-group {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 4px;
}
.slider-group label {
  font-size: 8px;
  color: #777;
}
.slider-group input[type="range"] {
  width: 100%;
  accent-color: #00ff66;
}

/* Right: Inspector Sidebar */
.sidebar-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 12px;
  gap: 12px;
  overflow-y: auto;
  background-color: #181818;
}

.sidebar-block {
  background-color: #202020;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sidebar-block h3 {
  margin: 0 0 4px 0;
  font-size: 9px;
  color: #00ff66;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-bottom: 1px solid #2d2d2d;
  padding-bottom: 4px;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.add-element-btn {
  background-color: #004e64;
  color: #25a18e;
  border: 1px solid #25a18e;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: bold;
  cursor: pointer;
}
.add-element-btn:hover {
  background-color: #25a18e;
  color: #fff;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-row label {
  font-size: 8px;
  color: #888;
  text-transform: uppercase;
}
.form-row input[type="text"], .form-row select, .form-row textarea {
  background-color: #141414;
  border: 1px solid #333;
  color: #eee;
  padding: 5px 8px;
  border-radius: 3px;
  font-size: 10px;
  outline: none;
}
.form-row input[type="text"]:focus, .form-row select:focus, .form-row textarea:focus {
  border-color: #00ff66;
}

.toggle-row {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.toggle-group {
  display: flex;
  border: 1px solid #333;
  border-radius: 3px;
  overflow: hidden;
}
.toggle-group button {
  background-color: #141414;
  border: none;
  color: #888;
  font-size: 8px;
  font-weight: bold;
  padding: 4px 8px;
  cursor: pointer;
}
.toggle-group button.active {
  background-color: #00ff66;
  color: #111;
}

.palette-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #111;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.remove-x {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  opacity: 0;
  transition: opacity 0.15s;
}
.swatch:hover .remove-x {
  opacity: 1;
  background: rgba(0, 0, 0, 0.4);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px dashed #555;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
}
.add-swatch:hover {
  border-color: #00ff66;
}
.color-picker-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.add-plus {
  color: #888;
  font-size: 10px;
}

/* Layers / Z-Order List */
.layers-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 140px;
  overflow-y: auto;
}
.layer-item {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  background-color: #181818;
  border: 1px solid #272727;
  border-radius: 3px;
  cursor: pointer;
  gap: 6px;
  transition: all 0.15s ease;
}
.layer-item:hover {
  border-color: #444;
}
.layer-item.active {
  background-color: #2a2a2a;
  border-color: #00ff66;
}
.layer-num {
  font-weight: bold;
  color: #777;
}
.layer-type {
  font-size: 8px;
  padding: 1px 3px;
  border-radius: 2px;
  color: #fff;
  font-weight: bold;
}
.layer-type.obj { background-color: #2196f3; }
.layer-type.text { background-color: #ff9800; }
.layer-desc {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #aaa;
}
.layer-actions {
  display: flex;
  gap: 2px;
}
.layer-btn {
  background-color: #282828;
  border: 1px solid #3a3a3a;
  color: #aaa;
  border-radius: 2px;
  font-size: 8px;
  padding: 1px 4px;
  cursor: pointer;
}
.layer-btn:hover:not(:disabled) {
  background-color: #383838;
  color: #fff;
}
.layer-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.layer-btn.delete {
  color: #ff3366;
}
.layer-btn.delete:hover {
  background-color: #ff3366;
  color: #fff;
}

/* Coordinate display */
.bbox-display {
  background-color: #141414;
  padding: 8px;
  border-radius: 3px;
  border: 1px solid #2a2a2a;
}
.bbox-grid-inputs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin-top: 4px;
}
.bbox-grid-inputs div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.bbox-grid-inputs span {
  font-size: 7px;
  color: #666;
  font-weight: bold;
}
.bbox-grid-inputs input {
  width: 100%;
  background-color: #222;
  border: 1px solid #333;
  color: #eee;
  text-align: center;
  padding: 3px 0;
  border-radius: 2px;
  font-size: 9px;
}

/* Confirm Dialog Banner */
.confirm-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #ff3366;
  color: #fff;
  box-shadow: 0 -4px 10px rgba(0,0,0,0.3);
}
.confirm-msg {
  font-weight: bold;
  font-size: 10px;
}
.gisa-icon {
  margin-right: 4px;
}
.confirm-btn {
  background-color: #fff;
  color: #ff3366;
  border: none;
  font-weight: 800;
  padding: 5px 12px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 9px;
  transition: transform 0.1s ease;
}
.confirm-btn:hover {
  transform: scale(1.03);
}
.confirm-btn:active {
  transform: scale(0.97);
}
</style>
