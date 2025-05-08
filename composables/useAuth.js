import { ref, readonly } from 'vue'
import authService from '~/services/auth'

const user = ref(null)
const isAuthenticated = ref(false)
const isLoading = ref(false)
const error = ref(null)

function syncFromStorage() {
    try {
        user.value = authService.getUser()
        isAuthenticated.value = authService.isAuthenticated()
    } catch (e) {
        localStorage.removeItem('auth.user')
        localStorage.removeItem('auth.token')
        user.value = null
        isAuthenticated.value = false
    }
}

async function initAuth() {
    if (process.client) {
        syncFromStorage()
    }
}

export function useAuth() {
    return {
        user: readonly(user),
        isAuthenticated: readonly(isAuthenticated),
        isLoading: readonly(isLoading),
        error: readonly(error),

        initAuth,

        login: async (credentials) => {
            isLoading.value = true
            error.value = null
            try {
                const response = await authService.login(credentials)
                user.value = response.user
                isAuthenticated.value = true
                return response
            } catch (err) {
                error.value = err.response?.data?.message || 'Une erreur est survenue lors de la connexion'
                throw err
            } finally {
                isLoading.value = false
            }
        },

        logout: async () => {
            isLoading.value = true
            error.value = null
            try {
                await authService.logout()
                user.value = null
                isAuthenticated.value = false
            } catch (err) {
                error.value = 'Une erreur est survenue lors de la déconnexion'
            } finally {
                isLoading.value = false
            }
        },

        register: async (userData) => {
            isLoading.value = true
            error.value = null
            try {
                const response = await authService.register(userData)
                user.value = response.user
                isAuthenticated.value = true
                return response
            } catch (err) {
                error.value = err.response?.data?.message || 'Une erreur est survenue lors de l\'inscription'
                throw err
            } finally {
                isLoading.value = false
            }
        }
    }
}
