// ===== PARIS EXPLORER - APPLICATION PRINCIPALE =====

// Configuration et état global de l'application
class ParisExplorer {
    constructor() {
        // Modules spécialisés dans l'ordre de dépendance
        this.dataManager = new DataManager(this);
        this.userManager = new UserManager(this);
        this.mapManager = new MapManager(this);
        this.searchFilterManager = new SearchFilterManager(this);
        this.exportImportManager = new ExportImportManager(this);
        this.uiManager = new UIManager(this);
        
        // État de l'application
        this.parisData = {};
        this.currentUser = null;
        this.searchQuery = '';
        this.hideCompleted = false;
        this.isDataLoaded = false;
        this.currentTab = 'list';
        this.isDarkMode = false;
        this.notificationsEnabled = true;
        
        // Configuration
        this.config = {
            dataSource: 'data/paris-index.json',
            fallbackDataSource: 'paris-database.json',
            cacheEnabled: true,
            autoSaveInterval: 30000, // 30 secondes
            maxNotifications: 5,
            searchDebounceTime: 300
        };
        
        this.init();
    }
    
    async init() {
        console.log('🗼 Initialisation de Paris Explorer v2.0.0...');
        
        try {
            // Chargement des préférences utilisateur
            this.loadUserPreferences();
            
            // Chargement des utilisateurs depuis localStorage
            this.userManager.loadUsers();
            
            // Tentative de chargement des données Paris
            await this.loadParisData();
            
            // Configuration de l'interface utilisateur
            this.uiManager.setupEventListeners();
            this.uiManager.loadUserSelector();
            
            // Configuration des nouveaux modules
            this.setupModules();
            
            // Auto-sélection utilisateur
            this.userManager.autoSelectUser();
            
            // Configuration de la sauvegarde automatique
            this.setupAutoSave();
            
            console.log('✅ Application initialisée avec succès');
            
        } catch (error) {
            // Afficher l'interface même sans données
            this.handleInitializationError(error);
        }
    }
    
    // === CHARGEMENT DES DONNÉES ===
    
    async loadParisData() {
        try {
            // Essayer d'abord le nouveau format
            await this.dataManager.loadParisData();
        } catch (primaryError) {
            console.warn('⚠️ Échec chargement données principales:', primaryError.message);
            
            try {
                // Fallback vers l'ancien format
                console.log('🔄 Tentative de chargement du format de fallback...');
                await this.dataManager.loadFallbackData();
            } catch (fallbackError) {
                console.error('❌ Échec chargement données de fallback:', fallbackError.message);
                throw new Error('Aucune source de données accessible');
            }
        }
    }
    
    // === CONFIGURATION DES MODULES ===
    
    setupModules() {
        // Configuration du système de recherche
        this.searchFilterManager.buildSearchIndex();
        this.searchFilterManager.populateFilterDropdowns();
        
        // Configuration des event listeners pour export/import
        this.setupExportImportListeners();
        
        // Configuration des raccourcis clavier
        this.setupKeyboardShortcuts();
        
        // Configuration du système de thèmes
        this.setupThemeSystem();
    }
    
