// ===== DATA MANAGER - VERSION REFACTORISÉE =====

class DataManager {
    constructor(app) {
        this.app = app;
    }
    
    // === CHARGEMENT DES DONNÉES ===
    async loadParisData() {
        try {
            this.app.showNotification('Chargement des trésors parisiens...', 'info');
            
            const response = await fetch('paris-database.json');
            
            if (!response.ok) {
                throw new Error(`Fichier paris-database.json introuvable`);
            }
            
            const textContent = await response.text();
            console.log('📄 Taille du fichier:', textContent.length, 'caractères');
            
            let data;
            try {
                data = JSON.parse(textContent);
                console.log('✅ JSON parsé avec succès');
            } catch (parseError) {
                console.error('❌ Erreur parsing JSON:', parseError);
                throw new Error(`Erreur parsing JSON: ${parseError.message}`);
            }
            
            // Vérification et adaptation de la structure
            const validatedData = this.validateDataStructure(data);
            
            if (validatedData) {
                console.log('✅ Structure valide détectée');
                console.log('🔍 Nombre d\'arrondissements:', Object.keys(validatedData).length);
                
                this.app.parisData = validatedData;
                this.logDataSummary(validatedData);
                this.app.onDataLoaded();
                
            } else {
                throw new Error('Structure de données invalide');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement:', error);
            throw error;
        }
    }
    
    // === VALIDATION DE LA STRUCTURE ===
    validateDataStructure(data) {
        // Adapter si c'est un tableau
        let jsonData = data;
        if (Array.isArray(data) && data.length > 0) {
            console.log('📦 Structure tableau détectée, extraction du premier élément');
            jsonData = data[0];
        }
        
        // Vérifier la présence des arrondissements
        if (!jsonData || !jsonData.arrondissements) {
            console.error('❌ Structure invalide: pas d\'arrondissements trouvés');
            return null;
        }
        
        // Valider chaque arrondissement
        const validatedArrondissements = {};
        
        Object.entries(jsonData.arrondissements).forEach(([arrKey, arrData]) => {
            if (this.validateArrondissement(arrKey, arrData)) {
                validatedArrondissements[arrKey] = arrData;
            }
        });
        
        if (Object.keys(validatedArrondissements).length === 0) {
            console.error('❌ Aucun arrondissement valide trouvé');
            return null;
        }
        
        return validatedArrondissements;
    }
    
    validateArrondissement(arrKey, arrData) {
        if (!arrData.title) {
            console.warn(`⚠️ Arrondissement ${arrKey}: pas de titre`);
            return false;
        }
        
        if (!arrData.categories || typeof arrData.categories !== 'object') {
            console.warn(`⚠️ Arrondissement ${arrKey}: pas de catégories`);
            return false;
        }
        
        // Valider les catégories
        let validCategories = 0;
        Object.entries(arrData.categories).forEach(([catKey, catData]) => {
            if (this.validateCategory(arrKey, catKey, catData)) {
                validCategories++;
            }
        });
        
        if (validCategories === 0) {
            console.warn(`⚠️ Arrondissement ${arrKey}: aucune catégorie valide`);
            return false;
        }
        
        return true;
    }
    
    validateCategory(arrKey, catKey, catData) {
        if (!catData.title) {
            console.warn(`⚠️ ${arrKey}/${catKey}: pas de titre de catégorie`);
            return false;
        }
        
        if (!catData.places || !Array.isArray(catData.places)) {
            console.warn(`⚠️ ${arrKey}/${catKey}: pas de lieux ou format invalide`);
            return false;
        }
        
        // Valider les lieux
        let validPlaces = 0;
        catData.places.forEach((place, index) => {
            if (this.validatePlace(arrKey, catKey, place, index)) {
                validPlaces++;
            }
        });
        
        if (validPlaces === 0) {
            console.warn(`⚠️ ${arrKey}/${catKey}: aucun lieu valide`);
            return false;
        }
        
        return true;
    }
    
    validatePlace(arrKey, catKey, place, index) {
        if (!place.name || typeof place.name !== 'string') {
            console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: nom manquant ou invalide`);
            return false;
        }
        
        if (!place.description || typeof place.description !== 'string') {
            console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: description manquante`);
            // Non bloquant, on peut continuer
        }
        
        // Valider les coordonnées si présentes
        if (place.coordinates) {
            if (!Array.isArray(place.coordinates) || place.coordinates.length !== 2) {
                console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: coordonnées invalides`);
                place.coordinates = null; // Supprime les coordonnées invalides
            }
        }
        
        if (place.address && typeof place.address !== 'string') {
            console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: adresse invalide`);
        }
        
        if (place.tags && !Array.isArray(place.tags)) {
            console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: tags invalides`);
        }
        
        return true;
    }
    
    // === UTILITAIRES CENTRALISÉS ===
    
    /**
     * Crée un ID unique pour un lieu
     * @param {string} arrKey - Clé de l'arrondissement 
     * @param {string} catKey - Clé de la catégorie
     * @param {string} placeName - Nom du lieu
     * @returns {string} ID unique du lieu
     */
    createPlaceId(arrKey, catKey, placeName) {
        return `${arrKey}-${catKey}-${placeName}`
            .replace(/['"]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
    }
    
    /**
     * Recherche intelligente dans tous les lieux
     * @param {string} query - Terme de recherche
     * @returns {Array} Résultats de recherche avec contexte
     */
    searchPlaces(query) {
        if (!query || !this.app.isDataLoaded) return [];
        
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                (catData.places || []).forEach(place => {
                    if (this.matchesSearch(place, lowerQuery)) {
                        results.push({
                            place,
                            placeId: this.createPlaceId(arrKey, catKey, place.name),
                            arrKey,
                            catKey,
                            arrondissement: arrData.title,
                            category: catData.title
                        });
                    }
                });
            });
        });
        
        return results;
    }
    
    /**
     * FONCTION UNIQUE de recherche (élimine la duplication)
     * @param {Object} place - Objet lieu
     * @param {string} query - Terme de recherche en minuscules
     * @returns {boolean} Correspond à la recherche
     */
    matchesSearch(place, query) {
        return place.name.toLowerCase().includes(query) ||
               (place.description && place.description.toLowerCase().includes(query)) ||
               (place.address && place.address.toLowerCase().includes(query)) ||
               (place.tags && place.tags.some(tag => tag.toLowerCase().includes(query)));
    }
    
    /**
     * Obtient les coordonnées d'un lieu (avec fallback)
     * @param {Object} place - Objet lieu
     * @param {string} arrKey - Clé arrondissement pour fallback
     * @returns {Array|null} [lat, lng] ou null
     */
    getPlaceCoordinates(place, arrKey) {
        // Priorité 1: Coordonnées directes du lieu
        if (place.coordinates && Array.isArray(place.coordinates) && place.coordinates.length === 2) {
            return place.coordinates;
        }
        
        // Priorité 2: Coordonnées du centre de l'arrondissement
        const arrondissementCoords = this.getArrondissementCoordinates(arrKey);
        if (arrondissementCoords) {
            return arrondissementCoords;
        }
        
        // Fallback: Centre de Paris
        return [48.8566, 2.3522];
    }
    
    /**
     * Obtient les coordonnées du centre d'un arrondissement
     * @param {string} arrKey - Clé de l'arrondissement
     * @returns {Array|null} [lat, lng] ou null
     */
    getArrondissementCoordinates(arrKey) {
        const arrondissementCoords = {
            '1er': [48.8607, 2.3358], '2ème': [48.8700, 2.3408], '3ème': [48.8630, 2.3626],
            '4ème': [48.8534, 2.3488], '5ème': [48.8462, 2.3372], '6ème': [48.8496, 2.3341],
            '7ème': [48.8534, 2.2944], '8ème': [48.8718, 2.3075], '9ème': [48.8768, 2.3364],
            '10ème': [48.8709, 2.3674], '11ème': [48.8594, 2.3765], '12ème': [48.8448, 2.3776],
            '13ème': [48.8282, 2.3555], '14ème': [48.8323, 2.3255], '15ème': [48.8428, 2.2944],
            '16ème': [48.8635, 2.2773], '17ème': [48.8799, 2.2951], '18ème': [48.8867, 2.3431],
            '19ème': [48.8799, 2.3831], '20ème': [48.8631, 2.3969]
        };
        
        return arrondissementCoords[arrKey] || null;
    }
    
    // === STATISTIQUES DES DONNÉES ===
    logDataSummary(data) {
        let totalPlaces = 0;
        let totalCategories = 0;
        let placesWithAddress = 0;
        let placesWithTags = 0;
        let placesWithCoordinates = 0;
        
        Object.entries(data).forEach(([arrKey, arrData]) => {
            let arrPlaces = 0;
            let arrCategories = 0;
            
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                arrCategories++;
                const placesCount = (catData.places || []).length;
                arrPlaces += placesCount;
                
                // Analyser les lieux
                (catData.places || []).forEach(place => {
                    if (place.address) placesWithAddress++;
                    if (place.tags && place.tags.length > 0) placesWithTags++;
                    if (place.coordinates) placesWithCoordinates++;
                });
            });
            
            totalPlaces += arrPlaces;
            totalCategories += arrCategories;
            console.log(`📍 ${arrKey}: ${arrPlaces} lieux dans ${arrCategories} catégories`);
        });
        
        console.log(`📊 RÉSUMÉ TOTAL:`);
        console.log(`   • ${Object.keys(data).length} arrondissements`);
        console.log(`   • ${totalCategories} catégories`);
        console.log(`   • ${totalPlaces} lieux au total`);
        console.log(`   • ${placesWithAddress} lieux avec adresse (${Math.round(placesWithAddress/totalPlaces*100)}%)`);
        console.log(`   • ${placesWithTags} lieux avec tags (${Math.round(placesWithTags/totalPlaces*100)}%)`);
        console.log(`   • ${placesWithCoordinates} lieux avec coordonnées (${Math.round(placesWithCoordinates/totalPlaces*100)}%)`);
    }
    
    // === HELPERS POUR STATISTIQUES ===
    getTotalPlaces() {
        if (!this.app.isDataLoaded || !this.app.parisData) return 147; // Valeur par défaut pour la démo
        
        let total = 0;
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            if (arrData && arrData.categories) {
                Object.entries(arrData.categories).forEach(([catKey, catData]) => {
                    if (catData && catData.places && Array.isArray(catData.places)) {
                        total += catData.places.length;
                    }
                });
            }
        });
        return total;
    }
    
    getTotalPlacesInArrondissement(arrData) {
        let total = 0;
        if (arrData && arrData.categories) {
            Object.entries(arrData.categories).forEach(([catKey, catData]) => {
                if (catData && catData.places && Array.isArray(catData.places)) {
                    total += catData.places.length;
                }
            });
        }
        return total;
    }
    
    getVisitedPlacesInArrondissement(arrData, arrKey) {
        const userData = this.app.getCurrentUserData();
        if (!userData || !arrData) return 0;
        
        let visited = 0;
        Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
            if (catData && catData.places && Array.isArray(catData.places)) {
                catData.places.forEach(place => {
                    const placeId = this.createPlaceId(arrKey, catKey, place.name);
                    if (userData.visitedPlaces instanceof Set && userData.visitedPlaces.has(placeId)) {
                        visited++;
                    }
                });
            }
        });
        return visited;
    }
}
