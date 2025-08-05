// ===== DATA MANAGER - GESTION DES DONNÉES PARISIENNES MODULAIRE =====

class DataManager {
    constructor(app) {
        this.app = app;
        this.cache = new Map();
        this.loadedArrondissements = new Set();
        this.loadingPromises = new Map();
        this.config = {
            cacheEnabled: true,
            cacheDuration: 3600000, // 1 heure
            maxRetries: 3,
            retryDelay: 1000
        };
    }
    
    // === CHARGEMENT PRINCIPAL DES DONNÉES ===
    
    async loadParisData() {
        try {
            console.log('📊 Chargement des données Paris (nouvelle architecture)...');
            this.app.showNotification('Chargement des trésors parisiens...', 'info');
            
            // Chargement de l'index principal
            const indexData = await this.loadParisIndex();
            
            // Chargement des arrondissements
            await this.loadArrondissements(indexData.arrondissements);
            
            console.log('✅ Toutes les données Paris chargées avec succès');
            this.app.onDataLoaded();
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement principal:', error);
            throw error;
        }
    }
    
    async loadParisIndex() {
        try {
            console.log('📋 Chargement de l\'index principal...');
            
            const response = await this.fetchWithRetry('data/paris-index.json');
            if (!response.ok) {
                throw new Error(`Index introuvable: ${response.status}`);
            }
            
            const indexData = await response.json();
            this.validateIndexStructure(indexData);
            
            console.log('✅ Index principal chargé:', {
                version: indexData.metadata?.version,
                arrondissements: Object.keys(indexData.arrondissements || {}).length,
                totalPlaces: indexData.metadata?.totalPlaces
            });
            
            return indexData;
            
        } catch (error) {
            console.error('❌ Erreur chargement index:', error);
            throw new Error(`Impossible de charger l'index principal: ${error.message}`);
        }
    }
    
    async loadArrondissements(arrondissementsList) {
        console.log(`📍 Chargement de ${Object.keys(arrondissementsList).length} arrondissements...`);
        
        const loadPromises = Object.entries(arrondissementsList).map(([arrKey, arrInfo]) => 
            this.loadArrondissement(arrKey, arrInfo)
        );
        
        const results = await Promise.allSettled(loadPromises);
        
        // Analyser les résultats
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected');
        
        console.log(`📊 Chargement terminé: ${successful} réussis, ${failed.length} échecs`);
        
        if (failed.length > 0) {
            failed.forEach((failure, index) => {
                console.warn(`⚠️ Échec arrondissement ${Object.keys(arrondissementsList)[index]}:`, failure.reason);
            });
        }
        
        if (successful === 0) {
            throw new Error('Aucun arrondissement n\'a pu être chargé');
        }
        
        return successful;
    }
    
    async loadArrondissement(arrKey, arrInfo) {
        try {
            // Vérifier le cache
            if (this.cache.has(arrKey) && this.isCacheValid(arrKey)) {
                console.log(`💾 ${arrKey} chargé depuis le cache`);
                this.app.parisData[arrKey] = this.cache.get(arrKey).data;
                return;
            }
            
            // Éviter les chargements multiples simultanés
            if (this.loadingPromises.has(arrKey)) {
                return await this.loadingPromises.get(arrKey);
            }
            
            const loadPromise = this.fetchArrondissementData(arrKey, arrInfo);
            this.loadingPromises.set(arrKey, loadPromise);
            
            try {
                const arrData = await loadPromise;
                
                // Validation et mise en cache
                this.validateArrondissementData(arrKey, arrData);
                this.cacheArrondissement(arrKey, arrData);
                
                // Ajout aux données principales
                this.app.parisData[arrKey] = arrData;
                this.loadedArrondissements.add(arrKey);
                
                console.log(`✅ ${arrKey} chargé: ${this.getTotalPlacesInArrondissement(arrData)} lieux`);
                
            } finally {
                this.loadingPromises.delete(arrKey);
            }
            
        } catch (error) {
            console.error(`❌ Erreur chargement ${arrKey}:`, error);
            throw new Error(`Échec chargement ${arrKey}: ${error.message}`);
        }
    }
    
    async fetchArrondissementData(arrKey, arrInfo) {
        const filePath = arrInfo.file || `data/arrondissements/${this.getArrondissementFileName(arrKey)}`;
        
        console.log(`📁 Chargement de ${arrKey} depuis ${filePath}...`);
        
        const response = await this.fetchWithRetry(filePath);
        
        if (!response.ok) {
            throw new Error(`Fichier ${filePath} introuvable (${response.status})`);
        }
        
        const arrData = await response.json();
        
        // Enrichir avec les métadonnées de l'index si disponibles
        if (arrInfo.metadata) {
            arrData.metadata = { ...arrData.metadata, ...arrInfo.metadata };
        }
        
        return arrData;
    }
    
