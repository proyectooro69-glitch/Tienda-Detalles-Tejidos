const CACHE_NAME = 'dtalles-v3';
const ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(){});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Network-first for HTML (so updates show immediately).
// Cache-first fallback for everything else, with network update.
self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var accept = req.headers.get('accept') || '';
  var isHTML = req.mode === 'navigate' || accept.indexOf('text/html') !== -1;

  if (isHTML) {
    e.respondWith(
      fetch(req).catch(function() {
        return caches.match(req).then(function(c) { return c || caches.match('/index.html'); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(cached) {
      var network = fetch(req).then(function(res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
        }
        return res;
      }).catch(function() { return cached; });
      return cached || network;
    })
  );
});
