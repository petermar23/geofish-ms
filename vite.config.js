import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function pwaDistBuildPlugin() {
  return {
    name: 'pwa-dist-build',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      // 1. Copia recursos estáticos obrigatórios para dist/
      const items = ['data', 'images', 'lib', 'icons', 'docs', 'LICENSE', 'manifest.json'];
      for (const item of items) {
        const src = path.resolve(__dirname, item);
        const dest = path.resolve(distDir, item);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true, force: true });
        }
      }

      // 2. Adapta o sw.js para dist/ incluindo os bundles com hash gerados pelo Vite
      const swSrcPath = path.resolve(__dirname, 'sw.js');
      const swDestPath = path.resolve(distDir, 'sw.js');
      if (fs.existsSync(swSrcPath)) {
        let swContent = fs.readFileSync(swSrcPath, 'utf8');

        // Localiza assets compilados na pasta dist/assets
        const assetsDir = path.resolve(distDir, 'assets');
        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir);
          const bundleFiles = files
            .filter(f => f.endsWith('.js') || f.endsWith('.css'))
            .map(f => `./assets/${f}`);

          if (bundleFiles.length > 0) {
            // Substitui ./css/style.css e ./js/app.js pelos bundles reais de produção
            const regexShell = /const SHELL_ASSETS = \[([\s\S]*?)\];/;
            const match = swContent.match(regexShell);
            if (match) {
              const assetsArray = match[1]
                .split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.includes('./css/style.css') && !l.includes('./js/app.js'))
                .concat(bundleFiles.map(b => `  '${b}',`));

              const novoShell = `const SHELL_ASSETS = [\n  ${assetsArray.join('\n  ')}\n];`;
              swContent = swContent.replace(regexShell, novoShell);
            }
          }
        }

        fs.writeFileSync(swDestPath, swContent, 'utf8');
      }

      console.log('[Vite Build] PWA dist otimizado com manifest.json e sw.js sincronizados.');
    }
  };
}

export default defineConfig({
  base: './',
  root: '.',
  publicDir: false,
  plugins: [pwaDistBuildPlugin()],
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
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('manifest.json')) {
            return 'manifest.json';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
