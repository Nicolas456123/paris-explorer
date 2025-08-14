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
        console.log('📊 Début du chargement des données parisiennes depuis CSV');
        
        try {
            // Étape 1: Charger les données CSV
            console.log('📋 Chargement du fichier CSV principal...');
            await this.loadCSVData();
            
            // Étape 2: Charger les métadonnées des arrondissements
            console.log('🏛️ Chargement des informations d\'arrondissements...');
            await this.loadArrondissementsInfo();
            
            // Étape 3: Validation et statistiques
            this.validateLoadedData();
            this.logDataSummary(this.app.parisData);
            
            // Marquer comme chargé
            this.app.isDataLoaded = true;
            
            const totalPlaces = this.getTotalPlaces();
            console.log(`✅ Chargement terminé : ${totalPlaces} lieux disponibles`);
            
            if (totalPlaces < 600) {
                console.warn(`⚠️ Seulement ${totalPlaces} lieux chargés - données incomplètes`);
            } else {
                console.log(`✅ ${totalPlaces} lieux de Paris chargés depuis CSV !`);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des données CSV:', error);
            this.app.showNotification('Erreur lors du chargement des données CSV', 'error');
            
            // Mode dégradé avec données minimales
            this.loadFallbackData();
            return false;
        }
    }
    
    // === CHARGEMENT DES DONNÉES CSV ===
    async loadCSVData() {
        try {
            const response = await fetch('data/paris-places.csv');
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            console.log('✅ Fichier CSV principal chargé');
            
            // Parser le CSV et organiser par arrondissement
            await this.parseCSVData(csvText);
            
        } catch (error) {
            console.error('❌ Erreur chargement CSV:', error);
            throw error;
        }
    }
    
    // === CHARGEMENT DES INFOS ARRONDISSEMENTS ===
    async loadArrondissementsInfo() {
        try {
            const response = await fetch('data/arrondissements-info.csv');
            if (!response.ok) {
                console.warn('⚠️ Fichier arrondissements-info.csv non trouvé, utilisation des coordonnées par défaut');
                return;
            }
            
            const csvText = await response.text();
            await this.parseArrondissementsInfo(csvText);
            console.log('✅ Informations d\'arrondissements chargées');
            
        } catch (error) {
            console.warn('⚠️ Erreur chargement infos arrondissements:', error);
            // Continue sans les métadonnées d'arrondissement
        }
    }
    
    // === PARSING DES DONNÉES CSV ===
    async parseCSVData(csvText) {
        console.log('📊 Parsing des données CSV...');
        
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        // Vérifier les headers attendus
        const expectedHeaders = ['id', 'name', 'category', 'description', 'address', 'lat', 'lng', 'arr', 'arrondissement'];
        console.log('📋 Headers trouvés:', headers);
        
        // Initialiser les données Paris
        this.app.parisData = {};
        this.arrondissementsInfo = {};
        
        let totalPlaces = 0;
        let currentArrondissement = null;
        
        // Parser chaque ligne (skip header)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Ignorer les lignes de commentaires qui commencent par #
            if (line.startsWith('#')) {
                const match = line.match(/#\s*===\s*([^=]+)\s*===/i);
                if (match) {
                    currentArrondissement = match[1].trim();
                    console.log(`📍 Section: ${currentArrondissement}`);
                }
                continue;
            }
            
            try {
                const place = this.parseCSVLine(line, headers);
                if (place && place.arrondissement) {
                    this.addPlaceToData(place);
                    totalPlaces++;
                }
            } catch (error) {
                console.warn(`⚠️ Erreur parsing ligne ${i}: ${error.message}`);
            }
        }
        
        console.log(`✅ ${totalPlaces} lieux parsés depuis CSV`);
        
        // Organiser les données par catégories pour chaque arrondissement
        this.organizeDataByCategories();
    }
    
    // === PARSING D'UNE LIGNE CSV ===
    parseCSVLine(line, headers) {
        // Parser CSV avec support des guillemets
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"' && (i === 0 || line[i-1] === ',')) {
                inQuotes = true;
            } else if (char === '"' && inQuotes) {
                inQuotes = false;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        // Créer l'objet place
        const place = {};
        headers.forEach((header, index) => {
            if (values[index] !== undefined) {
                place[header.trim()] = values[index].trim();
            }
        });
        
        // Convertir lat/lng en nombres et créer coordinates
        if (place.lat && place.lng) {
            const lat = parseFloat(place.lat);
            const lng = parseFloat(place.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                place.coordinates = [lat, lng];
            }
        }
        
        return place;
    }
    
    // === AJOUTER UN LIEU AUX DONNÉES ===
    addPlaceToData(place) {
        const arrKey = place.arrondissement || place.arr;
        if (!arrKey) return;
        
        // Initialiser l'arrondissement si nécessaire
        if (!this.app.parisData[arrKey]) {
            this.app.parisData[arrKey] = {
                name: arrKey,
                categories: {},
                arrondissement: {
                    name: arrKey,
                    categories: {}
                }
            };
        }
        
        const categoryKey = this.normalizeCategoryKey(place.category || 'general');
        
        // Initialiser la catégorie si nécessaire
        if (!this.app.parisData[arrKey].categories[categoryKey]) {
            this.app.parisData[arrKey].categories[categoryKey] = {
                title: place.category || 'Général',
                places: []
            };
            // Aussi dans la structure arrondissement pour compatibilité
            this.app.parisData[arrKey].arrondissement.categories[categoryKey] = this.app.parisData[arrKey].categories[categoryKey];
        }
        
        // Ajouter le lieu
        const placeObj = {
            name: place.name,
            description: place.description || '',
            address: place.address || '',
            coordinates: place.coordinates
        };
        
        this.app.parisData[arrKey].categories[categoryKey].places.push(placeObj);
    }
    
    // === NORMALISER CLÉ DE CATÉGORIE ===
    normalizeCategoryKey(category) {
        return category.toLowerCase()
            .replace(/[éèêë]/g, 'e')
            .replace(/[àâä]/g, 'a')
            .replace(/[ùûü]/g, 'u')
            .replace(/[îï]/g, 'i')
            .replace(/[ôö]/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    // === ORGANISER DONNÉES PAR CATÉGORIES ===
    organizeDataByCategories() {
        console.log('📊 Organisation des données par catégories...');
        
        Object.keys(this.app.parisData).forEach(arrKey => {
            const arrData = this.app.parisData[arrKey];
            const categoriesCount = Object.keys(arrData.categories).length;
            const totalPlaces = Object.values(arrData.categories)
                .reduce((sum, cat) => sum + (cat.places?.length || 0), 0);
            console.log(`📍 ${arrKey}: ${totalPlaces} lieux dans ${categoriesCount} catégories`);
        });
    }
    
    // === PARSING INFOS ARRONDISSEMENTS ===
    async parseArrondissementsInfo(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',');
            const arrInfo = {};
            
            headers.forEach((header, index) => {
                if (values[index] !== undefined) {
                    arrInfo[header.trim()] = values[index].trim();
                }
            });
            
            if (arrInfo.id) {
                this.arrondissementsInfo[arrInfo.id] = arrInfo;
            }
        }
        
        console.log(`✅ Informations de ${Object.keys(this.arrondissementsInfo).length} arrondissements chargées`);
    }
    
    // === MÉTHODES SUPPRIMÉES - REMPLACÉES PAR CSV ===
    // Les méthodes loadSingleArrondissement, getSpecificFilePath et extractArrNumber
    // ne sont plus nécessaires car nous chargeons directement depuis CSV
    // ✅ Validation des données CSV
