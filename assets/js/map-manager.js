// ===== MAP MANAGER - VERSION CORRIGÉE COMPLÈTE =====

class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.markers = [];
        this.arrondissementLayer = null;
        this.isMapReady = false;
        this.isFullscreen = false;
        this.fullscreenToggling = false;
        this.escapeListenerAdded = false;
        this.originalParent = null;
        this.originalNextSibling = null;
    }
    
    // === INITIALISATION DE LA CARTE ===
    initMap() {
        console.log('🗺️ Initialisation de la carte...');
        const mapContainer = document.getElementById('mapContainer');
        
        if (!mapContainer) {
            console.error('❌ Container de carte introuvable');
            this.showMapError('Container de carte introuvable dans le DOM');
            return;
        }
        
        if (this.map) {
            console.log('🗺️ Carte déjà initialisée, nettoyage...');
            this.cleanupMap();
        }
        
        try {
            // S'assurer que le container est visible et a une taille
            mapContainer.style.height = '500px';
            mapContainer.style.width = '100%';
            mapContainer.style.position = 'relative';
            mapContainer.style.zIndex = '1';
            
            // Créer la carte Leaflet
            this.map = L.map(mapContainer, {
                center: [48.8566, 2.3522], // Centre de Paris
                zoom: 11,
                zoomControl: true,
                attributionControl: true,
                preferCanvas: true, // Améliore les performances
                maxBounds: [[48.815, 2.224], [48.902, 2.469]], // Limites de Paris
                maxBoundsViscosity: 0.5
            });
            
            console.log('✅ Instance Leaflet créée');
            
            // Ajouter la couche de tuiles avec gestion d'erreur
            const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
                minZoom: 10,
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // Pixel transparent
                crossOrigin: true
            });
            
            tileLayer.addTo(this.map);
            
            // Événements de debugging pour les tuiles
            tileLayer.on('loading', () => console.log('📡 Chargement des tuiles...'));
            tileLayer.on('load', () => console.log('✅ Tuiles chargées'));
            tileLayer.on('tileerror', (e) => {
                console.warn('⚠️ Erreur tuile:', e.tile.src);
            });
            
            console.log('✅ Couche de tuiles ajoutée');
            
            // Attendre que la carte soit prête
            this.map.whenReady(() => {
                console.log('✅ Carte prête !');
                this.isMapReady = true;
                
                // Forcer le redimensionnement et charger le contenu
                setTimeout(() => {
                    this.map.invalidateSize();
                    this.loadMapContent();
                }, 100);
            });
            
            // Événement de zoom intelligent - change seulement le type d'affichage
            let lastZoomLevel = this.map.getZoom();
            this.map.on('zoomend', () => {
                const currentZoom = this.map.getZoom();
                const wasOverviewMode = lastZoomLevel <= 12;
                const isOverviewMode = currentZoom <= 12;
                
                // Ne recharger que si on change de mode (overview ↔ détaillé)
                if (wasOverviewMode !== isOverviewMode) {
                    console.log(`🔍 Changement de mode: ${isOverviewMode ? 'vue d\'ensemble' : 'vue détaillée'}`);
                    this.clearMarkers();
                    this.loadMapContent();
                }
                
                lastZoomLevel = currentZoom;
            });
            
            // Événement de clic supprimé - plus d'affichage de coordonnées inutiles
            
            // Gestion d'erreurs de chargement
            this.map.on('error', (e) => {
                console.error('❌ Erreur carte:', e);
                this.app.showNotification('Erreur de chargement de la carte', 'error');
            });
            
            // Les contrôles sont déjà configurés via Leaflet
            
            console.log('✅ Carte complètement initialisée');
            
        } catch (error) {
            console.error('❌ Erreur initialisation carte:', error);
            this.showMapError(error.message);
        }
    }
    
    // === CHARGEMENT DU CONTENU ===
    async loadMapContent() {
        console.log('📍 Chargement du contenu de la carte...');
        
        if (!this.isMapReady) {
            console.warn('⏳ Carte pas encore prête, report du chargement');
            setTimeout(() => this.loadMapContent(), 500);
            return;
        }
        
        // Nettoyer le contenu existant
        this.clearMarkers();
        
        if (this.app.isDataLoaded && this.app.parisData && Object.keys(this.app.parisData).length > 0) {
            console.log('✅ Utilisation des vraies données');
            await this.loadRealData();
        } else {
            console.log('📋 Aucune donnée chargée');
            this.app.uiManager.showNotification('Veuillez charger les données pour afficher la carte.', 'warning');
        }
    }
    
    // === CHARGEMENT DES VRAIES DONNÉES ===
    async loadRealData() {
        console.log('🗺️ Chargement des lieux sur la carte...');
        console.log('📊 Données disponibles:', Object.keys(this.app.parisData));
        const zoom = this.map.getZoom();
        console.log('🔍 Zoom actuel:', zoom);
        let markersAdded = 0;
        
        // Initialiser le tableau de marqueurs si nécessaire
        if (!this.currentMarkers) {
            this.currentMarkers = [];
        }
        
        try {
            if (zoom <= 12) {
                // Vue d'ensemble : marqueurs d'arrondissements
                console.log('🏛️ Affichage des arrondissements (vue d\'ensemble)');
                
                for (const [arrKey, arrData] of Object.entries(this.app.parisData)) {
                    const arrInfo = arrData.arrondissement || arrData;
                    const arrName = arrInfo.name || arrKey;
                    
                    // Utiliser les coordonnées du centre de l'arrondissement
                    const coords = arrInfo.center || arrData.center;
                    if (coords) {
                        console.log(`📍 Arrondissement ${arrKey}: ${arrName} à`, coords);
                        
                        // Créer un marqueur pour l'arrondissement
                        const marker = L.marker(coords, {
                            icon: L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div class="marker-pin">
                                          <div class="marker-circle arr-marker">
                                              <span class="marker-emoji">🏛️</span>
                                          </div>
                                          <div class="marker-label">${arrKey}</div>
                                       </div>`,
                                iconSize: [40, 55],
                                iconAnchor: [20, 55] // Pointe du marqueur
                            })
                        }).addTo(this.map);
                        
                        // Popup avec informations sur l'arrondissement
                        const placeCount = arrData.categories ? 
                            Object.values(arrData.categories).reduce((acc, cat) => acc + (cat.places ? cat.places.length : 0), 0) : 0;
                        
                        marker.bindPopup(this.createArrondissementPopup(arrKey, arrInfo, 0, placeCount, 0));
                        
                        this.currentMarkers.push(marker);
                        markersAdded++;
                    }
                }
            } else {
                // Vue détaillée : afficher les lieux individuels
                console.log('📍 Vue détaillée - affichage des lieux');
                
                // Obtenir les limites de la vue actuelle
                const bounds = this.map.getBounds();
                
                for (const [arrKey, arrData] of Object.entries(this.app.parisData)) {
                    const arrInfo = arrData.arrondissement || arrData;
                    const arrondissementName = arrInfo.name || arrKey.charAt(0).toUpperCase() + arrKey.slice(1);
                    
                    // Vérifier si l'arrondissement est dans la vue actuelle
                    const centerCoords = arrInfo.center || arrData.center;
                    if (centerCoords) {
                        const arrCenter = L.latLng(centerCoords[0], centerCoords[1]);
                        
                        if (bounds.contains(arrCenter)) {
                            console.log(`📍 Affichage des lieux de ${arrKey}`);
                            
                            if (arrData.categories) {
                                let placeIndex = 0;
                                
                                for (const [catKey, catData] of Object.entries(arrData.categories)) {
                                    if (catData.places) {
                                        for (const place of catData.places) {
                                            let lat, lng;
                                            
                                            // Utiliser les vraies coordonnées si disponibles
                                            if (place.coordinates && Array.isArray(place.coordinates) && place.coordinates.length === 2) {
                                                lat = place.coordinates[0];
                                                lng = place.coordinates[1];
                                                console.log(`📍 ${place.name}: vraies coordonnées [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                                            } else {
                                                // Fallback : coordonnées approximatives par catégorie
                                                const categoryOffsets = {
                                                    'monuments': { lat: 0.001, lng: 0.001 },
                                                    'musees': { lat: -0.001, lng: 0.001 }, 
                                                    'parcs': { lat: 0.001, lng: -0.001 },
                                                    'culture': { lat: -0.001, lng: -0.001 },
                                                    'shopping': { lat: 0.0005, lng: 0.0005 },
                                                    'restaurants': { lat: -0.0005, lng: 0.0005 },
                                                    'cafes': { lat: 0.0005, lng: -0.0005 }
                                                };

                                                const baseOffset = categoryOffsets[catKey] || { lat: 0, lng: 0 };
                                                const angle = (placeIndex * 137.5) % 360;
                                                const radius = 0.002 + (placeIndex % 8) * 0.0008;
                                                
                                                const fallbackCoords = arrInfo.center || arrData.center || [48.8566, 2.3522];
                                                lat = fallbackCoords[0] + baseOffset.lat + radius * Math.cos(angle * Math.PI / 180);
                                                lng = fallbackCoords[1] + baseOffset.lng + radius * Math.sin(angle * Math.PI / 180);
                                                console.log(`📍 ${place.name}: coordonnées approximatives [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                                            }
                                            
                                            // Créer l'icône selon la catégorie
                                            const categoryIcons = {
                                                'monuments': '🏛️',
                                                'musees': '🏛️', 
                                                'parcs': '🌳',
                                                'culture': '🎭',
                                                'shopping': '🛍️',
                                                'restaurants': '🍽️',
                                                'cafes': '☕'
                                            };
                                            
                                            const categoryIcon = categoryIcons[catKey] || '📍';
                                            
                                            // Vérifier si le lieu est visité
                                            const isVisited = this.app.userManager && this.app.userManager.currentUser &&
                                                this.app.userManager.currentUser.visitedPlaces &&
                                                this.app.userManager.currentUser.visitedPlaces[`${arrKey}_${place.id}`];
                                            
                                            // Créer le marqueur
                                            const marker = L.marker([lat, lng], {
                                                icon: L.divIcon({
                                                    className: 'custom-div-icon',
                                                    html: `<div class="marker-pin" title="${place.name}">
                                                              <div class="marker-circle place-marker ${catKey}-marker ${isVisited ? 'visited' : ''}">
                                                                  <span class="marker-emoji">${categoryIcon}</span>
                                                                  ${isVisited ? '<span class="visited-check">✓</span>' : ''}
                                                              </div>
                                                           </div>`,
                                                    iconSize: [36, 36],
                                                    iconAnchor: [18, 36], // Base du marqueur
                                                    popupAnchor: [0, -36]
                                                })
                                            }).addTo(this.map);
                                            
                                            // Popup avec informations du lieu
                                            marker.bindPopup(this.createPlacePopup(place, catKey, isVisited, arrondissementName));
                                            
                                            this.currentMarkers.push(marker);
                                            markersAdded++;
                                            placeIndex++;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                console.log(`📍 ${markersAdded} lieux affichés en vue détaillée`);
            }
        } catch (error) {
            console.error('❌ Erreur lors du géocodage:', error);
        }
        
        console.log(`📊 Résultat final: ${markersAdded} marqueurs ajoutés`);
        
        if (markersAdded === 0) {
            console.warn('⚠️ Aucun marqueur ajouté');
            // Vérifier si c'est un problème de coordonnées
            console.log('Vérifiez que les données contiennent des coordonnées valides.');
        } else {
            console.log(`🎉 ${markersAdded} lieux affichés sur la carte !`);
        }
    }
    
    // === GÉOCODAGE DES ADRESSES ===
    async geocodeAddress(address) {
        console.log(`🔍 Tentative de géocodage pour: "${address}"`);
        
        if (!address) {
            console.warn('⚠️ Adresse vide fournie au géocodage');
            return null;
        }
        
        try {
            // Utiliser Nominatim (OpenStreetMap) pour le géocodage gratuit
            const encodedAddress = encodeURIComponent(address);
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
            console.log(`🌐 URL de géocodage: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Paris Explorer App (contact: admin@parisexplorer.app)'
                }
            });
            
            console.log(`📡 Réponse HTTP: status ${response.status}`);
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            console.log(`📊 Données reçues:`, data);
            
            if (data && data.length > 0) {
                const result = data[0];
                const coords = [parseFloat(result.lat), parseFloat(result.lon)];
                console.log(`✅ Géocodage réussi pour "${address}" -> ${coords}`);
                console.log(`📍 Nom trouvé: ${result.display_name}`);
                return coords;
            } else {
                console.warn(`⚠️ Aucun résultat de géocodage pour "${address}"`);
                return null;
            }
            
        } catch (error) {
            console.error(`❌ Erreur de géocodage pour "${address}":`, error);
            return null;
        }
    }
    
    // === CRÉATION DE MARQUEURS DEPUIS COORDONNÉES ===
    createArrondissementMarkerFromCoords(coords, arrData, arrKey, totalPlaces, visitedPlaces, completionPercent) {
        if (!coords) return null;
        
        // Couleur selon completion
        let fillColor = '#dc2626'; // Rouge par défaut
        if (completionPercent === 100) fillColor = '#059669'; // Vert complet
        else if (completionPercent >= 70) fillColor = '#059669'; // Vert
        else if (completionPercent >= 40) fillColor = '#d97706'; // Orange
        else if (completionPercent > 0) fillColor = '#dc2626'; // Rouge
        else fillColor = '#6b7280'; // Gris non visité
        
        const marker = L.circleMarker(coords, {
            color: '#1e3a8a',
            fillColor: fillColor,
            fillOpacity: 0.7,
            radius: Math.max(8, Math.min(25, completionPercent / 4 + 10)),
            weight: 2
        }).addTo(this.map);
        
        marker.bindPopup(this.createArrondissementPopup(arrKey, arrData, visitedPlaces, totalPlaces, completionPercent));
        
        // Effet hover
        marker.on('mouseover', function() {
            this.setStyle({ radius: this.options.radius + 3, weight: 4 });
        });
        marker.on('mouseout', function() {
            this.setStyle({ radius: this.options.radius - 3, weight: 2 });
        });
        
        return marker;
    }
    
    createPlaceMarkerFromCoords(coords, place, catKey, isVisited, arrondissementName) {
        if (!coords) return null;
        
        const icon = this.getPlaceIcon(catKey, isVisited);
        const marker = L.marker(coords, { icon }).addTo(this.map);
        
        marker.bindPopup(this.createPlacePopup(place, catKey, isVisited, arrondissementName));
        
        return marker;
    }
    
    clearMarkers() {
        // Supprimer tous les marqueurs de la carte
        if (this.currentMarkers && this.currentMarkers.length > 0) {
            this.currentMarkers.forEach(marker => {
                if (marker && this.map) {
                    this.map.removeLayer(marker);
                }
            });
            this.currentMarkers = [];
        }
        
        // Supprimer aussi les marqueurs d'arrondissements si présents
        if (this.arrondissementMarkers) {
            this.arrondissementMarkers.forEach(marker => {
                if (marker && this.map) {
                    this.map.removeLayer(marker);
                }
            });
            this.arrondissementMarkers.clear();
        }
    }
    
    cleanupMap() {
        console.log('🧹 Nettoyage de la carte...');
        
        if (this.map) {
            // Supprimer tous les marqueurs
            this.clearMarkers();
            
            // Supprimer la carte
            this.map.remove();
            this.map = null;
        }
        
        this.isMapReady = false;
        this.isFullscreen = false;
        
        console.log('✅ Carte nettoyée');
    }
    
    // === MÉTHODES PUBLIQUES ===
    refreshMap() {
        console.log('🔄 Actualisation de la carte...');
        
        if (this.map) {
            this.map.invalidateSize();
            this.loadMapContent();
        } else {
            this.initMap();
        }
    }
    
    async focusOnArrondissement(arrKey) {
        // Géocoder le nom de l'arrondissement pour obtenir les coordonnées
        const arrData = this.app.parisData[arrKey];
        if (!arrData) return;
        
        const arrInfo = arrData.arrondissement || arrData;
        const arrName = arrInfo.name || arrKey;
        const coords = await this.geocodeAddress(arrName + " Paris");
        if (coords && this.map) {
            this.map.setView(coords, 14);
            console.log(`🎯 Zoom sur ${arrKey}`);
            // Notification zoom supprimée - action évidente
        }
    }
    
    // === ÉTAT ===
    isInitialized() {
        return this.map !== null && this.isMapReady;
    }
    
    getMarkersCount() {
        return this.markers.length;
    }
    
    getCurrentZoom() {
        return this.map ? this.map.getZoom() : 0;
    }
    
    getCurrentCenter() {
        return this.map ? this.map.getCenter() : null;
    }
    
    // === PLEIN ÉCRAN ===
    toggleFullscreen() {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) {
            console.error('❌ Container de carte non trouvé');
            return;
        }
        
        try {
            if (!this.isFullscreen) {
                // Passer en plein écran
                if (mapContainer.requestFullscreen) {
                    mapContainer.requestFullscreen();
                } else if (mapContainer.webkitRequestFullscreen) {
                    mapContainer.webkitRequestFullscreen();
                } else if (mapContainer.mozRequestFullScreen) {
                    mapContainer.mozRequestFullScreen();
                } else if (mapContainer.msRequestFullscreen) {
                    mapContainer.msRequestFullscreen();
                } else {
                    // Fallback : mode plein écran simulé
                    this.enterSimulatedFullscreen(mapContainer);
                }
            } else {
                // Sortir du plein écran
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else {
                    // Fallback : sortir du mode simulé
                    this.exitSimulatedFullscreen(mapContainer);
                }
            }
            
            // Événements pour détecter les changements de plein écran
            document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
            document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
            document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
            document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
            
        } catch (error) {
            console.error('❌ Erreur lors du toggle plein écran:', error);
            this.app.uiManager.showNotification('Erreur lors du passage en plein écran', 'error');
        }
    }
    
    enterSimulatedFullscreen(container) {
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.zIndex = '9999';
        container.style.background = '#000';
        
        this.isFullscreen = true;
        this.updateFullscreenUI();
        
        // Redimensionner la carte après le changement
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
    }
    
    exitSimulatedFullscreen(container) {
        container.style.position = '';
        container.style.top = '';
        container.style.left = '';
        container.style.width = '';
        container.style.height = '';
        container.style.zIndex = '';
        container.style.background = '';
        
        this.isFullscreen = false;
        this.updateFullscreenUI();
        
        // Redimensionner la carte après le changement
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
    }
    
    handleFullscreenChange() {
        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        
        this.isFullscreen = isCurrentlyFullscreen;
        this.updateFullscreenUI();
        
        // Redimensionner la carte après le changement
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
    }
    
    updateFullscreenUI() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = this.isFullscreen ? '🗗' : '🗖';
            fullscreenBtn.title = this.isFullscreen ? 'Quitter le plein écran' : 'Plein écran';
        }
    }
    
    // === CENTRER LA CARTE ===
    centerMap() {
        if (!this.map) {
            console.warn('⚠️ Carte non initialisée');
            return;
        }
        
        // Coordonnées du centre de Paris
        const parisCenter = [48.8566, 2.3522];
        const defaultZoom = 11;
        
        try {
            this.map.setView(parisCenter, defaultZoom);
            console.log('🎯 Carte centrée sur Paris');
            // Carte centrée
        } catch (error) {
            console.error('❌ Erreur lors du centrage:', error);
        }
    }

    // === CRÉATION DES POPUPS ===
    createPlacePopup(place, catKey, isVisited, arrondissementName) {
        const categoryIcons = {
            'monuments': '🏛️',
            'musees': '🏛️',  
            'parcs': '🌳',
            'culture': '🎭',
            'shopping': '🛍️',
            'restaurants': '🍽️',
            'cafes': '☕'
        };

        const categoryNames = {
            'monuments': 'Monuments',
            'musees': 'Musées',
            'parcs': 'Parcs et Jardins',
            'culture': 'Culture',
            'shopping': 'Shopping',
            'restaurants': 'Restaurants',
            'cafes': 'Cafés'
        };

        const categoryIcon = categoryIcons[catKey] || '📍';
        const categoryName = categoryNames[catKey] || catKey;
        
        // Créer le lien Google Maps si l'adresse existe
        const googleMapsLink = place.address ? 
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}` : '';

        return `
            <div class="place-popup-card">
                <div class="place-popup-header">
                    <div class="place-popup-title">
                        <span class="place-popup-icon">${categoryIcon}</span>
                        <h4>${place.name}</h4>
                    </div>
                    <div class="place-popup-category">${categoryName}</div>
                    ${isVisited ? '<div class="place-popup-visited">✅ Visité</div>' : ''}
                </div>
                <div class="place-popup-content">
                    ${place.description ? `<p class="place-popup-description">${place.description}</p>` : ''}
                    ${place.address ? `
                        <p class="place-popup-address">
                            📍 <a href="${googleMapsLink}" target="_blank" style="color: var(--paris-blue); text-decoration: none; border-bottom: 1px solid var(--paris-blue);">
                                ${place.address}
                            </a>
                        </p>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createArrondissementPopup(arrKey, arrData, visitedPlaces, totalPlaces, completionPercent) {
        const arrInfo = arrData.arrondissement || arrData;
        const arrName = arrInfo.name || arrKey.charAt(0).toUpperCase() + arrKey.slice(1);
        
        return `
            <div class="arrondissement-popup-card">
                <div class="arrondissement-popup-header">
                    <h3>${arrName}</h3>
                    ${completionPercent > 0 ? `<div class="completion-badge">${completionPercent}% exploré</div>` : ''}
                </div>
                <div class="arrondissement-popup-content">
                    ${arrInfo.description ? `<p class="arrondissement-popup-description">${arrInfo.description}</p>` : ''}
                    <div class="arrondissement-popup-stats">
                        <div class="stat-item">
                            <span class="stat-number">${totalPlaces}</span>
                            <span class="stat-label">lieux à découvrir</span>
                        </div>
                        ${visitedPlaces > 0 ? `
                            <div class="stat-item">
                                <span class="stat-number">${visitedPlaces}</span>
                                <span class="stat-label">visités</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
}
