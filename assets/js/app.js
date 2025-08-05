// ===== PARIS EXPLORER AVANCÉ - APPLICATION PRINCIPALE =====

// Configuration et état global de l'application avancée
class ParisExplorerAdvanced {
    constructor() {
        // Modules spécialisés avancés
        this.dataManager = new DataManager(this);
        this.userManager = new UserManager(this);
        this.mapManager = new MapManager(this);
        this.uiManager = new UIManager(this);
        this.searchFilter = new SearchFilter(this);
        this.exportImport = new ExportImport(this);
        
        // État de l'application
        this.parisData = {};
        this.currentUser = null;
        this.searchQuery = '';
        this.activeFilters = {
            arrondissement: '',
            category: '',
            status: '',
            tags: '',
            hideCompleted: false
        };
        this.isDataLoaded = false;
        this.currentTab = 'list';
        this.viewMode = 'normal'; // normal, compact
        this.sortMode = 'default'; // default, alphabetical, completion, popularity
        
        // Cache performance
        this.cache = new Map();
        this.debounceTimers = new Map();
        
        // Événements personnalisés
        this.eventBus = new EventTarget();
        
        // Configuration avancée
        this.config = {
            version: '2.0.0-advanced',
            features: {
                collections: true,
                achievements: true,
                notes: true,
                advancedSearch: true,
                exportImport: true,
                theming: true,
                pwa: true
            },
            performance: {
                debounceDelay: 300,
                cacheExpiry: 3600000, // 1 heure
                maxCacheSize: 100
            }
        };
        
        this.init();
    }
    
    async init() {
        console.log('🗼 Initialisation Paris Explorer Avancé v' + this.config.version);
        
        try {
            // Phase 1: Initialisation de base
            this.showGlobalLoading('Initialisation...');
            
            // Chargement utilisateurs depuis stockage modulaire
            this.userManager.loadUsers();
            
            // Migration des données legacy si nécessaire
            await this.userManager.migrateFromLegacyFormat();
            
            // Phase 2: Chargement des données Paris
            this.showGlobalLoading('Chargement des données parisiennes...');
            await this.dataManager.loadParisData();
            
            // Phase 3: Configuration de l'interface
            this.showGlobalLoading('Configuration de l\'interface...');
            this.uiManager.setupEventListeners();
            this.uiManager.loadUserSelector();
            this.searchFilter.initializeFilters();
            
            // Phase 4: Sélection utilisateur
            this.userManager.autoSelectUser();
            
            // Phase 5: Configuration PWA
            this.initializePWA();
            
            // Phase 6: Événements globaux
            this.setupGlobalEventListeners();
            
            this.hideGlobalLoading();
            console.log('✅ Application avancée initialisée avec succès');
            
            // Vérifier les achievements au démarrage
            setTimeout(() => {
                this.userManager.checkAchievements();
            }, 1000);
            
        } catch (error) {
            this.hideGlobalLoading();
            
            // Mode dégradé : afficher l'interface même sans données
            this.uiManager.setupEventListeners();
            this.uiManager.loadUserSelector();
            this.searchFilter.initializeFilters();
            
            console.warn('⚠️ Application démarrée en mode dégradé:', error.message);
            this.showNotification('Mode démonstration - Créez un profil pour commencer', 'warning');
        }
    }
    
    // === GESTION AVANCÉE DES ÉVÉNEMENTS ===
    setupGlobalEventListeners() {
        // Raccourcis clavier avancés
        document.addEventListener('keydown', this.handleGlobalKeyboard.bind(this));
        
        // Gestion de la visibilité de la page
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Gestion des erreurs globales
        window.addEventListener('error', this.handleGlobalError.bind(this));
        
        // Sauvegarde automatique périodique
        setInterval(() => {
            if (this.currentUser) {
                this.userManager.saveUsers();
                console.log('💾 Sauvegarde automatique effectuée');
            }
        }, 30000); // Toutes les 30 secondes
        
        // Vérification des achievements périodique
        setInterval(() => {
            if (this.currentUser) {
                this.userManager.checkAchievements();
            }
        }, 60000); // Toutes les minutes
    }
    
    handleGlobalKeyboard(event) {
        // Ctrl/Cmd + F : Focus recherche
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            document.getElementById('searchInput').focus();
        }
        
