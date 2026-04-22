/*
 * ShopOS service worker — skeleton.
 *
 * P0: no offline caching yet. Only establishes the SW lifecycle so the app
 * is installable as a PWA and so P1 can ship offline billing without a
 * fresh SW registration (which would lose the install prompt / badge).
 *
 * P1 adds:
 *   - precached app shell (/dashboard, /pos, /inventory, static assets)
 *   - Dexie-backed mutation queue replay hook (syncs sales/purchases)
 *   - background sync + periodic sync for closing summaries
 */

const SW_VERSION = "shopos-sw-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("shopos-") && n !== SW_VERSION)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", () => {
  // Intentionally pass-through in P0. The presence of a fetch handler (even
  // a no-op one) is required by some browsers to consider the SW "complete".
});
