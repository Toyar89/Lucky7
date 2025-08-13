// sw.js - Lucky7 PWA service worker
const CACHE_VERSION = 'lucky7-v5'; // bump this when you change files
const STATIC_CACHE = CACHE_VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './logo.png',
  './icon.png',
  './icon-512.png'
  // add any other local assets you want available offline (images, sounds you host locally, etc.)
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== STATIC_CACHE ? caches.delete(k) : Promise.resolve())))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - HTML: network-first (so updates arrive), fallback to cache/offline
// - Other assets: cache-first (fast), fallback to network
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHTML = req.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./')))
    );
    return;
  }

  // cache-first for static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, resClone));
        return res;
      });
    })
  );
});
