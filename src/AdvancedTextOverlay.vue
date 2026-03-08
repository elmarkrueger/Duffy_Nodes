<template>
  <div class="advanced-text-overlay-root" v-if="isActive">
    <div class="canvas-container">
      <canvas ref="canvasRef"></canvas>
    </div>
    
    <div class="controls-panel">
      <div class="panel-header">
        <h4>Text Overlay Management</h4>
        <div class="footer-actions">
          <button class="btn" @click="addOverlay"><span>+</span> Add Text</button>
          <button class="btn btn-primary" @click="applyAndContinue">Apply & Continue</button>
        </div>
      </div>
      
      <div class="overlays-scroll-area">
        <div v-for="(overlay, index) in overlays" :key="index" class="overlay-item">
          <div class="overlay-header">
            <span>LAYER {{ index + 1 }}</span>
            <button @click="removeOverlay(index)" class="btn btn-danger">Delete</button>
          </div>
          
          <div class="overlay-controls-grid">
            <div class="control-row">
              <label>Text</label>
              <input type="text" v-model="overlay.text" @input="renderCanvas" placeholder="Enter text..." />
            </div>
            
            <div class="control-row">
              <label>Font</label>
              <select v-model="overlay.font" @change="onFontChange(overlay)">
                <option v-for="font in availableFonts" :key="font" :value="font">{{ font }}</option>
              </select>
            </div>

            <div class="control-row">
              <label>Size</label>
              <input type="range" min="8" max="1024" step="1" v-model.number="overlay.size" @input="renderCanvas" />
              <span style="min-width: 30px; text-align: right;">{{ overlay.size }}</span>
            </div>
            
            <div class="control-row">
              <label>Color</label>
              <input type="color" v-model="overlay.hexColor" @input="renderCanvas" />
              <span style="font-family: monospace; font-size: 10px; min-width: 50px;">{{ overlay.hexColor }}</span>
            </div>
            
            <div class="control-row">
              <label>Pos X</label>
              <input type="range" min="0" max="1" step="0.01" v-model.number="overlay.x" @input="renderCanvas" />
            </div>
            <div class="control-row">
              <label>Pos Y</label>
              <input type="range" min="0" max="1" step="0.01" v-model.number="overlay.y" @input="renderCanvas" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="idle-state">
    <div class="pulse"></div>
    <p style="font-size: 14px; font-weight: 500;">Waiting for image pipeline...</p>
    <p v-if="overlays.length > 0" style="font-size: 12px; color: #444;">{{ overlays.length }} text layer(s) defined in workflow state.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, shallowRef } from 'vue';
// @ts-ignore
import { api } from 'COMFY_API';

const props = defineProps<{
  nodeId: string;
  onChange?: (json: string) => void;
}>();

const isActive = ref(false);
const sessionId = ref('');
const canvasRef = ref<HTMLCanvasElement | null>(null);
const baseImage = shallowRef<HTMLImageElement | null>(null);

const overlays = ref<any[]>([]);
const availableFonts = ref<string[]>(["Arial", "Courier New", "Times New Roman", "Impact"]);
const loadedFonts = new Set<string>();

async function loadFont(fontName: string) {
  if (loadedFonts.has(fontName)) return;
  
  // If it's a custom font (filename with extension), load it via API
  if (fontName.match(/\.(ttf|otf|ttc)$/i)) {
    try {
      // Use the font name as the family name for simplicity
      const fontFace = new FontFace(fontName, `url(/duffy/fonts/${fontName})`);
      const loadedFace = await fontFace.load();
      (document.fonts as any).add(loadedFace);
      loadedFonts.add(fontName);
      console.log(`Loaded font: ${fontName}`);
      renderCanvas();
    } catch (err) {
      console.error(`Error loading font ${fontName}:`, err);
    }
  } else {
    // System font
    loadedFonts.add(fontName);
  }
}

function serialise() {
  return JSON.stringify(overlays.value);
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data)) {
      overlays.value = data;
      // Pre-load fonts for saved overlays
      overlays.value.forEach(layer => {
        if (layer.font) loadFont(layer.font);
      });
    }
  } catch (e) {}
}

function addOverlay() {
  const defaultFont = availableFonts.value[0] || "Arial";
  overlays.value.push({
    text: "New Text",
    font: defaultFont,
    size: 64,
    hexColor: "#ffffff",
    x: 0.5,
    y: 0.5
  });
  loadFont(defaultFont);
  renderCanvas();
  props.onChange?.(serialise());
}

function onFontChange(layer: any) {
  loadFont(layer.font);
  renderCanvas();
}

function removeOverlay(index: number) {
  overlays.value.splice(index, 1);
  renderCanvas();
  props.onChange?.(serialise());
}

let isExecuting = false;

