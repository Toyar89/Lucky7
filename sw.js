 // sw.js — auto-update runtime cache (no manual version bumps needed)

const RUNTIME_CACHE = 'lucky7-runtime';

// Install: activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: take control + clean old caches (only keep RUNTIME_CACHE)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === RUNTIME_CACHE ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - For navigations: network-first with cache:'reload', fallback to cached index.html if any
// - For same-origin GETs (images, sounds, etc.): network-first; on fail, serve from cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Handle top-level navigations
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(req.url, { cache: 'reload' }))
        .then(async (res) => {
          const copy = res.clone();
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(new Request('./index.html'), copy);
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Same-origin runtime caching (network-first)
  if (url.origin === location.origin) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-store' });
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match(req);
          if (cached) return cached;
          // last resort for assets during offline: no response
          throw err;
        }
      })()
    );
  }
});
