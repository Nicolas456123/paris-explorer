// ===== PARIS EXPLORER AVANCÉ - APPLICATION PRINCIPALE =====

// Configuration et état global de l'application avancée
class ParisExplorerAdvanced {
    constructor() {
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
        
        // Initialiser les modules
        this.initializeModules();
        
        this.init();
    }
    
    initializeModules() {
        try {
            // Modules spécialisés avancés
            this.dataManager = new DataManager(this);
            this.userManager = new UserManager(this);
            this.mapManager = new MapManager(this);
            this.uiManager = new UIManager(this);
            
            // Tenter d'initialiser SearchFilter avec fallback
            try {
                this.searchFilter = window.SearchFilter ? new SearchFilter(this) : 
                                   window.SearchFilterManager ? new SearchFilterManager(this) : null;
            } catch (e) {
                console.warn('SearchFilter non disponible:', e);
                this.searchFilter = null;
            }
            
            try {
                this.exportImport = new ExportImport(this);
            } catch (e) {
                console.warn('ExportImport non disponible:', e);
                this.exportImport = null;
            }
            
        } catch (error) {
            console.error('Erreur initialisation modules:', error);
        }
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
            
            // Initialiser les filtres si disponible
            if (this.searchFilter && this.searchFilter.initializeFilters) {
                this.searchFilter.initializeFilters();
            }
            
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
            console.error('❌ Erreur critique lors de l\'initialisation:', error);
            
            // Mode dégradé : afficher l'interface même sans données
            this.uiManager.setupEventListeners();
            this.uiManager.loadUserSelector();
            
            if (this.searchFilter && this.searchFilter.initializeFilters) {
                this.searchFilter.initializeFilters();
            }
            
            this.showNotification('⚠️ Mode dégradé activé', 'warning');
        }
    }
    
    // === GESTION PWA ===
    initializePWA() {
        // Service Worker temporairement désactivé pour debug
        console.log('🔧 PWA temporairement désactivé pour debug');
        /*
        // Registration du Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker enregistré');
                    
                    // Écouter les mises à jour
                    registration.addEventListener('updatefound', () => {
                        this.showUpdatePrompt();
                    });
                })
                .catch(error => {
                    console.warn('⚠️ Service Worker échoué:', error);
                });
        }
        */
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
        
        // Initialiser les filtres si disponible
        if (this.searchFilter && this.searchFilter.populateFilterOptions) {
            this.searchFilter.populateFilterOptions();
        }
        
        // Émettre événement personnalisé
        this.emit('dataLoaded', { totalPlaces: this.dataManager.getTotalPlaces() });
        
        this.showNotification('🗼 Trésors parisiens chargés avec succès!', 'success');
    }
    
    onUserChanged(user) {
        this.currentUser = user;
        this.clearCache();
        this.uiManager.renderContent();
        this.uiManager.updateStats();
        
        if (this.currentTab === 'map' && this.mapManager) {
            this.mapManager.updateMarkers();
        }
        
        this.emit('userChanged', { user });
        
        if (user) {
            this.showNotification(`👤 Basculé vers ${user.name}`, 'info');
        }
    }
    
    // === GESTION DES ÉVÉNEMENTS GLOBAUX ===
    setupGlobalEventListeners() {
        // Onglets
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
        
        // Recherche globale
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }
        });
        
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                switch (e.key) {
                    case '1': this.switchTab('list'); break;
                    case '2': this.switchTab('map'); break;
                    case '3': this.switchTab('favorites'); break;
                    case '4': this.switchTab('collections'); break;
                    case '5': this.switchTab('achievements'); break;
                    case '6': this.switchTab('stats'); break;
                }
            }
        });
    }
    
    // === GESTION DES ONGLETS ===
    switchTab(tabName) {
        if (this.currentTab === tabName) return;
        
        // Cacher tous les onglets
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Afficher l'onglet sélectionné
        const targetTab = document.getElementById(tabName + 'Tab');
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (targetTab) targetTab.classList.add('active');
        if (targetBtn) targetBtn.classList.add('active');
        
        this.currentTab = tabName;
        
        // Actions spécifiques par onglet
        switch (tabName) {
            case 'map':
                if (this.mapManager) {
                    setTimeout(() => this.mapManager.initializeMap(), 100);
                }
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
                this.uiManager.renderStats();
                break;
            default:
                this.uiManager.renderContent();
        }
        
        this.emit('tabChanged', { tab: tabName });
    }
    
    // === SYSTÈME D'ÉVÉNEMENTS ===
    emit(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        this.eventBus.dispatchEvent(event);
    }
    
    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }
    
    off(eventName, callback) {
        this.eventBus.removeEventListener(eventName, callback);
    }
    
    // === NOTIFICATIONS ===
    showNotification(message, type = 'info', duration = 4000, actions = []) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
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
        return this.userManager.users; // Array maintenant
    }
    
    createPlaceId(arrKey, catKey, placeName) {
        return `${arrKey}-${catKey}-${placeName}`
            .replace(/['"]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
    }
    
    // === CACHE ET PERFORMANCE ===
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache vidé');
    }
    
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.config.performance.cacheExpiry) {
            return cached.data;
        }
        return null;
    }
    
    setCachedData(key, data) {
        if (this.cache.size >= this.config.performance.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    // === DEBOUNCE ===
    debounce(func, key, delay = null) {
        const debounceDelay = delay || this.config.performance.debounceDelay;
        
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(func, debounceDelay);
        this.debounceTimers.set(key, timer);
    }
    
    // === VÉRIFICATIONS ET MISES À JOUR ===
    checkForUpdates() {
        // Vérifier si une nouvelle version est disponible
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
        }
    }
}

// === INITIALISATION GLOBALE ===
let app;

document.addEventListener('DOMContentLoaded', () => {
    try {
        app = new ParisExplorerAdvanced();
        window.parisApp = app; // Exposition globale pour debug
    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: red;">
                <h2>⚠️ Erreur de chargement</h2>
                <p>Une erreur critique s'est produite. Veuillez recharger la page.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">🔄 Recharger</button>
            </div>
        `;
    }
});
