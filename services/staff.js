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

    async addUserRole(roleData) {
        try {
            const response = await apiClient.post('/api/users/add-role', roleData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'ajout du rôle à l\'utilisateur:', error)
            throw error
        }
    },

    async removeUserFromSchool(removeData) {
        try {
            const response = await apiClient.post('/api/users/remove-from-school', removeData)
            return response.data
        } catch (error) {
            console.error('Erreur lors du retrait de l\'utilisateur de l\'établissement:', error)
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
