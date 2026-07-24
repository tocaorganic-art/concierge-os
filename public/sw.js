// Service Worker — Toca Concierge PWA
// Cache offline para funcionamento sem internet

const CACHE_NAME = 'toca-concierge-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Instala: pré-cacheia recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Ativa: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first com fallback para cache (app-shell)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignora requisições não-GET (APIs POST, etc.)
  if (request.method !== 'GET') return;

  // Ignora requisições para APIs externas
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Sucesso online: atualiza o cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => {
        // Offline: serve do cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Fallback para a home em navegação
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
