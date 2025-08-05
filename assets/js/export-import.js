// ===== EXPORT-IMPORT - GESTION DES EXPORTS/IMPORTS DE DONNÉES =====

class ExportImportManager {
    constructor(app) {
        this.app = app;
        this.supportedFormats = ['json', 'csv', 'txt'];
    }
    
    // === EXPORT DES DONNÉES ===
    
    /**
     * Exporte les données utilisateur en JSON
     */
    exportUserDataJSON(userName) {
        try {
            const userData = this.app.userManager.users[userName];
            if (!userData) {
                throw new Error(`Utilisateur "${userName}" introuvable`);
            }
            
            const exportData = {
                metadata: {
                    appName: 'Paris Explorer',
                    version: '2.0.0',
                    exportDate: Utils.Date.now(),
                    exportedBy: userName,
                    totalPlaces: this.app.dataManager.getTotalPlaces()
                },
                user: {
                    ...userData,
                    visitedPlaces: Array.from(userData.visitedPlaces || []),
                    favorites: Array.from(userData.favorites || [])
                },
                statistics: this.generateUserStatistics(userData)
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const filename = `paris-explorer-${Utils.Text.createId(userName)}-${new Date().toISOString().split('T')[0]}.json`;
            
            this.downloadFile(jsonString, filename, 'application/json');
            
            console.log(`✅ Export JSON réussi pour ${userName}`);
            this.app.showNotification(`Export JSON téléchargé : ${filename}`, 'success');
            
            return exportData;
            
        } catch (error) {
            console.error('❌ Erreur export JSON:', error);
            this.app.showNotification(`Erreur export JSON : ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Exporte les données utilisateur en CSV
     */
    exportUserDataCSV(userName) {
        try {
            const userData = this.app.userManager.users[userName];
            if (!userData) {
                throw new Error(`Utilisateur "${userName}" introuvable`);
            }
            
            const csvData = this.generateCSVData(userData);
            const filename = `paris-explorer-${Utils.Text.createId(userName)}-${new Date().toISOString().split('T')[0]}.csv`;
            
            this.downloadFile(csvData, filename, 'text/csv');
            
            console.log(`✅ Export CSV réussi pour ${userName}`);
            this.app.showNotification(`Export CSV téléchargé : ${filename}`, 'success');
            
            return csvData;
            
        } catch (error) {
            console.error('❌ Erreur export CSV:', error);
            this.app.showNotification(`Erreur export CSV : ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Exporte un rapport de progression en TXT
     */
    exportProgressReport(userName) {
        try {
            const userData = this.app.userManager.users[userName];
            if (!userData) {
                throw new Error(`Utilisateur "${userName}" introuvable`);
            }
            
            const report = this.generateProgressReport(userData);
            const filename = `rapport-paris-${Utils.Text.createId(userName)}-${new Date().toISOString().split('T')[0]}.txt`;
            
            this.downloadFile(report, filename, 'text/plain');
            
            console.log(`✅ Export rapport réussi pour ${userName}`);
            this.app.showNotification(`Rapport téléchargé : ${filename}`, 'success');
            
            return report;
            
        } catch (error) {
            console.error('❌ Erreur export rapport:', error);
            this.app.showNotification(`Erreur export rapport : ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Exporte tous les utilisateurs
     */
    exportAllUsers() {
        try {
            const allUsers = {};
            
            Object.entries(this.app.userManager.users).forEach(([name, userData]) => {
                allUsers[name] = {
                    ...userData,
                    visitedPlaces: Array.from(userData.visitedPlaces || []),
                    favorites: Array.from(userData.favorites || [])
                };
            });
            
            const exportData = {
                metadata: {
                    appName: 'Paris Explorer',
                    version: '2.0.0',
                    exportDate: Utils.Date.now(),
                    totalUsers: Object.keys(allUsers).length,
                    totalPlaces: this.app.dataManager.getTotalPlaces()
                },
                users: allUsers
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const filename = `paris-explorer-all-users-${new Date().toISOString().split('T')[0]}.json`;
            
            this.downloadFile(jsonString, filename, 'application/json');
            
            console.log(`✅ Export tous utilisateurs réussi`);
            this.app.showNotification(`Export complet téléchargé : ${filename}`, 'success');
            
            return exportData;
            
        } catch (error) {
            console.error('❌ Erreur export tous utilisateurs:', error);
            this.app.showNotification(`Erreur export complet : ${error.message}`, 'error');
            throw error;
        }
    }
    
    // === IMPORT DES DONNÉES ===
    
    /**
     * Importe des données depuis un fichier
     */
    async importData(file) {
        try {
            if (!file) {
                throw new Error('Aucun fichier sélectionné');
            }
            
            const fileContent = await this.readFile(file);
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            switch (fileExtension) {
                case 'json':
                    return await this.importJSONData(fileContent, file.name);
                case 'csv':
                    return await this.importCSVData(fileContent, file.name);
                default:
                    throw new Error(`Format de fichier non supporté : ${fileExtension}`);
            }
            
        } catch (error) {
            console.error('❌ Erreur import:', error);
            this.app.showNotification(`Erreur import : ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Importe des données JSON
     */
    async importJSONData(content, filename) {
        try {
            const data = JSON.parse(content);
            
            // Validation de la structure
            if (!this.validateImportData(data)) {
                throw new Error('Structure de données invalide');
            }
            
            let importedCount = 0;
            
            // Import d'un utilisateur unique
            if (data.user) {
                const result = await this.importSingleUser(data.user);
                if (result) importedCount = 1;
            }
            
            // Import de plusieurs utilisateurs
            if (data.users) {
                for (const [userName, userData] of Object.entries(data.users)) {
                    const result = await this.importSingleUser(userData);
                    if (result) importedCount++;
                }
            }
            
            if (importedCount > 0) {
                this.app.userManager.saveUsers();
                this.app.uiManager.loadUserSelector();
                this.app.uiManager.updateUsersList();
                
                console.log(`✅ Import réussi: ${importedCount} utilisateur(s)`);
                this.app.showNotification(`Import réussi : ${importedCount} profil(s) importé(s)`, 'success');
            } else {
                throw new Error('Aucune donnée valide trouvée');
            }
            
            return { imported: importedCount, filename };
            
        } catch (error) {
            console.error('❌ Erreur import JSON:', error);
            throw new Error(`Erreur import JSON : ${error.message}`);
        }
    }
    
    /**
     * Importe un utilisateur unique
     */
    async importSingleUser(userData) {
        try {
            if (!Utils.Validation.validateUserData(userData)) {
                console.warn('⚠️ Données utilisateur invalides, ignorées');
                return false;
            }
            
            const userName = userData.name;
            
            // Vérifier si l'utilisateur existe déjà
            if (this.app.userManager.users[userName]) {
                const confirmed = confirm(`L'utilisateur "${userName}" existe déjà. Voulez-vous l'écraser ?`);
                if (!confirmed) {
                    return false;
                }
            }
            
            // Convertir les arrays en Set si nécessaire
            const importedUser = {
                ...userData,
                visitedPlaces: new Set(userData.visitedPlaces || []),
                favorites: new Set(userData.favorites || []),
                lastActive: Utils.Date.now(),
                stats: {
                    totalVisited: (userData.visitedPlaces || []).length,
                    streak: userData.stats?.streak || 0,
                    lastVisit: userData.stats?.lastVisit || null,
                    favoriteArrondissement: userData.stats?.favoriteArrondissement || null,
                    totalSessionTime: userData.stats?.totalSessionTime || 0,
                    ...userData.stats
                }
            };
            
            this.app.userManager.users[userName] = importedUser;
            
            console.log(`✅ Utilisateur importé: ${userName}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Erreur import utilisateur:`, error);
            return false;
        }
    }
    
    // === GÉNÉRATION DE DONNÉES ===
    
    /**
     * Génère des statistiques utilisateur pour l'export
     */
    generateUserStatistics(userData) {
        const totalPlaces = this.app.dataManager.getTotalPlaces();
        const visitedCount = userData.visitedPlaces ? userData.visitedPlaces.size : 0;
        
        const stats = {
            progression: {
                totalPlaces,
                visitedPlaces: visitedCount,
                completionRate: Utils.Math.percentage(visitedCount, totalPlaces),
                remainingPlaces: totalPlaces - visitedCount
            },
            timeline: {
                createdAt: userData.createdAt,
                lastActive: userData.lastActive,
                daysSinceCreation: userData.createdAt ? Utils.Date.daysBetween(userData.createdAt, new Date()) : 0,
                currentStreak: userData.stats?.streak || 0
            },
            categories: this.generateCategoryStatistics(userData),
            arrondissements: this.generateArrondissementStatistics(userData)
        };
        
        return stats;
    }
    
    /**
     * Génère des statistiques par catégorie
     */
    generateCategoryStatistics(userData) {
        const categoryStats = {};
        
        if (!this.app.isDataLoaded || !userData.visitedPlaces) {
            return categoryStats;
        }
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                if (!categoryStats[catKey]) {
                    categoryStats[catKey] = {
                        title: catData.title,
                        total: 0,
                        visited: 0
                    };
                }
                
                const places = catData.places || [];
                categoryStats[catKey].total += places.length;
                
                places.forEach(place => {
                    const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                    if (userData.visitedPlaces.has(placeId)) {
                        categoryStats[catKey].visited++;
                    }
                });
            });
        });
        
        // Calculer les pourcentages
        Object.values(categoryStats).forEach(stat => {
            stat.completionRate = Utils.Math.percentage(stat.visited, stat.total);
        });
        
        return categoryStats;
    }
    
    /**
     * Génère des statistiques par arrondissement
     */
    generateArrondissementStatistics(userData) {
        const arrStats = {};
        
        if (!this.app.isDataLoaded || !userData.visitedPlaces) {
            return arrStats;
        }
        
        Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
            const totalInArr = this.app.dataManager.getTotalPlacesInArrondissement(arrData);
            const visitedInArr = this.app.dataManager.getVisitedPlacesInArrondissement(arrData, arrKey);
            
            arrStats[arrKey] = {
                title: arrData.title,
                total: totalInArr,
                visited: visitedInArr,
                completionRate: Utils.Math.percentage(visitedInArr, totalInArr),
                categories: Object.keys(arrData.categories || {}).length
            };
        });
        
        return arrStats;
    }
    
    /**
     * Génère des données CSV
     */
    generateCSVData(userData) {
        const headers = [
            'Arrondissement',
            'Catégorie',
            'Lieu',
            'Description',
            'Adresse',
            'Visité',
            'Date_Visite',
            'Tags'
        ];
        
        const rows = [headers.join(',')];
        
        if (this.app.isDataLoaded) {
            Object.entries(this.app.parisData).forEach(([arrKey, arrData]) => {
                Object.entries(arrData.categories || {}).forEach(([catKey, catData]) => {
                    (catData.places || []).forEach(place => {
                        const placeId = this.app.createPlaceId(arrKey, catKey, place.name);
                        const isVisited = userData.visitedPlaces.has(placeId);
                        
                        const row = [
                            `"${arrData.title || arrKey}"`,
                            `"${catData.title || catKey}"`,
                            `"${place.name}"`,
                            `"${(place.description || '').replace(/"/g, '""')}"`,
                            `"${place.address || ''}"`,
                            isVisited ? 'Oui' : 'Non',
                            isVisited ? Utils.Date.formatDate(userData.stats?.lastVisit) : '',
                            `"${(place.tags || []).join(', ')}"`
                        ];
                        
                        rows.push(row.join(','));
                    });
                });
            });
        }
        
        return rows.join('\n');
    }
    
    /**
     * Génère un rapport de progression textuel
     */
    generateProgressReport(userData) {
        const stats = this.generateUserStatistics(userData);
        const date = new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let report = `
╔══════════════════════════════════════════════════════════════╗
║                     PARIS EXPLORER                          ║
║                 RAPPORT DE PROGRESSION                       ║
╚══════════════════════════════════════════════════════════════╝

👤 Explorateur : ${userData.name}
📅 Rapport généré le : ${date}
⏰ Heure : ${new Date().toLocaleTimeString('fr-FR')}

═══════════════════════════════════════════════════════════════

📊 STATISTIQUES GÉNÉRALES

🏛️ Lieux explorés : ${stats.progression.visitedPlaces} / ${stats.progression.totalPlaces}
📈 Taux de completion : ${stats.progression.completionRate}%
📍 Lieux restants : ${stats.progression.remainingPlaces}
🔥 Série actuelle : ${stats.timeline.currentStreak} jour(s)

📅 Compte créé : ${Utils.Date.formatDate(userData.createdAt)}
🕐 Dernière activité : ${Utils.Date.formatDate(userData.lastActive)}
⏳ Ancienneté : ${stats.timeline.daysSinceCreation} jour(s)

═══════════════════════════════════════════════════════════════

🗺️ PROGRESSION PAR ARRONDISSEMENT

`;
        
        // Ajouter les stats par arrondissement
        Object.entries(stats.arrondissements)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([arrKey, arrStat]) => {
                const progress = '█'.repeat(Math.floor(arrStat.completionRate / 5));
                const empty = '░'.repeat(20 - Math.floor(arrStat.completionRate / 5));
                
                report += `${arrKey.padEnd(4)} │ ${progress}${empty} │ ${arrStat.completionRate.toString().padStart(3)}% │ ${arrStat.visited}/${arrStat.total}\n`;
            });
        
        report += `
═══════════════════════════════════════════════════════════════

🎯 PROGRESSION PAR CATÉGORIE

`;
        
        // Ajouter les stats par catégorie
        Object.entries(stats.categories)
            .sort(([, a], [, b]) => b.completionRate - a.completionRate)
            .slice(0, 10) // Top 10
            .forEach(([catKey, catStat]) => {
                const progress = '█'.repeat(Math.floor(catStat.completionRate / 5));
                const empty = '░'.repeat(20 - Math.floor(catStat.completionRate / 5));
                
                report += `${Utils.Text.truncate(catStat.title, 25).padEnd(25)} │ ${progress}${empty} │ ${catStat.completionRate.toString().padStart(3)}%\n`;
            });
        
        report += `
═══════════════════════════════════════════════════════════════

🏆 FÉLICITATIONS !

`;
        
        if (stats.progression.completionRate === 100) {
            report += `🎉 INCROYABLE ! Vous avez exploré tout Paris !\n`;
            report += `👑 Vous êtes maintenant un véritable Parisien !\n`;
        } else if (stats.progression.completionRate >= 75) {
            report += `🌟 Excellente progression ! Vous connaissez très bien Paris !\n`;
            report += `🎯 Plus que ${stats.progression.remainingPlaces} lieux à découvrir !\n`;
        } else if (stats.progression.completionRate >= 50) {
            report += `👍 Belle exploration ! Vous êtes à mi-parcours !\n`;
            report += `🚀 Continuez sur cette lancée !\n`;
        } else if (stats.progression.completionRate >= 25) {
            report += `🌱 Bon début d'exploration !\n`;
            report += `💪 Il reste encore beaucoup à découvrir !\n`;
        } else {
            report += `🚀 L'aventure parisienne ne fait que commencer !\n`;
            report += `✨ Tant de merveilles vous attendent !\n`;
        }
        
        report += `
═══════════════════════════════════════════════════════════════

Généré par Paris Explorer v2.0.0
https://github.com/paris-explorer

Bon voyage dans la Ville Lumière ! 🗼✨
`;
        
        return report;
    }
    
