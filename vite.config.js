import { defineConfig } from 'vite';
import { precacheManifest } from './scripts/vite-plugin-precache.js';

export default defineConfig({
  base: './',
  plugins: [precacheManifest({ maxBytes: 300 * 1024 })],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 3000, host: '0.0.0.0' },
});
