// ===== EXPORT-IMPORT MANAGER - GESTION AVANCÉE DES DONNÉES =====

class ExportImportManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }
    
    // === EXPORT DES DONNÉES ===
    async exportUserData(format = 'json', userName = null) {
        try {
            const targetUser = userName || this.app.currentUser;
            if (!targetUser) {
                this.app.showNotification('Veuillez sélectionner un utilisateur', 'warning');
                return;
            }
            
            const userData = this.app.userManager.users[targetUser];
            if (!userData) {
                this.app.showNotification('Utilisateur introuvable', 'error');
                return;
            }
            
            // Préparer les données d'export
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    appVersion: '2.0.0',
                    exportFormat: format,
                    userName: targetUser,
                    totalPlaces: this.app.dataManager.getTotalPlaces()
                },
                userData: {
                    ...userData,
                    visitedPlaces: Array.from(userData.visitedPlaces || []),
                    favorites: Array.from(userData.favorites || []),
                    notes: userData.notes || {},
                    customTags: userData.customTags || []
                },
                visitedDetails: this.getVisitedPlacesDetails(userData)
            };
            
            // Exporter selon le format
            switch (format.toLowerCase()) {
                case 'json':
                    await this.exportToJSON(exportData, targetUser);
                    break;
                case 'csv':
                    await this.exportToCSV(exportData, targetUser);
                    break;
                case 'pdf':
                    await this.exportToPDF(exportData, targetUser);
                    break;
                case 'html':
                    await this.exportToHTML(exportData, targetUser);
                    break;
                default:
                    throw new Error(`Format non supporté: ${format}`);
            }
            
            this.app.showNotification(`Export ${format.toUpperCase()} réussi !`, 'success');
            
        } catch (error) {
            console.error('Erreur export:', error);
            this.app.showNotification(`Erreur lors de l'export: ${error.message}`, 'error');
        }
    }
    
    // === EXPORT JSON ===
    async exportToJSON(data, userName) {
        const jsonString = JSON.stringify(data, null, 2);
        const fileName = `paris-explorer-${userName}-${this.getDateString()}.json`;
        
        this.downloadFile(jsonString, fileName, 'application/json');
    }
    
    // === EXPORT CSV ===
    async exportToCSV(data, userName) {
        const csvRows = [];
        
        // En-têtes
        csvRows.push([
            'Lieu',
            'Arrondissement', 
            'Catégorie',
            'Description',
            'Adresse',
            'Visité',
            'Date de visite',
            'Note personnelle',
            'Tags'
        ]);
        
        // Données des lieux
        data.visitedDetails.forEach(place => {
            csvRows.push([
                this.escapeCsvField(place.name),
                this.escapeCsvField(place.arrondissement),
                this.escapeCsvField(place.category),
                this.escapeCsvField(place.description),
                this.escapeCsvField(place.address || ''),
                place.visited ? 'Oui' : 'Non',
                place.visitDate || '',
                this.escapeCsvField(place.note || ''),
                this.escapeCsvField((place.tags || []).join('; '))
            ]);
        });
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const fileName = `paris-explorer-${userName}-${this.getDateString()}.csv`;
        
        this.downloadFile(csvContent, fileName, 'text/csv');
    }
    
    // === EXPORT HTML ===
    async exportToHTML(data, userName) {
        const htmlContent = this.generateHTMLReport(data, userName);
        const fileName = `paris-explorer-${userName}-${this.getDateString()}.html`;
        
        this.downloadFile(htmlContent, fileName, 'text/html');
    }
    
    generateHTMLReport(data, userName) {
        const visitedCount = data.userData.visitedPlaces.length;
        const totalPlaces = data.metadata.totalPlaces;
        const completionRate = Math.round((visitedCount / totalPlaces) * 100);
        
        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paris Explorer - Rapport de ${userName}</title>
    <style>
        body {
            font-family: 'Georgia', serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #1e3a8a 0%, #D4AF37 100%);
            color: #1f2937;
        }
        .report-container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #D4AF37;
            padding-bottom: 20px;
        }
        .title {
            font-size: 2.5rem;
            color: #1e3a8a;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 1.2rem;
            color: #6b7280;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #D4AF37;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #1e3a8a;
        }
        .stat-label {
            color: #6b7280;
            font-size: 0.9rem;
            text-transform: uppercase;
        }
        .section {
            margin: 40px 0;
        }
        .section-title {
            font-size: 1.5rem;
            color: #1e3a8a;
            margin-bottom: 20px;
            border-left: 4px solid #D4AF37;
            padding-left: 15px;
        }
        .places-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .place-card {
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #D4AF37;
        }
        .place-name {
            font-size: 1.1rem;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 8px;
        }
        .place-description {
            color: #6b7280;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        .place-address {
            margin-top: 8px;
            font-size: 0.8rem;
            color: #9ca3af;
        }
        .export-info {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 0.8rem;
            color: #9ca3af;
        }
        @media print {
            body { background: white; }
            .report-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1 class="title">🗼 Paris Explorer</h1>
            <p class="subtitle">Rapport d'exploration de ${userName}</p>
            <p>Généré le ${new Date(data.metadata.exportDate).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric', 
                month: 'long',
                day: 'numeric'
            })}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${visitedCount}</div>
                <div class="stat-label">Lieux Explorés</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalPlaces}</div>
                <div class="stat-label">Lieux Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${completionRate}%</div>
                <div class="stat-label">Paris Conquis</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.userData.stats?.streak || 0}</div>
                <div class="stat-label">Série Actuelle</div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">🏛️ Lieux Explorés</h2>
            <div class="places-grid">
                ${data.visitedDetails.filter(p => p.visited).map(place => `
                    <div class="place-card">
                        <div class="place-name">${place.name}</div>
                        <div class="place-description">${place.description}</div>
                        <div class="place-address">📍 ${place.address || 'Adresse non disponible'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="export-info">
            <p>📊 Rapport généré par Paris Explorer v${data.metadata.appVersion}</p>
            <p>🗼 Continuez votre exploration sur paris-explorer.fr</p>
        </div>
    </div>
</body>
</html>`;
    }
    
    // === IMPORT DES DONNÉES ===
    async importUserData() {
        try {
            const fileInput = document.getElementById('importFileInput');
            if (!fileInput) {
                console.error('Input file non trouvé');
                return;
            }
            
            fileInput.click();
            
        } catch (error) {
            console.error('Erreur import:', error);
            this.app.showNotification(`Erreur lors de l'import: ${error.message}`, 'error');
        }
    }
    
    async handleFileImport(file) {
        try {
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.json')) {
                await this.importFromJSON(file);
            } else if (fileName.endsWith('.csv')) {
                await this.importFromCSV(file);
            } else {
                throw new Error('Format de fichier non supporté. Utilisez JSON ou CSV.');
            }
            
        } catch (error) {
            console.error('Erreur import fichier:', error);
            this.app.showNotification(`Erreur import: ${error.message}`, 'error');
        }
    }
    
    async importFromJSON(file) {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Validation de la structure
        if (!data.userData || !data.userData.name) {
            throw new Error('Structure de fichier JSON invalide');
        }
        
        const userName = data.userData.name;
        
        // Demander confirmation si l'utilisateur existe
        if (this.app.userManager.users[userName]) {
            if (!confirm(`L'utilisateur "${userName}" existe déjà. Voulez-vous l'écraser ?`)) {
                return;
            }
        }
        
        // Reconstituer les Set depuis les Array
        const userData = {
            ...data.userData,
            visitedPlaces: new Set(data.userData.visitedPlaces || []),
            favorites: new Set(data.userData.favorites || [])
        };
        
        // Importer l'utilisateur
        this.app.userManager.users[userName] = userData;
        this.app.userManager.saveUsers();
        this.app.uiManager.loadUserSelector();
        
        this.app.showNotification(`Utilisateur "${userName}" importé avec succès !`, 'success');
    }
    
    // === UTILITAIRES ===
    getVisitedPlacesDetails(userData) {
        const details = [];
        
        if (!this.app.isDataLoaded) return details;
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                (catData.places || []).forEach(place => {
                    const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                    const isVisited = userData.visitedPlaces instanceof Set ? 
                        userData.visitedPlaces.has(placeId) : false;
                    
                    details.push({
                        id: placeId,
                        name: place.name,
                        description: place.description,
                        address: place.address,
                        tags: place.tags,
                        arrondissement: arrData.title,
                        category: catData.title,
                        visited: isVisited,
                        visitDate: userData.visitDates?.[placeId] || '',
                        note: userData.notes?.[placeId] || ''
                    });
                });
            });
        });
        
        return details;
    }
    
    escapeCsvField(field) {
        if (!field) return '';
        
        const fieldStr = String(field);
        if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
            return `"${fieldStr.replace(/"/g, '""')}"`;
        }
        return fieldStr;
    }
    
    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
    
    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    // === SAUVEGARDE CLOUD (OPTIONNEL) ===
    async syncToCloud(userData) {
        // Implémentation future pour synchronisation cloud
        try {
            // API call vers service de synchronisation
            console.log('Sync cloud non implémenté');
        } catch (error) {
            console.warn('Erreur sync cloud:', error);
        }
    }
    
    // === ÉVÉNEMENTS ===
    setupEventListeners() {
        // Import de fichier
        const importFileInput = document.getElementById('importFileInput');
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileImport(file);
                }
                e.target.value = ''; // Reset input
            });
        }
        
        // Export buttons
        const exportBtn = document.getElementById('exportDataBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showExportModal();
            });
        }
        
        const importBtn = document.getElementById('importDataBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.importUserData();
            });
        }
    }
    
    showExportModal() {
        // Créer modal d'export dynamique
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📊 Exporter vos données</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Format d'export</label>
                        <select id="exportFormat" class="form-input">
                            <option value="json">JSON - Données complètes</option>
                            <option value="csv">CSV - Tableur Excel</option>
                            <option value="html">HTML - Rapport visuel</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button class="btn btn-success" onclick="app.exportImportManager.exportUserData(document.getElementById('exportFormat').value); this.closest('.modal').remove();">
                            📤 Exporter
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('show');
        
        // Fermeture par clic overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}
