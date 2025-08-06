// ===== UI MANAGER - VERSION ROBUSTE =====

class UIManager {
    constructor(app) {
        this.app = app;
        this.currentModal = null;
        console.log('🎨 UIManager initialisé');
    }
    
    // === MÉTHODE UTILITAIRE ROBUSTE ===
    safeGetElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ Élément non trouvé: ${id}`);
        }
        return element;
    }
    
    safeSetContent(id, content) {
        const element = this.safeGetElement(id);
        if (element) {
            element.innerHTML = content;
            return true;
        }
        return false;
    }
    
    // === RENDU PRINCIPAL ===
    renderContent() {
        const container = this.safeGetElement('dataContainer');
        if (!container) {
            console.error('❌ Container principal introuvable');
            return;
        }
        
        if (!this.app.isDataLoaded || !this.app.parisData) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <h3>Chargement des données...</h3>
                        <p>Découverte des trésors parisiens en cours</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const arrondissements = Object.keys(this.app.parisData);
        if (arrondissements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-content">
                        <h3>🗼 Aucune donnée disponible</h3>
                        <p>Les données de Paris n'ont pas pu être chargées</p>
                        <button class="btn btn-primary" onclick="location.reload()">
                            🔄 Recharger
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Rendu des arrondissements
        const html = arrondissements.map(arrKey => 
            this.renderArrondissement(arrKey, this.app.parisData[arrKey])
        ).join('');
        
        container.innerHTML = html;
        
        // Mettre à jour les stats
        this.updateStats();
    }
    
    // === RENDU ARRONDISSEMENT ===
    renderArrondissement(arrKey, arrData) {
        if (!arrData) return '';
        
        const userData = this.app.getCurrentUserData();
        const { visited, total } = this.getArrondissementStats(arrKey, arrData);
        const completionPercent = total > 0 ? Math.round((visited / total) * 100) : 0;
        
        // Filtrer si recherche active
        if (this.app.searchQuery && !this.hasSearchResults(arrKey, arrData)) {
            return '';
        }
        
        return `
            <div class="arrondissement-card" data-arr="${arrKey}">
                <div class="arrondissement-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <div class="arrondissement-info">
                        <h3 class="arrondissement-title">${arrData.title || arrKey}</h3>
                        <p class="arrondissement-description">${arrData.description || ''}</p>
                    </div>
                    <div class="arrondissement-stats">
                        <span class="stat-visited">${visited}/${total}</span>
                        <span class="stat-percent">${completionPercent}%</span>
                    </div>
                    <div class="expand-icon">▼</div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${completionPercent}%"></div>
                </div>
                
