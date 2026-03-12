// ===== UI MANAGER - VERSION CORRIGÉE COMPLÈTE =====

class UIManager {
    constructor(app) {
        this.app = app;
        this.currentFilter = null;
        this.itemsPerPage = 50;
        this.currentPage = 1;
    }
    
    // === CONFIGURATION DES ÉVÉNEMENTS ===
    setupEventListeners() {
        console.log('⚙️ Configuration des événements UI...');
        
        // Boutons des onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });
        
        // Événements de recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.app.searchFilter.onSearchInput(e.target.value);
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.app.searchFilter.performSearch();
                }
            });
        }
        
        // Boutons de recherche
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.app.searchFilter.performSearch();
            });
        }
        
        
        // Filtres
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
        
        const hideCompletedFilter = document.getElementById('hideCompletedFilter');
        if (hideCompletedFilter) {
            hideCompletedFilter.addEventListener('change', (e) => {
                this.app.searchFilter.activeFilters.hideCompleted = e.target.checked;
                this.renderContent();
            });
        }
        
        // Gestion des utilisateurs
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.app.userManager.selectUser(e.target.value);
                }
            });
        }
        
        const newUserBtn = document.getElementById('newUserBtn');
        if (newUserBtn) {
            newUserBtn.addEventListener('click', () => {
                this.showCreateUserModal();
            });
        }
        
        const manageUsersBtn = document.getElementById('manageUsersBtn');
        if (manageUsersBtn) {
            manageUsersBtn.addEventListener('click', () => {
                this.switchTab('users');
            });
        }
        
        // Événements de modal
        this.setupModalEvents();
        
        // Événements de carte
        this.setupMapEvents();
        
        // Événements pour basculer entre les modes d'affichage utilisateur
        this.setupUserDisplayEvents();
        
        console.log('✅ Événements UI configurés');
    }
    
    // === ÉVÉNEMENTS DE MODAL ===
    setupModalEvents() {
        // Fermeture des modals
        document.querySelectorAll('.close-btn, .modal-backdrop').forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.target === element) {
                    this.hideModal();
                }
            });
        });
        
        // Échap pour fermer les modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }
    
    // === ÉVÉNEMENTS DE CARTE ===
    setupMapEvents() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const centerMapBtn = document.getElementById('centerMapBtn');
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.app.mapManager.toggleFullscreen();
            });
        }
        
        if (centerMapBtn) {
            centerMapBtn.addEventListener('click', () => {
                this.app.mapManager.centerMap();
            });
        }
    }
    
    // === ÉVÉNEMENTS D'AFFICHAGE UTILISATEUR ===
    setupUserDisplayEvents() {
        const changeUserBtn = document.getElementById('changeUserBtn');
        if (changeUserBtn) {
            changeUserBtn.addEventListener('click', () => {
                this.showUserManagement();
            });
        }
    }
    
    // === GESTION AFFICHAGE UTILISATEUR ===
    showUserManagement() {
        const managementSection = document.getElementById('userManagementSection');
        const displaySection = document.getElementById('userDisplaySection');
        
        if (managementSection) managementSection.style.display = 'flex';
        if (displaySection) displaySection.style.display = 'none';
        
        console.log('👥 Mode gestion utilisateur activé');
    }
    
    showUserDisplay(userName) {
        const managementSection = document.getElementById('userManagementSection');
        const displaySection = document.getElementById('userDisplaySection');
        const userNameElement = document.getElementById('currentUserName');
        
        if (managementSection) managementSection.style.display = 'none';
        if (displaySection) displaySection.style.display = 'flex';
        if (userNameElement) userNameElement.textContent = userName;
        
        console.log('👤 Mode affichage utilisateur activé pour:', userName);
    }
    
    hideUserManagement() {
        const managementSection = document.getElementById('userManagementSection');
        const displaySection = document.getElementById('userDisplaySection');
        
        if (managementSection) managementSection.style.display = 'none';
        if (displaySection) displaySection.style.display = 'none';
        
        console.log('🚫 Sections utilisateur masquées');
    }

    // === CHANGEMENT D'ONGLET ===
    switchTab(tabName) {
        console.log(`🔄 Changement d'onglet vers: ${tabName}`);
        
        // Désactiver tous les onglets et contenus
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Activer le nouvel onglet
        const newTab = document.querySelector(`[data-tab="${tabName}"]`);
        const newContent = document.getElementById(`${tabName}Content`);

        if (newTab) {
            newTab.classList.add('active');
            newTab.setAttribute('aria-selected', 'true');
        }
        if (newContent) newContent.classList.add('active');
        
        // Actions spécifiques par onglet
        switch (tabName) {
            case 'list':
                console.log('📋 Activation onglet liste');
                this.renderContent();
                break;
                
            case 'map':
                console.log('🗺️ Activation onglet carte');
                this.initializeMapTab();
                break;
                
            case 'favorites':
                console.log('⭐ Activation onglet favoris');
                this.renderFavorites();
                break;
                
            case 'stats':
                console.log('📊 Activation onglet statistiques');
                this.renderStats();
                break;
                
            case 'achievements':
                console.log('🏆 Activation onglet achievements');
                this.renderAchievements();
                break;
                
            case 'settings':
                console.log('⚙️ Activation onglet paramètres');
                this.renderSettings();
                break;
                
            case 'users':
                console.log('👥 Activation onglet utilisateurs');
                this.renderUserManagement();
                break;
                
            default:
                console.log(`📑 Activation onglet: ${tabName}`);
                break;
        }
        
        this.app.currentTab = tabName;
    }
    
    // === INITIALISATION DE L'ONGLET CARTE ===
    initializeMapTab() {
        setTimeout(() => {
            if (!this.app.mapManager.isInitialized()) {
                console.log('🗺️ Initialisation de la carte...');
                this.app.mapManager.initMap();
            } else {
                console.log('🗺️ Mise à jour de la carte existante...');
                this.app.mapManager.refreshMap();
            }
        }, 100);
    }
    
    // === RENDU DU CONTENU PRINCIPAL ===
    renderContent() {
        const container = document.getElementById('listContent');
        if (!container) {
            console.error('❌ Container listContent introuvable');
            return;
        }
        
        if (!this.app.isDataLoaded || !this.app.parisData) {
            container.innerHTML = this.renderNoDataMessage();
            return;
        }
        
        const userData = this.app.getCurrentUserData();
        if (!userData) {
            container.innerHTML = this.renderNoUserMessage();
            return;
        }
        
        // Appliquer les filtres
        const filteredData = this.getFilteredData();
        
        if (Object.keys(filteredData).length === 0) {
            container.innerHTML = this.renderNoResultsMessage();
            return;
        }
        
        // Générer le HTML
        let html = '';
        Object.entries(filteredData).forEach(([arrKey, arrData]) => {
            html += this.renderArrondissementCard(arrKey, arrData, userData);
        });
        
        container.innerHTML = html;
        
        // Ajouter les événements aux cartes
        this.attachPlaceCardEvents();
        
        // Mettre à jour les statistiques
        this.updateStatsHeader();
        
        console.log('✅ Contenu rendu');
    }
    
    // === FILTRAGE DES DONNÉES ===
    getFilteredData() {
        if (!this.app.parisData) return {};
        
        const filtered = {};
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            // Filtrer par recherche
            if (this.app.searchQuery && !this.arrondissementMatchesSearch(arrKey, arrData)) {
                return;
            }
            
            // Filtrer par arrondissement
            if (this.app.searchFilter.activeFilters.arrondissement && 
                !arrKey.includes(this.app.searchFilter.activeFilters.arrondissement)) {
                return;
            }
            
            // Filtrer les catégories
            const filteredCategories = {};
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                // Filtrer par catégorie
                if (this.app.searchFilter.activeFilters.category && 
                    !catData.title.toLowerCase().includes(this.app.searchFilter.activeFilters.category.toLowerCase())) {
                    return;
                }
                
                // Filtrer les lieux
                const filteredPlaces = (catData.places || []).filter(place => {
                    return this.placeMatchesFilters(place, arrKey, catKey);
                });
                
                if (filteredPlaces.length > 0) {
                    filteredCategories[catKey] = {
                        ...catData,
                        places: filteredPlaces
                    };
                }
            });
            
            if (Object.keys(filteredCategories).length > 0) {
                filtered[arrKey] = {
                    ...arrData,
                    categories: filteredCategories
                };
            }
        });
        
        return filtered;
    }
    
    // === CORRESPONDANCES DE FILTRES ===
    arrondissementMatchesSearch(arrKey, arrData) {
        if (!this.app.searchQuery) return true;
        
        const query = this.app.searchQuery.toLowerCase();
        const arrName = arrData.name || '';
        return arrName.toLowerCase().includes(query) ||
               Object.values(arrData.categories || {}).some(catData =>
                   (catData.places || []).some(place => this.placeMatchesSearch(place, query))
               );
    }
    
    placeMatchesSearch(place, query) {
        return place.name.toLowerCase().includes(query) ||
               (place.description && place.description.toLowerCase().includes(query)) ||
               (place.address && place.address.toLowerCase().includes(query)) ||
               (place.tags && place.tags.some(tag => tag.toLowerCase().includes(query)));
    }
    
    placeMatchesFilters(place, arrKey, catKey) {
        const userData = this.app.getCurrentUserData();
        const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
        const isVisited = userData?.visitedPlaces?.has(placeId);
        
        // Filtrer par recherche
        if (this.app.searchQuery && !this.placeMatchesSearch(place, this.app.searchQuery.toLowerCase())) {
            return false;
        }
        
        // Filtrer par statut
        const statusFilter = this.app.searchFilter.activeFilters.status;
        if (statusFilter === 'visited' && !isVisited) return false;
        if (statusFilter === 'not-visited' && isVisited) return false;
        if (statusFilter === 'favorites') {
            const isFavorite = userData?.favorites?.some(fav => fav.placeId === placeId);
            if (!isFavorite) return false;
        }
        
        // Masquer les complétés
        if (this.app.searchFilter.activeFilters.hideCompleted && isVisited) {
            return false;
        }
        
        return true;
    }
    
    // === RENDU DES CARTES D'ARRONDISSEMENT ===
    renderArrondissementCard(arrKey, arrData, userData) {
        const totalPlaces = this.app.dataManager.getTotalPlacesInArrondissement(arrData);
        const visitedPlaces = this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey);
        const completionPercent = totalPlaces > 0 ? Math.round((visitedPlaces / totalPlaces) * 100) : 0;
        
        const progressColor = completionPercent >= 70 ? '#059669' : completionPercent >= 40 ? '#d97706' : '#dc2626';
        
        let html = `
            <div class="arrondissement-card" data-arr="${escapeHtml(arrKey)}">
                <div class="arrondissement-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <div class="arrondissement-info">
                        <h3>${escapeHtml(arrData.name || arrKey)}</h3>
                        <div class="arrondissement-stats">
                            <div class="stat-item">
                                <span class="stat-number">${visitedPlaces}/${totalPlaces}</span>
                                <span class="stat-label">Lieux visités</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number" style="color: ${progressColor}">${completionPercent}%</span>
                                <span class="stat-label">Complété</span>
                            </div>
                        </div>
                    </div>
                    <div class="arrondissement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${completionPercent}%; background: ${progressColor};"></div>
                        </div>
                        <span class="expand-icon">▼</span>
                    </div>
                </div>
                <div class="arrondissement-content">
        `;
        
        // Rendre les catégories
        Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
            html += this.renderCategorySection(arrKey, catKey, catData, userData);
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    // === RENDU DES SECTIONS DE CATÉGORIE ===
    renderCategorySection(arrKey, catKey, catData, userData) {
        const categoryIcon = this.getCategoryIcon(catData.title);
        
        let html = `
            <div class="category-section" data-category="${escapeHtml(catKey)}">
                <h4 class="category-header">
                    ${categoryIcon} ${escapeHtml(catData.title)}
                    <span class="category-count">(${(catData.places || []).length})</span>
                </h4>
                <div class="places-grid">
        `;
        
        // Rendre les lieux
        (catData.places || []).forEach(place => {
            html += this.renderPlaceCard(arrKey, catKey, place, userData);
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    // === RENDU DES CARTES DE LIEUX ===
    renderPlaceCard(arrKey, catKey, place, userData) {
        const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
        const isVisited = userData?.visitedPlaces?.has(placeId);
        const isFavorite = userData?.favorites?.some(fav => fav.placeId === placeId);
        
        const cardClass = isVisited ? 'place-card visited' : 'place-card';
        const visitIcon = isVisited ? '✅' : '⭕';
        const favoriteIcon = isFavorite ? '⭐' : '☆';
        
        // Mise en évidence des termes de recherche
        const highlightedName = this.highlightSearchTerms(place.name);
        const highlightedDescription = place.description ? this.highlightSearchTerms(place.description) : '';
        
        return `
            <div class="${cardClass}" data-place-id="${escapeHtml(placeId)}" data-arr="${escapeHtml(arrKey)}" data-cat="${escapeHtml(catKey)}">
                <div class="place-header">
                    <h5 class="place-name">${highlightedName}</h5>
                    <div class="place-actions">
                        <button class="btn-action visit" data-action="visit" title="${isVisited ? 'Marquer comme non visité' : 'Marquer comme visité'}">
                            ${visitIcon}
                        </button>
                        <button class="btn-action favorite" data-action="favorite" title="${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                            ${favoriteIcon}
                        </button>
                        <button class="btn-action note" data-action="note" title="Ajouter une note">
                            📝
                        </button>
                    </div>
                </div>

                ${place.description ? `
                    <p class="place-description">${highlightedDescription}</p>
                ` : ''}

                ${place.address ? `
                    <p class="place-address">
                        <a href="${generateGoogleMapsUrl(place, this.app.dataManager.getPlaceCoordinates(place, arrKey))}"
                           target="_blank" rel="noopener"
                           style="color: inherit; text-decoration: none; cursor: pointer;"
                           title="Voir sur Google Maps">
                            📍 ${escapeHtml(place.address)}
                        </a>
                    </p>
                ` : ''}

                <div class="place-meta">
                    <small class="place-category">${this.getCategoryIcon(catKey)} ${escapeHtml(catKey)}</small>
                </div>
            </div>
        `;
    }
    
    // === ÉVÉNEMENTS DES CARTES ===
    attachPlaceCardEvents() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const action = e.target.getAttribute('data-action');
                const placeCard = e.target.closest('.place-card');
                const arrKey = placeCard.getAttribute('data-arr');
                const catKey = placeCard.getAttribute('data-cat');
                const placeName = placeCard.querySelector('.place-name').textContent.replace(/<[^>]*>/g, '');
                
                this.handlePlaceAction(action, arrKey, catKey, placeName, placeCard);
            });
        });
        
        // Événements de clic sur les cartes
        document.querySelectorAll('.place-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-action')) {
                    this.showPlaceDetails(card);
                }
            });
        });
    }
    
    // === ACTIONS SUR LES LIEUX ===
    handlePlaceAction(action, arrKey, catKey, placeName, placeCard) {
        switch (action) {
            case 'visit':
                const newVisitStatus = this.app.userManager.togglePlaceVisit(arrKey, catKey, placeName);
                this.updatePlaceCard(placeCard, 'visit', newVisitStatus);
                break;
                
            case 'favorite':
                const newFavoriteStatus = this.app.userManager.toggleFavorite(arrKey, catKey, placeName);
                this.updatePlaceCard(placeCard, 'favorite', newFavoriteStatus);
                break;
                
            case 'note':
                this.showNoteModal(arrKey, catKey, placeName);
                break;
                
            default:
                console.warn('Action inconnue:', action);
        }
    }
    
    // === MISE À JOUR DES CARTES ===
    updatePlaceCard(placeCard, actionType, newStatus) {
        const actionBtn = placeCard.querySelector(`[data-action="${actionType}"]`);
        
        switch (actionType) {
            case 'visit':
                actionBtn.textContent = newStatus ? '✅' : '⭕';
                actionBtn.title = newStatus ? 'Marquer comme non visité' : 'Marquer comme visité';
                placeCard.classList.toggle('visited', newStatus);
                break;
                
            case 'favorite':
                actionBtn.textContent = newStatus ? '⭐' : '☆';
                actionBtn.title = newStatus ? 'Retirer des favoris' : 'Ajouter aux favoris';
                break;
        }
        
        // Mettre à jour les statistiques d'arrondissement
        this.updateArrondissementStats();
        
        // Mettre à jour les statistiques header
        this.updateStatsHeader();
    }
    
    updateArrondissementStats() {
        // Recharger les statistiques de tous les arrondissements visibles
        document.querySelectorAll('.arrondissement-card').forEach(card => {
            const arrKey = card.getAttribute('data-arr');
            const arrData = this.app.parisData[arrKey];
            
            if (arrData) {
                const totalPlaces = this.app.dataManager.getTotalPlacesInArrondissement(arrData);
                const visitedPlaces = this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey);
                const completionPercent = totalPlaces > 0 ? Math.round((visitedPlaces / totalPlaces) * 100) : 0;
                const progressColor = completionPercent >= 70 ? '#059669' : completionPercent >= 40 ? '#d97706' : '#dc2626';
                
                // Mettre à jour les statistiques
                const statsContainer = card.querySelector('.arrondissement-stats');
                if (statsContainer) {
                    statsContainer.innerHTML = `
                        <div class="stat-item">
                            <span class="stat-number">${visitedPlaces}/${totalPlaces}</span>
                            <span class="stat-label">Lieux visités</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" style="color: ${progressColor}">${completionPercent}%</span>
                            <span class="stat-label">Complété</span>
                        </div>
                    `;
                }
                
                // Mettre à jour la barre de progression
                const progressFill = card.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = `${completionPercent}%`;
                    progressFill.style.background = progressColor;
                }
            }
        });
    }
    
    // === MESSAGES D'ÉTAT ===
    renderNoDataMessage() {
        return `
            <div class="no-data-message">
                <div class="message-icon">🗼</div>
                <h3>Données en cours de chargement...</h3>
                <p>Les informations sur Paris sont en train d'être chargées.</p>
                <button class="btn btn-primary" onclick="app.dataManager.loadParisData()">
                    🔄 Recharger les données
                </button>
            </div>
        `;
    }
    
    renderNoUserMessage() {
        return `
            <div class="no-user-message">
                <div class="message-icon">👤</div>
                <h3>Aucun utilisateur sélectionné</h3>
                <p>Créez ou sélectionnez un utilisateur pour commencer votre exploration de Paris.</p>
                <button class="btn btn-primary" onclick="app.uiManager.switchTab('users')">
                    👥 Gérer les utilisateurs
                </button>
            </div>
        `;
    }
    
    renderNoResultsMessage() {
        return `
            <div class="no-results-message">
                <div class="message-icon">🔍</div>
                <h3>Aucun résultat trouvé</h3>
                <p>Essayez de modifier vos critères de recherche ou vos filtres.</p>
                <button class="btn btn-secondary" onclick="app.uiManager.clearAllFilters()">
                    🗑️ Effacer les filtres
                </button>
            </div>
        `;
    }
    
    // === UTILITAIRES ===
    getCategoryIcon(categoryName) {
        const name = categoryName.toLowerCase();
        
        if (name.includes('monument')) return '🏛️';
        if (name.includes('restaurant') || name.includes('gastronomie')) return '🍽️';
        if (name.includes('café') || name.includes('cafe')) return '☕';
        if (name.includes('bar')) return '🍻';
        if (name.includes('shopping') || name.includes('boutique')) return '🛍️';
        if (name.includes('musée') || name.includes('museum')) return '🎨';
        if (name.includes('parc') || name.includes('jardin')) return '🌳';
        if (name.includes('église') || name.includes('cathédrale')) return '⛪';
        if (name.includes('hôtel') || name.includes('hotel')) return '🏨';
        if (name.includes('théâtre') || name.includes('spectacle')) return '🎭';
        
        return '📍';
    }
    
    highlightSearchTerms(text) {
        if (!text) return '';
        // Escape HTML first to prevent XSS
        const escaped = escapeHtml(text);
        if (!this.app.searchQuery) return escaped;

        // Escape regex special characters in the query
        const safeQuery = this.app.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeQuery})`, 'gi');
        return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    // === NETTOYAGE DES FILTRES ===
    clearAllFilters() {
        // Nettoyer la recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.app.searchQuery = '';
        
        // Nettoyer les filtres
        ['arrondissementFilter', 'categoryFilter', 'statusFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.value = '';
            }
        });
        
        const hideCompletedFilter = document.getElementById('hideCompletedFilter');
        if (hideCompletedFilter) {
            hideCompletedFilter.checked = false;
        }
        
        // Réinitialiser les filtres actifs
        this.app.searchFilter.activeFilters = {
            arrondissement: '',
            category: '',
            status: '',
            hideCompleted: false
        };
        
        // Rafraîchir l'affichage
        this.renderContent();
        this.updateStatsHeader();
        
        // Filtres effacés
    }
    
    // === MISE À JOUR DES STATISTIQUES HEADER ===
    updateStatsHeader() {
        if (!this.app.isDataLoaded || !this.app.parisData) {
            this.setStatsHeaderLoading();
            return;
        }
        
        const userData = this.app.getCurrentUserData();
        const totalPlaces = this.app.dataManager.getTotalPlaces();
        const visitedCount = userData ? userData.visitedPlaces.size : 0;
        const favoritesCount = userData ? userData.favorites.length : 0;
        const completionPercent = totalPlaces > 0 ? Math.round((visitedCount / totalPlaces) * 100) : 0;
        
        // Mettre à jour les éléments DOM
        const totalPlacesElement = document.getElementById('totalPlacesCount');
        const visitedPlacesElement = document.getElementById('visitedPlacesCount');
        const completionElement = document.getElementById('completionPercent');
        const favoritesElement = document.getElementById('favoritesCount');
        
        if (totalPlacesElement) totalPlacesElement.textContent = totalPlaces.toLocaleString('fr-FR');
        if (visitedPlacesElement) visitedPlacesElement.textContent = visitedCount.toLocaleString('fr-FR');
        if (completionElement) completionElement.textContent = `${completionPercent}%`;
        if (favoritesElement) favoritesElement.textContent = favoritesCount.toLocaleString('fr-FR');
        
        console.log(`📊 Stats mises à jour: ${visitedCount}/${totalPlaces} (${completionPercent}%) - ${favoritesCount} favoris`);
    }
    
    setStatsHeaderLoading() {
        const elements = ['totalPlacesCount', 'visitedPlacesCount', 'completionPercent', 'favoritesCount'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = id === 'completionPercent' ? '-%' : '-';
            }
        });
    }

    // === CHARGEMENT DU SÉLECTEUR D'UTILISATEUR ===
    loadUserSelector() {
        const userSelect = document.getElementById('userSelect');
        if (!userSelect) return;
        
        const users = Object.keys(this.app.userManager.users);
        
        userSelect.innerHTML = '<option value="">Sélectionner un utilisateur</option>';
        
        users.forEach(userName => {
            const option = document.createElement('option');
            option.value = userName;
            option.textContent = userName;
            
            if (userName === this.app.userManager.currentUser) {
                option.selected = true;
            }
            
            userSelect.appendChild(option);
        });
        
        console.log(`👥 Sélecteur utilisateur mis à jour: ${users.length} utilisateurs`);
    }
    
    // === MODAL DE CRÉATION D'UTILISATEUR ===
    showCreateUserModal() {
        const modal = document.getElementById('userModal');
        const input = document.getElementById('userNameInput');
        
        if (modal && input) {
            input.value = '';
            input.placeholder = 'Nom du nouvel utilisateur...';
            this.showModal('userModal');
            input.focus();
        }
    }
    
    // === GESTION DES MODALS ===
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }
    
    hideModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.classList.remove('modal-open');
    }
    
    // === RECHERCHE VOCALE ===
    
    // === RENDU DES AUTRES ONGLETS ===
    renderFavorites() {
        const container = document.getElementById('favoritesContent');
        const userData = this.app.getCurrentUserData();
        
        if (!userData || !userData.favorites || userData.favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⭐</div>
                    <h3>Aucun favori</h3>
                    <p>Ajoutez des lieux à vos favoris en cliquant sur l'étoile ☆</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="favorites-grid">';
        userData.favorites.forEach(favorite => {
            // Trouver les détails du lieu
            const placeDetails = this.findPlaceDetails(favorite.placeId);
            if (placeDetails) {
                html += this.renderFavoriteCard(favorite, placeDetails);
            }
        });
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    renderStats() {
        const container = document.getElementById('statsContent');
        const userData = this.app.getCurrentUserData();
        
        if (!userData) {
            container.innerHTML = this.renderNoUserMessage();
            return;
        }
        
        const totalPlaces = this.app.dataManager.getTotalPlaces();
        const visitedCount = userData.visitedPlaces.size;
        const favoritesCount = userData.favorites.length;
        const completionPercent = totalPlaces > 0 ? Math.round((visitedCount / totalPlaces) * 100) : 0;
        
        container.innerHTML = `
            <div class="stats-overview">
                <div class="stat-card">
                    <div class="stat-icon">🗺️</div>
                    <div class="stat-info">
                        <div class="stat-value">${visitedCount}</div>
                        <div class="stat-label">Lieux visités</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-info">
                        <div class="stat-value">${favoritesCount}</div>
                        <div class="stat-label">Favoris</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-info">
                        <div class="stat-value">${completionPercent}%</div>
                        <div class="stat-label">Progression</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">🏆</div>
                    <div class="stat-info">
                        <div class="stat-value">${Object.keys(userData.achievements).length}</div>
                        <div class="stat-label">Achievements</div>
                    </div>
                </div>
            </div>
            
            <div class="progress-section">
                <h4>Progression par arrondissement</h4>
                <div class="arrondissement-progress-list">
                    ${this.renderArrondissementProgress()}
                </div>
            </div>
        `;
    }
    
    renderAchievements() {
        const container = document.getElementById('achievementsContent');
        const userData = this.app.getCurrentUserData();
        
        if (!userData) {
            container.innerHTML = this.renderNoUserMessage();
            return;
        }
        
        let html = '<div class="achievements-grid">';
        
        Object.entries(this.app.userManager.achievements).forEach(([achievementKey, achievement]) => {
            const isUnlocked = userData.achievements[achievementKey];
            html += this.renderAchievementCard(achievement, isUnlocked);
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    renderSettings() {
        const container = document.getElementById('settingsContent');
        const userData = this.app.getCurrentUserData();
        
        if (!userData) {
            container.innerHTML = this.renderNoUserMessage();
            return;
        }
        
        const settings = userData.settings || this.app.userManager.getDefaultSettings();
        
        container.innerHTML = `
            <div class="settings-sections">
                <div class="settings-section">
                    <h4>🎨 Thème</h4>
                    <div class="setting-item">
                        <label for="themeSelect">Interface :</label>
                        <select id="themeSelect" onchange="app.userManager.updateSettingAndApply('theme', this.value)">
                            <option value="paris-classic" ${settings.theme === 'paris-classic' ? 'selected' : ''}>Paris Classique</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Mode Sombre</option>
                            <option value="versailles" ${settings.theme === 'versailles' ? 'selected' : ''}>Versailles</option>
                            <option value="montmartre" ${settings.theme === 'montmartre' ? 'selected' : ''}>Montmartre</option>
                            <option value="saint-germain" ${settings.theme === 'saint-germain' ? 'selected' : ''}>Saint-Germain</option>
                            <option value="marais" ${settings.theme === 'marais' ? 'selected' : ''}>Le Marais</option>
                            <option value="haute-couture" ${settings.theme === 'haute-couture' ? 'selected' : ''}>Haute Couture</option>
                        </select>
                    </div>
                </div>

                <div class="settings-section">
                    <h4>🗺️ Carte</h4>
                    <div class="setting-item">
                        <label for="mapStyleSelect">Style de carte :</label>
                        <select id="mapStyleSelect" onchange="app.mapManager.changeMapStyle(this.value)">
                            <option value="standard" ${settings.mapStyle === 'standard' ? 'selected' : ''}>Standard</option>
                            <option value="watercolor" ${settings.mapStyle === 'watercolor' ? 'selected' : ''}>Aquarelle</option>
                            <option value="toner" ${settings.mapStyle === 'toner' ? 'selected' : ''}>Noir & Blanc</option>
                            <option value="carto-light" ${settings.mapStyle === 'carto-light' ? 'selected' : ''}>Clair</option>
                            <option value="carto-dark" ${settings.mapStyle === 'carto-dark' ? 'selected' : ''}>Sombre</option>
                        </select>
                    </div>
                </div>

                <div class="settings-section">
                    <h4>📊 Données</h4>
                    <div class="setting-actions">
                        <button class="btn btn-secondary" onclick="app.exportImport.exportUserData()">
                            📤 Exporter mes données
                        </button>
                        <button class="btn btn-secondary" onclick="app.exportImport.showImportModal()">
                            📥 Importer des données
                        </button>
                        <button class="btn btn-danger" onclick="app.userManager.resetUserProgress()">
                            🗑️ Réinitialiser progression
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderUserManagement() {
        const container = document.getElementById('usersContent');
        const users = Object.keys(this.app.userManager.users);
        
        let html = `
            <div class="user-management">
                <div class="user-creation">
                    <h4>👤 Créer un nouvel utilisateur</h4>
                    <div class="user-form">
                        <input type="text" id="newUserNameInput" placeholder="Nom de l'utilisateur..." class="form-input">
                        <button class="btn btn-primary" onclick="app.uiManager.createNewUser()">
                            ✨ Créer l'utilisateur
                        </button>
                    </div>
                </div>
                
                <div class="users-list">
                    <h4>👥 Utilisateurs existants (${users.length})</h4>
        `;
        
        if (users.length === 0) {
            html += `
                <div class="empty-state">
                    <p>Aucun utilisateur créé</p>
                    <p>Créez votre premier profil pour commencer l'exploration !</p>
                </div>
            `;
        } else {
            html += '<div class="user-cards">';
            users.forEach(userName => {
                const userData = this.app.userManager.users[userName];
                const isActive = userName === this.app.userManager.currentUser;
                const safeName = escapeHtml(userName);

                html += `
                    <div class="user-card ${isActive ? 'active' : ''}" data-username="${safeName}">
                        <div class="user-info">
                            <h5>${safeName}</h5>
                            <p>${userData.visitedPlaces.size} lieux visités</p>
                            <p>${userData.favorites.length} favoris</p>
                            <small>Créé le ${new Date(userData.stats.createdAt).toLocaleDateString('fr-FR')}</small>
                        </div>
                        <div class="user-actions">
                            ${!isActive ? `
                                <button class="btn btn-sm btn-primary" data-action="select-user" data-user="${safeName}">
                                    Sélectionner
                                </button>
                            ` : `
                                <span class="active-badge">✅ Actif</span>
                            `}
                            <button class="btn btn-sm btn-secondary" data-action="export-user" data-user="${safeName}">
                                📤 Export
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="delete-user" data-user="${safeName}">
                                🗑️ Suppr.
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event delegation for user action buttons
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const user = btn.dataset.user;
            if (!user) return;
            if (action === 'select-user') app.userManager.selectUser(user);
            else if (action === 'export-user') app.exportImport.exportUserData(user);
            else if (action === 'delete-user') app.userManager.deleteUser(user);
        });
    }

    // === CRÉATION D'UTILISATEUR ===
    createNewUser() {
        const input = document.getElementById('newUserNameInput');
        const userName = input.value.trim();
        
        if (userName) {
            if (this.app.userManager.createUser(userName)) {
                this.loadUserSelector();
                this.renderUserManagement();
                input.value = '';
            }
        } else {
            this.app.showNotification('Veuillez saisir un nom d\'utilisateur', 'warning');
            input.focus();
        }
    }
    
    // === UTILITAIRES SUPPLÉMENTAIRES ===
    findPlaceDetails(placeId) {
        // Rechercher les détails d'un lieu par son ID
        for (const [arrKey, arrData] of Object.entries(this.app.parisData)) {
            for (const [catKey, catData] of Object.entries(arrData.categories || {})) {
                for (const place of catData.places || []) {
                    const currentPlaceId = this.app.createPlaceId(arrKey, catKey, place.name);
                    if (currentPlaceId === placeId) {
                        return { place, arrKey, catKey, arrData, catData };
                    }
                }
            }
        }
        return null;
    }
    
    renderFavoriteCard(favorite, details) {
        return `
            <div class="favorite-card">
                <h5>${escapeHtml(details.place.name)}</h5>
                <p class="favorite-location">${escapeHtml(details.arrData.name || details.arrKey)}</p>
                <p class="favorite-category">${this.getCategoryIcon(details.catKey)} ${escapeHtml(details.catData.title)}</p>
                <small>Ajouté le ${new Date(favorite.addedAt).toLocaleDateString('fr-FR')}</small>
            </div>
        `;
    }
    
    renderArrondissementProgress() {
        let html = '';
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            const totalPlaces = this.app.dataManager.getTotalPlacesInArrondissement(arrData);
            const visitedPlaces = this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey);
            const completionPercent = totalPlaces > 0 ? Math.round((visitedPlaces / totalPlaces) * 100) : 0;
            const progressColor = completionPercent >= 70 ? '#059669' : completionPercent >= 40 ? '#d97706' : '#dc2626';
            
            html += `
                <div class="arrondissement-progress-item">
                    <div class="progress-info">
                        <span class="progress-name">${escapeHtml(arrData.name || arrKey)}</span>
                        <span class="progress-stats">${visitedPlaces}/${totalPlaces} - ${completionPercent}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${completionPercent}%; background: ${progressColor};"></div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }
    
    renderAchievementCard(achievement, unlockedData) {
        const isUnlocked = !!unlockedData;
        
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${isUnlocked ? achievement.icon : '🔒'}</div>
                <div class="achievement-content">
                    <h4 class="achievement-title">${escapeHtml(achievement.title)}</h4>
                    <p class="achievement-description">${escapeHtml(achievement.description)}</p>
                    ${isUnlocked ? `
                        <div class="achievement-date">
                            Débloqué le ${new Date(unlockedData.unlockedAt).toLocaleDateString('fr-FR')}
                        </div>
                    ` : `
                        <div class="achievement-progress">
                            En cours...
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
    // === DÉTAILS DE LIEU (MODAL) ===
    showPlaceDetails(placeCard) {
        const arrKey = placeCard.getAttribute('data-arr');
        const catKey = placeCard.getAttribute('data-cat');
        const placeName = placeCard.querySelector('.place-name').textContent.replace(/<[^>]*>/g, '');
        
        // Rechercher les détails complets du lieu
        const placeDetails = this.findPlaceDetails(placeCard.getAttribute('data-place-id'));
        
        if (!placeDetails) {
            this.app.showNotification('Détails du lieu introuvables', 'error');
            return;
        }
        
        const { place } = placeDetails;
        const userData = this.app.getCurrentUserData();
        const placeId = placeCard.getAttribute('data-place-id');
        const isVisited = userData?.visitedPlaces?.has(placeId);
        const isFavorite = userData?.favorites?.some(fav => fav.placeId === placeId);
        const userNote = userData?.notes?.[placeId] || '';
        
        // Créer le contenu de la modal
        const modalContent = document.getElementById('placeModalContent');
        const modalTitle = document.getElementById('placeModalTitle');
        
        if (modalTitle) {
            modalTitle.textContent = place.name;
        }
        
        if (modalContent) {
            const safeDescription = escapeHtml(place.description);
            const safeAddress = escapeHtml(place.address);
            const safeNote = escapeHtml(userNote);
            const safePlaceId = escapeHtml(placeId);
            const safeArrKey = escapeHtml(arrKey);
            const safeCatKey = escapeHtml(catKey);
            const safePlaceName = escapeHtml(placeName);

            modalContent.innerHTML = `
                <div class="place-details"
                     data-place-id="${safePlaceId}"
                     data-arr="${safeArrKey}"
                     data-cat="${safeCatKey}"
                     data-place-name="${safePlaceName}">
                    <div class="place-status">
                        <span class="status-badge ${isVisited ? 'visited' : 'not-visited'}">
                            ${isVisited ? '✅ Visité' : '⭕ Non visité'}
                        </span>
                        ${isFavorite ? '<span class="status-badge favorite">⭐ Favori</span>' : ''}
                    </div>

                    ${place.description ? `
                        <div class="detail-section">
                            <h5>📋 Description</h5>
                            <p>${safeDescription}</p>
                        </div>
                    ` : ''}

                    ${place.address ? `
                        <div class="detail-section">
                            <h5>📍 Adresse</h5>
                            <p>
                                <a href="${generateGoogleMapsUrl(place, this.app.dataManager.getPlaceCoordinates(place, arrKey))}"
                                   target="_blank" rel="noopener"
                                   style="color: var(--paris-blue); text-decoration: underline; cursor: pointer;"
                                   title="Voir sur Google Maps">
                                    ${safeAddress} 🗺️
                                </a>
                            </p>
                        </div>
                    ` : ''}

                    <div class="detail-section">
                        <h5>📝 Ma note personnelle</h5>
                        <textarea id="placeNoteTextarea" class="form-textarea" placeholder="Ajoutez votre note sur ce lieu...">${safeNote}</textarea>
                        <button class="btn btn-primary" data-action="save-note">
                            💾 Sauvegarder la note
                        </button>
                    </div>

                    <div class="detail-actions">
                        <button class="btn ${isVisited ? 'btn-success' : 'btn-secondary'}" data-action="toggle-visit">
                            ${isVisited ? '✅ Marquer non visité' : '⭕ Marquer visité'}
                        </button>

                        <button class="btn ${isFavorite ? 'btn-warning' : 'btn-secondary'}" data-action="toggle-favorite">
                            ${isFavorite ? '⭐ Retirer favori' : '☆ Ajouter favori'}
                        </button>
                    </div>
                </div>
            `;

            // Event delegation for modal actions
            modalContent.onclick = (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const details = modalContent.querySelector('.place-details');
                const pId = details.dataset.placeId;
                const aKey = details.dataset.arr;
                const cKey = details.dataset.cat;
                const pName = details.dataset.placeName;

                if (btn.dataset.action === 'save-note') {
                    this.savePlaceNote(pId);
                } else if (btn.dataset.action === 'toggle-visit') {
                    app.userManager.togglePlaceVisit(aKey, cKey, pName);
                    this.hideModal();
                    this.renderContent();
                } else if (btn.dataset.action === 'toggle-favorite') {
                    app.userManager.toggleFavorite(aKey, cKey, pName);
                    this.hideModal();
                    this.renderContent();
                }
            };
        }
        
        this.showModal('placeModal');
    }
    
    // === SAUVEGARDE DE NOTE ===
    savePlaceNote(placeId) {
        const textarea = document.getElementById('placeNoteTextarea');
        const userData = this.app.getCurrentUserData();
        
        if (!userData || !textarea) return;
        
        const note = textarea.value.trim();
        
        if (!userData.notes) {
            userData.notes = {};
        }
        
        if (note) {
            userData.notes[placeId] = note;
        } else {
            delete userData.notes[placeId];
        }
        
        this.app.userManager.saveUsers();
        // Note sauvegardée
    }
}

// === FONCTIONS GLOBALES UTILITAIRES ===
window.createUser = function() {
    const input = document.getElementById('userNameInput');
    const userName = input.value.trim();
    
    if (userName && window.app) {
        if (window.app.userManager.createUser(userName)) {
            window.app.uiManager.loadUserSelector();
            window.app.uiManager.hideModal();
        }
    } else {
        window.app?.showNotification('Veuillez saisir un nom d\'utilisateur', 'warning');
    }
}
