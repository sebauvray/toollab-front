import apiClient from './api'

export default {

    async getFamilies(params = { page: 1, per_page: 10 }) {
        try {
            const response = await apiClient.get('/api/families', { params })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des familles:', error)
            throw error
        }
    },

    async getFamily(id) {
        try {
            const response = await apiClient.get(`/api/families/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération de la famille ${id}:`, error)
            throw error
        }
    },

    async createFamily(familyData) {
        try {
            const response = await apiClient.post('/api/families', familyData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la création de la famille:', error)
            throw error
        }
    },

    async addComment(familyId, content) {
        try {
            const response = await apiClient.post(`/api/families/${familyId}/comments`, { content })
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'ajout du commentaire:', error)
            throw error
        }
    },

    async addStudents(familyId, students) {
        try {
            const response = await apiClient.post(`/api/families/${familyId}/students`, { students })
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'ajout des élèves:', error)
            throw error
        }
    },

    async addResponsible(familyId, userId) {
        try {
            const response = await apiClient.post(`/api/families/${familyId}/responsibles`, { user_id: userId })
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'ajout du responsable:', error)
            throw error
        }
    }
}