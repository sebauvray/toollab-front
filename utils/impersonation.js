import { clearCurrentSchoolRoles } from '~/utils/schoolRoles'

// Clés de session sauvegardées avant l'impersonation et restaurées à la sortie
const SESSION_KEYS = ['auth.token', 'auth.user', 'current_school_id', 'current_school_year_id']
const BACKUP_KEY = 'impersonation.admin'
const INFO_KEY = 'impersonation.info'

export function getImpersonation() {
    if (typeof localStorage === 'undefined') return null
    try {
        return JSON.parse(localStorage.getItem(INFO_KEY) || 'null')
    } catch {
        return null
    }
}

export function isImpersonating() {
    return !!getImpersonation()
}

/** Bascule sur la session de l'utilisateur cible (réponse de POST /api/admin/users/{id}/impersonate). */
export function enterImpersonation({ token, user, impersonation }) {
    const backup = Object.fromEntries(SESSION_KEYS.map(k => [k, localStorage.getItem(k)]))
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))

    SESSION_KEYS.forEach(k => localStorage.removeItem(k))
    clearCurrentSchoolRoles()

    localStorage.setItem('auth.token', token)
    localStorage.setItem('auth.user', JSON.stringify(user))
    localStorage.setItem(INFO_KEY, JSON.stringify({
        ...impersonation,
        target: { id: user.id, name: `${user.first_name} ${user.last_name}`, email: user.email }
    }))

    // Rechargement complet : aucun état de l'admin ne doit survivre en mémoire
    window.location.href = '/'
}

/** Restaure la session admin, sans appel réseau (le token d'impersonation est révoqué par l'appelant). */
export function restoreAdminSession(redirect = '/admin/users') {
    let backup = {}
    try {
        backup = JSON.parse(localStorage.getItem(BACKUP_KEY) || '{}')
    } catch { /* sauvegarde illisible : retour au login */ }

    SESSION_KEYS.forEach(k => localStorage.removeItem(k))
    clearCurrentSchoolRoles()
    localStorage.removeItem(BACKUP_KEY)
    localStorage.removeItem(INFO_KEY)

    SESSION_KEYS.forEach(k => {
        if (backup[k] != null) localStorage.setItem(k, backup[k])
    })

    window.location.href = backup['auth.token'] ? redirect : '/login'
}
