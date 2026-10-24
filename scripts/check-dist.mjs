// scripts/check-dist.mjs
// Valida o build do PWA. Uso: npm run build && node scripts/check-dist.mjs
import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist';
let ok = true;
const fail = (m) => { console.error('ERRO:', m); ok = false; };
const read = (f) => fs.readFileSync(path.join(dist, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(dist, f));
const rel = (p) => (p.startsWith('./') ? p.slice(2) : p);

if (!exists('sw.js')) {
  fail('sw.js não encontrado no diretório dist');
} else {
  const sw = read('sw.js');
  if (sw.includes('__PRECACHE_LIST__') || sw.includes('__CACHE_VERSION__')) fail('placeholders do sw.js não foram substituídos');
  const marca = 'const PRECACHE_LIST = ';
  const ini = sw.indexOf(marca);
  if (ini < 0) fail('PRECACHE_LIST não encontrado em sw.js');
  else {
    const lista = JSON.parse(sw.slice(ini + marca.length, sw.indexOf(';', ini)));
    for (const p of lista) if (!exists(rel(p) || 'index.html')) fail('pré-cache aponta para arquivo inexistente: ' + p);
  }
}

if (!exists('index.html')) {
  fail('index.html não encontrado no diretório dist');
} else {
  const html = read('index.html');
  const tag = (html.match(/<link[^>]*manifest[^>]*>/) || [''])[0];
  const m = /href=([^ >]+)/.exec(tag);
  if (!m) fail('index.html sem link rel=manifest');
  else {
    const href = rel(m[1].replace(/['\"]/g, ''));
    if (href.startsWith('assets/')) fail('manifest foi processado/hasheado pelo Vite: ' + href);
    else if (!exists(href)) fail('manifest inexistente: ' + href);
    else {
      const man = JSON.parse(read(href));
      const dir = path.dirname(href);
      const alvo = (u) => path.normalize(path.join(dir, u));
      if (!exists(alvo(man.start_url))) fail('start_url inexistente: ' + man.start_url);
      for (const i of man.icons || []) if (!exists(alvo(i.src))) fail('ícone inexistente: ' + i.src);
    }
  }
}

console.log(ok ? 'dist consistente' : 'dist com problemas');
process.exit(ok ? 0 : 1);
