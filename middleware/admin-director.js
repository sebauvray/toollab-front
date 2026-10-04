import { redirectTo } from '~/utils/navigation'
import userService from '~/services/user'
import { getSchoolRoles, readActiveSchoolRole } from '~/utils/schoolRoles'

export default defineNuxtRouteMiddleware(async (to, from) => {
    if (process.server) return

    const token = localStorage.getItem('auth.token')
    if (!token) {
        return redirectTo('/login')
    }

    const userJson = localStorage.getItem('auth.user')
    if (!userJson) {
        return redirectTo('/login')
    }

    let user
    try {
        user = JSON.parse(userJson)
    } catch {
        return redirectTo('/login')
    }

    if (user?.is_super_admin) return

    try {
        const schoolId = localStorage.getItem('current_school_id')
        if (!schoolId) {
            return redirectTo('/select-school')
        }

        const response = await userService.getUserRoles(user.id)

        // Le rôle actif doit être director/admin ET réellement détenu côté serveur
        // pour cette école : la séparation des rôles bloque aussi l'accès par URL.
        const activeRole = readActiveSchoolRole()
        const serverSlugs = getSchoolRoles(response.roles?.schools || [], parseInt(schoolId)).map(r => r.slug)
        const hasAccess = ['director', 'admin'].includes(activeRole) && serverSlugs.includes(activeRole)

        if (!hasAccess) {
            return redirectTo('/')
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error)
        return redirectTo('/')
    }
})
