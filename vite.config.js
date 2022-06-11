import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { chromeExtension } from "vite-plugin-chrome-extension";
import WindiCSS from 'vite-plugin-windicss';
import preprocess from 'svelte-preprocess';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: "src/manifest.json",
    },
  },
  plugins: [
    svelte({
      preprocess: [
        preprocess(),
      ],
    }),
    WindiCSS(),
    chromeExtension(),
  ],
  rollupDedupe: ['svelte'],
});
