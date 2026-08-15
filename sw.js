// Service Worker for 五年级英语小探险家
// 缓存策略：cache-first（离线可用）+ 后台更新
// 发布新版本时，只需把 CACHE 名称的版本号 +1（如 eng5-v4），SW 会自动刷新缓存
const CACHE = 'eng5-v36';
const ASSETS = [
  './',
  './index.html',
  './tech-showcase.html',
  './manifest.json',
  './icon.svg',
  './icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try { await cache.addAll(ASSETS); } catch (_) { /* 个别资源缺失也继续，不阻断更新 */ }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return resp;
      }).catch(() => caches.match('./english5-helper.html'));
    })
  );
});
