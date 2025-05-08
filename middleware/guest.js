export default defineNuxtRouteMiddleware((to, from) => {
    if (process.server) return

    const isAuthenticated = localStorage.getItem('auth.token') !== null

    if (isAuthenticated && to.meta.guest) {
        return navigateTo('/')
    }
})