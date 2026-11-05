// Network first: always load the newest version from the site; use the saved copy only when offline.
const CACHE = 'luria-invoices-v2';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Handle share target POST (a PDF shared from mail / WhatsApp)
  if (e.request.method === 'POST' && url.pathname === '/luria-invoices/') {
    e.respondWith(Response.redirect('/luria-invoices/?shared=1', 303));
    e.waitUntil((async () => {
      const formData = await e.request.formData();
      const file = formData.get('file');
      if (file) {
        const cache = await caches.open(CACHE);
        const arrayBuffer = await file.arrayBuffer();
        await cache.put('/__shared_file__', new Response(arrayBuffer, {
          headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) }
        }));
      }
    })());
    return;
  }

  // Only this site's own files; everything else (cloud, Claude API, fonts) goes straight to the network.
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
  );
});
