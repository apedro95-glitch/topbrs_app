const CACHE = 'topbrs-v276-arena-clean-safe1';
const APP_VERSION = '2.7.6-arena-clean-safe1';
const CORE = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icon-1024.png',
  './apple-touch-icon.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-1024.png',
  './icons/icon-maskable-512.png',
  './icons/favicon.png',
  './img_menu_drawer_bg.jpg',
  './img/arena-bg.jpg',
  './img/members-bg.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'TOPBRS_SW_READY', version: APP_VERSION });
    }
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = event.request.mode === 'navigate';
  const isCore = isSameOrigin && (
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html') ||
    CORE.some(asset => url.pathname.endsWith(asset.replace('./', '/')))
  );

  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  if (isCore) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(event.request, fresh.clone());
        }
        return fresh;
      } catch (err) {
        return (await caches.match(event.request)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const fresh = await fetch(event.request);
      if (fresh && fresh.ok && isSameOrigin) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    } catch (err) {
      if (isNavigation) return (await caches.match('./index.html')) || Response.error();
      return (await caches.match(event.request)) || Response.error();
    }
  })());
});
