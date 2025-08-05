# 🗼 Paris Explorer - La Ville Lumière

Une application web interactive pour explorer et découvrir tous les trésors de Paris, arrondissement par arrondissement.

## 📁 Structure du Projet

```
paris-explorer/
├── index.html          # Structure HTML principale
├── styles.css          # Feuille de style complète  
├── app.js              # Logique JavaScript de l'application
├── paris-database.json # Base de données des lieux parisiens (à créer)
└── README.md           # Cette documentation
```

## 🚀 Installation et Utilisation

### 1. Télécharger les fichiers
- `index.html` - Page principale
- `styles.css` - Styles CSS 
- `app.js` - Code JavaScript

### 2. Créer la base de données
Créez un fichier `paris-database.json` avec vos lieux parisiens :

```json
{
  "arrondissements": {
    "1er": {
      "title": "1er arrondissement - Louvre",
      "categories": {
        "monuments": {
          "title": "🏛️ Monuments Historiques",
          "places": [
            {
              "name": "Musée du Louvre",
              "description": "Le plus grand musée d'art au monde",
              "address": "Rue de Rivoli, 75001 Paris",
              "tags": ["musée", "art", "incontournable"]
            }
          ]
        }
      }
    }
  }
}
```

### 3. Servir l'application
L'application doit être servie via un serveur web local :

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Puis ouvrez : `http://localhost:8000`

## ✨ Fonctionnalités

### 👥 Multi-Utilisateurs
- Création/gestion de profils d'explorateurs
- Sauvegarde automatique des progressions
- Statistiques individuelles

### 🗺️ Carte Interactive Avancée
- **Zoom adaptatif** : Polygones des arrondissements ⟷ Lieux individuels
- **Géocodage automatique** des adresses avec API Nominatim
- **Marqueurs typés** avec emojis (🏛️ monuments, 🍽️ restaurants, etc.)
- **Mode plein écran** et contrôles avancés

### 📋 Interface Liste
- **Recherche intelligente** par nom, description, tags, adresse
- **Filtres** : masquer les lieux explorés
- **Actions groupées** : tout ouvrir/fermer, recommencer

### 📊 Système de Progression
- Suivi des lieux visités par utilisateur
- Barres de progression animées
- Statistiques détaillées par arrondissement

## 🎨 Design

- **Thème parisien** avec couleurs or et bleu royal
- **Responsive** mobile et desktop
- **Animations fluides** et micro-interactions
- **Interface moderne** avec glassmorphism

## 🔧 Technologies

- **HTML5** structure sémantique
- **CSS3** avec variables modernes et flexbox/grid
- **JavaScript ES6+** avec classes et async/await
- **Leaflet.js** pour la cartographie interactive
- **API Nominatim** pour le géocodage des adresses
- **LocalStorage** pour la persistance des données

## 📱 Responsive Design

L'application s'adapte automatiquement :
- **Desktop** : Interface complète avec sidebar
- **Tablet** : Layout adaptatif
- **Mobile** : Interface optimisée tactile

## 🗺️ Format des Adresses

Les adresses sont automatiquement géocodées. Formats supportés :
- `"Rue de Rivoli, 75001 Paris"` ✅ (recommandé)
- `"Place Vendôme, Paris"` ✅
- `"Tour Eiffel"` ✅

## 🚧 Développement

### Ajouter de nouveaux types de lieux
Dans `app.js`, modifiez la fonction `getPlaceType()` :

```javascript
getPlaceType(categoryKey) {
    const catKey = categoryKey.toLowerCase();
    
    if (catKey.includes('cinema')) return 'cinema'; // Nouveau type
    // ... autres types
}
```

Puis ajoutez l'emoji correspondant dans `createPlaceMarker()` :

```javascript
const typeIcons = {
    'cinema': '🎬', // Nouveau
    'monument': '🏛️',
    // ... autres icônes
};
```

### Personnaliser les couleurs
Dans `styles.css`, modifiez les variables CSS :

```css
:root {
    --paris-gold: #D4AF37;     /* Or parisien */
    --paris-blue: #1e3a8a;     /* Bleu royal */
    --success: #059669;         /* Vert validation */
    /* ... autres couleurs */
}
```

## 📊 Structure de la Base de Données

```json
{
  "arrondissements": {
    "[clé-arrondissement]": {
      "title": "Nom complet de l'arrondissement",
      "categories": {
        "[clé-catégorie]": {
          "title": "🏛️ Nom de la catégorie avec emoji",
          "places": [
            {
              "name": "Nom du lieu",
              "description": "Description détaillée",
              "address": "Adresse complète avec code postal", 
              "tags": ["tag1", "tag2", "tag3"]
            }
          ]
        }
      }
    }
  }
}
```

## 🔍 APIs Utilisées

- **OpenStreetMap Nominatim** : Géocodage gratuit des adresses
- **OpenData Paris** : Polygones des arrondissements parisiens
- **Leaflet** : Affichage des cartes interactives

## 📄 Licence

Projet libre d'utilisation pour découvrir Paris ! 🇫🇷

---

**Bon voyage dans la Ville Lumière !** ✨
