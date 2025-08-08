// Script pour simplifier les noms des catégories
const fs = require('fs');
const path = require('path');

const dataDir = '../data/arrondissements';
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

// Fonction pour simplifier le titre
function simplifyTitle(title) {
    return title
        .replace(/^[^\w\s]*\s*/, '') // Supprimer les emojis au début
        .replace(/&/g, 'et') // Remplacer & par et
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .trim();
}

console.log('🔧 Simplification des noms de catégories...');

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
                    const simplifiedTitle = simplifyTitle(originalTitle);
                    
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

console.log('🎉 Simplification terminée !');