// Script pour simplifier les noms des catégories à un seul mot
const fs = require('fs');
const path = require('path');

const dataDir = '../data/arrondissements';
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

// Mapping des catégories vers des mots uniques
const categoryMapping = {
    // Monuments et patrimoine
    'Monuments et Sites Historiques': 'Monuments',
    'Monuments Emblématiques': 'Monuments',
    'Monuments Historiques et Universitaires': 'Monuments',
    'Monuments et Institutions': 'Monuments',
    'Monuments Iconiques': 'Monuments',
    'Monuments Prestigieux': 'Monuments',
    'Sites Historiques et Révolutionnaires': 'Monuments',
    'Patrimoine et Architecture': 'Monuments',
    'Architecture et Monuments': 'Monuments',
    'Architecture Moderne et Bibliothèques': 'Architecture',
    'Architecture Contemporaine': 'Architecture',
    'Architecture Remarquable': 'Architecture',
    
    // Restaurants et gastronomie
    'Restaurants et Gastronomie': 'Restaurants',
    'Restaurants et Spécialités': 'Restaurants',
    'Restaurants et Cafés Emblématiques': 'Restaurants',
    'Restaurants et Brasseries Historiques': 'Restaurants',
    'Restaurants Gastronomiques': 'Restaurants',
    'Restaurants et Brasseries Mythiques': 'Restaurants',
    'Restaurants et Bistrots': 'Restaurants',
    'Restaurants et Cafés Cultes': 'Restaurants',
    'Gastronomie de Pointe': 'Restaurants',
    'Restaurants et Marchés Pittoresques': 'Restaurants',
    'Restaurants Asiatiques Authentiques': 'Restaurants',
    'Restaurants et Crêperies': 'Restaurants',
    'Restaurants et Bistronomie': 'Restaurants',
    'Restaurants Gastronomiques et Palaces': 'Restaurants',
    'Restaurants et Marchés Bio': 'Restaurants',
    'Restaurants Historiques et Guinguettes': 'Restaurants',
    'Restaurants et Guinguettes Authentiques': 'Restaurants',
    'Restaurants Populaires et Authentiques': 'Restaurants',
    'Gastronomie et Marchés': 'Restaurants',
    
    // Shopping
    'Shopping et Marchés': 'Shopping',
    'Shopping Spécialisé': 'Shopping',
    'Shopping et Créateurs': 'Shopping',
    'Shopping et Artisanat': 'Shopping',
    'Shopping Haute Couture et Librairies': 'Shopping',
    'Shopping Luxe et Épiceries Fines': 'Shopping',
    'Shopping Avenue Prestigieuse': 'Shopping',
    'Grands Magasins Historiques': 'Shopping',
    'Shopping Créatif et Vintage': 'Shopping',
    'Shopping Vintage et Créateurs': 'Shopping',
    'Shopping et Architecture Moderne': 'Shopping',
    'Shopping Luxe et Quartiers Chic': 'Shopping',
    'Shopping Village et Créateurs': 'Shopping',
    'Shopping et Marchés Authentiques': 'Shopping',
    'Marchés et Commerces Populaires': 'Shopping',
    
    // Culture et spectacles
    'Culture et Spectacles': 'Culture',
    'Culture et Arts': 'Culture',
    'Culture Alternative': 'Culture',
    'Culture et Arts Vivants': 'Culture',
    'Arts et Culture': 'Culture',
    'Culture et Cinéma': 'Culture',
    'Culture et Théâtre': 'Culture',
    'Culture Alternative et Associative': 'Culture',
    'Temples du Spectacle': 'Spectacles',
    'Théâtres et Spectacles': 'Spectacles',
    'Théâtres et Culture': 'Spectacles',
    'Spectacles et Événements': 'Spectacles',
    'Spectacles et Cabarets Alternatifs': 'Spectacles',
    'Divertissements et Spectacles': 'Spectacles',
    
    // Musées
    'Musées et Culture': 'Musées',
    'Musées Spécialisés': 'Musées',
    'Musées d\'Excellence Mondiale': 'Musées',
    'Musées Confidentiels': 'Musées',
    'Musées et Lieux Artistiques': 'Musées',
    'Musées Classe Mondiale': 'Musées',
    'Musées et Patrimoine Artistique': 'Musées',
    
    // Parcs et espaces verts
    'Espaces Verts et Lieux Secrets': 'Parcs',
    'Parcs et Espaces Secrets': 'Parcs',
    'Espaces Verts et Jardins': 'Parcs',
    'Jardins du Luxembourg - 25 hectares': 'Parcs',
    'Parcs et Promenades': 'Parcs',
    'Jardins et Espaces Verts': 'Parcs',
    'Jardins et Squares Secrets': 'Parcs',
    'Espaces Verts et Loisirs': 'Parcs',
    'Espaces Verts Exceptionnels': 'Parcs',
    'Espaces Verts et Lieux Insolites': 'Parcs',
    'Parcs et Jardins Secrets': 'Parcs',
    'Parcs d\'Exception et Innovation': 'Parcs',
    'Parcs et Jardins Prestigieux': 'Parcs',
    'Parcs et Jardins Remarquables': 'Parcs',
    'Parcs Exceptionnels et Romantiques': 'Parcs',
    'Panoramas et Espaces Verts': 'Parcs',
    'Jardins Secrets': 'Jardins',
    'Jardins Secrets et Jardins Cachés': 'Jardins',
    'Jardins Secrets du Marais': 'Jardins',
    'Jardins Secrets et Maisons d\'Écrivains': 'Jardins',
    'Jardins Secrets et Méconnus': 'Jardins',
    'Jardins Partagés et Écologie Urbaine': 'Jardins',
    'Espaces Verts Secrets': 'Jardins',
    
    // Vie nocturne et bars
    'Bars Secrets et Speakeasy': 'Bars',
    'Bars Gay-Friendly et Vie Nocturne': 'Bars',
    'Vie Nocturne Légendaire': 'Bars',
    'Bars et Vie Nocturne': 'Bars',
    'Vie Nocturne': 'Bars',
    'Bars et Vie Nocturne Familiale': 'Bars',
    'Vie Nocturne et Bars Secrets': 'Bars',
    'Vie Nocturne Underground et Alternative': 'Bars',
    'Vie Nocturne Alternative': 'Bars',
    
    // Cafés
    'Cafés Historiques et Philosophiques': 'Cafés',
    'Cafés Historiques "Montparnos" - Années Folles': 'Cafés',
    
    // Cinémas
    'Cinémas d\'Art et Essai': 'Cinémas',
    'Cinémas Historiques': 'Cinémas',
    
    // Librairies
    'Librairies et Culture Littéraire': 'Librairies',
    
    // Art urbain
    'Street Art et Art Urbain': 'StreetArt',
    
    // Sports
    'Sports et Loisirs Aquatiques': 'Sports',
    'Sports et Événements Internationaux': 'Sports',
    
    // Spécialisés - garder des noms descriptifs courts
    'Patrimoine Juif et Mémoire': 'PatrimoineJuif',
    'Île Saint-Louis - Village sur Seine': 'IleSaintLouis',
    'Canal et Promenades Romantiques': 'Canal',
    'Chinatown Authentique - Triangle de Choisy': 'Chinatown',
    'Cimetière du Père Lachaise - Nécropole Mondiale': 'PèreLachaise',
    'Belleville - Street Art et Diversité Culturelle': 'Belleville',
    'Quartiers Multiculturels Authentiques': 'Multiculturel',
    'Quartiers Secrets et Villages Urbains': 'Quartiers',
    'Montmartre Mythique et Bohème': 'Montmartre',
    'Montmartre Secret et Romantique': 'Montmartre',
    'Barbès - Quartier Multiculturel Authentique': 'Barbès',
    'Patrimoine Fluvial': 'Fluvial',
    'Patrimoine Industriel et Historique': 'Industriel',
    'Institutions Culturelles Majeures': 'Institutions',
    'Palais et Institutions': 'Palais',
    'Lieux Insolites et Secrets': 'Secrets',
    'Lieux Secrets et Insolites': 'Secrets'
};

console.log('🔧 Simplification des noms vers des mots uniques...');

files.forEach(filename => {
    const filePath = path.join(dataDir, filename);
    console.log(`📄 Traitement de ${filename}...`);
    
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (data.arrondissement && data.arrondissement.categories) {
            let modified = false;
            
            Object.keys(data.arrondissement.categories).forEach(catKey => {
                const category = data.arrondissement.categories[catKey];
                if (category.title) {
                    const originalTitle = category.title;
                    const simplifiedTitle = categoryMapping[originalTitle] || originalTitle;
                    
                    if (originalTitle !== simplifiedTitle) {
                        category.title = simplifiedTitle;
                        console.log(`  ✏️  "${originalTitle}" → "${simplifiedTitle}"`);
                        modified = true;
                    }
                }
            });
            
            if (modified) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`  ✅ ${filename} mis à jour`);
            } else {
                console.log(`  ⏭️  ${filename} - aucun changement`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${filename}:`, error.message);
    }
});

console.log('🎉 Simplification vers mots uniques terminée !');