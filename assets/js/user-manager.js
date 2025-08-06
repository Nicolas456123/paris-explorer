// ===== USER MANAGER - VERSION CORRIGÉE COMPLÈTE =====

class UserManager {
    constructor(app) {
        this.app = app;
        this.users = {};
        this.currentUser = null;
        this.storageKeys = {
            progress: 'paris-explorer-progress',
            favorites: 'paris-explorer-favorites', 
            notes: 'paris-explorer-notes',
            settings: 'paris-explorer-settings',
            collections: 'paris-explorer-collections',
            achievements: 'paris-explorer-achievements'
        };
        this.achievements = this.initAchievements();
    }
    
    // === SYSTÈME D'ACHIEVEMENTS ===
    initAchievements() {
        return {
            first_visit: {
                title: "Premier Pas",
                description: "Visitez votre premier lieu parisien",
                icon: "👶",
                condition: (userData) => userData.visitedPlaces.size >= 1
            },
            explorer: {
                title: "Explorateur",
                description: "Visitez 10 lieux différents",
                icon: "🚶",
                condition: (userData) => userData.visitedPlaces.size >= 10
            },
            discoverer: {
                title: "Découvreur",
                description: "Visitez 25 lieux différents", 
                icon: "🔍",
                condition: (userData) => userData.visitedPlaces.size >= 25
            },
            adventurer: {
                title: "Aventurier",
                description: "Visitez 50 lieux différents",
                icon: "🎒",
                condition: (userData) => userData.visitedPlaces.size >= 50
            },
            master: {
                title: "Maître Explorateur",
                description: "Visitez 100 lieux différents",
                icon: "👑", 
                condition: (userData) => userData.visitedPlaces.size >= 100
            },
            collector: {
                title: "Collectionneur",
                description: "Ajoutez 10 lieux aux favoris",
                icon: "⭐",
                condition: (userData) => userData.favorites.length >= 10
            },
            arrondissement_master: {
                title: "Maître d'Arrondissement",
                description: "Visitez tous les lieux d'un arrondissement",
                icon: "🏛️",
                condition: (userData) => this.hasCompletedArrondissement(userData)
            },
            paris_master: {
                title: "Maître de Paris",
                description: "Visitez au moins un lieu dans chaque arrondissement",
                icon: "🗼",
                condition: (userData) => this.hasVisitedAllArrondissements(userData)
            }
        };
    }
    
