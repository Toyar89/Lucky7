// ---- Lucky7 SW: instant, safe updates ----
const VERSION    = 'v6';                 // BUMP THIS each release
const CACHE_NAME = `lucky7-cache-${VERSION}`;

const ASSETS = [
  './',
  'index.html',
  'app.js',
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'manifest.json'
];

// Install: pre-cache
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

// Activate: take control immediately and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Allow page to request immediate activation
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Fetch: network-first for HTML; cache-first for others
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHTML =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(r => r || fetch(req))
  );
});
