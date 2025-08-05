// ===== USER MANAGER - VERSION REFACTORISÉE =====

class UserManager {
    constructor(app) {
        this.app = app;
        this.users = {};
    }
    
    // === CHARGEMENT ET SAUVEGARDE ===
    loadUsers() {
        const users = localStorage.getItem('paris-explorer-users');
        if (users) {
            const parsedUsers = JSON.parse(users);
            // Convertir les tableaux en Set pour la compatibilité
            Object.values(parsedUsers).forEach(user => {
                if (Array.isArray(user.visitedPlaces)) {
                    user.visitedPlaces = new Set(user.visitedPlaces);
                } else if (!(user.visitedPlaces instanceof Set)) {
                    user.visitedPlaces = new Set();
                }
            });
            this.users = parsedUsers;
            console.log('📥 Utilisateurs chargés:', Object.keys(this.users));
        } else {
            this.users = {};
            console.log('📥 Aucun utilisateur existant');
        }
    }
    
    saveUsers() {
        // Convertir les Set en Array pour la sauvegarde JSON
        const usersToSave = {};
        Object.entries(this.users).forEach(([name, user]) => {
            usersToSave[name] = {
                ...user,
                visitedPlaces: Array.from(user.visitedPlaces)
            };
        });
        localStorage.setItem('paris-explorer-users', JSON.stringify(usersToSave));
        console.log('💾 Utilisateurs sauvegardés:', Object.keys(usersToSave));
    }
    
    // === GESTION DES UTILISATEURS ===
    createUser(name) {
        if (!name || name.trim() === '') {
            this.app.showNotification('Le nom ne peut pas être vide', 'error');
            return false;
        }
        
        const trimmedName = name.trim();
        if (this.users[trimmedName]) {
            this.app.showNotification('Un explorateur avec ce nom existe déjà', 'error');
            return false;
        }
        
        // Créer le nouvel utilisateur
        this.users[trimmedName] = {
            name: trimmedName,
            visitedPlaces: new Set(),
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            stats: {
                totalVisited: 0,
                streak: 0,
                lastVisit: null,
                favoriteArrondissement: null,
                totalSessionTime: 0
            },
            preferences: {
                showCompletedByDefault: false,
                defaultView: 'list',
                mapZoomLevel: 11
            }
        };
        
        this.saveUsers();
        this.app.uiManager.loadUserSelector();
        this.setCurrentUser(trimmedName);
        this.app.showNotification(`Explorateur "${trimmedName}" créé avec succès!`, 'success');
        
        console.log(`👤 Nouvel utilisateur créé: ${trimmedName}`);
        return true;
    }
    
