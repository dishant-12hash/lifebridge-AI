const CACHE_NAME = "lifebridge-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./map-manager.js",
  "./ai-agent.js",
  "./guides-data.js",
  "./manifest.json",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"
];

// Install Event - cache core files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching files...");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache...", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Only handle standard GET requests
  if (event.request.method !== "GET") return;

  // For Leaflet tiles (openstreetmap.org) or standard resources
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Clone and store in cache if it's a valid successful response
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: attempt to retrieve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Special fallback for Leaflet tiles: if we are offline and don't have the tile cached,
          // return an offline-safe visual cue or empty image if it's an image request.
          if (event.request.url.includes("tile.openstreetmap.org")) {
            return new Response(
              `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
                <rect width="256" height="256" fill="#14161f"/>
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#555" font-family="monospace" font-size="12">
                  [Map Tile Offline]
                </text>
              </svg>`,
              { headers: { "Content-Type": "image/svg+xml" } }
            );
          }
          return new Response("Offline resource unavailable", {
            status: 503,
            statusText: "Service Unavailable"
          });
        });
      })
  );
});
