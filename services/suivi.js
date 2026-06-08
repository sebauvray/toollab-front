import apiClient from './api'

export default {
    async classroomSuivi(classroomId) {
        const { data } = await apiClient.get(`/api/admin/classrooms/${classroomId}/suivi`)
        return data?.data
    },
    async outcomesOverview() {
        const { data } = await apiClient.get('/api/admin/outcomes')
        return data?.data
    },
}
