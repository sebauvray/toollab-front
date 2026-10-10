import apiClient from './api'

export default {
    async getDashboard() {
        const response = await apiClient.get('/api/admin/dashboard')
        return response.data
    },

    async searchUsers(params = {}) {
        const response = await apiClient.get('/api/admin/users', { params })
        return response.data
    },

    async getUser(id) {
        const response = await apiClient.get(`/api/admin/users/${id}`)
        return response.data
    },

    async disableUser(id, reason) {
        const response = await apiClient.post(`/api/admin/users/${id}/disable`, { reason })
        return response.data
    },

    async enableUser(id) {
        const response = await apiClient.post(`/api/admin/users/${id}/enable`)
        return response.data
    },

    async impersonate(userId, reason) {
        const response = await apiClient.post(`/api/admin/users/${userId}/impersonate`, { reason })
        return response.data
    },

    async stopImpersonation() {
        const response = await apiClient.post('/api/impersonate/stop')
        return response.data
    },

    async getAuditLogs(params = {}) {
        const response = await apiClient.get('/api/admin/audit-logs', { params })
        return response.data
    },

    async getSchoolFeatures(schoolId) {
        const response = await apiClient.get(`/api/admin/schools/${schoolId}/features`)
        return response.data
    },

    async setSchoolFeature(schoolId, feature, enabled) {
        const response = await apiClient.put(`/api/admin/schools/${schoolId}/features/${feature}`, { enabled })
        return response.data
    },

    async suspendSchool(schoolId, reason, notifyDirector = true) {
        const response = await apiClient.post(`/api/admin/schools/${schoolId}/suspend`, { reason, notify_director: notifyDirector })
        return response.data
    },

    async reactivateSchool(schoolId, notifyDirector = true) {
        const response = await apiClient.post(`/api/admin/schools/${schoolId}/reactivate`, { notify_director: notifyDirector })
        return response.data
    },

    async contactDirector(schoolId, subject, message) {
        const response = await apiClient.post(`/api/admin/schools/${schoolId}/contact-director`, { subject, message })
        return response.data
    },

    async getErrors(params = {}) {
        const response = await apiClient.get('/api/admin/errors', { params })
        return response.data
    },

    async getError(id) {
        const response = await apiClient.get(`/api/admin/errors/${id}`)
        return response.data
    },

    async setErrorResolved(id, resolved) {
        const response = await apiClient.post(`/api/admin/errors/${id}/${resolved ? 'resolve' : 'reopen'}`)
        return response.data
    },

    async getImpersonations() {
        const response = await apiClient.get('/api/admin/impersonations')
        return response.data
    }
}
