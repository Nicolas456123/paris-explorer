/**
 * Service de géocodage automatique pour Paris Explorer
 * Convertit les adresses en coordonnées GPS précises
 */

class GeocodingService {
    constructor() {
        this.cache = new Map();
        this.rateLimitDelay = 1000; // 1 seconde entre les requêtes
        this.parisBounds = {
            north: 48.902,
            south: 48.815,
            east: 2.469,
            west: 2.224
        };
    }

    /**
     * Vérifie si des coordonnées sont dans Paris
     */
    isInParis(lat, lng) {
        return lat >= this.parisBounds.south && 
               lat <= this.parisBounds.north && 
               lng >= this.parisBounds.west && 
               lng <= this.parisBounds.east;
    }

    /**
     * Géocode une adresse avec Nominatim (OpenStreetMap)
     */
    async geocodeWithNominatim(query) {
        const cacheKey = `nominatim_${query}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const encodedQuery = encodeURIComponent(query + ', Paris, France');
            const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=3&countrycodes=fr&bounded=1&viewbox=2.224,48.902,2.469,48.815`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'ParisExplorer/1.0'
                }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const best = data[0];
                const lat = parseFloat(best.lat);
                const lng = parseFloat(best.lon);
                
                if (this.isInParis(lat, lng)) {
                    const result = {
                        coordinates: [lat, lng],
                        confidence: parseFloat(best.importance || 0.5),
                        source: 'Nominatim',
                        display_name: best.display_name,
                        type: best.type || 'unknown'
                    };
                    
                    this.cache.set(cacheKey, result);
                    return result;
                }
            }
            
            return null;
        } catch (error) {
            console.warn(`Nominatim error for "${query}":`, error.message);
            return null;
        }
    }

    /**
     * Géocode avec service de fallback (Photon)
     */
    async geocodeWithPhoton(query) {
        const cacheKey = `photon_${query}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const encodedQuery = encodeURIComponent(query + ', Paris');
            const url = `https://photon.komoot.io/api/?q=${encodedQuery}&limit=3&bbox=2.224,48.815,2.469,48.902`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                const best = data.features[0];
                const [lng, lat] = best.geometry.coordinates;
                
                if (this.isInParis(lat, lng)) {
                    const result = {
                        coordinates: [lat, lng],
                        confidence: 0.7, // Photon n'a pas de score d'importance
                        source: 'Photon',
                        display_name: best.properties.name || query,
                        type: best.properties.osm_value || 'unknown'
                    };
                    
                    this.cache.set(cacheKey, result);
                    return result;
                }
            }
            
            return null;
        } catch (error) {
            console.warn(`Photon error for "${query}":`, error.message);
            return null;
        }
    }

    /**
     * Géocode une adresse avec plusieurs services
     */
    async geocode(placeName, address) {
        console.log(`🔍 Géocodage: "${placeName}" à "${address}"`);
        
        // Essayer différentes variantes de la requête
        const queries = [
            `${placeName}, ${address}`,
            address,
            `${placeName}, Paris`,
            address.replace(/\d+\s+/, '') // Sans numéro de rue
        ];
        
        for (const query of queries) {
            // Essayer Nominatim d'abord
            let result = await this.geocodeWithNominatim(query);
            if (result && result.confidence > 0.3) {
                console.log(`✅ Trouvé avec Nominatim: ${result.coordinates} (${result.confidence.toFixed(2)})`);
                return result;
            }
            
            // Attendre pour respecter le rate limit
            await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
            
            // Essayer Photon en fallback
            result = await this.geocodeWithPhoton(query);
            if (result) {
                console.log(`✅ Trouvé avec Photon: ${result.coordinates}`);
                return result;
            }
            
            await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
        
        console.log(`❌ Impossible de géocoder: "${placeName}" à "${address}"`);
        return null;
    }

    /**
     * Détecte les coordonnées dupliquées dans un dataset
     */
    findDuplicateCoordinates(places) {
        const coordMap = new Map();
        const duplicates = [];
        
        places.forEach(place => {
            if (place.coordinates) {
                const key = `${place.coordinates[0]},${place.coordinates[1]}`;
                if (!coordMap.has(key)) {
                    coordMap.set(key, []);
                }
                coordMap.get(key).push(place);
            }
        });
        
        coordMap.forEach((places, coord) => {
            if (places.length > 1) {
                duplicates.push({
                    coordinates: coord,
                    places: places,
                    count: places.length
                });
            }
        });
        
        return duplicates;
    }

    /**
     * Corrige automatiquement les coordonnées d'un lieu
     */
    async fixPlaceCoordinates(place) {
        if (!place.address) {
            console.warn(`Pas d'adresse pour ${place.name}`);
            return null;
        }
        
        const result = await this.geocode(place.name, place.address);
        if (result) {
            const oldCoords = place.coordinates ? `[${place.coordinates.join(', ')}]` : 'aucune';
            const newCoords = `[${result.coordinates.join(', ')}]`;
            
            console.log(`🔧 ${place.name}: ${oldCoords} → ${newCoords}`);
            
            return {
                ...place,
                coordinates: result.coordinates,
                geocoding: {
                    source: result.source,
                    confidence: result.confidence,
                    corrected_at: new Date().toISOString(),
                    old_coordinates: place.coordinates
                }
            };
        }
        
        return null;
    }

    /**
     * Traite tous les lieux d'un arrondissement
     */
    async processArrondissement(data) {
        const results = {
            fixed: [],
            failed: [],
            duplicates: []
        };
        
        // Collecter tous les lieux
        const allPlaces = [];
        for (const [categoryName, category] of Object.entries(data.arrondissement.categories)) {
            if (category.places) {
                category.places.forEach(place => {
                    allPlaces.push({
                        ...place,
                        category: categoryName
                    });
                });
            }
        }
        
        // Détecter les doublons
        results.duplicates = this.findDuplicateCoordinates(allPlaces);
        
        console.log(`📊 ${allPlaces.length} lieux à traiter, ${results.duplicates.length} groupes de doublons détectés`);
        
        // Corriger les lieux avec coordonnées dupliquées
        for (const duplicate of results.duplicates) {
            console.log(`🚨 Correction groupe dupliqué: ${duplicate.coordinates} (${duplicate.count} lieux)`);
            
            for (const place of duplicate.places) {
                const fixed = await this.fixPlaceCoordinates(place);
                if (fixed) {
                    results.fixed.push(fixed);
                } else {
                    results.failed.push(place);
                }
                
                // Respect du rate limit
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
            }
        }
        
        return results;
    }
}

// Export pour utilisation en Node.js ou navigateur
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeocodingService;
} else if (typeof window !== 'undefined') {
    window.GeocodingService = GeocodingService;
}