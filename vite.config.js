import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { chromeExtension } from "vite-plugin-chrome-extension";
import WindiCSS from 'vite-plugin-windicss';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: "src/manifest.json"
    }
  },
  plugins: [
    svelte({}),
    WindiCSS({
      configFiles: ["./windi.config.ts"],
    }),
    chromeExtension(),
  ],
});
