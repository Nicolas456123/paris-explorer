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
        
        const voiceSearchBtn = document.getElementById('voiceSearchBtn');
        if (voiceSearchBtn && 'webkitSpeechRecognition' in window) {
            voiceSearchBtn.addEventListener('click', () => {
                this.startVoiceSearch();
            });
        } else if (voiceSearchBtn) {
            voiceSearchBtn.style.display = 'none';
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
    
    // === CHANGEMENT D'ONGLET ===
    switchTab(tabName) {
        console.log(`🔄 Changement d'onglet vers: ${tabName}`);
        
        // Désactiver tous les onglets et contenus
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Activer le nouvel onglet
        const newTab = document.querySelector(`[data-tab="${tabName}"]`);
        const newContent = document.getElementById(`${tabName}Content`);
        
        if (newTab) newTab.classList.add('active');
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
                
            case 'collections':
                console.log('📚 Activation onglet collections');
                this.renderCollections();
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
                    !catKey.toLowerCase().includes(this.app.searchFilter.activeFilters.category.toLowerCase())) {
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
        const arrName = arrData.arrondissement?.name || '';
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
            <div class="arrondissement-card" data-arr="${arrKey}">
                <div class="arrondissement-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <div class="arrondissement-info">
                        <h3>${arrData.arrondissement?.name || arrKey}</h3>
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
            <div class="category-section" data-category="${catKey}">
                <h4 class="category-header">
                    ${categoryIcon} ${catData.title}
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
            <div class="${cardClass}" data-place-id="${placeId}" data-arr="${arrKey}" data-cat="${catKey}">
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
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}" 
                           target="_blank" 
                           style="color: inherit; text-decoration: none; cursor: pointer;"
                           title="Voir sur Google Maps">
                            📍 ${place.address}
                        </a>
                    </p>
                ` : ''}
                
                ${place.tags && place.tags.length > 0 ? `
                    <div class="place-tags">
                        ${place.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="place-meta">
                    <small class="place-category">${this.getCategoryIcon(catKey)} ${catKey}</small>
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
        if (!this.app.searchQuery || !text) return text;
        
        const regex = new RegExp(`(${this.app.searchQuery})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
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
        
        this.app.showNotification('Filtres effacés', 'success', 2000);
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
    startVoiceSearch() {
        if (!('webkitSpeechRecognition' in window)) {
            this.app.showNotification('Recherche vocale non supportée', 'error');
            return;
        }
        
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            this.app.showNotification('🎤 Parlez maintenant...', 'info', 0);
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = transcript;
                this.app.searchFilter.onSearchInput(transcript);
            }
            this.hideModal();
            this.app.showNotification(`Recherche: "${transcript}"`, 'success');
        };
        
        recognition.onerror = (event) => {
            this.hideModal();
            this.app.showNotification('Erreur de reconnaissance vocale', 'error');
        };
        
        recognition.onend = () => {
            this.hideModal();
        };
        
        recognition.start();
    }
    
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
                    <h4>🎨 Apparence</h4>
                    
                    <div class="setting-item">
                        <label for="themeSelect">Thème de l'interface :</label>
                        <select id="themeSelect" onchange="app.userManager.updateSettingAndApply('theme', this.value)">
                            <option value="paris-classic" ${settings.theme === 'paris-classic' ? 'selected' : ''}>🏛️ Paris Classique</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>🌙 Mode Sombre</option>
                            <option value="versailles" ${settings.theme === 'versailles' ? 'selected' : ''}>👑 Versailles</option>
                            <option value="montmartre" ${settings.theme === 'montmartre' ? 'selected' : ''}>🎨 Montmartre</option>
                            <option value="saint-germain" ${settings.theme === 'saint-germain' ? 'selected' : ''}>🌿 Saint-Germain</option>
                            <option value="marais" ${settings.theme === 'marais' ? 'selected' : ''}>🏛️ Le Marais</option>
                            <option value="haute-couture" ${settings.theme === 'haute-couture' ? 'selected' : ''}>👗 Haute Couture</option>
                            <option value="high-contrast" ${settings.theme === 'high-contrast' ? 'selected' : ''}>🔲 Contraste Élevé</option>
                            <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>🍂 Automatique Saisonnier</option>
                        </select>
                        <small class="setting-help">Le thème s'applique instantanément à toute l'interface</small>
                    </div>
                    
                    <div class="setting-item">
                        <label class="checkbox-container">
                            <input type="checkbox" ${settings.compactMode ? 'checked' : ''} 
                                   onchange="app.userManager.updateSettingAndApply('compactMode', this.checked)">
                            <span class="checkmark"></span>
                            Mode compact
                        </label>
                        <small class="setting-help">Affichage plus dense pour les écrans plus petits</small>
                    </div>
                    
                    <div class="setting-item">
                        <label class="checkbox-container">
                            <input type="checkbox" ${settings.animations !== false ? 'checked' : ''} 
                                   onchange="app.userManager.updateSettingAndApply('animations', this.checked)">
                            <span class="checkmark"></span>
                            Animations et transitions
                        </label>
                        <small class="setting-help">Désactiver si vous préférez une interface plus rapide</small>
                    </div>
                    
                    <div class="setting-item">
                        <label class="checkbox-container">
                            <input type="checkbox" ${settings.highContrast ? 'checked' : ''} 
                                   onchange="app.userManager.updateSettingAndApply('highContrast', this.checked)">
                            <span class="checkmark"></span>
                            Contraste élevé (accessibilité)
                        </label>
                        <small class="setting-help">Pour une meilleure visibilité</small>
                    </div>
                    
                    <div class="setting-item">
                        <button class="btn btn-secondary" onclick="app.userManager.resetTheme()">
                            🔄 Réinitialiser le thème
                        </button>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>🔔 Notifications</h4>
                    <div class="setting-item">
                        <label class="checkbox-container">
                            <input type="checkbox" ${settings.notifications !== false ? 'checked' : ''} 
                                   onchange="app.userManager.updateSettingAndApply('notifications', this.checked)">
                            <span class="checkmark"></span>
                            Activer les notifications
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>🗺️ Carte</h4>
                    <div class="setting-item">
                        <label for="mapStyleSelect">Style de carte :</label>
                        <select id="mapStyleSelect" onchange="app.userManager.updateSettingAndApply('mapStyle', this.value)">
                            <option value="standard" ${settings.mapStyle === 'standard' ? 'selected' : ''}>Standard</option>
                            <option value="satellite" ${settings.mapStyle === 'satellite' ? 'selected' : ''}>Satellite</option>
                            <option value="terrain" ${settings.mapStyle === 'terrain' ? 'selected' : ''}>Terrain</option>
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
                
                html += `
                    <div class="user-card ${isActive ? 'active' : ''}">
                        <div class="user-info">
                            <h5>${userName}</h5>
                            <p>${userData.visitedPlaces.size} lieux visités</p>
                            <p>${userData.favorites.length} favoris</p>
                            <small>Créé le ${new Date(userData.stats.createdAt).toLocaleDateString('fr-FR')}</small>
                        </div>
                        <div class="user-actions">
                            ${!isActive ? `
                                <button class="btn btn-sm btn-primary" onclick="app.userManager.selectUser('${userName}')">
                                    Sélectionner
                                </button>
                            ` : `
                                <span class="active-badge">✅ Actif</span>
                            `}
                            <button class="btn btn-sm btn-secondary" onclick="app.exportImport.exportUserData('${userName}')">
                                📤 Export
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.userManager.deleteUser('${userName}')">
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
                <h5>${details.place.name}</h5>
                <p class="favorite-location">${details.arrData.arrondissement?.name || details.arrKey}</p>
                <p class="favorite-category">${this.getCategoryIcon(details.catKey)} ${details.catData.title}</p>
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
                        <span class="progress-name">${arrData.arrondissement?.name || arrKey}</span>
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
                    <h4 class="achievement-title">${achievement.title}</h4>
                    <p class="achievement-description">${achievement.description}</p>
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
            modalContent.innerHTML = `
                <div class="place-details">
                    <div class="place-status">
                        <span class="status-badge ${isVisited ? 'visited' : 'not-visited'}">
                            ${isVisited ? '✅ Visité' : '⭕ Non visité'}
                        </span>
                        ${isFavorite ? '<span class="status-badge favorite">⭐ Favori</span>' : ''}
                    </div>
                    
                    ${place.description ? `
                        <div class="detail-section">
                            <h5>📋 Description</h5>
                            <p>${place.description}</p>
                        </div>
                    ` : ''}
                    
                    ${place.address ? `
                        <div class="detail-section">
                            <h5>📍 Adresse</h5>
                            <p>
                                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}" 
                                   target="_blank" 
                                   style="color: var(--paris-blue); text-decoration: underline; cursor: pointer;"
                                   title="Voir sur Google Maps">
                                    ${place.address} 🗺️
                                </a>
                            </p>
                        </div>
                    ` : ''}
                    
                    ${place.tags && place.tags.length > 0 ? `
                        <div class="detail-section">
                            <h5>🏷️ Tags</h5>
                            <div class="tags-list">
                                ${place.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="detail-section">
                        <h5>📝 Ma note personnelle</h5>
                        <textarea id="placeNoteTextarea" class="form-textarea" placeholder="Ajoutez votre note sur ce lieu...">${userNote}</textarea>
                        <button class="btn btn-primary" onclick="app.uiManager.savePlaceNote('${placeId}')">
                            💾 Sauvegarder la note
                        </button>
                    </div>
                    
                    <div class="detail-actions">
                        <button class="btn ${isVisited ? 'btn-success' : 'btn-secondary'}" 
                                onclick="app.userManager.togglePlaceVisit('${arrKey}', '${catKey}', '${placeName}'); app.uiManager.hideModal(); app.uiManager.renderContent();">
                            ${isVisited ? '✅ Marquer non visité' : '⭕ Marquer visité'}
                        </button>
                        
                        <button class="btn ${isFavorite ? 'btn-warning' : 'btn-secondary'}" 
                                onclick="app.userManager.toggleFavorite('${arrKey}', '${catKey}', '${placeName}'); app.uiManager.hideModal(); app.uiManager.renderContent();">
                            ${isFavorite ? '⭐ Retirer favori' : '☆ Ajouter favori'}
                        </button>
                    </div>
                </div>
            `;
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
        this.app.showNotification('Note sauvegardée', 'success');
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
