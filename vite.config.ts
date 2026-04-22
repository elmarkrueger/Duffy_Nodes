import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import cssInjectedByJs from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [vue(), cssInjectedByJs({ topExecutionPriority: false })],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  build: {
    emptyOutDir: false,
    lib: { 
      entry: {
        interactive_relight: "./src/interactive_relight.ts",
        advanced_layer_control: "./src/advanced_layer_control.ts",
        advanced_image_adjuster: "./src/advanced_image_adjuster.ts",
        advanced_text_overlay: "./src/advanced_text_overlay.ts",
        advanced_connected_image_stitch: "./src/advanced_connected_image_stitch.ts",
        lora_loader: "./src/lora_loader.ts",
        prompt_box: "./src/prompt_box.ts",
        load_image_resize: "./src/load_image_resize.ts",
        show_anything: "./src/show_anything.ts",
        native_group_controller: "./src/native_group_controller.ts"
      },
      formats: ["es"]
    },
    rollupOptions: {
      external: ["COMFY_APP", "COMFY_API"],
      output: {
        dir: "web/js",
        entryFileNames: "[name].js",
        paths: {
          "COMFY_APP": "../../../scripts/app.js",
          "COMFY_API": "../../../scripts/api.js"
        }
      },
    },
    minify: false,
  }
});
