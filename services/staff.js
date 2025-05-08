import apiClient from './api'

export default {
    async createStaffUser(staffData) {
        try {
            const response = await apiClient.post('/api/users/create-staff', staffData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la création du membre du personnel:', error)
            throw error
        }
    },

    async removeUserRole(removeData) {
        try {
            const response = await apiClient.post('/api/users/remove-role', removeData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la suppression du rôle de l\'utilisateur:', error)
            throw error
        }
    },

    async getSchoolUsers(schoolId) {
        try {
            const response = await apiClient.get(`/api/users/school/${schoolId}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération des utilisateurs de l'école ${schoolId}:`, error)
            throw error
        }
    }
}