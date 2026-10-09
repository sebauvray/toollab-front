import apiClient from './api'

// Rôles de l'école courante (en-tête X-School-Id posé par apiClient).
export default {
    async getRoles() {
        const response = await apiClient.get('/api/roles')
        return response.data
    },

    async createRole(role) {
        const response = await apiClient.post('/api/roles', role)
        return response.data
    },

    async updateRole(id, role) {
        const response = await apiClient.put(`/api/roles/${id}`, role)
        return response.data
    },

    async deleteRole(id) {
        await apiClient.delete(`/api/roles/${id}`)
    }
}
