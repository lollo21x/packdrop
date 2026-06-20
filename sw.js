// ============================================================
// PackDrop WC26 — Service Worker
// App-shell cache with fast fallback for slow connections
// ============================================================

const CACHE_NAME = 'packdrop-v7';
const NAVIGATION_TIMEOUT = 2200;
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './cards-data.js',
  './firebase-config.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable-192x192.png',
  './icons/icon-maskable-512x512.png'
];

// ── Install: precache core assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(PRECACHE_URLS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches, claim clients, enable nav preload ──
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then(names =>
        Promise.all(
          names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
        )
      ),
      // Enable navigation preload if supported
      self.registration.navigationPreload &&
        self.registration.navigationPreload.enable(),
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
});

// ── Message handler for skip-waiting ──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch handler ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept Firebase auth redirects
  if (url.pathname.startsWith('/__/auth/')) return;

  // Never intercept chrome-extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Firebase API / Firestore / googleapis → network only
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com') ||
    (url.hostname.includes('googleapis.com') && url.pathname.includes('/v1/'))
  ) {
    return; // let the browser handle it normally
  }

  // Navigation requests → network-first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  // Same-origin static assets → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Cross-origin CDN (Firebase SDK, Google Fonts) → cache-first
  if (
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else → network-first
  event.respondWith(networkFirst(event.request));
});

// ── Strategy: Navigation (network-first with preload + offline fallback) ──
async function handleNavigationRequest(event) {
  try {
    // Try navigation preload first
    const preloadResponse = event.preloadResponse && await event.preloadResponse;
    if (preloadResponse) {
      // Cache the fresh response in background
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, preloadResponse.clone());
      return preloadResponse;
    }

    // Otherwise try network, but fall back quickly if the connection is slow
    const networkResponse = await networkWithTimeout(event.request, NAVIGATION_TIMEOUT);
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, networkResponse.clone());
    cache.put('./index.html', networkResponse.clone());
    return networkResponse;
  } catch (err) {
    // Network failed → try cache
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) return cachedResponse;
    const shell = await caches.match('./index.html');
    if (shell) return shell;

    // Nothing in cache → offline fallback page
    return new Response(
      `<!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>PackDrop — Offline</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body {
            background: #07120f;
            color: #f3fff8;
            font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
            padding: 24px;
          }
          .offline-card {
            background: rgba(248,255,250,0.07);
            border: 1px solid rgba(233,255,245,0.14);
            border-radius: 24px;
            padding: 40px 32px;
            max-width: 320px;
          }
          h1 { font-size: 20px; margin-bottom: 8px; }
          p { color: #b8c8bf; font-size: 14px; margin-bottom: 24px; }
          button {
            background: #42d392;
            color: #04110c;
            border: none;
            padding: 12px 32px;
            border-radius: 18px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
          }
          button:active { transform: scale(0.96); }
        </style>
      </head>
      <body>
        <div class="offline-card">
          <h1>PackDrop è offline</h1>
          <p>La shell non è ancora in cache su questo dispositivo. Riconnettiti una volta per renderla disponibile.</p>
          <button onclick="location.reload()">Riprova</button>
        </div>
      </body>
      </html>`,
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

function networkWithTimeout(request, timeout) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => setTimeout(() => reject(new Error('network-timeout')), timeout))
  ]);
}

// ── Strategy: Cache-first ──
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Return empty valid response based on type
    return emptyFallback(request);
  }
}

// ── Strategy: Network-first ──
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return emptyFallback(request);
  }
}

// ── Empty fallback for offline CDN misses ──
function emptyFallback(request) {
  const url = request.url || '';
  if (url.endsWith('.css')) {
    return new Response('', { headers: { 'Content-Type': 'text/css' } });
  }
  if (url.endsWith('.js')) {
    return new Response('', { headers: { 'Content-Type': 'application/javascript' } });
  }
  return new Response('', { status: 408 });
}
