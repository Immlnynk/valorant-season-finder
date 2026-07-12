// VALOACT Service Worker
// HTML はネットワーク優先（更新を即反映）、静的アセットは stale-while-revalidate
const CACHE = "valoact-v1";
const ASSETS = [
  "/", "/favicon.svg", "/icon-192.png", "/icon-512.png",
  "/manifest.json", "/about.html", "/privacy.html"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 同一オリジンのみ

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // ネットワーク優先（オフライン時のみキャッシュ）
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // 静的アセット：キャッシュ即返し＋裏で更新
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchP = fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => cached);
      return cached || fetchP;
    })
  );
});
