// scripts/vite-plugin-precache.js
// Gera a lista de pré-cache a partir do dist e injeta versão e lista no sw.js
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function precacheManifest({ maxBytes = 300 * 1024 } = {}) {
  return {
    name: 'geofish-precache',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve('dist');
      if (!fs.existsSync(dist)) return;
      const files = [];
      const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) walk(full);
          else files.push(path.relative(dist, full).split(path.sep).join('/'));
        }
      };
      walk(dist);
      const list = files
        .filter((f) => f !== 'sw.js' && fs.statSync(path.join(dist, f)).size <= maxBytes)
        .sort();
      const hash = crypto.createHash('sha1');
      for (const f of list) hash.update(f).update(fs.readFileSync(path.join(dist, f)));
      const version = hash.digest('hex').slice(0, 10);
      const swPath = path.join(dist, 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const sw = fs
        .readFileSync(swPath, 'utf8')
        .replace(`['__PRECACHE_LIST__']`, () => JSON.stringify(['./', ...list.map((f) => './' + f)]))
        .replaceAll('__CACHE_VERSION__', version);
      fs.writeFileSync(swPath, sw);
    },
  };
}
