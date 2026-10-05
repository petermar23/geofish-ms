import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyStaticAssets() {
  return {
    name: 'copy-static-assets',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      const items = ['data', 'images', 'lib', 'manifest.json', 'sw.js', 'favicon.ico'];
      for (const item of items) {
        const src = path.resolve(__dirname, item);
        const dest = path.resolve(distDir, item);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true, force: true });
        }
      }
      console.log('[Vite Build] Recursos estáticos (data, images, lib, sw.js, manifest.json) copiados para dist/.');
    }
  };
}

export default defineConfig({
  root: '.',
  publicDir: false,
  plugins: [copyStaticAssets()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});
