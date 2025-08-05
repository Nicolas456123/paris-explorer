// ===== MAP MANAGER - GESTION DE LA CARTE INTERACTIVE =====

class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.markers = [];
        this.arrondissementLayer = null;
        this.arrondissementShapes = null;
        this.geocodeCache = new Map(); // Cache pour le géocodage
    }
    
    // === INITIALISATION DE LA CARTE ===
    initMap() {
        if (this.map) {
            console.log('🗺️ Carte déjà initialisée');
            return;
        }
        
        console.log('🗺️ Initialisation de la carte...');
        const mapContainer = document.getElementById('mapContainer');
        
        try {
            // Centrer sur Paris avec un zoom approprié
            this.map = L.map(mapContainer, {
                center: [48.8566, 2.3522],
                zoom: 11,
                zoomControl: true,
                attributionControl: true
            });
            
            console.log('✅ Carte Leaflet créée');
            
            // Ajouter la couche de tuiles OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                minZoom: 10
            }).addTo(this.map);
            
            console.log('✅ Couche de tuiles ajoutée');
            
            // Attendre que la carte soit entièrement chargée
            this.map.whenReady(() => {
                console.log('🗺️ Carte prête, chargement des données...');
                setTimeout(() => {
                    if (this.app.isDataLoaded) {
                        this.loadArrondissementShapes();
                        this.updateMapMarkers();
                    } else {
                        this.addDemoMarkers();
                    }
                }, 200);
            });
            
            // Gestion du zoom pour changer entre arrondissements et lieux individuels
            this.map.on('zoomend', () => {
                const zoom = this.map.getZoom();
                console.log('🔍 Zoom changé:', zoom);
                this.updateMapMarkers();
            });
            
            // Gestion des clics sur la carte
            this.map.on('click', (e) => {
                console.log('📍 Clic sur la carte:', e.latlng);
            });
            
            // Gestion du plein écran
            this.setupMapControls();
            
            console.log('✅ Carte entièrement initialisée');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de la carte:', error);
            this.app.showNotification('Erreur lors du chargement de la carte', 'error');
        }
    }
    
    // === CHARGEMENT DES FORMES DES ARRONDISSEMENTS ===
    async loadArrondissementShapes() {
        try {
            console.log('🗺️ Chargement des formes des arrondissements...');
            
            // URL de l'API OpenData Paris pour les limites des arrondissements
            const response = await fetch('https://opendata.paris.fr/api/records/1.0/search/?dataset=arrondissements&q=&facet=c_ar&rows=20&format=geojson');
            
            if (response.ok) {
                const geojsonData = await response.json();
                console.log('✅ Données GeoJSON des arrondissements chargées:', geojsonData.features.length, 'arrondissements');
                
                this.arrondissementShapes = geojsonData;
                
            } else {
                console.warn('⚠️ Impossible de charger les formes des arrondissements, utilisation des cercles');
            }
        } catch (error) {
            console.warn('⚠️ Erreur lors du chargement des formes:', error);
        }
    }
    
    // === GÉOCODAGE DES ADRESSES ===
    async geocodeAddress(address) {
        // Vérifier le cache d'abord
        if (this.geocodeCache.has(address)) {
            return this.geocodeCache.get(address);
        }
        
        try {
            // Utiliser Nominatim (OpenStreetMap) pour le géocodage gratuit
            const encodedAddress = encodeURIComponent(address);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`);
            
            if (response.ok) {
                const results = await response.json();
                if (results.length > 0) {
                    const lat = parseFloat(results[0].lat);
                    const lon = parseFloat(results[0].lon);
                    const coords = [lat, lon];
                    
                    // Mettre en cache
                    this.geocodeCache.set(address, coords);
                    
                    console.log(`📍 Géocodage réussi: ${address} → [${lat}, ${lon}]`);
                    return coords;
                }
            }
        } catch (error) {
            console.warn(`⚠️ Erreur géocodage pour "${address}":`, error);
        }
        
        // Fallback : essayer d'extraire l'arrondissement
        const fallbackCoords = this.fallbackGeocoding(address);
        this.geocodeCache.set(address, fallbackCoords);
        return fallbackCoords;
    }
    
    // Géocodage de fallback basé sur l'arrondissement
    fallbackGeocoding(address) {
        const arrondissementCoords = {
            '75001': [48.8607, 2.3358], '75002': [48.8700, 2.3408], '75003': [48.8630, 2.3626],
            '75004': [48.8534, 2.3488], '75005': [48.8462, 2.3372], '75006': [48.8496, 2.3341],
            '75007': [48.8534, 2.2944], '75008': [48.8718, 2.3075], '75009': [48.8768, 2.3364],
            '75010': [48.8709, 2.3674], '75011': [48.8594, 2.3765], '75012': [48.8448, 2.3776],
            '75013': [48.8282, 2.3555], '75014': [48.8323, 2.3255], '75015': [48.8428, 2.2944],
            '75016': [48.8635, 2.2773], '75017': [48.8799, 2.2951], '75018': [48.8867, 2.3431],
            '75019': [48.8799, 2.3831], '75020': [48.8631, 2.3969]
        };
        
        // Extraire le code postal
        const match = address.match(/750(\d{2})/);
        if (match) {
            const postalCode = '750' + match[1];
            const coords = arrondissementCoords[postalCode];
            if (coords) {
                console.log(`📍 Géocodage fallback: ${address} → arrondissement ${postalCode} → ${coords}`);
                return coords;
            }
        }
        
        // Dernier fallback : centre de Paris
        console.warn(`⚠️ Impossible de géocoder "${address}", utilisation du centre de Paris`);
        return [48.8566, 2.3522];
    }
    
    // === GESTION DES MARQUEURS ===
    updateMapMarkers() {
        if (!this.map) {
            console.log('🗺️ Pas de carte à mettre à jour');
            return;
        }
        
        const currentZoom = this.map.getZoom();
        console.log('🔄 Mise à jour des marqueurs pour zoom:', currentZoom);
        
        // Nettoyer tous les marqueurs et couches existants
        this.clearMapMarkers();
        
        if (this.app.isDataLoaded && this.app.parisData) {
            // Utiliser les vraies données
            if (currentZoom <= 12) {
                // Vue d'ensemble : afficher les polygones des arrondissements
                this.showArrondissementPolygons();
            } else {
                // Vue détaillée : afficher les lieux individuels
                this.showIndividualPlaces();
            }
        } else {
            // Mode démo : toujours afficher les marqueurs démo
            this.addDemoMarkers();
        }
    }
    
    clearMapMarkers() {
        // Supprimer tous les marqueurs
        this.markers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        this.markers = [];
        
        // Supprimer les couches de polygones
        if (this.arrondissementLayer) {
            this.map.removeLayer(this.arrondissementLayer);
            this.arrondissementLayer = null;
        }
    }
    
    // === MARQUEURS DÉMO ===
    addDemoMarkers() {
        this.clearMapMarkers();
        
        // Coordonnées réelles et précises des arrondissements parisiens
        const demoLocations = [
            { name: "1er - Louvre", coords: [48.8607, 2.3358], places: 15, visited: 3, emoji: "🏛️" },
            { name: "2ème - Grands Boulevards", coords: [48.8700, 2.3408], places: 10, visited: 1, emoji: "🏪" },
            { name: "3ème - Le Marais", coords: [48.8630, 2.3626], places: 13, visited: 7, emoji: "🏘️" },
            { name: "4ème - Île de la Cité", coords: [48.8534, 2.3488], places: 12, visited: 5, emoji: "⛪" },
            { name: "5ème - Quartier Latin", coords: [48.8462, 2.3372], places: 16, visited: 9, emoji: "📚" },
            { name: "6ème - Saint-Germain", coords: [48.8496, 2.3341], places: 14, visited: 6, emoji: "☕" },
            { name: "7ème - Tour Eiffel", coords: [48.8534, 2.2944], places: 18, visited: 8, emoji: "🗼" },
            { name: "8ème - Champs-Élysées", coords: [48.8718, 2.3075], places: 20, visited: 2, emoji: "🛍️" },
            { name: "9ème - Opéra", coords: [48.8768, 2.3364], places: 11, visited: 4, emoji: "🎭" },
            { name: "10ème - Canal Saint-Martin", coords: [48.8709, 2.3674], places: 9, visited: 3, emoji: "🚤" },
            { name: "11ème - République", coords: [48.8594, 2.3765], places: 8, visited: 2, emoji: "🍻" },
            { name: "12ème - Bastille", coords: [48.8448, 2.3776], places: 7, visited: 1, emoji: "🎪" },
            { name: "13ème - Chinatown", coords: [48.8282, 2.3555], places: 6, visited: 0, emoji: "🥢" },
            { name: "14ème - Montparnasse", coords: [48.8323, 2.3255], places: 9, visited: 3, emoji: "🗿" },
            { name: "15ème - Tour Montparnasse", coords: [48.8428, 2.2944], places: 12, visited: 5, emoji: "🏢" },
            { name: "16ème - Trocadéro", coords: [48.8635, 2.2773], places: 17, visited: 12, emoji: "🏰" },
            { name: "17ème - Arc de Triomphe", coords: [48.8799, 2.2951], places: 13, visited: 7, emoji: "🏆" },
            { name: "18ème - Montmartre", coords: [48.8867, 2.3431], places: 14, visited: 10, emoji: "🎨" },
            { name: "19ème - Buttes-Chaumont", coords: [48.8799, 2.3831], places: 10, visited: 4, emoji: "🌳" },
            { name: "20ème - Père Lachaise", coords: [48.8631, 2.3969], places: 8, visited: 2, emoji: "⚰️" },
        ];
        
        console.log(`🗺️ Ajout de ${demoLocations.length} marqueurs démo sur la carte`);
        
        demoLocations.forEach((location) => {
            const completionPercent = Math.round((location.visited / location.places) * 100);
            
            // Couleur selon le pourcentage de completion
            let markerColor = '#D4AF37';
            let strokeColor = '#1e3a8a';
            
            if (completionPercent === 100) {
                markerColor = '#059669';
                strokeColor = '#047857';
            } else if (completionPercent >= 70) {
                markerColor = '#059669';
                strokeColor = '#047857';
            } else if (completionPercent >= 40) {
                markerColor = '#d97706';
                strokeColor = '#b45309';
            } else if (completionPercent > 0) {
                markerColor = '#dc2626';
                strokeColor = '#b91c1c';
            }
            
            // Créer le marqueur circulaire
            const marker = L.circleMarker(location.coords, {
                color: strokeColor,
                fillColor: markerColor,
                fillOpacity: 0.9,
                radius: Math.max(10, Math.min(20, completionPercent / 5 + 8)),
                weight: 3,
                className: 'demo-marker'
            }).addTo(this.map);
            
            // Popup avec informations détaillées
            marker.bindPopup(this.createDemoPopup(location, completionPercent, markerColor));
            
            // Effet hover
            marker.on('mouseover', function() {
                this.setStyle({
                    radius: this.options.radius + 3,
                    weight: 4
                });
            });
            
            marker.on('mouseout', function() {
                this.setStyle({
                    radius: this.options.radius - 3,
                    weight: 3
                });
            });
            
            this.markers.push(marker);
        });
        
        console.log(`✅ ${this.markers.length} marqueurs démo ajoutés`);
        
        // Centrer la carte sur tous les marqueurs
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1), {
                maxZoom: 12
            });
        }
        
        // Afficher une notification de succès
        setTimeout(() => {
            this.app.showNotification(`🗺️ Carte chargée : ${this.markers.length} arrondissements visibles`, 'success');
        }, 500);
    }
    
    createDemoPopup(location, completionPercent, markerColor) {
        return `
            <div style="font-family: 'Playfair Display', serif; text-align: center; min-width: 200px;">
                <div style="font-size: 24px; margin-bottom: 8px;">${location.emoji}</div>
                <h3 style="color: #1e3a8a; margin-bottom: 8px; font-size: 16px;">${location.name}</h3>
                <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 12px; border-radius: 8px; margin: 8px 0;">
                    <p style="margin: 4px 0; font-weight: bold;"><strong>${location.visited}/${location.places}</strong> lieux explorés</p>
                    <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin: 8px 0;">
                        <div style="background: ${markerColor}; height: 100%; width: ${completionPercent}%; border-radius: 3px; transition: width 0.3s;"></div>
                    </div>
                    <p style="margin: 4px 0; color: ${markerColor}; font-weight: bold;">${completionPercent}% complété</p>
                </div>
                <p style="font-size: 11px; color: #6b7280; margin-top: 8px; font-style: italic;">
                    💡 Mode démo - Créez un profil pour commencer l'exploration !
                </p>
            </div>
        `;
    }
    
    // === POLYGONES DES ARRONDISSEMENTS ===
    showArrondissementPolygons() {
        console.log('🏛️ Affichage des polygones des arrondissements');
        
        if (this.arrondissementShapes) {
            // Utiliser les vraies formes GeoJSON
            this.createPolygonLayer();
        } else {
            // Fallback : utiliser les marqueurs circulaires
            this.showArrondissementCircles();
        }
    }
    
    createPolygonLayer() {
        this.arrondissementLayer = L.geoJSON(this.arrondissementShapes, {
            style: (feature) => this.getArrondissementStyle(feature),
            onEachFeature: (feature, layer) => this.setupArrondissementFeature(feature, layer)
        }).addTo(this.map);
        
        console.log('✅ Polygones des arrondissements affichés');
    }
    
    getArrondissementStyle(feature) {
        const arrCode = feature.properties.c_ar;
        const userData = this.app.getCurrentUserData();
        
        // Calculer la progression pour cet arrondissement
        const arrKey = `${arrCode}${arrCode === '1' ? 'er' : 'ème'}`;
        const arrData = this.app.parisData[arrKey];
        const visitedCount = arrData ? this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey) : 0;
        const totalCount = arrData ? this.app.dataManager.getTotalPlacesInArrondissement(arrData) : 0;
        const completionPercent = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;
        
        // Couleur selon progression
        let fillColor = '#D4AF37';
        let fillOpacity = 0.3;
        
        if (completionPercent >= 70) {
            fillColor = '#059669';
            fillOpacity = 0.5;
        } else if (completionPercent >= 40) {
            fillColor = '#d97706';
            fillOpacity = 0.4;
        } else if (completionPercent > 0) {
            fillColor = '#dc2626';
            fillOpacity = 0.3;
        }
        
        return {
            fillColor: fillColor,
            weight: 2,
            opacity: 0.8,
            color: '#1e3a8a',
            fillOpacity: fillOpacity
        };
    }
    
    setupArrondissementFeature(feature, layer) {
        const arrCode = feature.properties.c_ar;
        const arrName = feature.properties.l_ar;
        
        // Calculer les statistiques
        const arrKey = `${arrCode}${arrCode === '1' ? 'er' : 'ème'}`;
        const arrData = this.app.parisData[arrKey];
        const visitedCount = arrData ? this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey) : 0;
        const totalCount = arrData ? this.app.dataManager.getTotalPlacesInArrondissement(arrData) : 0;
        const completionPercent = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;
        
        // Popup
        layer.bindPopup(`
            <div style="font-family: 'Playfair Display', serif; text-align: center; min-width: 200px;">
                <h3 style="color: #1e3a8a; margin-bottom: 8px;">${arrName}</h3>
                <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 12px; border-radius: 8px; margin: 8px 0;">
                    <p style="margin: 4px 0; font-weight: bold;">${visitedCount}/${totalCount} lieux explorés</p>
                    <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin: 8px 0;">
                        <div style="background: linear-gradient(135deg, #D4AF37, #F7DC6F); height: 100%; width: ${completionPercent}%; border-radius: 3px;"></div>
                    </div>
                    <p style="margin: 4px 0; color: #D4AF37; font-weight: bold;">${completionPercent}% complété</p>
                </div>
                <p style="font-size: 11px; color: #6b7280; margin-top: 8px; font-style: italic;">
                    🔍 Zoomez pour voir les lieux individuels
                </p>
            </div>
        `);
        
        // Effet hover
        layer.on('mouseover', function(e) {
            this.setStyle({
                weight: 4,
                fillOpacity: 0.7
            });
        });
        
        layer.on('mouseout', function(e) {
            this.setStyle({
                weight: 2,
                fillOpacity: feature.properties.fillOpacity || 0.3
            });
        });
    }
    
    // === LIEUX INDIVIDUELS ===
    async showIndividualPlaces() {
        console.log('📍 Affichage des lieux individuels');
        
        const loadingDiv = this.createLoadingIndicator();
        
        try {
            const userData = this.app.getCurrentUserData();
            let placesProcessed = 0;
            let totalPlaces = 0;
            
            // Compter le total pour la progression
            Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
                Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                    totalPlaces += (catData.places || []).length;
                });
            });
            
            console.log(`📊 ${totalPlaces} lieux à traiter`);
            
            // Traitement par batch
            for (const [arrKey, arrData] of Object.entries(this.app.parisData)) {
                for (const [catKey, catData] of Object.entries(arrData.categories || {})) {
                    for (const place of (catData.places || [])) {
                        if (place.address) {
                            try {
                                const coords = await this.geocodeAddress(place.address);
                                const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                                const isVisited = userData && userData.visitedPlaces instanceof Set ? 
                                    userData.visitedPlaces.has(placeId) : false;
                                
                                // Créer le marqueur du lieu
                                const marker = this.createPlaceMarker(coords, place, catKey, isVisited, arrData.title);
                                this.markers.push(marker);
                                
                                placesProcessed++;
                                
                                // Mettre à jour l'indicateur de progression
                                if (placesProcessed % 5 === 0) {
                                    this.updateLoadingProgress(loadingDiv, placesProcessed, totalPlaces);
                                    await new Promise(resolve => setTimeout(resolve, 50));
                                }
                                
                            } catch (error) {
                                console.warn(`⚠️ Erreur pour ${place.name}:`, error);
                                placesProcessed++;
                            }
                        } else {
                            placesProcessed++;
                        }
                    }
                }
            }
            
            console.log(`✅ ${this.markers.length} lieux individuels affichés`);
            this.app.showNotification(`🗺️ ${this.markers.length} lieux chargés sur la carte`, 'success');
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des lieux:', error);
            this.app.showNotification('Erreur lors du chargement des lieux', 'error');
        } finally {
            this.removeLoadingIndicator(loadingDiv);
        }
    }
    
    createLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'map-loading';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p style="color: #1e3a8a; font-weight: 600;">Chargement des lieux...</p>
            <p style="font-size: 12px; color: #6b7280;">Géocodage des adresses en cours</p>
        `;
        document.getElementById('mapContainer').appendChild(loadingDiv);
        return loadingDiv;
    }
    
    updateLoadingProgress(loadingDiv, processed, total) {
        const progressPercent = Math.round((processed / total) * 100);
        loadingDiv.querySelector('p').textContent = `Chargement des lieux... ${progressPercent}%`;
        console.log(`📍 Traité ${processed}/${total} lieux (${progressPercent}%)`);
    }
    
    removeLoadingIndicator(loadingDiv) {
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }
    }
    
    // === MARQUEURS DE LIEUX ===
    createPlaceMarker(coords, place, categoryKey, isVisited, arrondissementName) {
        const placeType = this.getPlaceType(categoryKey);
        let markerIcon = '📍';
        let markerColor = isVisited ? '#059669' : '#D4AF37';
        
        // Icônes selon le type
        const typeIcons = {
            'monument': '🏛️', 'restaurant': '🍽️', 'cafe': '☕', 'bar': '🍻',
            'shopping': '🛍️', 'museum': '🎨', 'park': '🌳', 'church': '⛪',
            'hotel': '🏨', 'theater': '🎭'
        };
        
        markerIcon = typeIcons[placeType] || '📍';
        
        // Créer le marqueur avec icône emoji
        const marker = L.marker(coords, {
            icon: L.divIcon({
                html: `<div style="background: ${markerColor}; border: 2px solid #1e3a8a; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${markerIcon}</div>`,
                className: 'custom-place-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.map);
        
        // Popup détaillé
        marker.bindPopup(this.createPlacePopup(place, markerIcon, isVisited, arrondissementName));
        
        return marker;
    }
    
    createPlacePopup(place, markerIcon, isVisited, arrondissementName) {
        const tagsHtml = place.tags ? 
            place.tags.map(tag => `<span style="background: #D4AF37; color: #1e3a8a; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin: 2px;">${tag}</span>`).join(' ') : '';
        
        return `
            <div style="font-family: 'Playfair Display', serif; min-width: 220px;">
                <div style="text-align: center; font-size: 20px; margin-bottom: 8px;">${markerIcon}</div>
                <h4 style="color: #1e3a8a; margin-bottom: 8px; font-size: 15px; text-align: center;">${place.name}</h4>
                <p style="margin: 8px 0; font-size: 13px; line-height: 1.4;">${place.description}</p>
                <p style="margin: 4px 0; font-size: 11px; color: #6b7280;">📍 ${place.address}</p>
                <div style="text-align: center; margin: 12px 0;">
                    ${isVisited ? 
                        '<span style="color: #059669; font-weight: bold; background: #f0fdf4; padding: 4px 8px; border-radius: 8px;">✓ Exploré</span>' : 
                        '<span style="color: #d97706; font-weight: bold; background: #fef3c7; padding: 4px 8px; border-radius: 8px;">📍 À explorer</span>'
                    }
                </div>
                ${tagsHtml ? `<div style="margin-top: 8px; text-align: center;">${tagsHtml}</div>` : ''}
                <p style="font-size: 10px; color: #9ca3af; margin-top: 12px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                    ${arrondissementName}
                </p>
                <div style="text-align: center; margin-top: 8px;">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}" 
                       target="_blank" 
                       style="background: #1e3a8a; color: white; padding: 4px 12px; border-radius: 12px; text-decoration: none; font-size: 11px;">
                        🗺️ Ouvrir dans Maps
                    </a>
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
    
    // === CONTRÔLES DE CARTE ===
    setupMapControls() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const centerMapBtn = document.getElementById('centerMapBtn');
        const mapContainer = document.getElementById('mapContainer');
        
        // Bouton plein écran
        fullscreenBtn.addEventListener('click', () => {
            if (mapContainer.classList.contains('map-fullscreen')) {
                this.exitFullscreen();
            } else {
                this.enterFullscreen();
            }
        });
        
        // Bouton centrer
        centerMapBtn.addEventListener('click', () => {
            this.centerMap();
        });
        
        // Écouteur pour la touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mapContainer.classList.contains('map-fullscreen')) {
                this.exitFullscreen();
            }
        });
    }
    
    enterFullscreen() {
        const mapContainer = document.getElementById('mapContainer');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        mapContainer.classList.add('map-fullscreen');
        fullscreenBtn.textContent = '🔲';
        fullscreenBtn.title = 'Quitter le plein écran';
        
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
        
        this.app.showNotification('Mode plein écran activé (Échap pour quitter)', 'info');
    }
    
    exitFullscreen() {
        const mapContainer = document.getElementById('mapContainer');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        mapContainer.classList.remove('map-fullscreen');
        fullscreenBtn.textContent = '🔳';
        fullscreenBtn.title = 'Mode plein écran';
        
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }
    
    centerMap() {
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1), {
                maxZoom: 12
            });
            this.app.showNotification('Vue centrée sur tous les arrondissements', 'info');
        } else {
            this.map.setView([48.8566, 2.3522], 11);
            this.app.showNotification('Vue centrée sur Paris', 'info');
        }
    }
}
