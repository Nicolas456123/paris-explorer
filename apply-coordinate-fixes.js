#!/usr/bin/env node

/**
 * Applique les corrections de coordonnées obtenues par géocodage
 */

const fs = require('fs');
const path = require('path');
const GeocodingService = require('./geocoding-service.js');

// Corrections connues obtenues par géocodage
const KNOWN_FIXES = {
    // Corrections obtenues du test précédent
    'Tour Eiffel': {
        newCoordinates: [48.858260, 2.294501],
        source: 'Photon',
        confidence: 0.70
    },
    'Musée du Louvre': {
        newCoordinates: [48.862513, 2.335930],
        source: 'Nominatim', 
        confidence: 0.47
    },
    'Église de la Madeleine': {
        newCoordinates: [48.870137, 2.324562],
        source: 'Nominatim',
        confidence: 0.51
    },
    // Corrections pour les problèmes critiques identifiés
    'Square Marcel-Pagnol': {
        // À géocoder
        address: 'Square Marcel-Pagnol, 75008 Paris'
    },
    'Palais-Royal': {
        // À géocoder
        address: 'Place du Palais-Royal, 75001 Paris'
    },
    'Le Grand Véfour': {
        // À géocoder  
        address: '17 Rue de Beaujolais, 75001 Paris'
    }
};

class CoordinateFixer {
    constructor() {
        this.geocoder = new GeocodingService();
        this.dataDir = path.join(__dirname, 'data', 'arrondissements');
        this.backupDir = path.join(__dirname, 'data', 'backups');
        this.appliedFixes = [];
    }

    /**
     * Applique une correction à un lieu spécifique
     */
    async applyFixToPlace(place, fix) {
        let coordinates = fix.newCoordinates;
        let geocodingInfo = {
            source: fix.source || 'manual',
            confidence: fix.confidence || 1.0,
            corrected_at: new Date().toISOString()
        };

        // Si pas de coordonnées pré-calculées, géocoder maintenant
        if (!coordinates && fix.address) {
            console.log(`🔍 Géocodage de "${place.name}" à "${fix.address}"`);
            const result = await this.geocoder.geocode(place.name, fix.address);
            
            if (result) {
                coordinates = result.coordinates;
                geocodingInfo = {
                    source: result.source,
                    confidence: result.confidence,
                    corrected_at: new Date().toISOString()
                };
                console.log(`   ✅ Coordonnées trouvées: [${coordinates.join(', ')}]`);
            } else {
                console.log(`   ❌ Géocodage échoué`);
                return null;
            }
        }

        if (!coordinates) {
            return null;
        }

        const oldCoords = place.coordinates ? place.coordinates.slice() : null;
        
        return {
            ...place,
            coordinates: coordinates,
            geocoding: {
                ...geocodingInfo,
                old_coordinates: oldCoords
            }
        };
    }

    /**
     * Traite un fichier d'arrondissement
     */
    async processArrondissement(filePath) {
        console.log(`\n📍 Traitement: ${path.basename(filePath)}`);
        
        // Charger le fichier
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        let changesCount = 0;
        let processedPlaces = [];

        // Parcourir toutes les catégories et lieux
        for (const [categoryName, category] of Object.entries(data.arrondissement.categories)) {
            if (category.places) {
                for (let i = 0; i < category.places.length; i++) {
                    const place = category.places[i];
                    
                    // Vérifier si une correction est disponible
                    if (KNOWN_FIXES[place.name]) {
                        console.log(`🔧 Application correction pour: ${place.name}`);
                        
                        const fix = KNOWN_FIXES[place.name];
                        const correctedPlace = await this.applyFixToPlace(place, fix);
                        
                        if (correctedPlace) {
                            const oldCoords = place.coordinates ? `[${place.coordinates.join(', ')}]` : 'aucune';
                            const newCoords = `[${correctedPlace.coordinates.join(', ')}]`;
                            
                            console.log(`   ${oldCoords} → ${newCoords}`);
                            
                            category.places[i] = correctedPlace;
                            changesCount++;
                            
                            this.appliedFixes.push({
                                file: path.basename(filePath),
                                category: categoryName,
                                place: place.name,
                                oldCoordinates: place.coordinates,
                                newCoordinates: correctedPlace.coordinates,
                                source: correctedPlace.geocoding.source,
                                confidence: correctedPlace.geocoding.confidence
                            });
                        }
                        
                        // Pause pour le rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
        }

        if (changesCount > 0) {
            // Créer backup
            const fileName = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `${fileName}.backup-${timestamp}`);
            
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
            }
            
            fs.copyFileSync(filePath, backupPath);
            console.log(`💾 Backup: ${backupPath}`);
            
            // Sauvegarder le fichier corrigé
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`✅ ${changesCount} corrections appliquées à ${path.basename(filePath)}`);
        } else {
            console.log(`ℹ️  Aucune correction à appliquer`);
        }

        return changesCount;
    }

    /**
     * Applique toutes les corrections connues
     */
    async applyAllKnownFixes() {
        console.log('🚀 Application des corrections de coordonnées connues\n');
        
        const files = fs.readdirSync(this.dataDir)
            .filter(file => file.endsWith('.json'))
            .map(file => path.join(this.dataDir, file));
        
        console.log(`📁 ${files.length} fichiers d'arrondissements trouvés`);
        console.log(`🔧 ${Object.keys(KNOWN_FIXES).length} corrections disponibles`);
        
        let totalChanges = 0;
        
        for (const filePath of files) {
            const changes = await this.processArrondissement(filePath);
            totalChanges += changes;
        }
        
        // Générer le rapport
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                files_processed: files.length,
                corrections_applied: totalChanges,
                known_fixes_available: Object.keys(KNOWN_FIXES).length
            },
            applied_fixes: this.appliedFixes
        };
        
        const reportPath = path.join(__dirname, 'applied-fixes-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n🎉 Application des corrections terminée !');
        console.log(`📊 Résumé:`);
        console.log(`   • ${files.length} fichiers traités`);
        console.log(`   • ${totalChanges} corrections appliquées`);
        console.log(`   • ${Object.keys(KNOWN_FIXES).length} corrections disponibles`);
        console.log(`📄 Rapport: ${reportPath}`);
        
        return report;
    }

    /**
     * Affiche les corrections disponibles
     */
    showAvailableFixes() {
        console.log('🔧 CORRECTIONS DISPONIBLES:');
        console.log('='.repeat(50));
        
        for (const [placeName, fix] of Object.entries(KNOWN_FIXES)) {
            console.log(`\n📍 ${placeName}:`);
            if (fix.newCoordinates) {
                console.log(`   Coordonnées: [${fix.newCoordinates.join(', ')}]`);
                console.log(`   Source: ${fix.source || 'manuel'}`);
                console.log(`   Confiance: ${((fix.confidence || 1) * 100).toFixed(1)}%`);
                if (fix.address) {
                    console.log(`   Adresse: ${fix.address}`);
                }
            } else if (fix.address) {
                console.log(`   À géocoder: ${fix.address}`);
            }
        }
        
        console.log(`\n📊 Total: ${Object.keys(KNOWN_FIXES).length} corrections`);
    }
}

// Interface CLI
async function main() {
    const fixer = new CoordinateFixer();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'apply';
    
    try {
        switch (command) {
            case 'list':
            case 'show':
                fixer.showAvailableFixes();
                break;
                
            case 'apply':
            default:
                await fixer.applyAllKnownFixes();
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

module.exports = CoordinateFixer;