// Service Worker for Island Kingdom PWA
const CACHE_NAME = 'island-kingdom-v2';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/core/Game.js',
    '/js/core/EventEmitter.js',
    '/js/map/TileMap.js',
    '/js/map/IslandGenerator.js',
    '/js/ui/GameCanvas.js',
    '/js/ui/Toolbar.js',
    '/js/buildings/Buildings.js',
    '/js/buildings/ToolManager.js',
    '/js/utils/Random.js',
    '/manifest.json',
    '/assets/icon-192.png',
    '/assets/icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
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
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((response) => {
                    // Don't cache non-successful responses or non-GET requests
                    if (!response || response.status !== 200 || event.request.method !== 'GET') {
                        return response;
                    }
                    // Clone and cache the response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
    );
});
