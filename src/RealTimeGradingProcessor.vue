<template>
  <div
    ref="rootRef"
    class="rtg-card"
    tabindex="0"
    @keydown="onCardKeyDown"
  >
    <!-- Compact Node Viewport -->
    <div class="rtg-card-viewport">
      <template v-if="cardPreviewUrl">
        <img
          v-if="sourcePreviewUrl"
          class="rtg-card-img rtg-card-before"
          :src="sourcePreviewUrl"
          draggable="false"
          alt="Original"
        />
        <img
          class="rtg-card-img rtg-card-after"
          :src="cardPreviewUrl"
          draggable="false"
          alt="Preview"
        />
      </template>
      <div v-else class="rtg-card-empty">
        <div class="rtg-card-empty-title">Real-Time Grading &amp; Shader Processor</div>
        <div class="rtg-card-empty-sub">
          Queue the workflow to pause here, or open the Studio Editor to pre-configure grading.
        </div>
      </div>

      <!-- Top Overlay Pills -->
      <div class="rtg-card-top-bar">
        <span v-if="imageSize[0] > 1" class="rtg-pill rtg-dim-pill">
          {{ imageSize[0] }} &times; {{ imageSize[1] }}
        </span>
        <span
          v-for="tag in activeSummaryTags"
          :key="tag"
          class="rtg-pill"
          :class="{ 'rtg-pill-neutral': tag === 'Pass-Through (Unchanged)' }"
        >
          {{ tag }}
        </span>
      </div>

      <div v-if="mode === 'submitting'" class="rtg-busy">
        <div class="rtg-spinner" />
      </div>
    </div>

    <!-- Compact Node HUD -->
    <div class="rtg-card-hud">
      <span class="rtg-badge" :class="`rtg-badge-${mode}`">{{ badgeText }}</span>
      <span class="rtg-spacer" />

      <button
        type="button"
        class="rtg-btn rtg-btn-editor"
        title="Open Full-Screen Studio Editor"
        @click.stop="openEditor"
      >
        Open Editor &#x26F6;
      </button>

      <button
        type="button"
        class="rtg-btn"
        :disabled="isIdentity"
        title="Reset all grading adjustments to neutral pass-through"
        @click.stop="resetAll"
      >
        Reset
      </button>

      <button
        v-if="session"
        type="button"
        class="rtg-btn rtg-btn-continue"
        :disabled="mode !== 'paused'"
        title="Apply current settings (or pass through unchanged) and resume workflow"
        @click.stop="submitSession"
      >
        {{ mode === 'submitting' ? 'Applying…' : 'Continue ▶' }}
      </button>

      <div v-if="statusMessage" class="rtg-card-msg">{{ statusMessage }}</div>
    </div>

    <!-- Full-Screen Studio Editor Modal -->
    <Teleport to="body">
      <div
        v-if="editorOpen"
        class="rtg-modal-backdrop"
        tabindex="0"
        @keydown.stop="onModalKeyDown"
        @pointerdown.stop
        @mousedown.stop
        @mouseup.stop
        @wheel.stop
        @contextmenu.prevent.stop
      >
        <div class="rtg-studio">
          <!-- Studio Top Header -->
          <header class="rtg-studio-header">
            <div class="rtg-studio-brand">
              <span class="rtg-studio-title">Real-Time Grading &amp; Shader Studio</span>
              <span class="rtg-studio-sub">Node #{{ getNodeId() }}</span>
              <span v-if="imageSize[0] > 1" class="rtg-studio-res">
                {{ imageSize[0] }} &times; {{ imageSize[1] }} px
              </span>
              <span v-if="mode === 'paused'" class="rtg-badge rtg-badge-paused">
                &#x23F8; Workflow Paused
              </span>
            </div>

            <!-- Preset Bar & View Controls -->
            <div class="rtg-studio-toolbar">
              <label class="rtg-toolbar-group">
                <span class="rtg-toolbar-label">Preset</span>
                <select
                  v-model="selectedPreset"
                  class="rtg-select"
                  @change="applyPreset(selectedPreset)"
                >
                  <option value="custom">— Custom —</option>
                  <option v-for="p in PRESET_LIST" :key="p.id" :value="p.id">
                    {{ p.label }}
                  </option>
                </select>
              </label>

              <div class="rtg-toolbar-divider" />

              <button
                type="button"
                class="rtg-btn"
                :class="{ 'rtg-btn-active': holdOriginal }"
                title="Hold to view original ungraded image (\)"
                @pointerdown="holdOriginal = true"
                @pointerup="holdOriginal = false"
                @pointerleave="holdOriginal = false"
              >
                Hold Original
              </button>

              <button
                type="button"
                class="rtg-btn"
                :title="'Reset wipe splitter to 50%'"
                @click="wipePercentage = 50"
              >
                Wipe {{ Math.round(wipePercentage) }}%
              </button>

              <button
                type="button"
                class="rtg-btn"
                :disabled="viewZoom === 1 && viewPan[0] === 0 && viewPan[1] === 0"
                title="Fit image to viewport"
                @click="resetStudioView"
              >
                Fit ({{ Math.round(viewZoom * 100) }}%)
              </button>
            </div>

            <!-- Primary Studio Actions -->
            <div class="rtg-studio-actions">
              <button
                type="button"
                class="rtg-btn rtg-btn-danger"
                :disabled="isIdentity && overallStrength === 1"
                @click="resetAll"
              >
                Reset All
              </button>

              <button
                type="button"
                class="rtg-btn"
                title="Close full-screen editor and return to node view (Esc)"
                @click="closeEditor"
              >
                Close Editor (Esc)
              </button>

              <button
                v-if="session"
                type="button"
                class="rtg-btn rtg-btn-continue rtg-btn-lg"
                :disabled="mode !== 'paused'"
                title="Apply grading and resume ComfyUI workflow (Enter)"
                @click="submitFromStudio"
              >
                {{ mode === 'submitting' ? 'Applying…' : 'Apply & Continue ▶' }}
              </button>
            </div>
          </header>

          <!-- Studio Main Body -->
          <div class="rtg-studio-body">
            <!-- Left/Center: Interactive WebGL2 Wipe Viewport -->
            <div
              ref="studioViewportRef"
              class="rtg-studio-viewport"
              :class="{ 'rtg-panning': isPanning }"
              @wheel.prevent="onStudioWheel"
              @pointerdown="onStudioViewportDown"
              @pointermove="onStudioPointerMove"
              @pointerup="onStudioPointerUp"
              @pointercancel="onStudioPointerUp"
            >
              <div
                ref="wipeContainer"
                class="rtg-stage-wrap"
                :style="studioStageStyle"
                @pointerdown="onStagePointerDown"
              >
                <!-- Source Canvas (Before) -->
                <canvas
                  ref="canvasBefore"
                  class="rtg-canvas rtg-canvas-before"
                />

                <!-- WebGL2 Graded Canvas (After) -->
                <canvas
                  v-show="!holdOriginal"
                  ref="canvasAfter"
                  class="rtg-canvas rtg-canvas-after"
                  :style="wipeClipStyle"
                />

                <!-- Wipe Splitter Line & Handle -->
                <div
                  v-show="!holdOriginal"
                  class="rtg-wipe-handle"
                  :style="{ left: `${wipePercentage}%` }"
                  @pointerdown.stop="startWipeDrag"
                >
                  <div class="rtg-wipe-line" />
                  <div class="rtg-wipe-thumb">
                    <span>&#x25C0;&#x25B6;</span>
                  </div>
                </div>

                <div class="rtg-wipe-tag rtg-tag-before">Before</div>
                <div v-show="!holdOriginal" class="rtg-wipe-tag rtg-tag-after">After (Live WebGL2)</div>
              </div>

              <div class="rtg-viewport-footer">
                <span>Drag splitter to compare Before/After</span>
                <span>&middot;</span>
                <span>Alt + Drag or Middle-Click to Pan</span>
                <span>&middot;</span>
                <span>Scroll Wheel to Zoom</span>
                <span>&middot;</span>
                <span>Double-click any slider to reset</span>
              </div>
            </div>

            <!-- Right Dock: Histogram + Tabbed Grading Controls -->
            <aside class="rtg-inspector">
              <!-- Live Output Histogram -->
              <div class="rtg-hist-box">
                <div class="rtg-hist-header">
                  <span>Live Output Histogram</span>
                  <span class="rtg-hist-sub">RGB + Rec.709 Luma</span>
                </div>
                <svg class="rtg-hist-svg" viewBox="0 0 256 90" preserveAspectRatio="none">
                  <path :d="getHistogramPath('r')" class="rtg-hist-path rtg-hist-r" />
                  <path :d="getHistogramPath('g')" class="rtg-hist-path rtg-hist-g" />
                  <path :d="getHistogramPath('b')" class="rtg-hist-path rtg-hist-b" />
                  <path :d="getHistogramPath('lum')" class="rtg-hist-path rtg-hist-lum" />
                </svg>
              </div>

              <!-- Master Strength Slider -->
              <div class="rtg-master-row">
                <div class="rtg-slider-head">
                  <span class="rtg-slider-label">Overall Grading Strength</span>
                  <span class="rtg-slider-val">{{ Math.round(overallStrength * 100) }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  :value="overallStrength"
                  class="rtg-range"
                  @input="onStrengthInput(($event.target as HTMLInputElement).value)"
                  @dblclick="onStrengthInput('1')"
                />
              </div>

              <!-- Inspector Navigation Tabs -->
              <nav class="rtg-tabs">
                <button
                  v-for="tab in INSPECTOR_TABS"
                  :key="tab.id"
                  type="button"
                  class="rtg-tab-btn"
                  :class="{ active: activeTab === tab.id }"
                  @click="activeTab = tab.id"
                >
                  {{ tab.label }}
                </button>
              </nav>

              <!-- Tab Panels -->
              <div class="rtg-tab-content">
                <!-- TAB 1: COLOR & TONE -->
                <div v-if="activeTab === 'tone'" class="rtg-panel-stack">
                  <div class="rtg-group-card">
                    <div class="rtg-group-title">White Balance</div>
                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Temperature (Cool / Warm)</span>
                        <span class="rtg-slider-val">{{ formatSigned(params.white_balance.temperature) }}</span>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        v-model.number="params.white_balance.temperature"
                        class="rtg-range rtg-range-temp"
                        @input="onParamChange"
                        @dblclick="params.white_balance.temperature = 0; onParamChange()"
                      />
                    </div>
                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Tint (Green / Magenta)</span>
                        <span class="rtg-slider-val">{{ formatSigned(params.white_balance.tint) }}</span>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        v-model.number="params.white_balance.tint"
                        class="rtg-range rtg-range-tint"
                        @input="onParamChange"
                        @dblclick="params.white_balance.tint = 0; onParamChange()"
                      />
                    </div>
                  </div>

                  <div class="rtg-group-card">
                    <div class="rtg-group-title">Exposure &amp; Color</div>
                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Exposure (Stops)</span>
                        <span class="rtg-slider-val">{{ formatSigned(params.exposure_contrast_saturation.exposure) }}</span>
                      </div>
                      <input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.01"
                        v-model.number="params.exposure_contrast_saturation.exposure"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.exposure_contrast_saturation.exposure = 0; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Contrast</span>
                        <span class="rtg-slider-val">{{ params.exposure_contrast_saturation.contrast.toFixed(2) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.01"
                        v-model.number="params.exposure_contrast_saturation.contrast"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.exposure_contrast_saturation.contrast = 1; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Saturation</span>
                        <span class="rtg-slider-val">{{ params.exposure_contrast_saturation.saturation.toFixed(2) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.01"
                        v-model.number="params.exposure_contrast_saturation.saturation"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.exposure_contrast_saturation.saturation = 1; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Vibrance</span>
                        <span class="rtg-slider-val">{{ formatSigned(params.exposure_contrast_saturation.vibrance) }}</span>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        v-model.number="params.exposure_contrast_saturation.vibrance"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.exposure_contrast_saturation.vibrance = 0; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Hue Shift</span>
                        <span class="rtg-slider-val">{{ Math.round(params.exposure_contrast_saturation.hue_shift) }}&deg;</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        v-model.number="params.exposure_contrast_saturation.hue_shift"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.exposure_contrast_saturation.hue_shift = 0; onParamChange()"
                      />
                    </div>
                  </div>

                  <div class="rtg-group-card">
                    <div class="rtg-group-title">Shadows &amp; Highlights</div>
                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Shadows Recovery</span>
                        <span class="rtg-slider-val">{{ formatSigned(params.shadows_highlights.shadows) }}</span>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        v-model.number="params.shadows_highlights.shadows"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.shadows_highlights.shadows = 0; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Highlights Recovery</span>
                        <span class="rtg-slider-val">{{ formatSigned(params.shadows_highlights.highlights) }}</span>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        v-model.number="params.shadows_highlights.highlights"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.shadows_highlights.highlights = 0; onParamChange()"
                      />
                    </div>
                  </div>

                  <div class="rtg-group-card">
                    <div class="rtg-group-title">Lift / Gamma / Gain</div>
                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Lift (Shadows Offset)</span>
                        <span class="rtg-slider-val">{{ formatSigned(params.lift_gamma_gain.lift) }}</span>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        v-model.number="params.lift_gamma_gain.lift"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.lift_gamma_gain.lift = 0; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Gamma (Midtones Power)</span>
                        <span class="rtg-slider-val">{{ params.lift_gamma_gain.gamma.toFixed(2) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="4"
                        step="0.01"
                        v-model.number="params.lift_gamma_gain.gamma"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.lift_gamma_gain.gamma = 1; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Gain (Highlights Multiplier)</span>
                        <span class="rtg-slider-val">{{ params.lift_gamma_gain.gain.toFixed(2) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.01"
                        v-model.number="params.lift_gamma_gain.gain"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.lift_gamma_gain.gain = 1; onParamChange()"
                      />
                    </div>
                  </div>
                </div>

                <!-- TAB 2: RGB TONAL CURVES -->
                <div v-else-if="activeTab === 'curves'" class="rtg-panel-stack">
                  <div class="rtg-group-card">
                    <div class="rtg-channel-bar">
                      <button
                        v-for="ch in CURVE_CHANNELS"
                        :key="ch"
                        type="button"
                        class="rtg-ch-btn"
                        :class="[`rtg-ch-${ch}`, { active: activeChannel === ch }]"
                        @click="activeChannel = ch; selectedKnotIndex = null"
                      >
                        {{ ch.toUpperCase() }}
                      </button>
                      <span class="rtg-spacer" />
                      <button
                        type="button"
                        class="rtg-btn rtg-btn-sm"
                        :disabled="!canRemoveSelectedKnot"
                        @click="removeSelectedKnot"
                      >
                        Remove Point
                      </button>
                      <button
                        type="button"
                        class="rtg-btn rtg-btn-sm"
                        @click="resetCurve(activeChannel)"
                      >
                        Reset {{ activeChannel.toUpperCase() }}
                      </button>
                    </div>

                    <div class="rtg-curve-box">
                      <svg
                        ref="curveSvg"
                        class="rtg-curve-svg"
                        viewBox="0 0 256 256"
                        @mousedown="onCurveMouseDown"
                        @mousemove="onCurveMouseMove"
                        @mouseup="onCurveMouseUp"
                        @mouseleave="onCurveMouseLeave"
                      >
                        <line x1="64" y1="0" x2="64" y2="256" class="rtg-grid-line" />
                        <line x1="128" y1="0" x2="128" y2="256" class="rtg-grid-line" />
                        <line x1="192" y1="0" x2="192" y2="256" class="rtg-grid-line" />
                        <line x1="0" y1="64" x2="256" y2="64" class="rtg-grid-line" />
                        <line x1="0" y1="128" x2="256" y2="128" class="rtg-grid-line" />
                        <line x1="0" y1="192" x2="256" y2="192" class="rtg-grid-line" />
                        <line x1="0" y1="256" x2="256" y2="0" class="rtg-diag-line" />

                        <path
                          v-for="ch in CURVE_CHANNELS.filter(c => c !== activeChannel)"
                          :key="'bg-curve-' + ch"
                          :d="getCurvePath(ch)"
                          class="rtg-curve-inactive"
                          :class="`rtg-stroke-${ch}`"
                        />

                        <path
                          :d="getCurvePath(activeChannel)"
                          class="rtg-curve-active"
                          :class="`rtg-stroke-${activeChannel}`"
                        />

                        <g>
                          <circle
                            v-for="(pt, idx) in params.curves[activeChannel]"
                            :key="'knot-' + idx"
                            :cx="pt[0] * 256"
                            :cy="256 - pt[1] * 256"
                            r="6"
                            class="rtg-knot"
                            :class="[
                              `rtg-stroke-${activeChannel}`,
                              { selected: selectedKnotIndex === idx }
                            ]"
                            @mousedown.stop="selectKnot(idx, $event)"
                            @dblclick.stop="removeKnot(idx)"
                          />
                        </g>

                        <text v-if="hoverCoord" x="10" y="18" class="rtg-curve-coord">
                          IN: {{ Math.round(hoverCoord[0] * 255) }} &rarr; OUT: {{ Math.round(hoverCoord[1] * 255) }}
                        </text>
                      </svg>
                    </div>
                    <div class="rtg-curve-hint">
                      Click anywhere on the curve to add a control point. Drag to shape tones. Double-click an interior point to delete it.
                    </div>
                  </div>
                </div>

                <!-- TAB 3: GRADIENT MAP -->
                <div v-else-if="activeTab === 'gradient'" class="rtg-panel-stack">
                  <div class="rtg-group-card">
                    <div class="rtg-row-between">
                      <span class="rtg-group-title" style="margin:0">Luminance Gradient Map</span>
                      <label class="rtg-switch-label">
                        <input
                          type="checkbox"
                          v-model="params.gradient_map.enabled"
                          @change="onParamChange"
                        />
                        <span>{{ params.gradient_map.enabled ? 'Enabled' : 'Disabled' }}</span>
                      </label>
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Blending Mode</span>
                      </div>
                      <select
                        v-model="params.gradient_map.blending_mode"
                        class="rtg-select"
                        style="width: 100%"
                        @change="onParamChange"
                      >
                        <option
                          v-for="m in ['Normal', 'Overlay', 'Soft Light', 'Multiply', 'Screen']"
                          :key="m"
                          :value="m"
                        >
                          {{ m }}
                        </option>
                      </select>
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Gradient Opacity</span>
                        <span class="rtg-slider-val">{{ Math.round(params.gradient_map.opacity * 100) }}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        v-model.number="params.gradient_map.opacity"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.gradient_map.opacity = 1; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Color Stops (Click bar to add, double-click pin to remove)</span>
                      </div>
                      <div
                        ref="gradientBar"
                        class="rtg-grad-bar"
                        :style="gradientBarStyle"
                        @mousedown="onGradientBarMouseDown"
                      >
                        <div
                          v-for="(stop, idx) in params.gradient_map.stops"
                          :key="'stop-' + idx"
                          class="rtg-grad-stop"
                          :class="{ active: activeStopIndex === idx }"
                          :style="{ left: `${stop.offset * 100}%` }"
                          @mousedown.stop="startStopDrag(idx, $event)"
                          @dblclick.stop="removeStop(idx)"
                        >
                          <div class="rtg-grad-pin" :style="{ backgroundColor: stop.color }" />
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="activeStopIndex !== null && params.gradient_map.stops[activeStopIndex]"
                      class="rtg-stop-editor"
                    >
                      <span class="rtg-slider-label">Stop #{{ activeStopIndex + 1 }}</span>
                      <label class="rtg-stop-field">
                        <span>Position %</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          class="rtg-num-input"
                          :value="Math.round(params.gradient_map.stops[activeStopIndex].offset * 100)"
                          @input="setStopOffset(activeStopIndex, Number(($event.target as HTMLInputElement).value) / 100)"
                        />
                      </label>
                      <label class="rtg-stop-field">
                        <span>Color</span>
                        <input
                          type="color"
                          v-model="params.gradient_map.stops[activeStopIndex].color"
                          class="rtg-color-input"
                          @input="onParamChange"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <!-- TAB 4: SHADERS & FX -->
                <div v-else-if="activeTab === 'fx'" class="rtg-panel-stack">
                  <div class="rtg-group-card">
                    <div class="rtg-group-title">Optical &amp; Detail</div>
                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Sharpen (Laplacian)</span>
                        <span class="rtg-slider-val">{{ params.sharpen.toFixed(2) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.01"
                        v-model.number="params.sharpen"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.sharpen = 0; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Chromatic Aberration</span>
                        <span class="rtg-slider-val">{{ params.chromatic_aberration.toFixed(3) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.05"
                        step="0.001"
                        v-model.number="params.chromatic_aberration"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.chromatic_aberration = 0; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Vignette Falloff</span>
                        <span class="rtg-slider-val">{{ params.vignette_intensity.toFixed(2) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.01"
                        v-model.number="params.vignette_intensity"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.vignette_intensity = 0; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Cinematic Film Grain</span>
                        <span class="rtg-slider-val">{{ params.film_grain.toFixed(3) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.1"
                        step="0.001"
                        v-model.number="params.film_grain"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.film_grain = 0; onParamChange()"
                      />
                    </div>
                  </div>

                  <div class="rtg-group-card">
                    <div class="rtg-group-title">Highlight Bloom</div>
                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Bloom Intensity</span>
                        <span class="rtg-slider-val">{{ params.bloom.intensity.toFixed(2) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.01"
                        v-model.number="params.bloom.intensity"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.bloom.intensity = 0; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Highlight Threshold</span>
                        <span class="rtg-slider-val">{{ params.bloom.threshold.toFixed(2) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        v-model.number="params.bloom.threshold"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.bloom.threshold = 0.8; onParamChange()"
                      />
                    </div>

                    <div class="rtg-control">
                      <div class="rtg-slider-head">
                        <span class="rtg-slider-label">Blur Radius</span>
                        <span class="rtg-slider-val">{{ params.bloom.radius.toFixed(2) }}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="8"
                        step="0.05"
                        v-model.number="params.bloom.radius"
                        class="rtg-range"
                        @input="onParamChange"
                        @dblclick="params.bloom.radius = 2; onParamChange()"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
// @ts-ignore - resolved at runtime by ComfyUI
import { api } from "COMFY_API";

const PAUSE_EVENT = "duffy-grading-pause";
const RESUME_ROUTE = "/duffy/grading/resume";
const PENDING_ROUTE = "/duffy/grading/pending";
const CURVE_CHANNELS = ["rgb", "r", "g", "b"] as const;
type CurveChannel = (typeof CURVE_CHANNELS)[number];

interface Stop {
  offset: number;
  color: string;
}

interface CurvesState {
  rgb: [number, number][];
  r: [number, number][];
  g: [number, number][];
  b: [number, number][];
}

interface GradingPayload {
  version: number;
  curves: CurvesState;
  white_balance: {
    temperature: number;
    tint: number;
  };
  exposure_contrast_saturation: {
    exposure: number;
    contrast: number;
    saturation: number;
    vibrance: number;
    hue_shift: number;
  };
  shadows_highlights: {
    shadows: number;
    highlights: number;
  };
  lift_gamma_gain: {
    lift: number;
    gamma: number;
    gain: number;
  };
  gradient_map: {
    enabled: boolean;
    stops: Stop[];
    blending_mode: "Normal" | "Overlay" | "Soft Light" | "Multiply" | "Screen";
    opacity: number;
  };
  bloom: {
    intensity: number;
    threshold: number;
    radius: number;
  };
  chromatic_aberration: number;
  sharpen: number;
  vignette_intensity: number;
  film_grain: number;
  input_signature?: string;
  overall_strength?: number;
}

const DEFAULT_PAYLOAD = (): GradingPayload => ({
  version: 1,
  curves: {
    rgb: [[0.0, 0.0], [1.0, 1.0]],
    r: [[0.0, 0.0], [1.0, 1.0]],
    g: [[0.0, 0.0], [1.0, 1.0]],
    b: [[0.0, 0.0], [1.0, 1.0]],
  },
  white_balance: {
    temperature: 0.0,
    tint: 0.0,
  },
  exposure_contrast_saturation: {
    exposure: 0.0,
    contrast: 1.0,
    saturation: 1.0,
    vibrance: 0.0,
    hue_shift: 0.0,
  },
  shadows_highlights: {
    shadows: 0.0,
    highlights: 0.0,
  },
  lift_gamma_gain: {
    lift: 0.0,
    gamma: 1.0,
    gain: 1.0,
  },
  gradient_map: {
    enabled: false,
    stops: [
      { offset: 0.0, color: "#000000" },
      { offset: 1.0, color: "#ffffff" },
    ],
    blending_mode: "Normal",
    opacity: 1.0,
  },
  bloom: {
    intensity: 0.0,
    threshold: 0.8,
    radius: 2.0,
  },
  chromatic_aberration: 0.0,
  sharpen: 0.0,
  vignette_intensity: 0.0,
  film_grain: 0.0,
});

const INSPECTOR_TABS = [
  { id: "tone", label: "Color & Tone" },
  { id: "curves", label: "RGB Curves" },
  { id: "gradient", label: "Gradient Map" },
  { id: "fx", label: "Shaders & FX" },
] as const;

const PRESET_LIST = [
  { id: "neutral", label: "Neutral (Pass-Through)" },
  { id: "teal_orange", label: "Teal & Orange Cinema" },
  { id: "golden_hour", label: "Warm Golden Hour" },
  { id: "bleach_bypass", label: "Bleach Bypass" },
  { id: "kodachrome", label: "Vintage Kodachrome" },
  { id: "noir", label: "High-Contrast Noir B&W" },
  { id: "cyberpunk", label: "Cyberpunk Neon" },
] as const;

const props = defineProps<{
  getNodeId: () => string;
  initialParams?: string;
  getOverallStrength?: () => number;
  onStateChange?: (json: string) => void;
  onStrengthChange?: (strength: number) => void;
}>();

type Mode = "idle" | "paused" | "submitting";

interface ActiveSession {
  sessionId: string;
  nodeId: string;
  sourceUrl: string;
  inputSignature: string;
}

const rootRef = ref<HTMLDivElement | null>(null);
const studioViewportRef = ref<HTMLDivElement | null>(null);
const wipeContainer = ref<HTMLDivElement | null>(null);
const canvasBefore = ref<HTMLCanvasElement | null>(null);
const canvasAfter = ref<HTMLCanvasElement | null>(null);
const curveSvg = ref<SVGElement | null>(null);
const gradientBar = ref<HTMLDivElement | null>(null);

const mode = ref<Mode>("idle");
const session = ref<ActiveSession | null>(null);
const editorOpen = ref(false);
const statusMessage = ref("");
const activeTab = ref<(typeof INSPECTOR_TABS)[number]["id"]>("tone");
const selectedPreset = ref("neutral");

const sourcePreviewUrl = ref("");
const processedPreviewUrl = ref("");
const liveCardDataUrl = ref("");
const imageSize = reactive<[number, number]>([1, 1]);
const overallStrength = ref<number>(props.getOverallStrength?.() ?? 1.0);

const params = reactive<GradingPayload>(DEFAULT_PAYLOAD());
const activeChannel = ref<CurveChannel>("rgb");
const selectedKnotIndex = ref<number | null>(null);
const isDraggingKnot = ref(false);
const hoverCoord = ref<[number, number] | null>(null);
const activeStopIndex = ref<number | null>(null);

const wipePercentage = ref(50);
const holdOriginal = ref(false);
const viewZoom = ref(1);
const viewPan = ref<[number, number]>([0, 0]);
const isPanning = ref(false);
const studioViewportSize = reactive({ w: 960, h: 640 });

const histogramData = reactive({
  r: new Array<number>(256).fill(0),
  g: new Array<number>(256).fill(0),
  b: new Array<number>(256).fill(0),
  lum: new Array<number>(256).fill(0),
});

const luts = reactive({
  rgb: new Float32Array(256),
  r: new Float32Array(256),
  g: new Float32Array(256),
  b: new Float32Array(256),
});

let proxyImageElement: HTMLImageElement | null = null;
let webglContext: WebGL2RenderingContext | null = null;
let webglProgram: WebGLProgram | null = null;
let imageTexture: WebGLTexture | null = null;
let lutTexture: WebGLTexture | null = null;
let gradTexture: WebGLTexture | null = null;
let webglReady = false;
let animFrameId = 0;
let rehydrateTimer: ReturnType<typeof setTimeout> | null = null;
let studioResizeObserver: ResizeObserver | null = null;
let cleanupWipeListeners: (() => void) | null = null;
let cleanupStopListeners: (() => void) | null = null;
let panDrag: { pointerId: number; startX: number; startY: number; pan0: [number, number] } | null = null;

// ---------------------------------------------------------------------------
// Computed UI Helpers
// ---------------------------------------------------------------------------

const cardPreviewUrl = computed(() => {
  if (liveCardDataUrl.value) return liveCardDataUrl.value;
  if (processedPreviewUrl.value) return processedPreviewUrl.value;
  if (sourcePreviewUrl.value) return sourcePreviewUrl.value;
  return "";
});

const badgeText = computed(() => {
  if (mode.value === "paused") return "⏸ Paused — Open Editor or Continue";
  if (mode.value === "submitting") return "Resuming workflow…";
  return cardPreviewUrl.value ? "Ready" : "Idle";
});

function isDefaultCurvePoints(pts: [number, number][] | undefined): boolean {
  if (!pts || pts.length !== 2) return false;
  return (
    Math.abs(pts[0][0] - 0) < 1e-4 &&
    Math.abs(pts[0][1] - 0) < 1e-4 &&
    Math.abs(pts[1][0] - 1) < 1e-4 &&
    Math.abs(pts[1][1] - 1) < 1e-4
  );
}

const isIdentity = computed(() => {
  const c = params.curves;
  if (!CURVE_CHANNELS.every((ch) => isDefaultCurvePoints(c[ch]))) return false;
  if (Math.abs(params.white_balance.temperature) > 1e-4 || Math.abs(params.white_balance.tint) > 1e-4) return false;
  const ecs = params.exposure_contrast_saturation;
  if (
    Math.abs(ecs.exposure) > 1e-4 ||
    Math.abs(ecs.contrast - 1) > 1e-4 ||
    Math.abs(ecs.saturation - 1) > 1e-4 ||
    Math.abs(ecs.vibrance) > 1e-4 ||
    Math.abs(ecs.hue_shift) > 1e-4
  ) return false;
  if (Math.abs(params.shadows_highlights.shadows) > 1e-4 || Math.abs(params.shadows_highlights.highlights) > 1e-4)
    return false;
  const lgg = params.lift_gamma_gain;
  if (Math.abs(lgg.lift) > 1e-4 || Math.abs(lgg.gamma - 1) > 1e-4 || Math.abs(lgg.gain - 1) > 1e-4) return false;
  if (params.gradient_map.enabled && params.gradient_map.opacity > 1e-4) return false;
  if (params.bloom.intensity > 1e-4) return false;
  if (
    params.chromatic_aberration > 1e-4 ||
    params.sharpen > 1e-4 ||
    params.vignette_intensity > 1e-4 ||
    params.film_grain > 1e-4
  ) return false;
  return true;
});

const activeSummaryTags = computed(() => {
  if (isIdentity.value || overallStrength.value <= 0.001) {
    return ["Pass-Through (Unchanged)"];
  }
  const tags: string[] = [];
  if (overallStrength.value < 0.999) tags.push(`Mix ${Math.round(overallStrength.value * 100)}%`);
  if (Math.abs(params.white_balance.temperature) > 0.01 || Math.abs(params.white_balance.tint) > 0.01)
    tags.push("White Balance");
  if (Math.abs(params.exposure_contrast_saturation.exposure) > 0.01)
    tags.push(`Exp ${formatSigned(params.exposure_contrast_saturation.exposure)}`);
  if (Math.abs(params.exposure_contrast_saturation.contrast - 1) > 0.01)
    tags.push(`Contrast ${params.exposure_contrast_saturation.contrast.toFixed(2)}`);
  if (
    Math.abs(params.exposure_contrast_saturation.saturation - 1) > 0.01 ||
    Math.abs(params.exposure_contrast_saturation.vibrance) > 0.01
  ) tags.push("Color/Sat");
  if (Math.abs(params.shadows_highlights.shadows) > 0.01 || Math.abs(params.shadows_highlights.highlights) > 0.01)
    tags.push("Shadows/Highlights");
  if (
    Math.abs(params.lift_gamma_gain.lift) > 0.01 ||
    Math.abs(params.lift_gamma_gain.gamma - 1) > 0.01 ||
    Math.abs(params.lift_gamma_gain.gain - 1) > 0.01
  ) tags.push("Lift/Gamma/Gain");
  if (!CURVE_CHANNELS.every((ch) => isDefaultCurvePoints(params.curves[ch]))) tags.push("Curves");
  if (params.gradient_map.enabled) tags.push(`GradMap (${params.gradient_map.blending_mode})`);
  if (params.bloom.intensity > 0.01) tags.push("Bloom");
  if (params.sharpen > 0.01) tags.push("Sharpen");
  if (params.chromatic_aberration > 0.001) tags.push("Chromatic Ab.");
  if (params.vignette_intensity > 0.01) tags.push("Vignette");
  if (params.film_grain > 0.001) tags.push("Film Grain");
  return tags.slice(0, 5);
});

const wipeClipStyle = computed(() => ({
  clipPath: `polygon(${wipePercentage.value}% 0, 100% 0, 100% 100%, ${wipePercentage.value}% 100%)`,
}));

const gradientBarStyle = computed(() => {
  if (!params.gradient_map.stops.length) return { background: "#000" };
  const stopsStr = [...params.gradient_map.stops]
    .sort((a, b) => a.offset - b.offset)
    .map((s) => `${s.color} ${s.offset * 100}%`)
    .join(", ");
  return { background: `linear-gradient(to right, ${stopsStr})` };
});

const studioStageStyle = computed(() => {
  const iw = Math.max(1, proxyImageElement?.naturalWidth || imageSize[0] || 640);
  const ih = Math.max(1, proxyImageElement?.naturalHeight || imageSize[1] || 480);
  const vw = Math.max(200, studioViewportSize.w - 48);
  const vh = Math.max(200, studioViewportSize.h - 64);
  const fitScale = Math.min(vw / iw, vh / ih);
  const w = Math.max(1, Math.round(iw * fitScale));
  const h = Math.max(1, Math.round(ih * fitScale));
  return {
    width: `${w}px`,
    height: `${h}px`,
    transform: `translate(${viewPan.value[0]}px, ${viewPan.value[1]}px) scale(${viewZoom.value})`,
  };
});

function formatSigned(val: number): string {
  return (val >= 0 ? "+" : "") + val.toFixed(2);
}

// ---------------------------------------------------------------------------
// Monotone Cubic Splines & LUTs
// ---------------------------------------------------------------------------

function interpolateMonotoneCubic(points: [number, number][] | undefined): Float32Array {
  const lut = new Float32Array(256);
  if (!Array.isArray(points) || points.length < 2 || isDefaultCurvePoints(points)) {
    for (let i = 0; i < 256; i++) lut[i] = i / 255;
    return lut;
  }

  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const xs = sorted.map((p) => p[0]);
  const ys = sorted.map((p) => p[1]);

  for (let i = 1; i < xs.length; i++) {
    if (xs[i] <= xs[i - 1]) xs[i] = xs[i - 1] + 1e-5;
  }

  const n = xs.length;
  const ms = new Float32Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    ms[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  }

  const ds = new Float32Array(n);
  ds[0] = ms[0];
  ds[n - 1] = ms[n - 2];
  for (let i = 1; i < n - 1; i++) {
    ds[i] = (ms[i - 1] + ms[i]) / 2.0;
  }

  for (let i = 0; i < n - 1; i++) {
    if (ms[i] === 0.0) {
      ds[i] = 0.0;
      ds[i + 1] = 0.0;
    } else {
      const alpha = ds[i] / ms[i];
      const beta = ds[i + 1] / ms[i];
      const val = alpha * alpha + beta * beta;
      if (val > 9.0) {
        const tau = 3.0 / Math.sqrt(val);
        ds[i] = tau * alpha * ms[i];
        ds[i + 1] = tau * beta * ms[i];
      }
    }
  }

  for (let idx = 0; idx < 256; idx++) {
    const x = idx / 255;
    if (x <= xs[0]) {
      lut[idx] = Math.max(0, Math.min(1, ys[0]));
      continue;
    }
    if (x >= xs[n - 1]) {
      lut[idx] = Math.max(0, Math.min(1, ys[n - 1]));
      continue;
    }
    let i = 0;
    while (i < n - 1 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const h00 = 2.0 * t * t * t - 3.0 * t * t + 1.0;
    const h10 = t * t * t - 2.0 * t * t + t;
    const h01 = -2.0 * t * t * t + 3.0 * t * t;
    const h11 = t * t * t - t * t;
    const val = h00 * ys[i] + h10 * h * ds[i] + h01 * ys[i + 1] + h11 * h * ds[i + 1];
    lut[idx] = Math.max(0, Math.min(1, val));
  }
  return lut;
}

function recalculateLuts() {
  luts.rgb = interpolateMonotoneCubic(params.curves.rgb);
  luts.r = interpolateMonotoneCubic(params.curves.r);
  luts.g = interpolateMonotoneCubic(params.curves.g);
  luts.b = interpolateMonotoneCubic(params.curves.b);
}

function getCurvePath(channel: CurveChannel): string {
  const lut = interpolateMonotoneCubic(params.curves[channel]);
  let d = `M 0 ${256 - lut[0] * 256}`;
  for (let i = 1; i < 256; i++) {
    d += ` L ${i} ${256 - lut[i] * 256}`;
  }
  return d;
}

// ---------------------------------------------------------------------------
// WebGL2 Real-Time Shader Engine
// ---------------------------------------------------------------------------

const VS_SOURCE = `#version 300 es
  in vec2 position;
  in vec2 texCoord;
  out vec2 v_texCoord;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    v_texCoord = vec2(texCoord.x, 1.0 - texCoord.y);
  }
`;

const FS_SOURCE = `#version 300 es
  precision highp float;
  uniform sampler2D u_image;
  uniform sampler2D u_curvesLut;
  uniform sampler2D u_gradientMap;
  uniform int u_gradientEnabled;
  uniform float u_gradientOpacity;
  uniform int u_gradientBlendingMode;

  uniform float u_temperature;
  uniform float u_tint;
  uniform float u_exposure;
  uniform float u_contrast;
  uniform float u_saturation;
  uniform float u_vibrance;
  uniform float u_hue_shift;
  uniform float u_shadows;
  uniform float u_highlights;
  uniform float u_lift;
  uniform float u_gamma;
  uniform float u_gain;
  uniform float u_chromatic_aberration;
  uniform float u_grain_intensity;
  uniform float u_sharpen_intensity;
  uniform float u_vignette_intensity;
  uniform float u_bloom_intensity;
  uniform float u_bloom_threshold;
  uniform float u_bloom_radius;
  uniform float u_overall_strength;

  in vec2 v_texCoord;
  out vec4 fragColor;

  vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(
      2.0 * base * blend,
      1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
      step(0.5, base)
    );
  }

  vec3 blendSoftLight(vec3 base, vec3 blend) {
    return (1.0 - 2.0 * blend) * base * base + 2.0 * blend * base;
  }

  vec3 applyHueRotation(vec3 c, float deg) {
    if (abs(deg) < 1e-4) return c;
    float angle = radians(deg);
    float cosA = cos(angle);
    float sinA = sin(angle);
    float oneThird = 1.0 / 3.0;
    float sqrtThird = sqrt(oneThird);
    mat3 rot = mat3(
      cosA + (1.0 - cosA) * oneThird,
      oneThird * (1.0 - cosA) + sqrtThird * sinA,
      oneThird * (1.0 - cosA) - sqrtThird * sinA,
      oneThird * (1.0 - cosA) - sqrtThird * sinA,
      cosA + oneThird * (1.0 - cosA),
      oneThird * (1.0 - cosA) + sqrtThird * sinA,
      oneThird * (1.0 - cosA) + sqrtThird * sinA,
      oneThird * (1.0 - cosA) - sqrtThird * sinA,
      cosA + oneThird * (1.0 - cosA)
    );
    return clamp(rot * c, 0.0, 1.0);
  }

  vec3 applyColorAndTone(vec3 inputColor) {
    vec3 color = inputColor;

    // White Balance
    vec3 wbScale = vec3(
      1.0 + u_temperature * 0.25 + u_tint * 0.12,
      1.0 - u_tint * 0.24,
      1.0 - u_temperature * 0.25 + u_tint * 0.12
    );
    color = clamp(color * wbScale, 0.0, 1.0);

    // Exposure & Contrast
    color = color * pow(2.0, u_exposure);
    color = clamp((color - 0.5) * u_contrast + 0.5, 0.0, 1.0);

    // Shadows & Highlights
    if (abs(u_shadows) > 1e-4 || abs(u_highlights) > 1e-4) {
      float lumSh = dot(color, vec3(0.2126, 0.7152, 0.0722));
      float shWeight = (1.0 - lumSh) * (1.0 - lumSh);
      float hiWeight = lumSh * lumSh;
      color = clamp(color + vec3(u_shadows * 0.35 * shWeight + u_highlights * 0.35 * hiWeight), 0.0, 1.0);
    }

    // Hue Shift
    color = applyHueRotation(color, u_hue_shift);

    // Saturation & Vibrance
    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = vec3(lum) + (color - vec3(lum)) * u_saturation;
    if (abs(u_vibrance) > 1e-4) {
      float maxC = max(color.r, max(color.g, color.b));
      float minC = min(color.r, min(color.g, color.b));
      float satAmt = clamp(maxC - minC, 0.0, 1.0);
      float vibBoost = 1.0 + u_vibrance * (1.0 - satAmt);
      color = vec3(lum) + (color - vec3(lum)) * vibBoost;
    }
    color = clamp(color, 0.0, 1.0);

    // Lift / Gamma / Gain
    color = color + vec3(u_lift);
    color = pow(max(color, vec3(1e-6)), vec3(1.0 / max(u_gamma, 1e-3)));
    color = color * vec3(u_gain);
    return clamp(color, 0.0, 1.0);
  }

  vec3 applyCurves(vec3 color) {
    float rGraded = texture(u_curvesLut, vec2(color.r, 0.5)).r;
    float gGraded = texture(u_curvesLut, vec2(color.g, 0.5)).g;
    float bGraded = texture(u_curvesLut, vec2(color.b, 0.5)).b;

    rGraded = texture(u_curvesLut, vec2(rGraded, 0.5)).a;
    gGraded = texture(u_curvesLut, vec2(gGraded, 0.5)).a;
    bGraded = texture(u_curvesLut, vec2(bGraded, 0.5)).a;

    return clamp(vec3(rGraded, gGraded, bGraded), 0.0, 1.0);
  }

  vec3 applyGradientMap(vec3 color) {
    if (u_gradientEnabled != 1 || u_gradientOpacity <= 1e-4) {
      return color;
    }
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 gradColor = texture(u_gradientMap, vec2(luminance, 0.5)).rgb;

    vec3 blended;
    if (u_gradientBlendingMode == 0) {
      blended = gradColor;
    } else if (u_gradientBlendingMode == 1) {
      blended = blendOverlay(color, gradColor);
    } else if (u_gradientBlendingMode == 2) {
      blended = blendSoftLight(color, gradColor);
    } else if (u_gradientBlendingMode == 3) {
      blended = color * gradColor;
    } else if (u_gradientBlendingMode == 4) {
      blended = 1.0 - (1.0 - color) * (1.0 - gradColor);
    } else {
      blended = gradColor;
    }
    return mix(color, blended, u_gradientOpacity);
  }

  vec3 processSampleColor(vec2 sampleUv) {
    vec3 sampled = texture(u_image, sampleUv).rgb;
    sampled = applyColorAndTone(sampled);
    sampled = applyCurves(sampled);
    sampled = applyGradientMap(sampled);
    return sampled;
  }

  void main() {
    vec2 uv = v_texCoord;
    vec3 origColor = texture(u_image, uv).rgb;
    vec3 centerColor = origColor;

    // 1. Sharpening
    if (u_sharpen_intensity > 0.0) {
      vec2 texelSize = 1.0 / vec2(textureSize(u_image, 0));
      vec3 left = texture(u_image, uv - vec2(texelSize.x, 0.0)).rgb;
      vec3 right = texture(u_image, uv + vec2(texelSize.x, 0.0)).rgb;
      vec3 top = texture(u_image, uv - vec2(0.0, texelSize.y)).rgb;
      vec3 bottom = texture(u_image, uv + vec2(0.0, texelSize.y)).rgb;
      vec3 laplacian = 4.0 * centerColor - left - right - top - bottom;
      centerColor = clamp(centerColor + u_sharpen_intensity * laplacian, 0.0, 1.0);
    }

    // 2. Chromatic Aberration
    vec2 centerToUV = (uv - vec2(0.5)) * 2.0;
    float dist = length(centerToUV);
    vec3 color = centerColor;
    if (u_chromatic_aberration > 0.0 && dist > 1e-5) {
      vec2 offset = (centerToUV / dist) * (dist * dist) * u_chromatic_aberration * 0.5;
      color.r = texture(u_image, clamp(uv + offset, 0.0, 1.0)).r;
      color.g = centerColor.g;
      color.b = texture(u_image, clamp(uv - offset, 0.0, 1.0)).b;
    }

    // 3-7. Color & Tone
    color = applyColorAndTone(color);

    // 8. Curves
    color = applyCurves(color);

    // 9. Gradient Map
    color = applyGradientMap(color);

    // 10. Bloom
    if (u_bloom_intensity > 0.0 && u_bloom_radius > 0.0) {
      vec2 texelSize = 1.0 / vec2(textureSize(u_image, 0));
      vec2 bloomStep = texelSize * u_bloom_radius;
      float bloomMaskDenom = max(1e-6, 1.0 - u_bloom_threshold);

      vec3 bloomAccum = vec3(0.0);
      float weightAccum = 0.0;

      float centerWeight = 0.227027;
      float centerLum = dot(color, vec3(0.2126, 0.7152, 0.0722));
      float centerMask = clamp((centerLum - u_bloom_threshold) / bloomMaskDenom, 0.0, 1.0);
      bloomAccum += color * centerMask * centerWeight;
      weightAccum += centerWeight;

      float nearWeight = 0.316216;
      vec2 nearOffsets[4];
      nearOffsets[0] = vec2(1.3846, 0.0);
      nearOffsets[1] = vec2(-1.3846, 0.0);
      nearOffsets[2] = vec2(0.0, 1.3846);
      nearOffsets[3] = vec2(0.0, -1.3846);
      for (int i = 0; i < 4; i++) {
        vec3 sCol = processSampleColor(clamp(uv + nearOffsets[i] * bloomStep, 0.0, 1.0));
        float sLum = dot(sCol, vec3(0.2126, 0.7152, 0.0722));
        float sMask = clamp((sLum - u_bloom_threshold) / bloomMaskDenom, 0.0, 1.0);
        bloomAccum += sCol * sMask * nearWeight;
        weightAccum += nearWeight;
      }

      float farWeight = 0.070270;
      vec2 farOffsets[4];
      farOffsets[0] = vec2(3.2308, 3.2308);
      farOffsets[1] = vec2(-3.2308, 3.2308);
      farOffsets[2] = vec2(3.2308, -3.2308);
      farOffsets[3] = vec2(-3.2308, -3.2308);
      for (int i = 0; i < 4; i++) {
        vec3 sCol = processSampleColor(clamp(uv + farOffsets[i] * bloomStep, 0.0, 1.0));
        float sLum = dot(sCol, vec3(0.2126, 0.7152, 0.0722));
        float sMask = clamp((sLum - u_bloom_threshold) / bloomMaskDenom, 0.0, 1.0);
        bloomAccum += sCol * sMask * farWeight;
        weightAccum += farWeight;
      }

      vec3 bloom = bloomAccum / max(weightAccum, 1e-6);
      color = clamp(color + bloom * u_bloom_intensity, 0.0, 1.0);
    }

    // 11. Vignette
    if (u_vignette_intensity > 0.0) {
      float vignette = clamp(1.0 - (dist * dist * u_vignette_intensity), 0.0, 1.0);
      color *= vignette;
    }

    // 12. Film Grain
    if (u_grain_intensity > 0.0) {
      float noise = fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453);
      float grainAmount = (noise - 0.5) * 2.0 * u_grain_intensity;
      color = clamp(color + grainAmount, 0.0, 1.0);
    }

    color = mix(origColor, color, clamp(u_overall_strength, 0.0, 1.0));
    fragColor = vec4(color, 1.0);
  }
`;

function createSyntheticTestChart(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 400;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  // Smooth gradient sky/backdrop
  const bg = ctx.createLinearGradient(0, 0, 640, 400);
  bg.addColorStop(0, "#102542");
  bg.addColorStop(0.5, "#3b526b");
  bg.addColorStop(1, "#f87060");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 640, 400);

  // Color swatches row
  const swatches = ["#e63946", "#f4a261", "#e9c46a", "#2a9d8f", "#264653", "#8338ec", "#ff006e", "#f1faee"];
  const sw = 640 / swatches.length;
  swatches.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.fillRect(idx * sw, 260, sw, 80);
  });

  // Grayscale ramp at bottom
  const ramp = ctx.createLinearGradient(0, 0, 640, 0);
  ramp.addColorStop(0, "#000000");
  ramp.addColorStop(1, "#ffffff");
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 340, 640, 60);
  return c;
}

function initWebGL() {
  const canvas = canvasAfter.value;
  if (!canvas) return;

  webglReady = false;
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
  if (!gl) return;

  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;

  gl.shaderSource(vs, VS_SOURCE);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error("[Duffy Grading] VS compile error:", gl.getShaderInfoLog(vs));
    return;
  }

  gl.shaderSource(fs, FS_SOURCE);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error("[Duffy Grading] FS compile error:", gl.getShaderInfoLog(fs));
    return;
  }

  const program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[Duffy Grading] Program link error:", gl.getProgramInfoLog(program));
    return;
  }

  const vertices = new Float32Array([
    -1, -1, 0, 0,
     1, -1, 1, 0,
    -1,  1, 0, 1,
    -1,  1, 0, 1,
     1, -1, 1, 0,
     1,  1, 1, 1,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 16, 0);

  const texAttr = gl.getAttribLocation(program, "texCoord");
  gl.enableVertexAttribArray(texAttr);
  gl.vertexAttribPointer(texAttr, 2, gl.FLOAT, false, 16, 8);

  const makeTex = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };

  imageTexture = makeTex();
  lutTexture = makeTex();
  gradTexture = makeTex();

  webglContext = gl;
  webglProgram = program;
  webglReady = !!(webglProgram && imageTexture && lutTexture && gradTexture);

  uploadCurrentImageToWebGL();
}

function uploadCurrentImageToWebGL() {
  const canvasB = canvasBefore.value;
  const source: HTMLImageElement | HTMLCanvasElement = proxyImageElement || createSyntheticTestChart();
  const w = source instanceof HTMLImageElement ? source.naturalWidth || 640 : source.width;
  const h = source instanceof HTMLImageElement ? source.naturalHeight || 400 : source.height;

  if (canvasB) {
    canvasB.width = w;
    canvasB.height = h;
    const ctxB = canvasB.getContext("2d");
    ctxB?.drawImage(source, 0, 0, w, h);
  }

  if (webglReady && webglContext && imageTexture) {
    webglContext.activeTexture(webglContext.TEXTURE0);
    webglContext.bindTexture(webglContext.TEXTURE_2D, imageTexture);
    webglContext.pixelStorei(webglContext.UNPACK_FLIP_Y_WEBGL, false);
    webglContext.texImage2D(
      webglContext.TEXTURE_2D,
      0,
      webglContext.RGBA,
      webglContext.RGBA,
      webglContext.UNSIGNED_BYTE,
      source
    );
  }
}

function updateLutTexture() {
  const gl = webglContext;
  if (!gl || !lutTexture) return;
  recalculateLuts();
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    data[i * 4 + 0] = Math.round(luts.r[i] * 255);
    data[i * 4 + 1] = Math.round(luts.g[i] * 255);
    data[i * 4 + 2] = Math.round(luts.b[i] * 255);
    data[i * 4 + 3] = Math.round(luts.rgb[i] * 255);
  }
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, lutTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
}

function updateGradientTexture() {
  const gl = webglContext;
  if (!gl || !gradTexture) return;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return;

  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  const stops = [...params.gradient_map.stops].sort((a, b) => a.offset - b.offset);
  if (stops.length > 0) {
    stops.forEach((s) => grad.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color));
  } else {
    grad.addColorStop(0, "#000000");
    grad.addColorStop(1, "#ffffff");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  const imgData = ctx.getImageData(0, 0, 256, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, gradTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgData.data);
}

function renderWebGL() {
  const gl = webglContext;
  const program = webglProgram;
  const canvas = canvasAfter.value;
  if (!webglReady || !gl || !program || !canvas) return;

  const w = proxyImageElement?.naturalWidth || 640;
  const h = proxyImageElement?.naturalHeight || 400;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);

  updateLutTexture();
  gl.uniform1i(gl.getUniformLocation(program, "u_curvesLut"), 1);

  updateGradientTexture();
  gl.uniform1i(gl.getUniformLocation(program, "u_gradientMap"), 2);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, imageTexture);
  gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);

  const modes = ["Normal", "Overlay", "Soft Light", "Multiply", "Screen"];
  const blendIndex = Math.max(0, modes.indexOf(params.gradient_map.blending_mode));

  gl.uniform1i(gl.getUniformLocation(program, "u_gradientEnabled"), params.gradient_map.enabled ? 1 : 0);
  gl.uniform1f(gl.getUniformLocation(program, "u_gradientOpacity"), params.gradient_map.opacity);
  gl.uniform1i(gl.getUniformLocation(program, "u_gradientBlendingMode"), blendIndex);

  gl.uniform1f(gl.getUniformLocation(program, "u_temperature"), params.white_balance.temperature);
  gl.uniform1f(gl.getUniformLocation(program, "u_tint"), params.white_balance.tint);
  gl.uniform1f(gl.getUniformLocation(program, "u_exposure"), params.exposure_contrast_saturation.exposure);
  gl.uniform1f(gl.getUniformLocation(program, "u_contrast"), params.exposure_contrast_saturation.contrast);
  gl.uniform1f(gl.getUniformLocation(program, "u_saturation"), params.exposure_contrast_saturation.saturation);
  gl.uniform1f(gl.getUniformLocation(program, "u_vibrance"), params.exposure_contrast_saturation.vibrance);
  gl.uniform1f(gl.getUniformLocation(program, "u_hue_shift"), params.exposure_contrast_saturation.hue_shift);
  gl.uniform1f(gl.getUniformLocation(program, "u_shadows"), params.shadows_highlights.shadows);
  gl.uniform1f(gl.getUniformLocation(program, "u_highlights"), params.shadows_highlights.highlights);
  gl.uniform1f(gl.getUniformLocation(program, "u_lift"), params.lift_gamma_gain.lift);
  gl.uniform1f(gl.getUniformLocation(program, "u_gamma"), params.lift_gamma_gain.gamma);
  gl.uniform1f(gl.getUniformLocation(program, "u_gain"), params.lift_gamma_gain.gain);
  gl.uniform1f(gl.getUniformLocation(program, "u_chromatic_aberration"), params.chromatic_aberration);
  gl.uniform1f(gl.getUniformLocation(program, "u_grain_intensity"), params.film_grain);
  gl.uniform1f(gl.getUniformLocation(program, "u_sharpen_intensity"), params.sharpen);
  gl.uniform1f(gl.getUniformLocation(program, "u_vignette_intensity"), params.vignette_intensity);
  gl.uniform1f(gl.getUniformLocation(program, "u_bloom_intensity"), params.bloom.intensity);
  gl.uniform1f(gl.getUniformLocation(program, "u_bloom_threshold"), params.bloom.threshold);
  gl.uniform1f(gl.getUniformLocation(program, "u_bloom_radius"), params.bloom.radius);
  gl.uniform1f(gl.getUniformLocation(program, "u_overall_strength"), overallStrength.value);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  computeClientHistogram();
}

function computeClientHistogram() {
  const gl = webglContext;
  const canvas = canvasAfter.value;
  if (!gl || !canvas) return;

  const rw = Math.min(128, canvas.width);
  const rh = Math.min(128, canvas.height);
  const pixels = new Uint8Array(rw * rh * 4);
  gl.readPixels(0, 0, rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  const rHist = new Array<number>(256).fill(0);
  const gHist = new Array<number>(256).fill(0);
  const bHist = new Array<number>(256).fill(0);
  const lumHist = new Array<number>(256).fill(0);

  const total = rw * rh;
  for (let i = 0; i < total; i++) {
    const r = pixels[i * 4 + 0];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const lum = Math.min(255, Math.max(0, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)));
    rHist[r]++;
    gHist[g]++;
    bHist[b]++;
    lumHist[lum]++;
  }

  const norm = 1.0 / Math.max(1, total);
  for (let i = 0; i < 256; i++) {
    histogramData.r[i] = rHist[i] * norm;
    histogramData.g[i] = gHist[i] * norm;
    histogramData.b[i] = bHist[i] * norm;
    histogramData.lum[i] = lumHist[i] * norm;
  }
}

function getHistogramPath(channel: "r" | "g" | "b" | "lum"): string {
  const hist = histogramData[channel];
  const maxVal = Math.max(...hist, 0.001);
  let d = "M 0 90";
  for (let i = 0; i < 256; i++) {
    const y = 90 - (hist[i] / maxVal) * 82;
    d += ` L ${i} ${y.toFixed(1)}`;
  }
  d += " L 255 90 Z";
  return d;
}

function requestDraw() {
  if (!editorOpen.value) return;
  if (animFrameId) return;
  animFrameId = requestAnimationFrame(() => {
    animFrameId = 0;
    renderWebGL();
  });
}

// ---------------------------------------------------------------------------
// State Serialization & Presets
// ---------------------------------------------------------------------------

function hydrateState(raw: unknown) {
  if (!raw) return;
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") return;

    if (data.curves) {
      for (const ch of CURVE_CHANNELS) {
        if (Array.isArray(data.curves[ch]) && data.curves[ch].length >= 2) {
          params.curves[ch] = data.curves[ch].map((p: any) => [Number(p[0]) || 0, Number(p[1]) || 0]);
        } else {
          params.curves[ch] = [[0.0, 0.0], [1.0, 1.0]];
        }
      }
    }

    if (data.white_balance) {
      params.white_balance.temperature = Number(data.white_balance.temperature ?? 0);
      params.white_balance.tint = Number(data.white_balance.tint ?? 0);
    }

    if (data.exposure_contrast_saturation) {
      const e = data.exposure_contrast_saturation;
      params.exposure_contrast_saturation.exposure = Number(e.exposure ?? 0);
      params.exposure_contrast_saturation.contrast = Number(e.contrast ?? 1);
      params.exposure_contrast_saturation.saturation = Number(e.saturation ?? 1);
      params.exposure_contrast_saturation.vibrance = Number(e.vibrance ?? 0);
      params.exposure_contrast_saturation.hue_shift = Number(e.hue_shift ?? 0);
    }

    if (data.shadows_highlights) {
      params.shadows_highlights.shadows = Number(data.shadows_highlights.shadows ?? 0);
      params.shadows_highlights.highlights = Number(data.shadows_highlights.highlights ?? 0);
    }

    if (data.lift_gamma_gain) {
      params.lift_gamma_gain.lift = Number(data.lift_gamma_gain.lift ?? 0);
      params.lift_gamma_gain.gamma = Number(data.lift_gamma_gain.gamma ?? 1);
      params.lift_gamma_gain.gain = Number(data.lift_gamma_gain.gain ?? 1);
    }

    if (data.gradient_map) {
      params.gradient_map.enabled = Boolean(data.gradient_map.enabled);
      params.gradient_map.blending_mode = data.gradient_map.blending_mode || "Normal";
      params.gradient_map.opacity = Number(data.gradient_map.opacity ?? 1);
      if (Array.isArray(data.gradient_map.stops) && data.gradient_map.stops.length >= 2) {
        params.gradient_map.stops = data.gradient_map.stops.map((s: any) => ({
          offset: Number(s.offset ?? 0),
          color: String(s.color ?? "#ffffff"),
        }));
      }
    }

    if (data.bloom) {
      params.bloom.intensity = Number(data.bloom.intensity ?? 0);
      params.bloom.threshold = Number(data.bloom.threshold ?? 0.8);
      params.bloom.radius = Number(data.bloom.radius ?? 2);
    }

    params.chromatic_aberration = Number(data.chromatic_aberration ?? 0);
    params.sharpen = Number(data.sharpen ?? 0);
    params.vignette_intensity = Number(data.vignette_intensity ?? 0);
    params.film_grain = Number(data.film_grain ?? 0);

    recalculateLuts();
    requestDraw();
  } catch (err) {
    console.warn("[Duffy Grading] Could not parse state:", err);
  }
}

function serializeParams(): GradingPayload {
  return {
    version: 1,
    curves: {
      rgb: params.curves.rgb.map(([x, y]) => [x, y]),
      r: params.curves.r.map(([x, y]) => [x, y]),
      g: params.curves.g.map(([x, y]) => [x, y]),
      b: params.curves.b.map(([x, y]) => [x, y]),
    },
    white_balance: { ...params.white_balance },
    exposure_contrast_saturation: { ...params.exposure_contrast_saturation },
    shadows_highlights: { ...params.shadows_highlights },
    lift_gamma_gain: { ...params.lift_gamma_gain },
    gradient_map: {
      enabled: params.gradient_map.enabled,
      blending_mode: params.gradient_map.blending_mode,
      opacity: params.gradient_map.opacity,
      stops: params.gradient_map.stops.map((s) => ({ ...s })),
    },
    bloom: { ...params.bloom },
    chromatic_aberration: params.chromatic_aberration,
    sharpen: params.sharpen,
    vignette_intensity: params.vignette_intensity,
    film_grain: params.film_grain,
    overall_strength: overallStrength.value,
    ...(session.value?.inputSignature ? { input_signature: session.value.inputSignature } : {}),
  };
}

function onParamChange() {
  selectedPreset.value = "custom";
  props.onStateChange?.(JSON.stringify(serializeParams()));
  requestDraw();
}

function onStrengthInput(rawVal: string) {
  const num = Math.max(0, Math.min(1, Number(rawVal) || 0));
  overallStrength.value = num;
  props.onStrengthChange?.(num);
  props.onStateChange?.(JSON.stringify(serializeParams()));
  requestDraw();
}

function resetAll() {
  hydrateState(DEFAULT_PAYLOAD());
  selectedPreset.value = "neutral";
  selectedKnotIndex.value = null;
  activeStopIndex.value = null;
  liveCardDataUrl.value = "";
  props.onStateChange?.(JSON.stringify(serializeParams()));
  requestDraw();
}

function applyPreset(presetId: string) {
  const next = DEFAULT_PAYLOAD();
  switch (presetId) {
    case "neutral":
      break;
    case "teal_orange":
      next.exposure_contrast_saturation.contrast = 1.15;
      next.exposure_contrast_saturation.vibrance = 0.25;
      next.curves.r = [[0, 0], [0.25, 0.20], [0.75, 0.82], [1, 1]];
      next.curves.b = [[0, 0.06], [0.3, 0.36], [0.75, 0.68], [1, 0.92]];
      next.gradient_map = {
        enabled: true,
        blending_mode: "Soft Light",
        opacity: 0.35,
        stops: [
          { offset: 0.0, color: "#0d3b4c" },
          { offset: 0.6, color: "#d97736" },
          { offset: 1.0, color: "#f3c7" } as any,
        ],
      };
      next.gradient_map.stops[2].color = "#fef3c7";
      next.vignette_intensity = 0.25;
      break;
    case "golden_hour":
      next.white_balance.temperature = 0.35;
      next.white_balance.tint = 0.08;
      next.exposure_contrast_saturation.exposure = 0.12;
      next.exposure_contrast_saturation.saturation = 1.18;
      next.shadows_highlights.shadows = 0.15;
      next.bloom = { intensity: 0.35, threshold: 0.72, radius: 3.0 };
      break;
    case "bleach_bypass":
      next.exposure_contrast_saturation.contrast = 1.45;
      next.exposure_contrast_saturation.saturation = 0.42;
      next.sharpen = 0.35;
      next.film_grain = 0.025;
      next.vignette_intensity = 0.35;
      break;
    case "kodachrome":
      next.white_balance.temperature = 0.15;
      next.exposure_contrast_saturation.contrast = 1.2;
      next.exposure_contrast_saturation.vibrance = 0.3;
      next.lift_gamma_gain = { lift: 0.02, gamma: 0.95, gain: 1.05 };
      next.curves.rgb = [[0, 0.03], [0.25, 0.21], [0.78, 0.84], [1, 0.98]];
      next.film_grain = 0.018;
      break;
    case "noir":
      next.exposure_contrast_saturation.saturation = 0.0;
      next.exposure_contrast_saturation.contrast = 1.5;
      next.shadows_highlights.shadows = -0.15;
      next.shadows_highlights.highlights = 0.2;
      next.curves.rgb = [[0, 0], [0.2, 0.12], [0.8, 0.88], [1, 1]];
      next.vignette_intensity = 0.45;
      next.film_grain = 0.03;
      break;
    case "cyberpunk":
      next.white_balance.temperature = -0.25;
      next.white_balance.tint = 0.35;
      next.exposure_contrast_saturation.contrast = 1.22;
      next.exposure_contrast_saturation.vibrance = 0.4;
      next.gradient_map = {
        enabled: true,
        blending_mode: "Overlay",
        opacity: 0.4,
        stops: [
          { offset: 0.0, color: "#0b0726" },
          { offset: 0.5, color: "#9d174d" },
          { offset: 1.0, color: "#22d3ee" },
        ],
      };
      next.bloom = { intensity: 0.45, threshold: 0.68, radius: 3.5 };
      next.chromatic_aberration = 0.008;
      break;
    default:
      return;
  }
  hydrateState(next);
  selectedPreset.value = presetId;
  props.onStateChange?.(JSON.stringify(serializeParams()));
}

// ---------------------------------------------------------------------------
// Editor Modal Open / Close & Pan / Zoom
// ---------------------------------------------------------------------------

function openEditor() {
  editorOpen.value = true;
  nextTick(() => {
    measureStudioViewport();
    if (studioViewportRef.value && !studioResizeObserver) {
      studioResizeObserver = new ResizeObserver(() => measureStudioViewport());
      studioResizeObserver.observe(studioViewportRef.value);
    }
    initWebGL();
    requestDraw();
  });
}

function closeEditor() {
  // Capture a snapshot from the WebGL2 canvas so the compact node card shows the live graded preview
  if (webglReady && canvasAfter.value && !isIdentity.value) {
    try {
      liveCardDataUrl.value = canvasAfter.value.toDataURL("image/jpeg", 0.88);
    } catch {
      /* ignore cross-origin or context errors */
    }
  } else if (isIdentity.value) {
    liveCardDataUrl.value = "";
  }
  studioResizeObserver?.disconnect();
  studioResizeObserver = null;
  editorOpen.value = false;
}

function measureStudioViewport() {
  const el = studioViewportRef.value;
  if (!el) return;
  studioViewportSize.w = el.clientWidth;
  studioViewportSize.h = el.clientHeight;
}

function resetStudioView() {
  viewZoom.value = 1;
  viewPan.value = [0, 0];
}

function onStudioWheel(ev: WheelEvent) {
  const factor = ev.deltaY < 0 ? 1.15 : 1 / 1.15;
  const next = Math.max(0.5, Math.min(12, viewZoom.value * factor));
  viewZoom.value = next;
  if (Math.abs(next - 1) < 0.02) {
    viewZoom.value = 1;
    viewPan.value = [0, 0];
  }
}

function onStudioViewportDown(ev: PointerEvent) {
  if ((ev.button === 0 && ev.altKey) || ev.button === 1) {
    ev.preventDefault();
    panDrag = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      pan0: [viewPan.value[0], viewPan.value[1]],
    };
    isPanning.value = true;
    try {
      studioViewportRef.value?.setPointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
  }
}

function onStudioPointerMove(ev: PointerEvent) {
  if (!panDrag || ev.pointerId !== panDrag.pointerId) return;
  viewPan.value = [
    panDrag.pan0[0] + (ev.clientX - panDrag.startX),
    panDrag.pan0[1] + (ev.clientY - panDrag.startY),
  ];
}

function onStudioPointerUp(ev: PointerEvent) {
  if (!panDrag || ev.pointerId !== panDrag.pointerId) return;
  try {
    studioViewportRef.value?.releasePointerCapture(ev.pointerId);
  } catch {
    /* ignore */
  }
  panDrag = null;
  isPanning.value = false;
}

// ---------------------------------------------------------------------------
// Wipe Splitter, Curves & Gradient Stop Interactions
// ---------------------------------------------------------------------------

function onStagePointerDown(ev: PointerEvent) {
  if (ev.button === 0 && !ev.altKey) {
    startWipeDrag(ev);
  }
}

function startWipeDrag(ev: PointerEvent) {
  if (ev.button !== 0) return;
  ev.preventDefault();
  ev.stopPropagation();
  cleanupWipeListeners?.();

  const updateFromClientX = (clientX: number) => {
    const el = wipeContainer.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    wipePercentage.value = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  };

  updateFromClientX(ev.clientX);

  const onMove = (moveEv: PointerEvent) => updateFromClientX(moveEv.clientX);
  const onUp = () => {
    cleanupWipeListeners?.();
    cleanupWipeListeners = null;
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  cleanupWipeListeners = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
}

function getMouseSvgCoord(e: MouseEvent): [number, number] | null {
  const svg = curveSvg.value;
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = 1.0 - (e.clientY - rect.top) / rect.height;
  return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
}

function onCurveMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  e.stopPropagation();
  const coord = getMouseSvgCoord(e);
  if (!coord) return;

  const p = params.curves[activeChannel.value];
  const threshold = 0.05;
  let foundIdx = -1;
  for (let i = 0; i < p.length; i++) {
    const dx = p[i][0] - coord[0];
    const dy = p[i][1] - coord[1];
    if (Math.sqrt(dx * dx + dy * dy) < threshold) {
      foundIdx = i;
      break;
    }
  }

  if (foundIdx !== -1) {
    selectedKnotIndex.value = foundIdx;
    isDraggingKnot.value = true;
  } else {
    p.push(coord);
    p.sort((a, b) => a[0] - b[0]);
    selectedKnotIndex.value = p.findIndex((pt) => pt[0] === coord[0] && pt[1] === coord[1]);
    isDraggingKnot.value = true;
    onParamChange();
  }
}

function onCurveMouseMove(e: MouseEvent) {
  const coord = getMouseSvgCoord(e);
  if (!coord) return;
  const p = params.curves[activeChannel.value];
  const lut = interpolateMonotoneCubic(p);
  hoverCoord.value = [coord[0], lut[Math.round(coord[0] * 255)]];

  if (selectedKnotIndex.value === null || !isDraggingKnot.value) return;
  if ((e.buttons & 1) !== 1) {
    isDraggingKnot.value = false;
    return;
  }

  const idx = selectedKnotIndex.value;
  const pt = p[idx];
  if (idx === 0 || idx === p.length - 1) {
    pt[1] = coord[1];
  } else {
    const minX = p[idx - 1][0] + 0.005;
    const maxX = p[idx + 1][0] - 0.005;
    pt[0] = Math.max(minX, Math.min(maxX, coord[0]));
    pt[1] = coord[1];
  }
  onParamChange();
}

function onCurveMouseUp() {
  isDraggingKnot.value = false;
}

function onCurveMouseLeave() {
  isDraggingKnot.value = false;
  hoverCoord.value = null;
}

function selectKnot(idx: number, e: MouseEvent) {
  if (e.button !== 0) return;
  selectedKnotIndex.value = idx;
  isDraggingKnot.value = true;
}

const canRemoveSelectedKnot = computed(() => {
  const p = params.curves[activeChannel.value];
  const idx = selectedKnotIndex.value;
  return idx !== null && p.length > 2 && idx > 0 && idx < p.length - 1;
});

function removeKnot(idx: number) {
  const p = params.curves[activeChannel.value];
  if (p.length <= 2 || idx <= 0 || idx >= p.length - 1) return;
  p.splice(idx, 1);
  selectedKnotIndex.value = null;
  onParamChange();
}

function removeSelectedKnot() {
  if (selectedKnotIndex.value !== null) removeKnot(selectedKnotIndex.value);
}

function resetCurve(channel: CurveChannel) {
  params.curves[channel] = [[0.0, 0.0], [1.0, 1.0]];
  selectedKnotIndex.value = null;
  onParamChange();
}

function onGradientBarMouseDown(e: MouseEvent) {
  const bar = gradientBar.value;
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  const offset = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  params.gradient_map.stops.push({ offset, color: "#ffffff" });
  params.gradient_map.stops.sort((a, b) => a.offset - b.offset);
  activeStopIndex.value = params.gradient_map.stops.findIndex((s) => s.offset === offset);
  onParamChange();
}

function startStopDrag(idx: number, e: MouseEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  cleanupStopListeners?.();
  activeStopIndex.value = idx;

  const onMove = (moveEv: MouseEvent) => {
    const bar = gradientBar.value;
    if (!bar || activeStopIndex.value === null) return;
    const rect = bar.getBoundingClientRect();
    const offset = Math.max(0, Math.min(1, (moveEv.clientX - rect.left) / rect.width));
    params.gradient_map.stops[activeStopIndex.value].offset = offset;
    onParamChange();
  };

  const onUp = () => {
    params.gradient_map.stops.sort((a, b) => a.offset - b.offset);
    cleanupStopListeners?.();
    cleanupStopListeners = null;
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  cleanupStopListeners = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
}

function removeStop(idx: number) {
  if (params.gradient_map.stops.length <= 2) return;
  params.gradient_map.stops.splice(idx, 1);
  activeStopIndex.value = null;
  onParamChange();
}

function setStopOffset(idx: number, offset: number) {
  if (!Number.isFinite(offset)) return;
  const clamped = Math.max(0, Math.min(1, offset));
  params.gradient_map.stops[idx].offset = clamped;
  params.gradient_map.stops.sort((a, b) => a.offset - b.offset);
  activeStopIndex.value = params.gradient_map.stops.findIndex((s) => s.offset === clamped);
  onParamChange();
}

// ---------------------------------------------------------------------------
// Image & Session Loading
// ---------------------------------------------------------------------------

function loadProxyImage(url: string) {
  if (!url) return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    proxyImageElement = img;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      imageSize[0] = img.naturalWidth;
      imageSize[1] = img.naturalHeight;
    }
    if (editorOpen.value) {
      uploadCurrentImageToWebGL();
      requestDraw();
    }
  };
  img.src = url;
}

function matchesNode(nodeId: unknown): boolean {
  const own = props.getNodeId();
  const id = String(nodeId ?? "");
  return id === own || id.endsWith(`:${own}`);
}

function loadSession(payload: any) {
  if (!payload || !matchesNode(payload.node_id)) return;

  const [iw, ih] = Array.isArray(payload.image_size) ? payload.image_size : [1, 1];
  imageSize[0] = Math.max(1, Number(iw) || 1);
  imageSize[1] = Math.max(1, Number(ih) || 1);

  if (payload.params) {
    hydrateState(payload.params);
  }
  if (typeof payload.overall_strength === "number") {
    overallStrength.value = Math.max(0, Math.min(1, payload.overall_strength));
  }
  if (payload.histogram) {
    setBackendHistogram(payload.histogram);
  }

  const srcUrl = api.apiURL(String(payload.source_preview_url ?? ""));
  sourcePreviewUrl.value = srcUrl;
  processedPreviewUrl.value = "";
  liveCardDataUrl.value = "";
  loadProxyImage(srcUrl);

  session.value = {
    sessionId: String(payload.session_id),
    nodeId: String(payload.node_id),
    sourceUrl: srcUrl,
    inputSignature: String(payload.input_signature ?? ""),
  };
  statusMessage.value = "";
  // Per user preference: simply pause at the node without auto-opening the fullscreen modal.
  mode.value = "paused";
}

function endSession(note = "") {
  session.value = null;
  mode.value = "idle";
  statusMessage.value = note;
}

async function submitSession() {
  if (mode.value !== "paused" || !session.value) return;
  const current = session.value;
  const finalParams = serializeParams();
  mode.value = "submitting";
  statusMessage.value = "";

  try {
    const response = await api.fetchApi(RESUME_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: current.sessionId,
        node_id: current.nodeId,
        params: finalParams,
      }),
    });
    if (response.ok) {
      props.onStateChange?.(JSON.stringify(finalParams));
      if (editorOpen.value) closeEditor();
      endSession();
      return;
    }
    const body = await response.json().catch(() => ({}));
    if (response.status === 404) {
      endSession("Session expired. Queue the workflow again.");
    } else {
      mode.value = "paused";
      statusMessage.value = String(body?.message ?? `Resume failed (${response.status})`);
    }
  } catch (err) {
    mode.value = "paused";
    statusMessage.value = "Network error while resuming.";
    console.error("[Duffy Grading] Resume failed", err);
  }
}

async function submitFromStudio() {
  await submitSession();
}

async function rehydrate() {
  if (session.value) return;
  try {
    const response = await api.fetchApi(PENDING_ROUTE);
    if (!response.ok) return;
    const body = await response.json();
    const match = (body?.sessions ?? []).find((s: any) => matchesNode(s?.node_id));
    if (match) loadSession(match);
  } catch {
    /* server not ready yet */
  }
}

// ---------------------------------------------------------------------------
// Keyboard Shortcuts & External Hooks
// ---------------------------------------------------------------------------

function onCardKeyDown(ev: KeyboardEvent) {
  if (ev.key === "Enter" && mode.value === "paused" && !editorOpen.value) {
    ev.preventDefault();
    ev.stopPropagation();
    submitSession();
  }
}

function onModalKeyDown(ev: KeyboardEvent) {
  if (ev.key === "Escape") {
    ev.preventDefault();
    closeEditor();
  } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey) && mode.value === "paused") {
    ev.preventDefault();
    submitFromStudio();
  } else if (ev.key === "\\") {
    holdOriginal.value = !holdOriginal.value;
  }
}

function setBackendHistogram(backendHist: any) {
  if (!backendHist) return;
  const maxLum = Math.max(...(backendHist.lum || [1]), 1);
  const scale = 1.0 / maxLum;
  for (let i = 0; i < 256; i++) {
    histogramData.r[i] = (backendHist.r?.[i] || 0) * scale;
    histogramData.g[i] = (backendHist.g?.[i] || 0) * scale;
    histogramData.b[i] = (backendHist.b?.[i] || 0) * scale;
    histogramData.lum[i] = (backendHist.lum?.[i] || 0) * scale;
  }
}

function buildViewUrl(info: any): string {
  if (!info || !info.filename) return "";
  const q = new URLSearchParams({
    filename: String(info.filename),
    subfolder: String(info.subfolder ?? ""),
    type: String(info.type ?? "temp"),
    rand: String(Math.random()).slice(2, 10),
  });
  return api.apiURL(`/view?${q.toString()}`);
}

function setExecutionResult(payload: {
  originalThumb?: any;
  processedThumb?: any;
  histogram?: any;
  savedState?: string;
}) {
  if (payload.originalThumb) {
    const url = buildViewUrl(payload.originalThumb);
    if (url) {
      sourcePreviewUrl.value = url;
      loadProxyImage(url);
    }
  }
  if (payload.processedThumb) {
    const url = buildViewUrl(payload.processedThumb);
    if (url) {
      processedPreviewUrl.value = url;
      liveCardDataUrl.value = "";
    }
  }
  if (payload.histogram) {
    setBackendHistogram(payload.histogram);
  }
  if (payload.savedState) {
    hydrateState(payload.savedState);
  }
}

function setOverallStrength(val: number) {
  if (Number.isFinite(val)) {
    overallStrength.value = Math.max(0, Math.min(1, val));
    requestDraw();
  }
}

function onPauseEvent(event: any) {
  loadSession(event?.detail);
}

function onExecutionStopped() {
  if (mode.value !== "idle") endSession("Execution cancelled.");
}

function onReconnected() {
  rehydrate();
}

function cleanup() {
  api.removeEventListener(PAUSE_EVENT, onPauseEvent);
  api.removeEventListener("execution_interrupted", onExecutionStopped);
  api.removeEventListener("execution_error", onExecutionStopped);
  api.removeEventListener("reconnected", onReconnected);
  studioResizeObserver?.disconnect();
  studioResizeObserver = null;
  cleanupWipeListeners?.();
  cleanupStopListeners?.();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = 0;
  if (rehydrateTimer) clearTimeout(rehydrateTimer);
  rehydrateTimer = null;
}

watch(editorOpen, (open) => {
  if (open) requestDraw();
});

onMounted(() => {
  if (props.initialParams) {
    hydrateState(props.initialParams);
  }
  api.addEventListener(PAUSE_EVENT, onPauseEvent);
  api.addEventListener("execution_interrupted", onExecutionStopped);
  api.addEventListener("execution_error", onExecutionStopped);
  api.addEventListener("reconnected", onReconnected);
  rehydrateTimer = setTimeout(rehydrate, 400);
});

onUnmounted(cleanup);

defineExpose({
  hydrateState,
  setExecutionResult,
  setOverallStrength,
  openEditor,
  closeEditor,
  cleanup,
});
</script>

<style scoped>
/* =========================================================================
   Compact Node Card Styles
   ========================================================================= */
.rtg-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: var(--comfy-menu-bg, #1c1d22);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  color: var(--fg-color, #e5e7eb);
  font: 12px/1.35 system-ui, -apple-system, sans-serif;
  user-select: none;
  outline: none;
}

.rtg-card-viewport {
  position: relative;
  flex: 1 1 auto;
  min-height: 180px;
  background: repeating-conic-gradient(#25262c 0% 25%, #1e1f24 0% 50%) 50% / 16px 16px;
  overflow: hidden;
}

.rtg-card-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.rtg-card-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px;
  text-align: center;
  color: rgba(255, 255, 255, 0.65);
}

.rtg-card-empty-title {
  font-size: 13px;
  font-weight: 600;
  color: #f3f4f6;
}

.rtg-card-empty-sub {
  font-size: 11px;
  max-width: 280px;
  opacity: 0.8;
}

.rtg-card-top-bar {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  pointer-events: none;
  z-index: 3;
}

.rtg-pill {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(96, 165, 250, 0.35);
  color: #93c5fd;
  backdrop-filter: blur(4px);
}

.rtg-pill-neutral {
  border-color: rgba(255, 255, 255, 0.14);
  color: #cbd5e1;
}

.rtg-dim-pill {
  border-color: rgba(255, 255, 255, 0.18);
  color: #e2e8f0;
}

.rtg-card-hud {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  background: rgba(15, 16, 20, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.rtg-badge {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: #32343d;
  color: #e2e8f0;
  white-space: nowrap;
}

.rtg-badge-paused {
  background: #d97706;
  color: #fff;
  animation: rtg-pulse 1.6s ease-in-out infinite;
}

.rtg-badge-submitting {
  background: #2563eb;
  color: #fff;
}

@keyframes rtg-pulse {
  50% {
    opacity: 0.72;
  }
}

.rtg-spacer {
  flex: 1 1 auto;
}

.rtg-btn {
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #2d3039;
  color: #f1f5f9;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.rtg-btn:hover:not(:disabled) {
  background: #3b3f4b;
  border-color: rgba(255, 255, 255, 0.28);
}

.rtg-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.rtg-btn-sm {
  padding: 3px 7px;
  font-size: 10px;
}

.rtg-btn-lg {
  padding: 6px 14px;
  font-size: 12px;
}

.rtg-btn-editor {
  background: #1e3a8a;
  border-color: #3b82f6;
  color: #eff6ff;
}

.rtg-btn-editor:hover:not(:disabled) {
  background: #1d4ed8;
}

.rtg-btn-continue {
  background: #15803d;
  border-color: #22c55e;
  color: #fff;
  font-weight: 700;
}

.rtg-btn-continue:hover:not(:disabled) {
  background: #16a34a;
}

.rtg-btn-danger {
  background: rgba(220, 38, 38, 0.18);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.rtg-btn-danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.3);
}

.rtg-btn-active {
  background: #2563eb;
  border-color: #60a5fa;
  color: #fff;
}

.rtg-card-msg {
  width: 100%;
  font-size: 11px;
  color: #fbbf24;
}

.rtg-busy {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 5;
}

.rtg-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #60a5fa;
  animation: rtg-spin 0.8s linear infinite;
}

@keyframes rtg-spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================================================================
   Full-Screen Studio Modal Styles (Teleported to body)
   ========================================================================= */
.rtg-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(9, 10, 14, 0.94);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  color: #e2e8f0;
  font: 12px/1.4 system-ui, -apple-system, sans-serif;
  user-select: none;
  outline: none;
}

.rtg-studio {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.rtg-studio-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 18px;
  background: #14161c;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.rtg-studio-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rtg-studio-title {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
}

.rtg-studio-sub,
.rtg-studio-res {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.rtg-studio-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rtg-toolbar-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.rtg-toolbar-label {
  font-size: 11px;
  color: #94a3b8;
}

.rtg-toolbar-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.rtg-select {
  background: #222530;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  color: #f1f5f9;
  padding: 4px 8px;
  font-size: 11px;
  outline: none;
}

.rtg-studio-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rtg-studio-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

/* Center Viewport */
.rtg-studio-viewport {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-conic-gradient(#181920 0% 25%, #121318 0% 50%) 50% / 20px 20px;
  overflow: hidden;
  touch-action: none;
}

.rtg-studio-viewport.rtg-panning {
  cursor: grabbing;
}

.rtg-stage-wrap {
  position: relative;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.75);
  border-radius: 4px;
  overflow: hidden;
  transform-origin: center center;
}

.rtg-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.rtg-canvas-before {
  z-index: 1;
}

.rtg-canvas-after {
  z-index: 2;
}

.rtg-wipe-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 24px;
  transform: translateX(-50%);
  z-index: 4;
  cursor: ew-resize;
}

.rtg-wipe-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.8);
}

