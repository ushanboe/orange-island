// Service Worker for Island Kingdom PWA
const CACHE_NAME = 'island-kingdom-v130';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './js/core/Game.js',
    './js/core/EventEmitter.js',
    './js/ui/GameCanvas.js',
    './js/systems/AnimationSystem.js',
    './js/systems/ImmigrationSystem.js',
    './js/ui/Toolbar.js',
    './js/ui/TariffUI.js',
    'js/ui/DebugPanel.js',
    './js/map/TileMap.js',
    './js/map/IslandGenerator.js',
    './js/buildings/Buildings.js',
    './js/buildings/ToolManager.js',
    './js/economy/Boat.js',
    './js/economy/TariffSystem.js',
    './js/simulation/Development.js',
    './js/simulation/ResidentialAllotment.js',
    './js/rendering/ResidentialRenderer.js',
    './js/rendering/CommercialRenderer.js',
    './js/rendering/IndustrialRenderer.js',
    './js/rendering/ServiceBuildingRenderer.js',
    './js/utils/Random.js',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker ' + CACHE_NAME + '...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets...');
                return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                    console.warn('[SW] Some assets failed to cache:', err);
                });
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker ' + CACHE_NAME + '...');
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
            return self.clients.claim();
        })
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // For JS files, force network fetch with no-cache to ensure latest version
    const fetchOptions = event.request.url.endsWith('.js') 
        ? { cache: 'no-cache' } 
        : {};
    
    event.respondWith(
        fetch(event.request, fetchOptions)
            .then((response) => {
                // Clone and cache successful responses
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
