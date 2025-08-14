# 🗼 Paris Explorer - Système Complet PWA

Une application web avancée pour explorer et découvrir tous les trésors de Paris avec un système multi-utilisateurs et une PWA.

## 📁 Structure Réelle du Projet

```
paris-explorer/
├── 📄 index.html                  # Structure HTML principale
├── 📄 sw.js                       # Service Worker PWA (à la racine) ✅
├── 📄 offline.html                # Page hors ligne élégante ✅
├── 📄 config.js                   # Configuration globale ✅
├── 📄 manifest.json               # Manifeste PWA ✅
├── 📁 data/                        # Données au format CSV optimisé ✅
├── 📄 README.md                   # Cette documentation
│
│   ├── paris-places.csv           # 651 lieux avec coordonnées GPS ✅
│   ├── arrondissements-info.csv   # Métadonnées des 20 arrondissements ✅
│   └── user/                      # Données utilisateurs
│       ├── favorites.json         # Favoris sauvegardés
│       ├── notes.json            # Notes personnelles
│       ├── progress.json         # Progression et statistiques
│       └── settings.json         # Préférences utilisateur
│
├── 📁 data/arrondissements/       # Base JSON (conservée pour référence) ✅
│   ├── 01-louvre.json             # 1er arrondissement - Louvre
│   ├── 02-bourse.json             # 2ème arrondissement - Bourse
│   ├── 03-haut-marais.json        # 3ème arrondissement - Haut Marais
│   ├── 04-marais-ile-saint-louis.json # 4ème arrondissement
│   ├── 05-quartier-latin.json     # 5ème arrondissement - Quartier Latin
│   ├── 06-saint-germain.json      # 6ème arrondissement - Saint-Germain
│   ├── 07-invalides-tour-eiffel.json # 7ème arrondissement
│   ├── 08-champs-elysees.json     # 8ème arrondissement - Champs-Élysées
│   ├── 09-opera-pigalle.json      # 9ème arrondissement - Opéra/Pigalle
│   ├── 10-canal-saint-martin.json # 10ème arrondissement
│   ├── 11-bastille-oberkampf.json # 11ème arrondissement
│   ├── 12-nation-bercy.json       # 12ème arrondissement
│   ├── 13-chinatown-bibliotheque.json # 13ème arrondissement
│   ├── 14-montparnasse.json       # 14ème arrondissement - Montparnasse
│   └── [15-20ème arrondissements...] # Autres arrondissements
│
├── 📁 assets/                     # Ressources statiques ✅
│   ├── 📁 css/                    # Feuilles de style
│   │   ├── main.css               # Styles principaux ✅
│   │   ├── responsive.css         # Styles responsive ✅
│   │   └── themes.css             # Système de thèmes (7 thèmes) ✅
│   │
│   └── 📁 js/                     # Scripts JavaScript ✅
│       ├── app.js                 # Point d'entrée principal ✅
│       ├── data-manager.js        # Chargement des données CSV optimisé ✅
│       ├── user-manager.js        # Système multi-utilisateurs ✅
│       ├── ui-manager.js          # Interface utilisateur avancée ✅
│       ├── map-manager.js         # Carte interactive Leaflet ✅
│       ├── export-import.js       # Export/Import (JSON, CSV, PDF) ✅
│       ├── search-filter.js       # Moteur de recherche avancé ✅
│       └── utils.js               # Fonctions utilitaires ✅
│
│   └── 📁 user/                   # Templates utilisateurs
│       ├── progress.json          # Modèle progression
│       ├── favorites.json         # Modèle favoris & collections
│       ├── notes.json             # Modèle notes personnelles
│       └── settings.json          # Modèle préférences
│
└── 📁 user/                       # Données utilisateurs (localStorage) ✅
    └── [données dynamiques]       # Progression, favoris, notes...
```

## 🏗️ Architecture des Données (Structure Réelle)

### **Base de Données Ultra-Détaillée**
- **`data/paris-places.csv`** : 651 lieux avec coordonnées GPS précises (97% géolocalisés)
- **`data/arrondissements-info.csv`** : Métadonnées des 20 arrondissements (population, superficie, transport)
- **`data/arrondissements/*.json`** : Archives JSON (conservées pour référence)
- **Performance optimisée** : Chargement unique CSV vs 20 requêtes HTTP JSON
- **Métadonnées complètes** : Superficie, population, limites géographiques
- **Transports intégrés** : Stations de métro avec lignes et coordonnées

### **Richesse des Données par Arrondissement**
- **📍 Géolocalisation** : `bounds`, `center`, coordonnées précises
- **📊 Statistiques** : `area_km2`, `population`, densité
- **🚇 Transports** : Stations métro avec lignes et coordonnées GPS
- **🏛️ Catégories** : Monuments, restaurants, parcs, shopping...
- **🎯 Lieux détaillés** : ID unique, description riche, tags multiples
- **📍 Adresses complètes** : Géocodage automatique possible