.rtg-wipe-thumb {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #2563eb;
  border: 2px solid #fff;
  color: #fff;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
}

.rtg-wipe-tag {
  position: absolute;
  top: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.65);
  color: #e2e8f0;
  font-size: 10px;
  font-weight: 600;
  z-index: 3;
  pointer-events: none;
}

.rtg-tag-before {
  left: 10px;
}

.rtg-tag-after {
  right: 10px;
}

.rtg-viewport-footer {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(15, 17, 23, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 11px;
  pointer-events: none;
}

/* Right Inspector Dock */
.rtg-inspector {
  flex: 0 0 400px;
  width: 400px;
  background: #161820;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.rtg-hist-box {
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.rtg-hist-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.rtg-hist-sub {
  color: #64748b;
  font-weight: 400;
}

.rtg-hist-svg {
  width: 100%;
  height: 68px;
  background: #0e1015;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.rtg-hist-path {
  stroke-width: 1.2;
  vector-effect: non-scaling-stroke;
}

.rtg-hist-r { stroke: rgba(239, 68, 68, 0.65); fill: rgba(239, 68, 68, 0.08); }
.rtg-hist-g { stroke: rgba(34, 197, 94, 0.65); fill: rgba(34, 197, 94, 0.08); }
.rtg-hist-b { stroke: rgba(59, 130, 246, 0.65); fill: rgba(59, 130, 246, 0.08); }
.rtg-hist-lum { stroke: rgba(248, 250, 252, 0.45); fill: rgba(248, 250, 252, 0.04); }

.rtg-master-row {
  padding: 10px 14px;
  background: rgba(30, 41, 59, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.rtg-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #11131a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.rtg-tab-btn {
  padding: 9px 4px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.rtg-tab-btn:hover {
  color: #e2e8f0;
}

.rtg-tab-btn.active {
  color: #60a5fa;
  border-bottom-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.rtg-tab-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px;
}

.rtg-panel-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rtg-group-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rtg-group-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #93c5fd;
}

.rtg-row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rtg-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rtg-slider-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rtg-slider-label {
  font-size: 11px;
  color: #cbd5e1;
}

.rtg-slider-val {
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: #60a5fa;
}

.rtg-range {
  width: 100%;
  accent-color: #3b82f6;
  cursor: pointer;
}

/* Curves Tab */
.rtg-channel-bar {
  display: flex;
  align-items: center;
  gap: 5px;
}

.rtg-ch-btn {
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.rtg-ch-btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.rtg-ch-r.active { border-color: #ef4444; color: #f87171; }
.rtg-ch-g.active { border-color: #22c55e; color: #4ade80; }
.rtg-ch-b.active { border-color: #3b82f6; color: #60a5fa; }

.rtg-curve-box {
  width: 100%;
  aspect-ratio: 1;
  background: #0e1015;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
}

.rtg-curve-svg {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.rtg-grid-line {
  stroke: rgba(255, 255, 255, 0.06);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}

.rtg-diag-line {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 1;
}

.rtg-curve-inactive {
  fill: none;
  stroke-width: 1.5;
  opacity: 0.3;
}

.rtg-curve-active {
  fill: none;
  stroke-width: 2.5;
}

.rtg-stroke-rgb { stroke: #f8fafc; }
.rtg-stroke-r { stroke: #ef4444; }
.rtg-stroke-g { stroke: #22c55e; }
.rtg-stroke-b { stroke: #3b82f6; }

.rtg-knot {
  fill: #1e293b;
  stroke-width: 2;
  cursor: grab;
}

.rtg-knot.selected {
  r: 8px;
  cursor: grabbing;
}

.rtg-curve-coord {
  fill: #94a3b8;
  font-size: 10px;
  font-family: ui-monospace, monospace;
}

.rtg-curve-hint {
  font-size: 11px;
  color: #64748b;
}

/* Gradient Map Tab */
.rtg-grad-bar {
  position: relative;
  height: 26px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  margin: 8px 0 14px;
  cursor: copy;
}

.rtg-grad-stop {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 14px;
  transform: translateX(-50%);
  cursor: ew-resize;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.rtg-grad-pin {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.6);
}

.rtg-grad-stop.active .rtg-grad-pin {
  transform: scale(1.2);
  border-color: #60a5fa;
}

.rtg-stop-editor {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
}

.rtg-stop-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.rtg-num-input {
  width: 56px;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #1e2029;
  color: #fff;
}

.rtg-color-input {
  width: 32px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.rtg-switch-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  cursor: pointer;
}
</style>