    // === FALLBACK VERS L'ANCIEN FORMAT ===
    
    async loadFallbackData() {
        try {
            console.log('🔄 Chargement des données de fallback (ancien format)...');
            
            const response = await this.fetchWithRetry('paris-database.json');
            if (!response.ok) {
                throw new Error(`Fallback database introuvable: ${response.status}`);
            }
            
            const textContent = await response.text();
            console.log('📄 Taille du fichier fallback:', textContent.length, 'caractères');
            
            const data = JSON.parse(textContent);
            const validatedData = this.validateFallbackStructure(data);
            
            if (validatedData) {
                console.log('✅ Structure fallback valide détectée');
                console.log('🔍 Nombre d\'arrondissements:', Object.keys(validatedData).length);
                
                this.app.parisData = validatedData;
                this.logDataSummary(validatedData);
                this.app.onDataLoaded();
            } else {
                throw new Error('Structure de données fallback invalide');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement fallback:', error);
            throw error;
        }
    }
    
    // === VALIDATION DES STRUCTURES ===
    
    validateIndexStructure(indexData) {
        if (!indexData || typeof indexData !== 'object') {
            throw new Error('Index principal invalide');
        }
        
        if (!indexData.metadata) {
            console.warn('⚠️ Métadonnées manquantes dans l\'index');
        }
        
        if (!indexData.arrondissements || typeof indexData.arrondissements !== 'object') {
            throw new Error('Liste des arrondissements manquante dans l\'index');
        }
        
        const arrCount = Object.keys(indexData.arrondissements).length;
        if (arrCount === 0) {
            throw new Error('Aucun arrondissement défini dans l\'index');
        }
        
        console.log(`✅ Index validé: ${arrCount} arrondissements définis`);
        return true;
    }
    
    validateArrondissementData(arrKey, arrData) {
        if (!arrData || typeof arrData !== 'object') {
            throw new Error(`Données invalides pour ${arrKey}`);
        }
        
        if (!arrData.title) {
            console.warn(`⚠️ Titre manquant pour ${arrKey}`);
        }
        
        if (!arrData.categories || typeof arrData.categories !== 'object') {
            throw new Error(`Catégories manquantes pour ${arrKey}`);
        }
        
        // Validation des catégories
        let totalPlaces = 0;
        Object.entries(arrData.categories).forEach(([catKey, catData]) => {
            if (!catData.title) {
                console.warn(`⚠️ Titre de catégorie manquant: ${arrKey}/${catKey}`);
            }
            
            if (!catData.places || !Array.isArray(catData.places)) {
                console.warn(`⚠️ Places invalides: ${arrKey}/${catKey}`);
                catData.places = [];
            }
            
            totalPlaces += catData.places.length;
        });
        
        console.log(`✅ ${arrKey} validé: ${totalPlaces} lieux dans ${Object.keys(arrData.categories).length} catégories`);
        return true;
    }
    
    validateFallbackStructure(data) {
        // Logique existante adaptée pour le fallback
        let jsonData = data;
        if (Array.isArray(data) && data.length > 0) {
            console.log('📦 Structure tableau détectée, extraction du premier élément');
            jsonData = data[0];
        }
        
        if (!jsonData || !jsonData.arrondissements) {
            console.error('❌ Structure invalide: pas d\'arrondissements trouvés');
            return null;
        }
        
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
        }
        
        return true;
    }
    
    // === SYSTÈME DE CACHE ===
    
    cacheArrondissement(arrKey, data) {
        if (!this.config.cacheEnabled) return;
        
        this.cache.set(arrKey, {
            data: data,
            timestamp: Date.now(),
            size: JSON.stringify(data).length
        });
        
        console.log(`💾 ${arrKey} mis en cache (${this.cache.get(arrKey).size} caractères)`);
    }
    
    isCacheValid(arrKey) {
        if (!this.cache.has(arrKey)) return false;
        
        const cached = this.cache.get(arrKey);
        const age = Date.now() - cached.timestamp;
        
        return age < this.config.cacheDuration;
    }
    
    clearCache() {
        const cacheSize = this.cache.size;
        this.cache.clear();
        this.loadedArrondissements.clear();
        console.log(`🧹 Cache vidé (${cacheSize} entrées supprimées)`);
    }
    
