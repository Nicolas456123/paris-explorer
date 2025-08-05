// ===== UTILS - FONCTIONS UTILITAIRES GLOBALES =====

// === UTILITAIRES DE DATES ===
const DateUtils = {
    /**
     * Formate une date en français
     */
    formatDate(date) {
        if (!date) return 'Jamais';
        
        const d = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - d);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Aujourd\'hui';
        if (diffDays === 1) return 'Hier';
        if (diffDays < 7) return `Il y a ${diffDays} jours`;
        if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
        
        return d.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    /**
     * Calcule la différence en jours entre deux dates
     */
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    },

    /**
     * Vérifie si une date est aujourd'hui
     */
    isToday(date) {
        const today = new Date();
        const d = new Date(date);
        return d.toDateString() === today.toDateString();
    },

    /**
     * Génère un timestamp ISO
     */
    now() {
        return new Date().toISOString();
    }
};

// === UTILITAIRES DE TEXTE ===
const TextUtils = {
    /**
     * Nettoie et normalise un texte pour créer un ID
     */
    createId(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ýÿ]/g, 'y')
            .replace(/[ñ]/g, 'n')
            .replace(/[ç]/g, 'c')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    },

    /**
     * Capitalise la première lettre
     */
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },

    /**
     * Tronque un texte avec ellipse
     */
    truncate(text, length = 100) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },

    /**
     * Surligne les termes de recherche dans un texte
     */
    highlight(text, searchTerm) {
        if (!searchTerm || !text) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark style="background: #F7DC6F; color: #1e3a8a; padding: 1px 3px; border-radius: 3px;">$1</mark>');
    },

    /**
     * Extrait les mots-clés d'un texte
     */
    extractKeywords(text) {
        const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'à', 'en', 'dans', 'sur', 'avec', 'pour', 'par', 'ce', 'cette', 'ces'];
        
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .filter((word, index, arr) => arr.indexOf(word) === index);
    }
};

// === UTILITAIRES DOM ===
const DOMUtils = {
    /**
     * Sélecteur sécurisé
     */
    $(selector) {
        return document.querySelector(selector);
    },

    /**
     * Sélecteur multiple sécurisé
     */
    $$(selector) {
        return Array.from(document.querySelectorAll(selector));
    },

    /**
     * Crée un élément DOM avec attributs
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (content) {
            element.textContent = content;
        }
        
        return element;
    },

    /**
     * Vide un élément de son contenu
     */
    empty(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    },

    /**
     * Anime un changement de nombre
     */
    animateNumber(element, from, to, duration = 1000, suffix = '') {
        const startTime = Date.now();
        const difference = to - from;
        
        const step = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Fonction d'easing
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(from + difference * easedProgress);
            
            element.textContent = current + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    },

    /**
     * Fait défiler vers un élément
     */
    scrollToElement(element, offset = 0) {
        const elementPosition = element.offsetTop;
        const offsetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
};

// === UTILITAIRES DE STOCKAGE ===
const StorageUtils = {
    /**
     * Sauvegarde sécurisée en localStorage
     */
    save(key, data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            console.log(`💾 Données sauvegardées: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Erreur sauvegarde ${key}:`, error);
            return false;
        }
    },

    /**
     * Chargement sécurisé depuis localStorage
     */
    load(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            
            const parsed = JSON.parse(item);
            console.log(`📥 Données chargées: ${key}`);
            return parsed;
        } catch (error) {
            console.error(`❌ Erreur chargement ${key}:`, error);
            return defaultValue;
        }
    },

    /**
     * Supprime une clé du localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            console.log(`🗑️ Données supprimées: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Erreur suppression ${key}:`, error);
            return false;
        }
    },

    /**
     * Vide tout le localStorage de l'app
     */
    clear(prefix = 'paris-explorer') {
        try {
            const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
            keys.forEach(key => localStorage.removeItem(key));
            console.log(`🧹 ${keys.length} clés supprimées avec préfixe: ${prefix}`);
            return true;
        } catch (error) {
            console.error('❌ Erreur nettoyage localStorage:', error);
            return false;
        }
    },

    /**
     * Calcule la taille du localStorage
     */
    getSize() {
        let total = 0;
        Object.keys(localStorage).forEach(key => {
            total += localStorage.getItem(key).length;
        });
        return {
            bytes: total,
            kb: Math.round(total / 1024 * 100) / 100,
            mb: Math.round(total / (1024 * 1024) * 100) / 100
        };
    }
};

