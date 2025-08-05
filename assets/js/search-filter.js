// ===== SEARCH-FILTER - SYSTÈME DE RECHERCHE ET FILTRES AVANCÉS =====

class SearchFilterManager {
    constructor(app) {
        this.app = app;
        this.searchIndex = new Map();
        this.activeFilters = {
            arrondissement: '',
            category: '',
            status: '',
            tags: [],
            rating: null,
            distance: null
        };
        this.searchHistory = [];
        this.maxHistorySize = 50;
        this.searchCache = new Map();
        
        this.initializeSearch();
    }
    
    // === INITIALISATION ===
    
    initializeSearch() {
        this.loadSearchHistory();
        this.setupSearchEventListeners();
        this.setupFilterEventListeners();
    }
    
    setupSearchEventListeners() {
        const searchInput = Utils.DOM.$('#searchInput');
        if (searchInput) {
            // Recherche avec debounce pour les performances
            const debouncedSearch = Utils.Performance.debounce((query) => {
                this.performSearch(query);
            }, 300);
            
            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
            
            // Raccourcis clavier
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                } else if (e.key === 'Enter') {
                    this.addToSearchHistory(e.target.value);
                }
            });
        }
    }
    
    setupFilterEventListeners() {
        const arrFilter = Utils.DOM.$('#arrondissementFilter');
        const catFilter = Utils.DOM.$('#categoryFilter');
        const statusFilter = Utils.DOM.$('#statusFilter');
        
        [arrFilter, catFilter, statusFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => {
                    this.updateFilters();
                    this.applyFilters();
                });
            }
        });
    }
    
    // === CONSTRUCTION DE L'INDEX DE RECHERCHE ===
    
    buildSearchIndex() {
        console.log('🔍 Construction de l\'index de recherche...');
        this.searchIndex.clear();
        
        if (!this.app.isDataLoaded) {
            return;
        }
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                (catData.places || []).forEach(place => {
                    const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                    
                    // Créer l'entrée d'index
                    const indexEntry = {
                        id: placeId,
                        arrondissement: arrKey,
                        arrondissementTitle: arrData.title,
                        category: catKey,
                        categoryTitle: catData.title,
                        name: place.name,
                        description: place.description || '',
                        address: place.address || '',
                        tags: place.tags || [],
                        searchText: this.createSearchText(place, arrData.title, catData.title),
                        keywords: Utils.Text.extractKeywords(
                            `${place.name} ${place.description} ${(place.tags || []).join(' ')}`
                        )
                    };
                    
                    this.searchIndex.set(placeId, indexEntry);
                });
            });
        });
        
        console.log(`✅ Index construit avec ${this.searchIndex.size} lieux`);
    }
    
    createSearchText(place, arrTitle, catTitle) {
        return [
            place.name,
            place.description,
            place.address,
            arrTitle,
            catTitle,
            ...(place.tags || [])
        ].filter(Boolean).join(' ').toLowerCase();
    }
    
    // === RECHERCHE PRINCIPALE ===
    
    performSearch(query) {
        const trimmedQuery = query.trim();
        
        if (trimmedQuery.length === 0) {
            this.clearSearchResults();
            return;
        }
        
        // Vérifier le cache
        const cacheKey = this.getCacheKey(trimmedQuery);
        if (this.searchCache.has(cacheKey)) {
            const cachedResults = this.searchCache.get(cacheKey);
            this.displaySearchResults(cachedResults, trimmedQuery);
            return;
        }
        
        console.log(`🔍 Recherche: "${trimmedQuery}"`);
        
        const startTime = performance.now();
        const results = this.searchInIndex(trimmedQuery);
        const endTime = performance.now();
        
        console.log(`⏱️ Recherche terminée en ${(endTime - startTime).toFixed(2)}ms - ${results.length} résultats`);
        
        // Mettre en cache
        this.searchCache.set(cacheKey, results);
        
        // Limiter la taille du cache
        if (this.searchCache.size > 100) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
        
        this.displaySearchResults(results, trimmedQuery);
    }
    
    searchInIndex(query) {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);
        const results = [];
        
        this.searchIndex.forEach((entry, placeId) => {
            const score = this.calculateSearchScore(entry, queryLower, queryWords);
            
            if (score > 0) {
                results.push({
                    ...entry,
                    score,
                    matchType: this.getMatchType(entry, queryLower)
                });
            }
        });
        
        // Trier par score décroissant
        return results.sort((a, b) => b.score - a.score);
    }
    
    calculateSearchScore(entry, query, queryWords) {
        let score = 0;
        const searchText = entry.searchText;
        
        // Score pour correspondance exacte du nom
        if (entry.name.toLowerCase().includes(query)) {
            score += 100;
            
            // Bonus si c'est le début du nom
            if (entry.name.toLowerCase().startsWith(query)) {
                score += 50;
            }
        }
        
        // Score pour mots-clés individuels
        queryWords.forEach(word => {
            if (searchText.includes(word)) {
                score += 20;
                
                // Bonus pour les tags
                if (entry.tags.some(tag => tag.toLowerCase().includes(word))) {
                    score += 10;
                }
                
                // Bonus pour l'adresse
                if (entry.address.toLowerCase().includes(word)) {
                    score += 15;
                }
                
                // Bonus pour la description
                if (entry.description.toLowerCase().includes(word)) {
                    score += 5;
                }
            }
        });
        
        // Score pour correspondance floue
        const fuzzyScore = this.calculateFuzzyScore(entry.name.toLowerCase(), query);
        if (fuzzyScore > 0.7) {
            score += Math.floor(fuzzyScore * 30);
        }
        
        return score;
    }
    
    calculateFuzzyScore(text, query) {
        if (text === query) return 1;
        if (query.length === 0) return 0;
        
        let matches = 0;
        let queryIndex = 0;
        
        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                matches++;
                queryIndex++;
            }
        }
        
        return matches / query.length;
    }
    
    getMatchType(entry, query) {
        if (entry.name.toLowerCase() === query) return 'exact';
        if (entry.name.toLowerCase().startsWith(query)) return 'prefix';
        if (entry.name.toLowerCase().includes(query)) return 'contains';
        if (entry.tags.some(tag => tag.toLowerCase().includes(query))) return 'tag';
        if (entry.address.toLowerCase().includes(query)) return 'address';
        return 'fuzzy';
    }
    
    // === FILTRES ===
    
    updateFilters() {
        const arrFilter = Utils.DOM.$('#arrondissementFilter');
        const catFilter = Utils.DOM.$('#categoryFilter');
        const statusFilter = Utils.DOM.$('#statusFilter');
        
        this.activeFilters = {
            arrondissement: arrFilter ? arrFilter.value : '',
            category: catFilter ? catFilter.value : '',
            status: statusFilter ? statusFilter.value : '',
            tags: [],
            rating: null,
            distance: null
        };
        
        console.log('🔧 Filtres mis à jour:', this.activeFilters);
    }
    
    applyFilters() {
        if (!this.app.isDataLoaded) return;
        
        const filteredResults = this.filterSearchResults();
        this.app.uiManager.renderContent();
        
        // Mettre à jour les stats des filtres
        this.updateFilterStats(filteredResults);
    }
    
    filterSearchResults() {
        const results = [];
        
        this.searchIndex.forEach((entry) => {
            if (this.passesFilters(entry)) {
                results.push(entry);
            }
        });
        
        return results;
    }
    
    passesFilters(entry) {
        // Filtre arrondissement
        if (this.activeFilters.arrondissement && 
            entry.arrondissement !== this.activeFilters.arrondissement) {
            return false;
        }
        
        // Filtre catégorie
        if (this.activeFilters.category && 
            entry.category !== this.activeFilters.category) {
            return false;
        }
        
        // Filtre statut
        if (this.activeFilters.status) {
            const userData = this.app.getCurrentUserData();
            const isVisited = userData && userData.visitedPlaces.has(entry.id);
            
            switch (this.activeFilters.status) {
                case 'visited':
                    if (!isVisited) return false;
                    break;
                case 'unvisited':
                    if (isVisited) return false;
                    break;
                case 'favorites':
                    if (!userData || !userData.favorites || !userData.favorites.has(entry.id)) {
                        return false;
                    }
                    break;
            }
        }
        
        // Filtre tags
        if (this.activeFilters.tags.length > 0) {
            const hasMatchingTag = this.activeFilters.tags.some(tag => 
                entry.tags.some(entryTag => 
                    entryTag.toLowerCase().includes(tag.toLowerCase())
                )
            );
            if (!hasMatchingTag) return false;
        }
        
        return true;
    }
    
    // === SUGGESTIONS DE RECHERCHE ===
    
    generateSearchSuggestions(query) {
        if (!query || query.length < 2) {
            return this.getPopularSearches();
        }
        
        const suggestions = [];
        const queryLower = query.toLowerCase();
        
        // Suggestions basées sur les noms de lieux
        this.searchIndex.forEach((entry) => {
            if (entry.name.toLowerCase().startsWith(queryLower)) {
                suggestions.push({
                    text: entry.name,
                    type: 'place',
                    category: entry.categoryTitle,
                    arrondissement: entry.arrondissementTitle
                });
            }
        });
        
        // Suggestions basées sur les catégories
        const categories = this.getUniqueCategories();
        categories.forEach(cat => {
            if (cat.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    text: cat,
                    type: 'category'
                });
            }
        });
        
        // Suggestions basées sur les arrondissements
        const arrondissements = this.getUniqueArrondissements();
        arrondissements.forEach(arr => {
            if (arr.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    text: arr,
                    type: 'arrondissement'
                });
            }
        });
        
        // Limiter et trier
        return suggestions
            .slice(0, 10)
            .sort((a, b) => a.text.localeCompare(b.text));
    }
    
    getPopularSearches() {
        return this.searchHistory
            .slice(-10)
            .reverse()
            .map(query => ({
                text: query,
                type: 'history'
            }));
    }
    
    // === EXPORT DE FILTRES ===
    
    exportFilteredResults(format = 'json') {
        const filteredResults = this.filterSearchResults();
        const userData = this.app.getCurrentUserData();
        
        const exportData = {
            metadata: {
                exportDate: Utils.Date.now(),
                filters: this.activeFilters,
                totalResults: filteredResults.length,
                user: userData ? userData.name : 'Anonymous'
            },
            results: filteredResults.map(entry => ({
                ...entry,
                isVisited: userData ? userData.visitedPlaces.has(entry.id) : false,
                isFavorite: userData && userData.favorites ? userData.favorites.has(entry.id) : false
            }))
        };
        
        const filename = `paris-explorer-filtered-${new Date().toISOString().split('T')[0]}.${format}`;
        
        if (format === 'json') {
            const jsonString = JSON.stringify(exportData, null, 2);
            this.downloadFile(jsonString, filename, 'application/json');
        } else if (format === 'csv') {
            const csvData = this.resultsToCSV(exportData.results);
            this.downloadFile(csvData, filename, 'text/csv');
        }
        
        this.app.showNotification(`Export filtré téléchargé : ${filename}`, 'success');
    }
    
    resultsToCSV(results) {
        const headers = [
            'Nom',
            'Arrondissement',
            'Catégorie',
            'Description',
            'Adresse',
            'Tags',
            'Visité',
            'Favori'
        ];
        
        const rows = [headers.join(',')];
        
        results.forEach(entry => {
            const row = [
                `"${entry.name}"`,
                `"${entry.arrondissementTitle}"`,
                `"${entry.categoryTitle}"`,
                `"${(entry.description || '').replace(/"/g, '""')}"`,
                `"${entry.address}"`,
                `"${entry.tags.join(', ')}"`,
                entry.isVisited ? 'Oui' : 'Non',
                entry.isFavorite ? 'Oui' : 'Non'
            ];
            
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }
    
    // === STATISTIQUES DE RECHERCHE ===
    
    getSearchStatistics() {
        const stats = {
            totalPlaces: this.searchIndex.size,
            searchHistory: this.searchHistory.length,
            cacheSize: this.searchCache.size,
            activeFilters: Object.values(this.activeFilters).filter(Boolean).length,
            popularQueries: this.getPopularQueries(),
            categoryCounts: this.getCategoryCounts(),
            arrondissementCounts: this.getArrondissementCounts()
        };
        
        return stats;
    }
    
    getPopularQueries() {
        const queryCounts = {};
        
        this.searchHistory.forEach(query => {
            queryCounts[query] = (queryCounts[query] || 0) + 1;
        });
        
        return Object.entries(queryCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([query, count]) => ({ query, count }));
    }
    
    getCategoryCounts() {
        const counts = {};
        
        this.searchIndex.forEach(entry => {
            counts[entry.category] = (counts[entry.category] || 0) + 1;
        });
        
        return counts;
    }
    
    getArrondissementCounts() {
        const counts = {};
        
        this.searchIndex.forEach(entry => {
            counts[entry.arrondissement] = (counts[entry.arrondissement] || 0) + 1;
        });
        
        return counts;
    }
    
    // === UTILITAIRES ===
    
    getCacheKey(query) {
        return `${query}-${JSON.stringify(this.activeFilters)}`;
    }
    
    clearSearch() {
        const searchInput = Utils.DOM.$('#searchInput');
        if (searchInput) {
            searchInput.value = '';
            this.clearSearchResults();
        }
    }
    
    clearSearchResults() {
        this.app.searchQuery = '';
        this.app.uiManager.renderContent();
    }
    
    displaySearchResults(results, query) {
        this.app.searchQuery = query;
        console.log(`🎯 Affichage de ${results.length} résultats pour "${query}"`);
        this.app.uiManager.renderContent();
    }
    
    addToSearchHistory(query) {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length < 2) return;
        
        // Supprimer les doublons
        this.searchHistory = this.searchHistory.filter(q => q !== trimmedQuery);
        
        // Ajouter en tête
        this.searchHistory.unshift(trimmedQuery);
        
        // Limiter la taille
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
        
        this.saveSearchHistory();
    }
    
    loadSearchHistory() {
        this.searchHistory = Utils.Storage.load('search-history', []);
    }
    
    saveSearchHistory() {
        Utils.Storage.save('search-history', this.searchHistory);
    }
    
    getUniqueCategories() {
        const categories = new Set();
        this.searchIndex.forEach(entry => categories.add(entry.categoryTitle));
        return Array.from(categories).sort();
    }
    
    getUniqueArrondissements() {
        const arrondissements = new Set();
        this.searchIndex.forEach(entry => arrondissements.add(entry.arrondissementTitle));
        return Array.from(arrondissements).sort();
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    // === MISE À JOUR DES FILTRES DANS L'UI ===
    
    populateFilterDropdowns() {
        this.populateArrondissementFilter();
        this.populateCategoryFilter();
    }
    
    populateArrondissementFilter() {
        const select = Utils.DOM.$('#arrondissementFilter');
        if (!select) return;
        
        const arrondissements = this.getUniqueArrondissements();
        
        // Vider les options existantes (sauf la première)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        arrondissements.forEach(arr => {
            const option = document.createElement('option');
            option.value = this.getArrondissementKey(arr);
            option.textContent = arr;
            select.appendChild(option);
        });
    }
    
    populateCategoryFilter() {
        const select = Utils.DOM.$('#categoryFilter');
        if (!select) return;
        
        const categories = this.getUniqueCategories();
        
        // Vider les options existantes (sauf la première)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = this.getCategoryKey(cat);
            option.textContent = cat;
            select.appendChild(option);
        });
    }
    
    getArrondissementKey(title) {
        // Extraire la clé à partir du titre (ex: "1er" depuis "1ER ARRONDISSEMENT - LE LOUVRE")
        const match = title.match(/^(\d+(?:er|ème)?)/i);
        return match ? match[1].toLowerCase() : '';
    }
    
    getCategoryKey(title) {
        // Simplifier le titre pour obtenir une clé
        return Utils.Text.createId(title.replace(/[🏛️🍽️☕🍻🛍️🎨🌳⛪🏨🎭📍]/g, '').trim());
    }
    
    updateFilterStats(filteredResults) {
        // Mettre à jour les compteurs dans l'interface si nécessaire
        const totalVisible = filteredResults.length;
        console.log(`📊 ${totalVisible} lieux visibles après filtrage`);
    }
}