### **Structure Réelle d'un Arrondissement**
```json
{
  "arrondissement": {
    "id": "1er",
    "name": "1ER ARRONDISSEMENT - LE LOUVRE",
    "description": "Cœur historique et artistique de Paris",
    "bounds": {
      "north": 48.8675, "south": 48.8550,
      "east": 2.3500, "west": 2.3250
    },
    "center": [48.8607, 2.3358],
    "area_km2": 1.83,
    "population": 16888,
    "transport": {
      "metro_stations": [
        {
          "name": "Louvre-Rivoli",
          "lines": ["1"],
          "coordinates": [48.8606, 2.3354]
        }
      ],
      "description": "Métro : Louvre-Rivoli (1), Châtelet-Les Halles..."
    },
    "categories": {
      "monuments": {
        "title": "🏛️ Monuments & Sites Historiques",
        "description": "Patrimoine architectural et historique exceptionnel",
        "places": [
          {
            "id": "musee-du-louvre",
            "name": "Musée du Louvre",
            "description": "La Joconde, Vénus de Milo, Pyramide de verre, 35 000 œuvres",
            "address": "Rue de Rivoli, 75001 Paris",
            "coordinates": [48.8606, 2.3376],
            "tags": ["incontournable", "art", "pyramide", "joconde"]
          }
        ]
      }
    }
  }
}
```

## ✨ Fonctionnalités

### 👥 **Multi-utilisateurs**
- Création de profils illimités
- Progression individuelle sauvegardée
- Import/export des données utilisateur

### 🗺️ **Carte Interactive**
- Affichage des arrondissements et lieux
- Zoom adaptatif avec clustering
- Géolocalisation des points d'intérêt

### 🔍 **Recherche et Filtres**
- Recherche temps réel dans les lieux
- Filtres par arrondissement/catégorie/statut
- Masquage des lieux déjà visités

### 📊 **Suivi de Progression**
- Statistiques par arrondissement
- Système d'achievements
- Graphiques de progression

### 📝 **Organisation Personnelle**
- Favoris et collections
- Notes personnelles par lieu
- Export des données en différents formats

### 📱 **PWA (Progressive Web App)**
- Installation comme app native
- Fonctionnement hors ligne
- Synchronisation automatique

## 🚀 Installation

```bash
# Servir avec un serveur local
python -m http.server 8000
# ou
npx serve .

# Ouvrir http://localhost:8000
```

**Note :** Un serveur local est requis pour le fonctionnement de la PWA.

### **Stockage Modulaire**
```
localStorage:
├── paris-explorer-progress    # Progression par utilisateur
├── paris-explorer-favorites   # Favoris et collections
├── paris-explorer-notes      # Notes personnelles
├── paris-explorer-settings   # Préférences UI/UX
├── paris-explorer-collections # Collections custom
└── paris-explorer-achievements # Succès débloqués
```

## 🔧 Exploitation Technique des Données

### **Fonctionnalités Avancées Possibles**
```javascript
// Accès aux données géographiques précises
const arrondissement = await loadArrondissement('01-louvre');

// Calculs géospatiaux automatiques
const surface = arrondissement.arrondissement.area_km2; // 1.83 km²
const population = arrondissement.arrondissement.population; // 16,888 hab
const densite = population / surface; // 9,230 hab/km²

// Géolocalisation des transports
const stations = arrondissement.arrondissement.transport.metro_stations;
stations.forEach(station => {
    // Chaque station a ses coordonnées exactes
    const [lat, lng] = station.coordinates;
    // Affichage sur carte avec lignes métro
});

// Recherche géospatiale avancée
const lieuxProches = findPlacesNearCoordinates([48.8607, 2.3358], 500); // 500m
const lieuxDansZone = findPlacesInBounds(bounds);

// Calculs de distances et itinéraires
const distance = calculateDistance(lieu1.coordinates, lieu2.coordinates);
const itineraire = generateWalkingRoute([lieu1, lieu2, lieu3]);
```

### **API Données Géographiques**
```javascript
// Hook dans data-manager.js
window.ParisExplorer = {
    // Arrondissement complet avec métadonnées
    getArrondissement: (id) => ({ 
        geometry: bounds, 
        center: [lat, lng],
        population: number,
        transport: stations[]
    }),
    
    // Recherche géospatiale
    findNearbyPlaces: (coordinates, radius) => places[],
    calculateDensity: (arrondissementId) => number,
    
    // Transports
    getMetroStations: (arrondissementId) => stations[],
    getAccessibleLines: (coordinates) => lines[]
};
```
