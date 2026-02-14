const CACHE = "move-label-cache-v2";
const CORE = ["/dashboard", "/scan", "/unpacking", "/labels"];

// Never cache these — always fetch fresh
function shouldSkipCache(url) {
  const u = new URL(url);
  return (
    u.pathname.startsWith("/api/") ||
    u.pathname.startsWith("/box/") ||
    u.pathname.includes("/exports/") ||
    u.searchParams.has("boxId") ||
    u.searchParams.has("template")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete old cache versions
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (shouldSkipCache(event.request.url)) return; // pass through to network

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

// Listen for a message to clear all caches on demand
self.addEventListener("message", (event) => {
  if (event.data === "clearCache") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
