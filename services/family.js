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

    async updateStudent(familyId, studentId, studentData) {
        try {
            const response = await apiClient.put(`/api/families/${familyId}/students/${studentId}`, studentData)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de l'élève ${studentId}:`, error)
            throw error
        }
    },

    async deleteStudent(familyId, studentId) {
        try {
            const response = await apiClient.delete(`/api/families/${familyId}/students/${studentId}`);
            return response.data;
        } catch (error) {
            console.error(`❌ Erreur suppression élève ${studentId}:`, error);
            throw error;
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
    },

    async addResponsibleToFamily(familyId, newResponsible) {
        try {
            const response = await apiClient.post(`/api/families/${familyId}/responsible`, newResponsible)
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'ajout du responsable:', error)
            throw error
        }
    },

    async updateResponsible(familyId, responsibleId, responsibleData) {
        try {
            const response = await apiClient.put(`/api/families/${familyId}/responsible/${responsibleId}`, responsibleData)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la mise à jour du responsable ${responsibleId}:`, error)
            throw error
        }
    },
}