const CACHE_NAME = "lucky7-cache-v2"; // bump version
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
});