validateArrondissementData(data) {
    if (!data || typeof data !== 'object') {
        console.warn('❌ Données non valides: pas un objet');
        return false;
    }
    
    // Vérifier la structure CSV
    if (!data.categories || Object.keys(data.categories).length === 0) {
        console.warn('❌ Aucune catégorie trouvée dans les données CSV');
        return false;
    }
    
    console.log(`✅ Structure CSV valide avec ${Object.keys(data.categories).length} catégories`);
    return true;
}

// === TRAITEMENT DES DONNÉES D'ARRONDISSEMENT CSV ===
processArrondissementData(arrKey, arrData) {
    // Les données sont déjà dans la bonne structure depuis le parsing CSV
    // Ajouter les métadonnées d'arrondissement si disponibles
    if (this.arrondissementsInfo && this.arrondissementsInfo[arrKey]) {
        const info = this.arrondissementsInfo[arrKey];
        arrData.metadata = {
            description: info.description,
            population: info.population,
            area_km2: info.area_km2,
            center: [parseFloat(info.center_lat), parseFloat(info.center_lng)],
            bounds: {
                north: parseFloat(info.bounds_north),
                south: parseFloat(info.bounds_south),
                east: parseFloat(info.bounds_east),
                west: parseFloat(info.bounds_west)
            }
        };
    }
    
    // Marquer comme chargé
    this.loadedFiles.add(arrKey);
    
    const categoryCount = Object.keys(arrData.categories || {}).length;
    const totalPlaces = Object.values(arrData.categories).reduce((sum, cat) => sum + (cat.places?.length || 0), 0);
    console.log(`✅ ${arrKey} traité avec ${categoryCount} catégories et ${totalPlaces} lieux`);
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
        console.log('🚨 Erreur de chargement CSV - données de fallback désactivées');
        console.log('⚠️ Vérifiez que les fichiers data/paris-places.csv et data/arrondissements-info.csv existent');
        this.app.showNotification('Erreur de chargement des fichiers CSV', 'error');
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
        // Utiliser les coordonnées depuis arrondissements-info.csv si disponibles
        if (this.arrondissementsInfo && this.arrondissementsInfo[arrKey]) {
            const info = this.arrondissementsInfo[arrKey];
            const lat = parseFloat(info.center_lat);
            const lng = parseFloat(info.center_lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                return [lat, lng];
            }
        }
        
        // Coordonnées par défaut en fallback
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
        console.log('🔄 Rechargement des données CSV...');
        this.clearCache();
        this.app.parisData = {};
        this.arrondissementsInfo = {};
        this.app.isDataLoaded = false;
        
        return this.loadParisData();
    }
}
