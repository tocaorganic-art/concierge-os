const CACHE_VERSION = 'toca-concierge-v8';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip API/auth calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Nunca intercepta os arquivos internos do Vite nem chunks de JS/CSS do dev
  // server — servi-los do cache entrega código antigo misturado com novo e
  // quebra o React (erro de hook nulo / "useState" de null).
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname === '/sw.js'
  ) return;

  // Chunks de JS/CSS: NUNCA servem do cache primeiro — código velho
  // misturado com novo duplica o React e trava a tela (preta) após o
  // login. Rede primeiro; o cache fica só como fallback offline.
  const isCodeAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    /\.(js|css|mjs)(\?|$)/.test(url.pathname + url.search);
  if (isCodeAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for navigation requests, fallback to cache.
  // Nunca cacheia uma navegação que carregue token/credencial na query string
  // (retorno do login: ?access_token=...&clear_access_token=...) — cada login
  // gera uma URL diferente, então isso acumulava uma entrada nova de cache por
  // login, para sempre, sem nunca ser limpo (só CACHE_VERSION antigo é
  // purgado). Com uso normal ao longo do tempo esse cache incha até o
  // navegador ficar sem memória ao processar o Service Worker (Out of
  // Memory) — sempre visto ao entrar recém-convidado, exatamente quando o
  // token chega na URL pela primeira vez. Buscar da rede sem gravar no cache
  // resolve; a página final já não tem o token (removido do histórico pelo
  // app-params.js antes de qualquer navegação subsequente).
  const hasAuthParams = url.searchParams.has('access_token') || url.searchParams.has('clear_access_token');
  if (request.mode === 'navigate') {
    if (hasAuthParams) {
      event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
      return;
    }
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
