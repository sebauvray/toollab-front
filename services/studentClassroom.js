import apiClient from './api'

export default {
    async enrollStudent(studentId, classroomId, familyId) {
        try {
            const response = await apiClient.post('/api/student-classrooms/enroll', {
                student_id: studentId,
                classroom_id: classroomId,
                family_id: familyId
            })
            return response.data
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error)
            throw error
        }
    },

    async unenrollStudent(studentId, classroomId) {
        try {
            const response = await apiClient.post('/api/student-classrooms/unenroll', {
                student_id: studentId,
                classroom_id: classroomId
            })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la désinscription:', error)
            throw error
        }
    },

    async getFamilyEnrollments(familyId) {
        try {
            const response = await apiClient.get(`/api/families/${familyId}/enrollments`)
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des inscriptions:', error)
            throw error
        }
    }
}