    setupExportImportListeners() {
        const exportBtn = Utils.DOM.$('#exportDataBtn');
        const importBtn = Utils.DOM.$('#importDataBtn');
        const importFileInput = Utils.DOM.$('#importFileInput');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showExportModal();
            });
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                importFileInput?.click();
            });
        }
        
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileImport(file);
                }
            });
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F pour focus sur la recherche
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = Utils.DOM.$('#searchInput');
                searchInput?.focus();
            }
            
            // Ctrl/Cmd + E pour export
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.showExportModal();
            }
            
            // Ctrl/Cmd + I pour import
            if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                e.preventDefault();
                Utils.DOM.$('#importFileInput')?.click();
            }
            
            // Onglets avec Ctrl/Cmd + 1/2/3/4
            if ((e.ctrlKey || e.metaKey) && ['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const tabs = ['list', 'map', 'stats', 'favorites'];
                const tabIndex = parseInt(e.key) - 1;
                if (tabs[tabIndex]) {
                    this.uiManager.switchTab(tabs[tabIndex]);
                }
            }
        });
    }
    
    setupThemeSystem() {
        // Charger le thème sauvegardé
        const savedTheme = Utils.Storage.load('user-theme', 'light');
        this.setTheme(savedTheme);
        
        // Configuration du toggle mode sombre
        const darkModeToggle = Utils.DOM.$('#darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = this.isDarkMode;
            darkModeToggle.addEventListener('change', (e) => {
                this.setTheme(e.target.checked ? 'dark' : 'light');
            });
        }
        
        // Configuration du toggle notifications
        const notifToggle = Utils.DOM.$('#notificationsToggle');
        if (notifToggle) {
            notifToggle.checked = this.notificationsEnabled;
            notifToggle.addEventListener('change', (e) => {
                this.notificationsEnabled = e.target.checked;
                this.saveUserPreferences();
            });
        }
    }
    
    setupAutoSave() {
        // Sauvegarde automatique toutes les 30 secondes
        setInterval(() => {
            if (this.currentUser) {
                this.userManager.saveUsers();
                console.log('💾 Sauvegarde automatique effectuée');
            }
        }, this.config.autoSaveInterval);
        
        // Sauvegarde avant fermeture de la page
        window.addEventListener('beforeunload', () => {
            if (this.currentUser) {
                this.userManager.saveUsers();
            }
        });
    }
    
    // === GESTION DES ERREURS ===
    
    handleInitializationError(error) {
        console.error('❌ Erreur initialisation:', error);
        
        // Affichage de l'interface de base
        this.uiManager.setupEventListeners();
        this.uiManager.loadUserSelector();
        
        // Affichage du message d'erreur
        this.showErrorMessage(error.message);
        
        console.warn('⚠️ Application démarrée en mode dégradé');
    }
    
    showErrorMessage(message) {
        const errorDiv = Utils.DOM.$('#errorMessage');
        const loadingDiv = Utils.DOM.$('#loadingMessage');
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.style.display = 'block';
            const errorContent = errorDiv.querySelector('.error-content p');
            if (errorContent) {
                errorContent.textContent = `Erreur : ${message}`;
            }
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
        
        // Masquer le loading et afficher le contenu
        const loadingDiv = Utils.DOM.$('#loadingMessage');
        const errorDiv = Utils.DOM.$('#errorMessage');
        const contentDiv = Utils.DOM.$('#arrondissementsContainer');
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
        if (contentDiv) contentDiv.style.display = 'block';
        
        // Reconstruire l'index de recherche
        this.searchFilterManager.buildSearchIndex();
        this.searchFilterManager.populateFilterDropdowns();
        
        // Rendu du contenu
        this.uiManager.renderContent();
        this.uiManager.updateStats();
        
        this.showNotification('Trésors parisiens chargés avec succès! 🗼', 'success');
    }
    
    onUserChanged(userName) {
        this.currentUser = userName;
        
        // Mettre à jour l'interface
        this.uiManager.renderContent();
        this.uiManager.updateStats();
        
        // Mettre à jour la carte si visible
        if (this.mapManager.map && this.currentTab === 'map') {
            this.mapManager.updateMapMarkers();
        }
        
        // Sauvegarder les préférences
        this.saveUserPreferences();
    }
    
    onPlaceToggled(placeId, isVisited) {
        // Mettre à jour l'interface
        this.uiManager.updatePlaceCard(placeId, isVisited);
        this.uiManager.updateStats();
        
        // Mettre à jour la carte si visible
        if (this.mapManager.map && this.currentTab === 'map') {
            this.mapManager.updateMapMarkers();
        }
        
        // Notifications de progression
        if (isVisited) {
            this.checkProgressMilestones();
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
        
        // Charger le contenu spécifique à l'onglet
        this.loadTabContent(tabName);
    }
    
    // === CONTENU SPÉCIALISÉ PAR ONGLET ===
    
    loadTabContent(tabName) {
        switch (tabName) {
            case 'stats':
                this.loadStatsContent();
                break;
            case 'favorites':
                this.loadFavoritesContent();
                break;
        }
    }
    
    loadStatsContent() {
        const statsContainer = Utils.DOM.$('#arrondissementStats');
        if (!statsContainer || !this.isDataLoaded) return;
        
        const userData = this.getCurrentUserData();
        if (!userData) {
            statsContainer.innerHTML = '<p>Sélectionnez un profil pour voir les statistiques</p>';
            return;
        }
        
        // Générer les statistiques par arrondissement
        const stats = this.generateArrondissementStats(userData);
        statsContainer.innerHTML = this.renderArrondissementStats(stats);
    }
    
    loadFavoritesContent() {
        const favoritesContainer = Utils.DOM.$('#favoritesGrid');
        if (!favoritesContainer) return;
        
        const userData = this.getCurrentUserData();
        if (!userData || !userData.favorites || userData.favorites.size === 0) {
            favoritesContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <h3>⭐ Aucun lieu favori</h3>
                    <p>Ajoutez des lieux à vos favoris pour les retrouver ici</p>
                </div>
            `;
            return;
        }
        
        // Afficher les lieux favoris
        favoritesContainer.innerHTML = this.renderFavorites(userData.favorites);
    }
    
    // === EXPORT/IMPORT ===
    
    showExportModal() {
        const userData = this.getCurrentUserData();
        if (!userData) {
            this.showNotification('Sélectionnez un profil pour exporter', 'warning');
            return;
        }
        
        const options = [
            { label: 'Export JSON (données complètes)', action: () => this.exportImportManager.exportUserDataJSON(userData.name) },
            { label: 'Export CSV (liste des lieux)', action: () => this.exportImportManager.exportUserDataCSV(userData.name) },
            { label: 'Rapport de progression (TXT)', action: () => this.exportImportManager.exportProgressReport(userData.name) }
        ];
        
        // Créer un modal simple pour les options d'export
        const modalHtml = `
            <div class="export-options">
                <h4>Options d'export pour ${userData.name}</h4>
                ${options.map((opt, i) => `
                    <button class="btn btn-secondary" onclick="app.handleExportOption(${i})" style="display: block; width: 100%; margin: 8px 0;">
                        ${opt.label}
                    </button>
                `).join('')}
            </div>
        `;
        
        // Utiliser le modal existant ou créer une notification interactive
        this.showNotification('Choisissez le format d\'export dans la console', 'info');
        console.log('📤 Options d\'export disponibles:', options.map(opt => opt.label));
        
        // Exporter directement en JSON par défaut
        this.exportImportManager.exportUserDataJSON(userData.name);
    }
    
    async handleFileImport(file) {
        try {
            const result = await this.exportImportManager.importData(file);
            this.showNotification(`Import réussi : ${result.imported} profil(s)`, 'success');
        } catch (error) {
            this.showNotification(`Erreur import : ${error.message}`, 'error');
        }
    }
    
    // === SYSTÈME DE PROGRESSION ===
    
    checkProgressMilestones() {
        const userData = this.getCurrentUserData();
        if (!userData) return;
        
        const visitedCount = userData.visitedPlaces.size;
        const totalPlaces = this.dataManager.getTotalPlaces();
        const completionRate = Math.round((visitedCount / totalPlaces) * 100);
        
        // Vérifier les jalons
        const milestones = [10, 25, 50, 100, 150, 200, 300, 500];
        
        if (milestones.includes(visitedCount)) {
            this.showNotification(`🏆 Félicitations ! ${visitedCount} lieux explorés !`, 'success');
        }
        
        // Jalons de pourcentage
        if ([25, 50, 75, 90, 100].includes(completionRate)) {
            const messages = {
                25: '🌟 Un quart de Paris exploré !',
                50: '🎯 À mi-chemin de la conquête parisienne !',
                75: '🏆 Trois quarts de Paris découverts !',
                90: '🔥 Presque au bout, courage !',
                100: '👑 INCROYABLE ! Paris entièrement conquis !'
            };
            
            this.showNotification(messages[completionRate], 'success');
        }
    }
    
    // === THÈMES ===
    
    setTheme(theme) {
        this.isDarkMode = theme === 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Sauvegarder
        Utils.Storage.save('user-theme', theme);
        this.saveUserPreferences();
    }
    
    // === PRÉFÉRENCES UTILISATEUR ===
    
    loadUserPreferences() {
        const prefs = Utils.Storage.load('user-preferences', {});
        
        this.isDarkMode = prefs.darkMode || false;
        this.notificationsEnabled = prefs.notifications !== false; // true par défaut
        this.currentUser = prefs.lastUser || null;
    }
    
    saveUserPreferences() {
        const prefs = {
            darkMode: this.isDarkMode,
            notifications: this.notificationsEnabled,
            lastUser: this.currentUser
        };
        
        Utils.Storage.save('user-preferences', prefs);
    }
    
    // === UTILITAIRES GLOBAUX ===
    
    showNotification(message, type = 'success') {
        if (!this.notificationsEnabled) return;
        
        const notification = Utils.DOM.createElement('div', {
            className: `notification ${type}`
        }, message);
        
        document.body.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Animation de sortie
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
        
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    }
    
    createPlaceId(arrKey, catKey, placeName) {
        return Utils.Text.createId(`${arrKey}-${catKey}-${placeName}`);
    }
    
    // === GÉNÉRATION DE STATISTIQUES ===
    
    generateArrondissementStats(userData) {
        const stats = {};
        
        if (!this.isDataLoaded) return stats;
        
        Object.entries(this.parisData).forEach(([arrKey, arrData]) => {
            const totalInArr = this.dataManager.getTotalPlacesInArrondissement(arrData);
            const visitedInArr = this.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey);
            
            stats[arrKey] = {
                title: arrData.title,
                total: totalInArr,
                visited: visitedInArr,
                completionRate: Utils.Math.percentage(visitedInArr, totalInArr),
                categories: Object.keys(arrData.categories || {}).length
            };
        });
        
        return stats;
    }
    
    renderArrondissementStats(stats) {
        return Object.entries(stats)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([arrKey, stat]) => {
                const progressBar = '█'.repeat(Math.floor(stat.completionRate / 5));
                const emptyBar = '░'.repeat(20 - Math.floor(stat.completionRate / 5));
                
                return `
                    <div class="stat-item" style="padding: 12px; margin: 8px 0; background: var(--paris-cream); border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong>${arrKey}</strong>
                            <span>${stat.visited}/${stat.total} (${stat.completionRate}%)</span>
                        </div>
                        <div style="font-family: monospace; margin-top: 8px; color: var(--paris-gold);">
                            ${progressBar}${emptyBar}
                        </div>
                    </div>
                `;
            }).join('');
    }
    
    renderFavorites(favorites) {
        // TODO: Implémenter l'affichage des favoris
        return '<p>Fonctionnalité favoris en cours de développement</p>';
    }
}

// Variable globale pour l'accès depuis le HTML
let app;

// Initialisation de l'application au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Démarrage de Paris Explorer v2.0.0...');
    app = new ParisExplorer();
});

// Export pour les modules ES6 si nécessaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParisExplorer;
}
