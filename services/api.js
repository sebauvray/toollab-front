import * as axiosModule from 'axios'
import { clearCurrentSchoolRoles } from '~/utils/schoolRoles'
const axios = axiosModule.default || axiosModule

const apiClient = axios.create({
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
})

export function setupInterceptors() {
    // L'URL de l'API est lue au runtime depuis NUXT_PUBLIC_API_URL
    // (et non figée au build), pour pouvoir déployer le même bundle par environnement.
    apiClient.defaults.baseURL = useRuntimeConfig().public.apiUrl

    apiClient.interceptors.request.use(
        (config) => {
            if (process.client) {
                const token = localStorage.getItem('auth.token')
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }

                const schoolId = localStorage.getItem('current_school_id')
                if (schoolId) {
                    config.headers['X-School-Id'] = schoolId
                }

                const schoolYearId = localStorage.getItem('current_school_year_id')
                if (schoolYearId) {
                    config.headers['X-School-Year-Id'] = schoolYearId
                }
            }
            return config
        },
        (error) => Promise.reject(error)
    )

    apiClient.interceptors.response.use(
        (response) => {
            return response
        },
        async (error) => {
            if (error.response && error.response.status === 401 && localStorage.getItem('auth.token')) {
                localStorage.removeItem('auth.token')
                localStorage.removeItem('auth.user')
                localStorage.removeItem('current_school_id')
                localStorage.removeItem('current_school_year_id')
                clearCurrentSchoolRoles()

                if (process.client) {
                    window.location.href = '/login'
                }
            }

            return Promise.reject(error)
        }
    )
}

export function useApi() {
    return apiClient
}

export default apiClient
