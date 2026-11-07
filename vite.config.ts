import { defineConfig } from 'vite';

// Landing page: `npm run build` writes it to dist/ for the static deploy.
export default defineConfig({
  root: 'site',
  server: { port: 5177, strictPort: true },
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022' },
});
