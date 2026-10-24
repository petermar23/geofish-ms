const CACHE_VERSION = 'geofish-shell-__CACHE_VERSION__';
const PRECACHE_LIST = ['__PRECACHE_LIST__'];
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
      // Add each asset with cache reload and individual fault tolerance
      const promises = PRECACHE_LIST.map((asset) => {
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

  // Requisições com cabeçalho Range (áudio/vídeo/mídia parcial) são tratadas nativamente pelo navegador
  // pois a Cache API não suporta respostas HTTP 206 (Partial Content)
  if (request.headers.has('range')) {
    return;
  }

  // A. Mapa base (Tiles da Esri): Cache-First com limite LRU de ~1.500 tiles
  if (url.hostname.includes('arcgisonline.com')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(TILES_CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            event.waitUntil(
              cache.put(request, networkResponse.clone()).then(() => {
                trimCache(TILES_CACHE_NAME, MAX_TILES);
              })
            );
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
      })()
    );
    return;
  }

  // B. Camadas de dados GeoJSON: Rede com timeout (2.5s) para conexões lentas no rio e fallback imediato ao cache
  if (url.pathname.endsWith('.geojson')) {
    const cleanUrl = url.origin + url.pathname;
    event.respondWith(
      (async () => {
        const cache = await caches.open(GEOJSON_CACHE_NAME);

        // Timeout para evitar congelamento de 60s+ em sinal fraco (2G/EDGE) no Pantanal
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        try {
          const networkResponse = await fetch(request, {
            cache: 'no-cache',
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            event.waitUntil(cache.put(cleanUrl, networkResponse.clone()));
          }
          return networkResponse;
        } catch (err) {
          clearTimeout(timeoutId);
          const cached = await cache.match(cleanUrl);
          if (cached) {
            return cached;
          }
          // Se não há cache nem rede, retorna 503 com cabeçalho explícito para que a aplicação
          // saiba que o recurso está offline e JAMAIS sobrescreva dados úteis existentes no IndexedDB
          return new Response(JSON.stringify({ type: 'FeatureCollection', features: [], offline_fallback: true }), {
            status: 503,
            statusText: 'Service Unavailable (Offline Layer)',
            headers: {
              'Content-Type': 'application/json',
              'X-GeoFish-Fallback': 'offline-empty'
            }
          });
        }
      })()
    );
    return;
  }

  // C. App Shell (HTML, CSS, JS, Leaflet, Ícones e Fontes): Stale-While-Revalidate com fallbacks seguros
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);

      const fetchPromise = (async () => {
        try {
          const networkResponse = await fetch(request, { cache: 'no-cache' });
          if (networkResponse && networkResponse.status === 200) {
            event.waitUntil(cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        } catch (err) {
          return null;
        }
      })();

      // Se temos em cache, entrega imediatamente e atualiza em segundo plano
      if (cached) {
        event.waitUntil(fetchPromise);
        return cached;
      }

      // Se não temos em cache, aguarda a rede
      const networkResponse = await fetchPromise;
      if (networkResponse) {
        return networkResponse;
      }

      // Se offline e o recurso não estava no cache, NUNCA retorna undefined (evita TypeError no respondWith)
      // 1. Navegação de página -> index.html em cache
      if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
        const fallbackHtml = await cache.match('./index.html');
        if (fallbackHtml) return fallbackHtml;
      }

      // 2. Imagens -> PNG transparente
      if (request.headers.get('accept') && request.headers.get('accept').includes('image/')) {
        return new Response(TRANSPARENT_PNG, {
          status: 200,
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }
        });
      }

      // 3. Demais recursos -> 503 Service Unavailable (Offline)
      return new Response('Recurso indisponível em modo offline.', {
        status: 503,
        statusText: 'Service Unavailable (Offline)',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })()
  );
});

// Listener de mensagens para controle do Service Worker
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'PRECACHE_CHECK') {
    // Garante validação dos assets fundamentais
    caches.open(CACHE_VERSION).then((cache) => {
      cache.match('./index.html').then((resp) => {
        if (!resp) {
          cache.addAll(PRECACHE_LIST).catch((e) => console.warn('[SW] Falha ao pre-cachear:', e));
        }
      });
    });
  }
});
