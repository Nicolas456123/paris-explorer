{
  "app": {
    "name": "Paris Explorer",
    "version": "2.0.1",
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
      "maxResults": 500
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
    "itemsPerPage": 50,
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
      "requestsPerHour": 1000
    }
  },
  "debug": {
    "enabled": false,
    "logLevel": "info",
    "showPerformance": false
  },
  "data": {
    "loadingStrategy": "progressive",
    "forceLoadAll": true,
    "cacheEnabled": true,
    "retryAttempts": 3,
    "timeoutMs": 15000
  }
}
