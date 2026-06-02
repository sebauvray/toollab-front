import apiClient from './api'

export default {
    async list() {
        const { data } = await apiClient.get('/api/school-years')
        return data?.data ?? []
    },
    async create(payload) {
        const { data } = await apiClient.post('/api/school-years', payload)
        return data?.data
    },
    async close(id) {
        const { data } = await apiClient.post(`/api/school-years/${id}/close`)
        return data?.data
    },
    async toggleOutcomes(id, open) {
        const { data } = await apiClient.post(`/api/school-years/${id}/outcomes-toggle`, { open })
        return data?.data
    },
    async reconductClassroom(classroomId, payload = {}) {
        const { data } = await apiClient.post(`/api/classrooms/${classroomId}/reconduct`, payload)
        return data?.data
    },
    async classroomsForReconduction(yearId) {
        const { data } = await apiClient.get(`/api/school-years/${yearId}/classrooms`)
        return data?.data
    },
}
