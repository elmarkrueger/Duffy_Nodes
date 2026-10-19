import { d as defineComponent, b as ref, G as reactive, D as watch, f as onMounted, g as onUnmounted, o as openBlock, c as createElementBlock, a as createBaseVNode, F as Fragment, i as createCommentVNode, t as toDisplayString, r as renderList, n as normalizeClass, k as withModifiers, E as createBlock, w as withDirectives, p as vModelSelect, m as normalizeStyle, J as vShow, v as vModelText, I as vModelCheckbox, T as Teleport, l as computed, j as nextTick, _ as _export_sfc, e as createApp } from "./_plugin-vue_export-helper-Bcfa1sBX.js";
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
const _hoisted_1 = { class: "rtg-card-viewport" };
const _hoisted_2 = ["src"];
const _hoisted_3 = ["src"];
const _hoisted_4 = {
  key: 1,
  class: "rtg-card-empty"
};
const _hoisted_5 = { class: "rtg-card-top-bar" };
const _hoisted_6 = {
  key: 0,
  class: "rtg-pill rtg-dim-pill"
};
const _hoisted_7 = {
  key: 2,
  class: "rtg-busy"
};
const _hoisted_8 = { class: "rtg-card-hud" };
const _hoisted_9 = ["disabled"];
const _hoisted_10 = ["disabled"];
const _hoisted_11 = {
  key: 1,
  class: "rtg-card-msg"
};
const _hoisted_12 = { class: "rtg-studio" };
const _hoisted_13 = { class: "rtg-studio-header" };
const _hoisted_14 = { class: "rtg-studio-brand" };
const _hoisted_15 = { class: "rtg-studio-sub" };
const _hoisted_16 = {
  key: 0,
  class: "rtg-studio-res"
};
const _hoisted_17 = {
  key: 1,
  class: "rtg-badge rtg-badge-paused"
};
const _hoisted_18 = { class: "rtg-studio-toolbar" };
const _hoisted_19 = { class: "rtg-toolbar-group" };
const _hoisted_20 = ["value"];
const _hoisted_21 = ["disabled"];
const _hoisted_22 = { class: "rtg-studio-actions" };
const _hoisted_23 = ["disabled"];
const _hoisted_24 = ["disabled"];
const _hoisted_25 = { class: "rtg-studio-body" };
const _hoisted_26 = { class: "rtg-wipe-tag rtg-tag-after" };
const _hoisted_27 = { class: "rtg-inspector" };
const _hoisted_28 = { class: "rtg-hist-box" };
const _hoisted_29 = {
  class: "rtg-hist-svg",
  viewBox: "0 0 256 90",
  preserveAspectRatio: "none"
};
const _hoisted_30 = ["d"];
const _hoisted_31 = ["d"];
const _hoisted_32 = ["d"];
const _hoisted_33 = ["d"];
const _hoisted_34 = { class: "rtg-master-row" };
const _hoisted_35 = { class: "rtg-slider-head" };
const _hoisted_36 = { class: "rtg-slider-val" };
const _hoisted_37 = ["value"];
const _hoisted_38 = { class: "rtg-tabs" };
const _hoisted_39 = ["onClick"];
const _hoisted_40 = { class: "rtg-tab-content" };
const _hoisted_41 = {
  key: 0,
  class: "rtg-panel-stack"
};
const _hoisted_42 = { class: "rtg-group-card" };
const _hoisted_43 = { class: "rtg-control" };
const _hoisted_44 = { class: "rtg-slider-head" };
const _hoisted_45 = { class: "rtg-slider-val" };
const _hoisted_46 = { class: "rtg-control" };
const _hoisted_47 = { class: "rtg-slider-head" };
const _hoisted_48 = { class: "rtg-slider-val" };
const _hoisted_49 = { class: "rtg-group-card" };
const _hoisted_50 = { class: "rtg-control" };
const _hoisted_51 = { class: "rtg-slider-head" };
const _hoisted_52 = { class: "rtg-slider-val" };
const _hoisted_53 = { class: "rtg-control" };
const _hoisted_54 = { class: "rtg-slider-head" };
const _hoisted_55 = { class: "rtg-slider-val" };
const _hoisted_56 = { class: "rtg-control" };
const _hoisted_57 = { class: "rtg-slider-head" };
const _hoisted_58 = { class: "rtg-slider-val" };
const _hoisted_59 = { class: "rtg-control" };
const _hoisted_60 = { class: "rtg-slider-head" };
const _hoisted_61 = { class: "rtg-slider-val" };
const _hoisted_62 = { class: "rtg-control" };
const _hoisted_63 = { class: "rtg-slider-head" };
const _hoisted_64 = { class: "rtg-slider-val" };
const _hoisted_65 = { class: "rtg-group-card" };
const _hoisted_66 = { class: "rtg-control" };
const _hoisted_67 = { class: "rtg-slider-head" };
const _hoisted_68 = { class: "rtg-slider-val" };
const _hoisted_69 = { class: "rtg-control" };
const _hoisted_70 = { class: "rtg-slider-head" };
const _hoisted_71 = { class: "rtg-slider-val" };
const _hoisted_72 = { class: "rtg-group-card" };
const _hoisted_73 = { class: "rtg-control" };
const _hoisted_74 = { class: "rtg-slider-head" };
const _hoisted_75 = { class: "rtg-slider-val" };
const _hoisted_76 = { class: "rtg-control" };
const _hoisted_77 = { class: "rtg-slider-head" };
const _hoisted_78 = { class: "rtg-slider-val" };
const _hoisted_79 = { class: "rtg-control" };
const _hoisted_80 = { class: "rtg-slider-head" };
const _hoisted_81 = { class: "rtg-slider-val" };
const _hoisted_82 = {
  key: 1,
  class: "rtg-panel-stack"
};
const _hoisted_83 = { class: "rtg-group-card" };
const _hoisted_84 = { class: "rtg-channel-bar" };
const _hoisted_85 = ["onClick"];
const _hoisted_86 = ["disabled"];
const _hoisted_87 = { class: "rtg-curve-box" };
const _hoisted_88 = ["d"];
const _hoisted_89 = ["d"];
const _hoisted_90 = ["cx", "cy", "onMousedown", "onDblclick"];
const _hoisted_91 = {
  key: 0,
  x: "10",
  y: "18",
  class: "rtg-curve-coord"
};
const _hoisted_92 = {
  key: 2,
  class: "rtg-panel-stack"
};
const _hoisted_93 = { class: "rtg-group-card" };
const _hoisted_94 = { class: "rtg-row-between" };
const _hoisted_95 = { class: "rtg-switch-label" };
const _hoisted_96 = { class: "rtg-control" };
const _hoisted_97 = ["value"];
const _hoisted_98 = { class: "rtg-control" };
const _hoisted_99 = { class: "rtg-slider-head" };
const _hoisted_100 = { class: "rtg-slider-val" };
const _hoisted_101 = { class: "rtg-control" };
const _hoisted_102 = ["onMousedown", "onDblclick"];
const _hoisted_103 = {
  key: 0,
  class: "rtg-stop-editor"
};
const _hoisted_104 = { class: "rtg-slider-label" };
const _hoisted_105 = { class: "rtg-stop-field" };
const _hoisted_106 = ["value"];
const _hoisted_107 = { class: "rtg-stop-field" };
const _hoisted_108 = {
  key: 3,
  class: "rtg-panel-stack"
};
const _hoisted_109 = { class: "rtg-group-card" };
const _hoisted_110 = { class: "rtg-control" };
const _hoisted_111 = { class: "rtg-slider-head" };
const _hoisted_112 = { class: "rtg-slider-val" };
const _hoisted_113 = { class: "rtg-control" };
const _hoisted_114 = { class: "rtg-slider-head" };
const _hoisted_115 = { class: "rtg-slider-val" };
const _hoisted_116 = { class: "rtg-control" };
const _hoisted_117 = { class: "rtg-slider-head" };
const _hoisted_118 = { class: "rtg-slider-val" };
const _hoisted_119 = { class: "rtg-control" };
const _hoisted_120 = { class: "rtg-slider-head" };
const _hoisted_121 = { class: "rtg-slider-val" };
const _hoisted_122 = { class: "rtg-group-card" };
const _hoisted_123 = { class: "rtg-control" };
const _hoisted_124 = { class: "rtg-slider-head" };
const _hoisted_125 = { class: "rtg-slider-val" };
const _hoisted_126 = { class: "rtg-control" };
const _hoisted_127 = { class: "rtg-slider-head" };
const _hoisted_128 = { class: "rtg-slider-val" };
const _hoisted_129 = { class: "rtg-control" };
const _hoisted_130 = { class: "rtg-slider-head" };
const _hoisted_131 = { class: "rtg-slider-val" };
const PAUSE_EVENT = "duffy-grading-pause";
const RESUME_ROUTE = "/duffy/grading/resume";
const PENDING_ROUTE = "/duffy/grading/pending";
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
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "RealTimeGradingProcessor",
  props: {
    getNodeId: { type: Function },
    initialParams: {},
    getOverallStrength: { type: Function },
    onStateChange: { type: Function },
    onStrengthChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    var _a;
    const CURVE_CHANNELS = ["rgb", "r", "g", "b"];
    const DEFAULT_PAYLOAD = () => ({
      version: 1,
      curves: {
        rgb: [[0, 0], [1, 1]],
        r: [[0, 0], [1, 1]],
        g: [[0, 0], [1, 1]],
        b: [[0, 0], [1, 1]]
      },
      white_balance: {
        temperature: 0,
        tint: 0
      },
      exposure_contrast_saturation: {
        exposure: 0,
        contrast: 1,
        saturation: 1,
        vibrance: 0,
        hue_shift: 0
      },
      shadows_highlights: {
        shadows: 0,
        highlights: 0
      },
      lift_gamma_gain: {
        lift: 0,
        gamma: 1,
        gain: 1
      },
      gradient_map: {
        enabled: false,
        stops: [
          { offset: 0, color: "#000000" },
          { offset: 1, color: "#ffffff" }
        ],
        blending_mode: "Normal",
        opacity: 1
      },
      bloom: {
        intensity: 0,
        threshold: 0.8,
        radius: 2
      },
      chromatic_aberration: 0,
      sharpen: 0,
      vignette_intensity: 0,
      film_grain: 0
    });
    const INSPECTOR_TABS = [
      { id: "tone", label: "Color & Tone" },
      { id: "curves", label: "RGB Curves" },
      { id: "gradient", label: "Gradient Map" },
      { id: "fx", label: "Shaders & FX" }
    ];
    const PRESET_LIST = [
      { id: "neutral", label: "Neutral (Pass-Through)" },
      { id: "teal_orange", label: "Teal & Orange Cinema" },
      { id: "golden_hour", label: "Warm Golden Hour" },
      { id: "bleach_bypass", label: "Bleach Bypass" },
      { id: "kodachrome", label: "Vintage Kodachrome" },
      { id: "noir", label: "High-Contrast Noir B&W" },
      { id: "cyberpunk", label: "Cyberpunk Neon" }
    ];
    const props = __props;
    const rootRef = ref(null);
    const studioViewportRef = ref(null);
    const wipeContainer = ref(null);
    const canvasBefore = ref(null);
    const canvasAfter = ref(null);
    const curveSvg = ref(null);
    const gradientBar = ref(null);
    const mode = ref("idle");
    const session = ref(null);
    const editorOpen = ref(false);
    const statusMessage = ref("");
    const activeTab = ref("tone");
    const selectedPreset = ref("neutral");
    const sourcePreviewUrl = ref("");
    const processedPreviewUrl = ref("");
    const liveCardDataUrl = ref("");
    const imageSize = reactive([1, 1]);
    const overallStrength = ref(((_a = props.getOverallStrength) == null ? void 0 : _a.call(props)) ?? 1);
    const params = reactive(DEFAULT_PAYLOAD());
    const activeChannel = ref("rgb");
    const selectedKnotIndex = ref(null);
    const isDraggingKnot = ref(false);
    const hoverCoord = ref(null);
    const activeStopIndex = ref(null);
    const wipePercentage = ref(50);
    const holdOriginal = ref(false);
    const viewZoom = ref(1);
    const viewPan = ref([0, 0]);
    const isPanning = ref(false);
    const studioViewportSize = reactive({ w: 960, h: 640 });
    const histogramData = reactive({
      r: new Array(256).fill(0),
      g: new Array(256).fill(0),
      b: new Array(256).fill(0),
      lum: new Array(256).fill(0)
    });
    const luts = reactive({
      rgb: new Float32Array(256),
      r: new Float32Array(256),
      g: new Float32Array(256),
      b: new Float32Array(256)
    });
    let proxyImageElement = null;
    let webglContext = null;
    let webglProgram = null;
    let imageTexture = null;
    let lutTexture = null;
    let gradTexture = null;
    let webglReady = false;
    let animFrameId = 0;
    let rehydrateTimer = null;
    let studioResizeObserver = null;
    let cleanupWipeListeners = null;
    let cleanupStopListeners = null;
    let panDrag = null;
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
    function isDefaultCurvePoints(pts) {
      if (!pts || pts.length !== 2) return false;
      return Math.abs(pts[0][0] - 0) < 1e-4 && Math.abs(pts[0][1] - 0) < 1e-4 && Math.abs(pts[1][0] - 1) < 1e-4 && Math.abs(pts[1][1] - 1) < 1e-4;
    }
    const isIdentity = computed(() => {
      const c = params.curves;
      if (!CURVE_CHANNELS.every((ch) => isDefaultCurvePoints(c[ch]))) return false;
      if (Math.abs(params.white_balance.temperature) > 1e-4 || Math.abs(params.white_balance.tint) > 1e-4) return false;
      const ecs = params.exposure_contrast_saturation;
      if (Math.abs(ecs.exposure) > 1e-4 || Math.abs(ecs.contrast - 1) > 1e-4 || Math.abs(ecs.saturation - 1) > 1e-4 || Math.abs(ecs.vibrance) > 1e-4 || Math.abs(ecs.hue_shift) > 1e-4) return false;
      if (Math.abs(params.shadows_highlights.shadows) > 1e-4 || Math.abs(params.shadows_highlights.highlights) > 1e-4)
        return false;
      const lgg = params.lift_gamma_gain;
      if (Math.abs(lgg.lift) > 1e-4 || Math.abs(lgg.gamma - 1) > 1e-4 || Math.abs(lgg.gain - 1) > 1e-4) return false;
      if (params.gradient_map.enabled && params.gradient_map.opacity > 1e-4) return false;
      if (params.bloom.intensity > 1e-4) return false;
      if (params.chromatic_aberration > 1e-4 || params.sharpen > 1e-4 || params.vignette_intensity > 1e-4 || params.film_grain > 1e-4) return false;
      return true;
    });
    const activeSummaryTags = computed(() => {
      if (isIdentity.value || overallStrength.value <= 1e-3) {
        return ["Pass-Through (Unchanged)"];
      }
      const tags = [];
      if (overallStrength.value < 0.999) tags.push(`Mix ${Math.round(overallStrength.value * 100)}%`);
      if (Math.abs(params.white_balance.temperature) > 0.01 || Math.abs(params.white_balance.tint) > 0.01)
        tags.push("White Balance");
      if (Math.abs(params.exposure_contrast_saturation.exposure) > 0.01)
        tags.push(`Exp ${formatSigned(params.exposure_contrast_saturation.exposure)}`);
      if (Math.abs(params.exposure_contrast_saturation.contrast - 1) > 0.01)
        tags.push(`Contrast ${params.exposure_contrast_saturation.contrast.toFixed(2)}`);
      if (Math.abs(params.exposure_contrast_saturation.saturation - 1) > 0.01 || Math.abs(params.exposure_contrast_saturation.vibrance) > 0.01) tags.push("Color/Sat");
      if (Math.abs(params.shadows_highlights.shadows) > 0.01 || Math.abs(params.shadows_highlights.highlights) > 0.01)
        tags.push("Shadows/Highlights");
      if (Math.abs(params.lift_gamma_gain.lift) > 0.01 || Math.abs(params.lift_gamma_gain.gamma - 1) > 0.01 || Math.abs(params.lift_gamma_gain.gain - 1) > 0.01) tags.push("Lift/Gamma/Gain");
      if (!CURVE_CHANNELS.every((ch) => isDefaultCurvePoints(params.curves[ch]))) tags.push("Curves");
      if (params.gradient_map.enabled) tags.push(`GradMap (${params.gradient_map.blending_mode})`);
      if (params.bloom.intensity > 0.01) tags.push("Bloom");
      if (params.sharpen > 0.01) tags.push("Sharpen");
      if (params.chromatic_aberration > 1e-3) tags.push("Chromatic Ab.");
      if (params.vignette_intensity > 0.01) tags.push("Vignette");
      if (params.film_grain > 1e-3) tags.push("Film Grain");
      return tags.slice(0, 5);
    });
    const wipeClipStyle = computed(() => ({
      clipPath: `polygon(${wipePercentage.value}% 0, 100% 0, 100% 100%, ${wipePercentage.value}% 100%)`
    }));
    const gradientBarStyle = computed(() => {
      if (!params.gradient_map.stops.length) return { background: "#000" };
      const stopsStr = [...params.gradient_map.stops].sort((a, b) => a.offset - b.offset).map((s) => `${s.color} ${s.offset * 100}%`).join(", ");
      return { background: `linear-gradient(to right, ${stopsStr})` };
    });
    const studioStageStyle = computed(() => {
      const iw = Math.max(1, (proxyImageElement == null ? void 0 : proxyImageElement.naturalWidth) || imageSize[0] || 640);
      const ih = Math.max(1, (proxyImageElement == null ? void 0 : proxyImageElement.naturalHeight) || imageSize[1] || 480);
      const vw = Math.max(200, studioViewportSize.w - 48);
      const vh = Math.max(200, studioViewportSize.h - 64);
      const fitScale = Math.min(vw / iw, vh / ih);
      const w = Math.max(1, Math.round(iw * fitScale));
      const h = Math.max(1, Math.round(ih * fitScale));
      return {
        width: `${w}px`,
        height: `${h}px`,
        transform: `translate(${viewPan.value[0]}px, ${viewPan.value[1]}px) scale(${viewZoom.value})`
      };
    });
    function formatSigned(val) {
      return (val >= 0 ? "+" : "") + val.toFixed(2);
    }
    function interpolateMonotoneCubic(points) {
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
        ds[i] = (ms[i - 1] + ms[i]) / 2;
      }
      for (let i = 0; i < n - 1; i++) {
        if (ms[i] === 0) {
          ds[i] = 0;
          ds[i + 1] = 0;
        } else {
          const alpha = ds[i] / ms[i];
          const beta = ds[i + 1] / ms[i];
          const val = alpha * alpha + beta * beta;
          if (val > 9) {
            const tau = 3 / Math.sqrt(val);
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
        const h00 = 2 * t * t * t - 3 * t * t + 1;
        const h10 = t * t * t - 2 * t * t + t;
        const h01 = -2 * t * t * t + 3 * t * t;
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
    function getCurvePath(channel) {
      const lut = interpolateMonotoneCubic(params.curves[channel]);
      let d = `M 0 ${256 - lut[0] * 256}`;
      for (let i = 1; i < 256; i++) {
        d += ` L ${i} ${256 - lut[i] * 256}`;
      }
      return d;
    }
    function createSyntheticTestChart() {
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 400;
      const ctx = c.getContext("2d");
      if (!ctx) return c;
      const bg = ctx.createLinearGradient(0, 0, 640, 400);
      bg.addColorStop(0, "#102542");
      bg.addColorStop(0.5, "#3b526b");
      bg.addColorStop(1, "#f87060");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 640, 400);
      const swatches = ["#e63946", "#f4a261", "#e9c46a", "#2a9d8f", "#264653", "#8338ec", "#ff006e", "#f1faee"];
      const sw = 640 / swatches.length;
      swatches.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.fillRect(idx * sw, 260, sw, 80);
      });
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
        -1,
        -1,
        0,
        0,
        1,
        -1,
        1,
        0,
        -1,
        1,
        0,
        1,
        -1,
        1,
        0,
        1,
        1,
        -1,
        1,
        0,
        1,
        1,
        1,
        1
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
      const source = proxyImageElement || createSyntheticTestChart();
      const w = source instanceof HTMLImageElement ? source.naturalWidth || 640 : source.width;
      const h = source instanceof HTMLImageElement ? source.naturalHeight || 400 : source.height;
      if (canvasB) {
        canvasB.width = w;
        canvasB.height = h;
        const ctxB = canvasB.getContext("2d");
        ctxB == null ? void 0 : ctxB.drawImage(source, 0, 0, w, h);
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
      const w = (proxyImageElement == null ? void 0 : proxyImageElement.naturalWidth) || 640;
      const h = (proxyImageElement == null ? void 0 : proxyImageElement.naturalHeight) || 400;
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
      const rHist = new Array(256).fill(0);
      const gHist = new Array(256).fill(0);
      const bHist = new Array(256).fill(0);
      const lumHist = new Array(256).fill(0);
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
      const norm = 1 / Math.max(1, total);
      for (let i = 0; i < 256; i++) {
        histogramData.r[i] = rHist[i] * norm;
        histogramData.g[i] = gHist[i] * norm;
        histogramData.b[i] = bHist[i] * norm;
        histogramData.lum[i] = lumHist[i] * norm;
      }
    }
    function getHistogramPath(channel) {
      const hist = histogramData[channel];
      const maxVal = Math.max(...hist, 1e-3);
      let d = "M 0 90";
      for (let i = 0; i < 256; i++) {
        const y = 90 - hist[i] / maxVal * 82;
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
    function hydrateState(raw) {
      if (!raw) return;
      try {
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!data || typeof data !== "object") return;
        if (data.curves) {
          for (const ch of CURVE_CHANNELS) {
            if (Array.isArray(data.curves[ch]) && data.curves[ch].length >= 2) {
              params.curves[ch] = data.curves[ch].map((p) => [Number(p[0]) || 0, Number(p[1]) || 0]);
            } else {
              params.curves[ch] = [[0, 0], [1, 1]];
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
            params.gradient_map.stops = data.gradient_map.stops.map((s) => ({
              offset: Number(s.offset ?? 0),
              color: String(s.color ?? "#ffffff")
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
    function serializeParams() {
      var _a2;
      return {
        version: 1,
        curves: {
          rgb: params.curves.rgb.map(([x, y]) => [x, y]),
          r: params.curves.r.map(([x, y]) => [x, y]),
          g: params.curves.g.map(([x, y]) => [x, y]),
          b: params.curves.b.map(([x, y]) => [x, y])
        },
        white_balance: { ...params.white_balance },
        exposure_contrast_saturation: { ...params.exposure_contrast_saturation },
        shadows_highlights: { ...params.shadows_highlights },
        lift_gamma_gain: { ...params.lift_gamma_gain },
        gradient_map: {
          enabled: params.gradient_map.enabled,
          blending_mode: params.gradient_map.blending_mode,
          opacity: params.gradient_map.opacity,
          stops: params.gradient_map.stops.map((s) => ({ ...s }))
        },
        bloom: { ...params.bloom },
        chromatic_aberration: params.chromatic_aberration,
        sharpen: params.sharpen,
        vignette_intensity: params.vignette_intensity,
        film_grain: params.film_grain,
        overall_strength: overallStrength.value,
        ...((_a2 = session.value) == null ? void 0 : _a2.inputSignature) ? { input_signature: session.value.inputSignature } : {}
      };
    }
    function onParamChange() {
      var _a2;
      selectedPreset.value = "custom";
      (_a2 = props.onStateChange) == null ? void 0 : _a2.call(props, JSON.stringify(serializeParams()));
      requestDraw();
    }
    function onStrengthInput(rawVal) {
      var _a2, _b;
      const num = Math.max(0, Math.min(1, Number(rawVal) || 0));
      overallStrength.value = num;
      (_a2 = props.onStrengthChange) == null ? void 0 : _a2.call(props, num);
      (_b = props.onStateChange) == null ? void 0 : _b.call(props, JSON.stringify(serializeParams()));
      requestDraw();
    }
    function resetAll() {
      var _a2;
      hydrateState(DEFAULT_PAYLOAD());
      selectedPreset.value = "neutral";
      selectedKnotIndex.value = null;
      activeStopIndex.value = null;
      liveCardDataUrl.value = "";
      (_a2 = props.onStateChange) == null ? void 0 : _a2.call(props, JSON.stringify(serializeParams()));
      requestDraw();
    }
    function applyPreset(presetId) {
      var _a2;
      const next = DEFAULT_PAYLOAD();
      switch (presetId) {
        case "neutral":
          break;
        case "teal_orange":
          next.exposure_contrast_saturation.contrast = 1.15;
          next.exposure_contrast_saturation.vibrance = 0.25;
          next.curves.r = [[0, 0], [0.25, 0.2], [0.75, 0.82], [1, 1]];
          next.curves.b = [[0, 0.06], [0.3, 0.36], [0.75, 0.68], [1, 0.92]];
          next.gradient_map = {
            enabled: true,
            blending_mode: "Soft Light",
            opacity: 0.35,
            stops: [
              { offset: 0, color: "#0d3b4c" },
              { offset: 0.6, color: "#d97736" },
              { offset: 1, color: "#f3c7" }
            ]
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
          next.bloom = { intensity: 0.35, threshold: 0.72, radius: 3 };
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
          next.exposure_contrast_saturation.saturation = 0;
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
              { offset: 0, color: "#0b0726" },
              { offset: 0.5, color: "#9d174d" },
              { offset: 1, color: "#22d3ee" }
            ]
          };
          next.bloom = { intensity: 0.45, threshold: 0.68, radius: 3.5 };
          next.chromatic_aberration = 8e-3;
          break;
        default:
          return;
      }
      hydrateState(next);
      selectedPreset.value = presetId;
      (_a2 = props.onStateChange) == null ? void 0 : _a2.call(props, JSON.stringify(serializeParams()));
    }
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
      if (webglReady && canvasAfter.value && !isIdentity.value) {
        try {
          liveCardDataUrl.value = canvasAfter.value.toDataURL("image/jpeg", 0.88);
        } catch {
        }
      } else if (isIdentity.value) {
        liveCardDataUrl.value = "";
      }
      studioResizeObserver == null ? void 0 : studioResizeObserver.disconnect();
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
    function onStudioWheel(ev) {
      const factor = ev.deltaY < 0 ? 1.15 : 1 / 1.15;
      const next = Math.max(0.5, Math.min(12, viewZoom.value * factor));
      viewZoom.value = next;
      if (Math.abs(next - 1) < 0.02) {
        viewZoom.value = 1;
        viewPan.value = [0, 0];
      }
    }
    function onStudioViewportDown(ev) {
      var _a2;
      if (ev.button === 0 && ev.altKey || ev.button === 1) {
        ev.preventDefault();
        panDrag = {
          pointerId: ev.pointerId,
          startX: ev.clientX,
          startY: ev.clientY,
          pan0: [viewPan.value[0], viewPan.value[1]]
        };
        isPanning.value = true;
        try {
          (_a2 = studioViewportRef.value) == null ? void 0 : _a2.setPointerCapture(ev.pointerId);
        } catch {
        }
      }
    }
    function onStudioPointerMove(ev) {
      if (!panDrag || ev.pointerId !== panDrag.pointerId) return;
      viewPan.value = [
        panDrag.pan0[0] + (ev.clientX - panDrag.startX),
        panDrag.pan0[1] + (ev.clientY - panDrag.startY)
      ];
    }
    function onStudioPointerUp(ev) {
      var _a2;
      if (!panDrag || ev.pointerId !== panDrag.pointerId) return;
      try {
        (_a2 = studioViewportRef.value) == null ? void 0 : _a2.releasePointerCapture(ev.pointerId);
      } catch {
      }
      panDrag = null;
      isPanning.value = false;
    }
    function onStagePointerDown(ev) {
      if (ev.button === 0 && !ev.altKey) {
        startWipeDrag(ev);
      }
    }
    function startWipeDrag(ev) {
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      cleanupWipeListeners == null ? void 0 : cleanupWipeListeners();
      const updateFromClientX = (clientX) => {
        const el = wipeContainer.value;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0) return;
        wipePercentage.value = Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100));
      };
      updateFromClientX(ev.clientX);
      const onMove = (moveEv) => updateFromClientX(moveEv.clientX);
      const onUp = () => {
        cleanupWipeListeners == null ? void 0 : cleanupWipeListeners();
        cleanupWipeListeners = null;
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      cleanupWipeListeners = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
    }
    function getMouseSvgCoord(e) {
      const svg = curveSvg.value;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
    }
    function onCurveMouseDown(e) {
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
    function onCurveMouseMove(e) {
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
        const minX = p[idx - 1][0] + 5e-3;
        const maxX = p[idx + 1][0] - 5e-3;
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
    function selectKnot(idx, e) {
      if (e.button !== 0) return;
      selectedKnotIndex.value = idx;
      isDraggingKnot.value = true;
    }
    const canRemoveSelectedKnot = computed(() => {
      const p = params.curves[activeChannel.value];
      const idx = selectedKnotIndex.value;
      return idx !== null && p.length > 2 && idx > 0 && idx < p.length - 1;
    });
    function removeKnot(idx) {
      const p = params.curves[activeChannel.value];
      if (p.length <= 2 || idx <= 0 || idx >= p.length - 1) return;
      p.splice(idx, 1);
      selectedKnotIndex.value = null;
      onParamChange();
    }
    function removeSelectedKnot() {
      if (selectedKnotIndex.value !== null) removeKnot(selectedKnotIndex.value);
    }
    function resetCurve(channel) {
      params.curves[channel] = [[0, 0], [1, 1]];
      selectedKnotIndex.value = null;
      onParamChange();
    }
    function onGradientBarMouseDown(e) {
      const bar = gradientBar.value;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const offset = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      params.gradient_map.stops.push({ offset, color: "#ffffff" });
      params.gradient_map.stops.sort((a, b) => a.offset - b.offset);
      activeStopIndex.value = params.gradient_map.stops.findIndex((s) => s.offset === offset);
      onParamChange();
    }
    function startStopDrag(idx, e) {
      if (e.button !== 0) return;
      e.preventDefault();
      cleanupStopListeners == null ? void 0 : cleanupStopListeners();
      activeStopIndex.value = idx;
      const onMove = (moveEv) => {
        const bar = gradientBar.value;
        if (!bar || activeStopIndex.value === null) return;
        const rect = bar.getBoundingClientRect();
        const offset = Math.max(0, Math.min(1, (moveEv.clientX - rect.left) / rect.width));
        params.gradient_map.stops[activeStopIndex.value].offset = offset;
        onParamChange();
      };
      const onUp = () => {
        params.gradient_map.stops.sort((a, b) => a.offset - b.offset);
        cleanupStopListeners == null ? void 0 : cleanupStopListeners();
        cleanupStopListeners = null;
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      cleanupStopListeners = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    }
    function removeStop(idx) {
      if (params.gradient_map.stops.length <= 2) return;
      params.gradient_map.stops.splice(idx, 1);
      activeStopIndex.value = null;
      onParamChange();
    }
    function setStopOffset(idx, offset) {
      if (!Number.isFinite(offset)) return;
      const clamped = Math.max(0, Math.min(1, offset));
      params.gradient_map.stops[idx].offset = clamped;
      params.gradient_map.stops.sort((a, b) => a.offset - b.offset);
      activeStopIndex.value = params.gradient_map.stops.findIndex((s) => s.offset === clamped);
      onParamChange();
    }
    function loadProxyImage(url) {
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
    function matchesNode(nodeId) {
      const own = props.getNodeId();
      const id = String(nodeId ?? "");
      return id === own || id.endsWith(`:${own}`);
    }
    function loadSession(payload) {
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
        inputSignature: String(payload.input_signature ?? "")
      };
      statusMessage.value = "";
      mode.value = "paused";
    }
    function endSession(note = "") {
      session.value = null;
      mode.value = "idle";
      statusMessage.value = note;
    }
    async function submitSession() {
      var _a2;
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
            params: finalParams
          })
        });
        if (response.ok) {
          (_a2 = props.onStateChange) == null ? void 0 : _a2.call(props, JSON.stringify(finalParams));
          if (editorOpen.value) closeEditor();
          endSession();
          return;
        }
        const body = await response.json().catch(() => ({}));
        if (response.status === 404) {
          endSession("Session expired. Queue the workflow again.");
        } else {
          mode.value = "paused";
          statusMessage.value = String((body == null ? void 0 : body.message) ?? `Resume failed (${response.status})`);
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
        const match = ((body == null ? void 0 : body.sessions) ?? []).find((s) => matchesNode(s == null ? void 0 : s.node_id));
        if (match) loadSession(match);
      } catch {
      }
    }
    function onCardKeyDown(ev) {
      if (ev.key === "Enter" && mode.value === "paused" && !editorOpen.value) {
        ev.preventDefault();
        ev.stopPropagation();
        submitSession();
      }
    }
    function onModalKeyDown(ev) {
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
    function setBackendHistogram(backendHist) {
      var _a2, _b, _c, _d;
      if (!backendHist) return;
      const maxLum = Math.max(...backendHist.lum || [1], 1);
      const scale = 1 / maxLum;
      for (let i = 0; i < 256; i++) {
        histogramData.r[i] = (((_a2 = backendHist.r) == null ? void 0 : _a2[i]) || 0) * scale;
        histogramData.g[i] = (((_b = backendHist.g) == null ? void 0 : _b[i]) || 0) * scale;
        histogramData.b[i] = (((_c = backendHist.b) == null ? void 0 : _c[i]) || 0) * scale;
        histogramData.lum[i] = (((_d = backendHist.lum) == null ? void 0 : _d[i]) || 0) * scale;
      }
    }
    function buildViewUrl(info) {
      if (!info || !info.filename) return "";
      const q = new URLSearchParams({
        filename: String(info.filename),
        subfolder: String(info.subfolder ?? ""),
        type: String(info.type ?? "temp"),
        rand: String(Math.random()).slice(2, 10)
      });
      return api.apiURL(`/view?${q.toString()}`);
    }
    function setExecutionResult(payload) {
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
    function setOverallStrength(val) {
      if (Number.isFinite(val)) {
        overallStrength.value = Math.max(0, Math.min(1, val));
        requestDraw();
      }
    }
    function onPauseEvent(event) {
      loadSession(event == null ? void 0 : event.detail);
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
      studioResizeObserver == null ? void 0 : studioResizeObserver.disconnect();
      studioResizeObserver = null;
      cleanupWipeListeners == null ? void 0 : cleanupWipeListeners();
      cleanupStopListeners == null ? void 0 : cleanupStopListeners();
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
    __expose({
      hydrateState,
      setExecutionResult,
      setOverallStrength,
      openEditor,
      closeEditor,
      cleanup
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "rootRef",
        ref: rootRef,
        class: "rtg-card",
        tabindex: "0",
        onKeydown: onCardKeyDown
      }, [
        createBaseVNode("div", _hoisted_1, [
          cardPreviewUrl.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            sourcePreviewUrl.value ? (openBlock(), createElementBlock("img", {
              key: 0,
              class: "rtg-card-img rtg-card-before",
              src: sourcePreviewUrl.value,
              draggable: "false",
              alt: "Original"
            }, null, 8, _hoisted_2)) : createCommentVNode("", true),
            createBaseVNode("img", {
              class: "rtg-card-img rtg-card-after",
              src: cardPreviewUrl.value,
              draggable: "false",
              alt: "Preview"
            }, null, 8, _hoisted_3)
          ], 64)) : (openBlock(), createElementBlock("div", _hoisted_4, [..._cache[58] || (_cache[58] = [
            createBaseVNode("div", { class: "rtg-card-empty-title" }, "Real-Time Grading & Shader Processor", -1),
            createBaseVNode("div", { class: "rtg-card-empty-sub" }, " Queue the workflow to pause here, or open the Studio Editor to pre-configure grading. ", -1)
          ])])),
          createBaseVNode("div", _hoisted_5, [
            imageSize[0] > 1 ? (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString(imageSize[0]) + " × " + toDisplayString(imageSize[1]), 1)) : createCommentVNode("", true),
            (openBlock(true), createElementBlock(Fragment, null, renderList(activeSummaryTags.value, (tag) => {
              return openBlock(), createElementBlock("span", {
                key: tag,
                class: normalizeClass(["rtg-pill", { "rtg-pill-neutral": tag === "Pass-Through (Unchanged)" }])
              }, toDisplayString(tag), 3);
            }), 128))
          ]),
          mode.value === "submitting" ? (openBlock(), createElementBlock("div", _hoisted_7, [..._cache[59] || (_cache[59] = [
            createBaseVNode("div", { class: "rtg-spinner" }, null, -1)
          ])])) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_8, [
          createBaseVNode("span", {
            class: normalizeClass(["rtg-badge", `rtg-badge-${mode.value}`])
          }, toDisplayString(badgeText.value), 3),
          _cache[60] || (_cache[60] = createBaseVNode("span", { class: "rtg-spacer" }, null, -1)),
          createBaseVNode("button", {
            type: "button",
            class: "rtg-btn rtg-btn-editor",
            title: "Open Full-Screen Studio Editor",
            onClick: withModifiers(openEditor, ["stop"])
          }, " Open Editor ⛶ "),
          createBaseVNode("button", {
            type: "button",
            class: "rtg-btn",
            disabled: isIdentity.value,
            title: "Reset all grading adjustments to neutral pass-through",
            onClick: withModifiers(resetAll, ["stop"])
          }, " Reset ", 8, _hoisted_9),
          session.value ? (openBlock(), createElementBlock("button", {
            key: 0,
            type: "button",
            class: "rtg-btn rtg-btn-continue",
            disabled: mode.value !== "paused",
            title: "Apply current settings (or pass through unchanged) and resume workflow",
            onClick: withModifiers(submitSession, ["stop"])
          }, toDisplayString(mode.value === "submitting" ? "Applying…" : "Continue ▶"), 9, _hoisted_10)) : createCommentVNode("", true),
          statusMessage.value ? (openBlock(), createElementBlock("div", _hoisted_11, toDisplayString(statusMessage.value), 1)) : createCommentVNode("", true)
        ]),
        (openBlock(), createBlock(Teleport, { to: "body" }, [
          editorOpen.value ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: "rtg-modal-backdrop",
            tabindex: "0",
            onKeydown: withModifiers(onModalKeyDown, ["stop"]),
            onPointerdown: _cache[53] || (_cache[53] = withModifiers(() => {
            }, ["stop"])),
            onMousedown: _cache[54] || (_cache[54] = withModifiers(() => {
            }, ["stop"])),
            onMouseup: _cache[55] || (_cache[55] = withModifiers(() => {
            }, ["stop"])),
            onWheel: _cache[56] || (_cache[56] = withModifiers(() => {
            }, ["stop"])),
            onContextmenu: _cache[57] || (_cache[57] = withModifiers(() => {
            }, ["prevent", "stop"]))
          }, [
            createBaseVNode("div", _hoisted_12, [
              createBaseVNode("header", _hoisted_13, [
                createBaseVNode("div", _hoisted_14, [
                  _cache[61] || (_cache[61] = createBaseVNode("span", { class: "rtg-studio-title" }, "Real-Time Grading & Shader Studio", -1)),
                  createBaseVNode("span", _hoisted_15, "Node #" + toDisplayString(__props.getNodeId()), 1),
                  imageSize[0] > 1 ? (openBlock(), createElementBlock("span", _hoisted_16, toDisplayString(imageSize[0]) + " × " + toDisplayString(imageSize[1]) + " px ", 1)) : createCommentVNode("", true),
                  mode.value === "paused" ? (openBlock(), createElementBlock("span", _hoisted_17, " ⏸ Workflow Paused ")) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_18, [
                  createBaseVNode("label", _hoisted_19, [
                    _cache[63] || (_cache[63] = createBaseVNode("span", { class: "rtg-toolbar-label" }, "Preset", -1)),
                    withDirectives(createBaseVNode("select", {
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedPreset.value = $event),
                      class: "rtg-select",
                      onChange: _cache[1] || (_cache[1] = ($event) => applyPreset(selectedPreset.value))
                    }, [
                      _cache[62] || (_cache[62] = createBaseVNode("option", { value: "custom" }, "— Custom —", -1)),
                      (openBlock(), createElementBlock(Fragment, null, renderList(PRESET_LIST, (p) => {
                        return createBaseVNode("option", {
                          key: p.id,
                          value: p.id
                        }, toDisplayString(p.label), 9, _hoisted_20);
                      }), 64))
                    ], 544), [
                      [vModelSelect, selectedPreset.value]
                    ])
                  ]),
                  _cache[64] || (_cache[64] = createBaseVNode("div", { class: "rtg-toolbar-divider" }, null, -1)),
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass(["rtg-btn", { "rtg-btn-active": holdOriginal.value }]),
                    title: "Hold to view original ungraded image (\\)",
                    onPointerdown: _cache[2] || (_cache[2] = ($event) => holdOriginal.value = true),
                    onPointerup: _cache[3] || (_cache[3] = ($event) => holdOriginal.value = false),
                    onPointerleave: _cache[4] || (_cache[4] = ($event) => holdOriginal.value = false)
                  }, " Hold Original ", 34),
                  createBaseVNode("button", {
                    type: "button",
                    class: "rtg-btn",
                    title: "Reset wipe splitter to 50%",
                    onClick: _cache[5] || (_cache[5] = ($event) => wipePercentage.value = 50)
                  }, " Wipe " + toDisplayString(Math.round(wipePercentage.value)) + "% ", 1),
                  createBaseVNode("button", {
                    type: "button",
                    class: "rtg-btn",
                    disabled: viewZoom.value === 1 && viewPan.value[0] === 0 && viewPan.value[1] === 0,
                    title: "Fit image to viewport",
                    onClick: resetStudioView
                  }, " Fit (" + toDisplayString(Math.round(viewZoom.value * 100)) + "%) ", 9, _hoisted_21)
                ]),
                createBaseVNode("div", _hoisted_22, [
                  createBaseVNode("button", {
                    type: "button",
                    class: "rtg-btn rtg-btn-danger",
                    disabled: isIdentity.value && overallStrength.value === 1,
                    onClick: resetAll
                  }, " Reset All ", 8, _hoisted_23),
                  createBaseVNode("button", {
                    type: "button",
                    class: "rtg-btn",
                    title: "Close full-screen editor and return to node view (Esc)",
                    onClick: closeEditor
                  }, " Close Editor (Esc) "),
                  session.value ? (openBlock(), createElementBlock("button", {
                    key: 0,
                    type: "button",
                    class: "rtg-btn rtg-btn-continue rtg-btn-lg",
                    disabled: mode.value !== "paused",
                    title: "Apply grading and resume ComfyUI workflow (Enter)",
                    onClick: submitFromStudio
                  }, toDisplayString(mode.value === "submitting" ? "Applying…" : "Apply & Continue ▶"), 9, _hoisted_24)) : createCommentVNode("", true)
                ])
              ]),
              createBaseVNode("div", _hoisted_25, [
                createBaseVNode("div", {
                  ref_key: "studioViewportRef",
                  ref: studioViewportRef,
                  class: normalizeClass(["rtg-studio-viewport", { "rtg-panning": isPanning.value }]),
                  onWheel: withModifiers(onStudioWheel, ["prevent"]),
                  onPointerdown: onStudioViewportDown,
                  onPointermove: onStudioPointerMove,
                  onPointerup: onStudioPointerUp,
                  onPointercancel: onStudioPointerUp
                }, [
                  createBaseVNode("div", {
                    ref_key: "wipeContainer",
                    ref: wipeContainer,
                    class: "rtg-stage-wrap",
                    style: normalizeStyle(studioStageStyle.value),
                    onPointerdown: onStagePointerDown
                  }, [
                    createBaseVNode("canvas", {
                      ref_key: "canvasBefore",
                      ref: canvasBefore,
                      class: "rtg-canvas rtg-canvas-before"
                    }, null, 512),
                    withDirectives(createBaseVNode("canvas", {
                      ref_key: "canvasAfter",
                      ref: canvasAfter,
                      class: "rtg-canvas rtg-canvas-after",
                      style: normalizeStyle(wipeClipStyle.value)
                    }, null, 4), [
                      [vShow, !holdOriginal.value]
                    ]),
                    withDirectives(createBaseVNode("div", {
                      class: "rtg-wipe-handle",
                      style: normalizeStyle({ left: `${wipePercentage.value}%` }),
                      onPointerdown: withModifiers(startWipeDrag, ["stop"])
                    }, [..._cache[65] || (_cache[65] = [
                      createBaseVNode("div", { class: "rtg-wipe-line" }, null, -1),
                      createBaseVNode("div", { class: "rtg-wipe-thumb" }, [
                        createBaseVNode("span", null, "◀▶")
                      ], -1)
                    ])], 36), [
                      [vShow, !holdOriginal.value]
                    ]),
                    _cache[66] || (_cache[66] = createBaseVNode("div", { class: "rtg-wipe-tag rtg-tag-before" }, "Before", -1)),
                    withDirectives(createBaseVNode("div", _hoisted_26, "After (Live WebGL2)", 512), [
                      [vShow, !holdOriginal.value]
                    ])
                  ], 36),
                  _cache[67] || (_cache[67] = createBaseVNode("div", { class: "rtg-viewport-footer" }, [
                    createBaseVNode("span", null, "Drag splitter to compare Before/After"),
                    createBaseVNode("span", null, "·"),
                    createBaseVNode("span", null, "Alt + Drag or Middle-Click to Pan"),
                    createBaseVNode("span", null, "·"),
                    createBaseVNode("span", null, "Scroll Wheel to Zoom"),
                    createBaseVNode("span", null, "·"),
                    createBaseVNode("span", null, "Double-click any slider to reset")
                  ], -1))
                ], 34),
                createBaseVNode("aside", _hoisted_27, [
                  createBaseVNode("div", _hoisted_28, [
                    _cache[68] || (_cache[68] = createBaseVNode("div", { class: "rtg-hist-header" }, [
                      createBaseVNode("span", null, "Live Output Histogram"),
                      createBaseVNode("span", { class: "rtg-hist-sub" }, "RGB + Rec.709 Luma")
                    ], -1)),
                    (openBlock(), createElementBlock("svg", _hoisted_29, [
                      createBaseVNode("path", {
                        d: getHistogramPath("r"),
                        class: "rtg-hist-path rtg-hist-r"
                      }, null, 8, _hoisted_30),
                      createBaseVNode("path", {
                        d: getHistogramPath("g"),
                        class: "rtg-hist-path rtg-hist-g"
                      }, null, 8, _hoisted_31),
                      createBaseVNode("path", {
                        d: getHistogramPath("b"),
                        class: "rtg-hist-path rtg-hist-b"
                      }, null, 8, _hoisted_32),
                      createBaseVNode("path", {
                        d: getHistogramPath("lum"),
                        class: "rtg-hist-path rtg-hist-lum"
                      }, null, 8, _hoisted_33)
                    ]))
                  ]),
                  createBaseVNode("div", _hoisted_34, [
                    createBaseVNode("div", _hoisted_35, [
                      _cache[69] || (_cache[69] = createBaseVNode("span", { class: "rtg-slider-label" }, "Overall Grading Strength", -1)),
                      createBaseVNode("span", _hoisted_36, toDisplayString(Math.round(overallStrength.value * 100)) + "%", 1)
                    ]),
                    createBaseVNode("input", {
                      type: "range",
                      min: "0",
                      max: "1",
                      step: "0.01",
                      value: overallStrength.value,
                      class: "rtg-range",
                      onInput: _cache[6] || (_cache[6] = ($event) => onStrengthInput($event.target.value)),
                      onDblclick: _cache[7] || (_cache[7] = ($event) => onStrengthInput("1"))
                    }, null, 40, _hoisted_37)
                  ]),
                  createBaseVNode("nav", _hoisted_38, [
                    (openBlock(), createElementBlock(Fragment, null, renderList(INSPECTOR_TABS, (tab) => {
                      return createBaseVNode("button", {
                        key: tab.id,
                        type: "button",
                        class: normalizeClass(["rtg-tab-btn", { active: activeTab.value === tab.id }]),
                        onClick: ($event) => activeTab.value = tab.id
                      }, toDisplayString(tab.label), 11, _hoisted_39);
                    }), 64))
                  ]),
                  createBaseVNode("div", _hoisted_40, [
                    activeTab.value === "tone" ? (openBlock(), createElementBlock("div", _hoisted_41, [
                      createBaseVNode("div", _hoisted_42, [
                        _cache[72] || (_cache[72] = createBaseVNode("div", { class: "rtg-group-title" }, "White Balance", -1)),
                        createBaseVNode("div", _hoisted_43, [
                          createBaseVNode("div", _hoisted_44, [
                            _cache[70] || (_cache[70] = createBaseVNode("span", { class: "rtg-slider-label" }, "Temperature (Cool / Warm)", -1)),
                            createBaseVNode("span", _hoisted_45, toDisplayString(formatSigned(params.white_balance.temperature)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "-1",
                            max: "1",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => params.white_balance.temperature = $event),
                            class: "rtg-range rtg-range-temp",
                            onInput: onParamChange,
                            onDblclick: _cache[9] || (_cache[9] = ($event) => {
                              params.white_balance.temperature = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.white_balance.temperature,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_46, [
                          createBaseVNode("div", _hoisted_47, [
                            _cache[71] || (_cache[71] = createBaseVNode("span", { class: "rtg-slider-label" }, "Tint (Green / Magenta)", -1)),
                            createBaseVNode("span", _hoisted_48, toDisplayString(formatSigned(params.white_balance.tint)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "-1",
                            max: "1",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => params.white_balance.tint = $event),
                            class: "rtg-range rtg-range-tint",
                            onInput: onParamChange,
                            onDblclick: _cache[11] || (_cache[11] = ($event) => {
                              params.white_balance.tint = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.white_balance.tint,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_49, [
                        _cache[78] || (_cache[78] = createBaseVNode("div", { class: "rtg-group-title" }, "Exposure & Color", -1)),
                        createBaseVNode("div", _hoisted_50, [
                          createBaseVNode("div", _hoisted_51, [
                            _cache[73] || (_cache[73] = createBaseVNode("span", { class: "rtg-slider-label" }, "Exposure (Stops)", -1)),
                            createBaseVNode("span", _hoisted_52, toDisplayString(formatSigned(params.exposure_contrast_saturation.exposure)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "-2",
                            max: "2",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => params.exposure_contrast_saturation.exposure = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[13] || (_cache[13] = ($event) => {
                              params.exposure_contrast_saturation.exposure = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.exposure_contrast_saturation.exposure,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_53, [
                          createBaseVNode("div", _hoisted_54, [
                            _cache[74] || (_cache[74] = createBaseVNode("span", { class: "rtg-slider-label" }, "Contrast", -1)),
                            createBaseVNode("span", _hoisted_55, toDisplayString(params.exposure_contrast_saturation.contrast.toFixed(2)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "3",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => params.exposure_contrast_saturation.contrast = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[15] || (_cache[15] = ($event) => {
                              params.exposure_contrast_saturation.contrast = 1;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.exposure_contrast_saturation.contrast,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_56, [
                          createBaseVNode("div", _hoisted_57, [
                            _cache[75] || (_cache[75] = createBaseVNode("span", { class: "rtg-slider-label" }, "Saturation", -1)),
                            createBaseVNode("span", _hoisted_58, toDisplayString(params.exposure_contrast_saturation.saturation.toFixed(2)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "3",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => params.exposure_contrast_saturation.saturation = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[17] || (_cache[17] = ($event) => {
                              params.exposure_contrast_saturation.saturation = 1;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.exposure_contrast_saturation.saturation,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_59, [
                          createBaseVNode("div", _hoisted_60, [
                            _cache[76] || (_cache[76] = createBaseVNode("span", { class: "rtg-slider-label" }, "Vibrance", -1)),
                            createBaseVNode("span", _hoisted_61, toDisplayString(formatSigned(params.exposure_contrast_saturation.vibrance)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "-1",
                            max: "1",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => params.exposure_contrast_saturation.vibrance = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[19] || (_cache[19] = ($event) => {
                              params.exposure_contrast_saturation.vibrance = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.exposure_contrast_saturation.vibrance,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_62, [
                          createBaseVNode("div", _hoisted_63, [
                            _cache[77] || (_cache[77] = createBaseVNode("span", { class: "rtg-slider-label" }, "Hue Shift", -1)),
                            createBaseVNode("span", _hoisted_64, toDisplayString(Math.round(params.exposure_contrast_saturation.hue_shift)) + "°", 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "-180",
                            max: "180",
                            step: "1",
                            "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => params.exposure_contrast_saturation.hue_shift = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[21] || (_cache[21] = ($event) => {
                              params.exposure_contrast_saturation.hue_shift = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.exposure_contrast_saturation.hue_shift,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_65, [
                        _cache[81] || (_cache[81] = createBaseVNode("div", { class: "rtg-group-title" }, "Shadows & Highlights", -1)),
                        createBaseVNode("div", _hoisted_66, [
                          createBaseVNode("div", _hoisted_67, [
                            _cache[79] || (_cache[79] = createBaseVNode("span", { class: "rtg-slider-label" }, "Shadows Recovery", -1)),
                            createBaseVNode("span", _hoisted_68, toDisplayString(formatSigned(params.shadows_highlights.shadows)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "-1",
                            max: "1",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[22] || (_cache[22] = ($event) => params.shadows_highlights.shadows = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[23] || (_cache[23] = ($event) => {
                              params.shadows_highlights.shadows = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.shadows_highlights.shadows,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_69, [
                          createBaseVNode("div", _hoisted_70, [
                            _cache[80] || (_cache[80] = createBaseVNode("span", { class: "rtg-slider-label" }, "Highlights Recovery", -1)),
                            createBaseVNode("span", _hoisted_71, toDisplayString(formatSigned(params.shadows_highlights.highlights)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "-1",
                            max: "1",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[24] || (_cache[24] = ($event) => params.shadows_highlights.highlights = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[25] || (_cache[25] = ($event) => {
                              params.shadows_highlights.highlights = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.shadows_highlights.highlights,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_72, [
                        _cache[85] || (_cache[85] = createBaseVNode("div", { class: "rtg-group-title" }, "Lift / Gamma / Gain", -1)),
                        createBaseVNode("div", _hoisted_73, [
                          createBaseVNode("div", _hoisted_74, [
                            _cache[82] || (_cache[82] = createBaseVNode("span", { class: "rtg-slider-label" }, "Lift (Shadows Offset)", -1)),
                            createBaseVNode("span", _hoisted_75, toDisplayString(formatSigned(params.lift_gamma_gain.lift)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "-1",
                            max: "1",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[26] || (_cache[26] = ($event) => params.lift_gamma_gain.lift = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[27] || (_cache[27] = ($event) => {
                              params.lift_gamma_gain.lift = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.lift_gamma_gain.lift,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_76, [
                          createBaseVNode("div", _hoisted_77, [
                            _cache[83] || (_cache[83] = createBaseVNode("span", { class: "rtg-slider-label" }, "Gamma (Midtones Power)", -1)),
                            createBaseVNode("span", _hoisted_78, toDisplayString(params.lift_gamma_gain.gamma.toFixed(2)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0.1",
                            max: "4",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[28] || (_cache[28] = ($event) => params.lift_gamma_gain.gamma = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[29] || (_cache[29] = ($event) => {
                              params.lift_gamma_gain.gamma = 1;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.lift_gamma_gain.gamma,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_79, [
                          createBaseVNode("div", _hoisted_80, [
                            _cache[84] || (_cache[84] = createBaseVNode("span", { class: "rtg-slider-label" }, "Gain (Highlights Multiplier)", -1)),
                            createBaseVNode("span", _hoisted_81, toDisplayString(params.lift_gamma_gain.gain.toFixed(2)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "3",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[30] || (_cache[30] = ($event) => params.lift_gamma_gain.gain = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[31] || (_cache[31] = ($event) => {
                              params.lift_gamma_gain.gain = 1;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.lift_gamma_gain.gain,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ])
                      ])
                    ])) : activeTab.value === "curves" ? (openBlock(), createElementBlock("div", _hoisted_82, [
                      createBaseVNode("div", _hoisted_83, [
                        createBaseVNode("div", _hoisted_84, [
                          (openBlock(), createElementBlock(Fragment, null, renderList(CURVE_CHANNELS, (ch) => {
                            return createBaseVNode("button", {
                              key: ch,
                              type: "button",
                              class: normalizeClass(["rtg-ch-btn", [`rtg-ch-${ch}`, { active: activeChannel.value === ch }]]),
                              onClick: ($event) => {
                                activeChannel.value = ch;
                                selectedKnotIndex.value = null;
                              }
                            }, toDisplayString(ch.toUpperCase()), 11, _hoisted_85);
                          }), 64)),
                          _cache[86] || (_cache[86] = createBaseVNode("span", { class: "rtg-spacer" }, null, -1)),
                          createBaseVNode("button", {
                            type: "button",
                            class: "rtg-btn rtg-btn-sm",
                            disabled: !canRemoveSelectedKnot.value,
                            onClick: removeSelectedKnot
                          }, " Remove Point ", 8, _hoisted_86),
                          createBaseVNode("button", {
                            type: "button",
                            class: "rtg-btn rtg-btn-sm",
                            onClick: _cache[32] || (_cache[32] = ($event) => resetCurve(activeChannel.value))
                          }, " Reset " + toDisplayString(activeChannel.value.toUpperCase()), 1)
                        ]),
                        createBaseVNode("div", _hoisted_87, [
                          (openBlock(), createElementBlock("svg", {
                            ref_key: "curveSvg",
                            ref: curveSvg,
                            class: "rtg-curve-svg",
                            viewBox: "0 0 256 256",
                            onMousedown: onCurveMouseDown,
                            onMousemove: onCurveMouseMove,
                            onMouseup: onCurveMouseUp,
                            onMouseleave: onCurveMouseLeave
                          }, [
                            _cache[87] || (_cache[87] = createBaseVNode("line", {
                              x1: "64",
                              y1: "0",
                              x2: "64",
                              y2: "256",
                              class: "rtg-grid-line"
                            }, null, -1)),
                            _cache[88] || (_cache[88] = createBaseVNode("line", {
                              x1: "128",
                              y1: "0",
                              x2: "128",
                              y2: "256",
                              class: "rtg-grid-line"
                            }, null, -1)),
                            _cache[89] || (_cache[89] = createBaseVNode("line", {
                              x1: "192",
                              y1: "0",
                              x2: "192",
                              y2: "256",
                              class: "rtg-grid-line"
                            }, null, -1)),
                            _cache[90] || (_cache[90] = createBaseVNode("line", {
                              x1: "0",
                              y1: "64",
                              x2: "256",
                              y2: "64",
                              class: "rtg-grid-line"
                            }, null, -1)),
                            _cache[91] || (_cache[91] = createBaseVNode("line", {
                              x1: "0",
                              y1: "128",
                              x2: "256",
                              y2: "128",
                              class: "rtg-grid-line"
                            }, null, -1)),
                            _cache[92] || (_cache[92] = createBaseVNode("line", {
                              x1: "0",
                              y1: "192",
                              x2: "256",
                              y2: "192",
                              class: "rtg-grid-line"
                            }, null, -1)),
                            _cache[93] || (_cache[93] = createBaseVNode("line", {
                              x1: "0",
                              y1: "256",
                              x2: "256",
                              y2: "0",
                              class: "rtg-diag-line"
                            }, null, -1)),
                            (openBlock(true), createElementBlock(Fragment, null, renderList(CURVE_CHANNELS.filter((c) => c !== activeChannel.value), (ch) => {
                              return openBlock(), createElementBlock("path", {
                                key: "bg-curve-" + ch,
                                d: getCurvePath(ch),
                                class: normalizeClass(["rtg-curve-inactive", `rtg-stroke-${ch}`])
                              }, null, 10, _hoisted_88);
                            }), 128)),
                            createBaseVNode("path", {
                              d: getCurvePath(activeChannel.value),
                              class: normalizeClass(["rtg-curve-active", `rtg-stroke-${activeChannel.value}`])
                            }, null, 10, _hoisted_89),
                            createBaseVNode("g", null, [
                              (openBlock(true), createElementBlock(Fragment, null, renderList(params.curves[activeChannel.value], (pt, idx) => {
                                return openBlock(), createElementBlock("circle", {
                                  key: "knot-" + idx,
                                  cx: pt[0] * 256,
                                  cy: 256 - pt[1] * 256,
                                  r: "6",
                                  class: normalizeClass(["rtg-knot", [
                                    `rtg-stroke-${activeChannel.value}`,
                                    { selected: selectedKnotIndex.value === idx }
                                  ]]),
                                  onMousedown: withModifiers(($event) => selectKnot(idx, $event), ["stop"]),
                                  onDblclick: withModifiers(($event) => removeKnot(idx), ["stop"])
                                }, null, 42, _hoisted_90);
                              }), 128))
                            ]),
                            hoverCoord.value ? (openBlock(), createElementBlock("text", _hoisted_91, " IN: " + toDisplayString(Math.round(hoverCoord.value[0] * 255)) + " → OUT: " + toDisplayString(Math.round(hoverCoord.value[1] * 255)), 1)) : createCommentVNode("", true)
                          ], 544))
                        ]),
                        _cache[94] || (_cache[94] = createBaseVNode("div", { class: "rtg-curve-hint" }, " Click anywhere on the curve to add a control point. Drag to shape tones. Double-click an interior point to delete it. ", -1))
                      ])
                    ])) : activeTab.value === "gradient" ? (openBlock(), createElementBlock("div", _hoisted_92, [
                      createBaseVNode("div", _hoisted_93, [
                        createBaseVNode("div", _hoisted_94, [
                          _cache[95] || (_cache[95] = createBaseVNode("span", {
                            class: "rtg-group-title",
                            style: { "margin": "0" }
                          }, "Luminance Gradient Map", -1)),
                          createBaseVNode("label", _hoisted_95, [
                            withDirectives(createBaseVNode("input", {
                              type: "checkbox",
                              "onUpdate:modelValue": _cache[33] || (_cache[33] = ($event) => params.gradient_map.enabled = $event),
                              onChange: onParamChange
                            }, null, 544), [
                              [vModelCheckbox, params.gradient_map.enabled]
                            ]),
                            createBaseVNode("span", null, toDisplayString(params.gradient_map.enabled ? "Enabled" : "Disabled"), 1)
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_96, [
                          _cache[96] || (_cache[96] = createBaseVNode("div", { class: "rtg-slider-head" }, [
                            createBaseVNode("span", { class: "rtg-slider-label" }, "Blending Mode")
                          ], -1)),
                          withDirectives(createBaseVNode("select", {
                            "onUpdate:modelValue": _cache[34] || (_cache[34] = ($event) => params.gradient_map.blending_mode = $event),
                            class: "rtg-select",
                            style: { "width": "100%" },
                            onChange: onParamChange
                          }, [
                            (openBlock(), createElementBlock(Fragment, null, renderList(["Normal", "Overlay", "Soft Light", "Multiply", "Screen"], (m) => {
                              return createBaseVNode("option", {
                                key: m,
                                value: m
                              }, toDisplayString(m), 9, _hoisted_97);
                            }), 64))
                          ], 544), [
                            [vModelSelect, params.gradient_map.blending_mode]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_98, [
                          createBaseVNode("div", _hoisted_99, [
                            _cache[97] || (_cache[97] = createBaseVNode("span", { class: "rtg-slider-label" }, "Gradient Opacity", -1)),
                            createBaseVNode("span", _hoisted_100, toDisplayString(Math.round(params.gradient_map.opacity * 100)) + "%", 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "1",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[35] || (_cache[35] = ($event) => params.gradient_map.opacity = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[36] || (_cache[36] = ($event) => {
                              params.gradient_map.opacity = 1;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.gradient_map.opacity,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_101, [
                          _cache[98] || (_cache[98] = createBaseVNode("div", { class: "rtg-slider-head" }, [
                            createBaseVNode("span", { class: "rtg-slider-label" }, "Color Stops (Click bar to add, double-click pin to remove)")
                          ], -1)),
                          createBaseVNode("div", {
                            ref_key: "gradientBar",
                            ref: gradientBar,
                            class: "rtg-grad-bar",
                            style: normalizeStyle(gradientBarStyle.value),
                            onMousedown: onGradientBarMouseDown
                          }, [
                            (openBlock(true), createElementBlock(Fragment, null, renderList(params.gradient_map.stops, (stop, idx) => {
                              return openBlock(), createElementBlock("div", {
                                key: "stop-" + idx,
                                class: normalizeClass(["rtg-grad-stop", { active: activeStopIndex.value === idx }]),
                                style: normalizeStyle({ left: `${stop.offset * 100}%` }),
                                onMousedown: withModifiers(($event) => startStopDrag(idx, $event), ["stop"]),
                                onDblclick: withModifiers(($event) => removeStop(idx), ["stop"])
                              }, [
                                createBaseVNode("div", {
                                  class: "rtg-grad-pin",
                                  style: normalizeStyle({ backgroundColor: stop.color })
                                }, null, 4)
                              ], 46, _hoisted_102);
                            }), 128))
                          ], 36)
                        ]),
                        activeStopIndex.value !== null && params.gradient_map.stops[activeStopIndex.value] ? (openBlock(), createElementBlock("div", _hoisted_103, [
                          createBaseVNode("span", _hoisted_104, "Stop #" + toDisplayString(activeStopIndex.value + 1), 1),
                          createBaseVNode("label", _hoisted_105, [
                            _cache[99] || (_cache[99] = createBaseVNode("span", null, "Position %", -1)),
                            createBaseVNode("input", {
                              type: "number",
                              min: "0",
                              max: "100",
                              class: "rtg-num-input",
                              value: Math.round(params.gradient_map.stops[activeStopIndex.value].offset * 100),
                              onInput: _cache[37] || (_cache[37] = ($event) => setStopOffset(activeStopIndex.value, Number($event.target.value) / 100))
                            }, null, 40, _hoisted_106)
                          ]),
                          createBaseVNode("label", _hoisted_107, [
                            _cache[100] || (_cache[100] = createBaseVNode("span", null, "Color", -1)),
                            withDirectives(createBaseVNode("input", {
                              type: "color",
                              "onUpdate:modelValue": _cache[38] || (_cache[38] = ($event) => params.gradient_map.stops[activeStopIndex.value].color = $event),
                              class: "rtg-color-input",
                              onInput: onParamChange
                            }, null, 544), [
                              [vModelText, params.gradient_map.stops[activeStopIndex.value].color]
                            ])
                          ])
                        ])) : createCommentVNode("", true)
                      ])
                    ])) : activeTab.value === "fx" ? (openBlock(), createElementBlock("div", _hoisted_108, [
                      createBaseVNode("div", _hoisted_109, [
                        _cache[105] || (_cache[105] = createBaseVNode("div", { class: "rtg-group-title" }, "Optical & Detail", -1)),
                        createBaseVNode("div", _hoisted_110, [
                          createBaseVNode("div", _hoisted_111, [
                            _cache[101] || (_cache[101] = createBaseVNode("span", { class: "rtg-slider-label" }, "Sharpen (Laplacian)", -1)),
                            createBaseVNode("span", _hoisted_112, toDisplayString(params.sharpen.toFixed(2)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "2",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[39] || (_cache[39] = ($event) => params.sharpen = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[40] || (_cache[40] = ($event) => {
                              params.sharpen = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.sharpen,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_113, [
                          createBaseVNode("div", _hoisted_114, [
                            _cache[102] || (_cache[102] = createBaseVNode("span", { class: "rtg-slider-label" }, "Chromatic Aberration", -1)),
                            createBaseVNode("span", _hoisted_115, toDisplayString(params.chromatic_aberration.toFixed(3)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "0.05",
                            step: "0.001",
                            "onUpdate:modelValue": _cache[41] || (_cache[41] = ($event) => params.chromatic_aberration = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[42] || (_cache[42] = ($event) => {
                              params.chromatic_aberration = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.chromatic_aberration,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_116, [
                          createBaseVNode("div", _hoisted_117, [
                            _cache[103] || (_cache[103] = createBaseVNode("span", { class: "rtg-slider-label" }, "Vignette Falloff", -1)),
                            createBaseVNode("span", _hoisted_118, toDisplayString(params.vignette_intensity.toFixed(2)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "1.5",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[43] || (_cache[43] = ($event) => params.vignette_intensity = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[44] || (_cache[44] = ($event) => {
                              params.vignette_intensity = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.vignette_intensity,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_119, [
                          createBaseVNode("div", _hoisted_120, [
                            _cache[104] || (_cache[104] = createBaseVNode("span", { class: "rtg-slider-label" }, "Cinematic Film Grain", -1)),
                            createBaseVNode("span", _hoisted_121, toDisplayString(params.film_grain.toFixed(3)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "0.1",
                            step: "0.001",
                            "onUpdate:modelValue": _cache[45] || (_cache[45] = ($event) => params.film_grain = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[46] || (_cache[46] = ($event) => {
                              params.film_grain = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.film_grain,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_122, [
                        _cache[109] || (_cache[109] = createBaseVNode("div", { class: "rtg-group-title" }, "Highlight Bloom", -1)),
                        createBaseVNode("div", _hoisted_123, [
                          createBaseVNode("div", _hoisted_124, [
                            _cache[106] || (_cache[106] = createBaseVNode("span", { class: "rtg-slider-label" }, "Bloom Intensity", -1)),
                            createBaseVNode("span", _hoisted_125, toDisplayString(params.bloom.intensity.toFixed(2)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "2",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[47] || (_cache[47] = ($event) => params.bloom.intensity = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[48] || (_cache[48] = ($event) => {
                              params.bloom.intensity = 0;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.bloom.intensity,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_126, [
                          createBaseVNode("div", _hoisted_127, [
                            _cache[107] || (_cache[107] = createBaseVNode("span", { class: "rtg-slider-label" }, "Highlight Threshold", -1)),
                            createBaseVNode("span", _hoisted_128, toDisplayString(params.bloom.threshold.toFixed(2)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0",
                            max: "1",
                            step: "0.01",
                            "onUpdate:modelValue": _cache[49] || (_cache[49] = ($event) => params.bloom.threshold = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[50] || (_cache[50] = ($event) => {
                              params.bloom.threshold = 0.8;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.bloom.threshold,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_129, [
                          createBaseVNode("div", _hoisted_130, [
                            _cache[108] || (_cache[108] = createBaseVNode("span", { class: "rtg-slider-label" }, "Blur Radius", -1)),
                            createBaseVNode("span", _hoisted_131, toDisplayString(params.bloom.radius.toFixed(2)), 1)
                          ]),
                          withDirectives(createBaseVNode("input", {
                            type: "range",
                            min: "0.5",
                            max: "8",
                            step: "0.05",
                            "onUpdate:modelValue": _cache[51] || (_cache[51] = ($event) => params.bloom.radius = $event),
                            class: "rtg-range",
                            onInput: onParamChange,
                            onDblclick: _cache[52] || (_cache[52] = ($event) => {
                              params.bloom.radius = 2;
                              onParamChange();
                            })
                          }, null, 544), [
                            [
                              vModelText,
                              params.bloom.radius,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ])
                      ])
                    ])) : createCommentVNode("", true)
                  ])
                ])
              ])
            ])
          ], 32)) : createCommentVNode("", true)
        ]))
      ], 544);
    };
  }
});
const RealTimeGradingProcessor = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ac13df8a"]]);
const NODE_CLASS = "Duffy_RealTimeGradingProcessor";
const DEFAULT_SIZE = [440, 380];
const MIN_WIDGET_HEIGHT = 240;
const ISOLATED_EVENTS = ["pointerdown", "mousedown", "mouseup", "dblclick", "wheel"];
app.registerExtension({
  name: "Duffy.RealTimeGradingProcessor.Vue",
  getNodeMenuItems(node) {
    if ((node == null ? void 0 : node.comfyClass) !== NODE_CLASS) return [];
    return [
      {
        content: "Duffy: Open Full-Screen Grading Studio",
        callback: () => {
          var _a, _b;
          (_b = (_a = node.__duffyGradingInstance) == null ? void 0 : _a.openEditor) == null ? void 0 : _b.call(_a);
        }
      }
    ];
  },
  async nodeCreated(node) {
    var _a, _b, _c;
    if (node.comfyClass !== NODE_CLASS) return;
    const findWidget = (name) => {
      var _a2;
      return (_a2 = node.widgets) == null ? void 0 : _a2.find((w) => w.name === name);
    };
    const paramsWidget = findWidget("shader_params");
    const strengthWidget = findWidget("overall_strength");
    if (paramsWidget) {
      paramsWidget.type = "hidden";
      paramsWidget.hidden = true;
      paramsWidget.computeSize = () => [0, -4];
      paramsWidget.draw = () => {
      };
    }
    const container = document.createElement("div");
    container.className = "duffy-realtime-grading-container";
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; position:relative; isolation:isolate;";
    for (const type of ISOLATED_EVENTS) {
      container.addEventListener(type, (event) => event.stopPropagation());
    }
    container.addEventListener("contextmenu", (event) => {
      var _a2, _b2;
      event.preventDefault();
      event.stopPropagation();
      (_b2 = (_a2 = app.canvas) == null ? void 0 : _a2.processContextMenu) == null ? void 0 : _b2.call(_a2, node, event);
    });
    const writeState = (json) => {
      var _a2;
      if (!paramsWidget) return;
      paramsWidget.value = json;
      (_a2 = node.setDirtyCanvas) == null ? void 0 : _a2.call(node, true, true);
    };
    const writeStrength = (val) => {
      var _a2;
      if (!strengthWidget) return;
      strengthWidget.value = val;
      (_a2 = node.setDirtyCanvas) == null ? void 0 : _a2.call(node, true, true);
    };
    const initialParamsStr = typeof (paramsWidget == null ? void 0 : paramsWidget.value) === "string" ? paramsWidget.value : "{}";
    const vueApp = createApp(RealTimeGradingProcessor, {
      getNodeId: () => String(node.id),
      initialParams: initialParamsStr,
      getOverallStrength: () => Number((strengthWidget == null ? void 0 : strengthWidget.value) ?? 1),
      onStateChange: writeState,
      onStrengthChange: writeStrength
    });
    const instance = vueApp.mount(container);
    node.__duffyGradingInstance = instance;
    const domWidget = node.addDOMWidget("realtime_grading_ui", "custom", container, {
      serialize: false,
      hideOnZoom: false,
      getMinHeight: () => MIN_WIDGET_HEIGHT
    });
    domWidget.content = container;
    if (strengthWidget) {
      const originalCallback = strengthWidget.callback;
      strengthWidget.callback = function(...args) {
        var _a2;
        const result = originalCallback == null ? void 0 : originalCallback.apply(this, args);
        (_a2 = instance.setOverallStrength) == null ? void 0 : _a2.call(instance, Number(strengthWidget.value ?? 1));
        return result;
      };
    }
    if (!node.size || node.size[0] < DEFAULT_SIZE[0] || node.size[1] < DEFAULT_SIZE[1]) {
      (_c = node.setSize) == null ? void 0 : _c.call(node, [
        Math.max(((_a = node.size) == null ? void 0 : _a[0]) ?? 0, DEFAULT_SIZE[0]),
        Math.max(((_b = node.size) == null ? void 0 : _b[1]) ?? 0, DEFAULT_SIZE[1])
      ]);
    }
    const originalConfigure = node.configure;
    node.configure = function(info) {
      var _a2, _b2;
      const result = originalConfigure == null ? void 0 : originalConfigure.apply(this, arguments);
      if (typeof (paramsWidget == null ? void 0 : paramsWidget.value) === "string" && paramsWidget.value.trim()) {
        (_a2 = instance.hydrateState) == null ? void 0 : _a2.call(instance, paramsWidget.value);
      }
      if (strengthWidget) {
        (_b2 = instance.setOverallStrength) == null ? void 0 : _b2.call(instance, Number(strengthWidget.value ?? 1));
      }
      return result;
    };
    const originalExecuted = node.onExecuted;
    node.onExecuted = function(message) {
      var _a2, _b2, _c2, _d, _e, _f;
      originalExecuted == null ? void 0 : originalExecuted.apply(this, arguments);
      const originalThumb = (_a2 = message == null ? void 0 : message.original_thumbnail) == null ? void 0 : _a2[0];
      const processedThumb = ((_b2 = message == null ? void 0 : message.grading_result) == null ? void 0 : _b2[0]) ?? ((_c2 = message == null ? void 0 : message.processed_thumbnail) == null ? void 0 : _c2[0]);
      const histogram = (_d = message == null ? void 0 : message.histogram) == null ? void 0 : _d[0];
      const savedState = (_e = message == null ? void 0 : message.grading_state) == null ? void 0 : _e[0];
      if (typeof savedState === "string" && savedState.length < 5e5) {
        writeState(savedState);
      }
      (_f = instance.setExecutionResult) == null ? void 0 : _f.call(instance, {
        originalThumb,
        processedThumb,
        histogram,
        savedState
      });
    };
    const originalRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      delete node.__duffyGradingInstance;
      (_a2 = instance.cleanup) == null ? void 0 : _a2.call(instance);
      vueApp.unmount();
      originalRemoved == null ? void 0 : originalRemoved.apply(this, arguments);
    };
  }
});
