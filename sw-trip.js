// Offline support for 安心游 (/trip only — registered with scope "/trip", so the main app is untouched).
// Travellers often land with no data: the trip, SOS cards, hotel cards and Thai phrases (with audio) must still work.
// Pages and JSON: network first, cache as fallback. Fonts, stickers, audio: cache first. APIs are never cached.
const V = "trip-v4";
const CITIES = ["bkk", "cnx", "hkt", "pty", "kbv", "usm"];
const STICKERS = ["clipboard", "lotus", "padthai", "passport", "temple", "tuktuk", "wai", "house", "market", "longtail", "coconut", "camera", "plumeria", "cocktail", "elephant"];
const FONTS = ["caveat-600-normal-latin", "mitr-400-normal-latin", "mitr-400-normal-thai", "mitr-500-normal-latin", "mitr-500-normal-thai",
  "sarabun-400-normal-latin", "sarabun-400-normal-thai", "sarabun-500-normal-latin", "sarabun-500-normal-thai", "sarabun-600-normal-latin", "sarabun-600-normal-thai"];
const CORE = ["/trip", "/data/trip/anxin.json", "/data/trip/sample.json", "/audio/map.json", "/fonts/fonts.css", "/icon.png",
  ...CITIES.map(c => `/data/trip/${c}.json`), ...FONTS.map(f => `/fonts/${f}.woff2`), ...STICKERS.map(s => `/img/stk/${s}.webp`)];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(CORE.map(u => c.add(u).catch(() => {}))); // one missing file must not block the rest
    // Every 安心游 phrase clip, both voices (~1 MB): the SOS and stop cards should speak offline too.
    try {
      const map = await (await fetch("/audio/map.json")).json();
      const clips = [...new Set(Object.entries(map).filter(([k]) => k.startsWith("trip|")).map(([, f]) => `/audio/${f}?v=2`))];
      await Promise.all(clips.map(u => c.add(u).catch(() => {})));
    } catch (err) { /* clips are cached on first play instead */ }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("trip-") && k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  const fresh = req.mode === "navigate" || url.pathname === "/trip" || url.pathname.endsWith(".json") || url.pathname.endsWith(".css");
  e.respondWith(fresh ? networkFirst(req, url) : cacheFirst(req));
});

async function networkFirst(req, url) {
  const c = await caches.open(V);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req.mode === "navigate" || url.pathname === "/trip" ? "/trip" : req, res.clone());
    return res;
  } catch (err) {
    return (await c.match(req.mode === "navigate" || url.pathname === "/trip" ? "/trip" : req, { ignoreSearch: true }))
      || new Response("离线中，这个内容还没缓存", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(req) {
  const c = await caches.open(V);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.status === 200) c.put(req, res.clone());
  return res;
}
