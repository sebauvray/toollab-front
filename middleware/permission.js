import { redirectTo } from '~/utils/navigation'
import userService from '~/services/user'
import { getSchoolRoles, readActiveSchoolRole, writeCurrentSchoolRoles } from '~/utils/schoolRoles'

// Page réservée : definePageMeta({ middleware: 'permission', permission: 'cursus.manage' }).
// Vérifié contre le serveur : le rôle actif doit être réellement détenu dans
// l'école et donner la permission (la bascule de rôle bloque aussi l'accès par URL).
export default defineNuxtRouteMiddleware(async (to) => {
    if (process.server) return

    const token = localStorage.getItem('auth.token')
    const userJson = localStorage.getItem('auth.user')
    if (!token || !userJson) {
        return redirectTo('/login')
    }

    let user
    try {
        user = JSON.parse(userJson)
    } catch {
        return redirectTo('/login')
    }

    if (user?.is_super_admin) return

    const required = [].concat(to.meta.permission || [])
    if (!required.length) return

    try {
        const schoolId = localStorage.getItem('current_school_id')
        if (!schoolId) {
            return redirectTo('/select-school')
        }

        const response = await userService.getUserRoles(user.id)
        const serverRoles = getSchoolRoles(response.roles?.schools || [], parseInt(schoolId))
        writeCurrentSchoolRoles(serverRoles)

        const activeRole = serverRoles.find(role => role.slug === readActiveSchoolRole())
        const hasAccess = !!activeRole && required.some(permission => activeRole.permissions.includes(permission))

        if (!hasAccess) {
            return redirectTo('/')
        }
    } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error)
        return redirectTo('/')
    }
})
