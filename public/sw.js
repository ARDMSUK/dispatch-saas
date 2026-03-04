const CACHE_NAME = 'dispatch-offline-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Pre-cache the offline fallback page
            return cache.addAll([
                OFFLINE_URL
            ]);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Clean up old caches if CACHE_NAME changes
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Only intercept navigation requests (when a user navigates to a new HTML page)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(async () => {
                // If the network request fails (user is offline or server is utterly down),
                // we return the cached generic offline page.
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(OFFLINE_URL);

                if (cachedResponse) {
                    return cachedResponse;
                }

                // Final fallback if the cache itself failed for some reason
                return new Response('You are completely offline and the cache failed to load.', {
                    headers: { 'Content-Type': 'text/plain' }
                });
            })
        );
    }
});
