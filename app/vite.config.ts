import { defineConfig } from 'vite';

// Mochi window UI: Tauri loads it from the dev server or app/dist.
export default defineConfig({
  root: 'app',
  clearScreen: false,
  server: { port: 1427, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
});
