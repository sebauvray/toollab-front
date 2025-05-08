import { useApi } from './api'

export default {
    async login(credentials) {
        try {
            const axios = useApi()
            const response = await axios.post('/api/login', credentials)

            if (response.data && response.data.token) {
                localStorage.setItem('auth.token', response.data.token)
                localStorage.setItem('auth.user', JSON.stringify(response.data.user))

                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`
            }

            return response.data
        } catch (error) {
            throw error
        }
    },

    async logout() {
        const axios = useApi()
        try {
            await axios.post('/api/logout')
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error)
        } finally {
            localStorage.removeItem('auth.token')
            localStorage.removeItem('auth.user')
            delete axios.defaults.headers.common['Authorization']
        }
    },

    async register(userData) {
        const axios = useApi()
        const response = await axios.post('/api/register', userData)

        if (response.data && response.data.token) {
            localStorage.setItem('auth.token', response.data.token)
            localStorage.setItem('auth.user', JSON.stringify(response.data.user))

            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`
        }

        return response.data
    },

    async forgotPassword(email) {
        try {
            const axios = useApi()
            const response = await axios.post('/api/forgot-password', { email })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la demande de réinitialisation du mot de passe:', error)
            throw error
        }
    },

    async resetPassword(resetData) {
        try {
            const axios = useApi()
            const response = await axios.post('/api/reset-password', resetData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la réinitialisation du mot de passe:', error)
            throw error
        }
    },

    async checkResetToken(tokenData) {
        try {
            const axios = useApi()
            const response = await axios.post('/api/check-reset-token', tokenData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la vérification du token de réinitialisation:', error)
            throw error
        }
    },

    async checkInvitationToken(tokenData) {
        try {
            const axios = useApi()
            const response = await axios.post('/api/check-invitation-token', tokenData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la vérification du token d\'invitation:', error)
            throw error
        }
    },

    async setPassword(passwordData) {
        try {
            const axios = useApi()
            const response = await axios.post('/api/set-password', passwordData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la définition du mot de passe:', error)
            throw error
        }
    },

    getUser() {
        if (process.client) {
            const userJson = localStorage.getItem('auth.user')
            return userJson ? JSON.parse(userJson) : null
        }
        return null
    },

    isAuthenticated() {
        if (process.client) {
            return !!localStorage.getItem('auth.token')
        }
        return false
    }
}