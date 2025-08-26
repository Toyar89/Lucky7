// sw.js — Lucky7 PWA
const CACHE_NAME = "lucky7-v18"; // bump on each deploy

// Files to cache for offline
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./app.js",
  "./logo.png",

  // Icons
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",

  // Sounds (make sure these exist in the repo)
  "./applause.mp3",
  "./bubble.mp3",
  "./timeup.mp3",
  "./rude.mp3",
  "./wrong.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting(); // activate new SW immediately
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of open pages
});

// Cache-first for app shell; network-first for others
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          // Cache successful GET responses
          if (resp && resp.ok) {
            const respClone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
          }
          return resp;
        })
        .catch(() => cached); // if offline & not cached, no fallback
    })
  );
});
