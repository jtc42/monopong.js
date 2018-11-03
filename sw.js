var CACHE_NAME = 'MONOPONG-CACHE-C01';
var appShellFiles = [
  '/',
  '/index.html',
  '/monopong.js',
  '/db.js',
  '/ping_pong_8bit_beeep.wav',
  '/ping_pong_8bit_peeeeeep.wav',
  '/ping_pong_8bit_plop.wav'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(appShellFiles);
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request).then(function(response) {
        return caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, response.clone());
          return response;
        });
      });
    })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (CACHE_NAME !== cacheName &&  cacheName.startsWith("MONOPONG-CACHE")) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});