// ===== SEARCH FILTER FALLBACK - VERSION SIMPLE =====

// Classe SearchFilter simplifiée en cas d'erreur de chargement du module principal
class SearchFilter {
    constructor(app) {
        this.app = app;
        this.searchQuery = '';
        this.activeFilters = {};
        console.log('📍 SearchFilter fallback activé');
    }
    
    initializeFilters() {
        console.log('🔍 Filtres initialisés (mode fallback)');
    }
    
    populateFilterOptions() {
        // Version simple sans erreur
    }
    
    buildSearchIndex() {
        // Version simple sans erreur
    }
    
    performSearch() {
        return [];
    }
}

// Classe SearchFilterManager pour compatibilité
class SearchFilterManager extends SearchFilter {
    constructor(app) {
        super(app);
        console.log('📍 SearchFilterManager fallback activé');
    }
}

console.log('✅ Search Filter Fallback chargé');
