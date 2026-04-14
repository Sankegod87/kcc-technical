const CACHE_VERSION = 'v' + Date.now();
const CACHE_NAME = 'slt-cache-v2';
const ASSETS = [
  '/stage-light/',
  '/stage-light/index.html',
  '/stage-light/manifest.json',
  '/stage-light/icon-192.png',
  '/stage-light/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
