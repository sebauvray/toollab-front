import apiClient from './api'

export default {
    async getCurrent() {
        try {
            const response = await apiClient.get('/api/director-handover')
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération de la passation de direction:', error)
            throw error
        }
    },

    async create(payload) {
        try {
            const response = await apiClient.post('/api/director-handover', {
                email: payload.email,
                outgoing_role: payload.outgoing_role,
                remove_teacher_role: !!payload.remove_teacher_role
            })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la création de la passation de direction:', error)
            throw error
        }
    },

    async resend(id) {
        try {
            const response = await apiClient.post(`/api/director-handover/${id}/resend`)
            return response.data
        } catch (error) {
            console.error('Erreur lors du renvoi de la passation de direction:', error)
            throw error
        }
    },

    async cancel(id) {
        try {
            const response = await apiClient.post(`/api/director-handover/${id}/cancel`)
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'annulation de la passation de direction:', error)
            throw error
        }
    }
}
