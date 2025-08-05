// ===== USER MANAGER AVANCÉ - SYSTÈME MODULAIRE COMPLET =====

class UserManager {
    constructor(app) {
        this.app = app;
        this.users = {};
        
        // Clés de stockage modulaires
        this.storageKeys = {
            progress: 'paris-explorer-progress',
            favorites: 'paris-explorer-favorites',
            notes: 'paris-explorer-notes',
            settings: 'paris-explorer-settings',
            collections: 'paris-explorer-collections',
            achievements: 'paris-explorer-achievements'
        };
        
        // Cache pour les performances
        this.cache = {
            userStats: new Map(),
            achievements: new Map()
        };
    }
    
    // === CHARGEMENT MODULAIRE ===
    loadUsers() {
        console.log('📥 Chargement modulaire des utilisateurs...');
        
        try {
            // Charger chaque module séparément
            const progress = this.loadUserData('progress') || {};
            const favorites = this.loadUserData('favorites') || {};
            const notes = this.loadUserData('notes') || {};
            const settings = this.loadUserData('settings') || {};
            const collections = this.loadUserData('collections') || {};
            const achievements = this.loadUserData('achievements') || {};
            
            // Reconstituer les utilisateurs
            const allUserNames = new Set([
                ...Object.keys(progress),
                ...Object.keys(favorites),
                ...Object.keys(notes),
                ...Object.keys(settings),
                ...Object.keys(collections)
            ]);
            
            this.users = {};
            
            allUserNames.forEach(userName => {
                this.users[userName] = {
                    name: userName,
                    
                    // Module Progression
                    visitedPlaces: new Set(progress[userName]?.visitedPlaces || []),
                    stats: { ...this.getDefaultStats(), ...(progress[userName]?.stats || {}) },
                    
                    // Module Favoris  
                    favorites: new Set(favorites[userName] || []),
                    
                    // Module Notes
                    notes: notes[userName] || {},
                    
                    // Module Paramètres
                    settings: { ...this.getDefaultSettings(), ...(settings[userName] || {}) },
                    
                    // Module Collections
                    collections: collections[userName] || {},
                    
                    // Module Achievements
                    achievements: achievements[userName] || {},
                    
                    // Métadonnées
                    createdAt: progress[userName]?.createdAt || new Date().toISOString(),
                    lastActive: progress[userName]?.lastActive || new Date().toISOString()
                };
            });
            
            console.log(`✅ ${Object.keys(this.users).length} utilisateurs chargés (modulaire)`);
            
        } catch (error) {
            console.error('❌ Erreur chargement modulaire:', error);
            this.users = {};
        }
    }
    
    // === SAUVEGARDE MODULAIRE ===
    saveUsers() {
        try {
            const modules = {
                progress: {},
                favorites: {},
                notes: {},
                settings: {},
                collections: {},
                achievements: {}
            };
            
            Object.entries(this.users).forEach(([name, user]) => {
                // Module Progression
                modules.progress[name] = {
                    visitedPlaces: Array.from(user.visitedPlaces),
                    stats: user.stats,
                    createdAt: user.createdAt,
                    lastActive: user.lastActive
                };
                
                // Module Favoris (seulement si non vide)
                if (user.favorites && user.favorites.size > 0) {
                    modules.favorites[name] = Array.from(user.favorites);
                }
                
                // Module Notes (seulement si non vide)
                if (user.notes && Object.keys(user.notes).length > 0) {
                    modules.notes[name] = user.notes;
                }
                
                // Module Paramètres
                modules.settings[name] = user.settings;
                
                // Module Collections (seulement si non vide)
                if (user.collections && Object.keys(user.collections).length > 0) {
                    modules.collections[name] = user.collections;
                }
                
                // Module Achievements (seulement si non vide)
                if (user.achievements && Object.keys(user.achievements).length > 0) {
                    modules.achievements[name] = user.achievements;
                }
            });
            
            // Sauvegarder chaque module
            Object.entries(modules).forEach(([moduleType, data]) => {
                this.saveUserData(moduleType, data);
            });
            
            console.log('💾 Sauvegarde modulaire complète');
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde modulaire:', error);
        }
    }
    
    // === UTILITAIRES STOCKAGE ===
    loadUserData(moduleType) {
        try {
            const data = localStorage.getItem(this.storageKeys[moduleType]);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn(`⚠️ Erreur chargement module ${moduleType}:`, error);
            return null;
        }
    }
    