function onExecuting(e: any) {
  const executingId = e.detail ? String(e.detail) : null;
  const myId = String(props.nodeId);
  
  if (executingId === myId) {
    isExecuting = true;
  } else if (executingId === null || executingId === "-1") {
    isExecuting = false;
    isActive.value = false;
  } else {
    isExecuting = false;
  }
}

function onTextOverlayPause(e: any) {
  const data = e.detail;
  sessionId.value = data.session_id;
  if (data.fonts && Array.isArray(data.fonts)) {
      availableFonts.value = data.fonts;
  }
  
  const img = new Image();
  img.onload = () => {
    baseImage.value = img;
    isActive.value = true;
    nextTick(() => renderCanvas());
  };
  img.onerror = (err) => {
    console.error("Text Overlay failed to load base image:", err);
  };
  img.src = data.image_b64;
}

function renderCanvas() {
  if (!canvasRef.value || !baseImage.value) return;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const img = baseImage.value;
  canvas.width = img.width;
  canvas.height = img.height;
  
  // Draw base image
  ctx.drawImage(img, 0, 0);
  
  // Draw text overlays preview
  for (const layer of overlays.value) {
    if (!layer.text) continue;
    
    ctx.save();
    // Rough approximation of font rendering on canvas
    ctx.font = `${layer.size}px "${layer.font}", sans-serif`;
    ctx.fillStyle = layer.hexColor;
    
    // Simple text baseline adjustment so top-left aligns roughly with PIL
    ctx.textBaseline = 'top'; 
    
    const px = layer.x * canvas.width;
    const py = layer.y * canvas.height;
    
    ctx.fillText(layer.text, px, py);
    ctx.restore();
  }
}

async function applyAndContinue() {
  if (!sessionId.value) return;
  
  // Save to hidden widget
  props.onChange?.(serialise());
  
  // POST to backend
  try {
    await fetch('/duffy/text_overlay/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId.value,
        overlays: overlays.value
      })
    });
    isActive.value = false;
    sessionId.value = '';
    baseImage.value = null;
  } catch (err) {
    console.error("Failed to resume text overlay:", err);
  }
}

function cleanup() {
  api.removeEventListener("executing", onExecuting);
  api.removeEventListener("duffy-text-overlay-pause", onTextOverlayPause);
}

onMounted(() => {
  api.addEventListener("executing", onExecuting);
  api.addEventListener("duffy-text-overlay-pause", onTextOverlayPause);
});

onUnmounted(() => {
  cleanup();
});

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
.advanced-text-overlay-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 700px;
  background: #1a1a1a;
  color: #e0e0e0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-sizing: border-box;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #333;
}

.canvas-container {
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  min-height: 200px;
}

canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
}

.controls-panel {
  height: 340px;
  padding: 16px;
  background: #252525;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h4 {
  margin: 0;
  font-size: 16px;
  color: #fff;
  letter-spacing: 0.5px;
}

.overlays-scroll-area {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  display: flex;
  gap: 12px;
  padding-bottom: 8px;
}

.overlays-scroll-area::-webkit-scrollbar {
  height: 6px;
}
.overlays-scroll-area::-webkit-scrollbar-track {
  background: #1a1a1a;
}
.overlays-scroll-area::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}
.overlays-scroll-area::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.overlay-item {
  min-width: 240px;
  background: #323232;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid #444;
  transition: border-color 0.2s;
}

.overlay-item:hover {
  border-color: #555;
}

.overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 600;
  border-bottom: 1px solid #444;
  padding-bottom: 6px;
}

.overlay-controls-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-row label {
  flex: 0 0 50px;
  color: #aaa;
}

.control-row input, .control-row select {
  flex: 1;
  background: #1a1a1a;
  color: #fff;
  border: 1px solid #444;
  border-radius: 3px;
  padding: 4px;
}

.control-row input[type="range"] {
  height: 4px;
  appearance: none;
  background: #444;
  outline: none;
  border-radius: 2px;
  padding: 0;
}

.control-row input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  background: #278;
  border-radius: 50%;
  cursor: pointer;
}

.control-row input[type="color"] {
  padding: 0;
  height: 24px;
}

.footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.btn {
  background: #3a3a3a;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn:hover {
  background: #4a4a4a;
  border-color: #666;
}

.btn-danger {
  background: #622;
  border-color: #833;
  padding: 2px 6px;
  font-size: 11px;
}

.btn-danger:hover {
  background: #833;
}

.btn-primary {
  background: #165;
  border-color: #286;
  font-weight: 600;
  padding: 8px 24px;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.btn-primary:hover {
  background: #286;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}

.idle-state {
  height: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #111;
  color: #666;
  gap: 12px;
}

.pulse {
  width: 12px;
  height: 12px;
  background: #379;
  border-radius: 50%;
  animation: pulse-animation 2s infinite;
}

@keyframes pulse-animation {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(51, 121, 153, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(51, 121, 153, 0); }
}
</style>