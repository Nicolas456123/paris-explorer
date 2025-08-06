// ===== EXPORT IMPORT - VERSION CORRIGÉE COMPLÈTE =====

class ExportImport {
    constructor(app) {
        this.app = app;
        this.supportedFormats = ['json', 'csv', 'html', 'txt'];
        this.isExporting = false;
        this.isImporting = false;
    }
    
    // === EXPORT UTILISATEUR COMPLET ===
    exportUserData(userName = null) {
        const targetUser = userName || this.app.userManager.getCurrentUserName();
        
        if (!targetUser) {
            this.app.showNotification('Aucun utilisateur à exporter', 'error');
            return;
        }
        
        if (this.isExporting) {
            this.app.showNotification('Export déjà en cours...', 'warning');
            return;
        }
        
        this.isExporting = true;
        console.log(`📤 Export des données de l'utilisateur: ${targetUser}`);
        
        try {
            const userData = this.app.userManager.users[targetUser];
            if (!userData) {
                throw new Error('Utilisateur introuvable');
            }
            
            const exportData = {
                metadata: {
                    appName: 'Paris Explorer',
                    appVersion: this.app.version,
                    exportDate: new Date().toISOString(),
                    exportedBy: targetUser,
                    format: 'json',
                    dataVersion: '2.0.0'
                },
                user: {
                    name: targetUser,
                    visitedPlaces: Array.from(userData.visitedPlaces || []),
                    favorites: userData.favorites || [],
                    notes: userData.notes || {},
                    settings: userData.settings || {},
                    collections: userData.collections || {},
                    achievements: userData.achievements || {},
                    stats: userData.stats || {}
                },
                searchHistory: this.app.searchFilter.exportSearchHistory(),
                additionalData: {
                    totalPlacesAvailable: this.app.dataManager.getTotalPlaces(),
                    progressPercentage: this.calculateUserProgress(userData)
                }
            };
            
            // Générer le nom de fichier
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `paris-explorer-${targetUser}-${timestamp}.json`;
            
            // Télécharger le fichier
            this.downloadFile(JSON.stringify(exportData, null, 2), filename, 'application/json');
            
            this.app.showNotification(`✅ Données de ${targetUser} exportées !`, 'success');
            console.log('✅ Export utilisateur terminé');
            
        } catch (error) {
            console.error('❌ Erreur export utilisateur:', error);
            this.app.showNotification('Erreur lors de l\'export', 'error');
        } finally {
            this.isExporting = false;
        }
    }
    
    // === EXPORT PAR FORMAT ===
    exportUserDataAsCSV(userName = null) {
        const targetUser = userName || this.app.userManager.getCurrentUserName();
        
        if (!targetUser) {
            this.app.showNotification('Aucun utilisateur sélectionné', 'error');
            return;
        }
        
        try {
            console.log(`📊 Export CSV des données de ${targetUser}`);
            
            const userData = this.app.userManager.users[targetUser];
            const csvData = this.convertUserDataToCSV(userData, targetUser);
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `paris-explorer-${targetUser}-${timestamp}.csv`;
            
            this.downloadFile(csvData, filename, 'text/csv');
            
            this.app.showNotification(`📊 Export CSV terminé !`, 'success');
            
        } catch (error) {
            console.error('❌ Erreur export CSV:', error);
            this.app.showNotification('Erreur lors de l\'export CSV', 'error');
        }
    }
    
    exportUserDataAsHTML(userName = null) {
        const targetUser = userName || this.app.userManager.getCurrentUserName();
        
        if (!targetUser) {
            this.app.showNotification('Aucun utilisateur sélectionné', 'error');
            return;
        }
        
        try {
            console.log(`📄 Export HTML des données de ${targetUser}`);
            
            const userData = this.app.userManager.users[targetUser];
            const htmlData = this.convertUserDataToHTML(userData, targetUser);
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `paris-explorer-${targetUser}-${timestamp}.html`;
            
            this.downloadFile(htmlData, filename, 'text/html');
            
            this.app.showNotification(`📄 Rapport HTML généré !`, 'success');
            
        } catch (error) {
            console.error('❌ Erreur export HTML:', error);
            this.app.showNotification('Erreur lors de l\'export HTML', 'error');
        }
    }
    
