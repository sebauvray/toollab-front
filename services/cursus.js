import apiClient from './api'

export default {
    async getCursus(params = {}) {
        try {
            const response = await apiClient.get('/api/cursus', { params })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des cursus:', error)
            throw error
        }
    },

    async getCursusById(id) {
        try {
            const response = await apiClient.get(`/api/cursus/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération du cursus ${id}:`, error)
            throw error
        }
    },

    async createCursus(cursusData) {
        try {
            const response = await apiClient.post('/api/cursus', cursusData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la création du cursus:', error)
            throw error
        }
    },

    async updateCursus(id, cursusData) {
        try {
            const response = await apiClient.put(`/api/cursus/${id}`, cursusData)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la mise à jour du cursus ${id}:`, error)
            throw error
        }
    },

    async deleteCursus(id) {
        try {
            const response = await apiClient.delete(`/api/cursus/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la suppression du cursus ${id}:`, error)
            throw error
        }
    }
}