// ===== SEARCH & FILTER MANAGER - RECHERCHE ET FILTRES AVANCÉS =====

class SearchFilterManager {
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
                if (filters.status === 'unvisited' && isVisited) matches = false;
            }
            
            if (matches && filters.type) {
                const placeType = this.getPlaceType(data.place, data.catKey);
                if (placeType !== filters.type) matches = false;
            }
            
            if (matches) {
                results.push({
                    ...data,
                    placeId,
                    score
                });
            }
        });
        
        // Trier par score de pertinence
        results.sort((a, b) => b.score - a.score);
        
        return results;
    }
    
    calculateTextScore(data, query) {
        let score = 0;
        const queryWords = query.split(/\s+/).filter(w => w.length > 1);
        
        queryWords.forEach(word => {
            // Score exact match nom
            if (data.place.name.toLowerCase().includes(word)) {
                score += 10;
            }
            
            // Score match début nom
            if (data.place.name.toLowerCase().startsWith(word)) {
                score += 15;
            }
            
            // Score description
            if (data.place.description && data.place.description.toLowerCase().includes(word)) {
                score += 5;
            }
            
            // Score adresse
            if (data.place.address && data.place.address.toLowerCase().includes(word)) {
                score += 3;
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
        
        select.innerHTML = '<option value="">Tous les arrondissements</option>';
        
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
        
        const categories = new Set();
        
        if (this.app.isDataLoaded) {
            Object.values(this.app.parisData).forEach(arrData => {
                Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                    categories.add({
                        key: catKey,
                        title: catData.title
                    });
                });
            });
        }
        
        select.innerHTML = '<option value="">Toutes les catégories</option>';
        Array.from(categories).sort((a, b) => a.title.localeCompare(b.title)).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.key;
            option.textContent = cat.title;
            select.appendChild(option);
        });
    }
    
    // === HISTORIQUE DE RECHERCHE ===
    addToSearchHistory(query) {
        if (!query || query.length < 2) return;
        
        const normalizedQuery = query.trim().toLowerCase();
        
        // Éviter les doublons
        this.searchHistory = this.searchHistory.filter(h => h.query !== normalizedQuery);
        
        // Ajouter en premier
        this.searchHistory.unshift({
            query: normalizedQuery,
            timestamp: Date.now(),
            results: this.performSearch(normalizedQuery).length
        });
        
        // Limiter l'historique
        this.searchHistory = this.searchHistory.slice(0, 20);
        
        this.saveSearchHistory();
    }
    
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('paris-explorer-search-history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Erreur chargement historique recherche:', error);
            this.searchHistory = [];
        }
    }
    
    saveSearchHistory() {
        try {
            localStorage.setItem('paris-explorer-search-history', 
                JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Erreur sauvegarde historique recherche:', error);
        }
    }
    
    // === RECHERCHE GÉOGRAPHIQUE ===
    searchNearby(latitude, longitude, radius = 1000) {
        // Recherche par proximité géographique
        // Nécessite les coordonnées des lieux
        const results = [];
        
        this.searchIndex.forEach((data, placeId) => {
            if (data.place.coordinates) {
                const distance = this.calculateDistance(
                    latitude, longitude,
                    data.place.coordinates.lat, 
                    data.place.coordinates.lng
                );
                
                if (distance <= radius) {
                    results.push({
                        ...data,
                        placeId,
                        distance
                    });
                }
            }
        });
        
        results.sort((a, b) => a.distance - b.distance);
        return results;
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Rayon de la Terre en mètres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }
    
    // === FILTRES INTELLIGENTS ===
    getSmartFilters() {
        const userData = this.app.getCurrentUserData();
        const filters = [];
        
        if (userData) {
            // Filtres basés sur l'activité utilisateur
            const visitedCount = userData.visitedPlaces?.size || 0;
            const totalPlaces = this.app.dataManager.getTotalPlaces();
            
            if (visitedCount > 0) {
                filters.push({
                    label: 'Mes explorations',
                    filter: { status: 'visited' },
                    count: visitedCount
                });
            }
            
            if (visitedCount < totalPlaces) {
                filters.push({
                    label: 'À découvrir',
                    filter: { status: 'unvisited' },
                    count: totalPlaces - visitedCount
                });
            }
            
            // Arrondissement favori
            if (userData.stats?.favoriteArrondissement) {
                filters.push({
                    label: `Mon ${userData.stats.favoriteArrondissement}`,
                    filter: { arrondissement: userData.stats.favoriteArrondissement },
                    count: 0 // À calculer
                });
            }
        }
        
        return filters;
    }
    
    // === RECHERCHE VOCALE ===
    startVoiceSearch() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.app.showNotification('Recherche vocale non supportée', 'warning');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            this.app.showNotification('🎤 Parlez maintenant...', 'info');
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('searchInput').value = transcript;
            this.onSearchInput(transcript);
        };
        
        recognition.onerror = () => {
            this.app.showNotification('Erreur reconnaissance vocale', 'error');
        };
        
        recognition.start();
    }
    
    // === UTILITAIRES ===
    getAllPlaces() {
        const results = [];
        this.searchIndex.forEach((data, placeId) => {
            results.push({ ...data, placeId, score: 1 });
        });
        return results;
    }
    
    getPlaceType(place, categoryKey) {
        const catKey = categoryKey.toLowerCase();
        
        if (catKey.includes('monument') || catKey.includes('patrimoine')) return 'monument';
        if (catKey.includes('restaurant') || catKey.includes('gastronomie')) return 'restaurant';
        if (catKey.includes('café') || catKey.includes('cafe')) return 'cafe';
        if (catKey.includes('bar') || catKey.includes('cocktail')) return 'bar';
        if (catKey.includes('shopping') || catKey.includes('boutique')) return 'shopping';
        if (catKey.includes('musée') || catKey.includes('museum')) return 'museum';
        if (catKey.includes('parc') || catKey.includes('jardin')) return 'park';
        if (catKey.includes('église') || catKey.includes('cathédrale')) return 'church';
        if (catKey.includes('hôtel') || catKey.includes('hotel')) return 'hotel';
        if (catKey.includes('théâtre') || catKey.includes('opéra')) return 'theater';
        
        return 'default';
    }
    
    // === ÉVÉNEMENTS ===
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.onSearchInput(e.target.value);
                }, 300);
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.addToSearchHistory(e.target.value);
                }
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
        
        // Appliquer les filtres
        this.app.uiManager.renderContent();
    }
    
    showSuggestions(query) {
        const suggestions = this.getSuggestions(query);
        // Implémentation de l'affichage des suggestions
        // À intégrer avec l'UI
    }
    
    hideSuggestions() {
        // Masquer les suggestions
    }
}
