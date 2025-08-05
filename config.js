{
  "app": {
    "name": "Paris Explorer",
    "version": "2.0.0",
    "description": "Découvrez tous les trésors de Paris avec un système multi-utilisateurs sophistiqué",
    "author": "Paris Explorer Team",
    "theme": "paris-classic",
    "language": "fr-FR",
    "pwaEnabled": true
  },
  "users": {
    "maxUsers": 50,
    "autoSave": true,
    "saveInterval": 30000,
    "enableBackup": true,
    "backupInterval": 300000,
    "allowGuestMode": false
  },
  "features": {
    "export": {
      "enabled": true,
      "formats": ["json", "csv", "pdf", "html"]
    },
    "notifications": {
      "enabled": true,
      "duration": 3000,
      "position": "top-right"
    },
    "search": {
      "enabled": true,
      "fuzzySearch": true,
      "voiceSearch": true,
      "minChars": 2,
      "maxResults": 100
    },
    "map": {
      "enabled": true,
      "defaultZoom": 12,
      "clustering": true,
      "fullscreen": true,
      "geolocation": true
    },
    "collections": {
      "enabled": true,
      "maxCollections": 20,
      "allowSharing": true
    },
    "achievements": {
      "enabled": true,
      "showProgress": true,
      "notifications": true
    },
    "analytics": {
      "enabled": false,
      "anonymize": true
    }
  },
  "ui": {
    "defaultView": "list",
    "itemsPerPage": 20,
    "compactMode": false,
    "animations": {
      "enabled": true,
      "duration": 300,
      "respectMotionPreference": true
    },
    "themes": {
      "available": [
        "paris-classic",
        "paris-dark", 
        "versailles",
        "montmartre",
        "saint-germain",
        "marais",
        "haute-couture",
        "high-contrast",
        "custom"
      ],
      "allowCustom": true
    }
  },
  "performance": {
    "debounceDelay": 300,
    "cacheExpiry": 3600000,
    "maxCacheSize": 100,
    "lazyLoading": true,
    "imageOptimization": true
  },
  "accessibility": {
    "highContrast": false,
    "reduceMotion": false,
    "screenReader": true,
    "keyboardNavigation": true,
    "focusIndicators": true
  },
  "api": {
    "baseUrl": "",
    "timeout": 10000,
    "retries": 3,
    "rateLimiting": {
      "enabled": false,
      "requests": 100,
      "window": 3600000
    }
  },
  "storage": {
    "engine": "localStorage",
    "encryption": false,
    "compression": true,
    "autoCleanup": true,
    "maxAge": 2592000000
  },
  "security": {
    "validateInput": true,
    "sanitizeHtml": true,
    "preventXSS": true,
    "maxFileSize": 10485760
  },
  "debug": {
    "enabled": false,
    "level": "info",
    "console": true,
    "performance": false
  },
  "experimental": {
    "webAssembly": false,
    "serviceWorkerUpdate": true,
    "backgroundSync": true,
    "pushNotifications": false
  },
  "urls": {
    "homepage": "/",
    "help": "/help",
    "privacy": "/privacy",
    "terms": "/terms",
    "contact": "/contact"
  },
  "contact": {
    "email": "contact@parisexplorer.fr",
    "website": "https://parisexplorer.fr",
    "github": "https://github.com/paris-explorer",
    "support": "https://support.parisexplorer.fr"
  },
  "metadata": {
    "created": "2024-01-01T00:00:00.000Z",
    "updated": "2025-08-06T00:00:00.000Z",
    "configVersion": "2.0.0",
    "compatibleVersions": ["2.0.0", "2.0.1"]
  }
}
