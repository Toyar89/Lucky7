// sw.js
// Bump this any time you change cached assets
const CACHE_NAME = "lucky7-cache-v13";

const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",

  // Icons (adjust names to your files)
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./logo.png",

  // Audio (use either bubble.mp3 or click.mp3 for the flip sound)
  "./applause.mp3",
  "./boom.mp3",
  "./timeup.mp3",
  "./bubble.mp3" // change to "./click.mp3" if you prefer that file instead
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Cache-first, then refresh cache in background when online
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle same-origin GET requests
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          // Successful network response: update cache
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // network failed: fall back to cache if we have it

      // serve cache immediately if present, else use network
      return cached || networkFetch;
    })
  );
});
