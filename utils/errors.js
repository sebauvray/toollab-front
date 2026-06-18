export function getErrorMessage(error, fallback = 'Une erreur est survenue.') {
  const data = error?.response?.data
  const validationErrors = data?.errors

  if (validationErrors && typeof validationErrors === 'object') {
    const firstMessages = Object.values(validationErrors).find((messages) => Array.isArray(messages) && messages.length)

    if (firstMessages?.[0]) {
      return normalizeFrenchMessage(firstMessages[0], fallback)
    }
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return normalizeFrenchMessage(data.message, fallback)
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return normalizeFrenchMessage(data.error, fallback)
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return normalizeFrenchMessage(error.message, fallback)
  }

  return fallback
}

function normalizeFrenchMessage(message, fallback) {
  const normalized = message.trim()
  const lower = normalized.toLowerCase()

  const translations = {
    'network error': 'Impossible de joindre le serveur.',
    'request failed with status code 400': 'La requête est invalide.',
    'request failed with status code 401': 'Votre session a expiré. Veuillez vous reconnecter.',
    'request failed with status code 403': 'Vous n’avez pas les droits nécessaires pour effectuer cette action.',
    'request failed with status code 404': 'La ressource demandée est introuvable.',
    'request failed with status code 409': 'Cette action n’est pas possible dans l’état actuel.',
    'request failed with status code 422': 'Certaines informations sont invalides.',
    'request failed with status code 429': 'Trop de tentatives. Veuillez réessayer plus tard.',
    'request failed with status code 500': 'Une erreur serveur est survenue.',
    'the given data was invalid.': 'Certaines informations sont invalides.',
    'unauthenticated.': 'Votre session a expiré. Veuillez vous reconnecter.',
    'unauthorized': 'Vous n’avez pas les droits nécessaires pour effectuer cette action.',
    'forbidden': 'Vous n’avez pas les droits nécessaires pour effectuer cette action.',
    'not found': 'La ressource demandée est introuvable.',
    'server error': 'Une erreur serveur est survenue.'
  }

  return translations[lower] || normalized || fallback
}
