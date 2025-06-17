import apiClient from './api'

export default {
    async getDetailsPaiement(familyId) {
        try {
            const response = await apiClient.get(`/api/families/${familyId}/paiements`)
            return response.data
        } catch (error) {
            console.error('Erreur lors du chargement des paiements:', error)
            throw error
        }
    },

    async ajouterLigne(familyId, data) {
        try {
            const response = await apiClient.post(`/api/families/${familyId}/paiements/lignes`, data)
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'ajout du paiement:', error)
            throw error
        }
    },

    async modifierLigne(familyId, ligneId, data) {
        try {
            const response = await apiClient.put(`/api/families/${familyId}/paiements/lignes/${ligneId}`, data)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la modification du paiement:', error)
            throw error
        }
    },

    async supprimerLigne(familyId, ligneId) {
        try {
            const response = await apiClient.delete(`/api/families/${familyId}/paiements/lignes/${ligneId}`)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la suppression du paiement:', error)
            throw error
        }
    }
}