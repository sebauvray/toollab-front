import apiClient from './api'

export default {
    async listSchedules(params = {}) {
        try {
            const response = await apiClient.get('/api/schedules', { params })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des créneaux:', error)
            throw error
        }
    }
}
