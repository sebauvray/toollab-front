import apiClient from './api'

export default {
    async getMine() {
        try {
            const response = await apiClient.get('/api/me/invitations')
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des invitations:', error)
            throw error
        }
    },

    async accept(schoolId) {
        try {
            const response = await apiClient.post('/api/me/invitations/accept', { school_id: schoolId })
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'acceptation de l\'invitation:', error)
            throw error
        }
    },

    async decline(schoolId) {
        try {
            const response = await apiClient.post('/api/me/invitations/decline', { school_id: schoolId })
            return response.data
        } catch (error) {
            console.error('Erreur lors du refus de l\'invitation:', error)
            throw error
        }
    }
}
