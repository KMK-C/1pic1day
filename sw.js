// 1Pic1Day service worker: keeps the ~15 MB face-landmark runtime and model on the phone so the page opens fast
// and works offline. Vendor files are versioned by the MediaPipe release and served cache-first; the page itself
// is served from cache instantly and refreshed in the background (the page's own version check reloads it when a
// newer version is published).
const ASSET_CACHE = '1p1d-assets-mp0.10.35';
const PAGE_CACHE = '1p1d-page';
const ASSETS = [
  'vendor/vision_bundle.mjs',
  'vendor/wasm/vision_wasm_internal.js',
  'vendor/wasm/vision_wasm_internal.wasm',
  'vendor/face_landmarker.task',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(ASSET_CACHE).then(c => c.addAll(ASSETS)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('1p1d-assets-') && k !== ASSET_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes('/vendor/')) {            // immutable runtime + model: cache first
    event.respondWith(caches.open(ASSET_CACHE).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/sw.js')) return; // always from the network

  if (req.mode === 'navigate') {
    const pageKey = new Request(new URL('./', self.registration.scope).href);
    if (url.searchParams.has('v')) {                  // explicit update reload: network first
      event.respondWith(fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(PAGE_CACHE).then(c => c.put(pageKey, copy)); }
        return res;
      }).catch(() => caches.match(pageKey)));
      return;
    }
    event.respondWith(caches.open(PAGE_CACHE).then(async cache => {   // instant open, refresh in background
      const cached = await cache.match(pageKey);
      const network = fetch(req).then(res => { if (res.ok) cache.put(pageKey, res.clone()); return res; }).catch(() => null);
      if (cached) { event.waitUntil(network); return cached; }
      return (await network) || new Response('离线且没有缓存，请联网后再打开。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
    return;
  }

  // small same-origin files (icon etc.): cache, falling back to the network
  event.respondWith(caches.open(PAGE_CACHE).then(async cache => {
    const hit = await cache.match(req);
    const network = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await network) || Response.error();
  }));
});
