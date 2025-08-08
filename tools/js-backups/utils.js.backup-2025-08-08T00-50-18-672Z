// ===== UTILITIES - FONCTIONS UTILITAIRES COMPLÈTES =====

// === LIENS GOOGLE MAPS OPTIMISÉS ===
/**
 * Génère une URL Google Maps optimale pour un lieu
 * @param {Object} place - Objet lieu avec name, address, etc.
 * @param {Array} placeCoordinates - Coordonnées [lat, lng] optionnelles
 * @returns {string} - URL Google Maps optimisée
 */
function generateGoogleMapsUrl(place, placeCoordinates = null) {
    // Priorité 1: Si on a des coordonnées précises, les utiliser avec le nom du lieu
    if (placeCoordinates && Array.isArray(placeCoordinates) && placeCoordinates.length >= 2) {
        const lat = placeCoordinates[0];
        const lng = placeCoordinates[1];
        
        // URL avec coordonnées + nom du lieu pour plus de précision
        const query = encodeURIComponent(`${place.name}, Paris`);
        return `https://www.google.com/maps/search/?api=1&query=${query}&center=${lat},${lng}&zoom=18`;
    }
    
    // Priorité 2: Si on a une adresse précise, l'utiliser avec le nom
    if (place.address && place.address.trim()) {
        const fullQuery = `${place.name}, ${place.address.trim()}`;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`;
    }
    
    // Priorité 3: Fallback avec juste le nom + Paris
    const fallbackQuery = `${place.name}, Paris`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`;
}

/**
 * Valide et suggère des améliorations pour les coordonnées
 * @param {Array} coordinates - Coordonnées [lat, lng]
 * @param {string} placeName - Nom du lieu pour debug
 * @returns {Object} - {isValid: boolean, suggestion: string}
 */
function validateAndSuggestCoordinates(coordinates, placeName) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return {
            isValid: false,
            suggestion: `${placeName}: Coordonnées manquantes ou format invalide`
        };
    }
    
    const [lat, lng] = coordinates;
    
    // Coordonnées de Paris approximatives
    const PARIS_LAT_MIN = 48.815, PARIS_LAT_MAX = 48.902;
    const PARIS_LNG_MIN = 2.224, PARIS_LNG_MAX = 2.470;
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return {
            isValid: false,
            suggestion: `${placeName}: Coordonnées doivent être des nombres`
        };
    }
    
    // Vérifier si les coordonnées sont dans Paris
    if (lat < PARIS_LAT_MIN || lat > PARIS_LAT_MAX || lng < PARIS_LNG_MIN || lng > PARIS_LNG_MAX) {
        return {
            isValid: false,
            suggestion: `${placeName}: Coordonnées hors de Paris (lat: ${lat}, lng: ${lng})`
        };
    }
    
    return { isValid: true, suggestion: null };
}

// === UTILITAIRES DE BASE ===

/**
 * Debounce une fonction pour éviter les appels trop fréquents
 * @param {Function} func - Fonction à débouncer
 * @param {number} wait - Délai en millisecondes
 * @param {boolean} immediate - Exécuter immédiatement
 * @returns {Function} - Fonction debouncée
 */
function debounce(func, wait = 300, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle une fonction pour limiter les appels
 * @param {Function} func - Fonction à throttler
 * @param {number} limit - Limite en millisecondes
 * @returns {Function} - Fonction throttlée
 */
function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Génère un UUID v4 simple
 * @returns {string} - UUID généré
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Formate une date en français
 * @param {Date|string} date - Date à formatter
 * @param {Object} options - Options de formatage
 * @returns {string} - Date formatée
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return dateObj.toLocaleDateString('fr-FR', finalOptions);
}

/**
 * Formate un nombre avec séparateurs
 * @param {number} num - Nombre à formatter
 * @param {string} locale - Locale (défaut: fr-FR)
 * @returns {string} - Nombre formaté
 */
function formatNumber(num, locale = 'fr-FR') {
    return new Intl.NumberFormat(locale).format(num);
}

// === UTILITAIRES DOM ===

