// ===== UI MANAGER - VERSION REFACTORISÉE SANS DUPLICATION =====

class UIManager {
    constructor(app) {
        this.app = app;
        this.searchDebounceTimer = null;
    }
    
    // === RENDU DE L'INTERFACE ===
    renderContent() {
        if (!this.app.isDataLoaded) return;
        
        const content = document.getElementById('mainContent');
        content.innerHTML = '';
        
        if (!this.app.parisData || Object.keys(this.app.parisData).length === 0) {
            content.innerHTML = '<div class="error-message"><div class="error-content">Aucune donnée disponible</div></div>';
            return;
        }
        
        // Créer les cartes d'arrondissement
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            const arrDiv = this.createArrondissementCard(arrKey, arrData);
            content.appendChild(arrDiv);
        });
        
        // Afficher message si aucun résultat trouvé
        if (content.children.length === 0) {
            content.innerHTML = `
                <div class="error-message">
                    <div class="error-content">
                        <h3>🔍 Aucun résultat trouvé</h3>
                        <p>Aucun lieu ne correspond à votre recherche "${this.app.searchQuery}"</p>
                        <button onclick="document.getElementById('searchInput').value = ''; app.uiManager.onSearchInput('')" 
                                style="margin-top: 15px; padding: 10px 20px; background: #D4AF37; color: #1e3a8a; border: none; border-radius: 20px; cursor: pointer;">
                            Effacer la recherche
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    createArrondissementCard(arrKey, arrData) {
        const userData = this.app.getCurrentUserData();
        const visitedInArr = this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey);
        const totalInArr = this.app.dataManager.getTotalPlacesInArrondissement(arrData);
        const completionPercent = totalInArr > 0 ? Math.round((visitedInArr / totalInArr) * 100) : 0;
        
        const arrDiv = document.createElement('div');
        arrDiv.className = 'arrondissement-card collapsed'; // Fermé par défaut
        
        // Extraire le numéro de l'arrondissement
        const arrNumber = arrKey.replace(/[^\d]/g, '') || arrKey;
        
        // Déterminer si l'arrondissement contient des résultats de recherche
        const hasSearchResults = this.arrondissementHasSearchResults(arrKey, arrData);
        
        // Si recherche active et pas de résultats, ne pas afficher
        if (this.app.searchQuery && !hasSearchResults) {
            arrDiv.style.display = 'none';
            return arrDiv;
        }
        
        arrDiv.innerHTML = `
            <div class="arrondissement-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="arrondissement-number">${arrNumber}</div>
                <div class="arrondissement-title">${arrData.title}</div>
                <div class="arrondissement-stats">
                    <span class="completion-badge">${visitedInArr}/${totalInArr}</span>
                    <span class="completion-badge">${completionPercent}%</span>
                    <div class="toggle-icon">▼</div>
                </div>
            </div>
            <div class="arrondissement-content">
                ${this.renderCategories(arrKey, arrData.categories)}
            </div>
        `;
        
        return arrDiv;
    }
    
    arrondissementHasSearchResults(arrKey, arrData) {
        if (!this.app.searchQuery) return true;
        
        return Object.entries(arrData.categories || {}).some(([catKey, catData]) => {
            return (catData.places || []).some(place => 
                // UTILISE LA MÉTHODE DU DATA-MANAGER (plus de duplication)
                this.app.dataManager.matchesSearch(place, this.app.searchQuery.toLowerCase())
            );
        });
    }
    
    renderCategories(arrKey, categories) {
        if (!categories) return '';
        
        return Object.entries(categories).map(([catKey, catData]) => {
            const placesHtml = this.renderPlaces(arrKey, catKey, catData.places || []);
            
            // Si hideCompleted et aucun lieu visible, afficher message de completion
            if (this.app.hideCompleted && placesHtml.trim() === '') {
                return `
                    <div class="category-section">
                        <div class="category-header">
                            <span class="category-icon">${this.getCategoryIcon(catData.title)}</span>
                            ${catData.title}
                        </div>
                        <div class="completion-message">🎉 Catégorie entièrement explorée !</div>
                    </div>
                `;
            }
            
            // Si recherche active et aucun résultat, ne pas afficher la catégorie
            if (this.app.searchQuery && placesHtml.trim() === '') {
                return '';
            }
            
            return `
                <div class="category-section">
                    <div class="category-header">
                        <span class="category-icon">${this.getCategoryIcon(catData.title)}</span>
                        ${catData.title}
                    </div>
                    <div class="places-grid">
                        ${placesHtml}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getCategoryIcon(title) {
        const titleLower = title.toLowerCase();
        
        if (titleLower.includes('monument')) return '🏛️';
        if (titleLower.includes('restaurant')) return '🍽️';
        if (titleLower.includes('café') || titleLower.includes('cafe')) return '☕';
        if (titleLower.includes('bar')) return '🍻';
        if (titleLower.includes('shopping') || titleLower.includes('boutique')) return '🛍️';
        if (titleLower.includes('musée') || titleLower.includes('museum')) return '🎨';
        if (titleLower.includes('parc') || titleLower.includes('jardin')) return '🌳';
        if (titleLower.includes('église') || titleLower.includes('cathédrale')) return '⛪';
        if (titleLower.includes('hôtel') || titleLower.includes('hotel')) return '🏨';
        if (titleLower.includes('théâtre') || titleLower.includes('spectacle')) return '🎭';
        
        // Extraire le premier caractère ou emoji du titre
        return title.split(' ')[0] || '📍';
    }
    
    renderPlaces(arrKey, catKey, places) {
        return places.map(place => this.renderPlace(arrKey, catKey, place)).join('');
    }
    
    renderPlace(arrKey, catKey, place) {
        const placeId = this.app.dataManager.createPlaceId(arrKey, catKey, place.name);
        const userData = this.app.getCurrentUserData();
        const isVisited = userData && userData.visitedPlaces instanceof Set ? 
            userData.visitedPlaces.has(placeId) : false;
        
        // Filtres de recherche et statut - UTILISE LA MÉTHODE DU DATA-MANAGER
        if (this.app.searchQuery && !this.app.dataManager.matchesSearch(place, this.app.searchQuery.toLowerCase())) {
            return '';
        }
        
        if (this.app.hideCompleted && isVisited) {
            return '';
        }

        // Créer le lien Google Maps si adresse disponible
        const addressHtml = place.address ? `
            <div class="place-address">
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}" 
                   target="_blank" 
                   class="address-link" 
                   onclick="event.stopPropagation();">
                    📍 ${place.address}
                </a>
            </div>
        ` : '';
        
        // Mettre en surbrillance les termes de recherche
        const highlightedName = this.highlightSearchTerms(place.name);
        const highlightedDescription = this.highlightSearchTerms(place.description);
        
        return `
            <div class="place-card ${isVisited ? 'visited' : ''}" data-place-id="${placeId}">
                <div class="place-header">
                    <input type="checkbox" class="place-checkbox" ${isVisited ? 'checked' : ''} 
                           onchange="app.userManager.togglePlace('${placeId}', event)">
                    <div class="place-content">
                        <div class="place-name">${highlightedName}</div>
                        <div class="place-description">${highlightedDescription}</div>
                        ${place.tags ? `
                            <div class="place-tags">
                                ${place.tags.map(tag => `<span class="place-tag">${this.highlightSearchTerms(tag)}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${addressHtml}
                    </div>
                </div>
            </div>
        `;
    }
    
    highlightSearchTerms(text) {
        if (!this.app.searchQuery || !text) return text;
        
        const regex = new RegExp(`(${this.app.searchQuery})`, 'gi');
        return text.replace(regex, '<mark style="background: #F7DC6F; color: #1e3a8a; padding: 1px 3px; border-radius: 3px;">$1</mark>');
    }
    
    // === MISE À JOUR DES ÉLÉMENTS ===
    updatePlaceCard(placeId, isVisited) {
        const card = document.querySelector(`[data-place-id="${placeId}"]`);
        if (card) {
            const checkbox = card.querySelector('.place-checkbox');
            if (checkbox) {
                checkbox.checked = isVisited;
            }
            
            if (isVisited) {
                card.classList.add('visited');
            } else {
                card.classList.remove('visited');
            }
            
            // Si on cache les visités et que c'est maintenant visité, le cacher
            if (this.app.hideCompleted && isVisited) {
                card.style.display = 'none';
            }
        }
        
        // Vérifier si la catégorie est maintenant vide
        const categorySection = card?.closest('.category-section');
        if (categorySection && this.app.hideCompleted) {
            const visibleCards = categorySection.querySelectorAll('.place-card:not([style*="display: none"])');
            const categoryContent = categorySection.querySelector('.places-grid');
            
            if (visibleCards.length === 0) {
                categoryContent.innerHTML = '<div class="completion-message">🎉 Catégorie entièrement explorée !</div>';
            }
        }
    }
    
    // === STATISTIQUES ===
    updateStats() {
        const userData = this.app.getCurrentUserData();
        const totalPlaces = this.app.dataManager.getTotalPlaces();
        const visitedCount = userData && userData.visitedPlaces instanceof Set ? 
            userData.visitedPlaces.size : 0;
        const completionRate = totalPlaces > 0 ? Math.round((visitedCount / totalPlaces) * 100) : 0;
        const streak = userData?.stats?.streak || 0;
        
        // Mise à jour des nombres
        this.animateNumberChange('totalPlaces', totalPlaces);
        this.animateNumberChange('visitedPlaces', visitedCount);
        this.animateNumberChange('completionRate', completionRate, '%');
        this.animateNumberChange('currentStreak', streak);
        
        // Mise à jour des barres de progression
        setTimeout(() => {
            document.getElementById('visitedProgress').style.width = `${completionRate}%`;
            document.getElementById('completionProgress').style.width = `${completionRate}%`;
            document.getElementById('streakProgress').style.width = `${Math.min(streak, 20) * 5}%`;
        }, 100);
        
        // Mettre à jour le titre de la page
        document.title = `Paris Explorer - ${completionRate}% complété (${visitedCount}/${totalPlaces})`;
    }
    
    animateNumberChange(elementId, newValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const currentValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
        
        if (currentValue === newValue) return;
        
        const duration = 1000; // 1 seconde
        const steps = 30;
        const increment = (newValue - currentValue) / steps;
        const stepDuration = duration / steps;
        
        let currentStep = 0;
        
        const animate = () => {
            currentStep++;
            const value = Math.round(currentValue + (increment * currentStep));
            element.textContent = value + suffix;
            
            if (currentStep < steps) {
                setTimeout(animate, stepDuration);
            } else {
                element.textContent = newValue + suffix;
            }
        };
        
        animate();
    }
    
    // === GESTION DES UTILISATEURS ===
    loadUserSelector() {
        const selector = document.getElementById('userSelector');
        selector.innerHTML = '<option value="">Choisir un explorateur...</option>';
        
        Object.keys(this.app.getUsers()).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selector.appendChild(option);
        });
    }
    
    updateUsersList() {
        const userList = document.getElementById('userList');
        userList.innerHTML = '';
        
        const users = this.app.getUsers();
        
        if (Object.keys(users).length === 0) {
            userList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #6b7280;">
                    <p>👤 Aucun explorateur créé</p>
                    <p style="font-size: 14px; margin-top: 8px;">Créez votre premier profil ci-dessus</p>
                </div>
            `;
            return;
        }
        
        Object.values(users).forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            const visitedCount = user.visitedPlaces instanceof Set ? 
                user.visitedPlaces.size : 
                (Array.isArray(user.visitedPlaces) ? user.visitedPlaces.length : 0);
            
            const totalPlaces = this.app.dataManager.getTotalPlaces();
            const completionPercent = totalPlaces > 0 ? Math.round((visitedCount / totalPlaces) * 100) : 0;
            
            const lastActiveDate = new Date(user.lastActive);
            const daysSinceActive = Math.floor((new Date() - lastActiveDate) / (1000 * 60 * 60 * 24));
            let lastActiveText = '';
            
            if (daysSinceActive === 0) {
                lastActiveText = 'Aujourd\'hui';
            } else if (daysSinceActive === 1) {
                lastActiveText = 'Hier';
            } else if (daysSinceActive < 7) {
                lastActiveText = `Il y a ${daysSinceActive} jours`;
            } else {
                lastActiveText = lastActiveDate.toLocaleDateString('fr-FR');
            }
            
            userItem.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-progress">
                        ${visitedCount} lieux explorés (${completionPercent}%) • ${lastActiveText}
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-success" onclick="app.userManager.setCurrentUser('${user.name}')">
                        Sélectionner
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.userManager.deleteUser('${user.name}')">
                        Supprimer
                    </button>
                </div>
            `;
            
            userList.appendChild(userItem);
        });
    }
    
    // === GESTION DES ONGLETS ===
    switchTab(tabName) {
        // Mise à jour des onglets
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Mise à jour du contenu
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        // Notifier l'application du changement
        this.app.onTabChanged(tabName);
    }
    
    // === MODAL ===
    showModal() {
        const modal = document.getElementById('userModal');
        modal.classList.add('show');
        this.updateUsersList();
        
        // Focus sur le champ de saisie
        setTimeout(() => {
            document.getElementById('newUserName').focus();
        }, 300);
    }
    
    hideModal() {
        const modal = document.getElementById('userModal');
        modal.classList.remove('show');
    }
    
    // === ÉVÉNEMENTS ===
    setupEventListeners() {
        this.setupTabEvents();
        this.setupUserEvents();
        this.setupModalEvents();
        this.setupSearchEvents();
        this.setupActionEvents();
        this.setupKeyboardShortcuts();
    }
    
    setupTabEvents() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    }
    
    setupUserEvents() {
        // Sélecteur d'utilisateur
        document.getElementById('userSelector').addEventListener('change', (e) => {
            if (e.target.value) {
                this.app.userManager.setCurrentUser(e.target.value);
            }
        });
        
        // Bouton gestion des utilisateurs
        document.getElementById('manageUsersBtn').addEventListener('click', () => {
            this.showModal();
        });
        
        // Création d'utilisateur
        document.getElementById('createUserBtn').addEventListener('click', () => {
            const nameInput = document.getElementById('newUserName');
            if (this.app.userManager.createUser(nameInput.value)) {
                nameInput.value = '';
                this.updateUsersList();
            }
        });
        
        // Validation par Entrée
        document.getElementById('newUserName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('createUserBtn').click();
            }
        });
    }
    
    setupModalEvents() {
        // Fermeture du modal
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideModal();
        });
        
        // Fermeture par clic sur l'overlay
        document.getElementById('userModal').addEventListener('click', (e) => {
            if (e.target.id === 'userModal') {
                this.hideModal();
            }
        });
        
        // Fermeture par Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('userModal');
                if (modal.classList.contains('show')) {
                    this.hideModal();
                }
            }
        });
    }
    
    setupSearchEvents() {
        const searchInput = document.getElementById('searchInput');
        
        searchInput.addEventListener('input', (e) => {
            // Débounce pour éviter trop de rendus
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => {
                this.onSearchInput(e.target.value);
            }, 300);
        });
        
        // Effacer la recherche avec Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.target.value = '';
                this.onSearchInput('');
            }
        });
    }
    
    onSearchInput(value) {
        this.app.searchQuery = value.toLowerCase().trim();
        this.renderContent();
        
        // Ouvrir automatiquement les arrondissements si recherche
        if (this.app.searchQuery) {
            document.querySelectorAll('.arrondissement-card').forEach(card => {
                card.classList.remove('collapsed');
            });
        }
    }
    
    setupActionEvents() {
        // Toggle masquer complétés
        document.getElementById('hideCompletedBtn').addEventListener('click', () => {
            this.app.hideCompleted = !this.app.hideCompleted;
            const btn = document.getElementById('hideCompletedBtn');
            
            if (this.app.hideCompleted) {
                btn.textContent = '👁️ Afficher Tous';
                btn.classList.add('active');
            } else {
                btn.textContent = '👁️ Masquer les Explorés';
                btn.classList.remove('active');
            }
            
            this.renderContent();
        });
        
        // Actions d'expansion
        document.getElementById('expandAllBtn').addEventListener('click', () => {
            document.querySelectorAll('.arrondissement-card').forEach(card => {
                card.classList.remove('collapsed');
            });
            this.app.showNotification('Tous les arrondissements ouverts', 'info');
        });
        
        document.getElementById('collapseAllBtn').addEventListener('click', () => {
            document.querySelectorAll('.arrondissement-card').forEach(card => {
                card.classList.add('collapsed');
            });
            this.app.showNotification('Tous les arrondissements fermés', 'info');
        });
        
        // Réinitialisation
        document.getElementById('resetProgressBtn').addEventListener('click', () => {
            this.app.userManager.resetUserProgress();
        });
    }
    
    // === RACCOURCIS CLAVIER ===
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F pour focus sur la recherche
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            
            // Ctrl/Cmd + U pour ouvrir le modal utilisateurs
            if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                e.preventDefault();
                this.showModal();
            }
            
            // Ctrl/Cmd + 1/2 pour changer d'onglet
            if ((e.ctrlKey || e.metaKey) && e.key === '1') {
                e.preventDefault();
                this.switchTab('list');
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === '2') {
                e.preventDefault();
                this.switchTab('map');
            }
        });
    }
}
