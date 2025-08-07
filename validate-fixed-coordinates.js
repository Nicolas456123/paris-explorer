#!/usr/bin/env node

/**
 * Validation des coordonnées corrigées
 * Vérifie que les nouvelles coordonnées sont plus précises et cohérentes
 */

const fs = require('fs');
const path = require('path');

class CoordinateValidator {
    constructor() {
        this.reportPath = path.join(__dirname, 'applied-fixes-report.json');
        this.parisBounds = {
            north: 48.902,
            south: 48.815,
            east: 2.469,
            west: 2.224
        };
    }

    /**
     * Vérifie si des coordonnées sont dans Paris
     */
    isInParis(lat, lng) {
        return lat >= this.parisBounds.south && 
               lat <= this.parisBounds.north && 
               lng >= this.parisBounds.west && 
               lng <= this.parisBounds.east;
    }

    /**
     * Calcule la distance entre deux points GPS (en mètres)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Rayon de la Terre en mètres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    /**
     * Détermine l'arrondissement approximatif selon les coordonnées
     */
    getApproximateArrondissement(lat, lng) {
        // Centres approximatifs des arrondissements
        const arrondissementCenters = {
            '1er': [48.8607, 2.3358],
            '7ème': [48.8566, 2.3098],
            '8ème': [48.8738, 2.3095],
            '17ème': [48.8838, 2.3128]
        };

        let closest = null;
        let minDistance = Infinity;

        for (const [arr, [centerLat, centerLng]] of Object.entries(arrondissementCenters)) {
            const distance = this.calculateDistance(lat, lng, centerLat, centerLng);
            if (distance < minDistance) {
                minDistance = distance;
                closest = arr;
            }
        }

        return { arrondissement: closest, distance: Math.round(minDistance) };
    }

    /**
     * Valide une correction individuelle
     */
    validateFix(fix) {
        const validation = {
            place: fix.place,
            file: fix.file,
            valid: true,
            issues: [],
            improvements: [],
            confidence: fix.confidence
        };

        const [newLat, newLng] = fix.newCoordinates;
        const oldCoords = fix.oldCoordinates;

        // 1. Vérifier que c'est dans Paris
        if (!this.isInParis(newLat, newLng)) {
            validation.valid = false;
            validation.issues.push('❌ Coordonnées hors de Paris');
        } else {
            validation.improvements.push('✅ Coordonnées dans Paris');
        }

        // 2. Calculer le déplacement
        if (oldCoords) {
            const [oldLat, oldLng] = oldCoords;
            const distance = this.calculateDistance(oldLat, oldLng, newLat, newLng);
            validation.displacement = Math.round(distance);

            if (distance > 2000) {
                validation.issues.push(`⚠️ Grande distance de correction: ${Math.round(distance)}m`);
            } else if (distance > 100) {
                validation.improvements.push(`📏 Correction significative: ${Math.round(distance)}m`);
            } else {
                validation.improvements.push(`🔧 Correction mineure: ${Math.round(distance)}m`);
            }
        }

        // 3. Précision des coordonnées
        const precision = Math.max(
            newLat.toString().split('.')[1]?.length || 0,
            newLng.toString().split('.')[1]?.length || 0
        );

        if (precision >= 6) {
            validation.improvements.push('🎯 Haute précision (6+ décimales)');
        } else if (precision >= 4) {
            validation.improvements.push('📍 Précision correcte (4+ décimales)');
        } else {
            validation.issues.push('⚠️ Précision faible (<4 décimales)');
        }

        // 4. Cohérence géographique
        const location = this.getApproximateArrondissement(newLat, newLng);
        const expectedArr = fix.file.match(/(\d+)/)?.[1];
        
        if (expectedArr) {
            const expectedArrFormatted = expectedArr === '1' ? '1er' : expectedArr + 'ème';
            if (location.arrondissement === expectedArrFormatted) {
                validation.improvements.push(`🏛️ Cohérent avec ${expectedArrFormatted} arrondissement`);
            } else {
                validation.issues.push(`📍 Incohérent: dans ${location.arrondissement}, attendu ${expectedArrFormatted}`);
            }
        }

        // 5. Confiance du géocodage
        if (fix.confidence >= 0.7) {
            validation.improvements.push(`🌟 Haute confiance (${(fix.confidence * 100).toFixed(0)}%)`);
        } else if (fix.confidence >= 0.4) {
            validation.improvements.push(`👍 Confiance correcte (${(fix.confidence * 100).toFixed(0)}%)`);
        } else {
            validation.issues.push(`⚠️ Faible confiance (${(fix.confidence * 100).toFixed(0)}%)`);
        }

        return validation;
    }

