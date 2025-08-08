#!/usr/bin/env node

/**
 * Script pour supprimer toutes les références aux tags dans les fichiers JavaScript
 */

const fs = require('fs');
const path = require('path');

class JSTagRemover {
    constructor() {
        this.jsDir = path.join(__dirname, '..', 'assets', 'js');
        this.backupDir = path.join(__dirname, '..', 'tools', 'js-backups');
        this.processedFiles = 0;
        this.totalChanges = 0;
    }

    /**
     * Créer un backup d'un fichier
     */
    createBackup(filePath) {
        const fileName = path.basename(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `${fileName}.backup-${timestamp}`);
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        fs.copyFileSync(filePath, backupPath);
        console.log(`💾 Backup: ${backupPath}`);
        return backupPath;
    }

    /**
     * Nettoyer le code JavaScript des références aux tags
     */
    cleanJavaScriptCode(content) {
        let cleanedContent = content;
        let changes = 0;

        // Patterns de nettoyage pour les tags
        const patterns = [
            // Références directes aux tags
            {
                pattern: /,\s*tags:\s*place\.tags\s*\|\|\s*\[\]/g,
                replacement: '',
                description: 'tags: place.tags || []'
            },
            {
                pattern: /tags:\s*\[\]/g,
                replacement: '',
                description: 'tags: []'
            },
            // Conditions sur les tags
            {
                pattern: /if\s*\(\s*place\.tags\s*&&\s*Array\.isArray\s*\(\s*place\.tags\s*\)\s*\)\s*\{[^}]*\}/g,
                replacement: '',
                description: 'if (place.tags && Array.isArray(place.tags)) { ... }'
            },
            {
                pattern: /if\s*\(\s*place\.tags\s*&&\s*place\.tags\.length\s*>\s*0\s*\)[^}]*\}/g,
                replacement: '',
                description: 'if (place.tags && place.tags.length > 0) { ... }'
            },
            {
                pattern: /if\s*\(\s*data\.place\.tags\s*\)\s*\{[^}]*\}/g,
                replacement: '',
                description: 'if (data.place.tags) { ... }'
            },
            // Boucles forEach sur les tags
            {
                pattern: /place\.tags\.forEach\s*\(\s*tag\s*=>\s*\{[^}]*\}\s*\);?/g,
                replacement: '',
                description: 'place.tags.forEach(tag => { ... });'
            },
            {
                pattern: /data\.place\.tags\.forEach\s*\(\s*tag\s*=>\s*\{[^}]*\}\s*\);?/g,
                replacement: '',
                description: 'data.place.tags.forEach(tag => { ... });'
            },
            // Génération HTML de tags
            {
                pattern: /\$\{place\.tags\s*&&\s*place\.tags\.length\s*>\s*0\s*\?\s*`[^`]*`\s*:\s*''\}/g,
                replacement: "''",
                description: '${place.tags && place.tags.length > 0 ? `...` : ""}'
            },
            {
                pattern: /place\.tags\.slice\s*\(\s*\d+,\s*\d+\s*\)\.map\s*\(\s*tag\s*=>\s*`[^`]*`\s*\)\.join\s*\(\s*'[^']*'\s*\)/g,
                replacement: "''",
                description: 'place.tags.slice(...).map(...).join(...)'
            },
            {
                pattern: /place\.tags\.map\s*\(\s*tag\s*=>\s*`[^`]*`\s*\)\.join\s*\(\s*'[^']*'\s*\)/g,
                replacement: "''",
                description: 'place.tags.map(...).join(...)'
            },
            // Variables liées aux tags
            {
                pattern: /const\s+tagsHtml\s*=[^;]*;/g,
                replacement: "const tagsHtml = '';",
                description: 'const tagsHtml = ...;'
            },
            {
                pattern: /const\s+placeTags\s*=[^;]*;/g,
                replacement: '',
                description: 'const placeTags = ...;'
            },
            // Recherche dans les tags
            {
                pattern: /\(\s*place\.tags\s*&&\s*place\.tags\.some\s*\([^)]*\)\s*\)/g,
                replacement: 'false',
                description: '(place.tags && place.tags.some(...))'
            },
            // Compteurs de tags
            {
                pattern: /if\s*\(\s*place\.tags\s*&&\s*place\.tags\.length\s*>\s*0\s*\)\s*placesWithTags\+\+;?/g,
                replacement: '',
                description: 'if (place.tags && place.tags.length > 0) placesWithTags++;'
            },
            // Console.log avec tags
            {
                pattern: /console\.log\s*\(\s*`🏷️[^`]*`[^)]*\);?/g,
                replacement: '',
                description: 'console.log avec tags'
            },
            // Nettoyage des virgules en trop
            {
                pattern: /,\s*,/g,
                replacement: ',',
                description: 'virgules en trop'
            },
            // Nettoyage des lignes vides en trop
            {
                pattern: /\n\s*\n\s*\n/g,
                replacement: '\n\n',
                description: 'lignes vides en trop'
            }
        ];

        patterns.forEach(({pattern, replacement, description}) => {
            const matches = cleanedContent.match(pattern);
            if (matches) {
                console.log(`  🔧 Suppression: ${description} (${matches.length} occurrences)`);
                cleanedContent = cleanedContent.replace(pattern, replacement);
                changes += matches.length;
            }
        });

        return { content: cleanedContent, changes };
    }

    /**
     * Traiter un fichier JavaScript
     */
    processFile(filePath) {
        console.log(`\n📝 Traitement: ${path.basename(filePath)}`);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Créer un backup
            this.createBackup(filePath);
            
            // Nettoyer le contenu
            const { content: cleanedContent, changes } = this.cleanJavaScriptCode(content);
            
            if (changes > 0) {
                // Sauvegarder le fichier nettoyé
                fs.writeFileSync(filePath, cleanedContent, 'utf8');
                console.log(`✅ ${changes} modifications appliquées`);
                this.totalChanges += changes;
            } else {
                console.log(`ℹ️  Aucune référence aux tags trouvée`);
            }
            
            this.processedFiles++;
            
        } catch (error) {
            console.error(`❌ Erreur traitement ${filePath}:`, error.message);
        }
    }

    /**
     * Traiter tous les fichiers JavaScript
     */
    processAllFiles() {
        console.log('🚀 Suppression des références aux tags dans les fichiers JavaScript\n');
        
        if (!fs.existsSync(this.jsDir)) {
            console.error(`❌ Dossier non trouvé: ${this.jsDir}`);
            return;
        }
        
        const files = fs.readdirSync(this.jsDir)
            .filter(file => file.endsWith('.js'))
            .map(file => path.join(this.jsDir, file))
            .sort();
        
        console.log(`📁 ${files.length} fichiers JavaScript trouvés`);
        
        for (const filePath of files) {
            this.processFile(filePath);
        }
        
        console.log('\n🎉 SUPPRESSION TERMINÉE !');
        console.log(`📊 Résumé:`);
        console.log(`   • ${this.processedFiles} fichiers traités`);
        console.log(`   • ${this.totalChanges} modifications appliquées`);
        console.log(`   • Backups créés dans: ${this.backupDir}`);
    }
}

// Interface CLI
async function main() {
    const remover = new JSTagRemover();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'run';
    
    try {
        switch (command) {
            case 'run':
            default:
                remover.processAllFiles();
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

module.exports = JSTagRemover;