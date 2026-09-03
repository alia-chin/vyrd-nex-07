const CACHE_VERSION = 'v1';
const CACHE_NAME = `energy-station-${CACHE_VERSION}`;

const ASSETS = [
    './qrx-pod-09.html',
    './zev-slip-71.webmanifest',
    './icons/a0-192.png',
    './icons/a0-512.png',
    './icons/a0-512-maskable.png',
    './icons/a0-pod-apple.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => Promise.allSettled(ASSETS.map((url) => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    const isPage = event.request.mode === 'navigate'
        || url.pathname.endsWith('.html')
        || url.pathname.endsWith('.webmanifest')
        || url.pathname.endsWith('/');

    if (isPage) {
        // 页面走网络优先：有网时拿最新版本，离线时回退缓存
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./qrx-pod-09.html')))
        );
    } else {
        // 图标等静态资源走缓存优先
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
    }
});
