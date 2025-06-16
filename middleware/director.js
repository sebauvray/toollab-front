import userService from '~/services/user'

export default defineNuxtRouteMiddleware(async (to, from) => {
    const { user } = useAuth()

    if (!user.value) {
        return navigateTo('/login')
    }

    try {
        const schoolId = localStorage.getItem('current_school_id')
        if (!schoolId) {
            return navigateTo('/')
        }

        const response = await userService.getUserRoles(user.value.id)
        const userRoles = response.roles

        console.log(userRoles);

        const isDirector = userRoles.schools?.some(schoolRole =>
            schoolRole.context.id === parseInt(schoolId) &&
            schoolRole.role.toLowerCase() === 'director'
        )

        if (!isDirector) {
            return navigateTo('/')
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error)
        return navigateTo('/')
    }
})