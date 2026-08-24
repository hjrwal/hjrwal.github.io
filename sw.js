// Service Worker for 五年级英语小探险家
// 缓存策略：HTML/导航 = network-first（保证新版本立即覆盖）| 其它资源 = cache-first（保留离线能力）
// 发布新版本时，只需把 CACHE 名称的版本号 +1，SW 会自动刷新缓存
const CACHE = 'eng5-v144';
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

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      // 通知所有 client：新 SW 已上线，前端可选择自动 reload
      .then(() => self.clients.matchAll({ includeUncontrolled: true }))
      .then(cls => cls.forEach(c => {
        try { c.postMessage({ type: 'SW_UPDATED', version: CACHE }); } catch (_) {}
      }))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 1) 导航请求（页面/HTML）：network-first，保证新版本立即覆盖
  const isNav = event.request.mode === 'navigate'
              || url.pathname.endsWith('/index.html')
              || url.pathname.endsWith('/english5-helper.html')
              || (url.pathname.endsWith('/') && url.origin === self.location.origin);
  if (isNav) {
    event.respondWith(
      fetch(event.request).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return resp;
      }).catch(() =>
        // 离线兜底：从缓存取最新 HTML
        caches.match(event.request).then(c => c || caches.match('./') || caches.match('./index.html'))
      )
    );
    return;
  }

  // 2) 其它资源（JS/CSS/字体/音频/图片）：cache-first，离线可用
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return resp;
      }).catch(() => null);
    })
  );
});
