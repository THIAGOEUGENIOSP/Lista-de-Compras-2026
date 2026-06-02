const CACHE = 'lista-compras-v1';
const STATIC = [
  '/',
  '/index.html',
  '/src/styles.css',
  '/src/app.js',
  '/src/components/analytics.js',
  '/src/components/audit.js',
  '/src/components/budget.js',
  '/src/components/collaborators.js',
  '/src/components/dashboard.js',
  '/src/components/header.js',
  '/src/components/itemForm.js',
  '/src/components/itemList.js',
  '/src/components/toast.js',
  '/src/config/supabase.js',
  '/src/services/items.js',
  '/src/services/periods.js',
  '/src/services/groq.js',
  '/src/services/categoryLearning.js',
  '/src/services/db.js',
  '/src/utils/format.js',
  '/src/utils/period.js',
  '/src/utils/shoppingCategories.js',
  '/src/utils/export.js',
  '/src/utils/priceHistory.js',
  '/src/utils/ui.js',
  '/src/utils/debounce.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase, Groq, CDNs → network first, fallback cache
  const isExternal = url.hostname !== self.location.hostname;
  if (isExternal) {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets → cache first, fallback network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
