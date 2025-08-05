// ===== SERVICE WORKER - PARIS EXPLORER PWA =====

const CACHE_NAME = 'paris-explorer-v2.0.0';
const OFFLINE_URL = '/offline.html';

// Ressources critiques à mettre en cache
const CRITICAL_RESOURCES = [
    '/',
    '/index.html',
    '/assets/css/main.css',
    '/assets/css/responsive.css',
    '/assets/css/themes.css',
    '/assets/js/app.js',
    '/assets/js/data-manager.js',
    '/assets/js/user-manager.js',
    '/assets/js/ui-manager.js',
    '/assets/js/map-manager.js',
    '/assets/js/utils.js',
    '/config.json',
    '/manifest.json',
    OFFLINE_URL
];

// Ressources secondaires (chargées en arrière-plan)
const SECONDARY_RESOURCES = [
    '/assets/js/export-import.js',
    '/assets/js/search-filter.js',
    '/paris-database.json',
    '/user/progress.json',
    '/user/favorites.json',
    '/user/notes.json',
    '/user/settings.json'
];

// Ressources externes (CDN)
const EXTERNAL_RESOURCES = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap'
];

// === INSTALLATION DU SERVICE WORKER ===
self.addEventListener('install', event => {
    console.log('🔧 Installation du Service Worker Paris Explorer');
    
    event.waitUntil(
        (async () => {
            try {
                // Cache des ressources critiques
                const cache = await caches.open(CACHE_NAME);
                console.log('📦 Mise en cache des ressources critiques...');
                
                await cache.addAll(CRITICAL_RESOURCES);
                console.log('✅ Ressources critiques mises en cache');
                
                // Préchargement des ressources secondaires en arrière-plan
                setTimeout(async () => {
                    try {
                        console.log('📦 Préchargement des ressources secondaires...');
                        await cache.addAll(SECONDARY_RESOURCES);
                        console.log('✅ Ressources secondaires mises en cache');
                    } catch (error) {
                        console.warn('⚠️ Erreur préchargement secondaire:', error);
                    }
                }, 1000);
                
                // Forcer l'activation immédiate
                self.skipWaiting();
                
            } catch (error) {
                console.error('❌ Erreur installation Service Worker:', error);
            }
        })()
    );
});

// === ACTIVATION DU SERVICE WORKER ===
self.addEventListener('activate', event => {
    console.log('🚀 Activation du Service Worker Paris Explorer');
    
    event.waitUntil(
        (async () => {
            try {
                // Nettoyage des anciens caches
                const cacheNames = await caches.keys();
                const oldCaches = cacheNames.filter(name => 
                    name.startsWith('paris-explorer-') && name !== CACHE_NAME
                );
                
                if (oldCaches.length > 0) {
                    console.log('🧹 Nettoyage des anciens caches:', oldCaches);
                    await Promise.all(oldCaches.map(name => caches.delete(name)));
                }
                
                // Prise de contrôle immédiate
                await self.clients.claim();
                console.log('✅ Service Worker activé et contrôle pris');
                
                // Notification aux clients
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_NAME
                    });
                });
                
            } catch (error) {
                console.error('❌ Erreur activation Service Worker:', error);
            }
        })()
    );
});

// === INTERCEPTION DES REQUÊTES ===
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorer les requêtes non-GET et cross-origin spéciales
    if (request.method !== 'GET' || 
        url.origin !== self.location.origin && !isAllowedExternal(url)) {
        return;
    }
    
    event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
    const url = new URL(request.url);
    
    try {
        // Stratégie par type de ressource
        if (isCriticalResource(url.pathname)) {
            return await cacheFirst(request);
        } else if (isApiResource(url.pathname)) {
            return await networkFirst(request);
        } else if (isStaticResource(url.pathname)) {
            return await staleWhileRevalidate(request);
        } else {
            return await networkFirst(request);
        }
    } catch (error) {
        console.warn('⚠️ Erreur fetch:', url.pathname, error);
        return await handleFetchError(request);
    }
}

// === STRATÉGIES DE CACHE ===

// Cache First - Pour les ressources critiques statiques
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }
    
    const response = await fetch(request);
    if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
    }
    return response;
}

// Network First - Pour les données dynamiques
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

// Stale While Revalidate - Pour les ressources qui peuvent être mises à jour
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
        }
        return response;
    }).catch(() => null);
    
    return cached || await fetchPromise;
}

