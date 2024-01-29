import { defineConfig } from "vite";
import dynamicImport from 'vite-plugin-dynamic-import';
import viteCompression from 'vite-plugin-compression';
import removeConsole from "vite-plugin-remove-console";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  root: "./src",
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  build: { outDir: "../dist" },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  plugins: [
    dynamicImport(),
    viteCompression(),
    removeConsole()
  ]
}));
