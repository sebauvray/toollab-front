import apiClient from './api'

export default {
    async getCursusTarifs() {
        try {
            const response = await apiClient.get('/api/tarification/cursus')
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des tarifs:', error)
            throw error
        }
    },

    async updateTarif(cursusId, prix) {
        try {
            const response = await apiClient.post(`/api/tarification/cursus/${cursusId}/tarif`, { prix })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la mise à jour du tarif:', error)
            throw error
        }
    },

    async addReductionFamiliale(cursusId, data) {
        try {
            const response = await apiClient.post(`/api/tarification/cursus/${cursusId}/reduction-familiale`, data)
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la réduction familiale:', error)
            throw error
        }
    },

    async updateReductionFamiliale(reductionId, data) {
        try {
            const response = await apiClient.put(`/api/tarification/reduction-familiale/${reductionId}`, data)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la réduction familiale:', error)
            throw error
        }
    },

    async deleteReductionFamiliale(reductionId) {
        try {
            const response = await apiClient.delete(`/api/tarification/reduction-familiale/${reductionId}`)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la suppression de la réduction familiale:', error)
            throw error
        }
    },

    async addReductionMultiCursus(cursusId, data) {
        try {
            const response = await apiClient.post(`/api/tarification/cursus/${cursusId}/reduction-multi-cursus`, data)
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la réduction multi-cursus:', error)
            throw error
        }
    },

    async updateReductionMultiCursus(reductionId, data) {
        try {
            const response = await apiClient.put(`/api/tarification/reduction-multi-cursus/${reductionId}`, data)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la réduction multi-cursus:', error)
            throw error
        }
    },

    async deleteReductionMultiCursus(reductionId) {
        try {
            const response = await apiClient.delete(`/api/tarification/reduction-multi-cursus/${reductionId}`)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la suppression de la réduction multi-cursus:', error)
            throw error
        }
    },

    async calculerTarifs(familyId, inscriptions) {
        try {
            const response = await apiClient.post('/api/tarification/calculer', {
                family_id: familyId,
                inscriptions: inscriptions
            })
            return response.data
        } catch (error) {
            console.error('Erreur lors du calcul des tarifs:', error)
            throw error
        }
    }
}