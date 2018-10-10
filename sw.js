var cacheName = 'MONOPONG-A0.1';
var appShellFiles = [
  './',
  './index.html',
  './monopong.js',
  './ping_pong_8bit_beeep.wav',
  './ping_pong_8bit_peeeeeep.wav',
  './ping_pong_8bit_plop.wav'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(appShellFiles);
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request).then(function(response) {
        return caches.open(cacheName).then(function(cache) {
          cache.put(e.request, response.clone());
          return response;
        });
      });
    })
  );
});