    /**
     * Génère des liens de vérification
     */
    generateVerificationLinks(fix) {
        const [lat, lng] = fix.newCoordinates;
        return {
            googleMaps: `https://www.google.com/maps?q=${lat},${lng}`,
            openStreetMap: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=17`,
            coordinates: `[${lat.toFixed(6)}, ${lng.toFixed(6)}]`
        };
    }

    /**
     * Valide toutes les corrections
     */
    validateAllFixes() {
        console.log('🔍 Validation des coordonnées corrigées\n');

        if (!fs.existsSync(this.reportPath)) {
            console.error(`❌ Rapport non trouvé: ${this.reportPath}`);
            return;
        }

        const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
        const fixes = report.applied_fixes;

        console.log(`📊 ${fixes.length} corrections à valider\n`);

        const validations = [];
        let validCount = 0;
        let issuesCount = 0;

        for (const fix of fixes) {
            const validation = this.validateFix(fix);
            validations.push(validation);

            console.log(`📍 ${validation.place} (${validation.file})`);
            console.log(`   Source: ${fix.source}, Confiance: ${(fix.confidence * 100).toFixed(0)}%`);
            
            const links = this.generateVerificationLinks(fix);
            console.log(`   Coordonnées: ${links.coordinates}`);
            
            if (validation.displacement) {
                console.log(`   Déplacement: ${validation.displacement}m`);
            }

            // Afficher les améliorations
            validation.improvements.forEach(improvement => {
                console.log(`   ${improvement}`);
            });

            // Afficher les problèmes
            validation.issues.forEach(issue => {
                console.log(`   ${issue}`);
                issuesCount++;
            });

            console.log(`   🗺️  Vérifier: ${links.googleMaps}`);
            console.log('');

            if (validation.valid) {
                validCount++;
            }
        }

        // Résumé final
        console.log('📊 RÉSUMÉ DE VALIDATION');
        console.log('='.repeat(50));
        console.log(`Total validé: ${fixes.length}`);
        console.log(`Corrections valides: ${validCount} (${Math.round(validCount/fixes.length*100)}%)`);
        console.log(`Corrections avec problèmes: ${fixes.length - validCount}`);
        console.log(`Total des problèmes détectés: ${issuesCount}`);

        const avgConfidence = fixes.reduce((sum, fix) => sum + fix.confidence, 0) / fixes.length;
        console.log(`Confiance moyenne: ${(avgConfidence * 100).toFixed(1)}%`);

        const avgDisplacement = validations
            .filter(v => v.displacement)
            .reduce((sum, v) => sum + v.displacement, 0) / validations.filter(v => v.displacement).length;
        console.log(`Déplacement moyen: ${Math.round(avgDisplacement)}m`);

        // Sauvegarder le rapport de validation
        const validationReport = {
            timestamp: new Date().toISOString(),
            summary: {
                total_fixes: fixes.length,
                valid_fixes: validCount,
                issues_count: issuesCount,
                average_confidence: avgConfidence,
                average_displacement: avgDisplacement || 0
            },
            validations: validations
        };

        const validationReportPath = path.join(__dirname, 'validation-report.json');
        fs.writeFileSync(validationReportPath, JSON.stringify(validationReport, null, 2));
        console.log(`\n📄 Rapport de validation sauvegardé: ${validationReportPath}`);

        // Recommandations
        console.log('\n💡 RECOMMANDATIONS:');
        console.log('-'.repeat(30));

        if (validCount === fixes.length) {
            console.log('🎉 Toutes les corrections sont valides !');
            console.log('👍 Vous pouvez utiliser ces coordonnées en confiance.');
        } else {
            console.log('⚠️  Quelques corrections nécessitent une vérification manuelle.');
            console.log('🔍 Consultez les liens Google Maps pour valider visuellement.');
        }

        if (avgConfidence < 0.5) {
            console.log('📍 Confiance moyenne faible - considérez un géocodage avec plus de sources.');
        }

        console.log('🌐 Testez l\'application pour vérifier le rendu visuel sur la carte.');

        return validationReport;
    }
}

// CLI Usage
async function main() {
    const validator = new CoordinateValidator();
    
    try {
        const result = validator.validateAllFixes();
        console.log('\n✅ Validation terminée');
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    main();
}

module.exports = CoordinateValidator;