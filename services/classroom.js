import apiClient from './api'

export default {
    async getClassrooms(params = {}) {
        try {
            const response = await apiClient.get('/api/classrooms', { params })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des classes:', error)
            throw error
        }
    },

    async getClassroom(id) {
        try {
            const response = await apiClient.get(`/api/classrooms/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération de la classe ${id}:`, error)
            throw error
        }
    },

    async createClassroom(classroomData) {
        try {
            const response = await apiClient.post('/api/classrooms', classroomData)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la création de la classe:', error)
            throw error
        }
    },

    async updateClassroom(id, classroomData) {
        try {
            const response = await apiClient.put(`/api/classrooms/${id}`, classroomData)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de la classe ${id}:`, error)
            throw error
        }
    },

    async deleteClassroom(id) {
        try {
            const response = await apiClient.delete(`/api/classrooms/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la suppression de la classe ${id}:`, error)
            throw error
        }
    },

    async getClassroomUsers(classroomId) {
        try {
            const response = await apiClient.get(`/api/users/classroom/${classroomId}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération des utilisateurs de la classe ${classroomId}:`, error)
            throw error
        }
    }
}