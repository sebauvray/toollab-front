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

    let user
    try {
        user = JSON.parse(userJson)
    } catch {
        return navigateTo('/login')
    }

    if (!user?.is_super_admin) {
        return navigateTo('/')
    }
})
