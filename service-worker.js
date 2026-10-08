// Wire to Wire PWA offline support — bump this version when app assets change.
const CACHE_NAME = 'wire-to-wire-pwa-v1';
const CORE_FILES = [
  './', './index.html', './data/seed-pools.js', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // The player database is essential for offline play; install succeeds only when all files cache.
    await cache.addAll(CORE_FILES);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('wire-to-wire-pwa-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Only intercept our own app; external player photos still require an internet connection.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request, {ignoreSearch:true});
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && url.pathname.endsWith('/data/seed-pools.js')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request,response.clone()).catch(()=>{});
    }
    return response;
  })());
});
