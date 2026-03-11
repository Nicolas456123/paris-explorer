// ===== SERVICE WORKER PARIS EXPLORER - VERSION SANS IMAGES =====

const CACHE_NAME = 'paris-explorer-v3.1.0';
const OFFLINE_URL = '/offline.html';

// === RESSOURCES À METTRE EN CACHE ===
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/config.js',
    
    // CSS
    '/assets/css/main.css',
    '/assets/css/responsive.css',
    '/assets/css/themes.css',
    '/assets/css/themes-v2.css',
    
    // JavaScript
    '/assets/js/utils.js',
    '/assets/js/data-manager.js',
    '/assets/js/user-manager.js',
    '/assets/js/map-manager.js',
    '/assets/js/ui-manager.js',
    '/assets/js/search-filter.js',
    '/assets/js/export-import.js',
    '/assets/js/app.js',
    
    // Données Paris CSV
    '/data/paris-places.csv',
    '/data/arrondissements-info.csv'
];

// === INSTALLATION ===
self.addEventListener('install', event => {
    console.log('🔄 Installation du Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Mise en cache des ressources principales...');
                return cache.addAll(CORE_ASSETS);
            })
            .then(() => {
                console.log('✅ Installation terminée');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Erreur installation:', error);
            })
    );
});

// === ACTIVATION ===
self.addEventListener('activate', event => {
    console.log('🚀 Activation du Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('🗑️ Suppression ancien cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Activation terminée');
                return self.clients.claim();
            })
    );
});

// === INTERCEPTION DES REQUÊTES ===
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Stratégie Cache First pour les ressources statiques
    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(request)
                        .then(response => {
                            // Mettre en cache les nouvelles ressources valides
                            if (response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => cache.put(request, responseClone));
                            }
                            return response;
                        });
                })
                .catch(() => {
                    // Si hors ligne et ressource HTML, servir la page offline
                    if (request.destination === 'document') {
                        return caches.match(OFFLINE_URL);
                    }
                    return new Response('Ressource non disponible hors ligne', {
                        status: 408,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                })
        );
    }
    
    // Stratégie Network First pour les données dynamiques et externes
    else if (isAllowedExternal(url) || url.pathname.includes('.json') || url.pathname.includes('.csv')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request)
                        .then(response => {
                            if (response) {
                                return response;
                            }
                            throw new Error('Ressource non disponible');
                        });
                })
        );
    }
});

// === FONCTIONS UTILITAIRES ===
function isStaticAsset(pathname) {
    return /\.(css|js|woff|woff2|ttf|eot)$/.test(pathname);
}

function isAllowedExternal(url) {
    const allowedDomains = [
        'unpkg.com',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'nominatim.openstreetmap.org',
        'tile.openstreetmap.org'
    ];
    
    return allowedDomains.some(domain => url.hostname.includes(domain));
}

// === GESTION DES MESSAGES ===
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_CACHE_SIZE':
            getCacheSize().then(size => {
                event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
            });
            break;
            
        case 'CLEAR_CACHE':
            clearCache(data?.pattern).then(cleared => {
                event.ports[0].postMessage({ type: 'CACHE_CLEARED', cleared });
            });
            break;
            
        case 'PRELOAD_ROUTES':
            preloadRoutes(data?.routes || []);
            break;
    }
});

// === GESTION DES PUSH NOTIFICATIONS ===
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        data: data.data,
        actions: [
            {
                action: 'open',
                title: 'Ouvrir'
            },
            {
                action: 'close',
                title: 'Fermer'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// === GESTION DES CLICS SUR NOTIFICATIONS ===
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        const targetUrl = event.notification.data?.url || '/';
        
        event.waitUntil(
            clients.matchAll().then(clientList => {
                // Chercher une fenêtre ouverte
                for (const client of clientList) {
                    if (client.url === targetUrl && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Ouvrir une nouvelle fenêtre
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
        );
    }
});

// === FONCTIONS UTILITAIRES AVANCÉES ===
async function getCacheSize() {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    let totalSize = 0;
    
    for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
        }
    }
    
    return {
        count: keys.length,
        size: totalSize,
        formattedSize: formatBytes(totalSize)
    };
}

async function clearCache(pattern) {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    let cleared = 0;
    
    for (const key of keys) {
        if (!pattern || key.url.includes(pattern)) {
            await cache.delete(key);
            cleared++;
        }
    }
    
    return cleared;
}

async function preloadRoutes(routes) {
    const cache = await caches.open(CACHE_NAME);
    
    for (const route of routes) {
        try {
            await cache.add(route);
            console.log(`✅ Route préchargée: ${route}`);
        } catch (error) {
            console.warn(`⚠️ Échec préchargement: ${route}`, error);
        }
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
