<template>
  <div class="interactive-relight-root" v-if="isActive">
    <div class="canvas-container">
      <canvas ref="canvasRef"></canvas>
    </div>
    
    <div class="controls-panel">
      <div class="panel-header">
        <h4>Light Management</h4>
        <div class="footer-actions">
          <div class="add-buttons">
            <button class="btn" @click="addLight('point')"><span>+</span> Point</button>
            <button class="btn" @click="addLight('directional')"><span>+</span> Directional</button>
            <button class="btn" @click="addLight('ambient')"><span>+</span> Ambient</button>
          </div>
          <button class="btn btn-primary" @click="applyAndContinue">Apply & Continue</button>
        </div>
      </div>
      
      <div class="lights-scroll-area">
        <div v-for="(light, index) in lights" :key="index" class="light-item">
          <div class="light-header">
            <span>{{ light.type.toUpperCase() }} LIGHT</span>
            <button @click="removeLight(index)" class="btn btn-danger">Delete</button>
          </div>
          
          <div class="light-controls-grid">
            <div class="control-row">
              <label>Color</label>
              <input type="color" v-model="light.hexColor" @input="updateColor(light)" />
              <span style="font-family: monospace; font-size: 10px; min-width: 50px;">{{ light.hexColor }}</span>
            </div>
            
            <div class="control-row">
              <label>Power</label>
              <input type="range" min="0" max="5" step="0.1" v-model.number="light.intensity" @input="renderCanvas" />
              <span style="min-width: 25px; text-align: right;">{{ light.intensity.toFixed(1) }}</span>
            </div>
            
            <template v-if="light.type === 'point'">
              <div class="control-row">
                <label>Pos X</label>
                <input type="range" min="0" max="1" step="0.01" v-model.number="light.x" @input="renderCanvas" />
              </div>
              <div class="control-row">
                <label>Pos Y</label>
                <input type="range" min="0" max="1" step="0.01" v-model.number="light.y" @input="renderCanvas" />
              </div>
              <div class="control-row">
                <label>Radius</label>
                <input type="range" min="0.1" max="2" step="0.05" v-model.number="light.radius" @input="renderCanvas" />
              </div>
            </template>
            
            <template v-if="light.type === 'directional'">
              <div class="control-row">
                <label>Angle</label>
                <input type="range" min="0" max="360" step="1" v-model.number="light.angle" @input="renderCanvas" />
                <span style="min-width: 25px; text-align: right;">{{ light.angle }}°</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="idle-state">
    <div class="pulse"></div>
    <p style="font-size: 14px; font-weight: 500;">Waiting for image pipeline...</p>
    <p v-if="lights.length > 0" style="font-size: 12px; color: #444;">{{ lights.length }} light(s) defined in workflow state.</p>
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

const lights = ref<any[]>([]);

function serialise() {
  return JSON.stringify(lights.value);
}

function deserialise(json: string) {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data)) {
      lights.value = data;
      // Ensure hexColor is set for UI
      lights.value.forEach(l => {
        if (!l.hexColor && l.color) {
          l.hexColor = rgbToHex(l.color.r, l.color.g, l.color.b);
        }
      });
    }
  } catch (e) {}
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function updateColor(light: any) {
  light.color = hexToRgb(light.hexColor);
  renderCanvas();
}

function addLight(type: string) {
  lights.value.push({
    type,
    hexColor: '#ffffff',
    color: { r: 255, g: 255, b: 255 },
    intensity: 1.0,
    x: 0.5,
    y: 0.5,
    radius: 0.5,
    angle: 0
  });
  renderCanvas();
  props.onChange?.(serialise());
}

function removeLight(index: number) {
  lights.value.splice(index, 1);
  renderCanvas();
  props.onChange?.(serialise());
}

let isExecuting = false;

function onExecuting(e: any) {
  const executingId = e.detail ? String(e.detail) : null;
  const myId = String(props.nodeId);
  
  console.log(`Relight node ${myId} executing event:`, executingId);
  
  if (executingId === myId) {
    isExecuting = true;
  } else if (executingId === null || executingId === "-1") {
    isExecuting = false;
    isActive.value = false;
  } else {
    isExecuting = false;
  }
}

