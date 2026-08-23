const CACHE_NAME = 'sovereign-live-v4';
const ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Graceful asset caching
        }
      }
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy for pages & JS to guarantee live updates
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(e.request.url);
  } catch {
    return;
  }

  // Strictly ignore browser extensions (chrome-extension, edge-extension, moz-extension) and non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never intercept API routes or dynamic state calls
  if (url.pathname.startsWith('/api/')) return;

  // For HTML navigation requests, always fetch from network first so new deploys are instant
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            try {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, copy).catch(() => {});
              });
            } catch {
              // Ignore cloning/caching errors
            }
          }
          return networkResponse;
        })
        .catch(async () => {
          try {
            const cached = await caches.match(e.request);
            if (cached) return cached;
            const indexCached = await caches.match('/index.html');
            if (indexCached) return indexCached;
          } catch {
            // Ignore cache errors
          }
          return new Response('Network error occurred. Please refresh.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // For static assets (icons, manifests), try network first, then cache
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          try {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache).catch(() => {});
            });
          } catch {
            // Ignore caching errors
          }
        }
        return networkResponse;
      })
      .catch(async () => {
        try {
          const cached = await caches.match(e.request);
          if (cached) return cached;
        } catch {
          // Ignore cache errors
        }
        return new Response('', { status: 404, statusText: 'Not Found' });
      })
  );
});


