// ============================================================
// PackDrop WC26 — Service Worker
// App shell first, background refresh, data-safe updates
// ============================================================

const CACHE_NAME = 'packdrop-v1.5';

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './cards-data.js',
  './matches-data.js',
  './firebase-config.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable-192x192.png',
  './icons/icon-maskable-512x512.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

const PASSTHROUGH_HOSTS = new Set([
  'api.github.com',
  'v3.football.api-sports.io',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'accounts.google.com',
  'apis.google.com'
]);

const CACHE_FIRST_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com',
  'flagcdn.com',
  'media.api-sports.io'
]);

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map(asset => cache.add(asset)));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }

    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.startsWith('/__/auth/')) return;
  if (PASSTHROUGH_HOSTS.has(url.hostname)) return;

  if (event.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    event.respondWith(appShellFirst(event.request, event.preloadResponse));
    return;
  }

  if (url.origin === self.location.origin || CACHE_FIRST_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function appShellFirst(request, preloadPromise) {
  const cached = await caches.match(request) || await caches.match('./index.html') || await caches.match('./');
  if (cached) {
    refreshCache(request, preloadPromise);
    return cached;
  }

  try {
    const response = await resolveNetwork(request, preloadPromise);
    await putResponse(request, response);
    await putAppShell(response);
    return response;
  } catch (err) {
    return offlineShell();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await putResponse(request, response);
    return response;
  } catch (err) {
    return emptyFallback(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await putResponse(request, response);
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return emptyFallback(request);
  }
}

async function resolveNetwork(request, preloadPromise) {
  const preload = preloadPromise ? await preloadPromise.catch(() => null) : null;
  return preload || fetch(request);
}

async function refreshCache(request, preloadPromise) {
  try {
    const response = await resolveNetwork(request, preloadPromise);
    await putResponse(request, response);
    await putAppShell(response);
  } catch (err) {
    // Cached app shell is already being served.
  }
}

async function putAppShell(response) {
  if (!response || !response.clone) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put('./index.html', response.clone());
  } catch (err) {
    // Ignore quota/private-mode cache errors.
  }
}

async function putResponse(request, response) {
  if (!response || (!response.ok && response.type !== 'opaque')) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (err) {
    // Ignore quota/private-mode cache errors.
  }
}

function emptyFallback(request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('.css')) {
    return new Response('/* offline */', { status: 200, headers: { 'Content-Type': 'text/css' } });
  }
  if (url.pathname.endsWith('.js')) {
    return new Response('/* offline */', { status: 200, headers: { 'Content-Type': 'application/javascript' } });
  }
  if (url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff') || url.pathname.endsWith('.ttf')) {
    return new Response(new ArrayBuffer(0), { status: 200, headers: { 'Content-Type': 'font/woff2' } });
  }
  return new Response('', { status: 200 });
}

function offlineShell() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
      <title>PackDrop offline</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          min-height: 100vh;
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #07120f;
          color: #f3fff8;
          font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          text-align: center;
        }
        div {
          max-width: 320px;
          padding: 28px;
          border: 1px solid rgba(233,255,245,.14);
          border-radius: 20px;
          background: rgba(248,255,250,.07);
        }
        h1 { margin: 0 0 8px; font-size: 20px; }
        p { margin: 0 0 20px; color: #b8c8bf; font-size: 14px; }
        button {
          min-height: 44px;
          padding: 0 20px;
          border: 0;
          border-radius: 14px;
          background: #42d392;
          color: #04110c;
          font-weight: 800;
        }
      </style>
    </head>
    <body>
      <div>
        <h1>PackDrop è offline</h1>
        <p>Apri l'app una volta online per salvare la shell su questo dispositivo.</p>
        <button onclick="location.reload()">Riprova</button>
      </div>
    </body>
    </html>`,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
