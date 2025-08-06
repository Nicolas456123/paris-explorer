// ===== USER MANAGER - VERSION CORRIGÉE =====

class UserManager {
    constructor(app) {
        this.app = app;
        this.users = []; // ARRAY, pas objet
        this.currentUser = null;
        console.log('👤 UserManager initialisé');
    }
    
    // === CHARGEMENT UTILISATEURS ===
    loadUsers() {
        try {
            const stored = localStorage.getItem('paris-explorer-users');
            if (stored) {
                const userData = JSON.parse(stored);
                
                // Convertir objet en array si nécessaire
                if (Array.isArray(userData)) {
                    this.users = userData;
                } else {
                    // Conversion objet -> array
                    this.users = Object.values(userData);
                }
                
                // Convertir les arrays en Sets
                this.users.forEach(user => {
                    if (Array.isArray(user.visitedPlaces)) {
                        user.visitedPlaces = new Set(user.visitedPlaces);
                    }
                    if (Array.isArray(user.favorites)) {
                        user.favorites = new Set(user.favorites);
                    }
                    if (!user.visitedPlaces) user.visitedPlaces = new Set();
                    if (!user.favorites) user.favorites = new Set();
                    if (!user.notes) user.notes = {};
                    if (!user.collections) user.collections = {};
                    if (!user.achievements) user.achievements = {};
                });
                
                console.log(`✅ ${this.users.length} utilisateurs chargés`);
            } else {
                this.users = [];
                console.log('📝 Aucun utilisateur existant');
            }
        } catch (error) {
            console.error('❌ Erreur chargement utilisateurs:', error);
            this.users = [];
        }
    }
    
    // === SAUVEGARDE ===
    saveUsers() {
        try {
            // Convertir Sets en arrays pour le stockage
            const dataToSave = this.users.map(user => ({
                ...user,
                visitedPlaces: Array.from(user.visitedPlaces || []),
                favorites: Array.from(user.favorites || [])
            }));
            
            localStorage.setItem('paris-explorer-users', JSON.stringify(dataToSave));
            console.log('💾 Utilisateurs sauvegardés');
        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
        }
    }
    
