// ===== SEARCH & FILTER MANAGER - RECHERCHE ET FILTRES AVANCÉS =====

class SearchFilter {
    constructor(app) {
        this.app = app;
        this.searchQuery = '';
        this.activeFilters = {
            arrondissement: '',
            category: '',
            status: '',
            type: '',
            budget: '',
            rating: ''
        };
        this.searchHistory = [];
        this.searchSuggestions = [];
        this.debounceTimer = null;
        
        this.init();
    }
    
    // === INITIALISATION ===
    init() {
        this.loadSearchHistory();
        this.buildSearchIndex();
        this.setupEventListeners();
        this.loadFilterOptions();
    }
    
    // === INDEX DE RECHERCHE ===
    buildSearchIndex() {
        this.searchIndex = new Map();
        
        if (!this.app.isDataLoaded) return;
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                (catData.places || []).forEach(place => {
                    const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                    
                    // Créer l'index de recherche
                    const searchableText = [
                        place.name,
                        place.description || '',
                        place.address || '',
                        arrData.title,
                        catData.title,
                        ...(place.tags || [])
                    ].join(' ').toLowerCase();
                    
                    this.searchIndex.set(placeId, {
                        place,
                        arrKey,
                        catKey,
                        arrData,
                        catData,
                        searchableText,
                        keywords: this.extractKeywords(searchableText)
                    });
                });
            });
        });
        
        console.log(`🔍 Index de recherche créé: ${this.searchIndex.size} lieux indexés`);
    }
    
    extractKeywords(text) {
        // Extraire les mots-clés significatifs
        const stopWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'à', 'dans', 'sur', 'avec', 'pour', 'par', 'un', 'une'];
        
        return text
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .map(word => word.replace(/[^\w]/g, ''))
            .filter(word => word.length > 2);
    }
    
    // === RECHERCHE AVANCÉE ===
    performSearch(query, filters = {}) {
        if (!query && Object.values(filters).every(f => !f)) {
            return this.getAllPlaces();
        }
        
        const results = [];
        const lowerQuery = query.toLowerCase().trim();
        
        this.searchIndex.forEach((data, placeId) => {
            let score = 0;
            let matches = true;
            
            // Score de pertinence textuelle
            if (lowerQuery) {
                score += this.calculateTextScore(data, lowerQuery);
                if (score === 0) matches = false;
            }
            
            // Filtres
            if (matches && filters.arrondissement && !data.arrKey.includes(filters.arrondissement)) {
                matches = false;
            }
            
            if (matches && filters.category && !data.catKey.toLowerCase().includes(filters.category.toLowerCase())) {
                matches = false;
            }
            
            if (matches && filters.status) {
                const userData = this.app.getCurrentUserData();
                const isVisited = userData && userData.visitedPlaces instanceof Set ? 
                    userData.visitedPlaces.has(placeId) : false;
                
                if (filters.status === 'visited' && !isVisited) matches = false;
                if (filters.status === 'not-visited' && isVisited) matches = false;
                if (filters.status === 'favorites' && 
                    (!userData || !userData.favorites || !userData.favorites.has(placeId))) {
                    matches = false;
                }
            }
            
            if (matches) {
                results.push({
                    placeId,
                    score,
                    ...data
                });
            }
        });
        
        // Trier par score de pertinence
        return results.sort((a, b) => b.score - a.score);
    }
    
    calculateTextScore(data, query) {
        let score = 0;
        const queryWords = query.split(' ').filter(w => w.length > 1);
        
        queryWords.forEach(word => {
            // Score exact nom du lieu
            if (data.place.name.toLowerCase().includes(word)) {
                score += 10;
            }
            
            // Score description
            if (data.place.description && data.place.description.toLowerCase().includes(word)) {
                score += 6;
            }
            
            // Score tags
            if (data.place.tags && data.place.tags.some(tag => tag.toLowerCase().includes(word))) {
                score += 8;
            }
            
            // Score arrondissement/catégorie
            if (data.arrData.title.toLowerCase().includes(word) || 
                data.catData.title.toLowerCase().includes(word)) {
                score += 4;
            }
        });
        
        return score;
    }
    
    // === SUGGESTIONS DE RECHERCHE ===
    getSuggestions(query) {
        if (!query || query.length < 2) return [];
        
        const suggestions = new Set();
        const lowerQuery = query.toLowerCase();
        
        this.searchIndex.forEach((data) => {
            // Suggestions depuis noms de lieux
            if (data.place.name.toLowerCase().includes(lowerQuery)) {
                suggestions.add(data.place.name);
            }
            
            // Suggestions depuis tags
            if (data.place.tags) {
                data.place.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(lowerQuery)) {
                        suggestions.add(tag);
                    }
                });
            }
            
            // Suggestions depuis arrondissements
            if (data.arrData.title.toLowerCase().includes(lowerQuery)) {
                suggestions.add(data.arrData.title);
            }
        });
        
        return Array.from(suggestions).slice(0, 8);
    }
    
    // === FILTRES AVANCÉS ===
    loadFilterOptions() {
        this.loadArrondissementFilter();
        this.loadCategoryFilter();
    }
    
    loadArrondissementFilter() {
        const select = document.getElementById('arrondissementFilter');
        if (!select) return;
        
        select.innerHTML = '<option value="">📍 Tous les arrondissements</option>';
        
        if (this.app.isDataLoaded) {
            Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
                const option = document.createElement('option');
                option.value = arrKey;
                option.textContent = arrData.title;
                select.appendChild(option);
            });
        }
    }
    
    loadCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        if (!select) return;
        
        select.innerHTML = '<option value="">🎯 Toutes les catégories</option>';
        
        if (this.app.isDataLoaded) {
            const categories = new Set();
            
            Object.values(this.app.parisData).forEach(arrData => {
                Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                    categories.add(JSON.stringify({ key: catKey, title: catData.title }));
                });
            });
            
            Array.from(categories)
                .map(cat => JSON.parse(cat))
                .sort((a, b) => a.title.localeCompare(b.title))
                .forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.key;
                    option.textContent = cat.title;
                    select.appendChild(option);
                });
        }
    }
    
    // === GESTION DES ÉVÉNEMENTS ===
    setupEventListeners() {
        // Recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.onSearchInput(e.target.value);
                }, this.app.config.performance.debounceDelay);
            });
        }
        
        // Filtres
        ['arrondissementFilter', 'categoryFilter', 'statusFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.applyFilters();
                });
            }
        });
        
        // Reset filtres
        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
    }
    
    onSearchInput(query) {
        this.searchQuery = query;
        this.app.searchQuery = query.toLowerCase().trim();
        
        // Afficher suggestions
        if (query.length >= 2) {
            this.showSuggestions(query);
        } else {
            this.hideSuggestions();
        }
        
        // Appliquer la recherche
        this.app.uiManager.renderContent();
    }
    
    applyFilters() {
        // Récupérer les valeurs des filtres
        this.activeFilters.arrondissement = document.getElementById('arrondissementFilter')?.value || '';
        this.activeFilters.category = document.getElementById('categoryFilter')?.value || '';
        this.activeFilters.status = document.getElementById('statusFilter')?.value || '';
        
        // Copier vers l'app
        this.app.activeFilters = { ...this.activeFilters };
        
        // Appliquer les filtres
        this.app.uiManager.renderContent();
    }
    
    resetFilters() {
        // Reset champs de formulaire
        document.getElementById('searchInput').value = '';
        document.getElementById('arrondissementFilter').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('statusFilter').value = '';
        
        // Reset états internes
        this.searchQuery = '';
        this.activeFilters = {
            arrondissement: '',
            category: '',
            status: '',
            type: '',
            budget: '',
            rating: ''
        };
        
        this.app.searchQuery = '';
        this.app.activeFilters = { ...this.activeFilters };
        
        // Re-render
        this.hideSuggestions();
        this.app.uiManager.renderContent();
    }
    
    showSuggestions(query) {
        const suggestions = this.getSuggestions(query);
        const container = document.getElementById('searchSuggestions');
        
        if (!container || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        container.innerHTML = suggestions.map(suggestion => 
            `<div class="suggestion-item" onclick="document.getElementById('searchInput').value='${suggestion}'; this.parentElement.parentElement.querySelector('#searchInput').dispatchEvent(new Event('input'));">${suggestion}</div>`
        ).join('');
        
        container.style.display = 'block';
    }
    
    hideSuggestions() {
        const container = document.getElementById('searchSuggestions');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    getAllPlaces() {
        const results = [];
        
        this.searchIndex.forEach((data, placeId) => {
            results.push({
                placeId,
                score: 1,
                ...data
            });
        });
        
        return results;
    }
    
    // === HISTORIQUE DE RECHERCHE ===
    loadSearchHistory() {
        try {
            const stored = localStorage.getItem('paris-explorer-search-history');
            this.searchHistory = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Erreur chargement historique recherche:', error);
            this.searchHistory = [];
        }
    }
    
    saveSearchHistory() {
        try {
            localStorage.setItem('paris-explorer-search-history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Erreur sauvegarde historique recherche:', error);
        }
    }
    
    addToSearchHistory(query) {
        if (!query || query.length < 2) return;
        
        // Supprimer les doublons
        this.searchHistory = this.searchHistory.filter(item => item !== query);
        
        // Ajouter en début de liste
        this.searchHistory.unshift(query);
        
        // Limiter l'historique
        if (this.searchHistory.length > 10) {
            this.searchHistory = this.searchHistory.slice(0, 10);
        }
        
        this.saveSearchHistory();
    }
    
    initializeFilters() {
        // Méthode appelée par app.js au démarrage
        if (this.app.isDataLoaded) {
            this.buildSearchIndex();
            this.loadFilterOptions();
        }
    }
}