/**
 * Sélectionne un élément DOM avec vérification
 * @param {string} selector - Sélecteur CSS
 * @param {Element} parent - Élément parent (optionnel)
 * @returns {Element|null} - Élément trouvé ou null
 */
function $(selector, parent = document) {
    const element = parent.querySelector(selector);
    if (!element) {
        console.warn(`⚠️ Élément introuvable: ${selector}`);
    }
    return element;
}

/**
 * Sélectionne plusieurs éléments DOM
 * @param {string} selector - Sélecteur CSS
 * @param {Element} parent - Élément parent (optionnel)
 * @returns {NodeList} - Liste d'éléments
 */
function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * Crée un élément DOM avec attributs
 * @param {string} tag - Tag HTML
 * @param {Object} attributes - Attributs à appliquer
 * @param {string} content - Contenu texte (optionnel)
 * @returns {Element} - Élément créé
 */
function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className' || key === 'class') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else if (key in element) {
            element[key] = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    if (content) {
        element.textContent = content;
    }
    
    return element;
}

/**
 * Ajoute une classe avec animation
 * @param {Element} element - Élément DOM
 * @param {string} className - Classe à ajouter
 * @param {number} delay - Délai avant ajout (optionnel)
 */
function addClassWithDelay(element, className, delay = 0) {
    if (delay > 0) {
        setTimeout(() => {
            element.classList.add(className);
        }, delay);
    } else {
        element.classList.add(className);
    }
}

/**
 * Retire une classe avec animation
 * @param {Element} element - Élément DOM
 * @param {string} className - Classe à retirer
 * @param {number} delay - Délai avant retrait (optionnel)
 */
function removeClassWithDelay(element, className, delay = 0) {
    if (delay > 0) {
        setTimeout(() => {
            element.classList.remove(className);
        }, delay);
    } else {
        element.classList.remove(className);
    }
}

/**
 * Vérifie si un élément est visible dans le viewport
 * @param {Element} element - Élément à vérifier
 * @param {number} threshold - Seuil de visibilité (0-1)
 * @returns {boolean} - Visible ou non
 */
function isElementVisible(element, threshold = 0.1) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    const verticalVisible = (rect.top <= windowHeight * (1 - threshold)) && 
                           ((rect.top + rect.height) >= windowHeight * threshold);
    const horizontalVisible = (rect.left <= windowWidth * (1 - threshold)) && 
                             ((rect.left + rect.width) >= windowWidth * threshold);
    
    return verticalVisible && horizontalVisible;
}

// === UTILITAIRES STRING ===

/**
 * Capitalise la première lettre
 * @param {string} str - Chaîne à capitaliser
 * @returns {string} - Chaîne capitalisée
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convertit en camelCase
 * @param {string} str - Chaîne à convertir
 * @returns {string} - Chaîne en camelCase
 */
function toCamelCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
}

/**
 * Convertit en kebab-case
 * @param {string} str - Chaîne à convertir
 * @returns {string} - Chaîne en kebab-case
 */
function toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Supprime les accents d'une chaîne
 * @param {string} str - Chaîne à nettoyer
 * @returns {string} - Chaîne sans accents
 */
function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Génère un slug URL-friendly
 * @param {string} str - Chaîne à convertir
 * @returns {string} - Slug généré
 */
function slugify(str) {
    return removeAccents(str)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
}

/**
 * Tronque une chaîne avec ellipses
 * @param {string} str - Chaîne à tronquer
 * @param {number} length - Longueur maximum
 * @param {string} suffix - Suffixe (défaut: ...)
 * @returns {string} - Chaîne tronquée
 */
function truncate(str, length = 100, suffix = '...') {
    if (str.length <= length) return str;
    return str.substr(0, length - suffix.length) + suffix;
}

/**
 * Nettoie une chaîne HTML
 * @param {string} html - HTML à nettoyer
 * @returns {string} - Texte sans HTML
 */
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

// === UTILITAIRES ARRAY ===

/**
 * Mélange un tableau (shuffle)
 * @param {Array} array - Tableau à mélanger
 * @returns {Array} - Nouveau tableau mélangé
 */
