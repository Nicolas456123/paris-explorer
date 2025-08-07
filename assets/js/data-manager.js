// ===== DATA MANAGER - VERSION CORRIGÉE COMPLÈTE =====

class DataManager {
    constructor(app) {
        this.app = app;
        this.loadedFiles = new Set();
        this.cacheDuration = 3600000; // 1 heure
        this.retryAttempts = 1; // Réduire pour accélérer
        this.retryDelay = 500; // 500ms pour accélérer
        this.loadingQueue = [];
        this.isLoading = false;
    }
    
    // === CHARGEMENT PRINCIPAL ===
    async loadParisData() {
        console.log('📊 Début du chargement des données parisiennes');
        
        try {
            // Étape 1: Charger l'index principal
            console.log('📋 Chargement de l\'index principal...');
            const parisIndex = await this.loadParisIndex();
            
            if (!parisIndex?.arrondissements) {
                throw new Error('Index des arrondissements introuvable');
            }
            
            // Étape 2: Charger tous les arrondissements
            console.log('🏛️ Chargement de tous les arrondissements...');
            await this.loadAllArrondissements(parisIndex);
            
            // Étape 3: Validation et statistiques
            this.validateLoadedData();
            this.logDataSummary(this.app.parisData);
            
            // Marquer comme chargé
            this.app.isDataLoaded = true;
            
            const totalPlaces = this.getTotalPlaces();
            console.log(`✅ Chargement terminé : ${totalPlaces} lieux disponibles`);
            
            if (totalPlaces < 1000) {
                console.warn(`⚠️ Seulement ${totalPlaces} lieux chargés - données incomplètes`);
                this.app.showNotification(`⚠️ ${totalPlaces} lieux chargés (données partielles)`, 'warning');
            } else {
                this.app.showNotification(`✅ ${totalPlaces} lieux de Paris chargés !`, 'success');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des données:', error);
            this.app.showNotification('Erreur lors du chargement des données', 'error');
            
            // Mode dégradé avec données minimales
            this.loadFallbackData();
            return false;
        }
    }
    
    // === CHARGEMENT DE L'INDEX ===
    async loadParisIndex() {
        try {
            const response = await fetch('data/paris-index.json');
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            const index = await response.json();
            console.log('✅ Index principal chargé');
            return index;
            
        } catch (error) {
            console.error('❌ Erreur chargement index:', error);
            throw error;
        }
    }
    
    // === CHARGEMENT DE TOUS LES ARRONDISSEMENTS ===
    async loadAllArrondissements(parisIndex) {
        const arrondissements = parisIndex.arrondissements || {};
        const arrKeys = Object.keys(arrondissements);
        const totalCount = arrKeys.length;
        
        console.log(`📍 Chargement de ${totalCount} arrondissements...`);
        
        // Initialiser les données Paris
        this.app.parisData = {};
        
        let loadedCount = 0;
        let failedCount = 0;
        
        // Charger chaque arrondissement avec retry
        for (const arrKey of arrKeys) {
            const arrInfo = arrondissements[arrKey];
            
            try {
                console.log(`📍 Chargement ${arrKey}...`);
                const success = await this.loadSingleArrondissement(arrKey, arrInfo);
                
                if (success) {
                    loadedCount++;
                    console.log(`✅ ${arrKey} chargé (${loadedCount}/${totalCount})`);
                } else {
                    failedCount++;
                    console.warn(`⚠️ ${arrKey} échoué`);
                }
                
            } catch (error) {
                failedCount++;
                console.error(`❌ Erreur ${arrKey}:`, error);
            }
        }
        
        console.log(`📊 Résultats: ${loadedCount} chargés, ${failedCount} échoués`);
        
        if (loadedCount === 0) {
            throw new Error('Aucun arrondissement n\'a pu être chargé');
        }
        
        return { loaded: loadedCount, failed: failedCount, total: totalCount };
    }
    
    // === CHARGEMENT D'UN ARRONDISSEMENT ===
async loadSingleArrondissement(arrKey, arrInfo, attempt = 1) {
    const maxAttempts = this.retryAttempts;
    
    try {
        // ✅ Utiliser directement le mapping spécifique (un seul chemin valide)
        const filePath = this.getSpecificFilePath(arrKey);
        
        if (!filePath) {
            console.error(`❌ Pas de chemin défini pour ${arrKey}`);
            return false;
        }

        console.log(`📁 Chargement ${arrKey}: ${filePath}`);
        
        try {
            const response = await fetch(filePath, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const arrData = await response.json();
                
                // Valider les données
                if (this.validateArrondissementData(arrData)) {
                    // Processus des données
                    this.processArrondissementData(arrKey, arrData);
                    console.log(`✅ ${arrKey} chargé`);
                    return true;
                } else {
                    console.warn(`⚠️ Données invalides dans ${filePath}`);
                    return false;
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (fetchError) {
            throw fetchError;
        }
        
    } catch (error) {
        if (attempt < maxAttempts) {
            console.log(`⏳ Retry ${arrKey} dans ${this.retryDelay}ms...`);
            await this.delay(this.retryDelay);
            return await this.loadSingleArrondissement(arrKey, arrInfo, attempt + 1);
        }
        
        console.error(`❌ Échec définitif pour ${arrKey}:`, error);
        return false;
    }
}
    // Mappings spécifiques pour les cas problématiques
getSpecificFilePath(arrKey) {
    const specificMappings = {
        '1er': 'data/arrondissements/01-louvre.json',
        '2ème': 'data/arrondissements/02-bourse.json',
        '3ème': 'data/arrondissements/03-haut-marais.json',
        '4ème': 'data/arrondissements/04-marais-ile-saint-louis.json',
        '5ème': 'data/arrondissements/05-quartier-latin.json',
        '6ème': 'data/arrondissements/06-saint-germain.json',
        '7ème': 'data/arrondissements/07-invalides-tour-eiffel.json',
        '8ème': 'data/arrondissements/08-champs-elysees.json',
        '9ème': 'data/arrondissements/09-opera-pigalle.json',
        '10ème': 'data/arrondissements/10-canal-saint-martin.json',
        '11ème': 'data/arrondissements/11-bastille-oberkampf.json',
        '12ème': 'data/arrondissements/12-nation-bercy.json',
        '13ème': 'data/arrondissements/13-chinatown-bibliotheque.json',
        '14ème': 'data/arrondissements/14-montparnasse.json',
        '15ème': 'data/arrondissements/15-vaugirard-beaugrenelle.json',
        '16ème': 'data/arrondissements/16-trocadero-passy.json',
        '17ème': 'data/arrondissements/17-batignolles-monceau.json',
        '18ème': 'data/arrondissements/18-montmartre-barbes.json',
        '19ème': 'data/arrondissements/19-buttes-chaumont-villette.json',
        '20ème': 'data/arrondissements/20-belleville-pere-lachaise.json'
    };
    
    return specificMappings[arrKey] || null;
}

// Extraire le numéro d'arrondissement
extractArrNumber(arrKey) {
    const match = arrKey.match(/(\d+)/);
    return match ? match[1].padStart(2, '0') : null;
}
    // ✅ Amélioration : validation plus stricte des données
validateArrondissementData(data) {
    if (!data || typeof data !== 'object') {
        console.warn('❌ Données non valides: pas un objet');
        return false;
    }
    
    // Vérifier la structure de base
    if (!data.arrondissement) {
        console.warn('❌ Champ arrondissement manquant');
        return false;
    }
    
    // Les catégories sont dans arrondissement.categories
    if (!data.arrondissement.categories || Object.keys(data.arrondissement.categories).length === 0) {
        console.warn('❌ Aucune catégorie trouvée dans arrondissement.categories');
        return false;
    }
    
    console.log(`✅ Structure valide avec ${Object.keys(data.arrondissement.categories).length} catégories`);
    return true;
}

// === TRAITEMENT DES DONNÉES D'ARRONDISSEMENT ===
processArrondissementData(arrKey, arrData) {
    // La structure a les catégories dans arrondissement.categories
    // On copie les catégories à la racine pour simplifier l'accès
    if (arrData.arrondissement?.categories) {
        arrData.categories = arrData.arrondissement.categories;
    }
    
    // Stocker les données dans l'app
    this.app.parisData[arrKey] = arrData;
    
    // Marquer comme chargé
    this.loadedFiles.add(arrKey);
    
    const categoryCount = Object.keys(arrData.arrondissement?.categories || {}).length;
    console.log(`✅ ${arrKey} traité avec ${categoryCount} catégories`);
}

// ✅ Fonction utilitaire pour les délais
delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
    
    // === VALIDATION DES DONNÉES ===
    validateLoadedData() {
        console.log('🔍 Validation des données chargées...');
        
        const dataKeys = Object.keys(this.app.parisData);
        console.log(`📊 ${dataKeys.length} arrondissements à valider`);
        
        let totalPlaces = 0;
        let validArrondissements = 0;
        
        dataKeys.forEach(arrKey => {
            const arrData = this.app.parisData[arrKey];
            if (this.validateArrondissement(arrKey, arrData)) {
                validArrondissements++;
                totalPlaces += this.getTotalPlacesInArrondissement(arrData);
            }
        });
        
        console.log(`✅ ${validArrondissements} arrondissements valides, ${totalPlaces} lieux au total`);
        return validArrondissements > 0;
    }
    
    validateArrondissement(arrKey, arrData) {
        if (!arrData || typeof arrData !== 'object') {
            console.warn(`⚠️ ${arrKey}: données nulles ou invalides`);
            return false;
        }
        
        if (!arrData.title) {
            console.warn(`⚠️ ${arrKey}: titre manquant`);
            return false;
        }
        
        if (!arrData.categories || typeof arrData.categories !== 'object') {
            console.warn(`⚠️ ${arrKey}: catégories manquantes`);
            return false;
        }
        
        // Validation des catégories
        let validCategories = 0;
        Object.entries(arrData.categories).forEach(([catKey, catData]) => {
            if (this.validateCategory(arrKey, catKey, catData)) {
                validCategories++;
            }
        });
        
        if (validCategories === 0) {
            console.warn(`⚠️ ${arrKey}: aucune catégorie valide`);
            return false;
        }
        
        return true;
    }
    
    validateCategory(arrKey, catKey, catData) {
        if (!catData || !catData.title) {
            console.warn(`⚠️ ${arrKey}/${catKey}: titre de catégorie manquant`);
            return false;
        }
        
        if (!catData.places || !Array.isArray(catData.places)) {
            console.warn(`⚠️ ${arrKey}/${catKey}: lieux manquants ou format invalide`);
            return false;
        }
        
        // Valider au moins un lieu
        let validPlaces = 0;
        catData.places.forEach((place, index) => {
            if (this.validatePlace(arrKey, catKey, place, index)) {
                validPlaces++;
            }
        });
        
        return validPlaces > 0;
    }
    
    validatePlace(arrKey, catKey, place, index) {
        if (!place || typeof place !== 'object') {
            console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: lieu invalide`);
            return false;
        }
        
        if (!place.name || typeof place.name !== 'string') {
            console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: nom manquant`);
            return false;
        }
        
        // Validation optionnelle mais recommandée
        if (place.coordinates && !this.validateCoordinates(place.coordinates)) {
            console.warn(`⚠️ ${arrKey}/${catKey}[${index}]: coordonnées invalides`);
        }
        
        return true;
    }
    
    validateCoordinates(coords) {
        return Array.isArray(coords) && 
               coords.length >= 2 && 
               typeof coords[0] === 'number' && 
               typeof coords[1] === 'number' &&
               coords[0] >= -90 && coords[0] <= 90 &&
               coords[1] >= -180 && coords[1] <= 180;
    }
    
    // === DONNÉES DE FALLBACK ===
    loadFallbackData() {
        console.log('🚨 Chargement des données de fallback...');
        
        this.app.parisData = {
            '1er': {
                title: '1ER ARRONDISSEMENT - LE LOUVRE',
                categories: {
                    monuments: {
                        title: 'Monuments',
                        places: [
                            { name: 'Musée du Louvre', description: 'Le plus grand musée du monde', coordinates: [48.8606, 2.3376] },
                            { name: 'Sainte-Chapelle', description: 'Joyau de l\'art gothique', coordinates: [48.8553, 2.3451] }
                        ]
                    }
                }
            },
            '4ème': {
                title: '4ÈME ARRONDISSEMENT - LE MARAIS',
                categories: {
                    monuments: {
                        title: 'Monuments',
                        places: [
                            { name: 'Notre-Dame de Paris', description: 'Cathédrale gothique emblématique', coordinates: [48.8530, 2.3499] },
                            { name: 'Place des Vosges', description: 'Plus ancienne place de Paris', coordinates: [48.8558, 2.3660] }
                        ]
                    }
                }
            },
            '7ème': {
                title: '7ÈME ARRONDISSEMENT - TOUR EIFFEL',
                categories: {
                    monuments: {
                        title: 'Monuments',
                        places: [
                            { name: 'Tour Eiffel', description: 'Dame de fer parisienne', coordinates: [48.8584, 2.2945] },
                            { name: 'Invalides', description: 'Tombeau de Napoléon', coordinates: [48.8560, 2.3124] }
                        ]
                    }
                }
            }
        };
        
        this.app.isDataLoaded = true;
        console.log('✅ Données de fallback chargées');
        this.app.showNotification('Mode dégradé : données minimales chargées', 'warning');
    }
    
    // === UTILITAIRES DE DONNÉES ===
    getTotalPlaces() {
        if (!this.app.isDataLoaded || !this.app.parisData) {
            return 0;
        }
        
        let total = 0;
        Object.values(this.app.parisData).forEach(arrData => {
            if (arrData?.categories) {
                Object.values(arrData.categories).forEach(catData => {
                    if (catData?.places && Array.isArray(catData.places)) {
                        total += catData.places.length;
                    }
                });
            }
        });
        
        return total;
    }
    
    getTotalPlacesInArrondissement(arrData) {
        let total = 0;
        if (arrData?.categories) {
            Object.values(arrData.categories).forEach(catData => {
                if (catData?.places && Array.isArray(catData.places)) {
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
            if (catData?.places && Array.isArray(catData.places)) {
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
    
    // === COORDONNÉES ===
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
    
    getPlaceCoordinates(place, arrKey) {
        // Priorité 1: coordonnées du lieu
        if (place.coordinates && this.validateCoordinates(place.coordinates)) {
            return place.coordinates;
        }
        
        // Priorité 2: coordonnées de l'arrondissement avec décalage aléatoire
        const arrCoords = this.getArrondissementCoordinates(arrKey);
        if (arrCoords) {
            const [lat, lng] = arrCoords;
            // Décalage aléatoire de ±0.005 degrés (≈ 500m)
            const offsetLat = lat + (Math.random() - 0.5) * 0.01;
            const offsetLng = lng + (Math.random() - 0.5) * 0.01;
            return [offsetLat, offsetLng];
        }
        
        return null;
    }
    
    // === IDENTIFIANTS ===
    createPlaceId(arrKey, catKey, placeName) {
        return `${arrKey}-${catKey}-${placeName}`
            .replace(/['"]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
    }
    
    // === STATISTIQUES ===
    logDataSummary(data) {
        if (!data) {
            console.log('📊 Aucune donnée à analyser');
            return;
        }
        
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
                const places = catData.places || [];
                arrPlaces += places.length;
                
                places.forEach(place => {
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
        
        if (totalPlaces > 0) {
            console.log(`   • ${placesWithAddress} lieux avec adresse (${Math.round(placesWithAddress/totalPlaces*100)}%)`);
            console.log(`   • ${placesWithTags} lieux avec tags (${Math.round(placesWithTags/totalPlaces*100)}%)`);
            console.log(`   • ${placesWithCoordinates} lieux avec coordonnées (${Math.round(placesWithCoordinates/totalPlaces*100)}%)`);
        }
    }
    
    // === RECHERCHE ET FILTRAGE ===
    searchPlaces(query, filters = {}) {
        if (!this.app.isDataLoaded) return [];
        
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            // Filtrer par arrondissement
            if (filters.arrondissement && !arrKey.includes(filters.arrondissement)) {
                return;
            }
            
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                // Filtrer par catégorie
                if (filters.category && !catKey.toLowerCase().includes(filters.category.toLowerCase())) {
                    return;
                }
                
                (catData.places || []).forEach(place => {
                    // Recherche textuelle
                    const matchesQuery = !query || 
                        place.name.toLowerCase().includes(lowerQuery) ||
                        (place.description && place.description.toLowerCase().includes(lowerQuery)) ||
                        (place.address && place.address.toLowerCase().includes(lowerQuery)) ||
                        (place.tags && place.tags.some(tag => tag.toLowerCase().includes(lowerQuery)));
                    
                    if (matchesQuery) {
                        const placeId = this.createPlaceId(arrKey, catKey, place.name);
                        const userData = this.app.getCurrentUserData();
                        const isVisited = userData && userData.visitedPlaces instanceof Set ? 
                            userData.visitedPlaces.has(placeId) : false;
                        
                        // Filtrer par statut de visite
                        if (filters.status === 'visited' && !isVisited) return;
                        if (filters.status === 'not-visited' && isVisited) return;
                        
                        results.push({
                            placeId,
                            place,
                            arrKey,
                            catKey,
                            arrData,
                            catData,
                            isVisited
                        });
                    }
                });
            });
        });
        
        return results;
    }
    
    // === CACHE ET PERFORMANCE ===
    clearCache() {
        this.loadedFiles.clear();
        console.log('🧹 Cache nettoyé');
    }
    
    getLoadedFilesCount() {
        return this.loadedFiles.size;
    }
    
    // === RECHARGEMENT ===
    async reloadData() {
        console.log('🔄 Rechargement des données...');
        this.clearCache();
        this.app.parisData = {};
        this.app.isDataLoaded = false;
        
        return this.loadParisData();
    }
}
