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
            
            // Créer la carte Leaflet avec support tactile explicite pour iOS
            this.map = L.map(mapContainer, {
                center: [48.8566, 2.3522], // Centre de Paris
                zoom: 11,
                zoomControl: true,
                attributionControl: true,
                preferCanvas: true, // Améliore les performances
                maxBounds: [[48.815, 2.224], [48.902, 2.469]], // Limites de Paris
                maxBoundsViscosity: 0.5,
                touchZoom: true,
                dragging: true,
                tap: true,
                tapTolerance: 15
            });
            
            console.log('✅ Instance Leaflet créée');
            
            // Ajouter la couche de tuiles
            const savedStyle = this.app.userManager?.getCurrentUserData()?.settings?.mapStyle || 'standard';
            this.tileLayer = this._createTileLayer(savedStyle);
            this.tileLayer.addTo(this.map);
            
            // Événements de debugging pour les tuiles
            this.tileLayer.on('tileerror', (e) => {
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
            this.app.showNotification('Veuillez charger les données pour afficher la carte.', 'warning');
        }
    }
    
    // === CHARGEMENT DES VRAIES DONNÉES ===
    async loadRealData() {
        console.log('🗺️ Chargement des lieux sur la carte...');
        console.log('📊 Données disponibles:', Object.keys(this.app.parisData));
        
        // Debug: Afficher la structure des données pour le premier arrondissement
        const firstArr = Object.keys(this.app.parisData)[0];
        if (firstArr) {
            console.log(`📊 Structure de ${firstArr}:`, this.app.parisData[firstArr]);
            if (this.app.parisData[firstArr].center) {
                console.log(`📍 Centre de ${firstArr}:`, this.app.parisData[firstArr].center);
            }
            if (this.app.parisData[firstArr].arrondissement) {
                console.log(`📍 Arrondissement data:`, this.app.parisData[firstArr].arrondissement);
            }
        }
        
        const zoom = this.map.getZoom();
        console.log('🔍 Zoom actuel:', zoom);
        let markersAdded = 0;
        
        // Initialiser le tableau de marqueurs si nécessaire
        if (!this.currentMarkers) {
            this.currentMarkers = [];
        }
        
        // Obtenir les résultats filtrés de la recherche si des filtres sont actifs
        const hasActiveFilters = this.app.searchFilter && (
            this.app.searchFilter.activeFilters.arrondissement ||
            this.app.searchFilter.activeFilters.category ||
            this.app.searchFilter.activeFilters.status ||
            this.app.searchFilter.activeFilters.hideCompleted ||
            this.app.searchQuery
        );
        
        let filteredResults = null;
        if (hasActiveFilters) {
            filteredResults = this.app.searchFilter.performSearch(this.app.searchQuery || '', this.app.searchFilter.activeFilters);
            console.log(`🔍 Filtres actifs détectés: ${filteredResults.length} lieux correspondants`);
        }
        
        try {
            if (zoom <= 12) {
                // Vue d'ensemble : marqueurs d'arrondissements
                console.log('🏛️ Affichage des arrondissements (vue d\'ensemble)');
                console.log('📊 Structure complète des données:', this.app.parisData);
                
                for (const [arrKey, arrData] of Object.entries(this.app.parisData)) {
                    console.log(`🔍 Traitement de ${arrKey}:`, arrData);
                    
                    const arrInfo = arrData.arrondissement || arrData;
                    const arrName = arrInfo.name || arrKey;
                    
                    // Utiliser les coordonnées du centre de l'arrondissement ou fallback
                    let coords = arrInfo.center || arrData.center;
                    
                    // Si pas de coordonnées, utiliser les coordonnées par défaut
                    if (!coords) {
                        const defaultCoords = {
                            '1': [48.8607, 2.3358],
                            '2': [48.87, 2.3408],
                            '3': [48.863, 2.3626],
                            '4': [48.8534, 2.3488],
                            '5': [48.8462, 2.3372],
                            '6': [48.8496, 2.3341],
                            '7': [48.8534, 2.2944],
                            '8': [48.8718, 2.3075],
                            '9': [48.8768, 2.3364],
                            '10': [48.8709, 2.3674],
                            '11': [48.8594, 2.3765],
                            '12': [48.8448, 2.3776],
                            '13': [48.8282, 2.3555],
                            '14': [48.8323, 2.3255],
                            '15': [48.8428, 2.2944],
                            '16': [48.8635, 2.2773],
                            '17': [48.8799, 2.2951],
                            '18': [48.8867, 2.3431],
                            '19': [48.8799, 2.3831],
                            '20': [48.8631, 2.3969]
                        };
                        
                        // Essayer avec juste le numéro
                        const arrNum = arrKey.replace(/[^0-9]/g, '');
                        coords = defaultCoords[arrNum] || defaultCoords[arrKey] || [48.8566, 2.3522];
                        console.log(`⚠️ Utilisation coordonnées par défaut pour ${arrKey}: ${coords}`);
                    }
                    
                    if (coords) {
                        console.log(`✅ Arrondissement ${arrKey}: ${arrName} à`, coords);
                        
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
                
                if (hasActiveFilters && filteredResults) {
                    // Utiliser les résultats filtrés
                    console.log(`🔍 Application des filtres: ${filteredResults.length} lieux à afficher`);
                    
                    filteredResults.forEach(result => {
                        const { place, arrKey, catKey, arrData, catData } = result;
                        const arrInfo = arrData.arrondissement || arrData;
                        const arrondissementName = arrInfo.name || arrKey.charAt(0).toUpperCase() + arrKey.slice(1);
                        
                        let lat, lng;
                        
                        // Utiliser les vraies coordonnées si disponibles
                        if (place.coordinates && Array.isArray(place.coordinates) && place.coordinates.length === 2) {
                            lat = place.coordinates[0];
                            lng = place.coordinates[1];
                            console.log(`📍 ${place.name}: vraies coordonnées [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                        } else {
                            // Fallback : coordonnées approximatives par catégorie
                            const categoryOffsets = {
                                'monument': { lat: 0.001, lng: 0.001 },
                                'musee': { lat: -0.001, lng: 0.001 }, 
                                'parc': { lat: 0.001, lng: -0.001 },
                                'culture': { lat: -0.001, lng: -0.001 },
                                'shopping': { lat: 0.0005, lng: 0.0005 },
                                'restaurant': { lat: -0.0005, lng: 0.0005 },
                                'cafe': { lat: 0.0005, lng: -0.0005 }
                            };

                            const baseOffset = categoryOffsets[catKey] || { lat: 0, lng: 0 };
                            const angle = (markersAdded * 137.5) % 360;
                            const radius = 0.002 + (markersAdded % 8) * 0.0008;
                            
                            const fallbackCoords = arrInfo.center || arrData.center || [48.8566, 2.3522];
                            lat = fallbackCoords[0] + baseOffset.lat + radius * Math.cos(angle * Math.PI / 180);
                            lng = fallbackCoords[1] + baseOffset.lng + radius * Math.sin(angle * Math.PI / 180);
                            console.log(`📍 ${place.name}: coordonnées approximatives [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                        }
                        
                        // Créer l'icône selon la catégorie
                        const categoryIcons = {
                            'monument': '🏛️',
                            'musee': '🎨', 
                            'parc': '🌳',
                            'culture': '🎭',
                            'shopping': '🛍️',
                            'restaurant': '🍽️',
                            'cafe': '☕'
                        };
                        
                        const categoryIcon = categoryIcons[catKey] || '📍';
                        
                        // Vérifier si le lieu est visité
                        const placeId = this.app.dataManager.createPlaceId(arrKey, catKey, place.name);
                        const currentUserData = this.app.userManager ? this.app.userManager.getCurrentUserData() : null;
                        const isVisited = currentUserData && currentUserData.visitedPlaces &&
                            currentUserData.visitedPlaces.has(placeId);

                        // Créer le marqueur
                        const marker = L.marker([lat, lng], {
                            icon: L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div class="marker-pin" title="${escapeHtml(place.name)}">
                                          <div class="marker-circle place-marker ${escapeHtml(catKey)}-marker ${isVisited ? 'visited' : ''}">
                                              <span class="marker-emoji">${categoryIcon}</span>
                                              ${isVisited ? '<span class="visited-check">✓</span>' : ''}
                                          </div>
                                       </div>`,
                                iconSize: [36, 36],
                                iconAnchor: [18, 36],
                                popupAnchor: [0, -36]
                            })
                        }).addTo(this.map);

                        // Stocker le placeId pour mise à jour visuelle
                        marker._placeId = placeId;
                        marker._catKey = catKey;

                        // Popup avec informations du lieu
                        marker.bindPopup(this.createPlacePopup(place, catKey, isVisited, arrondissementName, placeId));

                        this.currentMarkers.push(marker);
                        markersAdded++;
                    });
                } else {
                    // Affichage normal sans filtres - limiter par bounds de la vue
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
                                                        'monument': { lat: 0.001, lng: 0.001 },
                                                        'musee': { lat: -0.001, lng: 0.001 }, 
                                                        'parc': { lat: 0.001, lng: -0.001 },
                                                        'culture': { lat: -0.001, lng: -0.001 },
                                                        'shopping': { lat: 0.0005, lng: 0.0005 },
                                                        'restaurant': { lat: -0.0005, lng: 0.0005 },
                                                        'cafe': { lat: 0.0005, lng: -0.0005 }
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
                                                    'monument': '🏛️',
                                                    'musee': '🎨', 
                                                    'parc': '🌳',
                                                    'culture': '🎭',
                                                    'shopping': '🛍️',
                                                    'restaurant': '🍽️',
                                                    'cafe': '☕'
                                                };
                                                
                                                const categoryIcon = categoryIcons[catKey] || '📍';
                                                
                                                // Vérifier si le lieu est visité
                                                const placeId = this.app.dataManager.createPlaceId(arrKey, catKey, place.name);
                                                const currentUserData = this.app.userManager ? this.app.userManager.getCurrentUserData() : null;
                                                const isVisited = currentUserData && currentUserData.visitedPlaces &&
                                                    currentUserData.visitedPlaces.has(placeId);
                                                
                                                // Créer le marqueur
                                                const marker = L.marker([lat, lng], {
                                                    icon: L.divIcon({
                                                        className: 'custom-div-icon',
                                                        html: `<div class="marker-pin" title="${escapeHtml(place.name)}">
                                                                  <div class="marker-circle place-marker ${escapeHtml(catKey)}-marker ${isVisited ? 'visited' : ''}">
                                                                      <span class="marker-emoji">${categoryIcon}</span>
                                                                      ${isVisited ? '<span class="visited-check">✓</span>' : ''}
                                                                  </div>
                                                               </div>`,
                                                        iconSize: [36, 36],
                                                        iconAnchor: [18, 36], // Base du marqueur
                                                        popupAnchor: [0, -36]
                                                    })
                                                }).addTo(this.map);
                                                
                                                // Stocker le placeId pour mise à jour visuelle
                                                marker._placeId = placeId;
                                                marker._catKey = catKey;

                                                // Popup avec informations du lieu
                                                marker.bindPopup(this.createPlacePopup(place, catKey, isVisited, arrondissementName, placeId));

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
    
    // === GESTION DES LIEUX VISITÉS ===
    toggleVisitedPlace(placeId) {
        console.log(`🔄 Toggle du lieu: ${placeId}`);
        
        // Vérifier qu'un utilisateur est connecté
        if (!this.app.userManager || !this.app.userManager.currentUser) {
            this.app.showNotification('Veuillez d\'abord sélectionner un utilisateur', 'warning');
            return;
        }
        
        // Toggle le statut visité du lieu
        this.app.userManager.togglePlaceVisited(placeId);
        
        // Fermer la popup pour éviter les problèmes de rafraîchissement
        if (this.map) {
            this.map.closePopup();
        }
        
        const userData = this.app.userManager.getCurrentUserData();
        const isNowVisited = userData && userData.visitedPlaces && userData.visitedPlaces.has(placeId);
        
        // Mettre à jour visuellement le marqueur correspondant si possible
        this.updateMarkerVisualState(placeId, isNowVisited);
        
        console.log(`✅ Statut mis à jour pour: ${placeId}`);
    }
    
    // === MISE À JOUR VISUELLE DES MARQUEURS ===
    updateMarkerVisualState(placeId, isVisited) {
        if (!this.currentMarkers) return;

        const marker = this.currentMarkers.find(m => m._placeId === placeId);
        if (!marker) return;

        // Mettre à jour le DOM du marqueur
        const el = marker.getElement();
        if (el) {
            const circle = el.querySelector('.marker-circle');
            if (circle) {
                if (isVisited) {
                    circle.classList.add('visited');
                    if (!circle.querySelector('.visited-check')) {
                        const check = document.createElement('span');
                        check.className = 'visited-check';
                        check.textContent = '✓';
                        circle.appendChild(check);
                    }
                } else {
                    circle.classList.remove('visited');
                    const check = circle.querySelector('.visited-check');
                    if (check) check.remove();
                }
            }
        }

        // Mettre à jour aussi la checkbox dans le popup s'il est ouvert
        const popup = marker.getPopup();
        if (popup && popup.isOpen()) {
            const checkbox = popup.getElement()?.querySelector('.visited-checkbox');
            if (checkbox) checkbox.checked = isVisited;
        }

        console.log(`🎨 Marqueur ${placeId} mis à jour: ${isVisited ? 'visité' : 'non visité'}`);
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
    
    // === STYLE DE CARTE ===
    _createTileLayer(style) {
        const styles = {
            standard: {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            },
            watercolor: {
                url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
                attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://stamen.com/">Stamen</a>'
            },
            toner: {
                url: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png',
                attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://stamen.com/">Stamen</a>'
            },
            'carto-light': {
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
            },
            'carto-dark': {
                url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
            }
        };
        const s = styles[style] || styles.standard;
        return L.tileLayer(s.url, {
            attribution: s.attribution,
            maxZoom: 19,
            minZoom: 10
        });
    }

    changeMapStyle(style) {
        if (!this.map) return;
        if (this.tileLayer) {
            this.map.removeLayer(this.tileLayer);
        }
        this.tileLayer = this._createTileLayer(style);
        this.tileLayer.addTo(this.map);
        this.app.userManager.updateSettingAndApply('mapStyle', style);
    }

    // === PLEIN ÉCRAN ===
    toggleFullscreen() {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) {
            console.error('❌ Container de carte non trouvé');
            return;
        }
        
        try {
            // iOS Safari ne supporte pas l'API Fullscreen - utiliser le mode simulé
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const supportsFullscreen = document.fullscreenEnabled || document.webkitFullscreenEnabled;

            if (!this.isFullscreen) {
                if (!isIOS && supportsFullscreen) {
                    // API Fullscreen native (desktop, Android)
                    if (mapContainer.requestFullscreen) {
                        mapContainer.requestFullscreen();
                    } else if (mapContainer.webkitRequestFullscreen) {
                        mapContainer.webkitRequestFullscreen();
                    }
                } else {
                    // Mode simulé pour iOS et navigateurs sans API Fullscreen
                    this.enterSimulatedFullscreen(mapContainer);
                }
            } else {
                if (!isIOS && supportsFullscreen) {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                } else {
                    this.exitSimulatedFullscreen(mapContainer);
                }
            }

            // Événements pour détecter les changements de plein écran natif
            if (!this._fullscreenListenersAdded) {
                document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
                document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
                this._fullscreenListenersAdded = true;
            }

        } catch (error) {
            console.error('❌ Erreur lors du toggle plein écran:', error);
            // Fallback ultime : mode simulé
            if (!this.isFullscreen) {
                this.enterSimulatedFullscreen(mapContainer);
            } else {
                this.exitSimulatedFullscreen(mapContainer);
            }
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

        // Empêcher le scroll du body (important sur iOS)
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        // Ajouter un bouton de fermeture flottant
        const closeBtn = document.createElement('button');
        closeBtn.id = 'simulated-fullscreen-close';
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'position:fixed;top:12px;right:12px;z-index:10000;width:40px;height:40px;border-radius:50%;border:none;background:rgba(0,0,0,0.6);color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;';
        closeBtn.addEventListener('click', () => this.toggleFullscreen());
        document.body.appendChild(closeBtn);

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

        // Restaurer le scroll du body
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';

        // Retirer le bouton de fermeture
        const closeBtn = document.getElementById('simulated-fullscreen-close');
        if (closeBtn) closeBtn.remove();

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
    createPlacePopup(place, catKey, isVisited, arrondissementName, placeId) {
        const categoryIcons = {
            'monument': '🏛️',
            'musee': '🎨',  
            'parc': '🌳',
            'culture': '🎭',
            'shopping': '🛍️',
            'restaurant': '🍽️',
            'cafe': '☕'
        };

        const categoryNames = {
            'monument': 'Monument',
            'musee': 'Musée',
            'parc': 'Parc et Jardin',
            'culture': 'Culture',
            'shopping': 'Shopping',
            'restaurant': 'Restaurant',
            'cafe': 'Café'
        };

        const categoryIcon = categoryIcons[catKey] || '📍';
        const categoryName = categoryNames[catKey] || catKey;

        // Use the shared utility for Google Maps URL
        const googleMapsLink = generateGoogleMapsUrl(place, place.coordinates);

        // Escape all dynamic content for XSS protection
        const safeName = escapeHtml(place.name);
        const safeDescription = escapeHtml(place.description);
        const safeAddress = escapeHtml(place.address);
        const safeId = escapeHtml(placeId);

        return `
            <div class="place-popup-card">
                <div class="place-popup-header">
                    <div class="place-popup-title">
                        <div class="place-popup-title-left">
                            <span class="place-popup-icon">${categoryIcon}</span>
                            <h4>${safeName}</h4>
                        </div>
                        <label class="place-popup-checkbox">
                            <input type="checkbox" ${isVisited ? 'checked' : ''}
                                   data-place-id="${safeId}"
                                   onchange="window.mapManager.toggleVisitedPlace(this.dataset.placeId)"
                                   style="transform: scale(1.2); cursor: pointer;">
                            <span style="margin-left: 4px; font-size: 12px; color: #6b7280;">Visité</span>
                        </label>
                    </div>
                    <div class="place-popup-category">${escapeHtml(categoryName)}</div>
                </div>
                <div class="place-popup-content">
                    ${place.description ? `<p class="place-popup-description">${safeDescription}</p>` : ''}
                    ${place.address ? `
                        <p class="place-popup-address">
                            📍 <a href="${googleMapsLink}" target="_blank" rel="noopener" style="color: var(--paris-blue); text-decoration: none; border-bottom: 1px solid var(--paris-blue);">
                                ${safeAddress}
                            </a>
                        </p>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createArrondissementPopup(arrKey, arrData, visitedPlaces, totalPlaces, completionPercent) {
        const arrInfo = arrData.arrondissement || arrData;
        const arrName = escapeHtml(arrInfo.name || arrKey.charAt(0).toUpperCase() + arrKey.slice(1));
        const safeDescription = escapeHtml(arrInfo.description);

        return `
            <div class="arrondissement-popup-card">
                <div class="arrondissement-popup-header">
                    <h3>${arrName}</h3>
                    ${completionPercent > 0 ? `<div class="completion-badge">${completionPercent}% exploré</div>` : ''}
                </div>
                <div class="arrondissement-popup-content">
                    ${arrInfo.description ? `<p class="arrondissement-popup-description">${safeDescription}</p>` : ''}
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
