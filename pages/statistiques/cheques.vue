<template>
  <div class="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
    <div class="mb-8">
      <NuxtLink to="/statistiques" class="text-gray-600 hover:text-gray-900">
        ← Retour aux statistiques
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 mt-4">Recherche de chèques</h1>
    </div>

    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div class="flex gap-4">
        <select 
          v-model="searchType" 
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
        >
          <option value="cheque_number">Numéro de chèque</option>
          <option value="emitter_name">Nom de l'émetteur</option>
          <option value="bank">Banque</option>
        </select>
        <input 
          v-model="searchValue" 
          type="text" 
          placeholder="Rechercher..."
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          @keyup.enter="searchPayments"
        />
        <button 
          @click="searchPayments"
          class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Rechercher
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Recherche en cours...</p>
    </div>

    <div v-else-if="searchResults.length > 0" class="bg-white rounded-lg shadow-sm overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Famille</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Chèque</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Émetteur</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Banque</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="result in searchResults" :key="result.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm">{{ result.payment_date }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              {{ result.family.responsibles.join(', ') }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">{{ formatCurrency(result.amount) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">{{ result.cheque_details.numero }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">{{ result.cheque_details.emetteur }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">{{ result.cheque_details.banque }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <NuxtLink :to="`/family/${result.family.id}`" class="text-gray-900 hover:text-gray-700 underline">
                Voir famille
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="hasSearched" class="bg-white rounded-lg shadow-sm p-8 text-center">
      <p class="text-gray-600">Aucun chèque trouvé pour cette recherche</p>
    </div>

    <div v-else class="bg-white rounded-lg shadow-sm p-8 text-center">
      <p class="text-gray-600">Utilisez la barre de recherche pour trouver des chèques</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { statisticsService } from '~/services/statistics'

usePageTitle('Recherche de chèques')
definePageMeta({
  layout: 'auth',
  middleware: 'admin-director'
})

const searchType = ref('cheque_number')
const searchValue = ref('')
const searchResults = ref([])
const loading = ref(false)
const hasSearched = ref(false)

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const searchPayments = async () => {
  if (!searchValue.value.trim()) return

  try {
    loading.value = true
    hasSearched.value = true
    const schoolId = localStorage.getItem('current_school_id') || 1
    const response = await statisticsService.searchPayments(searchType.value, searchValue.value, schoolId)
    searchResults.value = response.data
  } catch (error) {
    console.error('Erreur lors de la recherche:', error)
  } finally {
    loading.value = false
  }
}
</script>