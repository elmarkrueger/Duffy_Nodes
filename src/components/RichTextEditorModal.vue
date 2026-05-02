<template>
  <div class="rtn-modal" @click.stop>
    <div class="rtn-modal-header">
      <h3>Rich Text Editor</h3>
    </div>

    <div class="rtn-toolbar" v-if="editor">
      <button
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ active: editor.isActive('bold') }"
        title="Bold (Ctrl+B)"
      ><strong>B</strong></button>
      <button
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ active: editor.isActive('italic') }"
        title="Italic (Ctrl+I)"
      ><em>I</em></button>
      <button
        @click="editor.chain().focus().toggleUnderline().run()"
        :class="{ active: editor.isActive('underline') }"
        title="Underline (Ctrl+U)"
      ><u>U</u></button>
      <span class="rtn-toolbar-sep"></span>

      <select
        @change="setHeading($event)"
        :value="currentHeading"
      >
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <span class="rtn-toolbar-sep"></span>

      <button
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ active: editor.isActive('bulletList') }"
        title="Bullet List"
      >&#8226; List</button>
      <button
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ active: editor.isActive('orderedList') }"
        title="Ordered List"
      >1. List</button>
      <button
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="{ active: editor.isActive('blockquote') }"
        title="Blockquote"
      >&ldquo; Quote</button>
      <span class="rtn-toolbar-sep"></span>

      <button
        @click="editor.chain().focus().setTextAlign('left').run()"
        :class="{ active: editor.isActive({ textAlign: 'left' }) }"
        title="Align Left"
      >&#8592;</button>
      <button
        @click="editor.chain().focus().setTextAlign('center').run()"
        :class="{ active: editor.isActive({ textAlign: 'center' }) }"
        title="Center"
      >&#8596;</button>
      <button
        @click="editor.chain().focus().setTextAlign('right').run()"
        :class="{ active: editor.isActive({ textAlign: 'right' }) }"
        title="Align Right"
      >&#8594;</button>
      <span class="rtn-toolbar-sep"></span>

      <button
        @click="toggleLink"
        :class="{ active: editor.isActive('link') }"
        title="Insert Link"
      >Link</button>
      <span class="rtn-toolbar-sep"></span>

      <div class="rtn-color-group" title="Text Color">
        <input
          type="color"
          class="rtn-color-input"
          @input="setColor(($event.target as HTMLInputElement).value)"
          :value="editor?.getAttributes('textStyle').color || '#ffffff'"
        />
        <button
          @click="editor?.chain().focus().unsetColor().run()"
          class="rtn-color-clear"
          title="Clear Color"
        >C</button>
      </div>
      <span class="rtn-toolbar-sep"></span>

      <button
        @click="addDownloadLink"
        title="Insert Download Link"
      >&#8595; DL</button>
    </div>

    <div class="rtn-modal-body">
      <editor-content :editor="editor" class="rtn-editor-content" />
    </div>

    <div class="rtn-modal-footer">
      <button class="rtn-cancel-btn" @click="$emit('cancel')">Cancel</button>
      <button class="rtn-save-btn" @click="save">Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { DownloadLink } from "../extensions/DownloadLink";

const props = defineProps<{
  initialHtml?: string;
}>();

const emit = defineEmits<{
  save: [html: string];
  cancel: [];
}>();

const currentHeading = ref("p");

const editor = useEditor({
  content: props.initialHtml || "<p>Start typing...</p>",
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Underline,
    TextStyle,
    Color,
    DownloadLink,
    Placeholder.configure({
      placeholder: "Start typing your rich text note...",
    }),
  ],
  onUpdate: ({ editor: ed }) => {
    for (const level of [1, 2, 3]) {
      if (ed.isActive("heading", { level })) {
        currentHeading.value = `h${level}`;
        return;
      }
    }
    currentHeading.value = "p";
  },
});

function setHeading(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value === "p") {
    editor.value?.chain().focus().setParagraph().run();
  } else {
    const level = parseInt(value.charAt(1));
    editor.value?.chain().focus().toggleHeading({ level }).run();
  }
}

function toggleLink() {
  if (!editor.value) return;

  if (editor.value.isActive("link")) {
    editor.value.chain().focus().unsetLink().run();
    return;
  }

  const previousUrl = editor.value.getAttributes("link").href;
  let url = window.prompt("Enter URL", previousUrl || "https://");
  if (url === null) return;

  if (url === "") {
    editor.value.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  // Ensure absolute URL if not a relative path starting with / or # and no protocol
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/") && !url.startsWith("#")) {
    url = "https://" + url;
  }

  if (editor.value.state.selection.empty) {
    editor.value
      .chain()
      .focus()
      .insertContent(`<a href="${url}">${url}</a>`)
      .run();
  } else {
    editor.value
      .chain()
      .focus()
      .setLink({ href: url })
      .run();
  }
}

function setColor(color: string) {
  editor.value?.chain().focus().setColor(color).run();
}

