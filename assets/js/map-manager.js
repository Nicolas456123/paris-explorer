// ===== MAP MANAGER - VERSION CORRIGÉE COMPLÈTE =====

class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.markers = [];
        this.arrondissementLayer = null;
        this.isMapReady = false;
        this.isFullscreen = false;
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
            
            // Gestion des événements de zoom
            this.map.on('zoomend', () => {
                const zoom = this.map.getZoom();
                console.log(`🔍 Zoom changé: ${zoom}`);
                this.updateMapContent();
            });
            
            // Gestion des déplacements
            this.map.on('moveend', () => {
                const center = this.map.getCenter();
                console.log(`📍 Centre: [${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}]`);
            });
            
            // Événement de clic pour debugging
            this.map.on('click', (e) => {
                console.log(`👆 Clic carte: [${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}]`);
                this.app.showNotification(`Position: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`, 'info', 2000);
            });
            
            // Gestion d'erreurs de chargement
            this.map.on('error', (e) => {
                console.error('❌ Erreur carte:', e);
                this.app.showNotification('Erreur de chargement de la carte', 'error');
            });
            
            // Initialiser les contrôles
            this.setupMapControls();
            
            console.log('✅ Carte complètement initialisée');
            
        } catch (error) {
            console.error('❌ Erreur initialisation carte:', error);
            this.showMapError(error.message);
        }
    }
    
    // === CHARGEMENT DU CONTENU ===
    loadMapContent() {
        console.log('📍 Chargement du contenu de la carte...');
        
        if (!this.isMapReady) {
            console.warn('⏳ Carte pas encore prête, report du chargement');
            setTimeout(() => this.loadMapContent(), 500);
            return;
        }
        
        // Nettoyer le contenu existant
        this.clearMapMarkers();
        
        if (this.app.isDataLoaded && this.app.parisData && Object.keys(this.app.parisData).length > 0) {
            console.log('✅ Utilisation des vraies données');
            this.loadRealData();
        } else {
            console.log('📋 Utilisation des données de démonstration');
            this.loadDemoData();
        }
    }
    
    // === CHARGEMENT DES VRAIES DONNÉES ===
    loadRealData() {
        const zoom = this.map.getZoom();
        let markersAdded = 0;
        
        if (zoom <= 12) {
            // Vue d'ensemble : cercles d'arrondissements
            console.log('🏛️ Affichage des arrondissements (vue d\'ensemble)');
            
            Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
                const coords = this.getArrondissementCoordinates(arrKey);
                if (!coords) {
                    console.warn(`⚠️ Pas de coordonnées pour ${arrKey}`);
                    return;
                }
                
                const totalPlaces = this.app.dataManager.getTotalPlacesInArrondissement(arrData);
                const visitedPlaces = this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey);
                const completionPercent = totalPlaces > 0 ? Math.round((visitedPlaces / totalPlaces) * 100) : 0;
                
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
                
                this.markers.push(marker);
                markersAdded++;
            });
            
        } else {
            // Vue détaillée : lieux individuels
            console.log('📍 Affichage des lieux individuels (vue détaillée)');
            
            const userData = this.app.getCurrentUserData();
            
            Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
                Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                    (catData.places || []).forEach(place => {
                        const coords = this.app.dataManager.getPlaceCoordinates(place, arrKey);
                        if (!coords) return;
                        
                        const placeId = this.app.dataManager.createPlaceId(arrKey, catKey, place.name);
                        const isVisited = userData && userData.visitedPlaces instanceof Set ? 
                            userData.visitedPlaces.has(placeId) : false;
                        
                        const marker = this.createPlaceMarker(coords, place, catKey, isVisited, arrData.title);
                        if (marker) {
                            this.markers.push(marker);
                            markersAdded++;
                        }
                    });
                });
            });
        }
        
        console.log(`✅ ${markersAdded} marqueurs ajoutés à la carte`);
        
        if (markersAdded === 0) {
            console.warn('⚠️ Aucun marqueur ajouté, fallback vers les données demo');
            this.loadDemoData();
        } else {
            this.app.showNotification(`🗺️ ${markersAdded} lieux affichés sur la carte`, 'success');
        }
    }
    
    // === CHARGEMENT DES DONNÉES DEMO ===
    loadDemoData() {
        console.log('📋 Chargement des données de démonstration...');
        
        const demoLocations = [
            { name: "1er - Louvre", coords: [48.8607, 2.3358], places: 15, visited: 5, emoji: "🏛️", color: "#dc2626", description: "Musée du Louvre, Sainte-Chapelle, Palais-Royal" },
            { name: "4ème - Le Marais", coords: [48.8534, 2.3488], places: 12, visited: 8, emoji: "🏘️", color: "#059669", description: "Notre-Dame, Place des Vosges, Hôtel de Ville" },
            { name: "7ème - Tour Eiffel", coords: [48.8534, 2.2944], places: 18, visited: 12, emoji: "🗼", color: "#d97706", description: "Tour Eiffel, Invalides, Musée d'Orsay" },
            { name: "8ème - Champs-Élysées", coords: [48.8718, 2.3075], places: 20, visited: 15, emoji: "🛍️", color: "#059669", description: "Arc de Triomphe, Champs-Élysées, Place Vendôme" },
            { name: "18ème - Montmartre", coords: [48.8867, 2.3431], places: 16, visited: 10, emoji: "🎨", color: "#d97706", description: "Sacré-Cœur, Moulin Rouge, Place du Tertre" },
            { name: "16ème - Trocadéro", coords: [48.8635, 2.2773], places: 14, visited: 3, emoji: "🏢", color: "#dc2626", description: "Trocadéro, Bois de Boulogne, Palais de Chaillot" },
            { name: "5ème - Latin", coords: [48.8462, 2.3372], places: 13, visited: 6, emoji: "📚", color: "#d97706", description: "Panthéon, Sorbonne, Jardin du Luxembourg" },
            { name: "6ème - Saint-Germain", coords: [48.8496, 2.3341], places: 11, visited: 4, emoji: "☕", color: "#dc2626", description: "Saint-Germain-des-Prés, Café de Flore" }
        ];
        
        demoLocations.forEach((location, index) => {
            const completionPercent = Math.round((location.visited / location.places) * 100);
            
            const marker = L.circleMarker(location.coords, {
                color: '#1e3a8a',
                fillColor: location.color,
                fillOpacity: 0.8,
                radius: Math.max(10, Math.min(25, completionPercent / 4 + 12)),
                weight: 3
            }).addTo(this.map);
            
            marker.bindPopup(this.createDemoPopup(location, completionPercent));
            
            // Effet hover
            marker.on('mouseover', function() {
                this.setStyle({ radius: this.options.radius + 4, weight: 4 });
            });
            marker.on('mouseout', function() {
                this.setStyle({ radius: this.options.radius - 4, weight: 3 });
            });
            
            this.markers.push(marker);
        });
        
        // Centrer sur tous les marqueurs
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1), { maxZoom: 12 });
        }
        
        console.log(`✅ ${this.markers.length} marqueurs demo ajoutés`);
        this.app.showNotification(`🗺️ Carte de démonstration chargée (${this.markers.length} arrondissements)`, 'info');
    }
    
    // === CRÉATION DES POPUPS ===
    createArrondissementPopup(arrKey, arrData, visitedPlaces, totalPlaces, completionPercent) {
        const progressColor = completionPercent >= 70 ? '#059669' : completionPercent >= 40 ? '#d97706' : '#dc2626';
        
        return `
            <div style="font-family: 'Segoe UI', sans-serif; text-align: center; min-width: 250px;">
                <h3 style="color: #1e3a8a; margin: 0 0 12px 0; font-size: 16px;">${arrData.title}</h3>
                <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 16px; border-radius: 8px; margin: 12px 0;">
                    <p style="margin: 6px 0; font-weight: bold; font-size: 18px;">${visitedPlaces}/${totalPlaces} lieux explorés</p>
                    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; margin: 10px 0; overflow: hidden;">
                        <div style="background: ${progressColor}; height: 100%; width: ${completionPercent}%; border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>
                    <p style="margin: 6px 0; color: ${progressColor}; font-weight: bold; font-size: 16px;">${completionPercent}% complété</p>
                </div>
                <button onclick="app.uiManager.switchTab('list'); app.searchFilter.filterByArrondissement('${arrKey}')" 
                        style="background: #1e3a8a; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 8px;">
                    🔍 Explorer cet arrondissement
                </button>
            </div>
        `;
    }
    
    createDemoPopup(location, completionPercent) {
        return `
            <div style="font-family: 'Segoe UI', sans-serif; text-align: center; min-width: 250px;">
                <div style="font-size: 40px; margin-bottom: 12px;">${location.emoji}</div>
                <h3 style="color: #1e3a8a; margin: 0 0 12px 0; font-size: 18px;">${location.name}</h3>
                <p style="color: #6b7280; font-size: 14px; margin: 8px 0; font-style: italic;">${location.description}</p>
                <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 16px; border-radius: 8px; margin: 12px 0;">
                    <p style="margin: 6px 0; font-weight: bold; font-size: 18px;">${location.visited}/${location.places} lieux explorés</p>
                    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; margin: 10px 0; overflow: hidden;">
                        <div style="background: ${location.color}; height: 100%; width: ${completionPercent}%; border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>
                    <p style="margin: 6px 0; color: ${location.color}; font-weight: bold; font-size: 16px;">${completionPercent}% complété</p>
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #6b7280; margin: 0; font-style: italic;">
                        💡 Mode démonstration - Créez un profil pour explorer Paris !
                    </p>
                </div>
            </div>
        `;
    }
    
    // === CRÉATION DES MARQUEURS DE LIEUX ===
    createPlaceMarker(coords, place, categoryKey, isVisited, arrondissementName) {
        const placeType = this.getPlaceType(categoryKey);
        const markerColor = isVisited ? '#059669' : this.getCategoryColor(categoryKey);
        const markerIcon = this.getPlaceIcon(categoryKey);
        
        try {
            const marker = L.circleMarker(coords, {
                color: '#ffffff',
                fillColor: markerColor,
                fillOpacity: isVisited ? 0.9 : 0.7,
                radius: isVisited ? 8 : 6,
                weight: 2
            }).addTo(this.map);
            
            marker.bindPopup(this.createPlacePopup(place, categoryKey, isVisited, arrondissementName, markerIcon));
            
            return marker;
            
        } catch (error) {
            console.error('❌ Erreur création marqueur lieu:', error);
            return null;
        }
    }
    
    createPlacePopup(place, categoryKey, isVisited, arrondissementName, markerIcon) {
        const statusColor = isVisited ? '#059669' : '#6b7280';
        const statusText = isVisited ? '✅ Visité' : '⭕ Non visité';
        
        // Tags
        const tagsHtml = place.tags && place.tags.length > 0 ? 
            place.tags.slice(0, 3).map(tag => 
                `<span style="background: rgba(30, 58, 138, 0.1); color: #1e3a8a; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin: 2px;">${tag}</span>`
            ).join(' ') : '';
        
        return `
            <div style="font-family: 'Segoe UI', sans-serif; min-width: 220px; max-width: 300px;">
                <div style="text-align: center; margin-bottom: 12px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">${markerIcon}</div>
                    <h3 style="color: #1e3a8a; margin: 0 0 6px 0; font-size: 16px;">${place.name}</h3>
                    <div style="color: ${statusColor}; font-weight: bold; font-size: 14px;">${statusText}</div>
                </div>
                
                ${place.description ? `
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.4; margin: 10px 0; text-align: center;">${place.description}</p>
                ` : ''}
                
                ${tagsHtml ? `<div style="text-align: center; margin: 10px 0;">${tagsHtml}</div>` : ''}
                
                ${place.address ? `
                    <div style="text-align: center; margin: 12px 0;">
                        <p style="margin: 6px 0;">
                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}" 
                               target="_blank" 
                               style="color: #6b7280; font-size: 13px; font-style: italic; text-decoration: none;"
                               title="Voir sur Google Maps">
                                📍 ${place.address}
                            </a>
                        </p>
                    </div>
                ` : ''}
                
                <div style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">${arrondissementName}</p>
                </div>
            </div>
        `;
    }
    
    // === UTILITAIRES ===
    getPlaceType(categoryKey) {
        const catKey = categoryKey.toLowerCase();
        
        if (catKey.includes('monument') || catKey.includes('patrimoine')) return 'monument';
        if (catKey.includes('restaurant') || catKey.includes('gastronomie')) return 'restaurant';
        if (catKey.includes('café') || catKey.includes('cafe')) return 'cafe';
        if (catKey.includes('bar') || catKey.includes('cocktail')) return 'bar';
        if (catKey.includes('shopping') || catKey.includes('boutique')) return 'shopping';
        if (catKey.includes('musée') || catKey.includes('museum')) return 'museum';
        if (catKey.includes('parc') || catKey.includes('jardin')) return 'park';
        if (catKey.includes('église') || catKey.includes('cathédrale')) return 'church';
        if (catKey.includes('hôtel') || catKey.includes('hotel')) return 'hotel';
        if (catKey.includes('théâtre') || catKey.includes('opéra')) return 'theater';
        
        return 'default';
    }
    
    getPlaceIcon(categoryKey) {
        const catKey = categoryKey.toLowerCase();
        
        if (catKey.includes('monument')) return '🏛️';
        if (catKey.includes('restaurant')) return '🍽️';
        if (catKey.includes('café')) return '☕';
        if (catKey.includes('bar')) return '🍻';
        if (catKey.includes('shopping')) return '🛍️';
        if (catKey.includes('musée')) return '🎨';
        if (catKey.includes('parc') || catKey.includes('jardin')) return '🌳';
        if (catKey.includes('église')) return '⛪';
        if (catKey.includes('hôtel')) return '🏨';
        if (catKey.includes('théâtre')) return '🎭';
        
        return '📍';
    }
    
    getCategoryColor(categoryKey) {
        const catKey = categoryKey.toLowerCase();
        
        if (catKey.includes('monument')) return '#8b5cf6';
        if (catKey.includes('restaurant')) return '#f59e0b';
        if (catKey.includes('café')) return '#92400e';
        if (catKey.includes('bar')) return '#dc2626';
        if (catKey.includes('shopping')) return '#ec4899';
        if (catKey.includes('musée')) return '#7c3aed';
        if (catKey.includes('parc') || catKey.includes('jardin')) return '#059669';
        if (catKey.includes('église')) return '#1e40af';
        if (catKey.includes('hôtel')) return '#0284c7';
        if (catKey.includes('théâtre')) return '#dc2626';
        
        return '#6b7280';
    }
    
    // === COORDONNÉES ===
    getArrondissementCoordinates(arrKey) {
        const coords = {
            '1er': [48.8607, 2.3358], '2ème': [48.8700, 2.3408], '3ème': [48.8630, 2.3626],
            '4ème': [48.8534, 2.3488], '5ème': [48.8462, 2.3372], '6ème': [48.8496, 2.3341],
            '7ème': [48.8534, 2.2944], '8ème': [48.8718, 2.3075], '9ème': [48.8768, 2.3364],
            '10ème': [48.8709, 2.3674], '11ème': [48.8594, 2.3765], '12ème': [48.8448, 2.3776],
            '13ème': [48.8282, 2.3555], '14ème': [48.8323, 2.3255], '15ème': [48.8428, 2.2944],
            '16ème': [48.8635, 2.2773], '17ème': [48.8799, 2.2951], '18ème': [48.8867, 2.3431],
            '19ème': [48.8799, 2.3831], '20ème': [48.8631, 2.3969]
        };
        return coords[arrKey] || null;
    }
    
    // === CONTRÔLES DE CARTE ===
    setupMapControls() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const centerMapBtn = document.getElementById('centerMapBtn');
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
        
        if (centerMapBtn) {
            centerMapBtn.addEventListener('click', () => {
                this.centerMap();
            });
        }
        
        // Écouteur pour la touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
    }
    
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }
    
    enterFullscreen() {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) return;
        
        mapContainer.classList.add('map-fullscreen');
        this.isFullscreen = true;
        
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
        
        console.log('🔲 Mode plein écran activé');
    }
    
    exitFullscreen() {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) return;
        
        mapContainer.classList.remove('map-fullscreen');
        this.isFullscreen = false;
        
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
        
        console.log('🔲 Mode plein écran désactivé');
    }
    
    centerMap() {
        if (!this.map) return;
        
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1), { maxZoom: 12 });
        } else {
            this.map.setView([48.8566, 2.3522], 11);
        }
        
        console.log('🎯 Carte centrée');
        this.app.showNotification('Carte centrée', 'info', 1500);
    }
    
    // === GESTION DES MARQUEURS ===
    clearMapMarkers() {
        this.markers.forEach(marker => {
            if (this.map && this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        this.markers = [];
        
        if (this.arrondissementLayer) {
            this.map.removeLayer(this.arrondissementLayer);
            this.arrondissementLayer = null;
        }
    }
    
    updateMapContent() {
        if (this.isMapReady) {
            this.loadMapContent();
        }
    }
    
    // === GESTION D'ERREURS ===
    showMapError(message) {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; text-align: center; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; color: #495057;">
                    <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.6;">🗺️</div>
                    <h3 style="color: #dc3545; margin-bottom: 15px; font-size: 20px;">Erreur de chargement de la carte</h3>
                    <p style="color: #6c757d; margin-bottom: 25px; max-width: 400px; line-height: 1.4;">${message}</p>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                        <button class="btn btn-primary" onclick="app.mapManager.initMap()" style="padding: 10px 20px; font-size: 14px;">
                            🔄 Réessayer
                        </button>
                        <button class="btn btn-secondary" onclick="app.uiManager.switchTab('list')" style="padding: 10px 20px; font-size: 14px;">
                            📋 Vue Liste
                        </button>
                    </div>
                    <p style="font-size: 12px; color: #9ca3af; margin-top: 20px; font-style: italic;">
                        Vérifiez votre connexion internet ou utilisez la vue liste
                    </p>
                </div>
            `;
        }
    }
    
    // === NETTOYAGE ===
    cleanupMap() {
        console.log('🧹 Nettoyage de la carte...');
        
        if (this.map) {
            // Supprimer tous les marqueurs
            this.clearMapMarkers();
            
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
            this.updateMapContent();
        } else {
            this.initMap();
        }
    }
    
    focusOnArrondissement(arrKey) {
        const coords = this.getArrondissementCoordinates(arrKey);
        if (coords && this.map) {
            this.map.setView(coords, 14);
            this.app.showNotification(`Zoom sur ${arrKey}`, 'info');
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
}
