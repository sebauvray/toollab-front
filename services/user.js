import apiClient from './api'

export default {
    async getUsers(params = {}) {
        try {
            const response = await apiClient.get('/api/users', { params })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs:', error)
            throw error
        }
    },

    async getUser(id) {
        try {
            const response = await apiClient.get(`/api/users/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération de l'utilisateur ${id}:`, error)
            throw error
        }
    },

    async getUserRoles(id) {
        try {
            const response = await apiClient.get(`/api/users/${id}/roles`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération des rôles de l'utilisateur ${id}:`, error)
            throw error
        }
    },

    async createUser(userData) {
        try {
            const response = await apiClient.post('/api/users', userData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la création de l\'utilisateur:', error)
            throw error
        }
    },

    async updateUser(id, userData) {
        try {
            const response = await apiClient.put(`/api/users/${id}`, userData)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de l'utilisateur ${id}:`, error)
            throw error
        }
    },

    async updateUserInfo(id, userInfo) {
        try {
            const response = await apiClient.put(`/api/users/${id}/info`, userInfo)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la mise à jour des informations de l'utilisateur ${id}:`, error)
            throw error
        }
    },

    async deleteUser(id) {
        try {
            const response = await apiClient.delete(`/api/users/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la suppression de l'utilisateur ${id}:`, error)
            throw error
        }
    },

    async changePassword(passwordData) {
        try {
            const response = await apiClient.post('/api/users/change-password', passwordData)
            return response.data
        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error)
            throw error
        }
    }
}