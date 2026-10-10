// Mise en forme des entrées du journal d'audit (pages /admin)

import { ROLE_LABELS } from '~/utils/schoolRoles'

export const AUDIT_CATEGORIES = [
    { value: '', label: 'Tout' },
    { value: 'staff,invitation', label: 'Équipes' },
    { value: 'role', label: 'Rôles' },
    { value: 'handover', label: 'Passations' },
    { value: 'family,user', label: 'Suppressions' },
    { value: 'school,school_year,feature', label: 'Écoles' },
    { value: 'impersonation', label: 'Support' }
]

const roleLabel = (slug) => ROLE_LABELS[slug] || slug

const FIELD_LABELS = {
    name: 'nom', email: 'email', phone: 'téléphone', address: 'adresse', zipcode: 'code postal',
    city: 'ville', country: 'pays', logo: 'logo', access: 'accès', siret: 'SIRET',
    vat_mode: 'régime de TVA', vat_number: 'n° de TVA'
}

/** Détail lisible d'une entrée, à partir de son `meta`. */
export function auditDetail(log) {
    const m = log.meta || {}
    const parts = []
    if (m.roles?.length) parts.push(m.roles.map(roleLabel).join(', '))
    if (m.fields?.length) parts.push(`champs : ${m.fields.map(f => FIELD_LABELS[f] || f).join(', ')}`)
    if (m.granted?.length) parts.push(`+ ${m.granted.length} permission(s)`)
    if (m.revoked?.length) parts.push(`− ${m.revoked.length} permission(s)`)
    if (m.renamed) parts.push(`renommé « ${m.renamed} »`)
    if (m.permissions?.length) parts.push(`${m.permissions.length} permission(s)`)
    if (m.to) parts.push(`vers ${m.to}`)
    if (m.new_director) parts.push(`nouveau directeur : ${m.new_director}`)
    if (m.outgoing_role) parts.push(`ancien directeur → ${m.outgoing_role === 'none' ? 'aucun rôle' : roleLabel(m.outgoing_role)}`)
    if (m.director) parts.push(`directeur : ${m.director}`)
    if (m.label) parts.push(m.label)
    if (m.reason) parts.push(`« ${m.reason} »`)
    if (m.subject) parts.push(`objet : « ${m.subject} »`)
    if (m.director_notified) parts.push('directeur prévenu')
    if (m.sessions_revoked) parts.push(`${m.sessions_revoked} session(s) coupée(s)`)
    if (m.feature) parts.push(`${m.feature} : ${m.enabled ? 'activée' : 'désactivée'}`)
    return parts.join(' · ')
}

/** Couleur de la pastille d'une action : rouge = retrait/suppression, vert = ajout, gris sinon. */
export function auditDotClass(action) {
    if (/(removed|deleted|purged|declined|cancelled|suspended|disabled)$/.test(action)) return 'bg-red-500'
    if (/(added|invited|created|accepted|restored|initiated|reactivated|enabled)$/.test(action)) return 'bg-green-500'
    if (action.startsWith('impersonation')) return 'bg-amber-500'
    return 'bg-gray-400'
}

/** Nom lisible depuis un label « Prénom Nom (email) ». */
export const shortLabel = (label) => label ? label.replace(/\s*\([^)]*\)\s*$/, '') : null
