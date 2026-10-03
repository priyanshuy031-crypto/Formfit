// Bump this number every time you upload a new version of the site.
const CACHE_NAME = "priyanshu-photo-tools-v2";
const APP_SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Save a copy only when the response is good (not a 404/500 error page).
function remember(request, response) {
  if (response && (response.ok || response.type === "opaque")) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
  }
  return response;
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;

  const url = new URL(req.url);
  const isPage = req.mode === "navigate" ||
    (url.origin === self.location.origin && /\/(index\.html|manifest\.json)?$/.test(url.pathname));

  if (isPage) {
    // Pages: try the internet first, so visitors always get the latest version.
    // If they are offline, fall back to the saved copy.
    event.respondWith(
      fetch(req)
        .then(response => remember(req, response))
        .catch(() => caches.match(req).then(c => c || caches.match("./index.html")))
    );
    return;
  }

  // Everything else (icons, PDF libraries, fonts): saved copy first, for speed.
  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(response => remember(req, response))
    ).catch(() => caches.match("./index.html"))
  );
});
