<template>
  <div class="rtn-widget">
    <div class="rtn-header">
      <button class="rtn-editor-btn" @click.stop="openEditor">
        Open Editor
      </button>
    </div>
    <div class="rtn-content" ref="contentRef" v-html="sanitizedHtml" @click="handleContentClick"></div>

    <Teleport to="body">
      <div
        v-if="editorVisible"
        class="rtn-modal-overlay"
        @click.self="cancelEdit"
      >
        <RichTextEditorModal
          :initial-html="workingHtml"
          @save="saveEdit"
          @cancel="cancelEdit"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import DOMPurify from "dompurify";
import RichTextEditorModal from "./RichTextEditorModal.vue";

const props = defineProps<{
  initialHtml?: string;
  onChange?: (html: string) => void;
}>();

const htmlContent = ref(props.initialHtml || "");
const editorVisible = ref(false);
const workingHtml = ref("");

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code", "hr",
  "span", "div",
  "a",
  "svg", "path", "g",
];

const ALLOWED_ATTR = [
  "style", "class", "href", "target", "rel",
  "src", "alt", "width", "height",
  "data-type", "data-name", "data-size", "data-color", "data-stroke",
  "viewBox", "xmlns", "d", "fill", "stroke", "stroke-width",
  "text-align",
];

const sanitizedHtml = computed(() => {
  return DOMPurify.sanitize(htmlContent.value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
  });
});

function openEditor() {
  workingHtml.value = htmlContent.value;
  editorVisible.value = true;
}

function saveEdit(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
  });
  htmlContent.value = clean;
  editorVisible.value = false;
  props.onChange?.(clean);
}

function cancelEdit() {
  editorVisible.value = false;
}

function deserialise(html: string) {
  htmlContent.value = html || "";
}

function serialise(): string {
  return htmlContent.value;
}

function cleanup() {}

const contentRef = ref<HTMLDivElement | null>(null);

watch(sanitizedHtml, () => {
  nextTick(() => {
    renderDownloadLinks();
  });
}, { immediate: true });

function renderDownloadLinks() {
  if (!contentRef.value) return;
  const containers = contentRef.value.querySelectorAll<HTMLElement>(
    '[data-type="download-link"]'
  );
  for (const container of containers) {
    container.innerHTML = "";
    const url = container.dataset.url || "";
    const label = container.dataset.label || "Download";
    const quote = container.dataset.quote || "";

    const btn = document.createElement("button");
    btn.className = "rtn-dl-button";
    btn.textContent = label;
    container.appendChild(btn);

    if (quote) {
      const quoteEl = document.createElement("div");
      quoteEl.className = "rtn-dl-quote-text";
      quoteEl.textContent = quote;
      container.appendChild(quoteEl);
    }
  }
}

function handleContentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;

  // Intercept standard anchor links to ensure absolute URLs
  const anchor = target.closest("a");
  if (anchor) {
    let url = anchor.getAttribute("href");
    if (url && !/^https?:\/\//i.test(url) && !url.startsWith("/") && !url.startsWith("#")) {
      e.preventDefault();
      e.stopPropagation();
      window.open("https://" + url, anchor.getAttribute("target") || "_self");
      return;
    }
  }

  const btn = target.closest(".rtn-dl-button") as HTMLElement | null;
  if (btn) {
    const wrapper = btn.closest(
      '[data-type="download-link"]'
    ) as HTMLElement | null;
    if (wrapper?.dataset.url) {
      e.preventDefault();
      e.stopPropagation();
      let url = wrapper.dataset.url;
      if (!/^https?:\/\//i.test(url) && !url.startsWith("/") && !url.startsWith("#")) {
        url = "https://" + url;
      }
      window.open(url, "_blank");
      return;
    }
  }
}

defineExpose({ deserialise, serialise, cleanup });
</script>

<style scoped>
.rtn-widget {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--comfy-menu-bg, #222);
  color: var(--comfy-text-normal, #ddd);
  border-radius: 6px;
  box-sizing: border-box;
  overflow: hidden;
}

.rtn-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid var(--comfy-input-border, #444);
  flex-shrink: 0;
}

.rtn-editor-btn {
  width: 100%;
  padding: 4px 12px;
  background: var(--comfy-input-bg, #333);
  color: var(--comfy-text-normal, #ddd);
  border: 1px solid var(--comfy-input-border, #555);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  transition: background 0.15s;
}

.rtn-editor-btn:hover {
  background: var(--comfy-input-hover, #444);
}

.rtn-content {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.5;
  word-wrap: break-word;
}

.rtn-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}
</style>

<style>
.rtn-content h1 { font-size: 18px; margin: 8px 0 4px; }
.rtn-content h2 { font-size: 16px; margin: 6px 0 4px; }
.rtn-content h3 { font-size: 14px; margin: 6px 0 4px; }
.rtn-content p { margin: 4px 0; }
.rtn-content ul, .rtn-content ol { padding-left: 20px; margin: 4px 0; }
.rtn-content li { margin: 2px 0; }
.rtn-content blockquote {
  border-left: 3px solid var(--comfy-input-border, #555);
  padding-left: 10px;
  margin: 4px 0;
  color: #aaa;
}
.rtn-content a { color: #64b5f6; text-decoration: underline; }
.rtn-content code {
  background: rgba(0,0,0,0.3);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}
.rtn-content pre {
  background: rgba(0,0,0,0.3);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
}

.rtn-content [data-type="download-link"] {
  display: block;
  margin: 8px 0;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--comfy-input-border, #555);
  border-radius: 6px;
  text-align: center;
  transition: border-color 0.15s;
}

.rtn-content [data-type="download-link"]:hover {
  border-color: #4a90d9;
}

.rtn-content .rtn-dl-button {
  display: inline-block;
  padding: 7px 20px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s;
  line-height: 1.4;
}

.rtn-content .rtn-dl-button:hover {
  background: #357abd;
}

.rtn-content .rtn-dl-button:active {
  background: #2a5f9e;
}

.rtn-content .rtn-dl-quote-text {
  margin-top: 6px;
  font-size: 11px;
  color: #aaa;
  font-style: italic;
  line-height: 1.4;
}
</style>
