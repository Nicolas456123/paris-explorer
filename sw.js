// ===== SERVICE WORKER - PARIS EXPLORER PWA =====

const CACHE_NAME = 'paris-explorer-v2.0.0';
const OFFLINE_URL = '/offline.html';

// Ressources critiques à mettre en cache (NOMS CORRIGES)
const CRITICAL_RESOURCES = [
    '/',
    '/index.html',
    '/assets/css/main.css',
    '/assets/css/responsive.css',
    '/assets/css/themes.css',
    '/assets/js/app.js',                // ✅ Corrigé (sans -advanced)
    '/assets/js/data-manager.js',
    '/assets/js/user-manager.js',       // ✅ Corrigé (sans -advanced)
    '/assets/js/ui-manager.js',         // ✅ Corrigé (sans -advanced)
    '/assets/js/map-manager.js',
    '/assets/js/utils.js',
    '/config.json',                     // ✅ Maintenant créé
    '/manifest.json',
    OFFLINE_URL                         // ✅ Maintenant créé
];

// Ressources secondaires (chargées en arrière-plan)
const SECONDARY_RESOURCES = [
    '/assets/js/export-import.js',      // ✅ Corrigé (sans -advanced)
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
    console.log('🔧 Installation du Service Worker Paris Explorer v2.0.0');
    
    event.waitUntil(
        (async () => {
            try {
                // Cache des ressources critiques
                const cache = await caches.open(CACHE_NAME);
                console.log('📦 Mise en cache des ressources critiques...');
                
                // Mise en cache progressive avec gestion d'erreur
                const criticalPromises = CRITICAL_RESOURCES.map(async (resource) => {
                    try {
                        const response = await fetch(resource);
                        if (response.ok) {
                            await cache.put(resource, response);
                            console.log(`✅ Mis en cache: ${resource}`);
                        } else {
                            console.warn(`⚠️ Ressource non trouvée: ${resource} (${response.status})`);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Erreur cache: ${resource}`, error.message);
                    }
                });
                
                await Promise.all(criticalPromises);
                console.log('✅ Ressources critiques mises en cache');
                
                // Préchargement des ressources secondaires en arrière-plan
                setTimeout(async () => {
                    try {
                        console.log('📦 Préchargement des ressources secondaires...');
                        const secondaryPromises = SECONDARY_RESOURCES.map(async (resource) => {
                            try {
                                const response = await fetch(resource);
                                if (response.ok) {
                                    await cache.put(resource, response);
                                }
                            } catch (error) {
                                console.warn(`⚠️ Erreur préchargement secondaire: ${resource}`);
                            }
                        });
                        await Promise.all(secondaryPromises);
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
    }
});

// === GESTION DES PUSH NOTIFICATIONS ===
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/assets/images/icon-192.png',
        badge: '/assets/images/badge-72.png',
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

// === UTILITAIRES CACHE ===
async function getCacheSize() {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
}

async function clearCache(pattern) {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    const toDelete = pattern 
        ? keys.filter(request => request.url.includes(pattern))
        : keys;
    
    const deleted = await Promise.all(
        toDelete.map(request => cache.delete(request))
    );
    
    return deleted.filter(Boolean).length;
}

async function preloadRoutes(routes) {
    const cache = await caches.open(CACHE_NAME);
    
    const preloadPromises = routes.map(async (route) => {
        try {
            const response = await fetch(route);
            if (response.ok) {
                await cache.put(route, response);
            }
        } catch (error) {
            console.warn(`⚠️ Erreur préchargement: ${route}`);
        }
    });
    
    await Promise.all(preloadPromises);
}

// === GESTION DES ERREURS GLOBALES ===
self.addEventListener('error', event => {
    console.error('❌ Erreur Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('❌ Promise rejetée dans Service Worker:', event.reason);
});

console.log('🗼 Service Worker Paris Explorer v2.0.0 chargé et prêt !');
