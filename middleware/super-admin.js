import { redirectTo } from '~/utils/navigation'

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

    if (!user?.is_super_admin) {
        return redirectTo('/')
    }
})
