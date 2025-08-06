// ===== SEARCH FILTER - VERSION SIMPLIFIÉE =====

class SearchFilter {
    constructor(app) {
        this.app = app;
        this.searchQuery = '';
        this.activeFilters = {
            arrondissement: '',
            category: '',
            status: ''
        };
        console.log('🔍 SearchFilter initialisé');
    }
    
    // === INITIALISATION ===
    initializeFilters() {
        if (!this.app.isDataLoaded) {
            console.log('⏳ Données non chargées, filtres en attente');
            return;
        }
        
        this.setupEventListeners();
        this.loadFilterOptions();
        console.log('✅ Filtres initialisés');
    }
    
    // === ÉVÉNEMENTS ===
    setupEventListeners() {
        // Recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.onSearchInput(e.target.value);
            });
        }
        
        // Filtres
        const arrFilter = document.getElementById('arrondissementFilter');
        if (arrFilter) {
            arrFilter.addEventListener('change', () => this.applyFilters());
        }
        
        const catFilter = document.getElementById('categoryFilter');
        if (catFilter) {
            catFilter.addEventListener('change', () => this.applyFilters());
        }
        
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // Reset
        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }
    }
    
    // === RECHERCHE ===
    onSearchInput(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.app.searchQuery = this.searchQuery;
        
        // Déclencher le rendu
        if (this.app.uiManager && this.app.uiManager.renderContent) {
            this.app.uiManager.renderContent();
        }
    }
    
    // === FILTRES ===
    applyFilters() {
        // Récupérer les valeurs
        const arrFilter = document.getElementById('arrondissementFilter');
        const catFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        this.activeFilters.arrondissement = arrFilter ? arrFilter.value : '';
        this.activeFilters.category = catFilter ? catFilter.value : '';
        this.activeFilters.status = statusFilter ? statusFilter.value : '';
        
        // Synchroniser avec l'app
        this.app.activeFilters = { ...this.activeFilters };
        
        // Déclencher le rendu
        if (this.app.uiManager && this.app.uiManager.renderContent) {
            this.app.uiManager.renderContent();
        }
    }
    
    resetFilters() {
        // Reset interface
        const searchInput = document.getElementById('searchInput');
        const arrFilter = document.getElementById('arrondissementFilter');
        const catFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (searchInput) searchInput.value = '';
        if (arrFilter) arrFilter.value = '';
        if (catFilter) catFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        
        // Reset états
        this.searchQuery = '';
        this.activeFilters = {
            arrondissement: '',
            category: '',
            status: ''
        };
        
        this.app.searchQuery = '';
        this.app.activeFilters = { ...this.activeFilters };
        
        // Déclencher le rendu
        if (this.app.uiManager && this.app.uiManager.renderContent) {
            this.app.uiManager.renderContent();
        }
    }
    
    // === OPTIONS DES FILTRES ===
    loadFilterOptions() {
        this.populateArrondissementFilter();
        this.populateCategoryFilter();
    }
    
    populateArrondissementFilter() {
        const select = document.getElementById('arrondissementFilter');
        if (!select || !this.app.parisData) return;
        
        select.innerHTML = '<option value="">📍 Tous les arrondissements</option>';
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            const option = document.createElement('option');
            option.value = arrKey;
            option.textContent = arrData.title || arrKey;
            select.appendChild(option);
        });
    }
    
    populateCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        if (!select || !this.app.parisData) return;
        
        select.innerHTML = '<option value="">🎯 Toutes les catégories</option>';
        
        const categories = new Set();
        
        Object.values(this.app.parisData).forEach(arrData => {
            if (arrData.categories) {
                Object.entries(arrData.categories).forEach(([catKey, catData]) => {
                    categories.add(JSON.stringify({
                        key: catKey,
                        title: catData.title || catKey
                    }));
                });
            }
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
    
    // === RECHERCHE SIMPLE ===
    performSearch(query = null, filters = null) {
        const searchTerm = query || this.searchQuery;
        const activeFilters = filters || this.activeFilters;
        
        if (!this.app.parisData) return [];
        
        const results = [];
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            // Filtre arrondissement
            if (activeFilters.arrondissement && arrKey !== activeFilters.arrondissement) {
                return;
            }
            
            if (arrData.categories) {
                Object.entries(arrData.categories).forEach(([catKey, catData]) => {
                    // Filtre catégorie
                    if (activeFilters.category && catKey !== activeFilters.category) {
                        return;
                    }
                    
                    if (catData.places) {
                        catData.places.forEach(place => {
                            const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                            
                            // Filtre statut
                            if (activeFilters.status) {
                                const userData = this.app.getCurrentUserData();
                                const isVisited = userData?.visitedPlaces?.has(placeId) || false;
                                const isFavorite = userData?.favorites?.has(placeId) || false;
                                
                                if (activeFilters.status === 'visited' && !isVisited) return;
                                if (activeFilters.status === 'not-visited' && isVisited) return;
                                if (activeFilters.status === 'favorites' && !isFavorite) return;
                            }
                            
                            // Recherche textuelle simple
                            let matches = true;
                            if (searchTerm) {
                                const searchableText = [
                                    place.name || '',
                                    place.description || '',
                                    place.address || '',
                                    arrData.title || '',
                                    catData.title || ''
                                ].join(' ').toLowerCase();
                                
                                matches = searchableText.includes(searchTerm);
                            }
                            
                            if (matches) {
                                results.push({
                                    placeId,
                                    place,
                                    arrKey,
                                    catKey,
                                    arrData,
                                    catData
                                });
                            }
                        });
                    }
                });
            }
        });
        
        return results;
    }
    
    // === MÉTHODES PUBLIQUES ===
    populateFilterOptions() {
        // Alias pour compatibilité
        this.loadFilterOptions();
    }
    
    buildSearchIndex() {
        // Méthode vide pour compatibilité
        console.log('🔍 Index de recherche (mode simple)');
    }
}

console.log('✅ SearchFilter simple chargé');
