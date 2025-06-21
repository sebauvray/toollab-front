import apiClient from './api'

export default {
    async getClasses(params = {}) {
        try {
            const response = await apiClient.get('/api/classrooms', { params })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des classes:', error)
            throw error
        }
    },

    async getClassById(id) {
        try {
            const response = await apiClient.get(`/api/classrooms/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération de la classe ${id}:`, error)
            throw error
        }
    },

    async createClass(classData) {
        try {
            const schoolId = localStorage.getItem('current_school_id') || 1

            const payload = {
                name: classData.name,
                cursus_id: classData.cursus_id,
                level_id: classData.level_id || classData.levelId,
                gender: classData.gender,
                size: parseInt(classData.size),
                school_id: classData.school_id || schoolId,
                years: new Date().getFullYear(),
                type: classData.type || 'Standard',
                telegram_link: classData.telegram_link,
                schedules: classData.schedules || []
            }

            const response = await apiClient.post('/api/classrooms', payload)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la création de la classe:', error)
            if (error.response && error.response.data) {
                console.error('Détails de l\'erreur:', error.response.data);
            }
            throw error
        }
    },

    async updateClass(id, classData) {
        try {
            const payload = {
                name: classData.name,
                cursus_id: classData.cursus_id,
                level_id: classData.level_id || classData.levelId,
                gender: classData.gender,
                size: parseInt(classData.size),
                years: classData.years || new Date().getFullYear(),
                type: classData.type || 'Standard',
                telegram_link: classData.telegram_link,
                schedules: classData.schedules || []
            }

            const response = await apiClient.put(`/api/classrooms/${id}`, payload)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de la classe ${id}:`, error)
            throw error
        }
    },

    async deleteClass(id) {
        try {
            const response = await apiClient.delete(`/api/classrooms/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la suppression de la classe ${id}:`, error)
            throw error
        }
    },

    async getAdminClassrooms(params = {}) {
        try {
            const response = await apiClient.get('/api/admin/classrooms', { params })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des classes admin:', error)
            throw error
        }
    },

    async removeStudentFromClass(classroomId, studentId) {
        try {
            const response = await apiClient.delete(`/api/admin/classrooms/${classroomId}/students/${studentId}`)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'élève de la classe:', error)
            throw error
        }
    }
}