#!/usr/bin/env node

/**
 * Script pour supprimer toutes les propriétés "tags" des fichiers JSON d'arrondissements
 */

const fs = require('fs');
const path = require('path');

class TagRemover {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data', 'arrondissements');
        this.backupDir = path.join(__dirname, '..', 'data', 'backups');
        this.processedFiles = 0;
        this.totalTagsRemoved = 0;
    }

    /**
     * Créer un backup d'un fichier
     */
    createBackup(filePath) {
        const fileName = path.basename(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `${fileName}.backup-tags-removal-${timestamp}`);
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        fs.copyFileSync(filePath, backupPath);
        console.log(`💾 Backup créé: ${backupPath}`);
        return backupPath;
    }

    /**
     * Supprimer récursivement toutes les propriétés "tags" d'un objet
     */
    removeTags(obj) {
        let tagsRemoved = 0;
        
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                // Si c'est un tableau, traiter chaque élément
                for (let item of obj) {
                    tagsRemoved += this.removeTags(item);
                }
            } else {
                // Si l'objet a une propriété "tags", la supprimer
                if (obj.hasOwnProperty('tags')) {
                    console.log(`  🏷️  Suppression tags pour: ${obj.name || obj.id || 'élément sans nom'}`);
                    delete obj.tags;
                    tagsRemoved++;
                }
                
                // Traiter récursivement toutes les autres propriétés
                for (let key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        tagsRemoved += this.removeTags(obj[key]);
                    }
                }
            }
        }
        
        return tagsRemoved;
    }

    /**
     * Traiter un fichier d'arrondissement
     */
    processFile(filePath) {
        console.log(`\n📍 Traitement: ${path.basename(filePath)}`);
        
        try {
            // Lire le fichier
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // Créer un backup
            this.createBackup(filePath);
            
            // Supprimer les tags
            const tagsRemoved = this.removeTags(data);
            
            if (tagsRemoved > 0) {
                // Sauvegarder le fichier modifié
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                console.log(`✅ ${tagsRemoved} propriétés "tags" supprimées`);
                this.totalTagsRemoved += tagsRemoved;
            } else {
                console.log(`ℹ️  Aucune propriété "tags" trouvée`);
            }
            
            this.processedFiles++;
            
        } catch (error) {
            console.error(`❌ Erreur traitement ${filePath}:`, error.message);
        }
    }

    /**
     * Traiter tous les fichiers d'arrondissements
     */
    processAllFiles() {
        console.log('🚀 Suppression des propriétés "tags" des fichiers JSON\n');
        
        if (!fs.existsSync(this.dataDir)) {
            console.error(`❌ Dossier non trouvé: ${this.dataDir}`);
            return;
        }
        
        const files = fs.readdirSync(this.dataDir)
            .filter(file => file.endsWith('.json'))
            .map(file => path.join(this.dataDir, file))
            .sort();
        
        console.log(`📁 ${files.length} fichiers d'arrondissements trouvés`);
        
        for (const filePath of files) {
            this.processFile(filePath);
        }
        
        console.log('\n🎉 SUPPRESSION TERMINÉE !');
        console.log(`📊 Résumé:`);
        console.log(`   • ${this.processedFiles} fichiers traités`);
        console.log(`   • ${this.totalTagsRemoved} propriétés "tags" supprimées`);
        console.log(`   • Backups créés dans: ${this.backupDir}`);
    }

    /**
     * Afficher les fichiers qui seront traités (dry run)
     */
    dryRun() {
        console.log('🔍 APERÇU - Fichiers qui seront traités:\n');
        
        if (!fs.existsSync(this.dataDir)) {
            console.error(`❌ Dossier non trouvé: ${this.dataDir}`);
            return;
        }
        
        const files = fs.readdirSync(this.dataDir)
            .filter(file => file.endsWith('.json'))
            .sort();
        
        files.forEach((file, index) => {
            console.log(`${index + 1}. ${file}`);
        });
        
        console.log(`\n📊 Total: ${files.length} fichiers`);
        console.log('\n💡 Utilisez "node remove-tags.js run" pour lancer la suppression');
    }
}

// Interface CLI
async function main() {
    const remover = new TagRemover();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'dry-run';
    
    try {
        switch (command) {
            case 'run':
                remover.processAllFiles();
                break;
                
            case 'dry-run':
            default:
                remover.dryRun();
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

module.exports = TagRemover;