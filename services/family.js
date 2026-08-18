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

    async exportStudents() {
        const response = await apiClient.get('/api/families/export', { responseType: 'blob' })
        return response.data
    },

    async downloadImportTemplate() {
        const response = await apiClient.get('/api/families/import-template', { responseType: 'blob' })
        return response.data
    },

    async importStudents(file) {
        const formData = new FormData()
        formData.append('file', file)
        const response = await apiClient.post('/api/families/import', formData, {
            headers: { 'Content-Type': undefined }
        })
        return response.data
    },

    async getImportStatus(importId) {
        const response = await apiClient.get(`/api/families/imports/${importId}`)
        return response.data
    },

    /** Chiffres affichés dans la fenêtre de confirmation, avant suppression. */
    async getDeletionPreview(familyId) {
        try {
            const response = await apiClient.get(`/api/families/${familyId}/deletion-preview`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la prévisualisation de suppression ${familyId}:`, error)
            throw error
        }
    },

    /** Archivage : la famille part dans l'archive, d'où elle peut être restaurée. */
    async deleteFamily(familyId) {
        try {
            const response = await apiClient.delete(`/api/families/${familyId}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la suppression de la famille ${familyId}:`, error)
            throw error
        }
    },

    /** Les familles archivées de l'année consultée, hors suppressions définitives. */
    async getTrashedFamilies() {
        try {
            const response = await apiClient.get('/api/families/trashed')
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération de la corbeille:', error)
            throw error
        }
    },

    /** Suppression définitive : la famille sort de l'archive et n'est plus restaurable. */
    async purgeFamily(familyId) {
        try {
            const response = await apiClient.post(`/api/families/${familyId}/purge`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la suppression définitive de la famille ${familyId}:`, error)
            throw error
        }
    },

    async restoreFamily(familyId) {
        try {
            const response = await apiClient.post(`/api/families/${familyId}/restore`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la restauration de la famille ${familyId}:`, error)
            throw error
        }
    },
}
