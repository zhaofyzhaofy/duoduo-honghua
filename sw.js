// 朵朵红花 - Service Worker（离线缓存）
// ============================================================
// 维护说明：每次发布新版本，只需修改下方的 BUILD_VERSION。
// 格式：YYYY.MM.DD-序号，例如 '2026.06.05-1'
// 修改后 activate 事件会自动清理旧缓存，新内容立即生效。
// ============================================================
const BUILD_VERSION = '2026.06.05-1';
const CACHE = `duoduo-${BUILD_VERSION}`;

const PRECACHE_URLS = ['./', './index.html'];

// 安装：预缓存关键资源，并立即跳过等待进入激活态
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 激活：删除所有旧版本缓存，并立即接管所有页面
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 请求处理策略：
//   - HTML/导航请求 → 网络优先（保证用户看到最新内容，离线时回退缓存）
//   - 其他静态资源 → 缓存优先（加载更快，离线可用）
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const accept = e.request.headers.get('accept') || '';
  const isHTML = e.request.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // 把最新 HTML 写回缓存，供离线使用
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // 同源且成功的响应才缓存
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