// === UTILITAIRES DE VALIDATION ===
const ValidationUtils = {
    /**
     * Valide un nom d'utilisateur
     */
    validateUserName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const trimmed = name.trim();
        if (trimmed.length < 2) return false;
        if (trimmed.length > 50) return false;
        if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(trimmed)) return false;
        
        return true;
    },

    /**
     * Valide un email
     */
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Valide des coordonnées GPS
     */
    validateCoordinates(lat, lng) {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        return !isNaN(latitude) && 
               !isNaN(longitude) && 
               latitude >= -90 && 
               latitude <= 90 &&
               longitude >= -180 && 
               longitude <= 180;
    },

    /**
     * Valide une structure de données de lieu
     */
    validatePlace(place) {
        if (!place || typeof place !== 'object') return false;
        if (!place.name || typeof place.name !== 'string') return false;
        if (place.name.trim().length < 2) return false;
        
        return true;
    },

    /**
     * Valide une structure de données utilisateur
     */
    validateUserData(userData) {
        if (!userData || typeof userData !== 'object') return false;
        if (!this.validateUserName(userData.name)) return false;
        if (userData.visitedPlaces && !Array.isArray(userData.visitedPlaces) && !(userData.visitedPlaces instanceof Set)) return false;
        
        return true;
    }
};

// === UTILITAIRES MATHÉMATIQUES ===
const MathUtils = {
    /**
     * Clamp une valeur entre min et max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Interpole linéairement entre deux valeurs
     */
    lerp(a, b, t) {
        return a + (b - a) * this.clamp(t, 0, 1);
    },

    /**
     * Calcule un pourcentage
     */
    percentage(value, total) {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    },

    /**
     * Arrondit à un nombre de décimales
     */
    round(value, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    },

    /**
     * Génère un nombre aléatoire entre min et max
     */
    random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

// === UTILITAIRES D'ARRAYS ===
const ArrayUtils = {
    /**
     * Retire les doublons d'un array
     */
    unique(array) {
        return [...new Set(array)];
    },

    /**
     * Mélange un array (Fisher-Yates)
     */
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    /**
     * Groupe les éléments par propriété
     */
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    },

    /**
     * Trie un array par propriété
     */
    sortBy(array, key, ascending = true) {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    },

    /**
     * Divise un array en chunks
     */
    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
};

// === UTILITAIRES DE COULEURS ===
const ColorUtils = {
    /**
     * Convertit hex en RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    /**
     * Génère une couleur basée sur une chaîne
     */
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = hash % 360;
        return `hsl(${hue}, 65%, 50%)`;
    },

    /**
     * Détermine si une couleur est claire ou sombre
     */
    isLight(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return true;
        
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128;
    }
};

// === UTILITAIRES DE PERFORMANCE ===
const PerformanceUtils = {
    /**
     * Debounce une fonction
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle une fonction
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Mesure le temps d'exécution d'une fonction
     */
    measureTime(func, label = 'Execution') {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }
};

// === UTILITAIRES DE GÉOLOCALISATION ===
const GeoUtils = {
    /**
     * Calcule la distance entre deux points (Haversine)
     */
    distance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Rayon de la Terre en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Vérifie si des coordonnées sont dans Paris
     */
    isInParis(lat, lng) {
        // Bounding box approximative de Paris
        const parisBox = {
            north: 48.9021,
            south: 48.8155,
            east: 2.4699,
            west: 2.2242
        };
        
        return lat >= parisBox.south && 
               lat <= parisBox.north && 
               lng >= parisBox.west && 
               lng <= parisBox.east;
    }
};

// === EXPORT GLOBAL ===
window.Utils = {
    Date: DateUtils,
    Text: TextUtils,
    DOM: DOMUtils,
    Storage: StorageUtils,
    Validation: ValidationUtils,
    Math: MathUtils,
    Array: ArrayUtils,
    Color: ColorUtils,
    Performance: PerformanceUtils,
    Geo: GeoUtils
};
