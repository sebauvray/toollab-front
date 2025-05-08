import apiClient from './api'

export default {
    async getSchools(params = {}) {
        try {
            const response = await apiClient.get('/api/schools', { params })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la récupération des écoles:', error)
            throw error
        }
    },

    async getSchool(id) {
        try {
            const response = await apiClient.get(`/api/schools/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération de l'école ${id}:`, error)
            throw error
        }
    },

    async createSchool(schoolData) {
        try {
            // Utilisation de FormData pour l'upload de fichiers (logo)
            const formData = new FormData()

            for (const [key, value] of Object.entries(schoolData)) {
                if (key === 'logo' && value instanceof File) {
                    formData.append('logo', value)
                } else if (value !== null && value !== undefined) {
                    formData.append(key, value)
                }
            }

            const response = await apiClient.post('/api/schools', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data
        } catch (error) {
            console.error('Erreur lors de la création de l\'école:', error)
            throw error
        }
    },

    async updateSchool(id, schoolData) {
        try {
            const formData = new FormData()
            formData.append('_method', 'PUT')

            for (const [key, value] of Object.entries(schoolData)) {
                if (key === 'logo' && value instanceof File) {
                    formData.append('logo', value)
                } else if (value !== null && value !== undefined) {
                    formData.append(key, value)
                }
            }

            const response = await apiClient.post(`/api/schools/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de l'école ${id}:`, error)
            throw error
        }
    },

    async deleteSchool(id) {
        try {
            const response = await apiClient.delete(`/api/schools/${id}`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la suppression de l'école ${id}:`, error)
            throw error
        }
    },

    async getSchoolFamilies(schoolId) {
        try {
            const response = await apiClient.get(`/api/schools/${schoolId}/families`)
            return response.data
        } catch (error) {
            console.error(`Erreur lors de la récupération des familles de l'école ${schoolId}:`, error)
            throw error
        }
    }
}