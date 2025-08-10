self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('lucky7-v1').then(cache => {
      return cache.addAll([
        './index.html',
        './logo.png',
        './manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});