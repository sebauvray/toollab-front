import apiClient from './api'

export default {
    async myClassrooms() {
        const response = await apiClient.get('/api/teacher/classrooms')
        return response.data
    },

    async classroomStudents(classroomId) {
        const response = await apiClient.get(`/api/teacher/classrooms/${classroomId}/students`)
        return response.data
    },

    async saveOutcomes(classroomId, decisions) {
        const response = await apiClient.post(`/api/teacher/classrooms/${classroomId}/outcomes`, {decisions})
        return response.data
    },

    async classroomAttendance(classroomId, date) {
        const response = await apiClient.get(`/api/teacher/classrooms/${classroomId}/attendance`, {params: {date}})
        return response.data
    },

    async classroomAttendanceMatrix(classroomId) {
        const response = await apiClient.get(`/api/teacher/classrooms/${classroomId}/attendance-matrix`)
        return response.data
    },

    async saveAttendance(classroomId, date, records) {
        const response = await apiClient.post(`/api/teacher/classrooms/${classroomId}/attendance`, {date, records})
        return response.data
    },

    async mySchedules() {
        const response = await apiClient.get('/api/teacher/schedules')
        return response.data
    }
}
