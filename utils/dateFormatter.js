// frontend/utils/dateFormatter.js

/**
 * Formate une date en français
 * @param {String|Date} dateString - La date à formater
 * @param {Object} options - Options de formatage (voir Intl.DateTimeFormat)
 * @returns {String} Date formatée en français
 */
export function formatDateFr(dateString, options = {}) {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Vérifier si la date est valide
    if (isNaN(date.getTime())) return dateString;

    // Options par défaut
    const defaultOptions = {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    // Fusionner les options par défaut avec les options personnalisées
    const formatterOptions = { ...defaultOptions, ...options };

    return new Intl.DateTimeFormat('fr-FR', formatterOptions).format(date);
}

/**
 * Formate une date en format court en français (JJ/MM/AAAA)
 * @param {String|Date} dateString - La date à formater
 * @returns {String} Date formatée en français
 */
export function formatShortDateFr(dateString) {
    return formatDateFr(dateString, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: undefined,
        minute: undefined
    });
}

/**
 * Formate une date avec l'heure en français
 * @param {String|Date} dateString - La date à formater
 * @returns {String} Date et heure formatées en français
 */
export function formatDateTimeFr(dateString) {
    return formatDateFr(dateString);
}

/**
 * Retourne une date relative (il y a X minutes, aujourd'hui, etc.)
 * @param {String|Date} dateString - La date
 * @returns {String} Texte formaté en français
 */
export function formatRelativeDateFr(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Vérifier si la date est valide
    if (isNaN(date.getTime())) return dateString;

    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
    const now = new Date();
    const diffInSeconds = Math.floor((date - now) / 1000);

    // Moins d'une minute
    if (Math.abs(diffInSeconds) < 60) {
        return rtf.format(Math.floor(diffInSeconds), 'second');
    }

    // Moins d'une heure
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (Math.abs(diffInMinutes) < 60) {
        return rtf.format(diffInMinutes, 'minute');
    }

    // Moins d'un jour
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (Math.abs(diffInHours) < 24) {
        return rtf.format(diffInHours, 'hour');
    }

    // Moins d'un mois
    const diffInDays = Math.floor(diffInHours / 24);
    if (Math.abs(diffInDays) < 30) {
        return rtf.format(diffInDays, 'day');
    }

    // Moins d'un an
    const diffInMonths = Math.floor(diffInDays / 30);
    if (Math.abs(diffInMonths) < 12) {
        return rtf.format(diffInMonths, 'month');
    }

    // Plus d'un an
    const diffInYears = Math.floor(diffInDays / 365);
    return rtf.format(diffInYears, 'year');
}