    // === CONVERSION EN CSV ===
    convertUserDataToCSV(userData, userName) {
        const rows = [];
        
        // En-têtes
        rows.push('Type,Identifiant,Nom,Arrondissement,Catégorie,Statut,Date,Notes');
        
        // Lieux visités
        if (userData.visitedPlaces) {
            userData.visitedPlaces.forEach(placeId => {
                const details = this.getPlaceDetailsFromId(placeId);
                if (details) {
                    rows.push(`Lieu,${placeId},"${details.name}","${details.arrondissement}","${details.category}",Visité,"${new Date().toISOString()}",""`);
                }
            });
        }
        
        // Favoris
        if (userData.favorites) {
            userData.favorites.forEach(fav => {
                const details = this.getPlaceDetailsFromId(fav.placeId);
                if (details) {
                    rows.push(`Favori,${fav.placeId},"${details.name}","${details.arrondissement}","${details.category}",Favori,"${fav.addedAt}",""`);
                }
            });
        }
        
        // Notes
        if (userData.notes) {
            Object.entries(userData.notes).forEach(([placeId, note]) => {
                const details = this.getPlaceDetailsFromId(placeId);
                if (details) {
                    rows.push(`Note,${placeId},"${details.name}","${details.arrondissement}","${details.category}",Note,"${new Date().toISOString()}","${note.replace(/"/g, '""')}"`);
                }
            });
        }
        
        return rows.join('\n');
    }
    
