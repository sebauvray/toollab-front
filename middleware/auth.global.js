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

        const noSchoolNeeded = [
            '/login', '/contact', '/forgot-password', '/reset-password',
            '/set-password', '/select-school'
        ];
        const isAdminPath = to.path.startsWith('/admin');
        if (
            isAuthenticated &&
            !noSchoolNeeded.includes(to.path) &&
            !isAdminPath
        ) {
            const schoolId = localStorage.getItem('current_school_id');
            if (!schoolId) {
                return navigateTo({
                    path: '/select-school',
                    query: { redirect: to.fullPath },
                });
            }
        }

        const isTeacher = localStorage.getItem('current_school_role') === 'Professeur';
        const teacherAllowed = to.path.startsWith('/professeur')
            || to.path === '/settings'
            || noSchoolNeeded.includes(to.path);
        if (isAuthenticated && isTeacher && !teacherAllowed) {
            return navigateTo('/professeur/classes');
        }
    }
});