function onRelightPause(e: any) {
  const data = e.detail;
  console.log("Relight pause event received for session:", data.session_id);
  
  // Remove the isExecuting guard as it can be unreliable if events arrive out of order
  // or if the component was remounted during execution.
  sessionId.value = data.session_id;
  
  const img = new Image();
  img.onload = () => {
    console.log("Relight base image loaded, activating UI");
    baseImage.value = img;
    isActive.value = true;
    nextTick(() => renderCanvas());
  };
  img.onerror = (err) => {
    console.error("Relight failed to load base image:", err);
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
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(img, 0, 0);
  
  // Overlay lights
  ctx.globalCompositeOperation = 'lighter';
  
  for (const light of lights.value) {
    if (light.intensity <= 0) continue;
    
    ctx.save();
    if (light.type === 'point') {
      const cx = light.x * canvas.width;
      const cy = light.y * canvas.height;
      // Using canvas width as a reference for radius to keep it proportional
      const r = light.radius * canvas.width;
      
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const colorStr = `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, ${light.intensity})`;
      grad.addColorStop(0, colorStr);
      grad.addColorStop(1, `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, 0)`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
    } else if (light.type === 'directional') {
      const angleRad = (light.angle * Math.PI) / 180;
      const dx = Math.cos(angleRad);
      const dy = Math.sin(angleRad);
      
      // Calculate endpoints for linear gradient to cover canvas
      const diag = Math.sqrt(canvas.width*canvas.width + canvas.height*canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const x0 = cx - dx * diag / 2;
      const y0 = cy - dy * diag / 2;
      const x1 = cx + dx * diag / 2;
      const y1 = cy + dy * diag / 2;
      
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      const colorStr = `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, ${light.intensity})`;
      grad.addColorStop(0, colorStr);
      grad.addColorStop(1, `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, 0)`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
    } else if (light.type === 'ambient') {
      ctx.fillStyle = `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, ${light.intensity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }
}

async function applyAndContinue() {
  if (!sessionId.value) return;
  
  // Save to hidden widget
  props.onChange?.(serialise());
  
  // POST to backend
  try {
    await fetch('/duffy/relight/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId.value,
        lights: lights.value
      })
    });
    isActive.value = false;
    sessionId.value = '';
    baseImage.value = null;
  } catch (err) {
    console.error("Failed to resume relight:", err);
  }
}

function cleanup() {
  api.removeEventListener("executing", onExecuting);
  api.removeEventListener("duffy-relight-pause", onRelightPause);
}

onMounted(() => {
  api.addEventListener("executing", onExecuting);
  api.addEventListener("duffy-relight-pause", onRelightPause);
});

onUnmounted(() => {
  cleanup();
});

defineExpose({ serialise, deserialise, cleanup });
</script>

<style scoped>
.interactive-relight-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 600px;
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
  min-height: 300px;
}

canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
}

.controls-panel {
  height: 280px;
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

.lights-scroll-area {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  gap: 12px;
  padding-bottom: 8px;
}

/* Custom Scrollbar */
.lights-scroll-area::-webkit-scrollbar {
  height: 6px;
}
.lights-scroll-area::-webkit-scrollbar-track {
  background: #1a1a1a;
}
.lights-scroll-area::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}
.lights-scroll-area::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.light-item {
  min-width: 220px;
  background: #323232;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid #444;
  transition: border-color 0.2s;
}

.light-item:hover {
  border-color: #555;
}

.light-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 600;
  border-bottom: 1px solid #444;
  padding-bottom: 6px;
}

.light-controls-grid {
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
  flex: 0 0 70px;
  color: #aaa;
}

.control-row input, .control-row select {
  flex: 1;
  background: #1a1a1a;
  color: #fff;
  border: 1px solid #444;
  border-radius: 3px;
  padding: 2px 4px;
}

.control-row input[type="range"] {
  height: 4px;
  appearance: none;
  background: #444;
  outline: none;
  border-radius: 2px;
}

.control-row input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  background: #278;
  border-radius: 50%;
  cursor: pointer;
}

.footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.add-buttons {
  display: flex;
  gap: 8px;
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