function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Retire les doublons d'un tableau
 * @param {Array} array - Tableau avec doublons
 * @param {string|Function} key - Clé ou fonction pour identifier les doublons
 * @returns {Array} - Tableau sans doublons
 */
function removeDuplicates(array, key = null) {
    if (!key) {
        return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
        const identifier = typeof key === 'function' ? key(item) : item[key];
        if (seen.has(identifier)) {
            return false;
        }
        seen.add(identifier);
        return true;
    });
}

/**
 * Groupe les éléments d'un tableau par clé
 * @param {Array} array - Tableau à grouper
 * @param {string|Function} key - Clé ou fonction de groupage
 * @returns {Object} - Objet groupé
 */
function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = typeof key === 'function' ? key(item) : item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
}

/**
 * Divise un tableau en chunks
 * @param {Array} array - Tableau à diviser
 * @param {number} size - Taille des chunks
 * @returns {Array} - Tableau de chunks
 */
function chunk(array, size = 10) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// === UTILITAIRES OBJECT ===

/**
 * Clonage profond d'un objet
 * @param {Object} obj - Objet à cloner
 * @returns {Object} - Clone de l'objet
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Set) return new Set([...obj].map(item => deepClone(item)));
    if (obj instanceof Map) return new Map([...obj].map(([key, val]) => [deepClone(key), deepClone(val)]));
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
    });
    
    return cloned;
}

/**
 * Fusionne des objets profondément
 * @param {Object} target - Objet cible
 * @param {...Object} sources - Objets sources
 * @returns {Object} - Objet fusionné
 */
function deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!target[key]) target[key] = {};
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        });
    }
    
    return deepMerge(target, ...sources);
}

/**
 * Vérifie si une valeur est un objet
 * @param {*} item - Valeur à vérifier
 * @returns {boolean} - Est un objet ou non
 */
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Obtient une valeur profonde dans un objet
 * @param {Object} obj - Objet source
 * @param {string} path - Chemin (ex: 'user.profile.name')
 * @param {*} defaultValue - Valeur par défaut
 * @returns {*} - Valeur trouvée ou défaut
 */
function getDeepValue(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return defaultValue;
        }
    }
    
    return result;
}

/**
 * Définit une valeur profonde dans un objet
 * @param {Object} obj - Objet cible
 * @param {string} path - Chemin (ex: 'user.profile.name')
 * @param {*} value - Valeur à définir
 */
function setDeepValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
        if (!(key in current) || !isObject(current[key])) {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
}

// === UTILITAIRES VALIDATION ===

/**
 * Valide une adresse email
 * @param {string} email - Email à valider
 * @returns {boolean} - Email valide ou non
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valide un URL
 * @param {string} url - URL à valider
 * @returns {boolean} - URL valide ou non
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Valide des coordonnées géographiques
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} - Coordonnées valides ou non
 */
