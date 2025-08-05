# 🗼 Paris Explorer - Tracker de Lieux Visités

Un projet interactif pour découvrir et tracker plus de **2000 lieux secrets et incontournables** de Paris, organisés par arrondissement.

![Paris Explorer](https://img.shields.io/badge/Paris-Explorer-blue?style=for-the-badge&logo=github)
![Places](https://img.shields.io/badge/Lieux-2000+-green?style=for-the-badge)
![Arrondissements](https://img.shields.io/badge/Arrondissements-20-orange?style=for-the-badge)

## ✨ Fonctionnalités

- 🏛️ **2000+ lieux référencés** - Monuments, restaurants secrets, jardins cachés, bars speakeasy
- 📍 **20 arrondissements** - Coverage complète de Paris avec transport et conseils
- ✅ **Système de tracking** - Cochez les lieux visités et suivez votre progression
- 🔍 **Recherche intelligente** - Trouvez rapidement par nom, description ou tags
- 🏷️ **Filtres avancés** - Par catégorie, statut, budget, type d'expérience
- 📊 **Statistiques personnelles** - Taux de completion, lieux favoris, progression
- 📱 **Design responsive** - Interface optimisée mobile et desktop
- 💾 **Export JSON** - Sauvegardez et partagez vos données

## 🚀 Utilisation

### Option 1 : GitHub Pages (Recommandé)

1. **Forkez ce repository**
2. **Activez GitHub Pages** dans Settings > Pages > Source: Deploy from a branch > main
3. **Accédez à votre site** : `https://nicolas456123.github.io/VisiteParis/`

### Option 2 : Local

```bash
# Clonez le repository
git clone https://github.com/[votre-username]/paris-explorer.git
cd paris-explorer

# Ouvrez index.html dans votre navigateur
open index.html  # macOS
start index.html # Windows
```

## 📁 Structure du Projet

```
paris-explorer/
├── index.html              # Interface web principale
├── paris-database.json     # Base de données complète
├── data/
│   ├── user-progress.json  # Progression utilisateur (généré)
│   └── favorites.json      # Lieux favoris (généré)
├── assets/
│   ├── css/               # Styles personnalisés
│   ├── js/                # Scripts additionnels
│   └── images/            # Photos des lieux
└── README.md              # Ce fichier
```

## 🗂️ Format de Données

### Structure JSON des Lieux

```json
{
  "id": "louvre-museum",
  "name": "Musée du Louvre",
  "description": "La Joconde, Vénus de Milo, Pyramide de verre",
  "address": "Rue de Rivoli, 75001 Paris",
  "price": "17€",
  "hours": "9h-18h (fermé mardi)",
  "tags": ["musée", "art", "incontournable"],
  "rating": 4.5,
  "duration": "3-4h",
  "category": "culture"
}
```

### Progrès Utilisateur

```json
{
  "visitedPlaces": ["louvre-museum", "notre-dame"],
  "favorites": ["sacre-coeur", "place-des-vosges"],
  "wishlist": ["tour-eiffel", "arc-triomphe"],
  "notes": {
    "louvre-museum": "Éviter le mercredi, trop de monde"
  },
  "visitDates": {
    "louvre-museum": "2024-03-15"
  }
}
```

## 🎯 Catégories Disponibles

### Par Type
- 🏛️ **Monuments** - Sites historiques, architecture
- 🍽️ **Restaurants** - Gastronomie, bistrots secrets
- 🌳 **Espaces Verts** - Parcs, jardins cachés
- 🎭 **Culture** - Musées, théâtres, cinémas
- 🛍️ **Shopping** - Boutiques, marchés, passages
- 🍻 **Vie Nocturne** - Bars secrets, speakeasy, clubs

### Par Budget
- 💚 **Gratuit** - Lieux d'accès libre
- 💙 **0-10€** - Activités économiques
- 💛 **10-25€** - Gamme moyenne
- 🧡 **25-50€** - Expériences premium
- ❤️ **50€+** - Luxe et gastronomie

## 🔧 Personnalisation

### Ajouter Vos Lieux

1. **Modifiez `paris-database.json`**
2. **Ajoutez votre lieu** dans la structure existante :

```json
{
  "id": "mon-lieu-secret",
  "name": "Mon Lieu Secret",
  "description": "Description de votre découverte",
  "address": "Adresse complète",
  "price": "Prix ou Gratuit",
  "tags": ["secret", "personnel", "découverte"],
  "rating": 5.0,
  "category": "secret"
}
```

### Modifier les Styles

Les couleurs principales sont définies dans le CSS :
```css
:root {
  --primary-color: #667eea;    /* Bleu principal */
  --secondary-color: #764ba2;  /* Violet secondaire */
  --success-color: #28a745;    /* Vert pour les lieux visités */
  --warning-color: #ffc107;    /* Jaune pour les favoris */
}
```

## 📊 Analytics et Suivi

### Métriques Automatiques
- **Taux de completion** par arrondissement
- **Lieux les plus populaires** (basé sur les étoiles)
- **Progression mensuelle** de vos visites
- **Catégories préférées** selon vos choix

### Export de Données

Le bouton "Exporter JSON" génère un fichier avec :
- Votre progression complète
- Statistiques personnelles
- Données pour backup/partage
- Format compatible import/export

## 🌟 Contributions

### Ajouter des Lieux

1. **Forkez le projet**
2. **Créez une branche** : `git checkout -b nouveau-lieu`
3. **Ajoutez vos lieux** dans `paris-database.json`
4. **Respectez le format** existant
5. **Créez une Pull Request**

### Critères d'Ajout
- ✅ Lieu accessible au public
- ✅ Informations précises (adresse, horaires, prix)
- ✅ Description unique et utile
- ✅ Tags pertinents
- ✅ Pas de contenu promotionnel

## 🗺️ Roadmap

### Version 2.0
- [ ] **Mode hors-ligne** avec Service Workers
- [ ] **Géolocalisation** et navigation GPS
- [ ] **Photos utilisateurs** et reviews
- [ ] **Notifications** pour les événements temporaires
- [ ] **Partage social** de vos découvertes

### Version 3.0
- [ ] **Application mobile** native (PWA)
- [ ] **Communauté** d'explorateurs parisiens
- [ ] **Challenges** et gamification
- [ ] **IA** pour recommandations personnalisées

## 📱 Compatibilité

- ✅ **Chrome** 80+
- ✅ **Firefox** 75+
- ✅ **Safari** 13+
- ✅ **Edge** 80+
- ✅ **Mobile** iOS/Android

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

### Utilisation Libre Pour
- ✅ Usage personnel
- ✅ Projets éducatifs
- ✅ Applications commerciales
- ✅ Modifications et redistribution

## 🙏 Remerciements

- **Ville de Paris** pour l'Open Data
- **OpenStreetMap** pour les données géographiques
- **Contributeurs** de la communauté
- **Beta testeurs** parisiens

## 📞 Contact & Support

- **Issues GitHub** : [Signaler un bug](https://github.com/[username]/paris-explorer/issues)
- **Discussions** : [Forum communauté](https://github.com/[username]/paris-explorer/discussions)
- **Email** : paris.explorer@[email].com

---

**🚀 Commencez votre exploration de Paris dès maintenant !**

*Découvrez les secrets de la Ville Lumière, un lieu à la fois.*
