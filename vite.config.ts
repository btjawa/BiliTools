import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import viteCompression from 'vite-plugin-compression';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'markdown-style' || tag === 'gap',
        },
      },
    }),
    viteCompression(),
    tailwindcss(),
  ],

  resolve: {
    alias: { '@': '/src' },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        sourcemapPathTransform: (rel, src) =>
          '/' +
          path
            .relative(process.cwd(), path.resolve(path.dirname(src), rel))
            .replace(/\\/g, '/'),
      },
    },
    target: 'ESNext',
  },
});