function isValidCoordinates(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' &&
           lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Valide un nom d'utilisateur
 * @param {string} username - Nom d'utilisateur
 * @returns {boolean} - Nom valide ou non
 */
function isValidUsername(username) {
    return typeof username === 'string' && 
           username.length >= 2 && 
           username.length <= 50 && 
           /^[a-zA-Z0-9\s\-_àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]+$/i.test(username);
}

// === UTILITAIRES GÉOGRAPHIQUES ===

/**
 * Calcule la distance entre deux points GPS
 * @param {number} lat1 - Latitude point 1
 * @param {number} lng1 - Longitude point 1
 * @param {number} lat2 - Latitude point 2
 * @param {number} lng2 - Longitude point 2
 * @returns {number} - Distance en mètres
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
}

/**
 * Formate une distance en unité lisible
 * @param {number} distanceInMeters - Distance en mètres
 * @returns {string} - Distance formatée
 */
function formatDistance(distanceInMeters) {
    if (distanceInMeters < 1000) {
        return `${Math.round(distanceInMeters)} m`;
    } else {
        return `${(distanceInMeters / 1000).toFixed(1)} km`;
    }
}

/**
 * Vérifie si un point est dans les limites de Paris
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} - Dans Paris ou non
 */
function isInParis(lat, lng) {
    // Limites approximatives de Paris
    const bounds = {
        north: 48.902,
        south: 48.815,
        east: 2.469,
        west: 2.224
    };
    
    return lat >= bounds.south && lat <= bounds.north && 
           lng >= bounds.west && lng <= bounds.east;
}

// === UTILITAIRES COULEUR ===

/**
 * Convertit HEX vers RGB
 * @param {string} hex - Couleur hexadécimale
 * @returns {Object} - Objet RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Convertit RGB vers HEX
 * @param {number} r - Rouge (0-255)
 * @param {number} g - Vert (0-255)
 * @param {number} b - Bleu (0-255)
 * @returns {string} - Couleur hexadécimale
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Génère une couleur basée sur une chaîne
 * @param {string} str - Chaîne source
 * @returns {string} - Couleur hexadécimale
 */
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const color = Math.abs(hash).toString(16).substring(0, 6);
    return '#' + '000000'.substring(0, 6 - color.length) + color;
}

// === UTILITAIRES PERFORMANCE ===

/**
 * Mesure le temps d'exécution d'une fonction
 * @param {Function} func - Fonction à mesurer
 * @param {string} label - Label pour l'affichage
 * @returns {*} - Résultat de la fonction
 */
function measureTime(func, label = 'Function') {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    console.log(`⏱️ ${label} exécutée en ${(end - start).toFixed(2)}ms`);
    return result;
}

/**
 * Crée un cache LRU simple
 * @param {number} maxSize - Taille maximum du cache
 * @returns {Object} - Objet cache avec méthodes
 */
function createLRUCache(maxSize = 100) {
    const cache = new Map();
    
    return {
        get(key) {
            if (cache.has(key)) {
                const value = cache.get(key);
                cache.delete(key);
                cache.set(key, value);
                return value;
            }
            return null;
        },
        
        set(key, value) {
            if (cache.has(key)) {
                cache.delete(key);
            } else if (cache.size >= maxSize) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            cache.set(key, value);
        },
        
        has(key) {
            return cache.has(key);
        },
        
        clear() {
            cache.clear();
        },
        
        get size() {
            return cache.size;
        }
    };
}

// === UTILITAIRES STOCKAGE ===

/**
 * Stockage local sécurisé avec fallback
 * @param {string} key - Clé de stockage
 * @param {*} value - Valeur à stocker (optionnel, pour get)
 * @returns {*} - Valeur stockée ou null
 */
function storage(key, value = undefined) {
    try {
        if (value === undefined) {
            // GET
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } else {
            // SET
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        }
    } catch (error) {
        console.warn('⚠️ Erreur localStorage:', error);
        return value === undefined ? null : false;
    }
}

/**
 * Supprime du stockage local
 * @param {string} key - Clé à supprimer
 * @returns {boolean} - Succès ou échec
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn('⚠️ Erreur suppression localStorage:', error);
        return false;
    }
}

/**
 * Vérifie la disponibilité du localStorage
 * @returns {boolean} - Disponible ou non
 */
function isStorageAvailable() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}

// === UTILITAIRES DEVICE ===

/**
 * Détecte le type d'appareil
 * @returns {string} - Type d'appareil (mobile, tablet, desktop)
 */
function getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    
    if (/android|iphone|ipad|ipod|blackberry|iemobile/i.test(userAgent)) {
        return width > 768 ? 'tablet' : 'mobile';
    }
    
    return width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
}

/**
 * Vérifie si on est sur mobile
 * @returns {boolean} - Sur mobile ou non
 */
function isMobile() {
    return getDeviceType() === 'mobile';
}

/**
 * Vérifie si on est sur tablette
 * @returns {boolean} - Sur tablette ou non
 */
function isTablet() {
    return getDeviceType() === 'tablet';
}

/**
 * Vérifie si on est sur desktop
 * @returns {boolean} - Sur desktop ou non
 */
