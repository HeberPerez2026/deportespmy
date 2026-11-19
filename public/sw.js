/* Service Worker (Dev + Fallback) — DeportesPMY */
importScripts('/sw-push.js');

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith('workbox-precache'))
            .map((k) => caches.delete(k))
        );
      } catch {}
      await self.clients.claim();
    })()
  );
});