    // === CONVERSION EN HTML ===
    convertUserDataToHTML(userData, userName) {
        const visitedCount = userData.visitedPlaces ? userData.visitedPlaces.size : 0;
        const favoritesCount = userData.favorites ? userData.favorites.length : 0;
        const notesCount = userData.notes ? Object.keys(userData.notes).length : 0;
        const achievementsCount = userData.achievements ? Object.keys(userData.achievements).length : 0;
        const progressPercent = this.calculateUserProgress(userData);
        
        return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paris Explorer - Rapport de ${userName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        .header {
            text-align: center;
            background: linear-gradient(135deg, #1e3a8a 0%, #D4AF37 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            font-weight: 300;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border-left: 4px solid #D4AF37;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #1e3a8a;
        }
        .stat-label {
            color: #6b7280;
            margin-top: 5px;
            font-weight: 500;
        }
        .section {
            background: white;
            margin: 20px 0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .section-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #D4AF37 100%);
            color: white;
            padding: 20px;
            font-size: 1.3rem;
            font-weight: 600;
        }
        .section-content {
            padding: 25px;
        }
        .place-item {
            padding: 15px;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .place-item:last-child {
            border-bottom: none;
        }
        .place-name {
            font-weight: 600;
            color: #1e3a8a;
        }
        .place-location {
            color: #6b7280;
            font-size: 0.9rem;
        }
        .progress-bar {
            width: 100%;
            height: 10px;
            background: #e5e7eb;
            border-radius: 5px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #D4AF37, #1e3a8a);
            transition: width 0.3s ease;
        }
        .export-info {
            text-align: center;
            color: #6b7280;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #f3f4f6;
        }
        @media print {
            body { background: white; }
            .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🗼 Paris Explorer</h1>
        <h2>Rapport d'exploration de ${userName}</h2>
        <p>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-number">${visitedCount}</div>
            <div class="stat-label">Lieux visités</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${favoritesCount}</div>
            <div class="stat-label">Favoris</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${notesCount}</div>
            <div class="stat-label">Notes</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${achievementsCount}</div>
            <div class="stat-label">Succès</div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header">📊 Progression Générale</div>
        <div class="section-content">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <p style="text-align: center; font-size: 1.2rem; font-weight: 600; color: #1e3a8a;">
                ${progressPercent}% de Paris exploré
            </p>
        </div>
    </div>
    
    ${this.generateHTMLSections(userData)}
    
    <div class="export-info">
        <p>📄 Rapport généré par Paris Explorer v${this.app.version}</p>
        <p>🗓️ ${new Date().toLocaleString('fr-FR')}</p>
    </div>
</body>
</html>`;
    }
    
    // === GÉNÉRATION DES SECTIONS HTML ===
    generateHTMLSections(userData) {
        let html = '';
        
        // Section lieux visités
        if (userData.visitedPlaces && userData.visitedPlaces.size > 0) {
            html += `
                <div class="section">
                    <div class="section-header">✅ Lieux Visités (${userData.visitedPlaces.size})</div>
                    <div class="section-content">
            `;
            
            userData.visitedPlaces.forEach(placeId => {
                const details = this.getPlaceDetailsFromId(placeId);
                if (details) {
                    html += `
                        <div class="place-item">
                            <div>
                                <div class="place-name">${details.name}</div>
                                <div class="place-location">${details.arrondissement} • ${details.category}</div>
                            </div>
                        </div>
                    `;
                }
            });
            
            html += `</div></div>`;
        }
        
        // Section favoris
        if (userData.favorites && userData.favorites.length > 0) {
            html += `
                <div class="section">
                    <div class="section-header">⭐ Favoris (${userData.favorites.length})</div>
                    <div class="section-content">
            `;
            
            userData.favorites.forEach(fav => {
                const details = this.getPlaceDetailsFromId(fav.placeId);
                if (details) {
                    html += `
                        <div class="place-item">
                            <div>
                                <div class="place-name">${details.name}</div>
                                <div class="place-location">${details.arrondissement} • ${details.category}</div>
                            </div>
                            <div style="color: #6b7280; font-size: 0.9rem;">
                                Ajouté le ${new Date(fav.addedAt).toLocaleDateString('fr-FR')}
                            </div>
                        </div>
                    `;
                }
            });
            
            html += `</div></div>`;
        }
        
        // Section achievements
        if (userData.achievements && Object.keys(userData.achievements).length > 0) {
            html += `
                <div class="section">
                    <div class="section-header">🏆 Succès Débloqués (${Object.keys(userData.achievements).length})</div>
                    <div class="section-content">
            `;
            
            Object.entries(userData.achievements).forEach(([key, achievement]) => {
                html += `
                    <div class="place-item">
                        <div>
                            <div class="place-name">${achievement.icon} ${achievement.title}</div>
                            <div class="place-location">${achievement.description}</div>
                        </div>
                        <div style="color: #6b7280; font-size: 0.9rem;">
                            ${new Date(achievement.unlockedAt).toLocaleDateString('fr-FR')}
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
        
        return html;
    }
    
    // === IMPORT DE DONNÉES ===
    showImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            this.app.uiManager.showModal('importModal');
        } else {
            this.createImportModal();
        }
    }
    
    createImportModal() {
        const modal = document.createElement('div');
        modal.id = 'importModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">📥 Importer des données</h3>
                    <button class="close-btn" onclick="app.uiManager.hideModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="import-section">
                        <h4>📄 Sélectionner le fichier</h4>
                        <input type="file" id="importFileInput" accept=".json" class="form-input">
                        <small class="setting-help">
                            Formats supportés: JSON (exporté depuis Paris Explorer)
                        </small>
                    </div>
                    
                    <div class="import-options">
                        <h4>⚙️ Options d'import</h4>
                        <label class="checkbox-container">
                            <input type="checkbox" id="replaceDataCheckbox" checked>
                            <span class="checkmark"></span>
                            Remplacer les données existantes
                        </label>
                        <label class="checkbox-container">
                            <input type="checkbox" id="importSettingsCheckbox" checked>
                            <span class="checkmark"></span>
                            Importer les paramètres
                        </label>
                        <label class="checkbox-container">
                            <input type="checkbox" id="importSearchHistoryCheckbox">
                            <span class="checkmark"></span>
                            Importer l'historique de recherche
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="app.exportImport.processImport()">
                            📥 Importer
                        </button>
                        <button class="btn btn-secondary" onclick="app.uiManager.hideModal()">
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.app.uiManager.showModal('importModal');
    }
    
    async processImport() {
        if (this.isImporting) {
            this.app.showNotification('Import déjà en cours...', 'warning');
            return;
        }
        
        const fileInput = document.getElementById('importFileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            this.app.showNotification('Veuillez sélectionner un fichier', 'error');
            return;
        }
        
        this.isImporting = true;
        console.log('📥 Import de fichier:', file.name);
        
        try {
            const fileContent = await this.readFile(file);
            const importData = JSON.parse(fileContent);
            
            // Validation des données
            if (!this.validateImportData(importData)) {
                throw new Error('Format de fichier invalide');
            }
            
            // Options d'import
            const options = {
                replaceData: document.getElementById('replaceDataCheckbox').checked,
                importSettings: document.getElementById('importSettingsCheckbox').checked,
                importSearchHistory: document.getElementById('importSearchHistoryCheckbox').checked
            };
            
            // Traitement de l'import
            const success = await this.importUserData(importData, options);
            
            if (success) {
                this.app.uiManager.hideModal();
                this.app.showNotification('✅ Données importées avec succès !', 'success');
                
                // Recharger l'interface
                this.app.uiManager.loadUserSelector();
                this.app.uiManager.renderContent();
                
                // Réinitialiser les filtres si nécessaire
                if (options.importSearchHistory) {
                    this.app.searchFilter.updateIndex();
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur import:', error);
            this.app.showNotification(`Erreur lors de l'import: ${error.message}`, 'error');
        } finally {
            this.isImporting = false;
        }
    }
    
    // === TRAITEMENT DE L'IMPORT ===
    async importUserData(importData, options) {
        console.log('📥 Traitement des données importées...');
        
        const userData = importData.user;
        if (!userData || !userData.name) {
            throw new Error('Données utilisateur manquantes');
        }
        
        const userName = userData.name;
        const existingUser = this.app.userManager.users[userName];
        
        // Vérifier si l'utilisateur existe
        if (existingUser && !options.replaceData) {
            const userChoice = confirm(`L'utilisateur "${userName}" existe déjà. Voulez-vous le remplacer ?`);
            if (!userChoice) {
                return false;
            }
        }
        
        // Préparer les nouvelles données utilisateur
        const newUserData = {
            name: userName,
            visitedPlaces: new Set(userData.visitedPlaces || []),
            favorites: userData.favorites || [],
            notes: userData.notes || {},
            settings: options.importSettings ? (userData.settings || {}) : (existingUser?.settings || this.app.userManager.getDefaultSettings()),
            collections: userData.collections || {},
            achievements: userData.achievements || {},
            stats: userData.stats || {
                totalVisited: userData.visitedPlaces ? userData.visitedPlaces.length : 0,
                createdAt: userData.stats?.createdAt || new Date().toISOString(),
                lastActivity: new Date().toISOString()
            }
        };
        
        // Fusionner avec les données existantes si nécessaire
        if (existingUser && !options.replaceData) {
            // Fusionner les lieux visités
            existingUser.visitedPlaces.forEach(placeId => {
                newUserData.visitedPlaces.add(placeId);
            });
            
            // Fusionner les favoris
            const existingFavoriteIds = existingUser.favorites.map(fav => fav.placeId);
            newUserData.favorites = [...existingUser.favorites];
            userData.favorites.forEach(fav => {
                if (!existingFavoriteIds.includes(fav.placeId)) {
                    newUserData.favorites.push(fav);
                }
            });
            
            // Fusionner les notes
            newUserData.notes = { ...existingUser.notes, ...newUserData.notes };
            
            // Fusionner les achievements
            newUserData.achievements = { ...existingUser.achievements, ...newUserData.achievements };
        }
        
        // Sauvegarder l'utilisateur
        this.app.userManager.users[userName] = newUserData;
        this.app.userManager.saveUsers();
        
        // Importer l'historique de recherche si demandé
        if (options.importSearchHistory && importData.searchHistory) {
            this.app.searchFilter.importSearchHistory(importData.searchHistory);
        }
        
        // Sélectionner l'utilisateur importé
        this.app.userManager.selectUser(userName);
        
        console.log('✅ Import utilisateur terminé');
        return true;
    }
    
    // === VALIDATION DES DONNÉES D'IMPORT ===
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            console.error('❌ Données d\'import invalides: pas un objet');
            return false;
        }
        
        if (!data.metadata || !data.metadata.appName) {
            console.error('❌ Métadonnées manquantes');
            return false;
        }
        
        if (data.metadata.appName !== 'Paris Explorer') {
            console.error('❌ Fichier non compatible:', data.metadata.appName);
            return false;
        }
        
        if (!data.user || !data.user.name) {
            console.error('❌ Données utilisateur manquantes');
            return false;
        }
        
        console.log('✅ Données d\'import valides');
        return true;
    }
    
    // === UTILITAIRES DE FICHIER ===
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Erreur lecture fichier'));
            reader.readAsText(file);
        });
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Nettoyer l'URL
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 1000);
        
        console.log('📁 Fichier téléchargé:', filename);
    }
    
    // === UTILITAIRES DE DONNÉES ===
    getPlaceDetailsFromId(placeId) {
        // Rechercher les détails d'un lieu par son ID
        if (!this.app.parisData) return null;
        
        for (const [arrKey, arrData] of Object.entries(this.app.parisData)) {
            for (const [catKey, catData] of Object.entries(arrData.categories || {})) {
                for (const place of catData.places || []) {
                    const currentPlaceId = this.app.dataManager.createPlaceId(arrKey, catKey, place.name);
                    if (currentPlaceId === placeId) {
                        return {
                            id: placeId,
                            name: place.name,
                            arrondissement: arrData.title,
                            category: catData.title,
                            description: place.description,
                            address: place.address,
                            tags: place.tags || []
                        };
                    }
                }
            }
        }
        
        return {
            id: placeId,
            name: 'Lieu inconnu',
            arrondissement: 'Inconnu',
            category: 'Inconnu',
            description: '',
            address: '',
            tags: []
        };
    }
    
    calculateUserProgress(userData) {
        if (!userData) return 0;
        
        const totalPlaces = this.app.dataManager.getTotalPlaces();
        const visitedPlaces = userData.visitedPlaces ? userData.visitedPlaces.size : 0;
        
        return totalPlaces > 0 ? Math.round((visitedPlaces / totalPlaces) * 100) : 0;
    }
    
    // === EXPORT DE TOUTES LES DONNÉES ===
    exportAllData() {
        if (this.isExporting) {
            this.app.showNotification('Export déjà en cours...', 'warning');
            return;
        }
        
        this.isExporting = true;
        console.log('📤 Export de toutes les données utilisateurs...');
        
        try {
            const allUsersData = {
                metadata: {
                    appName: 'Paris Explorer',
                    appVersion: this.app.version,
                    exportDate: new Date().toISOString(),
                    format: 'json',
                    dataVersion: '2.0.0',
                    exportType: 'all_users'
                },
                users: {},
                searchHistory: this.app.searchFilter.exportSearchHistory(),
                appSettings: this.app.config || {}
            };
            
            // Exporter tous les utilisateurs
            Object.entries(this.app.userManager.users).forEach(([userName, userData]) => {
                allUsersData.users[userName] = {
                    name: userName,
                    visitedPlaces: Array.from(userData.visitedPlaces || []),
                    favorites: userData.favorites || [],
                    notes: userData.notes || {},
                    settings: userData.settings || {},
                    collections: userData.collections || {},
                    achievements: userData.achievements || {},
                    stats: userData.stats || {}
                };
            });
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `paris-explorer-tous-utilisateurs-${timestamp}.json`;
            
            this.downloadFile(JSON.stringify(allUsersData, null, 2), filename, 'application/json');
            
            this.app.showNotification(`✅ Toutes les données exportées !`, 'success');
            console.log('✅ Export global terminé');
            
        } catch (error) {
            console.error('❌ Erreur export global:', error);
            this.app.showNotification('Erreur lors de l\'export global', 'error');
        } finally {
            this.isExporting = false;
        }
    }
    
    // === SAUVEGARDE AUTOMATIQUE ===
    enableAutoBackup() {
        console.log('💾 Activation de la sauvegarde automatique...');
        
        const interval = this.app.config?.users?.backupInterval || 300000; // 5 minutes par défaut
        
        this.backupInterval = setInterval(() => {
            this.createAutoBackup();
        }, interval);
        
        console.log(`✅ Sauvegarde automatique activée (${interval/1000}s)`);
    }
    
    disableAutoBackup() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
            console.log('💾 Sauvegarde automatique désactivée');
        }
    }
    
    createAutoBackup() {
        try {
            const currentUser = this.app.userManager.getCurrentUserName();
            if (!currentUser) return;
            
            const userData = this.app.userManager.users[currentUser];
            if (!userData) return;
            
            const backupData = {
                timestamp: new Date().toISOString(),
                user: currentUser,
                data: {
                    visitedPlaces: Array.from(userData.visitedPlaces || []),
                    favorites: userData.favorites || [],
                    notes: userData.notes || {},
                    achievements: userData.achievements || {}
                }
            };
            
            // Sauvegarder dans localStorage avec rotation
            const backups = JSON.parse(localStorage.getItem('paris-explorer-auto-backups') || '[]');
            backups.unshift(backupData);
            
            // Garder seulement les 10 dernières sauvegardes
            const limitedBackups = backups.slice(0, 10);
            localStorage.setItem('paris-explorer-auto-backups', JSON.stringify(limitedBackups));
            
            console.log('💾 Sauvegarde automatique créée pour', currentUser);
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde automatique:', error);
        }
    }
    
    // === RÉCUPÉRATION DE SAUVEGARDE ===
    restoreFromAutoBackup() {
        try {
            const backups = JSON.parse(localStorage.getItem('paris-explorer-auto-backups') || '[]');
            
            if (backups.length === 0) {
                this.app.showNotification('Aucune sauvegarde automatique trouvée', 'info');
                return;
            }
            
            const latestBackup = backups[0];
            const userChoice = confirm(`Restaurer la sauvegarde automatique de ${latestBackup.user} du ${new Date(latestBackup.timestamp).toLocaleString('fr-FR')} ?`);
            
            if (userChoice) {
                const userData = this.app.userManager.users[latestBackup.user];
                if (userData) {
                    userData.visitedPlaces = new Set(latestBackup.data.visitedPlaces);
                    userData.favorites = latestBackup.data.favorites;
                    userData.notes = latestBackup.data.notes;
                    userData.achievements = latestBackup.data.achievements;
                    
                    this.app.userManager.saveUsers();
                    this.app.uiManager.renderContent();
                    
                    this.app.showNotification('✅ Sauvegarde restaurée !', 'success');
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur restauration:', error);
            this.app.showNotification('Erreur lors de la restauration', 'error');
        }
    }
    
    // === NETTOYAGE ===
    cleanup() {
        this.disableAutoBackup();
        console.log('🧹 Export/Import nettoyé');
    }
}