                <div class="arrondissement-content">
                    ${this.renderCategories(arrKey, arrData.categories || {})}
                </div>
            </div>
        `;
    }
    
    // === RENDU CATÉGORIES ===
    renderCategories(arrKey, categories) {
        return Object.entries(categories).map(([catKey, catData]) => {
            if (!catData.places || catData.places.length === 0) return '';
            
            const placesHtml = catData.places.map(place => 
                this.renderPlace(arrKey, catKey, place)
            ).join('');
            
            return `
                <div class="category-section">
                    <h4 class="category-title">${catData.title || catKey}</h4>
                    <div class="places-grid">
                        ${placesHtml}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // === RENDU LIEU ===
    renderPlace(arrKey, catKey, place) {
        const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
        const userData = this.app.getCurrentUserData();
        
        const isVisited = userData?.visitedPlaces?.has(placeId) || false;
        const isFavorite = userData?.favorites?.has(placeId) || false;
        
        // Filtrer selon recherche
        if (this.app.searchQuery && !this.matchesSearch(place)) {
            return '';
        }
        
        return `
            <div class="place-card ${isVisited ? 'visited' : ''} ${isFavorite ? 'favorite' : ''}">
                <div class="place-header">
                    <input type="checkbox" class="place-checkbox" 
                           ${isVisited ? 'checked' : ''} 
                           onchange="app.userManager.toggleVisited('${placeId}')">
                    <h5 class="place-name">${this.highlightSearch(place.name)}</h5>
                    <div class="place-actions">
                        <button class="btn-action favorite ${isFavorite ? 'active' : ''}" 
                                onclick="app.userManager.toggleFavorite('${placeId}')" 
                                title="Favori">⭐</button>
                    </div>
                </div>
                
                <p class="place-description">${this.highlightSearch(place.description || '')}</p>
                
                ${place.address ? `
                    <p class="place-address">📍 ${place.address}</p>
                ` : ''}
                
                ${place.tags ? `
                    <div class="place-tags">
                        ${place.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // === MISE À JOUR STATS ===
    updateStats() {
        if (!this.app.isDataLoaded) return;
        
        const userData = this.app.getCurrentUserData();
        const totalPlaces = this.getTotalPlaces();
        const visitedCount = userData?.visitedPlaces?.size || 0;
        const completionRate = totalPlaces > 0 ? Math.round((visitedCount / totalPlaces) * 100) : 0;
        
        // Mettre à jour les éléments stats si ils existent
        this.safeSetContent('totalPlaces', totalPlaces.toString());
        this.safeSetContent('visitedPlaces', visitedCount.toString());
        this.safeSetContent('completionRate', `${completionRate}%`);
        
        const progressFill = this.safeGetElement('progressFill');
        if (progressFill) {
            progressFill.style.width = `${completionRate}%`;
        }
    }
    
    // === ÉVÉNEMENTS ===
    setupEventListeners() {
        console.log('🔧 Configuration des événements UI...');
        
        // Onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Modals
        this.setupModalEvents();
        
        // Boutons utilisateur
        const addUserBtn = this.safeGetElement('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showUserModal());
        }
        
        // Settings
        const settingsBtn = this.safeGetElement('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettingsModal());
        }
        
        console.log('✅ Événements UI configurés');
    }
    
    setupModalEvents() {
        // Fermeture modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
            }
            if (e.target.classList.contains('close-btn')) {
                this.hideModal();
            }
        });
        
