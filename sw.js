const CACHE_NAME = 'rdp-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap'
];

// Instala e cacheia todos os assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Cache parcial (ok para fontes):', err);
      });
    })
  );
  self.skipWaiting();
});

// Limpa caches antigos ao ativar nova versão
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: Cache First → Network fallback
self.addEventListener('fetch', e => {
  // Ignora requisições não-GET e chrome-extension
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cacheia respostas válidas (não erros, não opaque de outros domínios sensíveis)
        if (!response || response.status !== 200) return response;
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, toCache));
        return response;
      }).catch(() => {
        // Offline fallback: retorna index.html para navegação
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