    getCacheStats() {
        let totalSize = 0;
        const stats = {
            entries: this.cache.size,
            totalSize: 0,
            details: []
        };
        
        this.cache.forEach((cached, arrKey) => {
            totalSize += cached.size;
            stats.details.push({
                arrKey,
                size: cached.size,
                age: Date.now() - cached.timestamp
            });
        });
        
        stats.totalSize = totalSize;
        return stats;
    }
    
    // === UTILITAIRES DE RÉSEAU ===
    
    async fetchWithRetry(url, options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                console.log(`🌐 Tentative ${attempt}/${this.config.maxRetries}: ${url}`);
                
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Cache-Control': 'no-cache',
                        ...options.headers
                    }
                });
                
                if (response.ok) {
                    console.log(`✅ Succès: ${url} (${response.status})`);
                    return response;
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Échec tentative ${attempt}: ${error.message}`);
                
                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelay * attempt;
                    console.log(`⏳ Retry dans ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`Échec après ${this.config.maxRetries} tentatives: ${lastError.message}`);
    }
    
    // === CHARGEMENT DYNAMIQUE ===
    
    async loadArrondissementOnDemand(arrKey) {
        if (this.loadedArrondissements.has(arrKey)) {
            return this.app.parisData[arrKey];
        }
        
        console.log(`🔄 Chargement à la demande: ${arrKey}`);
        
        try {
            const arrInfo = { file: `data/arrondissements/${this.getArrondissementFileName(arrKey)}` };
            await this.loadArrondissement(arrKey, arrInfo);
            return this.app.parisData[arrKey];
        } catch (error) {
            console.error(`❌ Échec chargement à la demande ${arrKey}:`, error);
            throw error;
        }
    }
    
    // === UTILITAIRES DE NOMMAGE ===
    
    getArrondissementFileName(arrKey) {
        const fileMap = {
            '1er': '01-louvre.json',
            '2ème': '02-bourse.json',
            '3ème': '03-haut-marais.json',
            '4ème': '04-marais-ile-st-louis.json',
            '5ème': '05-quartier-latin.json',
            '6ème': '06-saint-germain.json',
            '7ème': '07-invalides-tour-eiffel.json',
            '8ème': '08-champs-elysees.json',
            '9ème': '09-opera-pigalle.json',
            '10ème': '10-canal-saint-martin.json',
            '11ème': '11-bastille-oberkampf.json',
            '12ème': '12-nation-bercy.json',
            '13ème': '13-chinatown-bibliotheque.json',
            '14ème': '14-montparnasse.json',
            '15ème': '15-vaugirard-beaugrenelle.json',
            '16ème': '16-trocadero-passy.json',
            '17ème': '17-batignolles-monceau.json',
            '18ème': '18-montmartre-barbes.json',
            '19ème': '19-buttes-chaumont-villette.json',
            '20ème': '20-belleville-pere-lachaise.json'
        };
        
        return fileMap[arrKey] || `${arrKey.replace(/[^\w]/g, '')}.json`;
    }
    
    // === STATISTIQUES (méthodes existantes conservées) ===
    
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
    
    getTotalPlaces() {
        if (!this.app.isDataLoaded || !this.app.parisData) return 147;
        
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
    
    // === MÉTHODES D'ANALYSE ===
    
    getDataStatistics() {
        const stats = {
            loading: {
                loadedArrondissements: this.loadedArrondissements.size,
                totalArrondissements: 20,
                loadingProgress: Math.round((this.loadedArrondissements.size / 20) * 100)
            },
            cache: this.getCacheStats(),
            data: {
                totalPlaces: this.getTotalPlaces(),
                averagePlacesPerArrondissement: Math.round(this.getTotalPlaces() / this.loadedArrondissements.size),
                categoriesCount: this.getCategoriesCount(),
                tagsCount: this.getTagsCount()
            }
        };
        
        return stats;
    }
    
    getCategoriesCount() {
        const categories = new Set();
        Object.values(this.app.parisData).forEach(arrData => {
            Object.keys(arrData.categories || {}).forEach(catKey => {
                categories.add(catKey);
            });
        });
        return categories.size;
    }
    
    getTagsCount() {
        const tags = new Set();
        Object.values(this.app.parisData).forEach(arrData => {
            Object.values(arrData.categories || {}).forEach(catData => {
                (catData.places || []).forEach(place => {
                    (place.tags || []).forEach(tag => tags.add(tag));
                });
            });
        });
        return tags.size;
    }
}