        // Ctrl/Cmd + U : Ouvrir gestion utilisateurs
        if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
            event.preventDefault();
            this.uiManager.showModal();
        }
        
        // Ctrl/Cmd + S : Sauvegarder
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            this.userManager.saveUsers();
            this.showNotification('💾 Données sauvegardées', 'success');
        }
        
        // Ctrl/Cmd + E : Exporter
        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
            event.preventDefault();
            this.exportImport.exportCompleteUserData(this.currentUser);
        }
        
        // Navigation par onglets (Ctrl/Cmd + 1-6)
        if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '6') {
            event.preventDefault();
            const tabs = ['list', 'map', 'favorites', 'collections', 'achievements', 'stats'];
            const tabIndex = parseInt(event.key) - 1;
            if (tabs[tabIndex]) {
                this.uiManager.switchTab(tabs[tabIndex]);
            }
        }
        
        // Échap : Fermer modals et dropdowns
        if (event.key === 'Escape') {
            // Fermer dropdowns
            document.querySelectorAll('.dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
            });
            
            // Fermer modals
            const modals = document.querySelectorAll('.modal.show');
            modals.forEach(modal => {
                modal.classList.remove('show');
            });
        }
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            // Page cachée : sauvegarder les données
            if (this.currentUser) {
                this.userManager.saveUsers();
                console.log('💾 Sauvegarde avant masquage de la page');
            }
        } else {
            // Page visible : vérifier les mises à jour
            this.checkForUpdates();
        }
    }
    
    handleGlobalError(event) {
        console.error('❌ Erreur globale:', event.error);
        this.showNotification('Une erreur est survenue. Les données ont été sauvegardées.', 'error');
        
        // Sauvegarde d'urgence
        if (this.currentUser) {
            this.userManager.saveUsers();
        }
    }
    
    // === GESTION PWA ===
    initializePWA() {
        // Gestion de l'installation PWA
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Afficher un bouton d'installation personnalisé
            this.showInstallPrompt(deferredPrompt);
        });
        
        // Gestion de la mise à jour du service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                    this.showUpdatePrompt();
                }
            });
        }
    }
    
    showInstallPrompt(deferredPrompt) {
        const installNotification = document.createElement('div');
        installNotification.className = 'install-prompt';
        installNotification.innerHTML = `
            <div class="install-content">
                <span>📱 Installer Paris Explorer en tant qu'application</span>
                <div class="install-actions">
                    <button class="btn btn-primary" id="installBtn">Installer</button>
                    <button class="btn btn-secondary" id="dismissBtn">Plus tard</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(installNotification);
        
        document.getElementById('installBtn').addEventListener('click', async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA installation: ${outcome}`);
            installNotification.remove();
        });
        
        document.getElementById('dismissBtn').addEventListener('click', () => {
            installNotification.remove();
        });
        
        // Auto-dismiss après 10 secondes
        setTimeout(() => {
            if (installNotification.parentNode) {
                installNotification.remove();
            }
        }, 10000);
    }
    
    showUpdatePrompt() {
        const updateNotification = document.createElement('div');
        updateNotification.className = 'update-prompt';
        updateNotification.innerHTML = `
            <div class="update-content">
                <span>🔄 Une nouvelle version est disponible</span>
                <button class="btn btn-primary" onclick="window.location.reload()">Mettre à jour</button>
            </div>
        `;
        
        document.body.appendChild(updateNotification);
    }
    
    // === MÉTHODES DE COORDINATION AVANCÉES ===
    onDataLoaded() {
        this.isDataLoaded = true;
        this.clearCache();
        this.uiManager.renderContent();
        this.uiManager.updateStats();
        this.searchFilter.populateFilterOptions();
        
        // Émettre événement personnalisé
        this.emit('dataLoaded', { totalPlaces: this.dataManager.getTotalPlaces() });
        
        this.showNotification('🗼 Trésors parisiens chargés avec succès!', 'success');
    }
    
    onUserChanged(userName) {
        this.currentUser = userName;
        this.clearCache();
        
        // Appliquer les paramètres utilisateur
        const userData = this.getCurrentUserData();
        if (userData?.settings) {
            this.userManager.applySettings();
        }
        
        // Mettre à jour l'interface
        this.uiManager.renderContent();
        this.uiManager.updateStats();
        
        // Mettre à jour tous les onglets
        if (this.currentTab === 'favorites') {
            this.uiManager.renderFavorites();
        } else if (this.currentTab === 'collections') {
            this.uiManager.renderCollections();
        } else if (this.currentTab === 'achievements') {
            this.uiManager.renderAchievements();
        }
        
        // Mettre à jour la carte si visible
        if (this.mapManager.map && this.currentTab === 'map') {
            this.mapManager.updateMapMarkers();
        }
        
        // Émettre événement
        this.emit('userChanged', { userName, userData });
    }
    
    onPlaceToggled(placeId, isVisited) {
        // Invalidate cache
        this.invalidateCache(`place-${placeId}`);
        
        // Mettre à jour l'interface
        this.uiManager.updatePlaceCard(placeId, isVisited);
        this.uiManager.updateStats();
        
        // Mettre à jour la carte si visible
        if (this.mapManager.map && this.currentTab === 'map') {
            this.mapManager.updateMapMarkers();
        }
        
        // Vérifier les achievements
        this.userManager.checkAchievements();
        
        // Émettre événement
        this.emit('placeToggled', { placeId, isVisited });
    }
    
    onTabChanged(tabName) {
        this.currentTab = tabName;
        
        // Rendu spécifique selon l'onglet
        switch (tabName) {
            case 'map':
                setTimeout(() => this.mapManager.initMap(), 100);
                break;
            case 'favorites':
                this.uiManager.renderFavorites();
                break;
            case 'collections':
                this.uiManager.renderCollections();
                break;
            case 'achievements':
                this.uiManager.renderAchievements();
                break;
            case 'stats':
                this.uiManager.renderAdvancedStats();
                break;
        }
        
        // Émettre événement
        this.emit('tabChanged', { tabName });
    }
    
    onSearchChanged(query, filters) {
        this.searchQuery = query;
        this.activeFilters = { ...this.activeFilters, ...filters };
        
        // Debounce pour éviter trop de rendus
        this.debounce('search', () => {
            this.uiManager.renderContent();
        }, this.config.performance.debounceDelay);
        
        // Émettre événement
        this.emit('searchChanged', { query, filters });
    }
    
    onFilterChanged(filterType, value) {
        this.activeFilters[filterType] = value;
        this.uiManager.renderContent();
        
        // Émettre événement
        this.emit('filterChanged', { filterType, value });
    }
    
    // === SYSTÈME DE CACHE AVANCÉ ===
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.config.performance.cacheExpiry) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    setCached(key, data) {
        // Limiter la taille du cache
        if (this.cache.size >= this.config.performance.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache vidé');
    }
    
    invalidateCache(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
    
    // === SYSTÈME DE DEBOUNCE ===
    debounce(key, func, delay) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }
    
    // === SYSTÈME D'ÉVÉNEMENTS ===
    emit(eventName, data) {
        this.eventBus.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
    
    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }
    
    off(eventName, callback) {
        this.eventBus.removeEventListener(eventName, callback);
    }
    
    // === NOTIFICATIONS AVANCÉES ===
    showNotification(message, type = 'success', duration = 4000, actions = []) {
        const notification = document.createElement('div');
        notification.className = `notification advanced ${type}`;
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getNotificationIcon(type)}</div>
                <div class="notification-message">${message}</div>
                ${actions.length > 0 ? `
                    <div class="notification-actions">
                        ${actions.map(action => `
                            <button class="notification-btn" onclick="${action.onclick}">${action.label}</button>
                        `).join('')}
                    </div>
                ` : ''}
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        const container = document.getElementById('notificationsContainer') || document.body;
        container.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
        
        // Limiter le nombre de notifications simultanées
        const notifications = container.querySelectorAll('.notification');
        if (notifications.length > 5) {
            notifications[0].remove();
        }
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            achievement: '🏆'
        };
        return icons[type] || 'ℹ️';
    }
    
    // === LOADING GLOBAL ===
    showGlobalLoading(message = 'Chargement...') {
        const loading = document.getElementById('globalLoading');
        if (loading) {
            loading.querySelector('p').textContent = message;
            loading.style.display = 'flex';
        }
    }
    
    hideGlobalLoading() {
        const loading = document.getElementById('globalLoading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    
    // === MÉTHODES UTILITAIRES AVANCÉES ===
    getCurrentUserData() {
        return this.userManager.getCurrentUserData();
    }
    
    getUsers() {
        return this.userManager.users;
    }
    
    createPlaceId(arrKey, catKey, placeName) {
        return `${arrKey}-${catKey}-${placeName}`
            .replace(/['"]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
    }
    
    // === VÉRIFICATIONS ET MISES À JOUR ===
    checkForUpdates() {
        // Vérifier si une nouvelle version est disponible
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
        }
    }
    
    // === ANALYTICS ET PERFORMANCE ===
    logPerformance(action, duration) {
        console.log(`⚡ Performance ${action}: ${duration}ms`);
        
        // En production, envoyer vers un service d'analytics
        if (this.config.features.analytics) {
            // analytics.track(action, { duration });
        }
    }
    
    logUserAction(action, data = {}) {
        console.log(`👤 Action utilisateur: ${action}`, data);
        
        // En production, envoyer vers un service d'analytics
        if (this.config.features.analytics) {
            // analytics.track(action, data);
        }
    }
    
    // === SAUVEGARDE D'URGENCE ===
    emergencySave() {
        try {
            this.userManager.saveUsers();
            this.showNotification('💾 Sauvegarde d\'urgence effectuée', 'success');
            return true;
        } catch (error) {
            console.error('❌ Échec sauvegarde d\'urgence:', error);
            return false;
        }
    }
    
    // === GESTIONNAIRE D'ERREURS AVANCÉ ===
    handleError(error, context = '') {
        console.error(`❌ Erreur ${context}:`, error);
        
        // Sauvegarde d'urgence
        this.emergencySave();
        
        // Notification à l'utilisateur
        this.showNotification(
            `Erreur ${context}. Données sauvegardées.`, 
            'error',
            5000,
            [
                {
                    label: 'Recharger',
                    onclick: 'window.location.reload()'
                }
            ]
        );
        
        // Log pour debugging
        this.logUserAction('error', { error: error.message, context });
    }
    
    // === MÉTHODES DE CLEANUP ===
    cleanup() {
        // Nettoyer les timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        // Vider le cache
        this.clearCache();
        
        // Supprimer les event listeners
        this.eventBus.removeEventListener();
        
        console.log('🧹 Nettoyage de l\'application effectué');
    }
    
    // === MÉTHODES DE DÉBOGAGE ===
    getDebugInfo() {
        return {
            version: this.config.version,
            user: this.currentUser,
            dataLoaded: this.isDataLoaded,
            cacheSize: this.cache.size,
            activeFilters: this.activeFilters,
            currentTab: this.currentTab,
            totalPlaces: this.dataManager?.getTotalPlaces() || 0,
            userData: this.getCurrentUserData()
        };
    }
    
    exportDebugInfo() {
        const debugInfo = this.getDebugInfo();
        const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `paris-explorer-debug-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('📊 Informations de débogage exportées', 'info');
    }
}

// Variable globale pour l'accès depuis le HTML
let app;

// Initialisation de l'application avancée au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Démarrage Paris Explorer Avancé...');
    
    try {
        app = new ParisExplorerAdvanced();
        
        // Exposer des méthodes globales pour le débogage
        window.parisExplorerDebug = {
            getInfo: () => app.getDebugInfo(),
            exportDebug: () => app.exportDebugInfo(),
            clearCache: () => app.clearCache(),
            emergencySave: () => app.emergencySave()
        };
        
    } catch (error) {
        console.error('❌ Erreur critique lors de l\'initialisation:', error);
        
        // Mode de récupération
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #1e3a8a 0%, #D4AF37 100%); color: white; font-family: sans-serif; text-align: center;">
                <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; backdrop-filter: blur(10px);">
                    <h1>🗼 Paris Explorer</h1>
                    <p>Une erreur critique s'est produite lors du chargement.</p>
                    <button onclick="window.location.reload()" style="padding: 12px 24px; background: #D4AF37; color: #1e3a8a; border: none; border-radius: 25px; font-weight: bold; cursor: pointer; margin-top: 16px;">
                        Recharger la page
                    </button>
                </div>
            </div>
        `;
    }
});

// Gestion de la fermeture de la page
window.addEventListener('beforeunload', () => {
    if (app) {
        app.emergencySave();
        app.cleanup();
    }
});