    saveUserData(moduleType, data) {
        try {
            localStorage.setItem(this.storageKeys[moduleType], JSON.stringify(data));
        } catch (error) {
            console.error(`❌ Erreur sauvegarde module ${moduleType}:`, error);
        }
    }
    
    // === GESTION AVANCÉE DES UTILISATEURS ===
    createUser(name, options = {}) {
        if (!name || name.trim() === '') {
            this.app.showNotification('Le nom ne peut pas être vide', 'error');
            return false;
        }
        
        const trimmedName = name.trim();
        if (this.users[trimmedName]) {
            this.app.showNotification('Un explorateur avec ce nom existe déjà', 'error');
            return false;
        }
        
        // Créer utilisateur avec modules complets
        this.users[trimmedName] = {
            name: trimmedName,
            
            // Module Progression
            visitedPlaces: new Set(),
            stats: this.getDefaultStats(),
            
            // Module Favoris
            favorites: new Set(),
            
            // Module Notes
            notes: {},
            
            // Module Paramètres
            settings: { ...this.getDefaultSettings(), ...options.settings },
            
            // Module Collections
            collections: this.getDefaultCollections(),
            
            // Module Achievements
            achievements: {},
            
            // Métadonnées
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };
        
        this.saveUsers();
        this.app.uiManager.loadUserSelector();
        this.setCurrentUser(trimmedName);
        
        this.app.showNotification(`🎉 Explorateur "${trimmedName}" créé avec succès!`, 'success');
        console.log(`👤 Nouvel utilisateur avancé créé: ${trimmedName}`);
        
        return true;
    }
    
    // === MODULE FAVORIS ===
    toggleFavorite(placeId, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        const userData = this.getCurrentUserData();
        if (!userData) {
            this.app.showNotification('Veuillez sélectionner un explorateur', 'warning');
            return;
        }
        
        if (!userData.favorites) userData.favorites = new Set();
        
        const wasFavorite = userData.favorites.has(placeId);
        
        if (wasFavorite) {
            userData.favorites.delete(placeId);
            this.app.showNotification('Retiré des favoris', 'info');
        } else {
            userData.favorites.add(placeId);
            this.app.showNotification('⭐ Ajouté aux favoris!', 'success');
            
            // Achievement: Premier favori
            if (userData.favorites.size === 1) {
                this.unlockAchievement('first_favorite');
            }
        }
        
        this.saveUsers();
        this.app.uiManager.updateFavoriteButton(placeId, !wasFavorite);
        this.app.uiManager.updateStats();
        
        // Mettre à jour l'onglet favoris si ouvert
        if (this.app.currentTab === 'favorites') {
            this.app.uiManager.renderFavorites();
        }
    }
    
    // === MODULE NOTES ===
    saveNote(placeId, noteText) {
        const userData = this.getCurrentUserData();
        if (!userData) return false;
        
        if (!userData.notes) userData.notes = {};
        
        if (noteText && noteText.trim()) {
            userData.notes[placeId] = {
                text: noteText.trim(),
                date: new Date().toISOString(),
                modified: new Date().toISOString()
            };
            this.app.showNotification('📝 Note sauvegardée', 'success');
        } else {
            delete userData.notes[placeId];
            this.app.showNotification('Note supprimée', 'info');
        }
        
        this.saveUsers();
        return true;
    }
    
    getNote(placeId) {
        const userData = this.getCurrentUserData();
        return userData?.notes?.[placeId] || null;
    }
    
    // === MODULE COLLECTIONS ===
    createCollection(name, description = '') {
        const userData = this.getCurrentUserData();
        if (!userData) return false;
        
        if (!userData.collections) userData.collections = {};
        
        const collectionId = this.generateId();
        userData.collections[collectionId] = {
            id: collectionId,
            name: name.trim(),
            description: description.trim(),
            places: [],
            created: new Date().toISOString(),
            color: this.getRandomColor()
        };
        
        this.saveUsers();
        this.app.showNotification(`📚 Collection "${name}" créée`, 'success');
        return collectionId;
    }
    
    addToCollection(collectionId, placeId) {
        const userData = this.getCurrentUserData();
        if (!userData?.collections?.[collectionId]) return false;
        
        const collection = userData.collections[collectionId];
        if (!collection.places.includes(placeId)) {
            collection.places.push(placeId);
            this.saveUsers();
            this.app.showNotification(`Ajouté à "${collection.name}"`, 'success');
            return true;
        }
        return false;
    }
    