    // === UTILITAIRES ===
    
    /**
     * Lit un fichier de manière asynchrone
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Erreur lecture fichier'));
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Télécharge un fichier
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Nettoyer l'URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    /**
     * Valide les données d'import
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // Validation pour un utilisateur unique
        if (data.user) {
            return Utils.Validation.validateUserData(data.user);
        }
        
        // Validation pour plusieurs utilisateurs
        if (data.users) {
            return Object.values(data.users).every(user => 
                Utils.Validation.validateUserData(user)
            );
        }
        
        return false;
    }
    
    /**
     * Obtient les statistiques d'export
     */
    getExportStats() {
        const users = this.app.userManager.users;
        const totalUsers = Object.keys(users).length;
        let totalVisited = 0;
        
        Object.values(users).forEach(user => {
            totalVisited += user.visitedPlaces ? user.visitedPlaces.size : 0;
        });
        
        return {
            totalUsers,
            totalPlaces: this.app.dataManager.getTotalPlaces(),
            totalVisited,
            averageProgression: totalUsers > 0 ? 
                Utils.Math.percentage(totalVisited / totalUsers, this.app.dataManager.getTotalPlaces()) : 0,
            lastExport: Utils.Storage.load('last-export-date'),
            exportCount: Utils.Storage.load('export-count', 0)
        };
    }
    
    /**
     * Met à jour les statistiques d'export
     */
    updateExportStats() {
        const currentCount = Utils.Storage.load('export-count', 0);
        Utils.Storage.save('export-count', currentCount + 1);
        Utils.Storage.save('last-export-date', Utils.Date.now());
    }
}
