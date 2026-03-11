// ===== PARIS EXPLORER - APPLICATION PRINCIPALE CORRIGÉE =====

class ParisExplorerApp {
    constructor() {
        // Configuration et état
        this.version = '2.0.1';
        this.config = {};
        this.isDataLoaded = false;
        this.parisData = {};
        this.currentTab = 'list';
        this.searchQuery = '';
        this.currentUser = null;
        
        // Managers
        this.dataManager = new DataManager(this);
        this.userManager = new UserManager(this);
        this.uiManager = new UIManager(this);
        this.mapManager = new MapManager(this);
        this.searchFilter = new SearchFilter(this);
        this.exportImport = new ExportImport(this);
        
        // Rendre le MapManager accessible globalement pour les interactions sur la carte
        window.mapManager = this.mapManager;
        
        // États d'initialisation
        this.initializationSteps = {
            config: false,
            users: false,
            data: false,
            ui: false,
            complete: false
        };
    }
    
    // === INITIALISATION PRINCIPALE ===
    async init() {
        console.log(`🗼 Initialisation Paris Explorer v${this.version}`);
        console.log('📅 Démarrage:', new Date().toLocaleString('fr-FR'));
        
        try {
            // Étape 1: Configuration
            this.showGlobalLoading('Chargement de la configuration...');
            await this.loadConfig();
            this.initializationSteps.config = true;
            
            // Étape 2: Utilisateurs
            this.showGlobalLoading('Chargement des utilisateurs...');
            this.userManager.loadUsers();
            await this.userManager.migrateFromLegacyFormat();
            this.initializationSteps.users = true;
            
            // Étape 3: Données Paris - FORCER LE CHARGEMENT COMPLET
            this.showGlobalLoading('Chargement complet des données parisiennes...');
            const dataLoaded = await this.dataManager.loadParisData();
            this.initializationSteps.data = dataLoaded;
            
            if (dataLoaded) {
                const totalLieux = this.dataManager.getTotalPlaces();
                console.log(`📊 ${totalLieux} lieux chargés au total`);
                
                if (totalLieux < 1000) {
                    console.warn(`⚠️ Seulement ${totalLieux} lieux - données possiblement incomplètes`);
                    this.showNotification(`⚠️ ${totalLieux} lieux chargés (vérifiez les données)`, 'warning');
                } else {
                    console.log(`✅ Chargement réussi : ${totalLieux} lieux disponibles`);
                }
            }
            
            // Étape 4: Interface utilisateur
            this.showGlobalLoading('Initialisation de l\'interface...');
            this.uiManager.setupEventListeners();
            this.uiManager.loadUserSelector();
            this.searchFilter.initializeFilters();
            this.initializationSteps.ui = true;
            
            // Étape 5: Sélection utilisateur
            this.showGlobalLoading('Configuration utilisateur...');
            this.userManager.autoSelectUser();
            
            // Étape 6: PWA et événements globaux
            this.initializePWA();
            this.setupGlobalEventListeners();
            
            // Finalisation
            this.hideGlobalLoading();
            this.initializationSteps.complete = true;
            
            console.log('✅ Initialisation terminée avec succès');
            console.log('📊 État de l\'application:', this.getAppStatus());
            
            // Notification de succès
            const totalLieux = this.dataManager.getTotalPlaces();
            // Application prête
            
            // Vérifier les achievements au démarrage
            setTimeout(() => {
                if (this.userManager.getCurrentUserData()) {
                    this.userManager.checkAchievements();
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Erreur critique lors de l\'initialisation:', error);
            this.handleInitializationError(error);
        }
    }
    
    // === CHARGEMENT DE LA CONFIGURATION ===
    async loadConfig() {
        try {
            const response = await fetch('config.js');
            if (response.ok) {
                const configText = await response.text();
                // Enlever les commentaires et parser le JSON
                const cleanConfig = configText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
                this.config = JSON.parse(cleanConfig);
                console.log('⚙️ Configuration chargée');
            } else {
                throw new Error('Configuration introuvable');
            }
        } catch (error) {
            console.warn('⚠️ Configuration par défaut utilisée');
            this.config = this.getDefaultConfig();
        }
    }
    
    getDefaultConfig() {
        return {
            app: {
                name: "Paris Explorer",
                version: this.version,
                theme: "paris-classic"
            },
            features: {
                search: { maxResults: 500 },
                map: { enabled: true },
                notifications: { enabled: true }
            },
            ui: {
                itemsPerPage: 50,
                defaultView: "list"
            }
        };
    }
    
    // === GESTION D'ERREUR D'INITIALISATION ===
    handleInitializationError(error) {
        this.hideGlobalLoading();
        
        // Mode dégradé : afficher l'interface même en cas d'erreur
        console.log('🚨 Activation du mode dégradé');
        
        try {
            // Essayer d'initialiser l'interface minimale
            this.uiManager.setupEventListeners();
            this.uiManager.loadUserSelector();
            this.searchFilter.initializeFilters();
            
            // Message d'erreur persistant
            this.showNotification(
                '⚠️ Erreur d\'initialisation - Mode dégradé activé', 
                'error', 
                0, // Persistant
                [
                    { label: 'Recharger', onclick: 'location.reload()' },
                    { label: 'Continuer', onclick: 'this.parentElement.parentElement.remove()' }
                ]
            );
            
            // Interface d'erreur dans le contenu principal
            const mainContent = document.querySelector('.tab-content.active');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="error-container">
                        <h3>🚨 Erreur d'initialisation</h3>
                        <p>L'application n'a pas pu se charger complètement.</p>
                        <p><strong>Erreur:</strong> ${error.message}</p>
                        <div class="error-actions">
                            <button class="btn btn-primary" onclick="location.reload()">🔄 Recharger la page</button>
                            <button class="btn btn-secondary" onclick="app.loadFallbackData()">📋 Données minimales</button>
                        </div>
                    </div>
                `;
            }
            
        } catch (uiError) {
            console.error('❌ Erreur critique UI:', uiError);
            document.body.innerHTML = `
                <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
                    <h1>🚨 Erreur Critique</h1>
                    <p>L'application ne peut pas démarrer.</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px;">🔄 Recharger</button>
                </div>
            `;
        }
    }
    
    // === DONNÉES DE SECOURS ===
    loadFallbackData() {
        console.log('🆘 Chargement des données de secours...');
        
        this.dataManager.loadFallbackData();
        this.uiManager.renderContent();
        
        // Données minimales chargées
    }
    
    // === PWA ===
    initializePWA() {
        if ('serviceWorker' in navigator) {
            console.log('🔧 Initialisation du Service Worker PWA...');
            
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('✅ Service Worker enregistré');
                        
                        registration.addEventListener('updatefound', () => {
                            console.log('🆕 Mise à jour disponible');
                            this.showNotification(
                                '🆕 Une mise à jour est disponible', 
                                'info', 
                                0,
                                [{ label: 'Actualiser', onclick: 'location.reload()' }]
                            );
                        });
                    })
                    .catch(error => {
                        console.warn('⚠️ Service Worker non disponible:', error);
                    });
            });
        }
        
        // Installation PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📱 PWA installable détectée');
            e.preventDefault();
            
            this.showNotification(
                '📱 Installer Paris Explorer comme application ?', 
                'info', 
                10000,
                [
                    { 
                        label: 'Installer', 
                        onclick: `
                            e.prompt();
                            e.userChoice.then((choiceResult) => {
                                console.log(choiceResult.outcome === 'accepted' ? '✅ PWA installée' : '❌ Installation annulée');
                            });
                            this.parentElement.parentElement.remove();
                        `
                    },
                    { label: 'Plus tard', onclick: 'this.parentElement.parentElement.remove()' }
                ]
            );
        });
    }
    
    // === ÉVÉNEMENTS GLOBAUX ===
    setupGlobalEventListeners() {
        // Gestion des erreurs JavaScript
        window.addEventListener('error', (event) => {
            console.error('❌ Erreur JavaScript:', event.error);
            this.showNotification('Une erreur inattendue s\'est produite', 'error');
        });
        
        // Gestion des erreurs de ressources
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Promise rejetée:', event.reason);
            event.preventDefault();
        });
        
        // Gestion de la connexion
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie');
            // Connexion internet rétablie
        });
        
        window.addEventListener('offline', () => {
            console.log('📵 Connexion perdue');
            // Fonctionnement hors ligne activé
        });
        
        // Gestion du redimensionnement pour la carte
        window.addEventListener('resize', () => {
            if (this.mapManager.map && this.currentTab === 'map') {
                setTimeout(() => {
                    this.mapManager.map.invalidateSize();
                }, 100);
            }
        });
        
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K : Focus sur la recherche
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Échap : Nettoyer la recherche
            if (e.key === 'Escape') {
                const searchInput = document.getElementById('searchInput');
                if (searchInput && searchInput.value) {
                    searchInput.value = '';
                    this.searchQuery = '';
                    this.uiManager.renderContent();
                }
            }
        });
        
        console.log('⚙️ Événements globaux configurés');
    }
    
    // === SYSTÈME DE NOTIFICATIONS ===
    showNotification(message, type = 'info', duration = 3000, actions = []) {
        // Respect user notification preference (always show errors)
        if (type !== 'error') {
            const userData = this.getCurrentUserData();
            if (userData && userData.settings && userData.settings.notifications === false) {
                console.log(`📢 Notification supprimée (préférence): ${message}`);
                return;
            }
        }

        console.log(`📢 Notification ${type}:`, message);

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        // Escape message for XSS protection
        const safeMessage = escapeHtml(message);

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getNotificationIcon(type)}</div>
                <div class="notification-message">${safeMessage}</div>
                ${actions.length > 0 ? `
                    <div class="notification-actions">
                        ${actions.map(action => `
                            <button class="notification-btn">${escapeHtml(action.label)}</button>
                        `).join('')}
                    </div>
                ` : ''}
                <button class="notification-close">×</button>
            </div>
        `;

        // Event delegation for notification buttons
        notification.querySelector('.notification-close').onclick = () => notification.remove();
        if (actions.length > 0) {
            const btns = notification.querySelectorAll('.notification-btn');
            actions.forEach((action, i) => {
                if (btns[i] && typeof action.onclick === 'function') {
                    btns[i].onclick = action.onclick;
                }
            });
        }
        
        // Container des notifications
        let container = document.getElementById('notificationsContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationsContainer';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Suppression automatique
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
        
        // Limiter le nombre de notifications
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
        let loading = document.getElementById('globalLoading');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'globalLoading';
            loading.className = 'global-loading';
            loading.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>Chargement...</p>
                </div>
            `;
            document.body.appendChild(loading);
        }
        
        loading.querySelector('p').textContent = message;
        loading.style.display = 'flex';
    }
    
    hideGlobalLoading() {
        const loading = document.getElementById('globalLoading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    
    // === UTILITAIRES ===
    getCurrentUserData() {
        return this.userManager.getCurrentUserData();
    }
    
    getUsers() {
        return this.userManager.users;
    }
    
    createPlaceId(arrKey, catKey, placeName) {
        return this.dataManager.createPlaceId(arrKey, catKey, placeName);
    }
    
    // === DIAGNOSTIC ===
    getAppStatus() {
        return {
            version: this.version,
            initialized: this.initializationSteps.complete,
            dataLoaded: this.isDataLoaded,
            totalPlaces: this.dataManager.getTotalPlaces(),
            currentUser: this.userManager.getCurrentUserName(),
            totalUsers: Object.keys(this.userManager.users).length,
            currentTab: this.currentTab,
            mapReady: this.mapManager.isInitialized()
        };
    }
    
    // === MÉTHODES DE DEBUG ===
    debug() {
        console.group('🔍 Debug Paris Explorer');
        console.log('État app:', this.getAppStatus());
        console.log('Données Paris:', Object.keys(this.parisData));
        console.log('Utilisateurs:', Object.keys(this.userManager.users));
        console.log('Configuration:', this.config);
        console.groupEnd();
        
        return this.getAppStatus();
    }
    
    // === VÉRIFICATIONS ===
    checkForUpdates() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
        }
    }
    
    // === MÉTHODES PUBLIQUES ===
    reload() {
        console.log('🔄 Rechargement de l\'application...');
        this.showGlobalLoading('Rechargement en cours...');
        
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
    
    switchTab(tabName) {
        this.currentTab = tabName;
        this.uiManager.switchTab(tabName);
    }
    
    // === GESTION D'URGENCE ===
    emergencyReset() {
        if (confirm('⚠️ Réinitialiser complètement l\'application ? Toutes les données seront perdues !')) {
            console.log('🚨 Réinitialisation d\'urgence');
            
            // Nettoyer le localStorage
            Object.values(this.userManager.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Nettoyer autres données
            localStorage.removeItem('paris-explorer-cache');
            localStorage.removeItem('paris-explorer-settings');
            
            this.showNotification('🚨 Réinitialisation effectuée - Rechargement...', 'warning');
            
            setTimeout(() => {
                location.reload();
            }, 2000);
        }
    }
    
    // === VALIDATION DES COORDONNÉES ===
    validateAllCoordinates() {
        if (!this.isDataLoaded) {
            console.warn('⚠️ Données non chargées');
            return;
        }
        
        console.group('📍 Validation des coordonnées');
        let totalPlaces = 0;
        let placesWithCoords = 0;
        let validCoords = 0;
        let invalidCoords = [];
        
        Object.entries(this.parisData).forEach(([arrKey, arrData]) => {
            const categories = arrData?.categories || arrData?.arrondissement?.categories || {};
            
            Object.entries(categories).forEach(([catKey, catData]) => {
                (catData.places || []).forEach(place => {
                    totalPlaces++;
                    
                    if (place.coordinates) {
                        placesWithCoords++;
                        const validation = validateAndSuggestCoordinates(place.coordinates, place.name);
                        
                        if (validation.isValid) {
                            validCoords++;
                        } else {
                            invalidCoords.push({
                                arrondissement: arrKey,
                                lieu: place.name,
                                coords: place.coordinates,
                                probleme: validation.suggestion
                            });
                        }
                    }
                });
            });
        });
        
        console.log(`📊 Total des lieux: ${totalPlaces}`);
        console.log(`📍 Lieux avec coordonnées: ${placesWithCoords} (${Math.round(placesWithCoords/totalPlaces*100)}%)`);
        console.log(`✅ Coordonnées valides: ${validCoords} (${Math.round(validCoords/placesWithCoords*100)}%)`);
        console.log(`❌ Coordonnées invalides: ${invalidCoords.length}`);
        
        if (invalidCoords.length > 0) {
            console.group('❌ Coordonnées problématiques:');
            invalidCoords.forEach(item => {
                console.warn(`${item.arrondissement} - ${item.lieu}: ${item.probleme}`);
            });
            console.groupEnd();
        } else {
            console.log('🎉 Toutes les coordonnées sont valides !');
        }
        
        console.groupEnd();
        return { totalPlaces, placesWithCoords, validCoords, invalidCoords };
    }
}

// === INITIALISATION AUTOMATIQUE ===
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM chargé, démarrage de Paris Explorer...');
    
    // Créer l'instance globale
    window.app = new ParisExplorerApp();
    
    // Démarrer l'initialisation
    app.init().catch(error => {
        console.error('❌ Échec de l\'initialisation:', error);
    });
});

// === EXPOSITION GLOBALE POUR DEBUGGING ===
window.ParisExplorer = {
    version: '2.0.1',
    debug: () => window.app ? window.app.debug() : 'App non initialisée',
    reload: () => window.app ? window.app.reload() : location.reload(),
    reset: () => window.app ? window.app.emergencyReset() : null,
    status: () => window.app ? window.app.getAppStatus() : 'App non initialisée',
    validateCoords: () => window.app ? window.app.validateAllCoordinates() : 'App non initialisée'
};

console.log('🗼 Paris Explorer 2.0.1 - Prêt pour l\'initialisation');
console.log('💻 Debug disponible via:', Object.keys(window.ParisExplorer));
