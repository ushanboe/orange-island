// Service Worker for Island Kingdom PWA
const CACHE_NAME = 'island-kingdom-v6';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './js/core/Game.js',
    './js/core/EventEmitter.js',
    './js/ui/GameCanvas.js',
    './js/ui/Toolbar.js',
    './js/ui/TariffUI.js',
    './js/map/TileMap.js',
    './js/map/IslandGenerator.js',
    './js/buildings/Buildings.js',
    './js/buildings/ToolManager.js',
    './js/economy/Boat.js',
    './js/economy/TariffSystem.js',
    './js/utils/Random.js',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker v6...');
    // Force the new service worker to activate immediately
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets...');
                // Cache files one by one to avoid failures
                return Promise.allSettled(
                    ASSETS_TO_CACHE.map(url =>
                        cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
                    )
                );
            })
            .then(() => {
                console.log('[SW] Caching complete');
            })
            .catch((err) => {
                console.error('[SW] Cache failed:', err);
            })
    );
});

// Activate event - clean old caches and take control
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        })
    );
    console.log('[SW] Service worker activated');
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response and cache it
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request);
            })
    );
});
