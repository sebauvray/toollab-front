export default defineNuxtRouteMiddleware((to, from) => {
    if (process.server) return

    const token = localStorage.getItem('auth.token')
    const isAuthenticated = !!token

    if (!isAuthenticated && to.meta.requiresAuth) {
        return navigateTo({
            path: '/login',
            query: { redirect: to.fullPath }
        })
    }

    if (isAuthenticated && to.path === '/login') {
        return navigateTo('/')
    }
})