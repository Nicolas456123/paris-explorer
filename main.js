// ===== PARIS EXPLORER - POINT D'ENTRÉE PRINCIPAL =====

// Configuration et état global de l'application
class ParisExplorer {
    constructor() {
        // Modules spécialisés
        this.dataManager = new DataManager(this);
        this.userManager = new UserManager(this);
        this.mapManager = new MapManager(this);
        this.uiManager = new UIManager(this);
        
        // État de l'application
        this.parisData = {};
        this.currentUser = null;
        this.searchQuery = '';
        this.hideCompleted = false;
        this.isDataLoaded = false;
        this.currentTab = 'list';
        
        this.init();
    }
    
    async init() {
        console.log('🗼 Initialisation de Paris Explorer...');
        
        try {
            // Chargement des utilisateurs depuis localStorage
            this.userManager.loadUsers();
            
            // Tentative de chargement des données Paris
            await this.dataManager.loadParisData();
            
            // Configuration de l'interface utilisateur
            this.uiManager.setupEventListeners();
            this.uiManager.loadUserSelector();
            this.userManager.autoSelectUser();
            
            console.log('✅ Application initialisée avec succès');
            
        } catch (error) {
            // Afficher l'interface même sans données
            this.uiManager.setupEventListeners();
            this.uiManager.loadUserSelector();
            console.warn('⚠️ Application démarrée sans données Paris:', error.message);
        }
    }
    
    // === GETTERS POUR L'ÉTAT ===
    getCurrentUserData() {
        return this.userManager.getCurrentUserData();
    }
    
    getUsers() {
        return this.userManager.users;
    }
    
    // === MÉTHODES DE COORDINATION ===
    onDataLoaded() {
        this.isDataLoaded = true;
        this.uiManager.renderContent();
        this.uiManager.updateStats();
        this.showNotification('Trésors parisiens chargés avec succès!', 'success');
    }
    
    onUserChanged(userName) {
        this.currentUser = userName;
        this.uiManager.renderContent();
        this.uiManager.updateStats();
        
        // Mettre à jour la carte si visible
        if (this.mapManager.map && this.currentTab === 'map') {
            this.mapManager.updateMapMarkers();
        }
    }
    
    onPlaceToggled(placeId, isVisited) {
        this.uiManager.updatePlaceCard(placeId, isVisited);
        this.uiManager.updateStats();
        
        // Mettre à jour la carte si visible
        if (this.mapManager.map && this.currentTab === 'map') {
            this.mapManager.updateMapMarkers();
        }
    }
    
    onTabChanged(tabName) {
        this.currentTab = tabName;
        
        // Initialiser la carte si nécessaire
        if (tabName === 'map') {
            setTimeout(() => {
                this.mapManager.initMap();
            }, 100);
        }
    }
    
    // === UTILITAIRES GLOBAUX ===
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    createPlaceId(arrKey, catKey, placeName) {
        return `${arrKey}-${catKey}-${placeName}`
            .replace(/['"]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
    }
}

// Variable globale pour l'accès depuis le HTML
let app;

// Initialisation de l'application au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Démarrage de Paris Explorer...');
    app = new ParisExplorer();
});
