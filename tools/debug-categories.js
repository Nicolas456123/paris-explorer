// Script pour déboguer les catégories
const fs = require('fs');
const path = require('path');

const dataDir = '../data/arrondissements';
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

console.log('🔍 Analyse des catégories...\n');

const allCategories = new Map();

files.forEach(filename => {
    const filePath = path.join(dataDir, filename);
    
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (data.arrondissement && data.arrondissement.categories) {
            Object.entries(data.arrondissement.categories).forEach(([catKey, catData]) => {
                const title = catData.title;
                
                if (!allCategories.has(title)) {
                    allCategories.set(title, []);
                }
                
                allCategories.get(title).push({
                    file: filename,
                    key: catKey,
                    title: title
                });
            });
        }
        
    } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${filename}:`, error.message);
    }
});

console.log(`📊 Total de titres uniques trouvés: ${allCategories.size}\n`);

// Afficher les catégories et leurs occurrences
Array.from(allCategories.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([title, occurrences]) => {
        console.log(`"${title}" (${occurrences.length} fois):`);
        occurrences.forEach(occ => {
            console.log(`  - ${occ.file} (clé: ${occ.key})`);
        });
        console.log('');
    });

console.log('🎯 Catégories qui apparaissent plusieurs fois:');
Array.from(allCategories.entries())
    .filter(([title, occurrences]) => occurrences.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([title, occurrences]) => {
        console.log(`  "${title}": ${occurrences.length} fois`);
    });