    // === MODULE ACHIEVEMENTS ===
    unlockAchievement(achievementId) {
        const userData = this.getCurrentUserData();
        if (!userData) return;
        
        if (userData.achievements[achievementId]) return; // Déjà débloqué
        
        const achievement = this.getAchievementDefinition(achievementId);
        if (!achievement) return;
        
        userData.achievements[achievementId] = {
            unlockedAt: new Date().toISOString(),
            title: achievement.title,
            description: achievement.description
        };
        
        this.saveUsers();
        this.showAchievementNotification(achievement);
    }
    
    checkAchievements() {
        const userData = this.getCurrentUserData();
        if (!userData) return;
        
        const visited = userData.visitedPlaces.size;
        const favorites = userData.favorites.size;
        
        // Achievements de progression
        if (visited >= 1 && !userData.achievements.first_visit) {
            this.unlockAchievement('first_visit');
        }
        if (visited >= 10 && !userData.achievements.explorer) {
            this.unlockAchievement('explorer');
        }
        if (visited >= 50 && !userData.achievements.adventurer) {
            this.unlockAchievement('adventurer');
        }
        if (visited >= 100 && !userData.achievements.master) {
            this.unlockAchievement('master');
        }
        
        // Achievements spéciaux
        if (favorites >= 10 && !userData.achievements.collector) {
            this.unlockAchievement('collector');
        }
        
        // Vérifier si tous les arrondissements ont été visités
        if (this.app.isDataLoaded && this.hasVisitedAllArrondissements() && !userData.achievements.paris_master) {
            this.unlockAchievement('paris_master');
        }
    }
    
    // === MODULE PARAMÈTRES ===
    updateSetting(key, value) {
        const userData = this.getCurrentUserData();
        if (!userData) return;
        
        userData.settings[key] = value;
        this.saveUsers();
        
        // Appliquer le paramètre immédiatement
        this.applySettings();
    }
    
    applySettings() {
        const userData = this.getCurrentUserData();
        if (!userData?.settings) return;
        
        const settings = userData.settings;
        
        // Thème
        if (settings.theme && settings.theme !== 'default') {
            document.documentElement.setAttribute('data-theme', settings.theme);
        }
        
        // Mode compact
        if (settings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
        
        // Animations
        if (!settings.animations) {
            document.body.classList.add('no-animations');
        } else {
            document.body.classList.remove('no-animations');
        }
    }
    
    // === EXPORT/IMPORT AVANCÉ ===
    exportUserDataByModule(userName, moduleType) {
        const data = this.loadUserData(moduleType);
        if (!data || !data[userName]) return null;
        
        const exportData = {
            user: userName,
            module: moduleType,
            data: data[userName],
            exportDate: new Date().toISOString(),
            version: '2.0.0-advanced'
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    exportCompleteUserData(userName) {
        const user = this.users[userName];
        if (!user) return null;
        
        const completeData = {
            user: userName,
            modules: {
                progress: {
                    visitedPlaces: Array.from(user.visitedPlaces),
                    stats: user.stats,
                    createdAt: user.createdAt,
                    lastActive: user.lastActive
                },
                favorites: Array.from(user.favorites),
                notes: user.notes,
                settings: user.settings,
                collections: user.collections,
                achievements: user.achievements
            },
            exportDate: new Date().toISOString(),
            version: '2.0.0-advanced'
        };
        
        return JSON.stringify(completeData, null, 2);
    }
    
    importUserData(jsonData, options = {}) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.user) {
                throw new Error('Format de données invalide - nom utilisateur manquant');
            }
            
            const userName = importData.user;
            
            // Vérifier si l'utilisateur existe
            if (this.users[userName] && !options.overwrite) {
                if (!confirm(`L'utilisateur "${userName}" existe déjà. Voulez-vous l'écraser ?`)) {
                    return false;
                }
            }
            
            // Import modulaire ou complet
            if (importData.modules) {
                // Import complet
                this.importCompleteUser(importData);
            } else if (importData.module) {
                // Import d'un module spécifique
                this.importUserModule(importData);
            } else {
                throw new Error('Format non reconnu');
            }
            
            this.saveUsers();
            this.app.uiManager.loadUserSelector();
            this.app.showNotification(`Utilisateur "${userName}" importé avec succès!`, 'success');
            
            return true;
            
        } catch (error) {
            this.app.showNotification(`Erreur d'import: ${error.message}`, 'error');
            return false;
        }
    }
    
