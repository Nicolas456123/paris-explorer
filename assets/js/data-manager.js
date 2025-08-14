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
                // Notification supprimée - trop envahissante
            } else {
                console.log(`✅ ${totalPlaces} lieux de Paris chargés !`);
                // Notification de succès supprimée - visible dans la console
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
        
        console.log(`📊 Résultats: ${loadedCount} chargés, ${failedCount} échoués sur ${totalCount} total`);
        
        // Debug détaillé des arrondissements chargés
        Object.keys(this.app.parisData).forEach(arrKey => {
            const arrData = this.app.parisData[arrKey];
            const categoriesCount = Object.keys(arrData?.categories || arrData?.arrondissement?.categories || {}).length;
            console.log(`📍 ${arrKey}: ${categoriesCount} catégories chargées`);
        });
        
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
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const arrData = await response.json();
                console.log(`📋 Données reçues pour ${arrKey}:`, Object.keys(arrData));
                
                // Valider les données
                if (this.validateArrondissementData(arrData)) {
                    // Processus des données
                    this.processArrondissementData(arrKey, arrData);
                    console.log(`✅ ${arrKey} chargé avec succès`);
                    return true;
                } else {
                    console.warn(`⚠️ Données invalides pour ${arrKey} dans ${filePath}`);
                    return false;
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (fetchError) {
            console.error(`❌ Erreur fetch pour ${filePath}:`, fetchError);
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
    // Normaliser la structure pour un accès facile
    if (arrData.arrondissement) {
        // Copier les catégories à la racine pour simplifier l'accès
        if (arrData.arrondissement.categories) {
            arrData.categories = arrData.arrondissement.categories;
        }
        
        // Copier le nom à la racine pour un accès facile
        if (arrData.arrondissement.name) {
            arrData.name = arrData.arrondissement.name;
        }
        
        // Copier la description si elle existe
        if (arrData.arrondissement.description) {
            arrData.description = arrData.arrondissement.description;
        }
    }
    
    // Fallback pour le nom si pas trouvé
    if (!arrData.name) {
        arrData.name = arrKey;
    }
    
    // Stocker les données dans l'app
    this.app.parisData[arrKey] = arrData;
    
    // Marquer comme chargé
    this.loadedFiles.add(arrKey);
    
    const categoryCount = Object.keys(arrData.categories || {}).length;
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
                const placesInArr = this.getTotalPlacesInArrondissement(arrData);
                totalPlaces += placesInArr;
                console.log(`📊 ${arrKey}: ${placesInArr} lieux`);
            } else {
                console.warn(`⚠️ ${arrKey}: arrondissement invalide`);
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
        
        // Vérifier le nom après normalisation
        const arrName = arrData.name || arrData.arrondissement?.name;
        if (!arrName) {
            console.warn(`⚠️ ${arrKey}: nom d'arrondissement manquant`);
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
        console.log('🚨 Chargement des données de fallback désactivé');
        // Ne pas charger de données de fallback pour forcer l'utilisation des vraies données
        console.log('⚠️ Veuillez recharger la page pour charger les données complètes');
        this.app.showNotification('Veuillez recharger la page pour charger les données', 'warning');
        this.app.isDataLoaded = false;
    }
    
    // === UTILITAIRES DE DONNÉES ===
    getTotalPlaces() {
        if (!this.app.isDataLoaded || !this.app.parisData) {
            return 0;
        }
        
        let total = 0;
        Object.values(this.app.parisData).forEach(arrData => {
            // Utiliser la même logique que getTotalPlacesInArrondissement
            const categories = arrData?.categories || arrData?.arrondissement?.categories;
            
            if (categories && typeof categories === 'object') {
                Object.values(categories).forEach(catData => {
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
        
        // Chercher les catégories dans la structure normalisée (arrData.categories)
        // ou dans la structure originale (arrData.arrondissement.categories)
        const categories = arrData?.categories || arrData?.arrondissement?.categories;
        
        if (categories && typeof categories === 'object') {
            Object.values(categories).forEach(catData => {
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
        // Priorité 1: coordonnées exactes du lieu
        if (place.coordinates && this.validateCoordinates(place.coordinates)) {
            return place.coordinates;
        }
        
        // Priorité 2: Si on a une adresse, ne pas utiliser de coordonnées approximatives
        // Google Maps se débrouillera mieux avec l'adresse qu'avec des coords aléatoires
        if (place.address && place.address.trim()) {
            return null; // Laisser Google Maps gérer l'adresse
        }
        
        // Priorité 3: coordonnées du centre de l'arrondissement (sans décalage aléatoire)
        // Seulement si on n'a ni coordonnées précises ni adresse
        const arrCoords = this.getArrondissementCoordinates(arrKey);
        if (arrCoords) {
            return arrCoords; // Coordonnées exactes du centre de l'arrondissement
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
