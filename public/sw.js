// ─────────────────────────────────────────────────────────────────────────────
// kindalikepdf — Service Worker
// Strategy:
//   - Precache: all pages + critical static assets on install
//   - Cache-First:  /_next/static/** (content-hashed, safe to cache aggressively)
//   - Network-First: navigation (/, /tools/*) with offline fallback
//   - Stale-While-Revalidate: images, icons, manifests
//   - Cache-First: fonts (Google Fonts / Geist)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'v3';
const PRECACHE_NAME  = `kindalikepdf-precache-${CACHE_VERSION}`;
const RUNTIME_NAME   = `kindalikepdf-runtime-${CACHE_VERSION}`;

// All pages and critical static assets to cache on install.
// NOTE: /_next/static/** uses content-hashed filenames that change each build,
// so those cannot be hardcoded here — they are handled via runtime Cache-First.
const PRECACHE_URLS = [
  // Shell / pages
  '/',
  '/tools/compress',
  '/tools/merge',
  '/tools/split',
  '/tools/organize',
  '/tools/watermark',
  '/tools/protect',
  '/tools/image-to-pdf',
  '/tools/image-compress',
  '/tools/image-resize',
  '/tools/image-convert',
  '/tools/image-watermark',
  '/tools/image-remove-bg',
  // Critical heavy asset — PDF engine
  '/pdf.worker.min.mjs',
  // Static assets
  '/hero.jpg',
  '/kindalike.png',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/manifest.json',
  '/site.webmanifest',
];

// ── INSTALL: precache everything ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME).then((cache) => {
      // Use individual add() calls so a single failing asset doesn't abort all
      const promises = PRECACHE_URLS.map((url) =>
        cache.add(url).catch((err) => {
          console.warn(`[SW] Precache failed for ${url}:`, err);
        })
      );
      return Promise.all(promises);
    })
  );
  // Take control immediately without waiting for existing tabs to close
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = [PRECACHE_NAME, RUNTIME_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !validCaches.includes(name))
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      )
    )
  );
  // Claim all open clients so they use the new SW immediately
  self.clients.claim();
});

// ── FETCH: layered caching strategies ─────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ── 1. Next.js static chunks: Cache-First ──
  // These are content-hashed (e.g. main-abc123.js), so we cache them
  // aggressively. Once cached, never goes to network for same hash.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, RUNTIME_NAME));
    return;
  }

  // ── 2. Next.js image optimization: Cache-First ──
  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(cacheFirst(request, RUNTIME_NAME));
    return;
  }

  // ── 3. Google Fonts stylesheets & font files: Cache-First ──
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, RUNTIME_NAME));
    return;
  }

  // ── 4. Same-origin navigation (pages): Network-First ──
  // Try to get fresh HTML from network; fall back to cache if offline.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── 5. Same-origin static assets (images, icons, manifests): SWR ──
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_NAME));
    return;
  }

  // ── 6. All other external requests: network only (no cache) ──
  // e.g. external API calls, analytics — let them pass through
});

// ─────────────────────────────────────────────────────────────────────────────
// Strategy helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Cache-First: serve from cache; fetch + cache only on cache miss. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok || networkResponse.status === 0) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

/** Network-First: try network; fall back to cache; then to '/' shell. */
async function networkFirst(request) {
  const cacheName = PRECACHE_NAME;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Offline: try exact match first, then fall back to '/' shell
    const cached = await caches.match(request);
    if (cached) return cached;

    const shell = await caches.match('/');
    if (shell) return shell;

    return new Response('<h1>Anda sedang offline</h1>', {
      headers: { 'Content-Type': 'text/html' },
      status: 503,
    });
  }
}

/** Stale-While-Revalidate: serve cached immediately, update cache in background. */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok || networkResponse.status === 0) {
        caches
          .open(cacheName)
          .then((cache) => cache.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => null);

  return cached || fetchPromise;
}
