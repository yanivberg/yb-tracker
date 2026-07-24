// YB Tracker service worker — v957: network-first HTML shell, normalized (query-stripped) cache keys, versioned cache with activate-purge.
const CACHE = 'yb-shell-v957';
const INDEX_URL = self.registration.scope + 'index.html';

self.addEventListener('install', function (e) { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  var isNav = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

  if (isNav) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(INDEX_URL, copy); }); }
        return res;
      }).catch(function () {
        return caches.match(INDEX_URL).then(function (m) { return m || caches.match(new Request(url.origin + url.pathname)); });
      })
    );
    return;
  }

  var key = new Request(url.origin + url.pathname);
  e.respondWith(
    caches.match(key).then(function (m) {
      return m || fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
        return res;
      });
    })
  );
});
