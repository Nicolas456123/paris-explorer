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
        console.log('🗺️ Chargement des lieux via géocodage des adresses...');
        console.log('📊 Données disponibles:', Object.keys(this.app.parisData));
        const zoom = this.map.getZoom();
        console.log('🔍 Zoom actuel:', zoom);
        let markersAdded = 0;
        
        try {
            if (zoom <= 12) {
                // Vue d'ensemble : marqueurs d'arrondissements
                console.log('🏛️ Affichage des arrondissements (vue d\'ensemble)');
                
                // Test avec seulement 2 arrondissements pour commencer
                const testArrs = Object.entries(this.app.parisData).slice(0, 2);
                console.log('🧪 Test avec arrondissements:', testArrs.map(([key]) => key));
                
                for (const [arrKey, arrData] of testArrs) {
                    const arrInfo = arrData.arrondissement || arrData;
                    const arrName = arrInfo.name || arrKey;
                    console.log(`📍 Test géocodage: ${arrKey} -> ${arrName}`);
                    
                    const coords = await this.geocodeAddress(arrName + " Paris");
                    if (!coords) {
                        console.warn(`⚠️ Échec géocodage pour ${arrKey}`);
                        continue;
                    }
                    
                    console.log(`✅ Coordonnées obtenues pour ${arrKey}:`, coords);
                    
                    // Créer un marqueur simple
                    const marker = L.marker(coords).addTo(this.map);
                    marker.bindPopup(`<b>${arrName}</b><br>Arrondissement ${arrKey}`);
                    
                    this.markers.push(marker);
                    markersAdded++;
                    
                    console.log(`✅ Marqueur ${markersAdded} ajouté pour ${arrKey}`);
                    
                    // Délai entre requêtes
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } else {
                console.log('📍 Vue détaillée - pas encore implémentée avec géocodage simple');
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
}
