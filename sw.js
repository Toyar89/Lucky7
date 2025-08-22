// sw.js
// Bump this any time you change cached assets
const CACHE_NAME = "lucky7-cache-v15";

const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",

  // Images / icons (adjust if any names differ)
  "./logo.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",

  // Sounds
  "./applause.mp3",  // win
  "./boom.mp3",      // bust
  "./timeup.mp3",    // timer end
  "./bubble.mp3"     // flip (or change to ./click.mp3 if that’s what you use)
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
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Cache-first with background refresh
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle same-origin GET requests
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached); // offline -> use cache if present

      // Serve cache immediately if present; otherwise wait for network
      return cached || networkFetch;
    })
  );
});
