export default defineNuxtRouteMiddleware((to) => {
    const publicPages = ['/login', '/contact', '/forgot-password', '/reset-password', '/set-password'];

    const requiresAuth = !publicPages.includes(to.path);

    if (process.client) {
        const token = localStorage.getItem('auth.token');
        const isAuthenticated = !!token;

        if (requiresAuth && !isAuthenticated) {
            return navigateTo('/login');
        }

        if (isAuthenticated && to.path === '/login') {
            return navigateTo('/');
        }
    }

    if (process.server) {
        if (requiresAuth) {
        }
    }
});