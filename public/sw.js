const CACHE_NAME = "foi-app-shell-v4";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/deployment-version.txt",
  "/favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("foi-app-shell-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl = null) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && (response.type === "basic" || response.type === "default")) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) ||
      (fallbackUrl ? await cache.match(fallbackUrl) : null) ||
      (await caches.match(request)) ||
      Response.error();
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/index.html"));
    return;
  }

  // App/game assets use network-first so an installed copy receives updated art
  // and UI resources without requiring the player to reinstall the PWA.
  if (url.pathname.startsWith("/assets/") ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname === "/deployment-version.txt" ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/favicon")) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return networkFirst(request);
    })
  );
});
