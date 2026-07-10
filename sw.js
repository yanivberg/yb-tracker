// YB Tracker service worker — sw-v1
// Strategy: network-first with cache fallback. Online users ALWAYS get the
// newest deployed version; the cache is only used when the network fails.
// No per-release edits needed here — the cache refreshes on every successful load.
var CACHE = 'yb-shell-v1';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Same-origin only — never intercept Apps Script / Worker / Caspit calls.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      // ignoreSearch so index.html?v=NNN still matches the cached copy
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || Response.error();
      });
    })
  );
});
