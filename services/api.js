import * as axiosModule from 'axios'
const axios = axiosModule.default || axiosModule

const apiClient = axios.create({
    baseURL: process.env.NODE_ENV === 'production'
        ? process.env.NUXT_PUBLIC_API_URL
        : 'http://localhost',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
})

export function setupInterceptors() {
    apiClient.interceptors.request.use(
        (config) => {
            if (process.client) {
                const token = localStorage.getItem('auth.token')
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
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