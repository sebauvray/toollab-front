import { isTeacherOnly, readCurrentSchoolRoles } from '~/utils/schoolRoles'

export default defineNuxtRouteMiddleware((to) => {
    const publicPages = ['/login', '/contact', '/forgot-password', '/reset-password', '/set-password'];
    const requiresAuth = !publicPages.includes(to.path);

    if (process.client) {
        const token = localStorage.getItem('auth.token');
        const isAuthenticated = !!token;
        let isSuperAdmin = false;
        try {
            isSuperAdmin = !!JSON.parse(localStorage.getItem('auth.user') || 'null')?.is_super_admin;
        } catch {
            isSuperAdmin = false;
        }

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

        const hasRoleCache = localStorage.getItem('current_school_roles') !== null;
        const isTeacher = hasRoleCache && isTeacherOnly(readCurrentSchoolRoles());
        const teacherAllowed = to.path.startsWith('/professeur')
            || to.path === '/settings'
            || noSchoolNeeded.includes(to.path);
        if (isAuthenticated && !isSuperAdmin && isTeacher && !teacherAllowed) {
            return navigateTo('/professeur/classes');
        }
    }
});
