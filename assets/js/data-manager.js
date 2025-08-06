// ===== DATA MANAGER - VERSION CORRIGÉE POUR STRUCTURE RÉELLE =====

class DataManager {
    constructor(app) {
        this.app = app;
        this.parisIndex = null;
        this.loadedArrondissements = new Map();
    }
    
    // === CHARGEMENT DES DONNÉES ===
    async loadParisData() {
        try {
            console.log('🗼 Chargement des données Paris Explorer...');
            this.app.showNotification('Chargement des trésors parisiens...', 'info');
            
            // Étape 1: Charger l'index principal
            await this.loadParisIndex();
            
            // Étape 2: Charger les arrondissements prioritaires
            await this.loadPriorityArrondissements();
            
            // Succès
            console.log('✅ Données Paris chargées avec succès');
            this.app.onDataLoaded();
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des données:', error);
            
            // Mode fallback avec données minimales
            this.createFallbackData();
            this.app.onDataLoaded();
            this.app.showNotification('⚠️ Mode hors ligne activé', 'warning');
        }
    }
    
    // === CHARGEMENT INDEX PRINCIPAL ===
    async loadParisIndex() {
        try {
            console.log('📄 Chargement data/paris-index.json...');
            const response = await fetch('data/paris-index.json');
            
            if (!response.ok) {
                throw new Error(`Index principal introuvable (${response.status})`);
            }
            
            this.parisIndex = await response.json();
            console.log('✅ Index principal chargé:', this.parisIndex.metadata.title);
            console.log('📊 Arrondissements disponibles:', Object.keys(this.parisIndex.arrondissements).length);
            
        } catch (error) {
            console.error('❌ Erreur chargement index:', error);
            throw error;
        }
    }
    
    // === CHARGEMENT ARRONDISSEMENTS PRIORITAIRES ===
    async loadPriorityArrondissements() {
        if (!this.parisIndex?.arrondissements) return;
        
        // Arrondissements prioritaires à charger immédiatement
        const priorityArr = ['1er', '4ème', '7ème'];
        
        console.log('🔥 Chargement arrondissements prioritaires:', priorityArr);
        
        const promises = priorityArr.map(arrKey => 
            this.loadArrondissement(arrKey).catch(error => {
                console.warn(`⚠️ Échec chargement ${arrKey}:`, error);
                return null;
            })
        );
        
        await Promise.all(promises);
        
        // Construire les données consolidées
        this.buildConsolidatedData();
    }
    
    // === CHARGEMENT ARRONDISSEMENT INDIVIDUEL ===
    async loadArrondissement(arrKey) {
        if (this.loadedArrondissements.has(arrKey)) {
            return this.loadedArrondissements.get(arrKey);
        }
        
        const arrInfo = this.parisIndex.arrondissements[arrKey];
        if (!arrInfo) {
            throw new Error(`Arrondissement ${arrKey} non trouvé dans l'index`);
        }
        
        try {
            // Construire le chemin du fichier
            const fileName = this.getArrondissementFileName(arrKey);
            console.log(`📁 Chargement ${arrKey} depuis ${fileName}...`);
            
            const response = await fetch(`data/arrondissements/${fileName}`);
            
            if (!response.ok) {
                throw new Error(`Fichier ${fileName} introuvable (${response.status})`);
            }
            
            const arrData = await response.json();
            
            // Valider et traiter les données
            const processedData = this.processArrondissementData(arrKey, arrData);
            this.loadedArrondissements.set(arrKey, processedData);
            
            console.log(`✅ ${arrKey} chargé: ${this.countPlaces(processedData)} lieux`);
            return processedData;
            
        } catch (error) {
            console.error(`❌ Erreur chargement ${arrKey}:`, error);
            throw error;
        }
    }
    
    // === NOMS DE FICHIERS ARRONDISSEMENTS ===
    getArrondissementFileName(arrKey) {
        const fileMap = {
            '1er': '01-louvre.json',
            '2ème': '02-bourse.json',
            '3ème': '03-haut-marais.json',
            '4ème': '04-marais-ile-saint-louis.json',
            '5ème': '05-quartier-latin.json',
            '6ème': '06-saint-germain.json',
            '7ème': '07-invalides-tour-eiffel.json',
            '8ème': '08-champs-elysees.json',
            '9ème': '09-opera-pigalle.json',
            '10ème': '10-canal-saint-martin.json',
            '11ème': '11-bastille-oberkampf.json',
            '12ème': '12-nation-bercy.json',
            '13ème': '13-chinatown-bibliotheque.json',
            '14ème': '14-montparnasse.json',
            '15ème': '15-beaugrenelle-commerce.json',
            '16ème': '16-trocadero-auteuil.json',
            '17ème': '17-batignolles-monceau.json',
            '18ème': '18-montmartre.json',
            '19ème': '19-villette-buttes-chaumont.json',
            '20ème': '20-belleville-menilmontant.json'
        };
        
        return fileMap[arrKey] || `${arrKey.padStart(2, '0')}.json`;
    }
    
