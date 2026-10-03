// GeoFish MS - Service Worker PWA (Offline & Cache Governance)
const CACHE_VERSION = 'geofish-shell-v7';
const TILES_CACHE_NAME = 'geofish-tiles-v1';
const GEOJSON_CACHE_NAME = 'geofish-geojson-v2';
const MAX_TILES = 1500;

// Transparent 1x1 PNG fallback for missing offline tiles
const TRANSPARENT_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

const SHELL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './manifest.json',
  './lib/leaflet/leaflet.css',
  './lib/leaflet/leaflet.js',
  './lib/leaflet/images/marker-icon.png',
  './lib/leaflet/images/marker-icon-2x.png',
  './lib/leaflet/images/marker-shadow.png',
  './lib/leaflet/images/layers.png',
  './lib/leaflet/images/layers-2x.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

// Helper to trim cache size (FIFO LRU)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const excess = keys.length - maxItems;
      for (let i = 0; i < excess; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    // Non-fatal cache eviction error
  }
}

// 1. Instalação: Pré-cache do App Shell com cache: 'reload'
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Add each asset with cache reload
      const promises = SHELL_ASSETS.map((asset) => {
        return fetch(asset, { cache: 'reload' })
          .then((res) => {
            if (res.ok) {
              return cache.put(asset, res);
            }
          })
          .catch((err) => {
            console.warn(`Pré-cache falhou para ${asset}:`, err);
          });
      });
      return Promise.all(promises);
    }).then(() => self.skipWaiting())
  );
});

// 2. Ativação: Limpeza de caches geofish-* obsoletos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const allowedCaches = [CACHE_VERSION, TILES_CACHE_NAME, GEOJSON_CACHE_NAME];
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('geofish-') && !allowedCaches.includes(key)) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Apenas métodos GET são armazenados em cache
  if (request.method !== 'GET') {
    return;
  }

  // A. Mapa base (Tiles da Esri): Cache-First com limite de ~1.500 tiles
  if (url.hostname.includes('arcgisonline.com')) {
    event.respondWith(
      caches.open(TILES_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }

        try {
          const networkResponse = await fetch(request);
          // Só armazena respostas válidas status 200 (não opacas status 0)
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            // Gerencia limite do cache em segundo plano
            trimCache(TILES_CACHE_NAME, MAX_TILES);
          }
          return networkResponse;
        } catch (err) {
          // Offline e tile não existe no cache: entrega PNG transparente
          return new Response(TRANSPARENT_PNG, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'no-store'
            }
          });
        }
      })
    );
    return;
  }

  // B. Camadas de dados GeoJSON: Rede primeiro com chave sem query string
  if (url.pathname.endsWith('.geojson')) {
    const cleanUrl = url.origin + url.pathname;
    event.respondWith(
      caches.open(GEOJSON_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request, { cache: 'no-cache' });
          if (networkResponse && networkResponse.status === 200) {
            cache.put(cleanUrl, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          const cached = await cache.match(cleanUrl);
          if (cached) {
            return cached;
          }
          throw err;
        }
      })
    );
    return;
  }

  // C. App Shell (HTML, CSS, JS, Leaflet, Icons): Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);

      // Dispara revalidação em segundo plano
      const fetchPromise = fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback para index.html em navegações offline
          if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
            return cache.match('./index.html');
          }
        });

      // Retorna o cache imediatamente (Stale), se disponível; caso contrário, espera a rede
      return cached || fetchPromise;
    })
  );
});
