// ===== PARIS EXPLORER - APPLICATION PRINCIPALE =====

// Configuration et état global
class ParisExplorer {
    constructor() {
        this.parisData = {};
        this.currentUser = null;
        this.users = this.loadUsers();
        this.searchQuery = '';
        this.hideCompleted = false;
        this.isDataLoaded = false;
        this.map = null;
        this.markers = [];
        this.arrondissementLayer = null;
        this.arrondissementShapes = null;
        this.currentTab = 'list';
        
        this.init();
    }
    
    async init() {
        try {
            // Tentative de chargement des données Paris
            await this.loadParisData();
            this.setupEventListeners();
            this.loadUserSelector();
            this.autoSelectUser();
        } catch (error) {
            // Afficher l'interface même sans données
            this.setupEventListeners();
            this.loadUserSelector();
            console.warn('Application démarrée sans données Paris:', error.message);
        }
    }
    
    // === GESTION DES DONNÉES ===
    async loadParisData() {
        try {
            this.showNotification('Chargement des trésors parisiens...', 'info');
            
            const response = await fetch('paris-database.json');
            
            if (!response.ok) {
                throw new Error(`Fichier paris-database.json introuvable`);
            }
            
            const textContent = await response.text();
            console.log('📄 Taille du fichier:', textContent.length, 'caractères');
            
            let data;
            try {
                data = JSON.parse(textContent);
                console.log('✅ JSON parsé avec succès');
            } catch (parseError) {
                console.error('❌ Erreur parsing JSON:', parseError);
                throw new Error(`Erreur parsing JSON: ${parseError.message}`);
            }
            
            // Vérification et adaptation de la structure
            let jsonData = data;
            if (Array.isArray(data) && data.length > 0) {
                console.log('📦 Structure tableau détectée, extraction du premier élément');
                jsonData = data[0];
            }
            
            if (jsonData && jsonData.arrondissements) {
                console.log('✅ Structure valide détectée');
                console.log('🔍 Nombre d\'arrondissements:', Object.keys(jsonData.arrondissements).length);
                this.parisData = jsonData.arrondissements;
                
                // Debug: vérifier les données chargées
                let totalCalculated = 0;
                Object.entries(this.parisData).forEach(([arrKey, arrData]) => {
                    let arrTotal = 0;
                    Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                        const placesCount = catData.places ? catData.places.length : 0;
                        arrTotal += placesCount;
                    });
                    totalCalculated += arrTotal;
                    console.log(`📍 ${arrKey}: ${arrTotal} lieux total`);
                });
                console.log(`📊 TOTAL CALCULÉ: ${totalCalculated} lieux`);
                
                this.isDataLoaded = true;
                this.renderContent();
                this.updateStats();
                this.showNotification('Trésors parisiens chargés avec succès!', 'success');
                
            } else {
                console.error('❌ Structure invalide');
                throw new Error('Structure de données invalide');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement:', error);
            // Garder le message d'erreur existant dans le HTML
            throw error;
        }
    }
    
    // === GESTION DES UTILISATEURS ===
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
            return parsedUsers;
        }
        return {};
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
    
    createUser(name) {
        if (!name || name.trim() === '') {
            this.showNotification('Le nom ne peut pas être vide', 'error');
            return false;
        }
        
        const trimmedName = name.trim();
        if (this.users[trimmedName]) {
            this.showNotification('Un explorateur avec ce nom existe déjà', 'error');
            return false;
        }
        
        this.users[trimmedName] = {
            name: trimmedName,
            visitedPlaces: new Set(),
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            stats: {
                totalVisited: 0,
                streak: 0,
                lastVisit: null
            }
        };
        
        this.saveUsers();
        this.loadUserSelector();
        this.setCurrentUser(trimmedName);
        this.showNotification(`Explorateur "${trimmedName}" créé avec succès!`, 'success');
        return true;
    }
    
    deleteUser(name) {
        if (confirm(`Êtes-vous sûr de vouloir supprimer l'explorateur "${name}" ?`)) {
            delete this.users[name];
            this.saveUsers();
            
            if (this.currentUser === name) {
                this.currentUser = null;
                document.getElementById('userSelector').value = '';
                this.renderContent();
                this.updateStats();
            }
            
            this.loadUserSelector();
            this.updateUsersList();
            this.showNotification(`Explorateur "${name}" supprimé`, 'info');
        }
    }
    
    setCurrentUser(name) {
        if (this.users[name]) {
            this.currentUser = name;
            this.users[name].lastActive = new Date().toISOString();
            this.saveUsers();
            
            document.getElementById('userSelector').value = name;
            this.renderContent();
            this.updateStats();
            this.showNotification(`Explorateur "${name}" sélectionné`, 'success');
        } else {
            this.showNotification('Explorateur introuvable', 'error');
        }
    }
    
    getCurrentUserData() {
        return this.currentUser ? this.users[this.currentUser] : null;
    }
    
    // === INTERFACE UTILISATEUR ===
    loadUserSelector() {
        const selector = document.getElementById('userSelector');
        selector.innerHTML = '<option value="">Choisir un explorateur...</option>';
        
        Object.keys(this.users).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selector.appendChild(option);
        });
    }
    
    updateUsersList() {
        const userList = document.getElementById('userList');
        userList.innerHTML = '';
        
        Object.values(this.users).forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            const visitedCount = user.visitedPlaces instanceof Set ? 
                user.visitedPlaces.size : 
                (Array.isArray(user.visitedPlaces) ? user.visitedPlaces.length : 0);
            
            userItem.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-progress">${visitedCount} lieux explorés</div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-success" onclick="app.setCurrentUser('${user.name}')">
                        Sélectionner
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteUser('${user.name}')">
                        Supprimer
                    </button>
                </div>
            `;
            
            userList.appendChild(userItem);
        });
    }
    
    autoSelectUser() {
        const userNames = Object.keys(this.users);
        if (userNames.length === 1) {
            this.setCurrentUser(userNames[0]);
        } else if (userNames.length === 0) {
            this.showModal();
        }
    }
    
    // === RENDU DE L'INTERFACE ===
    renderContent() {
        if (!this.isDataLoaded) return;
        
        const content = document.getElementById('mainContent');
        content.innerHTML = '';
        
        if (!this.parisData) {
            content.innerHTML = '<div class="text-center p-4">Aucune donnée disponible</div>';
            return;
        }
        
        Object.entries(this.parisData).forEach(([arrKey, arrData]) => {
            const arrDiv = this.createArrondissementCard(arrKey, arrData);
            content.appendChild(arrDiv);
        });
    }
    
    createArrondissementCard(arrKey, arrData) {
        const userData = this.getCurrentUserData();
        const visitedInArr = this.getVisitedPlacesInArrondissement(arrData, arrKey);
        const totalInArr = this.getTotalPlacesInArrondissement(arrData);
        const completionPercent = totalInArr > 0 ? Math.round((visitedInArr / totalInArr) * 100) : 0;
        
        const arrDiv = document.createElement('div');
        arrDiv.className = 'arrondissement-card collapsed'; // Fermé par défaut
        
        // Extraire le numéro de l'arrondissement
        const arrNumber = arrKey.replace(/[^\d]/g, '') || arrKey;
        
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
    
    renderCategories(arrKey, categories) {
        if (!categories) return '';
        
        return Object.entries(categories).map(([catKey, catData]) => {
            const placesHtml = this.renderPlaces(arrKey, catKey, catData.places || []);
            
            // Si hideCompleted et aucun lieu visible, afficher message de completion
            if (this.hideCompleted && placesHtml.trim() === '') {
                return `
                    <div class="category-section">
                        <div class="category-header">
                            <span class="category-icon">${catData.title.split(' ')[0]}</span>
                            ${catData.title}
                        </div>
                        <div class="completion-message">🎉 Catégorie entièrement explorée !</div>
                    </div>
                `;
            }
            
            return `
                <div class="category-section">
                    <div class="category-header">
                        <span class="category-icon">${catData.title.split(' ')[0]}</span>
                        ${catData.title}
                    </div>
                    <div class="places-grid">
                        ${placesHtml}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderPlaces(arrKey, catKey, places) {
        return places.map(place => this.renderPlace(arrKey, catKey, place)).join('');
    }
    
    renderPlace(arrKey, catKey, place) {
        const placeId = this.createPlaceId(arrKey, catKey, place.name);
        const userData = this.getCurrentUserData();
        const isVisited = userData && userData.visitedPlaces instanceof Set ? 
            userData.visitedPlaces.has(placeId) : false;
        
        // Filtres de recherche et statut
        if (this.searchQuery && !this.matchesSearch(place)) {
            return '';
        }
        
        if (this.hideCompleted && isVisited) {
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
        
        return `
            <div class="place-card ${isVisited ? 'visited' : ''}" data-place-id="${placeId}">
                <div class="place-header">
                    <input type="checkbox" class="place-checkbox" ${isVisited ? 'checked' : ''} 
                           onchange="app.togglePlace('${placeId}', event)">
                    <div class="place-content">
                        <div class="place-name">${place.name}</div>
                        <div class="place-description">${place.description}</div>
                        ${place.tags ? `
                            <div class="place-tags">
                                ${place.tags.map(tag => `<span class="place-tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${addressHtml}
                    </div>
                </div>
            </div>
        `;
    }
    
    matchesSearch(place) {
        const query = this.searchQuery.toLowerCase();
        return place.name.toLowerCase().includes(query) ||
               place.description.toLowerCase().includes(query) ||
               (place.address && place.address.toLowerCase().includes(query)) ||
               (place.tags && place.tags.some(tag => tag.toLowerCase().includes(query)));
    }
    
    // === GESTION DES LIEUX ===
    togglePlace(placeId, event) {
        // Empêcher la propagation pour éviter le rechargement
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        const userData = this.getCurrentUserData();
        if (!userData) {
            this.showNotification('Veuillez sélectionner un explorateur', 'warning');
            return;
        }
        
        // S'assurer que visitedPlaces est un Set
        if (!(userData.visitedPlaces instanceof Set)) {
            userData.visitedPlaces = new Set(userData.visitedPlaces || []);
        }
        
        const wasVisited = userData.visitedPlaces.has(placeId);
        
        if (wasVisited) {
            userData.visitedPlaces.delete(placeId);
            this.showNotification('Lieu retiré de vos explorations', 'info');
        } else {
            userData.visitedPlaces.add(placeId);
            userData.stats.lastVisit = new Date().toISOString();
            this.showNotification('Nouveau lieu exploré! Bravo!', 'success');
        }
        
        userData.stats.totalVisited = userData.visitedPlaces.size;
        this.saveUsers();
        
        // Mise à jour seulement de la carte spécifique et des stats
        this.updatePlaceCard(placeId, !wasVisited);
        this.updateStats();
        
        // Mettre à jour la carte si visible
        if (this.map && this.currentTab === 'map') {
            this.updateMapMarkers();
        }
    }
    
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
            if (this.hideCompleted && isVisited) {
                card.style.display = 'none';
            }
        }
    }
    
    createPlaceId(arrKey, catKey, placeName) {
        return `${arrKey}-${catKey}-${placeName}`
            .replace(/['"]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
    }
    
    // === CARTE INTERACTIVE ===
    initMap() {
        if (this.map) {
            console.log('🗺️ Carte déjà initialisée');
            return; // Déjà initialisée
        }
        
        console.log('🗺️ Initialisation de la carte...');
        const mapContainer = document.getElementById('mapContainer');
        
        try {
            // Centrer sur Paris avec un zoom approprié
            this.map = L.map(mapContainer, {
                center: [48.8566, 2.3522],
                zoom: 11,
                zoomControl: true,
                attributionControl: true
            });
            
            console.log('✅ Carte Leaflet créée');
            
            // Ajouter la couche de tuiles OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                minZoom: 10
            }).addTo(this.map);
            
            console.log('✅ Couche de tuiles ajoutée');
            
            // Attendre que la carte soit entièrement chargée avant d'ajouter les marqueurs
            this.map.whenReady(() => {
                console.log('🗺️ Carte prête, chargement des données...');
                setTimeout(() => {
                    if (this.isDataLoaded) {
                        this.loadArrondissementShapes();
                        this.updateMapMarkers();
                    } else {
                        this.addDemoMarkers();
                    }
                }, 200);
            });
            
            // Gestion du zoom pour changer entre arrondissements et lieux individuels
            this.map.on('zoomend', () => {
                const zoom = this.map.getZoom();
                console.log('🔍 Zoom changé:', zoom);
                this.updateMapMarkers();
            });
            
            // Gestion des clics sur la carte
            this.map.on('click', (e) => {
                console.log('📍 Clic sur la carte:', e.latlng);
            });
            
            // Gestion du plein écran
            this.setupMapControls();
            
            console.log('✅ Carte entièrement initialisée');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de la carte:', error);
            this.showNotification('Erreur lors du chargement de la carte', 'error');
        }
    }
    
    // Charger les formes réelles des arrondissements parisiens
    async loadArrondissementShapes() {
        try {
            console.log('🗺️ Chargement des formes des arrondissements...');
            
            // URL de l'API OpenData Paris pour les limites des arrondissements
            const response = await fetch('https://opendata.paris.fr/api/records/1.0/search/?dataset=arrondissements&q=&facet=c_ar&rows=20&format=geojson');
            
            if (response.ok) {
                const geojsonData = await response.json();
                console.log('✅ Données GeoJSON des arrondissements chargées:', geojsonData.features.length, 'arrondissements');
                
                this.arrondissementShapes = geojsonData;
                
            } else {
                console.warn('⚠️ Impossible de charger les formes des arrondissements, utilisation des cercles');
            }
        } catch (error) {
            console.warn('⚠️ Erreur lors du chargement des formes:', error);
        }
    }
    
    // Géocoder une adresse en coordonnées GPS
    async geocodeAddress(address) {
        try {
            // Utiliser Nominatim (OpenStreetMap) pour le géocodage gratuit
            const encodedAddress = encodeURIComponent(address);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`);
            
            if (response.ok) {
                const results = await response.json();
                if (results.length > 0) {
                    const lat = parseFloat(results[0].lat);
                    const lon = parseFloat(results[0].lon);
                    console.log(`📍 Géocodage réussi: ${address} → [${lat}, ${lon}]`);
                    return [lat, lon];
                }
            }
        } catch (error) {
            console.warn(`⚠️ Erreur géocodage pour "${address}":`, error);
        }
        
        // Fallback : essayer d'extraire l'arrondissement et utiliser ses coordonnées approximatives
        return this.fallbackGeocoding(address);
    }
    
    // Géocodage de fallback basé sur l'arrondissement
    fallbackGeocoding(address) {
        const arrondissementCoords = {
            '75001': [48.8607, 2.3358], '75002': [48.8700, 2.3408], '75003': [48.8630, 2.3626],
            '75004': [48.8534, 2.3488], '75005': [48.8462, 2.3372], '75006': [48.8496, 2.3341],
            '75007': [48.8534, 2.2944], '75008': [48.8718, 2.3075], '75009': [48.8768, 2.3364],
            '75010': [48.8709, 2.3674], '75011': [48.8594, 2.3765], '75012': [48.8448, 2.3776],
            '75013': [48.8282, 2.3555], '75014': [48.8323, 2.3255], '75015': [48.8428, 2.2944],
            '75016': [48.8635, 2.2773], '75017': [48.8799, 2.2951], '75018': [48.8867, 2.3431],
            '75019': [48.8799, 2.3831], '75020': [48.8631, 2.3969]
        };
        
        // Extraire le code postal
        const match = address.match(/750(\d{2})/);
        if (match) {
            const postalCode = '750' + match[1];
            const coords = arrondissementCoords[postalCode];
            if (coords) {
                console.log(`📍 Géocodage fallback: ${address} → arrondissement ${postalCode} → ${coords}`);
                return coords;
            }
        }
        
        // Dernier fallback : centre de Paris
        console.warn(`⚠️ Impossible de géocoder "${address}", utilisation du centre de Paris`);
        return [48.8566, 2.3522];
    }

    addDemoMarkers() {
        // Nettoyer les marqueurs existants
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        
        // Coordonnées réelles et précises des arrondissements parisiens
        const demoLocations = [
            { name: "1er - Louvre", coords: [48.8607, 2.3358], places: 15, visited: 3, emoji: "🏛️" },
            { name: "2ème - Grands Boulevards", coords: [48.8700, 2.3408], places: 10, visited: 1, emoji: "🏪" },
            { name: "3ème - Le Marais", coords: [48.8630, 2.3626], places: 13, visited: 7, emoji: "🏘️" },
            { name: "4ème - Île de la Cité", coords: [48.8534, 2.3488], places: 12, visited: 5, emoji: "⛪" },
            { name: "5ème - Quartier Latin", coords: [48.8462, 2.3372], places: 16, visited: 9, emoji: "📚" },
            { name: "6ème - Saint-Germain", coords: [48.8496, 2.3341], places: 14, visited: 6, emoji: "☕" },
            { name: "7ème - Tour Eiffel", coords: [48.8534, 2.2944], places: 18, visited: 8, emoji: "🗼" },
            { name: "8ème - Champs-Élysées", coords: [48.8718, 2.3075], places: 20, visited: 2, emoji: "🛍️" },
            { name: "9ème - Opéra", coords: [48.8768, 2.3364], places: 11, visited: 4, emoji: "🎭" },
            { name: "10ème - Canal Saint-Martin", coords: [48.8709, 2.3674], places: 9, visited: 3, emoji: "🚤" },
            { name: "11ème - République", coords: [48.8594, 2.3765], places: 8, visited: 2, emoji: "🍻" },
            { name: "12ème - Bastille", coords: [48.8448, 2.3776], places: 7, visited: 1, emoji: "🎪" },
            { name: "13ème - Chinatown", coords: [48.8282, 2.3555], places: 6, visited: 0, emoji: "🥢" },
            { name: "14ème - Montparnasse", coords: [48.8323, 2.3255], places: 9, visited: 3, emoji: "🗿" },
            { name: "15ème - Tour Montparnasse", coords: [48.8428, 2.2944], places: 12, visited: 5, emoji: "🏢" },
            { name: "16ème - Trocadéro", coords: [48.8635, 2.2773], places: 17, visited: 12, emoji: "🏰" },
            { name: "17ème - Arc de Triomphe", coords: [48.8799, 2.2951], places: 13, visited: 7, emoji: "🏆" },
            { name: "18ème - Montmartre", coords: [48.8867, 2.3431], places: 14, visited: 10, emoji: "🎨" },
            { name: "19ème - Buttes-Chaumont", coords: [48.8799, 2.3831], places: 10, visited: 4, emoji: "🌳" },
            { name: "20ème - Père Lachaise", coords: [48.8631, 2.3969], places: 8, visited: 2, emoji: "⚰️" },
        ];
        
        console.log(`🗺️ Ajout de ${demoLocations.length} marqueurs sur la carte`);
        
        demoLocations.forEach((location, index) => {
            const completionPercent = Math.round((location.visited / location.places) * 100);
            
            // Couleur selon le pourcentage de completion
            let markerColor = '#D4AF37'; // Or par défaut
            let strokeColor = '#1e3a8a'; // Bleu parisien
            
            if (completionPercent === 100) {
                markerColor = '#059669'; // Vert si 100%
                strokeColor = '#047857';
            } else if (completionPercent >= 70) {
                markerColor = '#059669'; // Vert si ≥ 70%
                strokeColor = '#047857';
            } else if (completionPercent >= 40) {
                markerColor = '#d97706'; // Orange si ≥ 40%
                strokeColor = '#b45309';
            } else if (completionPercent > 0) {
                markerColor = '#dc2626'; // Rouge si quelques visites
                strokeColor = '#b91c1c';
            }
            
            // Créer le marqueur circulaire
            const marker = L.circleMarker(location.coords, {
                color: strokeColor,
                fillColor: markerColor,
                fillOpacity: 0.9,
                radius: Math.max(10, Math.min(20, completionPercent / 5 + 8)),
                weight: 3,
                className: 'demo-marker'
            }).addTo(this.map);
            
            // Popup avec informations détaillées
            marker.bindPopup(`
                <div style="font-family: 'Playfair Display', serif; text-align: center; min-width: 200px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">${location.emoji}</div>
                    <h3 style="color: #1e3a8a; margin-bottom: 8px; font-size: 16px;">${location.name}</h3>
                    <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 12px; border-radius: 8px; margin: 8px 0;">
                        <p style="margin: 4px 0; font-weight: bold;"><strong>${location.visited}/${location.places}</strong> lieux explorés</p>
                        <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin: 8px 0;">
                            <div style="background: ${markerColor}; height: 100%; width: ${completionPercent}%; border-radius: 3px; transition: width 0.3s;"></div>
                        </div>
                        <p style="margin: 4px 0; color: ${markerColor}; font-weight: bold;">${completionPercent}% complété</p>
                    </div>
                    <p style="font-size: 11px; color: #6b7280; margin-top: 8px; font-style: italic;">
                        💡 Mode démo - Créez un profil pour commencer l'exploration !
                    </p>
                </div>
            `);
            
            // Effet hover
            marker.on('mouseover', function() {
                this.setStyle({
                    radius: this.options.radius + 3,
                    weight: 4
                });
            });
            
            marker.on('mouseout', function() {
                this.setStyle({
                    radius: this.options.radius - 3,
                    weight: 3
                });
            });
            
            this.markers.push(marker);
        });
        
        console.log(`✅ ${this.markers.length} marqueurs ajoutés avec succès`);
        
        // Centrer la carte sur tous les marqueurs
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1), {
                maxZoom: 12
            });
        }
        
        // Afficher une notification de succès
        setTimeout(() => {
            this.showNotification(`🗺️ Carte chargée : ${this.markers.length} arrondissements visibles`, 'success');
        }, 500);
    }

    updateMapMarkers() {
        if (!this.map) {
            console.log('🗺️ Pas de carte à mettre à jour');
            return;
        }
        
        const currentZoom = this.map.getZoom();
        console.log('🔄 Mise à jour des marqueurs pour zoom:', currentZoom);
        
        // Nettoyer tous les marqueurs et couches existants
        this.clearMapMarkers();
        
        if (this.isDataLoaded && this.parisData) {
            // Utiliser les vraies données
            if (currentZoom <= 12) {
                // Vue d'ensemble : afficher les polygones des arrondissements
                this.showArrondissementPolygons();
            } else {
                // Vue détaillée : afficher les lieux individuels
                this.showIndividualPlaces();
            }
        } else {
            // Mode démo : toujours afficher les marqueurs démo
            this.addDemoMarkers();
        }
    }
    
    clearMapMarkers() {
        // Supprimer tous les marqueurs
        this.markers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        this.markers = [];
        
        // Supprimer les couches de polygones
        if (this.arrondissementLayer) {
            this.map.removeLayer(this.arrondissementLayer);
            this.arrondissementLayer = null;
        }
    }
    
    // Afficher les polygones des arrondissements (zoom dézoomé)
    showArrondissementPolygons() {
        console.log('🏛️ Affichage des polygones des arrondissements');
        
        if (this.arrondissementShapes) {
            // Utiliser les vraies formes GeoJSON
            this.arrondissementLayer = L.geoJSON(this.arrondissementShapes, {
                style: (feature) => {
                    const arrCode = feature.properties.c_ar;
                    const userData = this.getCurrentUserData();
                    
                    // Calculer la progression pour cet arrondissement
                    const arrKey = `${arrCode}${arrCode === '1' ? 'er' : 'ème'}`;
                    const arrData = this.parisData[arrKey];
                    const visitedCount = arrData ? this.getVisitedPlacesInArrondissement(arrData, arrKey) : 0;
                    const totalCount = arrData ? this.getTotalPlacesInArrondissement(arrData) : 0;
                    const completionPercent = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;
                    
                    // Couleur selon progression
                    let fillColor = '#D4AF37';
                    let fillOpacity = 0.3;
                    
                    if (completionPercent >= 70) {
                        fillColor = '#059669';
                        fillOpacity = 0.5;
                    } else if (completionPercent >= 40) {
                        fillColor = '#d97706';
                        fillOpacity = 0.4;
                    } else if (completionPercent > 0) {
                        fillColor = '#dc2626';
                        fillOpacity = 0.3;
                    }
                    
                    return {
                        fillColor: fillColor,
                        weight: 2,
                        opacity: 0.8,
                        color: '#1e3a8a',
                        fillOpacity: fillOpacity
                    };
                },
                onEachFeature: (feature, layer) => {
                    const arrCode = feature.properties.c_ar;
                    const arrName = feature.properties.l_ar;
                    
                    // Calculer les statistiques
                    const arrKey = `${arrCode}${arrCode === '1' ? 'er' : 'ème'}`;
                    const arrData = this.parisData[arrKey];
                    const visitedCount = arrData ? this.getVisitedPlacesInArrondissement(arrData, arrKey) : 0;
                    const totalCount = arrData ? this.getTotalPlacesInArrondissement(arrData) : 0;
                    const completionPercent = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;
                    
                    // Popup
                    layer.bindPopup(`
                        <div style="font-family: 'Playfair Display', serif; text-align: center; min-width: 200px;">
                            <h3 style="color: #1e3a8a; margin-bottom: 8px;">${arrName}</h3>
                            <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 12px; border-radius: 8px; margin: 8px 0;">
                                <p style="margin: 4px 0; font-weight: bold;">${visitedCount}/${totalCount} lieux explorés</p>
                                <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin: 8px 0;">
                                    <div style="background: linear-gradient(135deg, #D4AF37, #F7DC6F); height: 100%; width: ${completionPercent}%; border-radius: 3px;"></div>
                                </div>
                                <p style="margin: 4px 0; color: #D4AF37; font-weight: bold;">${completionPercent}% complété</p>
                            </div>
                            <p style="font-size: 11px; color: #6b7280; margin-top: 8px; font-style: italic;">
                                🔍 Zoomez pour voir les lieux individuels
                            </p>
                        </div>
                    `);
                    
                    // Effet hover
                    layer.on('mouseover', function(e) {
                        this.setStyle({
                            weight: 4,
                            fillOpacity: 0.7
                        });
                    });
                    
                    layer.on('mouseout', function(e) {
                        this.setStyle({
                            weight: 2,
                            fillOpacity: feature.properties.fillOpacity || 0.3
                        });
                    });
                }
            }).addTo(this.map);
            
            console.log('✅ Polygones des arrondissements affichés');
        } else {
            // Fallback : utiliser les marqueurs circulaires
            this.showArrondissementCircles();
        }
    }
    
    // Fallback : marqueurs circulaires pour les arrondissements
    showArrondissementCircles() {
        console.log('🔄 Affichage des cercles des arrondissements (fallback)');
        
        Object.entries(this.parisData).forEach(([arrKey, arrData]) => {
            const coords = this.getArrondissementCenter(arrKey);
            if (!coords) return;
            
            const userData = this.getCurrentUserData();
            const visitedCount = this.getVisitedPlacesInArrondissement(arrData, arrKey);
            const totalCount = this.getTotalPlacesInArrondissement(arrData);
            const completionPercent = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;
            
            // Couleur selon progression
            let fillColor = '#D4AF37';
            if (completionPercent >= 70) fillColor = '#059669';
            else if (completionPercent >= 40) fillColor = '#d97706';
            else if (completionPercent > 0) fillColor = '#dc2626';
            
            const marker = L.circleMarker(coords, {
                color: '#1e3a8a',
                fillColor: fillColor,
                fillOpacity: 0.7,
                radius: Math.max(15, completionPercent / 5 + 10),
                weight: 3
            }).addTo(this.map);
            
            marker.bindPopup(`
                <div style="font-family: 'Playfair Display', serif; text-align: center;">
                    <h3 style="color: #1e3a8a; margin-bottom: 8px;">${arrData.title}</h3>
                    <p style="margin: 4px 0;"><strong>${visitedCount}/${totalCount}</strong> lieux explorés</p>
                    <p style="margin: 4px 0; color: #D4AF37;"><strong>${Math.round(completionPercent)}%</strong> complété</p>
                </div>
            `);
            
            this.markers.push(marker);
        });
    }
    
    // Afficher les lieux individuels (zoom rapproché)
    async showIndividualPlaces() {
        console.log('📍 Affichage des lieux individuels');
        
        // Afficher un indicateur de chargement
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'map-loading';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p style="color: #1e3a8a; font-weight: 600;">Chargement des lieux...</p>
            <p style="font-size: 12px; color: #6b7280;">Géocodage des adresses en cours</p>
        `;
        document.getElementById('mapContainer').appendChild(loadingDiv);
        
        const userData = this.getCurrentUserData();
        let placesProcessed = 0;
        let totalPlaces = 0;
        let geocodingCache = {}; // Cache pour éviter les doublons
        
        // Compter le total pour la progression
        Object.entries(this.parisData).forEach(([arrKey, arrData]) => {
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                totalPlaces += (catData.places || []).length;
            });
        });
        
        console.log(`📊 ${totalPlaces} lieux à traiter`);
        
        try {
            // Traitement par batch pour éviter de surcharger l'API
            for (const [arrKey, arrData] of Object.entries(this.parisData)) {
                for (const [catKey, catData] of Object.entries(arrData.categories || {})) {
                    for (const place of (catData.places || [])) {
                        if (place.address) {
                            try {
                                // Utiliser le cache si l'adresse a déjà été géocodée
                                let coords;
                                if (geocodingCache[place.address]) {
                                    coords = geocodingCache[place.address];
                                } else {
                                    coords = await this.geocodeAddress(place.address);
                                    geocodingCache[place.address] = coords;
                                    
                                    // Pause pour éviter la limitation de taux (seulement pour les nouveaux géocodages)
                                    await new Promise(resolve => setTimeout(resolve, 50));
                                }
                                
                                const placeId = this.createPlaceId(arrKey, catKey, place.name);
                                const isVisited = userData && userData.visitedPlaces instanceof Set ? 
                                    userData.visitedPlaces.has(placeId) : false;
                                
                                // Créer le marqueur du lieu
                                const marker = this.createPlaceMarker(coords, place, catKey, isVisited, arrData.title);
                                this.markers.push(marker);
                                
                                placesProcessed++;
                                
                                // Mettre à jour l'indicateur de progression
                                if (placesProcessed % 5 === 0) {
                                    const progressPercent = Math.round((placesProcessed / totalPlaces) * 100);
                                    loadingDiv.querySelector('p').textContent = `Chargement des lieux... ${progressPercent}%`;
                                    console.log(`📍 Traité ${placesProcessed}/${totalPlaces} lieux (${progressPercent}%)`);
                                }
                                
                            } catch (error) {
                                console.warn(`⚠️ Erreur pour ${place.name}:`, error);
                                placesProcessed++; // Compter quand même pour la progression
                            }
                        } else {
                            placesProcessed++; // Compter les lieux sans adresse
                        }
                    }
                }
            }
            
            console.log(`✅ ${this.markers.length} lieux individuels affichés`);
            this.showNotification(`🗺️ ${this.markers.length} lieux chargés sur la carte`, 'success');
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des lieux:', error);
            this.showNotification('Erreur lors du chargement des lieux', 'error');
        } finally {
            // Supprimer l'indicateur de chargement
            if (loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
            }
        }
    }
    
    // Créer un marqueur pour un lieu individuel
    createPlaceMarker(coords, place, categoryKey, isVisited, arrondissementName) {
        // Déterminer l'icône selon le type de lieu
        const placeType = this.getPlaceType(categoryKey);
        let markerIcon = '📍';
        let markerColor = isVisited ? '#059669' : '#D4AF37';
        
        // Icônes selon le type
        const typeIcons = {
            'monument': '🏛️',
            'restaurant': '🍽️',
            'cafe': '☕',
            'bar': '🍻',
            'shopping': '🛍️',
            'museum': '🎨',
            'park': '🌳',
            'church': '⛪',
            'hotel': '🏨',
            'theater': '🎭'
        };
        
        markerIcon = typeIcons[placeType] || '📍';
        
        // Créer le marqueur avec icône emoji
        const marker = L.marker(coords, {
            icon: L.divIcon({
                html: `<div style="background: ${markerColor}; border: 2px solid #1e3a8a; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${markerIcon}</div>`,
                className: 'custom-place-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.map);
        
        // Popup détaillé
        const tagsHtml = place.tags ? 
            place.tags.map(tag => `<span style="background: #D4AF37; color: #1e3a8a; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin: 2px;">${tag}</span>`).join(' ') : '';
        
        marker.bindPopup(`
            <div style="font-family: 'Playfair Display', serif; min-width: 220px;">
                <div style="text-align: center; font-size: 20px; margin-bottom: 8px;">${markerIcon}</div>
                <h4 style="color: #1e3a8a; margin-bottom: 8px; font-size: 15px; text-align: center;">${place.name}</h4>
                <p style="margin: 8px 0; font-size: 13px; line-height: 1.4;">${place.description}</p>
                <p style="margin: 4px 0; font-size: 11px; color: #6b7280;">📍 ${place.address}</p>
                <div style="text-align: center; margin: 12px 0;">
                    ${isVisited ? 
                        '<span style="color: #059669; font-weight: bold; background: #f0fdf4; padding: 4px 8px; border-radius: 8px;">✓ Exploré</span>' : 
                        '<span style="color: #d97706; font-weight: bold; background: #fef3c7; padding: 4px 8px; border-radius: 8px;">📍 À explorer</span>'
                    }
                </div>
                ${tagsHtml ? `<div style="margin-top: 8px; text-align: center;">${tagsHtml}</div>` : ''}
                <p style="font-size: 10px; color: #9ca3af; margin-top: 12px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                    ${arrondissementName}
                </p>
                <div style="text-align: center; margin-top: 8px;">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}" 
                       target="_blank" 
                       style="background: #1e3a8a; color: white; padding: 4px 12px; border-radius: 12px; text-decoration: none; font-size: 11px;">
                        🗺️ Ouvrir dans Maps
                    </a>
                </div>
            </div>
        `);
        
        // Effet de clic pour marquer comme visité/non visité
        marker.on('popupopen', () => {
            const placeId = this.createPlaceId('', categoryKey, place.name); // Simplified for demo
            // Ici on pourrait ajouter un bouton pour toggle le statut
        });
        
        return marker;
    }
    
    // Déterminer le type de lieu pour l'icône
    getPlaceType(categoryKey) {
        const catKey = categoryKey.toLowerCase();
        
        if (catKey.includes('monument') || catKey.includes('patrimoine')) return 'monument';
        if (catKey.includes('restaurant') || catKey.includes('gastronomie')) return 'restaurant';
        if (catKey.includes('café') || catKey.includes('cafe')) return 'cafe';
        if (catKey.includes('bar') || catKey.includes('cocktail')) return 'bar';
        if (catKey.includes('shopping') || catKey.includes('boutique')) return 'shopping';
        if (catKey.includes('musée') || catKey.includes('museum')) return 'museum';
        if (catKey.includes('parc') || catKey.includes('jardin')) return 'park';
        if (catKey.includes('église') || catKey.includes('cathédrale')) return 'church';
        if (catKey.includes('hôtel') || catKey.includes('hotel')) return 'hotel';
        if (catKey.includes('théâtre') || catKey.includes('opéra')) return 'theater';
        
        return 'default';
    }
    
    // Obtenir les coordonnées du centre d'un arrondissement
    getArrondissementCenter(arrKey) {
        const centers = {
            '1er': [48.8607, 2.3358], '2ème': [48.8700, 2.3408], '3ème': [48.8630, 2.3626],
            '4ème': [48.8534, 2.3488], '5ème': [48.8462, 2.3372], '6ème': [48.8496, 2.3341],
            '7ème': [48.8534, 2.2944], '8ème': [48.8718, 2.3075], '9ème': [48.8768, 2.3364],
            '10ème': [48.8709, 2.3674], '11ème': [48.8594, 2.3765], '12ème': [48.8448, 2.3776],
            '13ème': [48.8282, 2.3555], '14ème': [48.8323, 2.3255], '15ème': [48.8428, 2.2944],
            '16ème': [48.8635, 2.2773], '17ème': [48.8799, 2.2951], '18ème': [48.8867, 2.3431],
            '19ème': [48.8799, 2.3831], '20ème': [48.8631, 2.3969]
        };
        
        return centers[arrKey];
    }

    setupMapControls() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const centerMapBtn = document.getElementById('centerMapBtn');
        const mapContainer = document.getElementById('mapContainer');
        
        // Bouton plein écran
        fullscreenBtn.addEventListener('click', () => {
            if (mapContainer.classList.contains('map-fullscreen')) {
                this.exitFullscreen();
            } else {
                this.enterFullscreen();
            }
        });
        
        // Bouton centrer
        centerMapBtn.addEventListener('click', () => {
            if (this.markers.length > 0) {
                // Centrer sur tous les marqueurs
                const group = new L.featureGroup(this.markers);
                this.map.fitBounds(group.getBounds().pad(0.1), {
                    maxZoom: 12
                });
                this.showNotification('Vue centrée sur tous les arrondissements', 'info');
            } else {
                // Centrer sur Paris par défaut
                this.map.setView([48.8566, 2.3522], 11);
                this.showNotification('Vue centrée sur Paris', 'info');
            }
        });
        
        // Écouteur pour la touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mapContainer.classList.contains('map-fullscreen')) {
                this.exitFullscreen();
            }
        });
    }
    
    enterFullscreen() {
        const mapContainer = document.getElementById('mapContainer');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        mapContainer.classList.add('map-fullscreen');
        fullscreenBtn.textContent = '🔲';
        fullscreenBtn.title = 'Quitter le plein écran';
        
        // Invalider la taille de la carte après le changement
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
        
        this.showNotification('Mode plein écran activé (Échap pour quitter)', 'info');
    }
    
    exitFullscreen() {
        const mapContainer = document.getElementById('mapContainer');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        mapContainer.classList.remove('map-fullscreen');
        fullscreenBtn.textContent = '🔳';
        fullscreenBtn.title = 'Mode plein écran';
        
        // Invalider la taille de la carte après le changement
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }
    
    // === STATISTIQUES ===
    updateStats() {
        const userData = this.getCurrentUserData();
        const totalPlaces = this.getTotalPlaces();
        const visitedCount = userData && userData.visitedPlaces instanceof Set ? 
            userData.visitedPlaces.size : 0;
        const completionRate = totalPlaces > 0 ? Math.round((visitedCount / totalPlaces) * 100) : 0;
        
        document.getElementById('totalPlaces').textContent = totalPlaces;
        document.getElementById('visitedPlaces').textContent = visitedCount;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
        document.getElementById('currentStreak').textContent = userData?.stats?.streak || 0;
        
        // Mise à jour des barres de progression
        document.getElementById('visitedProgress').style.width = `${completionRate}%`;
        document.getElementById('completionProgress').style.width = `${completionRate}%`;
        document.getElementById('streakProgress').style.width = `${Math.min(userData?.stats?.streak || 0, 20) * 5}%`;
    }
    
    getTotalPlaces() {
        if (!this.isDataLoaded || !this.parisData) return 147; // Valeur par défaut pour la démo
        
        let total = 0;
        Object.entries(this.parisData).forEach(([arrKey, arrData]) => {
            if (arrData && arrData.categories) {
                Object.entries(arrData.categories).forEach(([catKey, catData]) => {
                    if (catData && catData.places && Array.isArray(catData.places)) {
                        total += catData.places.length;
                    }
                });
            }
        });
        return total;
    }
    
    getTotalPlacesInArrondissement(arrData) {
        let total = 0;
        if (arrData && arrData.categories) {
            Object.entries(arrData.categories).forEach(([catKey, catData]) => {
                if (catData && catData.places && Array.isArray(catData.places)) {
                    total += catData.places.length;
                }
            });
        }
        return total;
    }
    
    getVisitedPlacesInArrondissement(arrData, arrKey) {
        const userData = this.getCurrentUserData();
        if (!userData || !arrData) return 0;
        
        let visited = 0;
        Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
            if (catData && catData.places && Array.isArray(catData.places)) {
                catData.places.forEach(place => {
                    const placeId = this.createPlaceId(arrKey, catKey, place.name);
                    if (userData.visitedPlaces instanceof Set && userData.visitedPlaces.has(placeId)) {
                        visited++;
                    }
                });
            }
        });
        return visited;
    }
    
    // === GESTION DES ONGLETS ===
    switchTab(tabName) {
        this.currentTab = tabName;
        
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
        
        // Initialiser la carte si nécessaire
        if (tabName === 'map') {
            setTimeout(() => {
                this.initMap();
            }, 100);
        }
    }
    
    // === ÉVÉNEMENTS ===
    setupEventListeners() {
        // Gestion des onglets
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
        
        // Gestion des utilisateurs
        document.getElementById('userSelector').addEventListener('change', (e) => {
            if (e.target.value) {
                this.setCurrentUser(e.target.value);
            }
        });
        
        document.getElementById('manageUsersBtn').addEventListener('click', () => {
            this.showModal();
        });
        
        document.getElementById('createUserBtn').addEventListener('click', () => {
            const nameInput = document.getElementById('newUserName');
            if (this.createUser(nameInput.value)) {
                nameInput.value = '';
                this.updateUsersList();
            }
        });
        
        document.getElementById('newUserName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('createUserBtn').click();
            }
        });
        
        // Modal
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('userModal').addEventListener('click', (e) => {
            if (e.target.id === 'userModal') {
                this.hideModal();
            }
        });
        
        // Recherche
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderContent();
        });
        
        // Toggle masquer complétés
        document.getElementById('hideCompletedBtn').addEventListener('click', () => {
            this.hideCompleted = !this.hideCompleted;
            const btn = document.getElementById('hideCompletedBtn');
            
            if (this.hideCompleted) {
                btn.textContent = '👁️ Afficher Tous';
                btn.classList.add('active');
            } else {
                btn.textContent = '👁️ Masquer les Explorés';
                btn.classList.remove('active');
            }
            
            this.renderContent();
        });
        
        // Actions
        document.getElementById('expandAllBtn').addEventListener('click', () => {
            document.querySelectorAll('.arrondissement-card').forEach(card => {
                card.classList.remove('collapsed');
            });
            this.showNotification('Tous les arrondissements ouverts', 'info');
        });
        
        document.getElementById('collapseAllBtn').addEventListener('click', () => {
            document.querySelectorAll('.arrondissement-card').forEach(card => {
                card.classList.add('collapsed');
            });
            this.showNotification('Tous les arrondissements fermés', 'info');
        });
        
        document.getElementById('resetProgressBtn').addEventListener('click', () => {
            this.resetUserProgress();
        });
    }
    
    // === UTILITAIRES ===
    showModal() {
        const modal = document.getElementById('userModal');
        modal.classList.add('show');
        this.updateUsersList();
    }
    
    hideModal() {
        const modal = document.getElementById('userModal');
        modal.classList.remove('show');
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    resetUserProgress() {
        const userData = this.getCurrentUserData();
        if (!userData) {
            this.showNotification('Veuillez sélectionner un explorateur', 'warning');
            return;
        }
        
        if (confirm(`Êtes-vous sûr de vouloir effacer toutes les explorations de "${userData.name}" ?`)) {
            userData.visitedPlaces = new Set();
            userData.stats = {
                totalVisited: 0,
                streak: 0,
                lastVisit: null
            };
            
            this.saveUsers();
            this.renderContent();
            this.updateStats();
            
            // Mettre à jour la carte si visible
            if (this.map && this.currentTab === 'map') {
                this.updateMapMarkers();
            }
            
            this.showNotification('Exploration recommencée à zéro!', 'info');
        }
    }
}

// Initialisation de l'application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ParisExplorer();
});