    // === CRÉATION UTILISATEUR ===
    createUser(name, color = '#D4AF37') {
        if (!name || name.trim() === '') {
            this.app.showNotification('❌ Le nom ne peut pas être vide', 'error');
            return false;
        }
        
        const trimmedName = name.trim();
        
        // Vérifier si existe déjà
        if (this.users.find(u => u.name === trimmedName)) {
            this.app.showNotification('❌ Ce nom existe déjà', 'error');
            return false;
        }
        
        const newUser = {
            id: this.generateId(),
            name: trimmedName,
            color: color,
            visitedPlaces: new Set(),
            favorites: new Set(),
            notes: {},
            collections: {},
            achievements: {},
            statistics: {},
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        this.app.showNotification(`✅ Utilisateur "${trimmedName}" créé`, 'success');
        return true;
    }
    
    // === SUPPRESSION UTILISATEUR ===
    deleteUser(userId) {
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
            const userName = this.users[index].name;
            this.users.splice(index, 1);
            this.saveUsers();
            
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser = null;
            }
            
            this.app.showNotification(`Utilisateur "${userName}" supprimé`, 'info');
            return true;
        }
        return false;
    }
    
    // === SÉLECTION UTILISATEUR ===
    setCurrentUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.currentUser = user;
            this.app.onUserChanged(user);
            return true;
        }
        return false;
    }
    
    getCurrentUserData() {
        return this.currentUser;
    }
    
    autoSelectUser() {
        if (this.users.length === 1) {
            this.setCurrentUser(this.users[0].id);
        } else if (this.users.length > 1) {
            // Sélectionner le dernier utilisé (à implémenter)
            console.log('📋 Plusieurs utilisateurs disponibles');
        }
    }
    
    // === GESTION VISITES ===
    toggleVisited(placeId) {
        const userData = this.getCurrentUserData();
        if (!userData) {
            this.app.showNotification('❌ Sélectionnez un utilisateur', 'warning');
            return;
        }
        
        const wasVisited = userData.visitedPlaces.has(placeId);
        
        if (wasVisited) {
            userData.visitedPlaces.delete(placeId);
            this.app.showNotification('❌ Marqué comme non visité', 'info');
        } else {
            userData.visitedPlaces.add(placeId);
            this.app.showNotification('✅ Marqué comme visité', 'success');
        }
        
        this.saveUsers();
        this.app.uiManager.updateStats();
        this.checkAchievements();
    }
    
    // === GESTION FAVORIS ===
    toggleFavorite(placeId) {
        const userData = this.getCurrentUserData();
        if (!userData) {
            this.app.showNotification('❌ Sélectionnez un utilisateur', 'warning');
            return;
        }
        
        const wasFavorite = userData.favorites.has(placeId);
        
        if (wasFavorite) {
            userData.favorites.delete(placeId);
            this.app.showNotification('💔 Retiré des favoris', 'info');
        } else {
            userData.favorites.add(placeId);
            this.app.showNotification('⭐ Ajouté aux favoris', 'success');
        }
        
        this.saveUsers();
        this.app.uiManager.updateStats();
        
        // Mettre à jour l'onglet favoris si ouvert
        if (this.app.currentTab === 'favorites') {
            this.app.uiManager.renderFavorites();
        }
    }
    
    // === GESTION NOTES ===
    saveNote(placeId, noteText) {
        const userData = this.getCurrentUserData();
        if (!userData) return false;
        
        if (noteText && noteText.trim()) {
            userData.notes[placeId] = {
                text: noteText.trim(),
                date: new Date().toISOString()
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
    
    // === ACHIEVEMENTS ===
    checkAchievements() {
        const userData = this.getCurrentUserData();
        if (!userData) return;
        
        const visited = userData.visitedPlaces.size;
        
        // Premier lieu visité
        if (visited === 1 && !userData.achievements.first_visit) {
            this.unlockAchievement('first_visit', '🎉 Premier Pas !', 'Vous avez visité votre premier lieu parisien');
        }
        
        // Explorateur (10 lieux)
        if (visited === 10 && !userData.achievements.explorer) {
            this.unlockAchievement('explorer', '🗺️ Explorateur !', 'Vous avez visité 10 lieux');
        }
        
        // Aventurier (50 lieux)
        if (visited === 50 && !userData.achievements.adventurer) {
            this.unlockAchievement('adventurer', '🏃 Aventurier !', 'Vous avez visité 50 lieux');
        }
    }
    
    unlockAchievement(id, title, description) {
        const userData = this.getCurrentUserData();
        if (!userData) return;
        
        userData.achievements[id] = {
            title,
            description,
            unlockedAt: new Date().toISOString()
        };
        
        this.saveUsers();
        this.app.showNotification(`🏆 ${title}`, 'achievement', 6000);
    }
    
    // === MIGRATION LEGACY ===
    async migrateFromLegacyFormat() {
        // Migration si nécessaire depuis l'ancien format
        console.log('🔄 Vérification migration...');
    }
    
    // === UTILITAIRES ===
    generateId() {
        return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    getUserById(id) {
        return this.users.find(u => u.id === id);
    }
    
    getUserByName(name) {
        return this.users.find(u => u.name === name);
    }
    
    // === STATISTIQUES ===
    getUserStats(userId = null) {
        const user = userId ? this.getUserById(userId) : this.getCurrentUserData();
        if (!user) return null;
        
        return {
            name: user.name,
            visited: user.visitedPlaces.size,
            favorites: user.favorites.size,
            notes: Object.keys(user.notes).length,
            achievements: Object.keys(user.achievements).length,
            createdAt: user.createdAt
        };
    }
}

console.log('✅ UserManager corrigé chargé');
