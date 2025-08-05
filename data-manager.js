// ===== DATA MANAGER - GESTION DES DONNÉES PARISIENNES =====

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
        
        if (place.address && typeof place.address !== 'string') {
            console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: adresse invalide`);
            // Non bloquant
        }
        
        if (place.tags && !Array.isArray(place.tags)) {
            console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: tags invalides`);
            // Non bloquant
        }
        
        return true;
    }
    
    // === STATISTIQUES DES DONNÉES ===
    logDataSummary(data) {
        let totalPlaces = 0;
        let totalCategories = 0;
        let placesWithAddress = 0;
        let placesWithTags = 0;
        
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
                    const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                    if (userData.visitedPlaces instanceof Set && userData.visitedPlaces.has(placeId)) {
                        visited++;
                    }
                });
            }
        });
        return visited;
    }
    
    // === UTILITAIRES ===
    getPlacesBySearch(query) {
        if (!query || !this.app.isDataLoaded) return [];
        
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                (catData.places || []).forEach(place => {
                    if (this.matchesSearch(place, lowerQuery)) {
                        results.push({
                            place,
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
    
    matchesSearch(place, query) {
        return place.name.toLowerCase().includes(query) ||
               (place.description && place.description.toLowerCase().includes(query)) ||
               (place.address && place.address.toLowerCase().includes(query)) ||
               (place.tags && place.tags.some(tag => tag.toLowerCase().includes(query)));
    }
}
