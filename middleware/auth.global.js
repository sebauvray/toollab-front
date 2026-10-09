import { redirectTo } from '~/utils/navigation'
import { isTeachingOnlyView } from '~/utils/schoolRoles'

export default defineNuxtRouteMiddleware((to) => {
    const publicPages = ['/login', '/contact', '/forgot-password', '/reset-password', '/set-password', '/passation-direction'];
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
            return redirectTo('/login');
        }

        if (isAuthenticated && to.path === '/login') {
            return redirectTo('/');
        }

        const noSchoolNeeded = [
            '/login', '/contact', '/forgot-password', '/reset-password',
            '/set-password', '/select-school', '/passation-direction'
        ];
        const isAdminPath = to.path.startsWith('/admin');
        if (
            isAuthenticated &&
            !noSchoolNeeded.includes(to.path) &&
            !isAdminPath
        ) {
            const schoolId = localStorage.getItem('current_school_id');
            if (!schoolId) {
                return redirectTo({
                    path: '/select-school',
                    query: { redirect: to.fullPath },
                });
            }
        }

        const hasRoleCache = localStorage.getItem('current_school_roles') !== null;
        const isTeacher = hasRoleCache && isTeachingOnlyView();
        const teacherAllowed = to.path.startsWith('/professeur')
            || to.path === '/settings'
            || noSchoolNeeded.includes(to.path);
        if (isAuthenticated && !isSuperAdmin && isTeacher && !teacherAllowed) {
            return redirectTo('/professeur/classes');
        }
    }
});
