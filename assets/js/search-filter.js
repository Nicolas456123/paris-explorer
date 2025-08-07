// ===== SEARCH FILTER - VERSION CORRIGÉE COMPLÈTE =====

class SearchFilter {
    constructor(app) {
        this.app = app;
        this.searchIndex = new Map();
        this.activeFilters = {
            arrondissement: '',
            category: '',
            status: '',
            hideCompleted: false
        };
        this.searchHistory = [];
        this.maxHistorySize = 20;
        this.debounceTimer = null;
        this.isInitialized = false;
    }
    
    // === INITIALISATION ===
    initializeFilters() {
        console.log('🔍 Initialisation du système de recherche et filtres...');
        
        try {
            // Charger l'historique de recherche
            this.loadSearchHistory();
            
            // Créer l'index de recherche
            this.buildSearchIndex();
            
            // Charger les options de filtres
            this.loadFilterOptions();
            
            // Configurer les événements
            this.setupFilterEvents();
            
            this.isInitialized = true;
            console.log('✅ Système de recherche initialisé');
            
        } catch (error) {
            console.error('❌ Erreur initialisation filtres:', error);
        }
    }
    
    // === CONSTRUCTION DE L'INDEX DE RECHERCHE ===
    buildSearchIndex() {
        console.log('📊 Construction de l\'index de recherche...');
        this.searchIndex.clear();
        
        if (!this.app.isDataLoaded || !this.app.parisData) {
            console.warn('⚠️ Pas de données pour construire l\'index');
            return;
        }
        
        let indexedItems = 0;
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            if (!arrData.categories) return;
            
            Object.entries(arrData.categories).forEach(([catKey, catData]) => {
                if (!catData.places || !Array.isArray(catData.places)) return;
                
                catData.places.forEach(place => {
                    const placeId = this.app.dataManager.createPlaceId(arrKey, catKey, place.name);
                    
                    const indexData = {
                        placeId,
                        place,
                        arrKey,
                        catKey,
                        arrData,
                        catData,
                        searchTerms: this.buildSearchTerms(place, arrData, catData),
                        coordinates: this.app.dataManager.getPlaceCoordinates(place, arrKey)
                    };
                    
                    this.searchIndex.set(placeId, indexData);
                    indexedItems++;
                });
            });
        });
        
        console.log(`✅ Index de recherche construit: ${indexedItems} éléments indexés`);
    }
    
    // === CONSTRUCTION DES TERMES DE RECHERCHE ===
    buildSearchTerms(place, arrData, catData) {
        const terms = new Set();
        
        // Nom du lieu
        if (place.name) {
            terms.add(place.name.toLowerCase());
            place.name.toLowerCase().split(/\s+/).forEach(word => {
                if (word.length > 2) terms.add(word);
            });
        }
        
        // Description
        if (place.description) {
            place.description.toLowerCase().split(/\s+/).forEach(word => {
                if (word.length > 2) terms.add(word);
            });
        }
        
        // Adresse
        if (place.address) {
            place.address.toLowerCase().split(/\s+/).forEach(word => {
                if (word.length > 2) terms.add(word);
            });
        }
        
        // Tags
        if (place.tags && Array.isArray(place.tags)) {
            place.tags.forEach(tag => {
                terms.add(tag.toLowerCase());
            });
        }
        
        // Arrondissement
        const arrName = arrData.name || '';
        if (arrName) {
            terms.add(arrName.toLowerCase());
            arrName.toLowerCase().split(/\s+/).forEach(word => {
                if (word.length > 2) terms.add(word);
            });
        }
        
        // Catégorie
        if (catData.title) {
            terms.add(catData.title.toLowerCase());
            catData.title.toLowerCase().split(/\s+/).forEach(word => {
                if (word.length > 2) terms.add(word);
            });
        }
        
        return Array.from(terms);
    }
    
    // === RECHERCHE TEXTUELLE ===
    onSearchInput(query) {
        // Débounce pour éviter trop d'appels
        clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(() => {
            this.processSearchInput(query);
        }, 300);
    }
    
    processSearchInput(query) {
        const trimmedQuery = query.trim();
        this.app.searchQuery = trimmedQuery.toLowerCase();
        
        console.log('🔍 Recherche:', trimmedQuery);
        
        // Ajouter à l'historique si non vide
        if (trimmedQuery.length >= 2) {
            this.addToSearchHistory(trimmedQuery);
            this.showSuggestions(trimmedQuery);
        } else {
            this.hideSuggestions();
        }
        
        // Mettre à jour l'affichage
        this.app.uiManager.renderContent();
        
        // Statistiques de recherche
        if (trimmedQuery) {
            const results = this.performSearch(trimmedQuery, this.activeFilters);
            console.log(`📊 ${results.length} résultats pour "${trimmedQuery}"`);
        }
    }
    
    // === RECHERCHE AVANCÉE ===
    performSearch(query, filters = {}) {
        if (!this.isInitialized) {
            console.warn('⚠️ Système de recherche non initialisé');
            return [];
        }
        
        if (!query && Object.values(filters).every(f => !f)) {
            return this.getAllPlaces();
        }
        
        const results = [];
        const lowerQuery = query.toLowerCase().trim();
        const searchWords = this.extractSearchWords(lowerQuery);
        
        this.searchIndex.forEach((data, placeId) => {
            let score = 0;
            let matches = true;
            
            // Score de pertinence textuelle
            if (lowerQuery) {
                score = this.calculateTextScore(data, lowerQuery, searchWords);
                if (score === 0) matches = false;
            }
            
            // Application des filtres
            if (matches && filters.arrondissement && !this.matchesArrondissementFilter(data, filters.arrondissement)) {
                matches = false;
            }
            
            if (matches && filters.category && !this.matchesCategoryFilter(data, filters.category)) {
                matches = false;
            }
            
            if (matches && filters.status && !this.matchesStatusFilter(data, filters.status)) {
                matches = false;
            }
            
            if (matches && filters.hideCompleted && this.isPlaceVisited(placeId)) {
                matches = false;
            }
            
            if (matches) {
                results.push({
                    ...data,
                    score: score || 1
                });
            }
        });
        
        // Trier par score de pertinence
        results.sort((a, b) => b.score - a.score);
        
        return results.slice(0, this.getMaxResults());
    }
    
    // === CALCUL DU SCORE DE PERTINENCE ===
    calculateTextScore(data, query, searchWords) {
        let score = 0;
        
        // Score pour correspondance exacte du nom
        if (data.place.name.toLowerCase().includes(query)) {
            score += 100;
            
            // Bonus si le nom commence par la requête
            if (data.place.name.toLowerCase().startsWith(query)) {
                score += 50;
            }
        }
        
        // Score pour correspondance dans la description
        if (data.place.description && data.place.description.toLowerCase().includes(query)) {
            score += 30;
        }
        
        // Score pour correspondance dans les tags
        if (data.place.tags) {
            data.place.tags.forEach(tag => {
                if (tag.toLowerCase().includes(query)) {
                    score += 40;
                }
            });
        }
        
        // Score pour correspondance dans l'adresse
        if (data.place.address && data.place.address.toLowerCase().includes(query)) {
            score += 20;
        }
        
        // Score pour mots individuels
        searchWords.forEach(word => {
            if (word.length < 3) return;
            
            data.searchTerms.forEach(term => {
                if (term.includes(word)) {
                    score += 10;
                }
                
                // Bonus pour correspondance exacte de mot
                if (term === word) {
                    score += 20;
                }
            });
        });
        
        // Score arrondissement/catégorie
        const arrName = data.arrData.name || '';
        if (arrName.toLowerCase().includes(query) || 
            data.catData.title.toLowerCase().includes(query)) {
            score += 15;
        }
        
        return score;
    }
    
    // === EXTRACTION DES MOTS DE RECHERCHE ===
    extractSearchWords(query) {
        return query.split(/[\s\-_,.;:!?]+/)
            .map(word => word.trim())
            .filter(word => word.length > 2);
    }
    
    // === FILTRES DE CORRESPONDANCE ===
    matchesArrondissementFilter(data, arrFilter) {
        const arrName = data.arrData.name || '';
        return data.arrKey.includes(arrFilter) || 
               arrName.toLowerCase().includes(arrFilter.toLowerCase());
    }
    
    matchesCategoryFilter(data, catFilter) {
        return data.catKey.toLowerCase().includes(catFilter.toLowerCase()) ||
               data.catData.title.toLowerCase().includes(catFilter.toLowerCase());
    }
    
    matchesStatusFilter(data, statusFilter) {
        const userData = this.app.getCurrentUserData();
        if (!userData) return false;
        
        const isVisited = userData.visitedPlaces instanceof Set ? 
            userData.visitedPlaces.has(data.placeId) : false;
        const isFavorite = userData.favorites.some(fav => fav.placeId === data.placeId);
        
        switch (statusFilter) {
            case 'visited':
                return isVisited;
            case 'not-visited':
                return !isVisited;
            case 'favorites':
                return isFavorite;
            default:
                return true;
        }
    }
    
    isPlaceVisited(placeId) {
        const userData = this.app.getCurrentUserData();
        return userData && userData.visitedPlaces instanceof Set ? 
            userData.visitedPlaces.has(placeId) : false;
    }
    
    // === OBTENIR TOUS LES LIEUX ===
    getAllPlaces() {
        return Array.from(this.searchIndex.values());
    }
    
    // === SUGGESTIONS DE RECHERCHE ===
    getSuggestions(query) {
        if (!query || query.length < 2) return [];
        
        const suggestions = new Set();
        const lowerQuery = query.toLowerCase();
        const maxSuggestions = 8;
        
        // Suggestions depuis l'historique
        this.searchHistory.forEach(historyItem => {
            if (historyItem.toLowerCase().includes(lowerQuery) && historyItem !== query) {
                suggestions.add(historyItem);
            }
        });
        
        // Suggestions depuis les noms de lieux
        this.searchIndex.forEach(data => {
            if (suggestions.size >= maxSuggestions) return;
            
            if (data.place.name.toLowerCase().includes(lowerQuery)) {
                suggestions.add(data.place.name);
            }
            
            // Suggestions depuis tags populaires
            if (data.place.tags) {
                data.place.tags.forEach(tag => {
                    if (suggestions.size < maxSuggestions && 
                        tag.toLowerCase().includes(lowerQuery)) {
                        suggestions.add(tag);
                    }
                });
            }
        });
        
        return Array.from(suggestions).slice(0, maxSuggestions);
    }
    
    showSuggestions(query) {
        const suggestions = this.getSuggestions(query);
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        // Créer ou mettre à jour le conteneur de suggestions
        let suggestionsContainer = document.getElementById('searchSuggestions');
        
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'searchSuggestions';
            suggestionsContainer.className = 'search-suggestions';
            
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer) {
                searchContainer.appendChild(suggestionsContainer);
            }
        }
        
        // Remplir les suggestions
        suggestionsContainer.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-suggestion="${suggestion}" onclick="app.searchFilter.selectSuggestion('${suggestion}')">
                <span class="suggestion-icon">🔍</span>
                <span class="suggestion-text">${suggestion}</span>
                ${this.searchHistory.includes(suggestion) ? '<span class="suggestion-history">📚</span>' : ''}
            </div>
        `).join('');
        
        suggestionsContainer.style.display = 'block';
        
        // Gestion du clavier pour navigation
        this.setupSuggestionNavigation(suggestions);
    }
    
    hideSuggestions() {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }
    
    selectSuggestion(suggestion) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = suggestion;
            this.processSearchInput(suggestion);
        }
        this.hideSuggestions();
    }
    
    // === NAVIGATION CLAVIER DANS LES SUGGESTIONS ===
    setupSuggestionNavigation(suggestions) {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        let selectedIndex = -1;
        
        const keyHandler = (e) => {
            const suggestionItems = document.querySelectorAll('.suggestion-item');
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, suggestionItems.length - 1);
                    this.highlightSuggestion(selectedIndex);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    this.highlightSuggestion(selectedIndex);
                    break;
                    
                case 'Enter':
                    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                        e.preventDefault();
                        this.selectSuggestion(suggestions[selectedIndex]);
                        searchInput.removeEventListener('keydown', keyHandler);
                    }
                    break;
                    
                case 'Escape':
                    this.hideSuggestions();
                    searchInput.removeEventListener('keydown', keyHandler);
                    break;
            }
        };
        
        searchInput.addEventListener('keydown', keyHandler);
        
        // Nettoyer l'event listener après un délai
        setTimeout(() => {
            searchInput.removeEventListener('keydown', keyHandler);
        }, 30000);
    }
    
    highlightSuggestion(index) {
        const suggestionItems = document.querySelectorAll('.suggestion-item');
        
        suggestionItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        });
    }
    
    // === GESTION DE L'HISTORIQUE DE RECHERCHE ===
    addToSearchHistory(query) {
        if (!query || query.length < 2) return;
        
        // Retirer si déjà présent
        const existingIndex = this.searchHistory.indexOf(query);
        if (existingIndex >= 0) {
            this.searchHistory.splice(existingIndex, 1);
        }
        
        // Ajouter en tête
        this.searchHistory.unshift(query);
        
        // Limiter la taille
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
        
        this.saveSearchHistory();
    }
    
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('paris-explorer-search-history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('⚠️ Erreur chargement historique recherche:', error);
            this.searchHistory = [];
        }
    }
    
    saveSearchHistory() {
        try {
            localStorage.setItem('paris-explorer-search-history', 
                JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('⚠️ Erreur sauvegarde historique recherche:', error);
        }
    }
    
    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        this.app.showNotification('Historique de recherche effacé', 'info');
    }
    
    // === CHARGEMENT DES OPTIONS DE FILTRES ===
    loadFilterOptions() {
        console.log('⚙️ Chargement des options de filtres...');
        
        this.loadArrondissementFilter();
        this.loadCategoryFilter();
        this.loadStatusFilter();
        
        console.log('✅ Options de filtres chargées');
    }
    
    loadArrondissementFilter() {
        const select = document.getElementById('arrondissementFilter');
        if (!select) return;
        
        select.innerHTML = '<option value="">Tous les arrondissements</option>';
        
        if (this.app.isDataLoaded && this.app.parisData) {
            Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
                const option = document.createElement('option');
                option.value = arrKey;
                
                // Le nom est dans arrondissement.name
                const name = arrData.name || arrKey;
                const displayName = name.replace(/^\d+[ER|ÈME]+ ARRONDISSEMENT - /, '');
                option.textContent = `${arrKey} - ${displayName}`;
                select.appendChild(option);
            });
        }
        
        console.log('📍 Options d\'arrondissement chargées');
    }
    
    loadCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        if (!select) return;
        
        select.innerHTML = '<option value="">Toutes les catégories</option>';
        
        if (this.app.isDataLoaded && this.app.parisData) {
            const categories = new Set();
            
            Object.values(this.app.parisData).forEach(arrData => {
                Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                    categories.add({
                        key: catKey,
                        title: catData.title
                    });
                });
            });
            
            // Convertir en array et trier
            const sortedCategories = Array.from(categories)
                .sort((a, b) => a.title.localeCompare(b.title));
            
            sortedCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.key;
                option.textContent = cat.title;
                select.appendChild(option);
            });
        }
        
        console.log('🏷️ Options de catégorie chargées');
    }
    
    loadStatusFilter() {
        const select = document.getElementById('statusFilter');
        if (!select) return;
        
        select.innerHTML = `
            <option value="">Tous les statuts</option>
            <option value="visited">✅ Visités</option>
            <option value="not-visited">⭕ Non visités</option>
            <option value="favorites">⭐ Favoris</option>
        `;
        
        console.log('📊 Options de statut chargées');
    }
    
    // === CONFIGURATION DES ÉVÉNEMENTS ===
    setupFilterEvents() {
        console.log('⚙️ Configuration des événements de filtrage...');
        
        // Événements sur les filtres
        ['arrondissementFilter', 'categoryFilter', 'statusFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.applyFilters();
                });
            }
        });
        
        // Événement sur le checkbox "masquer complétés"
        const hideCompletedFilter = document.getElementById('hideCompletedFilter');
        if (hideCompletedFilter) {
            hideCompletedFilter.addEventListener('change', (e) => {
                this.activeFilters.hideCompleted = e.target.checked;
                this.app.uiManager.renderContent();
            });
        }
        
        console.log('✅ Événements de filtrage configurés');
    }
    
    // === APPLICATION DES FILTRES ===
    applyFilters() {
        console.log('🔍 Application des filtres...');
        
        // Récupérer les valeurs des filtres
        this.activeFilters.arrondissement = document.getElementById('arrondissementFilter')?.value || '';
        this.activeFilters.category = document.getElementById('categoryFilter')?.value || '';
        this.activeFilters.status = document.getElementById('statusFilter')?.value || '';
        
        // Log des filtres actifs
        const activeFilters = Object.entries(this.activeFilters)
            .filter(([key, value]) => value)
            .map(([key, value]) => `${key}: ${value}`);
        
        if (activeFilters.length > 0) {
            console.log('📊 Filtres actifs:', activeFilters.join(', '));
        }
        
        // Mettre à jour l'affichage
        this.app.uiManager.renderContent();
        
        // Statistiques de filtrage
        const results = this.performSearch(this.app.searchQuery, this.activeFilters);
        console.log(`📊 ${results.length} résultats après filtrage`);
    }
    
    // === FILTRES RAPIDES ===
    filterByArrondissement(arrKey) {
        const arrFilter = document.getElementById('arrondissementFilter');
        if (arrFilter) {
            arrFilter.value = arrKey;
            this.applyFilters();
        }
    }
    
    filterByCategory(catKey) {
        const catFilter = document.getElementById('categoryFilter');
        if (catFilter) {
            catFilter.value = catKey;
            this.applyFilters();
        }
    }
    
    filterByStatus(status) {
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.value = status;
            this.applyFilters();
        }
    }
    
    // === RECHERCHE GÉOGRAPHIQUE ===
    searchNearby(latitude, longitude, radius = 1000) {
        console.log(`🌍 Recherche géographique: ${latitude}, ${longitude} (rayon: ${radius}m)`);
        
        const results = [];
        
        this.searchIndex.forEach((data, placeId) => {
            if (data.coordinates) {
                const distance = this.calculateDistance(
                    latitude, longitude,
                    data.coordinates[0], data.coordinates[1]
                );
                
                if (distance <= radius) {
                    results.push({
                        ...data,
                        distance: Math.round(distance)
                    });
                }
            }
        });
        
        // Trier par distance
        results.sort((a, b) => a.distance - b.distance);
        
        console.log(`📍 ${results.length} résultats trouvés dans un rayon de ${radius}m`);
        return results;
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Rayon de la Terre en mètres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }
    
    // === RECHERCHE AVANCÉE PAR TAGS ===
    searchByTags(tags) {
        if (!Array.isArray(tags) || tags.length === 0) return [];
        
        const results = [];
        const lowerTags = tags.map(tag => tag.toLowerCase());
        
        this.searchIndex.forEach((data, placeId) => {
            if (data.place.tags) {
                const placeTags = data.place.tags.map(tag => tag.toLowerCase());
                const matches = lowerTags.filter(tag => placeTags.includes(tag));
                
                if (matches.length > 0) {
                    results.push({
                        ...data,
                        matchingTags: matches,
                        score: matches.length * 10
                    });
                }
            }
        });
        
        // Trier par score (nombre de tags correspondants)
        results.sort((a, b) => b.score - a.score);
        
        console.log(`🏷️ ${results.length} résultats trouvés pour les tags:`, tags);
        return results;
    }
    
    // === ANALYSE ET STATISTIQUES ===
    getSearchStatistics() {
        return {
            totalIndexedItems: this.searchIndex.size,
            searchHistorySize: this.searchHistory.length,
            activeFilters: Object.entries(this.activeFilters)
                .filter(([key, value]) => value)
                .reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {}),
            isInitialized: this.isInitialized
        };
    }
    
    // === NETTOYAGE ET RESET ===
    clearAllFilters() {
        console.log('🧹 Effacement de tous les filtres...');
        
        // Réinitialiser les filtres actifs
        this.activeFilters = {
            arrondissement: '',
            category: '',
            status: '',
            hideCompleted: false
        };
        
        // Réinitialiser les éléments DOM
        const elements = [
            'arrondissementFilter',
            'categoryFilter', 
            'statusFilter',
            'searchInput'
        ];
        
        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.value = '';
            }
        });
        
        const hideCompleted = document.getElementById('hideCompletedFilter');
        if (hideCompleted) {
            hideCompleted.checked = false;
        }
        
        // Effacer la recherche
        this.app.searchQuery = '';
        
        // Masquer les suggestions
        this.hideSuggestions();
        
        // Mettre à jour l'affichage
        this.app.uiManager.renderContent();
        
        console.log('✅ Tous les filtres effacés');
    }
    
    // === RÉINITIALISATION ===
    reset() {
        console.log('🔄 Réinitialisation du système de recherche...');
        
        this.clearAllFilters();
        this.searchIndex.clear();
        this.searchHistory = [];
        this.activeFilters = {
            arrondissement: '',
            category: '',
            status: '',
            hideCompleted: false
        };
        this.isInitialized = false;
        
        // Nettoyer le localStorage
        localStorage.removeItem('paris-explorer-search-history');
        
        console.log('✅ Système de recherche réinitialisé');
    }
    
    // === UTILITAIRES ===
    getMaxResults() {
        return this.app.config?.features?.search?.maxResults || 500;
    }
    
    isSearchEnabled() {
        return this.app.config?.features?.search?.enabled !== false;
    }
    
    isFuzzySearchEnabled() {
        return this.app.config?.features?.search?.fuzzySearch !== false;
    }
    
    // === MISE À JOUR DE L'INDEX ===
    updateIndex() {
        if (this.app.isDataLoaded) {
            console.log('🔄 Mise à jour de l\'index de recherche...');
            this.buildSearchIndex();
            this.loadFilterOptions();
        }
    }
    
    // === EXPORT/IMPORT DE L'HISTORIQUE ===
    exportSearchHistory() {
        return {
            history: this.searchHistory,
            exportedAt: new Date().toISOString(),
            version: '2.0.0'
        };
    }
    
    importSearchHistory(data) {
        if (data && Array.isArray(data.history)) {
            this.searchHistory = data.history.slice(0, this.maxHistorySize);
            this.saveSearchHistory();
            console.log('📥 Historique de recherche importé');
            return true;
        }
        return false;
    }
}
