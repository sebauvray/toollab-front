export const ROLE_LABELS = {
    director: 'Directeur',
    admin: 'Administrateur',
    registar: 'Responsable des inscriptions',
    teacher: 'Professeur',
    'super-admin': 'Super-admin'
}

export const SCHOOL_ROLES_UPDATED_EVENT = 'school-roles-updated'

const ROLE_PRIORITY = ['director', 'admin', 'registar', 'teacher', 'super-admin']
const LEGACY_ROLE_SLUGS = Object.fromEntries(
    Object.entries(ROLE_LABELS).map(([slug, label]) => [label.toLocaleLowerCase('fr'), slug])
)

const getStorage = (storage) => {
    if (storage) return storage
    if (typeof localStorage !== 'undefined') return localStorage
    return null
}

const sortRoleSlugs = (roles) => [...roles].sort((a, b) => {
    const indexA = ROLE_PRIORITY.indexOf(a)
    const indexB = ROLE_PRIORITY.indexOf(b)
    if (indexA === -1 && indexB === -1) return a.localeCompare(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
})

export const getRoleSlug = (roleEntry) => {
    if (!roleEntry) return ''
    if (roleEntry.role_slug) return String(roleEntry.role_slug).toLowerCase()

    const legacyRole = String(roleEntry.role || '').toLocaleLowerCase('fr')
    return LEGACY_ROLE_SLUGS[legacyRole] || legacyRole
}

export const getSchoolRoles = (roleEntries = [], schoolId) => {
    const rolesBySlug = new Map()

    roleEntries
        .filter(entry => Number(entry.context?.id) === Number(schoolId))
        .forEach(entry => {
            const slug = getRoleSlug(entry)
            if (!slug || rolesBySlug.has(slug)) return
            rolesBySlug.set(slug, {
                slug,
                label: entry.role || ROLE_LABELS[slug] || slug
            })
        })

    return sortRoleSlugs(rolesBySlug.keys()).map(slug => rolesBySlug.get(slug))
}

export const groupSchoolRoles = (roleEntries = []) => {
    const grouped = {}
    const schoolIds = [...new Set(roleEntries.map(entry => Number(entry.context?.id)).filter(Boolean))]

    schoolIds.forEach(schoolId => {
        grouped[schoolId] = getSchoolRoles(roleEntries, schoolId)
    })

    return grouped
}

export const roleSlugs = (roles = []) => sortRoleSlugs(new Set(
    roles.map(role => typeof role === 'string' ? role : role?.slug).filter(Boolean)
))

export const hasAnyRole = (roles, allowedRoles) => {
    const current = roleSlugs(roles)
    return allowedRoles.some(role => current.includes(role))
}

export const isTeacherOnly = (roles) => {
    const current = roleSlugs(roles)
    return current.length === 1 && current[0] === 'teacher'
}

export const writeCurrentSchoolRoles = (roles, storage) => {
    const target = getStorage(storage)
    if (!target) return
    const slugs = roleSlugs(roles)
    target.setItem('current_school_roles', JSON.stringify(slugs))
    target.removeItem('current_school_role')

    // Garantit un rôle actif valide : on conserve l'actif courant s'il fait
    // toujours partie des rôles disponibles, sinon on retombe sur le premier.
    const currentActive = target.getItem('current_school_active_role')
    if (!currentActive || !slugs.includes(currentActive)) {
        if (slugs.length) {
            target.setItem('current_school_active_role', slugs[0])
        } else {
            target.removeItem('current_school_active_role')
        }
    }
}

export const setActiveSchoolRole = (slug, storage) => {
    const target = getStorage(storage)
    if (!target) return
    if (!slug) {
        target.removeItem('current_school_active_role')
        return
    }
    target.setItem('current_school_active_role', String(slug).toLowerCase())
}

export const readCurrentSchoolRoles = (storage) => {
    const target = getStorage(storage)
    if (!target) return []

    const rawRoles = target.getItem('current_school_roles')
    if (rawRoles) {
        try {
            const parsed = JSON.parse(rawRoles)
            if (Array.isArray(parsed)) return roleSlugs(parsed)
        } catch {
            target.removeItem('current_school_roles')
        }
    }

    const legacyRole = target.getItem('current_school_role')
    if (!legacyRole) return []
    const slug = getRoleSlug({ role: legacyRole })
    return slug ? [slug] : []
}

// Rôle actif unique, validé contre la liste des rôles disponibles.
// Fallback sur le premier rôle disponible, '' si aucun.
export const readActiveSchoolRole = (storage) => {
    const available = readCurrentSchoolRoles(storage)
    if (!available.length) return ''

    const target = getStorage(storage)
    const active = target ? target.getItem('current_school_active_role') : null
    if (active && available.includes(active)) return active
    return available[0]
}

// Rôle actif sous forme de tableau (0 ou 1 élément), à utiliser par les
// contrôles de permission (hasAnyRole / isTeacherOnly).
export const readActiveSchoolRoles = (storage) => {
    const active = readActiveSchoolRole(storage)
    return active ? [active] : []
}

export const clearCurrentSchoolRoles = (storage) => {
    const target = getStorage(storage)
    if (!target) return
    target.removeItem('current_school_roles')
    target.removeItem('current_school_role')
    target.removeItem('current_school_active_role')
}