function isDesktop() {
    return getDeviceType() === 'desktop';
}

/**
 * Détecte les capacités de l'appareil
 * @returns {Object} - Objet avec les capacités
 */
function getDeviceCapabilities() {
    return {
        touchSupport: 'ontouchstart' in window,
        geolocation: 'geolocation' in navigator,
        serviceWorker: 'serviceWorker' in navigator,
        notification: 'Notification' in window,
        speech: 'speechSynthesis' in window,
        recognition: 'webkitSpeechRecognition' in window,
        camera: 'mediaDevices' in navigator,
        storage: isStorageAvailable(),
        vibration: 'vibrate' in navigator
    };
}

// === UTILITAIRES RÉSEAU ===

/**
 * Vérifie l'état de la connexion
 * @returns {boolean} - En ligne ou non
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * Attend la connexion réseau
 * @returns {Promise} - Promise résolue quand en ligne
 */
function waitForOnline() {
    return new Promise(resolve => {
        if (navigator.onLine) {
            resolve();
        } else {
            const handleOnline = () => {
                window.removeEventListener('online', handleOnline);
                resolve();
            };
            window.addEventListener('online', handleOnline);
        }
    });
}

// === UTILITAIRES ÉVÉNEMENTS ===

/**
 * Crée un émetteur d'événements simple
 * @returns {Object} - Émetteur d'événements
 */
function createEventEmitter() {
    const events = {};
    
    return {
        on(event, callback) {
            if (!events[event]) events[event] = [];
            events[event].push(callback);
        },
        
        off(event, callback) {
            if (events[event]) {
                events[event] = events[event].filter(cb => cb !== callback);
            }
        },
        
        emit(event, ...args) {
            if (events[event]) {
                events[event].forEach(callback => callback(...args));
            }
        },
        
        once(event, callback) {
            const onceCallback = (...args) => {
                callback(...args);
                this.off(event, onceCallback);
            };
            this.on(event, onceCallback);
        }
    };
}

// === EXPORT DES UTILITAIRES ===

// Export pour utilisation dans d'autres modules
if (typeof window !== 'undefined') {
    window.Utils = {
        // Base
        debounce,
        throttle,
        generateUUID,
        formatDate,
        formatNumber,
        
        // DOM
        $,
        $$,
        createElement,
        addClassWithDelay,
        removeClassWithDelay,
        isElementVisible,
        
        // String
        capitalize,
        toCamelCase,
        toKebabCase,
        removeAccents,
        slugify,
        truncate,
        stripHtml,
        
        // Array
        shuffle,
        removeDuplicates,
        groupBy,
        chunk,
        
        // Object
        deepClone,
        deepMerge,
        isObject,
        getDeepValue,
        setDeepValue,
        
        // Validation
        isValidEmail,
        isValidUrl,
        isValidCoordinates,
        isValidUsername,
        
        // Géographie
        calculateDistance,
        formatDistance,
        isInParis,
        
        // Couleur
        hexToRgb,
        rgbToHex,
        stringToColor,
        
        // Performance
        measureTime,
        createLRUCache,
        
        // Stockage
        storage,
        removeFromStorage,
        isStorageAvailable,
        
        // Device
        getDeviceType,
        isMobile,
        isTablet,
        isDesktop,
        getDeviceCapabilities,
        
        // Réseau
        isOnline,
        waitForOnline,
        
        // Événements
        createEventEmitter
    };
    
    console.log('🛠️ Utilitaires chargés:', Object.keys(window.Utils).length, 'fonctions disponibles');
}

// === POLYFILLS SIMPLES ===

// Polyfill pour Object.entries (IE)
if (!Object.entries) {
    Object.entries = function(obj) {
        return Object.keys(obj).map(key => [key, obj[key]]);
    };
}

// Polyfill pour Object.values (IE)
if (!Object.values) {
    Object.values = function(obj) {
        return Object.keys(obj).map(key => obj[key]);
    };
}

// Polyfill pour Array.includes (IE)
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
        return this.indexOf(searchElement, fromIndex) !== -1;
    };
}
