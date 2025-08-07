#!/usr/bin/env node

/**
 * Script rapide pour tester et corriger quelques lieux problématiques
 */

const GeocodingService = require('./geocoding-service.js');

async function testGeocodingService() {
    console.log('🚀 Test du service de géocodage\n');
    
    const geocoder = new GeocodingService();
    
    // Lieux problématiques identifiés
    const testPlaces = [
        {
            name: 'Tour Eiffel',
            address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris',
            expectedZone: 'ouest'
        },
        {
            name: 'Musée du Louvre',
            address: 'Rue de Rivoli, 75001 Paris',
            expectedZone: 'centre'
        },
        {
            name: 'Église de la Madeleine',
            address: 'Place de la Madeleine, 75008 Paris',
            expectedZone: 'centre-ouest'
        },
        {
            name: 'Sacré-Cœur',
            address: '35 Rue du Chevalier de la Barre, 75018 Paris',
            expectedZone: 'nord'
        },
        {
            name: 'Square Marcel-Pagnol',
            address: 'Square Marcel-Pagnol, 75008 Paris',
            expectedZone: 'centre-ouest'
        }
    ];
    
    console.log(`📍 Test de ${testPlaces.length} lieux...\n`);
    
    const results = [];
    
    for (const place of testPlaces) {
        console.log(`🔍 Géocodage: ${place.name}`);
        console.log(`   Adresse: ${place.address}`);
        
        try {
            const result = await geocoder.geocode(place.name, place.address);
            
            if (result) {
                const [lat, lng] = result.coordinates;
                console.log(`   ✅ Trouvé: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
                console.log(`   📊 Source: ${result.source}, Confiance: ${(result.confidence * 100).toFixed(1)}%`);
                console.log(`   🗺️  Type: ${result.type}`);
                
                results.push({
                    ...place,
                    coordinates: result.coordinates,
                    source: result.source,
                    confidence: result.confidence,
                    success: true
                });
            } else {
                console.log(`   ❌ Échec du géocodage`);
                results.push({
                    ...place,
                    success: false
                });
            }
            
        } catch (error) {
            console.log(`   💥 Erreur: ${error.message}`);
            results.push({
                ...place,
                error: error.message,
                success: false
            });
        }
        
        console.log('');
        
        // Pause pour respecter les rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Résumé
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(50));
    console.log(`Total testé: ${results.length}`);
    console.log(`Succès: ${successful.length} (${Math.round(successful.length/results.length*100)}%)`);
    console.log(`Échecs: ${failed.length}`);
    
    if (successful.length > 0) {
        const avgConfidence = successful.reduce((sum, r) => sum + (r.confidence || 0), 0) / successful.length;
        console.log(`Confiance moyenne: ${(avgConfidence * 100).toFixed(1)}%`);
    }
    
    console.log('\n🏛️  COORDONNÉES TROUVÉES:');
    console.log('-'.repeat(50));
    
    successful.forEach(place => {
        const [lat, lng] = place.coordinates;
        console.log(`${place.name}:`);
        console.log(`   Coordonnées: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
        console.log(`   Maps: https://www.google.com/maps?q=${lat},${lng}`);
        console.log('');
    });
    
    if (failed.length > 0) {
        console.log('❌ ÉCHECS:');
        console.log('-'.repeat(50));
        failed.forEach(place => {
            console.log(`• ${place.name}: ${place.error || 'Aucune coordonnée trouvée'}`);
        });
    }
    
    return results;
}

// Exécuter le test
if (require.main === module) {
    testGeocodingService()
        .then(results => {
            console.log('\n🎉 Test terminé !');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erreur:', error);
            process.exit(1);
        });
}

module.exports = testGeocodingService;