    // === TRAITEMENT DONNÉES ARRONDISSEMENT ===
    processArrondissementData(arrKey, rawData) {
        // Adapter la structure si nécessaire
        let arrData = rawData;
        
        // Si les données sont dans .arrondissement
        if (rawData.arrondissement) {
            arrData = rawData.arrondissement;
        }
        
        // Enrichir avec les métadonnées de l'index
        const indexInfo = this.parisIndex.arrondissements[arrKey];
        if (indexInfo) {
            arrData.title = arrData.title || indexInfo.title;
            arrData.description = arrData.description || indexInfo.description;
            arrData.metadata = { ...indexInfo.metadata, ...arrData.metadata };
        }
        
        // Valider la structure
        if (!arrData.categories) {
            console.warn(`⚠️ ${arrKey}: pas de catégories, création d'une structure vide`);
            arrData.categories = {};
        }
        
        return arrData;
    }
    
    // === CONSTRUCTION DONNÉES CONSOLIDÉES ===
    buildConsolidatedData() {
        const consolidatedData = {};
        
        // Ajouter les arrondissements chargés
        this.loadedArrondissements.forEach((arrData, arrKey) => {
            consolidatedData[arrKey] = arrData;
        });
        
        // Ajouter les arrondissements non chargés avec métadonnées minimales
        Object.keys(this.parisIndex.arrondissements).forEach(arrKey => {
            if (!consolidatedData[arrKey]) {
                const indexInfo = this.parisIndex.arrondissements[arrKey];
                consolidatedData[arrKey] = {
                    title: indexInfo.title,
                    description: indexInfo.description,
                    categories: {},
                    metadata: indexInfo.metadata,
                    lazy: true // Marqueur pour chargement différé
                };
            }
        });
        
        this.app.parisData = consolidatedData;
        console.log('🔧 Données consolidées:', Object.keys(consolidatedData).length, 'arrondissements');
    }
    
    // === CHARGEMENT DIFFÉRÉ ===
    async loadArrondissementOnDemand(arrKey) {
        if (this.loadedArrondissements.has(arrKey)) {
            return this.loadedArrondissements.get(arrKey);
        }
        
        try {
            const arrData = await this.loadArrondissement(arrKey);
            
            // Mettre à jour les données consolidées
            this.app.parisData[arrKey] = arrData;
            
            // Notifier l'interface
            if (this.app.uiManager && this.app.uiManager.renderContent) {
                this.app.uiManager.renderContent();
            }
            
            return arrData;
            
        } catch (error) {
            console.error(`❌ Chargement différé ${arrKey} échoué:`, error);
            return null;
        }
    }
    
    // === DONNÉES FALLBACK ===
    createFallbackData() {
        console.log('🆘 Création données fallback...');
        
        this.app.parisData = {
            '1er': {
                title: '1ER ARRONDISSEMENT - LE LOUVRE',
                description: 'Cœur historique et artistique de Paris',
                categories: {
                    monuments: {
                        title: 'Monuments',
                        places: [
                            {
                                name: 'Musée du Louvre',
                                description: 'Le plus grand musée du monde',
                                address: 'Rue de Rivoli, 75001 Paris'
                            }
                        ]
                    }
                }
            }
        };
        
        console.log('✅ Données fallback créées');
    }
    
    // === UTILITAIRES ===
    countPlaces(arrData) {
        if (!arrData.categories) return 0;
        
        let total = 0;
        Object.values(arrData.categories).forEach(category => {
            if (category.places && Array.isArray(category.places)) {
                total += category.places.length;
            }
        });
        return total;
    }
    
    getTotalPlaces() {
        let total = 0;
        Object.values(this.app.parisData || {}).forEach(arrData => {
            total += this.countPlaces(arrData);
        });
        return total;
    }
    
    getArrondissementInfo(arrKey) {
        return this.parisIndex?.arrondissements?.[arrKey] || null;
    }
    
    // === STATISTIQUES ===
    getStatistics() {
        const stats = {
            totalArrondissements: Object.keys(this.app.parisData || {}).length,
            loadedArrondissements: this.loadedArrondissements.size,
            totalPlaces: this.getTotalPlaces(),
            index: this.parisIndex?.metadata || null
        };
        
        return stats;
    }
}

console.log('✅ DataManager corrigé chargé');
