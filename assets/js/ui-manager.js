// ===== UI MANAGER AVANCÉ - INTERFACE UTILISATEUR COMPLÈTE =====

class UIManager {
    constructor(app) {
        this.app = app;
        this.searchDebounceTimer = null;
        this.currentNoteModal = null;
        this.draggedPlace = null;
    }
    
    // === RENDU PRINCIPAL AMÉLIORÉ ===
    renderContent() {
        if (!this.app.isDataLoaded) return;
        
        const content = document.getElementById('mainContent');
        content.innerHTML = '';
        
        if (!this.app.parisData || Object.keys(this.app.parisData).length === 0) {
            content.innerHTML = '<div class="error-message"><div class="error-content">Aucune donnée disponible</div></div>';
            return;
        }
        
        // Créer les cartes d'arrondissement améliorées
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            const arrDiv = this.createAdvancedArrondissementCard(arrKey, arrData);
            content.appendChild(arrDiv);
        });
        
        // Message si aucun résultat
        if (content.children.length === 0) {
            content.innerHTML = `
                <div class="no-results-container">
                    <div class="no-results-content">
                        <div class="no-results-icon">🔍</div>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucun lieu ne correspond à votre recherche "${this.app.searchQuery}"</p>
                        <button class="btn btn-primary" onclick="this.clearSearch()">
                            Effacer la recherche
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Appliquer les paramètres utilisateur
        this.applyUserSettings();
    }
    
    createAdvancedArrondissementCard(arrKey, arrData) {
        const userData = this.app.getCurrentUserData();
        const visitedInArr = this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey);
        const totalInArr = this.app.dataManager.getTotalPlacesInArrondissement(arrData);
        const completionPercent = totalInArr > 0 ? Math.round((visitedInArr / totalInArr) * 100) : 0;
        
        // Calcul des favoris dans cet arrondissement
        const favoritesInArr = this.getFavoritesInArrondissement(arrKey, arrData);
        
        const arrDiv = document.createElement('div');
        arrDiv.className = 'arrondissement-card advanced collapsed';
        
        const arrNumber = arrKey.replace(/[^\d]/g, '') || arrKey;
        const hasSearchResults = this.arrondissementHasSearchResults(arrKey, arrData);
        
        if (this.app.searchQuery && !hasSearchResults) {
            arrDiv.style.display = 'none';
            return arrDiv;
        }
        
        // Déterminer la couleur de progression
        let progressColor = '#d97706'; // Orange par défaut
        if (completionPercent >= 100) progressColor = '#059669'; // Vert
        else if (completionPercent >= 70) progressColor = '#10b981'; // Vert clair
        else if (completionPercent >= 40) progressColor = '#f59e0b'; // Jaune
        else if (completionPercent > 0) progressColor = '#ef4444'; // Rouge
        
        arrDiv.innerHTML = `
            <div class="arrondissement-header advanced" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="arrondissement-number" style="background: ${progressColor}">${arrNumber}</div>
                <div class="arrondissement-main">
                    <div class="arrondissement-title">${arrData.title}</div>
                    <div class="arrondissement-description">${arrData.description || ''}</div>
                </div>
                <div class="arrondissement-metrics">
                    <div class="metric-item">
                        <span class="metric-value">${visitedInArr}/${totalInArr}</span>
                        <span class="metric-label">Visités</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${favoritesInArr}</span>
                        <span class="metric-label">⭐ Favoris</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${completionPercent}%</span>
                        <span class="metric-label">Complété</span>
                    </div>
                </div>
                <div class="arrondissement-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); this.parentElement.parentElement.parentElement.scrollIntoView({behavior: 'smooth'});" 
                            title="Aller en haut">⬆️</button>
                    <div class="toggle-icon">▼</div>
                </div>
            </div>
            <div class="arrondissement-progress-bar">
                <div class="progress-fill" style="width: ${completionPercent}%; background: ${progressColor}"></div>
            </div>
            <div class="arrondissement-content">
                ${this.renderAdvancedCategories(arrKey, arrData.categories)}
            </div>
        `;
        
        return arrDiv;
    }
    
    renderAdvancedCategories(arrKey, categories) {
        if (!categories) return '';
        
        return Object.entries(categories).map(([catKey, catData]) => {
            const placesHtml = this.renderAdvancedPlaces(arrKey, catKey, catData.places || []);
            
            if (this.app.hideCompleted && placesHtml.trim() === '') {
                return `
                    <div class="category-section completed">
                        <div class="category-header">
                            <span class="category-icon">${this.getCategoryIcon(catData.title)}</span>
                            <span class="category-title">${catData.title}</span>
                            <span class="completion-badge">✅ Complète</span>
                        </div>
                        <div class="completion-message">
                            <div class="completion-content">
                                <span class="completion-emoji">🎉</span>
                                <span>Catégorie entièrement explorée!</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            if (this.app.searchQuery && placesHtml.trim() === '') {
                return '';
            }
            
            const categoryPlaces = catData.places || [];
            const visitedInCategory = categoryPlaces.filter(place => {
                const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                const userData = this.app.getCurrentUserData();
                return userData?.visitedPlaces?.has(placeId);
            }).length;
            
            return `
                <div class="category-section advanced">
                    <div class="category-header advanced">
                        <div class="category-info">
                            <span class="category-icon">${this.getCategoryIcon(catData.title)}</span>
                            <span class="category-title">${catData.title}</span>
                            <span class="category-count">${visitedInCategory}/${categoryPlaces.length}</span>
                        </div>
                        <div class="category-actions">
                            <button class="btn-icon" onclick="this.toggleCategoryFavorites('${arrKey}', '${catKey}')" 
                                    title="Ajouter tous aux favoris">⭐</button>
                            <button class="btn-icon" onclick="this.markCategoryAsVisited('${arrKey}', '${catKey}')" 
                                    title="Marquer tous comme visités">✅</button>
                        </div>
                    </div>
                    <div class="places-grid advanced" data-category="${catKey}">
                        ${placesHtml}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderAdvancedPlaces(arrKey, catKey, places) {
        return places.map(place => this.renderAdvancedPlace(arrKey, catKey, place)).join('');
    }
    
    renderAdvancedPlace(arrKey, catKey, place) {
        const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
        const userData = this.app.getCurrentUserData();
        const isVisited = userData?.visitedPlaces?.has(placeId) || false;
        const isFavorite = userData?.favorites?.has(placeId) || false;
        const hasNote = userData?.notes?.[placeId] || false;
        
        // Filtres
        if (this.app.searchQuery && !this.matchesSearch(place)) return '';
        if (this.app.hideCompleted && isVisited) return '';
        
        const addressHtml = place.address ? `
            <div class="place-address advanced">
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}" 
                   target="_blank" 
                   class="address-link advanced" 
                   onclick="event.stopPropagation();">
                    📍 ${place.address}
                </a>
            </div>
        ` : '';
        
        const tagsHtml = place.tags ? `
            <div class="place-tags advanced">
                ${place.tags.map(tag => `<span class="place-tag advanced">${this.highlightSearchTerms(tag)}</span>`).join('')}
            </div>
        ` : '';
        
        return `
            <div class="place-card advanced ${isVisited ? 'visited' : ''} ${isFavorite ? 'favorite' : ''}" 
                 data-place-id="${placeId}"
                 draggable="true"
                 ondragstart="app.uiManager.onPlaceDragStart(event, '${placeId}')">
                
                <div class="place-header advanced">
                    <div class="place-checkbox-container">
                        <input type="checkbox" class="place-checkbox advanced" ${isVisited ? 'checked' : ''} 
                               onchange="app.userManager.togglePlace('${placeId}', event)">
                    </div>
                    
                    <div class="place-content advanced">
                        <div class="place-name advanced">${this.highlightSearchTerms(place.name)}</div>
                        <div class="place-description advanced">${this.highlightSearchTerms(place.description)}</div>
                        ${tagsHtml}
                        ${addressHtml}
                    </div>
                    
                    <div class="place-actions advanced">
                        <button class="btn-action favorite ${isFavorite ? 'active' : ''}" 
                                onclick="app.userManager.toggleFavorite('${placeId}', event)"
                                title="${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                            ${isFavorite ? '⭐' : '☆'}
                        </button>
                        
                        <button class="btn-action note ${hasNote ? 'active' : ''}" 
                                onclick="app.uiManager.openNoteModal('${placeId}', event)"
                                title="${hasNote ? 'Modifier la note' : 'Ajouter une note'}">
                            📝
                        </button>
                        
                        <div class="btn-action dropdown">
                            <button class="dropdown-toggle" onclick="this.parentElement.classList.toggle('open')">⋮</button>
                            <div class="dropdown-menu">
                                <button onclick="app.uiManager.addToCollection('${placeId}')">📚 Ajouter à collection</button>
                                <button onclick="app.uiManager.sharePlace('${placeId}')">📤 Partager</button>
                                <button onclick="app.uiManager.reportPlace('${placeId}')">⚠️ Signaler</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${hasNote ? `
                    <div class="place-note-preview">
                        <div class="note-icon">📝</div>
                        <div class="note-text">${hasNote.text.substring(0, 100)}${hasNote.text.length > 100 ? '...' : ''}</div>
                    </div>
                ` : ''}
                
                <div class="place-status-indicators">
                    ${isVisited ? '<span class="status-indicator visited">✅ Visité</span>' : ''}
                    ${isFavorite ? '<span class="status-indicator favorite">⭐ Favori</span>' : ''}
                    ${hasNote ? '<span class="status-indicator noted">📝 Noté</span>' : ''}
                </div>
            </div>
        `;
    }
    
    // === MODULE FAVORIS ===
    renderFavorites() {
        const userData = this.app.getCurrentUserData();
        const favoritesContainer = document.getElementById('favoritesGrid');
        
        if (!userData || !userData.favorites || userData.favorites.size === 0) {
            favoritesContainer.innerHTML = `
                <div class="empty-state favorites">
                    <div class="empty-icon">⭐</div>
                    <h3>Aucun lieu favori</h3>
                    <p>Ajoutez des lieux à vos favoris depuis la liste principale en cliquant sur l'étoile</p>
                    <button class="btn btn-primary" onclick="app.uiManager.switchTab('list')">
                        Découvrir des lieux
                    </button>
                </div>
            `;
            return;
        }
        
        const favoritesByArrondissement = this.groupFavoritesByArrondissement();
        
        favoritesContainer.innerHTML = `
            <div class="favorites-header">
                <div class="favorites-stats">
                    <span class="stat-item">
                        <span class="stat-number">${userData.favorites.size}</span>
                        <span class="stat-label">Favoris</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-number">${Object.keys(favoritesByArrondissement).length}</span>
                        <span class="stat-label">Arrondissements</span>
                    </span>
                </div>
                <div class="favorites-actions">
                    <button class="btn btn-secondary" onclick="app.uiManager.exportFavorites()">📤 Exporter</button>
                    <button class="btn btn-primary" onclick="app.uiManager.createCollectionFromFavorites()">📚 Créer Collection</button>
                </div>
            </div>
            
            <div class="favorites-content">
                ${Object.entries(favoritesByArrondissement).map(([arrKey, places]) => `
                    <div class="favorites-section">
                        <h4 class="favorites-section-title">${this.getArrondissementTitle(arrKey)} (${places.length})</h4>
                        <div class="favorites-places">
                            ${places.map(place => this.renderFavoritePlace(place)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderFavoritePlace(placeData) {
        const { placeId, arrKey, catKey, place } = placeData;
        const userData = this.app.getCurrentUserData();
        const isVisited = userData?.visitedPlaces?.has(placeId) || false;
        const note = userData?.notes?.[placeId];
        
        return `
            <div class="favorite-place-card ${isVisited ? 'visited' : ''}" data-place-id="${placeId}">
                <div class="favorite-place-header">
                    <div class="place-info">
                        <h5 class="place-name">${place.name}</h5>
                        <p class="place-description">${place.description}</p>
                        ${place.address ? `<p class="place-address">📍 ${place.address}</p>` : ''}
                    </div>
                    <div class="place-actions">
                        <button class="btn-action" onclick="app.userManager.toggleFavorite('${placeId}', event)" title="Retirer des favoris">❌</button>
                        <button class="btn-action" onclick="app.uiManager.openNoteModal('${placeId}', event)" title="Ajouter/modifier note">📝</button>
                    </div>
                </div>
                ${note ? `
                    <div class="favorite-note">
                        <strong>Ma note:</strong> ${note.text}
                    </div>
                ` : ''}
                <div class="favorite-actions">
                    <button class="btn btn-sm ${isVisited ? 'btn-success' : 'btn-primary'}" 
                            onclick="app.userManager.togglePlace('${placeId}', event)">
                        ${isVisited ? '✅ Visité' : '📍 Marquer comme visité'}
                    </button>
                </div>
            </div>
        `;
    }
    
    // === MODULE NOTES ===
    openNoteModal(placeId, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        const userData = this.app.getCurrentUserData();
        if (!userData) {
            this.app.showNotification('Veuillez sélectionner un explorateur', 'warning');
            return;
        }
        
        const existingNote = userData.notes?.[placeId];
        const placeInfo = this.getPlaceInfo(placeId);
        
        // Créer le modal de note
        const modal = document.createElement('div');
        modal.className = 'modal note-modal show';
        modal.innerHTML = `
            <div class="modal-content note-modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">
                        📝 ${existingNote ? 'Modifier' : 'Ajouter'} une note
                    </h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="note-place-info">
                        <h4>${placeInfo.name}</h4>
                        <p>${placeInfo.description}</p>
                    </div>
                    <div class="note-form">
                        <textarea class="note-textarea" placeholder="Ajoutez vos impressions, conseils, souvenirs...">${existingNote ? existingNote.text : ''}</textarea>
                        <div class="note-footer">
                            <div class="note-meta">
                                ${existingNote ? `Créée le ${new Date(existingNote.date).toLocaleDateString('fr-FR')}` : ''}
                            </div>
                            <div class="note-actions">
                                <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.parentElement.remove()">Annuler</button>
                                ${existingNote ? `<button class="btn btn-danger" onclick="app.uiManager.deleteNote('${placeId}')">Supprimer</button>` : ''}
                                <button class="btn btn-primary" onclick="app.uiManager.saveNote('${placeId}')">Sauvegarder</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.currentNoteModal = modal;
        
        // Focus sur la textarea
        setTimeout(() => {
            const textarea = modal.querySelector('.note-textarea');
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }, 100);
        
        // Fermeture par clic sur l'overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    saveNote(placeId) {
        const textarea = this.currentNoteModal.querySelector('.note-textarea');
        const noteText = textarea.value.trim();
        
        if (this.app.userManager.saveNote(placeId, noteText)) {
            this.currentNoteModal.remove();
            this.updatePlaceNoteIndicator(placeId, !!noteText);
        }
    }
    
    deleteNote(placeId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
            this.app.userManager.saveNote(placeId, '');
            this.currentNoteModal.remove();
            this.updatePlaceNoteIndicator(placeId, false);
        }
    }
    
    // === MODULE COLLECTIONS ===
    renderCollections() {
        const userData = this.app.getCurrentUserData();
        const collectionsContainer = document.getElementById('collectionsGrid');
        
        if (!userData || !userData.collections || Object.keys(userData.collections).length === 0) {
            collectionsContainer.innerHTML = `
                <div class="empty-state collections">
                    <div class="empty-icon">📚</div>
                    <h3>Aucune collection</h3>
                    <p>Créez des collections thématiques pour organiser vos lieux préférés</p>
                    <button class="btn btn-primary" onclick="app.uiManager.openCreateCollectionModal()">
                        Créer ma première collection
                    </button>
                </div>
            `;
            return;
        }
        
        collectionsContainer.innerHTML = `
            <div class="collections-header">
                <div class="collections-actions">
                    <button class="btn btn-primary" onclick="app.uiManager.openCreateCollectionModal()">
                        📚 Nouvelle Collection
                    </button>
                </div>
            </div>
            
            <div class="collections-grid">
                ${Object.values(userData.collections).map(collection => this.renderCollection(collection)).join('')}
            </div>
        `;
    }
    
    renderCollection(collection) {
        return `
            <div class="collection-card" style="border-left: 4px solid ${collection.color}">
                <div class="collection-header">
                    <h4 class="collection-name">${collection.name}</h4>
                    <div class="collection-actions">
                        <button class="btn-icon" onclick="app.uiManager.editCollection('${collection.id}')" title="Modifier">✏️</button>
                        <button class="btn-icon" onclick="app.uiManager.deleteCollection('${collection.id}')" title="Supprimer">🗑️</button>
                    </div>
                </div>
                <p class="collection-description">${collection.description}</p>
                <div class="collection-stats">
                    <span>${collection.places.length} lieux</span>
                    <span>Créée le ${new Date(collection.created).toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="collection-places-preview">
                    ${collection.places.slice(0, 3).map(placeId => {
                        const placeInfo = this.getPlaceInfo(placeId);
                        return `<span class="place-preview">${placeInfo.name}</span>`;
                    }).join('')}
                    ${collection.places.length > 3 ? `<span class="more-places">+${collection.places.length - 3} autres</span>` : ''}
                </div>
                <div class="collection-actions-bottom">
                    <button class="btn btn-sm btn-secondary" onclick="app.uiManager.viewCollection('${collection.id}')">
                        Voir les lieux
                    </button>
                </div>
            </div>
        `;
    }
    
    // === MODULE ACHIEVEMENTS ===
    renderAchievements() {
        const userData = this.app.getCurrentUserData();
        const achievementsContainer = document.getElementById('achievementsGrid');
        
        const allAchievements = this.getAllAchievements();
        const unlockedAchievements = userData?.achievements || {};
        
        achievementsContainer.innerHTML = `
            <div class="achievements-header">
                <div class="achievements-stats">
                    <span class="stat-item">
                        <span class="stat-number">${Object.keys(unlockedAchievements).length}</span>
                        <span class="stat-label">Débloqués</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-number">${allAchievements.length}</span>
                        <span class="stat-label">Total</span>
                    </span>
                </div>
            </div>
            
            <div class="achievements-grid">
                ${allAchievements.map(achievement => this.renderAchievement(achievement, unlockedAchievements[achievement.id])).join('')}
            </div>
        `;
    }
    
    renderAchievement(achievement, unlockedData) {
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
                            ${this.getAchievementProgress(achievement)}
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
    // === MODULE PARAMÈTRES ===
    renderSettings() {
        const userData = this.app.getCurrentUserData();
        const settingsContainer = document.getElementById('settingsContainer');
        
        if (!userData) {
            settingsContainer.innerHTML = '<p>Sélectionnez un utilisateur pour accéder aux paramètres</p>';
            return;
        }
        
        const settings = userData.settings;
        
        settingsContainer.innerHTML = `
            <div class="settings-sections">
                <div class="settings-section">
                    <h4>🎨 Apparence</h4>
                    <div class="setting-item">
                        <label>Thème</label>
                        <select onchange="app.userManager.updateSetting('theme', this.value)">
                            <option value="default" ${settings.theme === 'default' ? 'selected' : ''}>Classique</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Sombre</option>
                            <option value="versailles" ${settings.theme === 'versailles' ? 'selected' : ''}>Versailles</option>
                            <option value="montmartre" ${settings.theme === 'montmartre' ? 'selected' : ''}>Montmartre</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" ${settings.compactMode ? 'checked' : ''} 
                                   onchange="app.userManager.updateSetting('compactMode', this.checked)">
                            Mode compact
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" ${settings.animations ? 'checked' : ''} 
                                   onchange="app.userManager.updateSetting('animations', this.checked)">
                            Animations
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>🔔 Notifications</h4>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" ${settings.notifications ? 'checked' : ''} 
                                   onchange="app.userManager.updateSetting('notifications', this.checked)">
                            Activer les notifications
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>🗺️ Carte</h4>
                    <div class="setting-item">
                        <label>Style de carte</label>
                        <select onchange="app.userManager.updateSetting('mapStyle', this.value)">
                            <option value="standard" ${settings.mapStyle === 'standard' ? 'selected' : ''}>Standard</option>
                            <option value="satellite" ${settings.mapStyle === 'satellite' ? 'selected' : ''}>Satellite</option>
                            <option value="terrain" ${settings.mapStyle === 'terrain' ? 'selected' : ''}>Terrain</option>
                        </select>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>📊 Données</h4>
                    <div class="setting-actions">
                        <button class="btn btn-secondary" onclick="app.uiManager.exportAllData()">
                            📤 Exporter toutes les données
                        </button>
                        <button class="btn btn-secondary" onclick="app.uiManager.importData()">
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
    
    // === MISE À JOUR DES INTERFACES ===
    updateFavoriteButton(placeId, isFavorite) {
        const button = document.querySelector(`[data-place-id="${placeId}"] .btn-action.favorite`);
        if (button) {
            button.textContent = isFavorite ? '⭐' : '☆';
            button.classList.toggle('active', isFavorite);
            button.title = isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris';
        }
        
        const card = document.querySelector(`[data-place-id="${placeId}"]`);
        if (card) {
            card.classList.toggle('favorite', isFavorite);
        }
    }
    
    updatePlaceNoteIndicator(placeId, hasNote) {
        const button = document.querySelector(`[data-place-id="${placeId}"] .btn-action.note`);
        if (button) {
            button.classList.toggle('active', hasNote);
            button.title = hasNote ? 'Modifier la note' : 'Ajouter une note';
        }
        
        const card = document.querySelector(`[data-place-id="${placeId}"]`);
        if (card) {
            card.classList.toggle('noted', hasNote);
        }
    }
    
    // === STATISTIQUES AVANCÉES ===
    updateStats() {
        const userData = this.app.getCurrentUserData();
        const totalPlaces = this.app.dataManager.getTotalPlaces();
        const visitedCount = userData?.visitedPlaces?.size || 0;
        const favoritesCount = userData?.favorites?.size || 0;
        const notesCount = userData?.notes ? Object.keys(userData.notes).length : 0;
        const collectionsCount = userData?.collections ? Object.keys(userData.collections).length : 0;
        const achievementsCount = userData?.achievements ? Object.keys(userData.achievements).length : 0;
        const completionRate = totalPlaces > 0 ? Math.round((visitedCount / totalPlaces) * 100) : 0;
        const streak = userData?.stats?.streak || 0;
        
        // Mise à jour des statistiques principales
        this.animateNumberChange('totalPlaces', totalPlaces);
        this.animateNumberChange('visitedPlaces', visitedCount);
        this.animateNumberChange('completionRate', completionRate, '%');
        this.animateNumberChange('currentStreak', streak);
        
        // Nouvelles statistiques avancées
        this.animateNumberChange('favoritesCount', favoritesCount);
        this.animateNumberChange('notesCount', notesCount);
        this.animateNumberChange('collectionsCount', collectionsCount);
        this.animateNumberChange('achievementsCount', achievementsCount);
        
        // Barres de progression
        setTimeout(() => {
            this.updateProgressBar('visitedProgress', completionRate);
            this.updateProgressBar('completionProgress', completionRate);
            this.updateProgressBar('streakProgress', Math.min(streak, 20) * 5);
        }, 100);
        
        // Vérifier les achievements
        this.app.userManager.checkAchievements();
        
        // Mettre à jour le titre
        document.title = `Paris Explorer - ${completionRate}% (${visitedCount}/${totalPlaces}) - ${favoritesCount} ⭐`;
    }
    
    updateProgressBar(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.width = `${percentage}%`;
        }
    }
    
    animateNumberChange(elementId, newValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const currentValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
        if (currentValue === newValue) return;
        
        const duration = 1000;
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
    
    // === UTILITAIRES ===
    getFavoritesInArrondissement(arrKey, arrData) {
        const userData = this.app.getCurrentUserData();
        if (!userData?.favorites) return 0;
        
        let count = 0;
        Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
            (catData.places || []).forEach(place => {
                const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                if (userData.favorites.has(placeId)) {
                    count++;
                }
            });
        });
        return count;
    }
    
    groupFavoritesByArrondissement() {
        const userData = this.app.getCurrentUserData();
        if (!userData?.favorites || !this.app.isDataLoaded) return {};
        
        const grouped = {};
        
        userData.favorites.forEach(placeId => {
            const placeInfo = this.getPlaceInfo(placeId);
            if (placeInfo) {
                if (!grouped[placeInfo.arrKey]) {
                    grouped[placeInfo.arrKey] = [];
                }
                grouped[placeInfo.arrKey].push(placeInfo);
            }
        });
        
        return grouped;
    }
    
    getPlaceInfo(placeId) {
        if (!this.app.isDataLoaded) return null;
        
        for (const [arrKey, arrData] of Object.entries(this.app.parisData)) {
            for (const [catKey, catData] of Object.entries(arrData.categories || {})) {
                for (const place of (catData.places || [])) {
                    const testId = this.app.createPlaceId(arrKey, catKey, place.name);
                    if (testId === placeId) {
                        return { placeId, arrKey, catKey, place };
                    }
                }
            }
        }
        return null;
    }
    
    getArrondissementTitle(arrKey) {
        return this.app.parisData[arrKey]?.title || arrKey;
    }
    
    getAllAchievements() {
        return [
            { id: 'first_visit', title: '🎯 Premier Pas', description: 'Visitez votre premier lieu', icon: '🎯' },
            { id: 'first_favorite', title: '⭐ Coup de Cœur', description: 'Ajoutez votre premier favori', icon: '⭐' },
            { id: 'explorer', title: '🗺️ Explorateur', description: 'Visitez 10 lieux différents', icon: '🗺️' },
            { id: 'adventurer', title: '🎒 Aventurier', description: 'Visitez 50 lieux', icon: '🎒' },
            { id: 'master', title: '👑 Maître Explorateur', description: 'Visitez 100 lieux', icon: '👑' },
            { id: 'collector', title: '📚 Collectionneur', description: '10 lieux favoris', icon: '📚' },
            { id: 'paris_master', title: '🗼 Maître de Paris', description: 'Visitez tous les arrondissements', icon: '🗼' }
        ];
    }
    
    getAchievementProgress(achievement) {
        const userData = this.app.getCurrentUserData();
        if (!userData) return '';
        
        const visited = userData.visitedPlaces.size;
        const favorites = userData.favorites.size;
        
        switch (achievement.id) {
            case 'explorer':
                return `${Math.min(visited, 10)}/10 lieux`;
            case 'adventurer':
                return `${Math.min(visited, 50)}/50 lieux`;
            case 'master':
                return `${Math.min(visited, 100)}/100 lieux`;
            case 'collector':
                return `${Math.min(favorites, 10)}/10 favoris`;
            default:
                return '';
        }
    }
    
    applyUserSettings() {
        const userData = this.app.getCurrentUserData();
        if (!userData?.settings) return;
        
        this.app.userManager.applySettings();
    }
    
    // === ÉVÉNEMENTS DE DRAG & DROP ===
    onPlaceDragStart(event, placeId) {
        this.draggedPlace = placeId;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', placeId);
    }
    
    // === HÉRITAGES DES MÉTHODES DE BASE ===
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
        
        return title.split(' ')[0] || '📍';
    }
    
    highlightSearchTerms(text) {
        if (!this.app.searchQuery || !text) return text;
        
        const regex = new RegExp(`(${this.app.searchQuery})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    matchesSearch(place) {
        if (!this.app.searchQuery) return true;
        
        const query = this.app.searchQuery.toLowerCase();
        return place.name.toLowerCase().includes(query) ||
               (place.description && place.description.toLowerCase().includes(query)) ||
               (place.address && place.address.toLowerCase().includes(query)) ||
               (place.tags && place.tags.some(tag => tag.toLowerCase().includes(query)));
    }
    
    arrondissementHasSearchResults(arrKey, arrData) {
        if (!this.app.searchQuery) return true;
        
        return Object.entries(arrData.categories || {}).some(([catKey, catData]) => {
            return (catData.places || []).some(place => this.matchesSearch(place));
        });
    }
    
    clearSearch() {
        document.getElementById('searchInput').value = '';
        this.app.searchQuery = '';
        this.renderContent();
    }
    
    // Placeholders pour les nouvelles méthodes (à implémenter selon besoins)
    switchTab(tabName) { /* Implémenté dans la version de base */ }
    loadUserSelector() { /* Implémenté dans la version de base */ }
    setupEventListeners() { /* Implémenté dans la version de base avec extensions */ }
    showModal() { /* Implémenté dans la version de base */ }
    hideModal() { /* Implémenté dans la version de base */ }
}