        // Échap pour fermer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.hideModal();
            }
        });
    }
    
    // === GESTION ONGLETS ===
    switchTab(tabName) {
        // Masquer tous les contenus
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Désactiver tous les boutons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activer l'onglet sélectionné
        const targetContent = this.safeGetElement(`${tabName}Tab`);
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (targetContent) targetContent.classList.add('active');
        if (targetBtn) targetBtn.classList.add('active');
        
        // Actions spécifiques
        switch (tabName) {
            case 'list':
                this.renderContent();
                break;
            case 'favorites':
                this.renderFavorites();
                break;
            case 'stats':
                this.renderStats();
                break;
        }
        
        this.app.currentTab = tabName;
    }
    
    // === SÉLECTEUR UTILISATEUR ===
    loadUserSelector() {
        const select = this.safeGetElement('userSelect');
        if (!select) return;
        
        const users = this.app.getUsers();
        
        select.innerHTML = '<option value="">Sélectionner...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            option.style.color = user.color;
            select.appendChild(option);
        });
        
        // Sélectionner l'utilisateur actuel
        if (this.app.currentUser) {
            select.value = this.app.currentUser.id;
        }
        
        // Événement changement
        select.addEventListener('change', (e) => {
            if (e.target.value) {
                const user = users.find(u => u.id === e.target.value);
                this.app.onUserChanged(user);
            }
        });
    }
    
    // === MODALS ===
    showUserModal() {
        const modal = this.safeGetElement('userModal');
        if (modal) {
            modal.style.display = 'flex';
            this.currentModal = modal;
            
            // Focus sur le champ nom
            const nameInput = this.safeGetElement('userName');
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 100);
            }
        }
    }
    
    showSettingsModal() {
        const modal = this.safeGetElement('settingsModal');
        if (modal) {
            modal.style.display = 'flex';
            this.currentModal = modal;
        }
    }
    
    hideModal() {
        if (this.currentModal) {
            this.currentModal.style.display = 'none';
            this.currentModal = null;
        }
    }
    
    // === FAVORIS ===
    renderFavorites() {
        const container = this.safeGetElement('favoritesContainer');
        if (!container) return;
        
        const userData = this.app.getCurrentUserData();
        if (!userData || !userData.favorites || userData.favorites.size === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-content">
                        <h3>⭐ Aucun favori</h3>
                        <p>Marquez des lieux comme favoris pour les retrouver ici</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="favorites-grid">
                ${Array.from(userData.favorites).map(placeId => 
                    this.renderFavoritePlace(placeId)
                ).join('')}
            </div>
        `;
    }
    
    renderFavoritePlace(placeId) {
        const place = this.findPlaceById(placeId);
        if (!place) return '';
        
        return `
            <div class="favorite-card">
                <h5>${place.name}</h5>
                <p>${place.description || ''}</p>
                <button class="btn-sm btn-secondary" 
                        onclick="app.userManager.toggleFavorite('${placeId}')">
                    Retirer
                </button>
            </div>
        `;
    }
    
    // === STATS ===
    renderStats() {
        const container = this.safeGetElement('statsContainer');
        if (!container) return;
        
        const userData = this.app.getCurrentUserData();
        if (!userData) {
            container.innerHTML = '<p>Sélectionnez un utilisateur pour voir les statistiques</p>';
            return;
        }
        
        const stats = this.calculateUserStats(userData);
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Lieux visités</h4>
                    <div class="stat-number">${stats.visited}</div>
                </div>
                <div class="stat-card">
                    <h4>Favoris</h4>
                    <div class="stat-number">${stats.favorites}</div>
                </div>
                <div class="stat-card">
                    <h4>Progression</h4>
                    <div class="stat-number">${stats.completion}%</div>
                </div>
            </div>
        `;
    }
    
    // === UTILITAIRES ===
    getArrondissementStats(arrKey, arrData) {
        const userData = this.app.getCurrentUserData();
        let visited = 0, total = 0;
        
        if (arrData.categories) {
            Object.entries(arrData.categories).forEach(([catKey, catData]) => {
                if (catData.places) {
                    catData.places.forEach(place => {
                        const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                        total++;
                        if (userData?.visitedPlaces?.has(placeId)) {
                            visited++;
                        }
                    });
                }
            });
        }
        
        return { visited, total };
    }
    
    getTotalPlaces() {
        let total = 0;
        Object.entries(this.app.parisData || {}).forEach(([arrKey, arrData]) => {
            const { total: arrTotal } = this.getArrondissementStats(arrKey, arrData);
            total += arrTotal;
        });
        return total;
    }
    
    matchesSearch(place) {
        if (!this.app.searchQuery) return true;
        
        const query = this.app.searchQuery.toLowerCase();
        return (place.name && place.name.toLowerCase().includes(query)) ||
               (place.description && place.description.toLowerCase().includes(query)) ||
               (place.address && place.address.toLowerCase().includes(query));
    }
    
    hasSearchResults(arrKey, arrData) {
        if (!this.app.searchQuery) return true;
        
        if (arrData.categories) {
            return Object.values(arrData.categories).some(catData => {
                return catData.places && catData.places.some(place => this.matchesSearch(place));
            });
        }
        return false;
    }
    
    highlightSearch(text) {
        if (!this.app.searchQuery || !text) return text;
        
        const regex = new RegExp(`(${this.app.searchQuery})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    findPlaceById(placeId) {
        // Implémenter la recherche de lieu par ID
        // Pour l'instant, retourner null
        return null;
    }
    
    calculateUserStats(userData) {
        return {
            visited: userData.visitedPlaces?.size || 0,
            favorites: userData.favorites?.size || 0,
            completion: 0 // À calculer
        };
    }
    
    updateFavoriteButton(placeId, isFavorite) {
        // Mettre à jour visuellement le bouton favori
        console.log(`Favori ${placeId}: ${isFavorite}`);
    }
}

console.log('✅ UIManager robuste chargé');
