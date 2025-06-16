import userService from '~/services/user'

export default defineNuxtRouteMiddleware(async (to, from) => {
    if (process.server) return

    const token = localStorage.getItem('auth.token')
    if (!token) {
        return navigateTo('/login')
    }

    const userJson = localStorage.getItem('auth.user')
    if (!userJson) {
        return navigateTo('/login')
    }

    const user = JSON.parse(userJson)

    try {
        const schoolId = localStorage.getItem('current_school_id')
        if (!schoolId) {
            return navigateTo('/')
        }

        const response = await userService.getUserRoles(user.id)
        const userRoles = response.roles

        const isDirector = userRoles.schools?.some(schoolRole =>
            schoolRole.context.id === parseInt(schoolId) &&
            schoolRole.role === 'Directeur'
        )

        if (!isDirector) {
            return navigateTo('/')
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error)
        return navigateTo('/')
    }
})