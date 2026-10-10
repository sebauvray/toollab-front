// Helpers d'affichage partagés par les pages /admin

const STAFF_SLUGS = ['director', 'admin', 'registar', 'teacher']

export const isStaffRole = (slug) => STAFF_SLUGS.includes(slug)

/** Pastille de couleur d'un rôle : violet = directeur, bleu = staff, gris = famille. */
export function roleDotClass(slug) {
    if (slug === 'director') return 'bg-violet-500'
    return isStaffRole(slug) ? 'bg-blue-500' : 'bg-gray-400'
}

/** « Il y a 5 min », « Il y a 3 h », « Hier 14:32 », « Il y a 4 j », puis date. */
export function relativeTime(date) {
    if (!date) return 'Jamais'
    const d = new Date(date)
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
    if (diffMin < 1) return "À l'instant"
    if (diffMin < 60) return `Il y a ${diffMin} min`
    if (diffMin < 24 * 60) return `Il y a ${Math.floor(diffMin / 60)} h`
    const days = Math.floor(diffMin / (24 * 60))
    if (days === 1) return `Hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    if (days < 30) return `Il y a ${days} j`
    return d.toLocaleDateString('fr-FR')
}

export function fullDate(date) {
    return date ? new Date(date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : ''
}

/** Regroupe les rattachements par école : [{ school_id, school, roles: [...] }]. */
export function groupMemberships(memberships) {
    const groups = new Map()
    for (const m of memberships) {
        const key = m.school_id ?? 'none'
        if (!groups.has(key)) groups.set(key, { school_id: m.school_id, school: m.school, roles: [] })
        groups.get(key).roles.push(m)
    }
    return [...groups.values()]
}