// === GESTION DES ERREURS ===
async function handleFetchError(request) {
    const url = new URL(request.url);
    
    // Page offline pour les pages HTML
    if (request.mode === 'navigate') {
        const offlineResponse = await caches.match(OFFLINE_URL);
        if (offlineResponse) {
            return offlineResponse;
        }
    }
    
    // Réponse vide pour les autres ressources
    return new Response('', {
        status: 408,
        statusText: 'Timeout'
    });
}

// === UTILITAIRES ===
function isCriticalResource(pathname) {
    return CRITICAL_RESOURCES.some(resource => 
        pathname === resource || pathname.endsWith(resource)
    );
}

function isApiResource(pathname) {
    return pathname.includes('/api/') || 
           pathname.endsWith('.json') ||
           pathname.includes('nominatim.openstreetmap.org');
}

function isStaticResource(pathname) {
    return /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/.test(pathname);
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
            
        case 'UPDATE_STRATEGY':
            updateCacheStrategy(data?.strategy);
            break;
    }
});

// === FONCTIONS UTILITAIRES AVANCÉES ===

async function getCacheSize() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        
        let totalSize = 0;
        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
        
        return {
            items: keys.length,
            size: totalSize,
            sizeFormatted: formatBytes(totalSize)
        };
    } catch (error) {
        console.error('Erreur calcul taille cache:', error);
        return { items: 0, size: 0, sizeFormatted: '0 B' };
    }
}

async function clearCache(pattern = null) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        
        let cleared = 0;
        for (const request of keys) {
            if (!pattern || request.url.includes(pattern)) {
                await cache.delete(request);
                cleared++;
            }
        }
        
        return cleared;
    } catch (error) {
        console.error('Erreur nettoyage cache:', error);
        return 0;
    }
}

async function preloadRoutes(routes) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const promises = routes.map(route => {
            return fetch(route).then(response => {
                if (response.ok) {
                    return cache.put(route, response);
                }
            }).catch(err => console.warn('Erreur preload:', route, err));
        });
        
        await Promise.allSettled(promises);
        console.log(`✅ Preload terminé: ${routes.length} routes`);
    } catch (error) {
        console.error('Erreur preload routes:', error);
    }
}

function updateCacheStrategy(strategy) {
    // Mise à jour dynamique de la stratégie de cache
    // Peut être implémenté pour A/B testing des stratégies
    console.log('Mise à jour stratégie cache:', strategy);
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// === GESTION DES NOTIFICATIONS PUSH ===
self.addEventListener('push', event => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        const options = {
            body: data.body || 'Nouvelle notification Paris Explorer',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            image: data.image,
            data: data.data,
            tag: data.tag || 'paris-explorer',
            renotify: true,
            requireInteraction: data.requireInteraction || false,
            actions: data.actions || [
                {
                    action: 'open',
                    title: 'Ouvrir',
                    icon: '/icons/open-24x24.png'
                },
                {
                    action: 'dismiss',
                    title: 'Ignorer',
                    icon: '/icons/close-24x24.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'Paris Explorer', options)
        );
    } catch (error) {
        console.error('Erreur notification push:', error);
    }
});

// === GESTION DES CLICS SUR NOTIFICATIONS ===
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const { action, data } = event;
    
    if (action === 'dismiss') {
        return;
    }
    
    // URL de destination selon l'action
    let targetUrl = '/';
    if (data?.url) {
        targetUrl = data.url;
    } else if (action === 'open' && data?.place) {
        targetUrl = `/?place=${data.place}`;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // Chercher une fenêtre existante
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            
            // Ouvrir une nouvelle fenêtre si aucune trouvée
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// === SYNCHRONISATION EN ARRIÈRE-PLAN ===
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        console.log('🔄 Synchronisation en arrière-plan...');
        
        // Synchroniser les données utilisateur si connecté
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                action: 'sync_user_data'
            });
        });
        
        console.log('✅ Synchronisation terminée');
    } catch (error) {
        console.error('❌ Erreur synchronisation:', error);
    }
}

// === GESTION DES ERREURS GLOBALES ===
self.addEventListener('error', event => {
    console.error('Erreur Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Promise rejetée dans Service Worker:', event.reason);
});

console.log('🗼 Service Worker Paris Explorer chargé et prêt !');