    // === CHARGEMENT DES UTILISATEURS ===
    loadUsers() {
        console.log('👤 Chargement des utilisateurs...');
        
        try {
            // Chargement modulaire
            Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
                const data = localStorage.getItem(storageKey);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`✅ ${key} chargé:`, Object.keys(parsed).length, 'utilisateurs');
                    } catch (error) {
                        console.warn(`⚠️ Erreur parsing ${key}:`, error);
                    }
                }
            });
            
            // Construire la structure des utilisateurs
            this.buildUserStructure();
            
            console.log(`👥 ${Object.keys(this.users).length} utilisateurs chargés`);
            
        } catch (error) {
            console.error('❌ Erreur chargement utilisateurs:', error);
            this.users = {};
        }
    }
    
    buildUserStructure() {
        this.users = {};
        
        // Charger la progression pour obtenir la liste des utilisateurs
        const progressData = this.loadUserData('progress');
        
        Object.keys(progressData || {}).forEach(userName => {
            this.users[userName] = {
                name: userName,
                visitedPlaces: new Set(progressData[userName]?.visitedPlaces || []),
                favorites: this.loadUserData('favorites')[userName] || [],
                notes: this.loadUserData('notes')[userName] || {},
                settings: this.loadUserData('settings')[userName] || this.getDefaultSettings(),
                collections: this.loadUserData('collections')[userName] || {},
                achievements: this.loadUserData('achievements')[userName] || {},
                stats: {
                    totalVisited: progressData[userName]?.visitedPlaces?.length || 0,
                    createdAt: progressData[userName]?.createdAt || new Date().toISOString(),
                    lastActivity: progressData[userName]?.lastActivity || new Date().toISOString()
                }
            };
        });
    }
    
    // === CRÉATION D'UTILISATEUR ===
    createUser(userName) {
        if (!userName || userName.trim().length === 0) {
            this.app.showNotification('Le nom d\'utilisateur ne peut pas être vide', 'error');
            return false;
        }
        
        userName = userName.trim();
        
        if (this.users[userName]) {
            this.app.showNotification('Cet utilisateur existe déjà', 'warning');
            return false;
        }
        
        console.log(`👤 Création de l'utilisateur: ${userName}`);
        
        const newUser = {
            name: userName,
            visitedPlaces: new Set(),
            favorites: [],
            notes: {},
            settings: this.getDefaultSettings(),
            collections: {},
            achievements: {},
            stats: {
                totalVisited: 0,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            }
        };
        
        this.users[userName] = newUser;
        this.saveUsers();
        
        this.app.showNotification(`Utilisateur "${userName}" créé avec succès!`, 'success');
        console.log('✅ Utilisateur créé');
        
        return true;
    }
    
    // === PARAMÈTRES PAR DÉFAUT ===
    getDefaultSettings() {
        return {
            theme: 'paris-classic',
            compactMode: false,
            animations: true,
            notifications: true,
            language: 'fr-FR',
            mapStyle: 'standard',
            highContrast: false,
            autoSave: true,
            showCompletedByDefault: false,
            defaultView: 'list'
        };
    }
    
    // === SÉLECTION D'UTILISATEUR ===
    selectUser(userName) {
        if (!userName || !this.users[userName]) {
            console.warn('⚠️ Utilisateur introuvable:', userName);
            return false;
        }
        
        this.currentUser = userName;
        console.log(`👤 Utilisateur sélectionné: ${userName}`);
        
        // Appliquer les paramètres de l'utilisateur
        this.applySettings();
        
        // Mettre à jour l'interface
        this.app.uiManager.renderContent();
        
        // Notification
        this.app.showNotification(`Bienvenue ${userName}!`, 'success', 2000);
        
        return true;
    }
    
    // === SÉLECTION AUTOMATIQUE ===
    autoSelectUser() {
        const userNames = Object.keys(this.users);
        
        if (userNames.length === 0) {
            console.log('👤 Aucun utilisateur, création automatique...');
            this.app.uiManager.switchTab('users');
            return;
        }
        
        if (userNames.length === 1) {
            console.log('👤 Sélection automatique du seul utilisateur');
            this.selectUser(userNames[0]);
            return;
        }
        
        // Sélectionner le dernier utilisateur actif
        const lastActiveUser = userNames.reduce((latest, current) => {
            const currentActivity = this.users[current].stats.lastActivity;
            const latestActivity = this.users[latest].stats.lastActivity;
            return currentActivity > latestActivity ? current : latest;
        });
        
        console.log('👤 Sélection de l\'utilisateur le plus récent:', lastActiveUser);
        this.selectUser(lastActiveUser);
    }
    
    // === APPLICATION DES PARAMÈTRES ===
    applySettings() {
        const userData = this.getCurrentUserData();
        if (!userData?.settings) {
            console.warn('⚠️ Aucun paramètre utilisateur, application des paramètres par défaut');
            this.applyDefaultSettings();
            return;
        }
        
        const settings = userData.settings;
        console.log('🎨 Application des paramètres utilisateur:', settings);
        
        // 1. APPLICATION DU THÈME
        this.applyTheme(settings.theme || 'paris-classic');
        
        // 2. MODE COMPACT
        if (settings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
        
        // 3. ANIMATIONS
        if (settings.animations === false) {
            document.body.classList.add('no-animations');
        } else {
            document.body.classList.remove('no-animations');
        }
        
        // 4. CONTRASTE ÉLEVÉ
        if (settings.highContrast) {
            document.documentElement.setAttribute('data-theme', 'high-contrast');
        }
        
        console.log('✅ Paramètres appliqués avec succès');
    }
    
    // === APPLICATION DES THÈMES ===
    applyTheme(themeName) {
        console.log(`🎨 Application du thème: ${themeName}`);
        
        // Retirer tous les thèmes existants
        const themeAttributes = ['data-theme', 'data-season'];
        themeAttributes.forEach(attr => {
            document.documentElement.removeAttribute(attr);
        });
        
        // Retirer toutes les classes de thème du body
        document.body.classList.remove('dark-mode', 'light-mode', 'high-contrast-mode');
        
        // Appliquer le nouveau thème
        switch(themeName) {
            case 'dark':
            case 'paris-dark':
                document.documentElement.setAttribute('data-theme', 'dark');
                document.body.classList.add('dark-mode');
                console.log('🌙 Thème sombre appliqué');
                break;
                
            case 'versailles':
                document.documentElement.setAttribute('data-theme', 'versailles');
                console.log('👑 Thème Versailles appliqué');
                break;
                
            case 'montmartre':
                document.documentElement.setAttribute('data-theme', 'montmartre');
                console.log('🎨 Thème Montmartre appliqué');
                break;
                
            case 'saint-germain':
                document.documentElement.setAttribute('data-theme', 'saint-germain');
                console.log('🌿 Thème Saint-Germain appliqué');
                break;
                
            case 'marais':
                document.documentElement.setAttribute('data-theme', 'marais');
                console.log('🏛️ Thème Marais appliqué');
                break;
                
            case 'haute-couture':
                document.documentElement.setAttribute('data-theme', 'haute-couture');
                console.log('👗 Thème Haute Couture appliqué');
                break;
                
            case 'high-contrast':
                document.documentElement.setAttribute('data-theme', 'high-contrast');
                document.body.classList.add('high-contrast-mode');
                console.log('🔲 Thème contraste élevé appliqué');
                break;
                
            case 'auto':
                this.applySeasonalTheme();
                console.log('🍂 Thème automatique saisonnier appliqué');
                break;
                
            default:
            case 'paris-classic':
                // Thème par défaut - pas besoin d'attributs spéciaux
                document.body.classList.add('light-mode');
                console.log('☀️ Thème classique appliqué');
                break;
        }
        
        // Déclencher l'animation de transition
        document.body.classList.add('theme-transition');
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 600);
    }
    
    // === THÈME SAISONNIER ===
    applySeasonalTheme() {
        const month = new Date().getMonth();
        let season = 'spring';
        
        if (month >= 2 && month <= 4) season = 'spring';      // Mar-Mai
        else if (month >= 5 && month <= 7) season = 'summer'; // Jun-Août
        else if (month >= 8 && month <= 10) season = 'autumn'; // Sep-Nov
        else season = 'winter';                                // Déc-Fév
        
        document.documentElement.setAttribute('data-theme', 'auto');
        document.documentElement.setAttribute('data-season', season);
        console.log(`🍂 Saison automatique: ${season}`);
    }
    
    // === PARAMÈTRES PAR DÉFAUT ===
    applyDefaultSettings() {
        const defaultSettings = {
            theme: 'paris-classic',
            compactMode: false,
            animations: true,
            notifications: true,
            highContrast: false
        };
        
        console.log('🔧 Application des paramètres par défaut');
        this.applyTheme(defaultSettings.theme);
        
        document.body.classList.remove('compact-mode', 'no-animations', 'high-contrast-mode');
        document.body.classList.add('light-mode');
    }
    
    // === MISE À JOUR DES PARAMÈTRES ===
    updateSetting(key, value) {
        const userData = this.getCurrentUserData();
        if (!userData) {
            console.warn('⚠️ Aucun utilisateur pour mettre à jour les paramètres');
            return;
        }
        
        // Initialiser settings si nécessaire
        if (!userData.settings) {
            userData.settings = this.getDefaultSettings();
        }
        
        // Mettre à jour la valeur
        userData.settings[key] = value;
        this.saveUsers();
        
        console.log(`⚙️ Paramètre ${key} mis à jour:`, value);
        
        // Appliquer immédiatement sans recharger tous les paramètres
        this.applySingleSetting(key, value);
    }
    
    updateSettingAndApply(key, value) {
        const userData = this.getCurrentUserData();
        if (!userData) {
            console.warn('⚠️ Aucun utilisateur pour mettre à jour les paramètres');
            return;
        }
        
        // Initialiser settings si nécessaire
        if (!userData.settings) {
            userData.settings = this.getDefaultSettings();
        }
        
        // Mettre à jour la valeur
        userData.settings[key] = value;
        this.saveUsers();
        
        console.log(`⚙️ Paramètre ${key} mis à jour:`, value);
        
        // Appliquer immédiatement
        this.applySettings();
        
        // Notification de confirmation
        this.app.showNotification(`Paramètre "${key}" mis à jour !`, 'success', 2000);
    }
    
    applySingleSetting(key, value) {
        switch(key) {
            case 'theme':
                this.applyTheme(value);
                break;
            case 'compactMode':
                if (value) {
                    document.body.classList.add('compact-mode');
                } else {
                    document.body.classList.remove('compact-mode');
                }
                break;
            case 'animations':
                if (value === false) {
                    document.body.classList.add('no-animations');
                } else {
                    document.body.classList.remove('no-animations');
                }
                break;
            case 'highContrast':
                if (value) {
                    document.documentElement.setAttribute('data-theme', 'high-contrast');
                    document.body.classList.add('high-contrast-mode');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                    document.body.classList.remove('high-contrast-mode');
                }
                break;
        }
    }
    
    // === RÉINITIALISATION DU THÈME ===
    resetTheme() {
        this.updateSettingAndApply('theme', 'paris-classic');
        this.app.showNotification('Thème réinitialisé au style classique', 'info');
    }
    
    // === GESTION DES VISITES ===
    togglePlaceVisit(arrKey, catKey, placeName) {
        const userData = this.getCurrentUserData();
        if (!userData) return false;
        
        const placeId = this.app.dataManager.createPlaceId(arrKey, catKey, placeName);
        const isCurrentlyVisited = userData.visitedPlaces.has(placeId);
        
        if (isCurrentlyVisited) {
            userData.visitedPlaces.delete(placeId);
            console.log(`❌ Lieu retiré: ${placeName}`);
        } else {
            userData.visitedPlaces.add(placeId);
            console.log(`✅ Lieu ajouté: ${placeName}`);
        }
        
        // Mettre à jour les statistiques
        userData.stats.totalVisited = userData.visitedPlaces.size;
        userData.stats.lastActivity = new Date().toISOString();
        
        // Sauvegarder
        this.saveUsers();
        
        // Vérifier les achievements
        this.checkAchievements();
        
        const action = isCurrentlyVisited ? 'retiré de' : 'ajouté à';
        this.app.showNotification(`${placeName} ${action} vos lieux visités`, 'success');
        
        return !isCurrentlyVisited;
    }
    
    // === GESTION DES FAVORIS ===
    toggleFavorite(arrKey, catKey, placeName) {
        const userData = this.getCurrentUserData();
        if (!userData) return false;
        
        const placeId = this.app.dataManager.createPlaceId(arrKey, catKey, placeName);
        const favoriteIndex = userData.favorites.findIndex(fav => fav.placeId === placeId);
        
        if (favoriteIndex >= 0) {
            userData.favorites.splice(favoriteIndex, 1);
            this.saveUsers();
            this.app.showNotification(`${placeName} retiré des favoris`, 'info');
            return false;
        } else {
            userData.favorites.push({
                placeId,
                placeName,
                arrKey,
                catKey,
                addedAt: new Date().toISOString()
            });
            this.saveUsers();
            this.checkAchievements();
            this.app.showNotification(`${placeName} ajouté aux favoris`, 'success');
            return true;
        }
    }
    
    // === VÉRIFICATION DES ACHIEVEMENTS ===
    checkAchievements() {
        const userData = this.getCurrentUserData();
        if (!userData) return;
        
        Object.entries(this.achievements).forEach(([achievementKey, achievement]) => {
            // Skip si déjà débloqué
            if (userData.achievements[achievementKey]) return;
            
            // Vérifier la condition
            if (achievement.condition(userData)) {
                this.unlockAchievement(achievementKey);
            }
        });
    }
    
    unlockAchievement(achievementKey) {
        const userData = this.getCurrentUserData();
        if (!userData) return;
        
        const achievement = this.achievements[achievementKey];
        if (!achievement || userData.achievements[achievementKey]) return;
        
        userData.achievements[achievementKey] = {
            unlockedAt: new Date().toISOString(),
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon
        };
        
        this.saveUsers();
        
        console.log(`🏆 Achievement débloqué: ${achievement.title}`);
        
        this.app.showNotification(
            `🏆 Achievement débloqué!\n${achievement.title}: ${achievement.description}`, 
            'achievement', 
            5000
        );
    }
    
    // === CONDITIONS D'ACHIEVEMENTS ===
    hasCompletedArrondissement(userData) {
        if (!this.app.isDataLoaded) return false;
        
        return Object.entries(this.app.parisData).some(([arrKey, arrData]) => {
            const totalPlaces = this.app.dataManager.getTotalPlacesInArrondissement(arrData);
            const visitedPlaces = this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey);
            return totalPlaces > 0 && visitedPlaces >= totalPlaces;
        });
    }
    
    hasVisitedAllArrondissements(userData) {
        if (!this.app.isDataLoaded) return false;
        
        const arrondissements = Object.keys(this.app.parisData);
        
        return arrondissements.every(arrKey => {
            const visitedInArr = this.app.dataManager.getVisitedPlacesInArrondissement(this.app.parisData[arrKey], arrKey);
            return visitedInArr > 0;
        });
    }
    
    // === SAUVEGARDE MODULAIRE ===
    saveUsers() {
        try {
            // Préparer les données par module
            const dataByModule = {
                progress: {},
                favorites: {},
                notes: {},
                settings: {},
                collections: {},
                achievements: {}
            };
            
            Object.entries(this.users).forEach(([userName, userData]) => {
                dataByModule.progress[userName] = {
                    visitedPlaces: Array.from(userData.visitedPlaces),
                    createdAt: userData.stats.createdAt,
                    lastActivity: userData.stats.lastActivity
                };
                
                dataByModule.favorites[userName] = userData.favorites;
                dataByModule.notes[userName] = userData.notes;
                dataByModule.settings[userName] = userData.settings;
                dataByModule.collections[userName] = userData.collections;
                dataByModule.achievements[userName] = userData.achievements;
            });
            
            // Sauvegarder chaque module
            Object.entries(dataByModule).forEach(([moduleKey, moduleData]) => {
                const storageKey = this.storageKeys[moduleKey];
                try {
                    localStorage.setItem(storageKey, JSON.stringify(moduleData));
                } catch (error) {
                    console.error(`❌ Erreur sauvegarde ${moduleKey}:`, error);
                }
            });
            
            console.log('💾 Données utilisateurs sauvegardées');
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde globale:', error);
            this.app.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }
    
    // === CHARGEMENT MODULAIRE ===
    loadUserData(moduleKey) {
        const storageKey = this.storageKeys[moduleKey];
        try {
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error(`❌ Erreur chargement ${moduleKey}:`, error);
            return {};
        }
    }
    
    // === UTILITAIRES ===
    getCurrentUserData() {
        return this.currentUser ? this.users[this.currentUser] : null;
    }
    
    getCurrentUserName() {
        return this.currentUser;
    }
    
    deleteUser(userName) {
        if (!this.users[userName]) {
            this.app.showNotification('Utilisateur introuvable', 'error');
            return false;
        }
        
        delete this.users[userName];
        this.saveUsers();
        
        if (this.currentUser === userName) {
            this.currentUser = null;
            this.autoSelectUser();
        }
        
        this.app.showNotification(`Utilisateur "${userName}" supprimé`, 'success');
        console.log(`🗑️ Utilisateur ${userName} supprimé`);
        
        return true;
    }
    
    // === RESET ET EXPORT ===
    resetUserProgress() {
        const userData = this.getCurrentUserData();
        if (!userData) return;
        
        if (confirm('Êtes-vous sûr de vouloir réinitialiser votre progression ?')) {
            userData.visitedPlaces.clear();
            userData.favorites = [];
            userData.achievements = {};
            userData.stats.totalVisited = 0;
            userData.stats.lastActivity = new Date().toISOString();
            
            this.saveUsers();
            this.app.uiManager.renderContent();
            this.app.showNotification('Progression réinitialisée', 'success');
        }
    }
    
    exportUserData(userName) {
        const userData = this.users[userName];
        if (!userData) return null;
        
        const exportData = {
            name: userName,
            visitedPlaces: Array.from(userData.visitedPlaces),
            favorites: userData.favorites,
            notes: userData.notes,
            settings: userData.settings,
            collections: userData.collections,
            achievements: userData.achievements,
            stats: userData.stats,
            exportedAt: new Date().toISOString(),
            version: '2.0.0'
        };
        
        return exportData;
    }
    
    // === MIGRATION ===
    async migrateFromLegacyFormat() {
        console.log('🔄 Vérification migration legacy...');
        
        // Vérifier s'il y a des données dans l'ancien format
        const legacyData = localStorage.getItem('paris-explorer-users');
        if (!legacyData) {
            console.log('✅ Pas de données legacy à migrer');
            return;
        }
        
        try {
            const oldUsers = JSON.parse(legacyData);
            console.log('📦 Migration des données legacy...');
            
            Object.entries(oldUsers).forEach(([userName, oldUserData]) => {
                this.users[userName] = {
                    name: userName,
                    visitedPlaces: new Set(oldUserData.visitedPlaces || []),
                    favorites: oldUserData.favorites || [],
                    notes: oldUserData.notes || {},
                    settings: oldUserData.settings || this.getDefaultSettings(),
                    collections: oldUserData.collections || {},
                    achievements: oldUserData.achievements || {},
                    stats: {
                        totalVisited: oldUserData.visitedPlaces?.length || 0,
                        createdAt: oldUserData.createdAt || new Date().toISOString(),
                        lastActivity: new Date().toISOString()
                    }
                };
            });
            
            // Sauvegarder dans le nouveau format
            this.saveUsers();
            
            // Supprimer l'ancien format
            localStorage.removeItem('paris-explorer-users');
            
            console.log('✅ Migration terminée');
            this.app.showNotification('Données migrées vers le nouveau format', 'success');
            
        } catch (error) {
            console.error('❌ Erreur migration legacy:', error);
        }
    }
}