    deleteUser(name) {
        if (!this.users[name]) {
            this.app.showNotification('Utilisateur introuvable', 'error');
            return;
        }
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer l'explorateur "${name}" ?\n\nToutes ses explorations seront perdues définitivement.`)) {
            delete this.users[name];
            this.saveUsers();
            
            // Si c'est l'utilisateur actuel, le déselectionner
            if (this.app.currentUser === name) {
                this.app.currentUser = null;
                document.getElementById('userSelector').value = '';
                this.app.uiManager.renderContent();
                this.app.uiManager.updateStats();
            }
            
            this.app.uiManager.loadUserSelector();
            this.app.uiManager.updateUsersList();
            this.app.showNotification(`Explorateur "${name}" supprimé`, 'info');
            
            console.log(`🗑️ Utilisateur supprimé: ${name}`);
        }
    }
    
    setCurrentUser(name) {
        if (!this.users[name]) {
            this.app.showNotification('Explorateur introuvable', 'error');
            return;
        }
        
        // Mettre à jour l'activité
        this.users[name].lastActive = new Date().toISOString();
        this.saveUsers();
        
        // Notifier l'application du changement
        this.app.onUserChanged(name);
        
        document.getElementById('userSelector').value = name;
        this.app.showNotification(`Explorateur "${name}" sélectionné`, 'success');
        
        console.log(`👤 Utilisateur actuel: ${name}`);
    }
    
    getCurrentUserData() {
        return this.app.currentUser ? this.users[this.app.currentUser] : null;
    }
    
    // === GESTION DES LIEUX VISITÉS ===
    togglePlace(placeId, event) {
        // Empêcher la propagation pour éviter le rechargement
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        const userData = this.getCurrentUserData();
        if (!userData) {
            this.app.showNotification('Veuillez sélectionner un explorateur', 'warning');
            return;
        }
        
        // S'assurer que visitedPlaces est un Set
        if (!(userData.visitedPlaces instanceof Set)) {
            userData.visitedPlaces = new Set(userData.visitedPlaces || []);
        }
        
        const wasVisited = userData.visitedPlaces.has(placeId);
        
        if (wasVisited) {
            userData.visitedPlaces.delete(placeId);
            this.app.showNotification('Lieu retiré de vos explorations', 'info');
        } else {
            userData.visitedPlaces.add(placeId);
            userData.stats.lastVisit = new Date().toISOString();
            this.app.showNotification('Nouveau lieu exploré! Bravo!', 'success');
            
            // Calculer la série (streak)
            this.updateStreak(userData);
        }
        
        // Mettre à jour les statistiques
        userData.stats.totalVisited = userData.visitedPlaces.size;
        this.updateFavoriteArrondissement(userData);
        
        this.saveUsers();
        this.app.onPlaceToggled(placeId, !wasVisited);
        
        console.log(`${wasVisited ? '➖' : '➕'} ${placeId} (Total: ${userData.stats.totalVisited})`);
    }
    
    // === STATISTIQUES AVANCÉES ===
    updateStreak(userData) {
        const today = new Date();
        const lastVisit = userData.stats.lastVisit ? new Date(userData.stats.lastVisit) : null;
        
        if (lastVisit) {
            const daysDiff = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= 1) {
                // Même jour ou jour suivant = continue la série
                userData.stats.streak = (userData.stats.streak || 0) + 1;
            } else {
                // Plus d'un jour = reset la série
                userData.stats.streak = 1;
            }
        } else {
            userData.stats.streak = 1;
        }
        
        console.log(`🔥 Série de ${userData.name}: ${userData.stats.streak} jours`);
    }
    
    updateFavoriteArrondissement(userData) {
        if (!this.app.isDataLoaded) return;
        
        const arrondissementCounts = {};
        
        // Compter les visites par arrondissement
        userData.visitedPlaces.forEach(placeId => {
            const arrMatch = placeId.match(/^([^-]+)/);
            if (arrMatch) {
                const arr = arrMatch[1];
                arrondissementCounts[arr] = (arrondissementCounts[arr] || 0) + 1;
            }
        });
        
        // Trouver l'arrondissement avec le plus de visites
        let maxCount = 0;
        let favoriteArr = null;
        
        Object.entries(arrondissementCounts).forEach(([arr, count]) => {
            if (count > maxCount) {
                maxCount = count;
                favoriteArr = arr;
            }
        });
        
        userData.stats.favoriteArrondissement = favoriteArr;
    }
    
    // === RÉINITIALISATION ===
    resetUserProgress() {
        const userData = this.getCurrentUserData();
        if (!userData) {
            this.app.showNotification('Veuillez sélectionner un explorateur', 'warning');
            return;
        }
        
        const visitedCount = userData.visitedPlaces.size;
        if (visitedCount === 0) {
            this.app.showNotification('Aucune progression à effacer', 'info');
            return;
        }
        
        if (confirm(`Êtes-vous sûr de vouloir effacer toutes les explorations de "${userData.name}" ?\n\n${visitedCount} lieux seront marqués comme non visités.`)) {
            userData.visitedPlaces = new Set();
            userData.stats = {
                totalVisited: 0,
                streak: 0,
                lastVisit: null,
                favoriteArrondissement: null,
                totalSessionTime: userData.stats.totalSessionTime || 0
            };
            
            this.saveUsers();
            this.app.uiManager.renderContent();
            this.app.uiManager.updateStats();
            
            // Mettre à jour la carte si visible
            if (this.app.mapManager.map && this.app.currentTab === 'map') {
                this.app.mapManager.updateMapMarkers();
            }
            
            this.app.showNotification('Exploration recommencée à zéro!', 'info');
            console.log(`🔄 Progression réinitialisée pour ${userData.name}`);
        }
    }
    
    // === SÉLECTION AUTOMATIQUE ===
    autoSelectUser() {
        const userNames = Object.keys(this.users);
        
        if (userNames.length === 1) {
            // Un seul utilisateur : le sélectionner automatiquement
            this.setCurrentUser(userNames[0]);
        } else if (userNames.length === 0) {
            // Aucun utilisateur : ouvrir le modal de création
            this.app.uiManager.showModal();
        } else {
            // Plusieurs utilisateurs : sélectionner le plus récemment actif
            let mostRecentUser = null;
            let mostRecentDate = null;
            
            Object.values(this.users).forEach(user => {
                const lastActive = new Date(user.lastActive);
                if (!mostRecentDate || lastActive > mostRecentDate) {
                    mostRecentDate = lastActive;
                    mostRecentUser = user.name;
                }
            });
            
            if (mostRecentUser) {
                this.setCurrentUser(mostRecentUser);
                console.log(`👤 Utilisateur le plus récent sélectionné: ${mostRecentUser}`);
            }
        }
    }
    
    // === EXPORT/IMPORT ===
    exportUserData(userName) {
        const user = this.users[userName];
        if (!user) return null;
        
        const exportData = {
            ...user,
            visitedPlaces: Array.from(user.visitedPlaces),
            exportDate: new Date().toISOString(),
            appVersion: '2.0.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    importUserData(jsonData) {
        try {
            const userData = JSON.parse(jsonData);
            
            if (!userData.name || !userData.visitedPlaces) {
                throw new Error('Format de données invalide');
            }
            
            // Convertir les visitedPlaces en Set
            userData.visitedPlaces = new Set(userData.visitedPlaces);
            
            // Vérifier si l'utilisateur existe déjà
            if (this.users[userData.name]) {
                if (!confirm(`L'utilisateur "${userData.name}" existe déjà. Voulez-vous l'écraser ?`)) {
                    return false;
                }
            }
            
            this.users[userData.name] = userData;
            this.saveUsers();
            this.app.uiManager.loadUserSelector();
            
            this.app.showNotification(`Utilisateur "${userData.name}" importé avec succès!`, 'success');
            return true;
            
        } catch (error) {
            this.app.showNotification('Erreur lors de l\'import: ' + error.message, 'error');
            return false;
        }
    }
    
    // === STATISTIQUES UTILISATEUR ===
    getUserStats(userName) {
        const user = this.users[userName];
        if (!user) return null;
        
        const totalPlaces = this.app.dataManager.getTotalPlaces();
        const visitedCount = user.visitedPlaces.size;
        const completionRate = totalPlaces > 0 ? Math.round((visitedCount / totalPlaces) * 100) : 0;
        
        return {
            name: user.name,
            visitedCount,
            totalPlaces,
            completionRate,
            streak: user.stats.streak || 0,
            favoriteArrondissement: user.stats.favoriteArrondissement,
            lastVisit: user.stats.lastVisit,
            createdAt: user.createdAt,
            lastActive: user.lastActive
        };
    }
}
