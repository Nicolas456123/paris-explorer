// Script de validation automatique des coordonnées
// Usage: node validate-coordinates.js

const fs = require('fs');
const path = require('path');
const https = require('https');

class CoordinateValidator {
    constructor() {
        this.arrondissementsDir = './data/arrondissements';
        this.results = [];
        this.stats = {
            total: 0,
            valid: 0,
            invalid: 0,
            missing: 0,
            corrected: 0
        };
    }

    // Valider les limites de Paris
    isInParis(lat, lng) {
        return lat >= 48.815 && lat <= 48.902 && lng >= 2.224 && lng <= 2.469;
    }

    // Calculer la distance entre deux points
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Rayon de la Terre en mètres
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Rechercher avec Nominatim
    async searchNominatim(placeName, address = '') {
        return new Promise((resolve, reject) => {
            const query = encodeURIComponent(`${placeName}, ${address || 'Paris, France'}`);
            const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=3&countrycodes=fr`;
            
            https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const results = JSON.parse(data);
                        resolve(results);
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });
    }

    // Valider un lieu
    async validatePlace(place, arrKey, catKey) {
        this.stats.total++;
        
        const result = {
            arrondissement: arrKey,
            category: catKey,
            name: place.name,
            address: place.address || '',
            currentCoords: place.coordinates || null,
            status: 'unknown',
            issues: [],
            suggestedCoords: null,
            confidence: 0
        };

        // Vérifier si les coordonnées existent
        if (!place.coordinates || !Array.isArray(place.coordinates) || place.coordinates.length < 2) {
            result.status = 'missing';
            result.issues.push('Coordonnées manquantes');
            this.stats.missing++;
        } else {
            const lat = parseFloat(place.coordinates[0]);
            const lng = parseFloat(place.coordinates[1]);

            if (isNaN(lat) || isNaN(lng)) {
                result.status = 'invalid';
                result.issues.push('Coordonnées non numériques');
                this.stats.invalid++;
            } else if (!this.isInParis(lat, lng)) {
                result.status = 'invalid';
                result.issues.push('Coordonnées hors de Paris');
                this.stats.invalid++;
            } else {
                result.status = 'valid';
                this.stats.valid++;
            }
        }

        // Rechercher avec Nominatim pour validation/correction
        try {
            const searchResults = await this.searchNominatim(place.name, place.address);
            
            if (searchResults && searchResults.length > 0) {
                const best = searchResults[0];
                const apiLat = parseFloat(best.lat);
                const apiLng = parseFloat(best.lon);

                if (this.isInParis(apiLat, apiLng)) {
                    result.suggestedCoords = [apiLat, apiLng];
                    result.confidence = parseFloat(best.importance || 0.5);

                    // Si on a des coordonnées actuelles, calculer la distance
                    if (result.currentCoords && result.status === 'valid') {
                        const distance = this.calculateDistance(
                            result.currentCoords[0], result.currentCoords[1],
                            apiLat, apiLng
                        );

                        if (distance > 500) { // Plus de 500m de différence
                            result.status = 'suspicious';
                            result.issues.push(`Distance de ${Math.round(distance)}m avec Nominatim`);
                        }
                    }

                    // Si coordonnées manquantes/invalides, suggérer les coordonnées API
                    if (result.status === 'missing' || result.status === 'invalid') {
                        result.status = 'correctable';
                        result.issues.push('Coordonnées corrigées via Nominatim');
                    }
                }
            }

            // Pause pour respecter la limite de l'API
            await this.sleep(1000);

        } catch (error) {
            console.warn(`Erreur API pour ${place.name}:`, error.message);
        }

        return result;
    }

    // Traiter un fichier d'arrondissement
    async processArrondissement(filename) {
        const filepath = path.join(this.arrondissementsDir, filename);
        
        try {
            const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            const arrData = data.arrondissement;
            
            if (!arrData || !arrData.categories) {
                console.warn(`Structure invalide dans ${filename}`);
                return;
            }

            const arrKey = arrData.id || filename.replace('.json', '');
            console.log(`\n📍 Traitement de ${arrKey}...`);

            for (const [catKey, catData] of Object.entries(arrData.categories)) {
                if (!catData.places) continue;

                for (const place of catData.places) {
                    const result = await this.validatePlace(place, arrKey, catKey);
                    this.results.push(result);
                    
                    // Afficher les problèmes en temps réel
                    if (result.status !== 'valid') {
                        console.log(`  ⚠️  ${place.name}: ${result.status} - ${result.issues.join(', ')}`);
                    }
                }
            }

        } catch (error) {
            console.error(`Erreur lecture ${filename}:`, error.message);
        }
    }

    // Traiter tous les arrondissements
    async validateAll() {
        console.log('🔍 Début de la validation des coordonnées...\n');
        
        const files = fs.readdirSync(this.arrondissementsDir)
            .filter(file => file.endsWith('.json'))
            .sort();

        for (const file of files) {
            await this.processArrondissement(file);
        }

        this.generateReport();
    }

    // Générer le rapport
    generateReport() {
        console.log('\n📊 RAPPORT DE VALIDATION');
        console.log('========================');
        console.log(`Total des lieux: ${this.stats.total}`);
        console.log(`✅ Coordonnées valides: ${this.stats.valid} (${Math.round(this.stats.valid/this.stats.total*100)}%)`);
        console.log(`❌ Coordonnées invalides: ${this.stats.invalid} (${Math.round(this.stats.invalid/this.stats.total*100)}%)`);
        console.log(`❓ Coordonnées manquantes: ${this.stats.missing} (${Math.round(this.stats.missing/this.stats.total*100)}%)`);
        
        const suspicious = this.results.filter(r => r.status === 'suspicious').length;
        const correctable = this.results.filter(r => r.status === 'correctable').length;
        
        console.log(`⚠️  Coordonnées suspectes: ${suspicious}`);
        console.log(`🔧 Coordonnées corrigeables: ${correctable}`);

        // Grouper par arrondissement
        const byArr = {};
        this.results.forEach(r => {
            if (!byArr[r.arrondissement]) byArr[r.arrondissement] = [];
            byArr[r.arrondissement].push(r);
        });

        console.log('\n📍 DÉTAILS PAR ARRONDISSEMENT');
        console.log('==============================');
        
        Object.entries(byArr).forEach(([arr, results]) => {
            const total = results.length;
            const problems = results.filter(r => r.status !== 'valid').length;
            if (problems > 0) {
                console.log(`\n${arr}: ${problems}/${total} problèmes`);
                
                results.filter(r => r.status !== 'valid').forEach(r => {
                    console.log(`  - ${r.name}: ${r.status}`);
                    if (r.suggestedCoords) {
                        console.log(`    Suggéré: [${r.suggestedCoords[0]}, ${r.suggestedCoords[1]}]`);
                    }
                });
            }
        });

        // Sauvegarder le rapport détaillé
        const reportData = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            summary: {
                suspicious: this.results.filter(r => r.status === 'suspicious'),
                correctable: this.results.filter(r => r.status === 'correctable'),
                invalid: this.results.filter(r => r.status === 'invalid'),
                missing: this.results.filter(r => r.status === 'missing')
            },
            allResults: this.results
        };

        fs.writeFileSync('coordinate-validation-report.json', JSON.stringify(reportData, null, 2));
        console.log('\n💾 Rapport détaillé sauvé: coordinate-validation-report.json');

        // Générer script de correction
        this.generateCorrectionScript();
    }

    // Générer script de correction automatique
    generateCorrectionScript() {
        const corrections = this.results.filter(r => 
            r.suggestedCoords && 
            (r.status === 'correctable' || r.status === 'suspicious') &&
            r.confidence > 0.3
        );

        if (corrections.length === 0) {
            console.log('Aucune correction automatique possible.');
            return;
        }

        let script = '// Script de correction automatique des coordonnées\n';
        script += '// ATTENTION: Vérifiez manuellement avant d\'appliquer\n\n';
        
        const byFile = {};
        corrections.forEach(correction => {
            const filename = `${correction.arrondissement.replace('ème', 'eme').toLowerCase()}.json`;
            if (!byFile[filename]) byFile[filename] = [];
            byFile[filename].push(correction);
        });

        Object.entries(byFile).forEach(([filename, fileCorrections]) => {
            script += `// === ${filename} ===\n`;
            fileCorrections.forEach(c => {
                script += `// ${c.name}: [${c.currentCoords}] -> [${c.suggestedCoords}]\n`;
            });
            script += '\n';
        });

        fs.writeFileSync('coordinate-corrections.js', script);
        console.log(`💾 Script de correction généré: coordinate-corrections.js (${corrections.length} corrections)`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exécution du script
if (require.main === module) {
    const validator = new CoordinateValidator();
    validator.validateAll().catch(console.error);
}

module.exports = CoordinateValidator;