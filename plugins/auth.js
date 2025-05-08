import { setupInterceptors } from '~/services/api'

export default defineNuxtPlugin(nuxtApp => {
    if (process.client) {
        setupInterceptors()
    }

    const isAuthenticated = () => {
        if (process.client) {
            return !!localStorage.getItem('auth.token')
        }
        return false
    }

    return {
        provide: {
            auth: {
                isAuthenticated,
                getUser: () => {
                    if (process.client) {
                        const userJson = localStorage.getItem('auth.user')
                        return userJson ? JSON.parse(userJson) : null
                    }
                    return null
                }
            }
        }
    }
})