    // === STATISTIQUES AVANCÉES ===
    getAdvancedStats(userName) {
        const user = this.users[userName];
        if (!user) return null;
        
        const totalPlaces = this.app.dataManager.getTotalPlaces();
        const visitedCount = user.visitedPlaces.size;
        const favoritesCount = user.favorites.size;
        const notesCount = Object.keys(user.notes).length;
        const collectionsCount = Object.keys(user.collections).length;
        const achievementsCount = Object.keys(user.achievements).length;
        
        return {
            name: user.name,
            progress: {
                visited: visitedCount,
                total: totalPlaces,
                percentage: totalPlaces > 0 ? Math.round((visitedCount / totalPlaces) * 100) : 0,
                streak: user.stats.streak || 0
            },
            engagement: {
                favorites: favoritesCount,
                notes: notesCount,
                collections: collectionsCount,
                achievements: achievementsCount
            },
            activity: {
                createdAt: user.createdAt,
                lastActive: user.lastActive,
                daysSinceCreation: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)),
                daysSinceActive: Math.floor((new Date() - new Date(user.lastActive)) / (1000 * 60 * 60 * 24))
            }
        };
    }
    
    // === CONFIGURATIONS PAR DÉFAUT ===
    getDefaultStats() {
        return {
            totalVisited: 0,
            streak: 0,
            longestStreak: 0,
            lastVisit: null,
            favoriteArrondissement: null,
            totalSessionTime: 0,
            averageVisitsPerDay: 0,
            firstVisitDate: null
        };
    }
    
    getDefaultSettings() {
        return {
            theme: 'default',
            language: 'fr',
            compactMode: false,
            animations: true,
            notifications: true,
            autoSave: true,
            defaultView: 'list',
            mapStyle: 'standard',
            showPhotos: true,
            privacy: {
                shareProgress: false,
                publicProfile: false
            }
        };
    }
    
    getDefaultCollections() {
        return {};
    }
    
    // === UTILITAIRES ===
    getCurrentUserData() {
        return this.app.currentUser ? this.users[this.app.currentUser] : null;
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    getRandomColor() {
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getAchievementDefinition(id) {
        const achievements = {
            first_visit: { title: '🎯 Premier Pas', description: 'Visitez votre premier lieu' },
            first_favorite: { title: '⭐ Coup de Cœur', description: 'Ajoutez votre premier favori' },
            explorer: { title: '🗺️ Explorateur', description: 'Visitez 10 lieux différents' },
            adventurer: { title: '🎒 Aventurier', description: 'Visitez 50 lieux' },
            master: { title: '👑 Maître Explorateur', description: 'Visitez 100 lieux' },
            collector: { title: '📚 Collectionneur', description: '10 lieux favoris' },
            paris_master: { title: '🗼 Maître de Paris', description: 'Visitez tous les arrondissements' }
        };
        return achievements[id];
    }
    
    showAchievementNotification(achievement) {
        // Créer notification spéciale pour achievements
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-title">🏆 Succès Débloqué!</div>
                <div class="achievement-name">${achievement.title}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
        
        console.log(`🏆 Achievement débloqué: ${achievement.title}`);
    }
    
    hasVisitedAllArrondissements() {
        const userData = this.getCurrentUserData();
        if (!userData || !this.app.isDataLoaded) return false;
        
        const visitedArrondissements = new Set();
        
        userData.visitedPlaces.forEach(placeId => {
            const arrMatch = placeId.match(/^([^-]+)/);
            if (arrMatch) {
                visitedArrondissements.add(arrMatch[1]);
            }
        });
        
        const totalArrondissements = Object.keys(this.app.parisData).length;
        return visitedArrondissements.size >= totalArrondissements;
    }
    
    // === MÉTHODES DE MIGRATION (compatibilité) ===
    migrateFromLegacyFormat() {
        const legacyData = localStorage.getItem('paris-explorer-users');
        if (!legacyData) return;
        
        try {
            const oldUsers = JSON.parse(legacyData);
            console.log('🔄 Migration depuis format legacy...');
            
            Object.entries(oldUsers).forEach(([name, user]) => {
                this.users[name] = {
                    name,
                    visitedPlaces: new Set(user.visitedPlaces || []),
                    stats: { ...this.getDefaultStats(), ...(user.stats || {}) },
                    favorites: new Set(),
                    notes: {},
                    settings: this.getDefaultSettings(),
                    collections: {},
                    achievements: {},
                    createdAt: user.createdAt || new Date().toISOString(),
                    lastActive: user.lastActive || new Date().toISOString()
                };
            });
            
            this.saveUsers();
            
            // Archiver l'ancien format
            localStorage.setItem('paris-explorer-users-legacy-backup', legacyData);
            localStorage.removeItem('paris-explorer-users');
            
            console.log('✅ Migration terminée');
            
        } catch (error) {
            console.error('❌ Erreur migration:', error);
        }
    }
}
