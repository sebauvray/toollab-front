import { ref } from 'vue'
import adminDashboardService from '~/services/adminDashboard'

// Compteurs de la navigation admin, partagés entre le layout et les pages
// (une page qui résout une erreur ou suspend une école peut les rafraîchir).
const counters = ref({})

export function useAdminCounters() {
  const refreshCounters = async () => {
    try {
      counters.value = await adminDashboardService.getCounters()
    } catch {
      // Purement indicatif : la navigation reste utilisable sans
    }
  }
  return { counters, refreshCounters }
}
