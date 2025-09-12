// ---- Lucky7 service worker (safe instant update) ----
const VERSION    = 'v6';                         // bump on each release
const CACHE_NAME = `lucky7-cache-${VERSION}`;

const ASSETS = [
  './',                 // site root
  'index.html',
  'app.js',
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'manifest.json'
];

// Install: precache and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // take control ASAP
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activate: claim clients and purge old caches
self.addEventListener('activate', (event) => {
  clients.claim();
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Fetch:
// - HTML/navigation => network-first so new deploys show up
// - Everything else => cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request;

  const isHTML =
    req.mode === 'navigate' ||
    (req.destination === 'document') ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req).then(r => {
        // Optionally update cache with latest HTML
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // cache-first for other assets
  event.respondWith(
    caches.match(req).then(r => r || fetch(req))
  );
});

