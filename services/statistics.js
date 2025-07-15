import apiClient from './api'

export const statisticsService = {
  async getOverview(schoolId) {
    try {
      const response = await apiClient.get('/api/statistics/overview', {
        params: { school_id: schoolId }
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  async getUnpaidFamilies(schoolId, params = {}) {
    try {
      const response = await apiClient.get('/api/statistics/unpaid-families', {
        params: { 
          school_id: schoolId,
          ...params
        }
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la récupération des familles impayées:', error)
      throw error
    }
  },

  async searchPayments(searchType, searchValue, schoolId) {
    try {
      const response = await apiClient.post('/api/statistics/search-payments', {
        search_type: searchType,
        search_value: searchValue,
        school_id: schoolId
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la recherche de paiements:', error)
      throw error
    }
  },

  async getEnrollmentTrends(schoolId) {
    try {
      const response = await apiClient.get('/api/statistics/enrollment-trends', {
        params: { school_id: schoolId }
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la récupération des tendances d\'inscription:', error)
      throw error
    }
  },

  async getRevenueByMonth(schoolId) {
    try {
      const response = await apiClient.get('/api/statistics/revenue-by-month', {
        params: { school_id: schoolId }
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la récupération des revenus mensuels:', error)
      throw error
    }
  },

  async searchPaymentsPaginated(schoolId, params = {}) {
    try {
      const response = await apiClient.get('/api/statistics/payments', {
        params: { 
          school_id: schoolId,
          ...params
        }
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la recherche de paiements:', error)
      throw error
    }
  },

  async getAvailableBanks(schoolId) {
    try {
      const response = await apiClient.get('/api/statistics/available-banks', {
        params: { school_id: schoolId }
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la récupération des banques:', error)
      throw error
    }
  }
}