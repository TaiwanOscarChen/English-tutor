// FSE Semiconductor English PWA Service Worker
const STATIC_CACHE_NAME = 'fse-semiconductor-static-v5';
const RUNTIME_CACHE_NAME = 'fse-semiconductor-runtime-v5';
const MAX_RUNTIME_CACHE_ENTRIES = 120;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.svg'
];

async function trimRuntimeCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const overflowCount = keys.length - maxEntries;
      for (let i = 0; i < overflowCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch {
    // Ignore cache trim errors
  }
}

// Install Event - Precache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Precache partial error (ignored):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== RUNTIME_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Support client control messages (force activate / clear caches)
self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

// Fetch Event - Stale-while-revalidate for static assets, network-first for /api/
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests, external protocols, or Vite dev/HMR endpoints
  if (
    event.request.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // API Requests: Network First, fallback to cached GET response or structured offline JSON
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({
              offline: true,
              message: '無塵室離線保護中，請查閱離線晶圓知識庫'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })()
    );
    return;
  }

  // HTML Navigation Requests: Network First (prevents stale chunk hashes after upgrades) with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put('/index.html', networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch {
          return (
            (await caches.match(event.request)) ||
            (await caches.match('/index.html')) ||
            (await caches.match('/'))
          );
        }
      })()
    );
    return;
  }

  // Static Assets (Hashed JS/CSS/Fonts/Icons): Stale-While-Revalidate
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      const fetchPromise = fetch(event.request)
        .then(async (networkResponse) => {
          const contentType = networkResponse.headers.get('content-type') || '';
          const isCodeAsset =
            url.pathname.startsWith('/assets/') ||
            /\.(?:js|mjs|css)$/i.test(url.pathname);
          const isValidAssetResponse =
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic' &&
            (!isCodeAsset || !contentType.includes('text/html'));
          if (isValidAssetResponse) {
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(RUNTIME_CACHE_NAME);
            await cache.put(event.request, responseToCache);
            trimRuntimeCache(RUNTIME_CACHE_NAME, MAX_RUNTIME_CACHE_ENTRIES);
          }
          return networkResponse;
        })
        .catch(async () => cachedResponse);

      return cachedResponse || fetchPromise;
    })()
  );
});
