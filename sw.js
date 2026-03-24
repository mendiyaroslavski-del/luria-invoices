const CACHE = 'luria-invoices-v1';
const ASSETS = ['./', './index.html', './manifest.json'];

// Store shared file temporarily
let sharedFile = null;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Handle share target POST
  if (e.request.method === 'POST' && url.pathname === '/luria-invoices/') {
    e.respondWith(Response.redirect('/luria-invoices/?shared=1', 303));
    e.waitUntil(
      (async () => {
        const formData = await e.request.formData();
        const file = formData.get('file');
        if (file) {
          // Store in cache with special key
          const cache = await caches.open(CACHE);
          const arrayBuffer = await file.arrayBuffer();
          const response = new Response(arrayBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'X-File-Name': encodeURIComponent(file.name)
            }
          });
          await cache.put('/__shared_file__', response);
        }
      })()
    );
    return;
  }

  // Normal fetch with cache fallback
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).catch(() => cached)
    )
  );
});
