const CACHE_NAME = 'geofish-static-v20';
const TILES_CACHE_NAME = 'geofish-tiles-v1';

// Arquivos fundamentais do Shell da aplicação (GeoJSONs removidos para não dar redundância com o IndexedDB)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './manifest.json',
  './lib/leaflet/leaflet.css',
  './lib/leaflet/leaflet.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

// 1. Instalação: Cacheia os arquivos essenciais do sistema
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Ativação: Limpeza de caches obsoletos de versões anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== TILES_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. Interceptador de Tiles do mapa
  if (url.hostname.includes('arcgisonline.com')) {
    event.respondWith(
      caches.open(TILES_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Se estiver offline e não tiver o tile em cache, retorna vazio
          return new Response('', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        }
      })
    );
    return;
  }

  // B. Bypass para GeoJSON: Deixa a responsabilidade offline APENAS para o IndexedDB
  if (url.pathname.endsWith('.geojson')) {
    // Tenta ir pra rede. Se falhar, o erro cai lá no carregarCamadaComCache do app.js
    event.respondWith(fetch(event.request));
    return;
  }

  // C. Arquivos da aplicação (Cache-First com fallback de rede)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      if (event.request.headers.get('accept').includes('text/html')) {
        return caches.match('./index.html');
      }
    })
  );
});
