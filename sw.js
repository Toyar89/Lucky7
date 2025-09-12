// sw.js — legacy killer to remove the old service worker and caches
self.addEventListener('install', (e) => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 1) Clear ALL caches (old cache names)
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));

    // 2) Unregister THIS old sw.js
    await self.registration.unregister();

    // 3) Force pages to reload so they’re picked up by the new SW
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsArr) {
      // Reload to drop old controller
      client.navigate(client.url);
    }
  })());
});

// While we’re still alive, always fall through to network
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
