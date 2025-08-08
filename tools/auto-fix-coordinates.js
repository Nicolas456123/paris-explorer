#!/usr/bin/env node

/**
 * Script automatique de correction des coordonnées
 * Utilise le GeocodingService pour corriger tous les fichiers d'arrondissements
 */

const fs = require('fs');
const path = require('path');
const GeocodingService = require('./geocoding-service.js');

class CoordinatesFixer {
    constructor() {
        this.geocoder = new GeocodingService();
        this.dataDir = path.join(__dirname, 'data', 'arrondissements');
        this.backupDir = path.join(__dirname, 'data', 'backups');
        this.reportPath = path.join(__dirname, 'coordinate-fixes-report.json');
        
        // Créer le dossier de backup
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Liste tous les fichiers d'arrondissements
     */
    getArrondissementFiles() {
        if (!fs.existsSync(this.dataDir)) {
            throw new Error(`Dossier non trouvé: ${this.dataDir}`);
        }
        
        return fs.readdirSync(this.dataDir)
            .filter(file => file.endsWith('.json'))
            .map(file => path.join(this.dataDir, file));
    }

    /**
     * Crée une sauvegarde d'un fichier
     */
    createBackup(filePath) {
        const fileName = path.basename(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `${fileName}.backup-${timestamp}`);
        
        fs.copyFileSync(filePath, backupPath);
        console.log(`💾 Backup créé: ${backupPath}`);
        return backupPath;
    }

    /**
     * Charge un fichier JSON d'arrondissement
     */
    loadArrondissementData(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`❌ Erreur lecture ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Sauvegarde un fichier JSON d'arrondissement
     */
    saveArrondissementData(filePath, data) {
        try {
            const content = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Sauvegardé: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`❌ Erreur écriture ${filePath}:`, error.message);
            return false;
        }
    }

    /**
     * Applique les corrections à un fichier d'arrondissement
     */
    applyFixesToData(data, fixes) {
        let applied = 0;
        
        for (const [categoryName, category] of Object.entries(data.arrondissement.categories)) {
            if (category.places) {
                category.places.forEach((place, index) => {
                    const fix = fixes.fixed.find(f => f.id === place.id && f.category === categoryName);
                    if (fix) {
                        category.places[index] = {
                            ...place,
                            coordinates: fix.coordinates,
                            geocoding: fix.geocoding
                        };
                        applied++;
                        console.log(`🔧 Appliqué: ${fix.name} → [${fix.coordinates.join(', ')}]`);
                    }
                });
            }
        }
        
        return applied;
    }

    /**
     * Traite un seul fichier d'arrondissement
     */
    async processFile(filePath) {
        console.log(`\n📍 Traitement: ${path.basename(filePath)}`);
        
        // Charger les données
        const data = this.loadArrondissementData(filePath);
        if (!data) return null;
        
        // Créer une sauvegarde
        const backupPath = this.createBackup(filePath);
        
        // Analyser et corriger
        const results = await this.geocoder.processArrondissement(data);
        
        if (results.fixed.length > 0) {
            console.log(`✨ ${results.fixed.length} corrections trouvées`);
            
            // Appliquer les corrections
            const applied = this.applyFixesToData(data, results);
            
            // Sauvegarder le fichier corrigé
            if (applied > 0) {
                const saved = this.saveArrondissementData(filePath, data);
                if (saved) {
                    console.log(`💫 ${applied} corrections appliquées à ${path.basename(filePath)}`);
                }
            }
        } else {
            console.log(`ℹ️  Aucune correction nécessaire`);
        }
        
        return {
            file: path.basename(filePath),
            backupPath,
            ...results
        };
    }

    /**
     * Traite tous les fichiers d'arrondissements
     */
    async processAllFiles() {
        console.log('🚀 Début de la correction automatique des coordonnées\n');
        
        const files = this.getArrondissementFiles();
        console.log(`📁 ${files.length} fichiers d'arrondissements trouvés`);
        
        const allResults = [];
        let totalFixed = 0;
        let totalFailed = 0;
        
        for (const filePath of files) {
            try {
                const result = await this.processFile(filePath);
                if (result) {
                    allResults.push(result);
                    totalFixed += result.fixed.length;
                    totalFailed += result.failed.length;
                }
                
                // Pause pour respecter les rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`❌ Erreur traitement ${filePath}:`, error.message);
                allResults.push({
                    file: path.basename(filePath),
                    error: error.message,
                    fixed: [],
                    failed: []
                });
            }
        }
        
        // Générer le rapport
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                files_processed: files.length,
                total_fixed: totalFixed,
                total_failed: totalFailed,
                success_rate: totalFixed > 0 ? ((totalFixed / (totalFixed + totalFailed)) * 100).toFixed(1) + '%' : '0%'
            },
            details: allResults
        };
        
        // Sauvegarder le rapport
        fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
        
        // Afficher le résumé
        console.log('\n🎉 Correction terminée !');
        console.log(`📊 Résumé:`);
        console.log(`   • ${files.length} fichiers traités`);
        console.log(`   • ${totalFixed} lieux corrigés`);
        console.log(`   • ${totalFailed} échecs`);
        console.log(`   • ${report.summary.success_rate} de succès`);
        console.log(`📄 Rapport complet: ${this.reportPath}`);
        
        return report;
    }

    /**
     * Mode interactif pour corriger un seul arrondissement
     */
    async interactive() {
        const files = this.getArrondissementFiles();
        
        console.log('\n🔧 Mode interactif - Sélectionner un arrondissement:');
        files.forEach((file, index) => {
            console.log(`  ${index + 1}. ${path.basename(file)}`);
        });
        
        // En mode script, on prend le premier par défaut
        const selectedIndex = 0;
        const selectedFile = files[selectedIndex];
        
        console.log(`\n🎯 Sélectionné: ${path.basename(selectedFile)}`);
        
        const result = await this.processFile(selectedFile);
        if (result) {
            console.log('\n✅ Traitement terminé');
            return result;
        }
    }
}

// CLI Usage
async function main() {
    const fixer = new CoordinatesFixer();
    
    const args = process.argv.slice(2);
    const mode = args[0] || 'all';
    
    try {
        switch (mode) {
            case 'interactive':
            case 'i':
                await fixer.interactive();
                break;
            
            case 'all':
            default:
                await fixer.processAllFiles();
                break;
        }
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    main();
}

module.exports = CoordinatesFixer;