function addDownloadLink() {
  if (!editor.value) return;

  let url = window.prompt("Enter download URL:", "https://");
  if (!url) return;

  // Ensure absolute URL if not a relative path starting with / or # and no protocol
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/") && !url.startsWith("#")) {
    url = "https://" + url;
  }

  const label = window.prompt("Enter button label:", "Download") || "Download";
  const quote = window.prompt(
    "Enter quote text (optional, e.g. 'Save to models/checkpoints/'):",
    ""
  );

  editor.value
    .chain()
    .focus()
    .setDownloadLink({ url, label, quote })
    .run();
}

function save() {
  if (!editor.value) return;
  const html = editor.value.getHTML();
  emit("save", html);
}

onBeforeUnmount(() => {
  editor.value?.destroy();
});

defineExpose({ getHTML: () => editor.value?.getHTML() || "" });
</script>

<style scoped>
.rtn-modal {
  display: flex;
  flex-direction: column;
  width: 700px;
  max-width: 90vw;
  height: 600px;
  max-height: 90vh;
  background: var(--comfy-menu-bg, #2a2a2a);
  border: 1px solid var(--comfy-input-border, #555);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.rtn-modal-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--comfy-input-border, #444);
  flex-shrink: 0;
}

.rtn-modal-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.rtn-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--comfy-input-border, #444);
  background: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.rtn-toolbar button {
  padding: 4px 8px;
  background: transparent;
  color: var(--comfy-text-normal, #ddd);
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  min-width: 28px;
  text-align: center;
}

.rtn-toolbar button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.rtn-toolbar button.active {
  background: rgba(100, 181, 246, 0.25);
  border-color: rgba(100, 181, 246, 0.4);
}

.rtn-toolbar select {
  padding: 3px 6px;
  background: var(--comfy-input-bg, #333);
  color: var(--comfy-text-normal, #ddd);
  border: 1px solid var(--comfy-input-border, #555);
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
}

.rtn-toolbar-sep {
  width: 1px;
  height: 18px;
  background: var(--comfy-input-border, #555);
  margin: 0 4px;
  display: inline-block;
}

.rtn-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  min-height: 0;
}

.rtn-editor-content {
  padding: 16px;
  min-height: 100%;
  outline: none;
}

.rtn-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--comfy-input-border, #444);
  flex-shrink: 0;
}

.rtn-cancel-btn,
.rtn-save-btn {
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  border: 1px solid var(--comfy-input-border, #555);
}

.rtn-cancel-btn {
  background: var(--comfy-input-bg, #333);
  color: var(--comfy-text-normal, #ddd);
}

.rtn-save-btn {
  background: rgba(76, 175, 80, 0.3);
  color: #a5d6a7;
  border-color: rgba(76, 175, 80, 0.5);
  font-weight: 600;
}

.rtn-cancel-btn:hover {
  background: var(--comfy-input-hover, #444);
}

.rtn-color-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.rtn-color-input {
  width: 22px;
  height: 22px;
  border: 1px solid var(--comfy-input-border, #555);
  border-radius: 2px;
  padding: 0;
  cursor: pointer;
  background: none;
}

.rtn-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.rtn-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 1px;
}

.rtn-color-clear {
  padding: 2px 5px;
  background: transparent;
  color: var(--comfy-text-normal, #ddd);
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.rtn-color-clear:hover {
  background: rgba(255, 80, 80, 0.2);
}

.rtn-save-btn:hover {
  background: rgba(76, 175, 80, 0.5);
}
</style>

<style>
.ProseMirror {
  outline: none;
  min-height: 300px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--comfy-text-normal, #ddd);
}

.ProseMirror p { margin: 6px 0; }
.ProseMirror h1 { font-size: 22px; margin: 12px 0 6px; font-weight: 700; }
.ProseMirror h2 { font-size: 18px; margin: 10px 0 5px; font-weight: 600; }
.ProseMirror h3 { font-size: 16px; margin: 8px 0 4px; font-weight: 600; }
.ProseMirror ul, .ProseMirror ol { padding-left: 24px; margin: 6px 0; }
.ProseMirror li { margin: 2px 0; }
.ProseMirror blockquote {
  border-left: 3px solid var(--comfy-input-border, #666);
  padding-left: 12px;
  margin: 8px 0;
  color: #aaa;
  font-style: italic;
}
.ProseMirror a { color: #64b5f6; text-decoration: underline; cursor: pointer; }
.ProseMirror code {
  background: rgba(0,0,0,0.3);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 13px;
}
.ProseMirror pre {
  background: rgba(0,0,0,0.4);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}
.ProseMirror pre code {
  background: none;
  padding: 0;
}
.ProseMirror hr {
  border: none;
  border-top: 1px solid var(--comfy-input-border, #555);
  margin: 12px 0;
}

.ProseMirror p.is-editor-empty:first-child::before {
  color: #666;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.ProseMirror .rtn-dl-nodeview {
  display: block;
  margin: 10px 0;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px dashed var(--comfy-input-border, #666);
  border-radius: 6px;
  text-align: center;
  cursor: default;
}

.ProseMirror .rtn-dl-nodeview-button {
  display: inline-block;
  padding: 8px 22px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: default;
  opacity: 0.85;
}

.ProseMirror .rtn-dl-nodeview-quote {
  margin-top: 6px;
  font-size: 11px;
  color: #999;
  font-style: italic;
}
</style>
