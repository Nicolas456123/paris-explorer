# 🗼 Paris Explorer - Multi-Utilisateurs

Un projet interactif pour découvrir et tracker plus de **1500 lieux secrets et incontournables** de Paris, avec un système multi-utilisateurs avancé.

![Paris Explorer](https://img.shields.io/badge/Paris-Explorer-blue?style=for-the-badge&logo=github)
![Places](https://img.shields.io/badge/Lieux-1500+-green?style=for-the-badge)
![Users](https://img.shields.io/badge/Multi-Utilisateurs-orange?style=for-the-badge)

## ✨ Nouvelles Fonctionnalités v2.0

- 👥 **Système Multi-Utilisateurs** - Chaque personne a sa propre progression
- 📊 **Statistiques Personnalisées** - Suivi détaillé par profil utilisateur
- 🎯 **Succès & Achievements** - Débloquez des badges en explorant
- 💾 **Sauvegarde Automatique** - Progression sauvée toutes les 30 secondes
- 📱 **Interface Optimisée** - Design moderne et responsive
- 🔍 **Recherche Avancée** - Trouvez rapidement ce que vous cherchez

## 📁 Architecture des Fichiers

Le projet utilise maintenant **2 fichiers séparés** pour plus de flexibilité :

### Fichiers Obligatoires
```
📁 mon-projet-paris/
├── 📄 index.html                 # Interface principale
├── 📄 paris-database.json        # ⭐ LIEUX À VISITER (modifiable)
└── 📄 README.md                  # Documentation
```

### Fichiers Optionnels
```
├── 📄 config.json               # Configuration système (optionel)
└── 📁 assets/                   # Images et ressources
```

## 🗂️ Structure des Données

### `paris-database.json` - Lieux à Visiter
Ce fichier contient **uniquement les lieux** et peut être modifié facilement :

```json
{
  "metadata": {
    "title": "Paris Explorer - Base de données complète",
    "version": "1.0.0",
    "totalPlaces": 1500
  },
  "arrondissements": {
    "1er": {
      "title": "1ER ARRONDISSEMENT - LE LOUVRE",
      "categories": {
        "monuments": {
          "title": "🏛️ Monuments & Sites Historiques",
          "places": [
            {
              "name": "Musée du Louvre",
              "description": "La Joconde, Vénus de Milo...",
              "tags": ["musée", "art", "incontournable"]
            }
          ]
        }
      }
    }
  }
}
```

### `config.json` - Configuration Système (Optionnel)
Ce fichier contient la configuration, les filtres, les succès, etc.
Si absent, l'application utilise une configuration par défaut.

## 🚀 Installation & Utilisation

### Option 1 : Serveur Local (Recommandé)
```bash
# 1. Téléchargez tous les fichiers dans un dossier
# 2. Lancez un serveur local
python -m http.server 8000
# ou
npx serve .

# 3. Ouvrez votre navigateur
http://localhost:8000
```

### Option 2 : GitHub Pages
1. **Forkez** ce repository
2. **Activez GitHub Pages** : Settings > Pages > Deploy from branch > main
3. **Accédez** à votre site : `https://[username].github.io/paris-explorer/`

## 👥 Système Multi-Utilisateurs

### Créer un Profil
1. Cliquez sur "👥 Gérer les profils"
2. Entrez un nom de profil
3. Cliquez sur "Créer"

### Changer de Profil
- Sélectionnez un profil dans la liste déroulante
- Votre progression est automatiquement chargée

### Données Sauvées par Profil
- ✅ Lieux visités
- ⭐ Lieux favoris  
- 📝 Notes personnelles
- 📊 Statistiques détaillées
- 🏆 Succès débloqués

## 🎯 Système de Succès

Débloquez des achievements en explorant Paris :

| Badge | Nom | Description |
|-------|-----|-------------|
| 🏆 | Découvreur | Visitez votre premier lieu |
| 🗺️ | Explorateur | Visitez 10 lieux différents |
| 🎒 | Aventurier | Visitez 50 lieux |
| 👑 | Conquérant | Visitez 100 lieux |
| 🗼 | Vrai Parisien | Visitez tous les arrondissements |
| 🍽️ | Gourmet | Visitez 20 restaurants |
| 🎭 | Amateur de Culture | Visitez 15 musées/théâtres |
| 🔍 | Chasseur de Secrets | Découvrez 10 lieux secrets |

## ✏️ Modifier les Lieux

Pour ajouter/modifier des lieux, éditez **uniquement** le fichier `paris-database.json` :

### Ajouter un Lieu
```json
{
  "name": "Mon Nouveau Lieu",
  "description": "Description détaillée de ce lieu incroyable",
  "tags": ["nouveau", "secret", "authentique"]
}
```

### Ajouter une Catégorie
```json
"ma-nouvelle-categorie": {
  "title": "🎪 Ma Catégorie",
  "places": [...]
}
```

### Ajouter un Arrondissement
```json
"21ème": {
  "title": "21ÈME ARRONDISSEMENT - MON QUARTIER",
  "description": "Description de mon quartier",
  "categories": {...}
}
```

## 📊 Export de Données

### Formats Disponibles
- **JSON** - Données complètes pour backup
- **CSV** - Pour Excel/Google Sheets
- **PDF** - Rapport imprimable (à venir)

### Contenu de l'Export
- Liste des lieux visités
- Statistiques personnelles
- Progression par arrondissement  
- Date et heure de l'export

## 🎨 Personnalisation

### Modifier l'Apparence
Éditez les variables CSS dans `index.html` :

```css
:root {
  --primary: #667eea;     /* Couleur principale */
  --secondary: #764ba2;   /* Couleur secondaire */
  --success: #28a745;     /* Vert (lieux visités) */
}
```

### Modifier la Configuration
Créez un fichier `config.json` pour personnaliser :
- Messages de l'interface
- Couleurs des filtres  
- Liste des achievements
- Paramètres par défaut

## 🔧 Fonctionnalités Avancées

### Recherche Intelligente
- **Recherche floue** - Trouve même avec des fautes de frappe
- **Recherche par tags** - Tapez "michelin" pour les restaurants étoilés
- **Recherche par arrondissement** - "18ème" pour Montmartre

### Filtres Dynamiques
- **Par catégorie** - Monuments, Restaurants, Culture...
- **Par statut** - Visités, À visiter
- **Par budget** - Gratuit, Payant, Luxe

### Navigation Tactile
- **Swipe** pour naviguer sur mobile
- **Tap** pour ouvrir/fermer les sections
- **Long press** pour actions rapides

## 📱 Compatibilité

- ✅ **Chrome** 90+
- ✅ **Firefox** 88+  
- ✅ **Safari** 14+
- ✅ **Edge** 90+
- ✅ **Mobile** iOS 14+, Android 10+

## 🛠️ Développement

### Structure Technique
```
paris-explorer/
├── index.html              # App principale (HTML + CSS + JS)
├── paris-database.json     # Base de données lieux
├── config.json            # Configuration optionnelle
└── README.md              # Documentation
```

### Technologies Utilisées
- **HTML5** - Structure sémantique
- **CSS3** - Animations et responsive design
- **JavaScript ES6+** - Logique applicative  
- **LocalStorage** - Sauvegarde locale
- **Service Worker** - Cache et offline (à venir)

### Contribuer

1. **Forkez** le projet
2. **Créez une branche** : `git checkout -b nouvelle-fonctionnalite`
3. **Committez** : `git commit -m 'Ajout fonctionnalité X'`
4. **Pushez** : `git push origin nouvelle-fonctionnalite`  
5. **Créez une Pull Request**

## 🐛 Résolution de Problèmes

### Erreur "Impossible de charger les données"
- ✅ Vérifiez que `paris-database.json` est présent
- ✅ Utilisez un serveur web (pas `file://`)
- ✅ Vérifiez la syntaxe JSON avec un validateur

### Progression non sauvée
- ✅ Vérifiez que le localStorage est activé
- ✅ Créez un profil utilisateur
- ✅ Attendez 30 secondes pour la sauvegarde auto

### Interface cassée sur mobile
- ✅ Videz le cache du navigateur
- ✅ Rechargez la page (Ctrl+F5)
- ✅ Vérifiez la version de votre navigateur

## 📈 Roadmap v2.1

### Prochaines Fonctionnalités
- [ ] **Mode hors-ligne** complet
- [ ] **Géolocalisation** et navigation GPS
- [ ] **Photos utilisateurs** pour chaque lieu
- [ ] **Partage social** de découvertes
- [ ] **Import** de listes externes
- [ ] **API** pour développeurs tiers

### Améliorations Interface
- [ ] **Mode sombre** complet
- [ ] **Thèmes personnalisables**
- [ ] **Widgets** de statistiques
- [ ] **Notifications push** pour nouveaux lieux

## 📄 Licence

Ce projet est sous licence **MIT** - Voir [LICENSE](LICENSE) pour plus de détails.

### Utilisation Libre
- ✅ Usage personnel et commercial
- ✅ Modification du code source
- ✅ Distribution et redistribution
- ✅ Intégration dans d'autres projets

## 🙏 Crédits

- **Données** : Compilation communautaire
- **Design** : Inspiration Material Design 3
- **Icons** : Emojis Unicode standards
- **Photos** : Contributions utilisateurs

## 🤝 Communauté

- **GitHub Discussions** : [Forum communauté](https://github.com/[username]/paris-explorer/discussions)
- **Issues** : [Signaler un bug](https://github.com/[username]/paris-explorer/issues)
- **Wiki** : [Documentation avancée](https://github.com/[username]/paris-explorer/wiki)

---

**🚀 Commencez votre exploration multi-utilisateurs de Paris dès maintenant !**

*Découvrez les secrets de la Ville Lumière en famille ou entre amis, chacun avec sa propre progression.*
