<template>
  <div class="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
    <div class="mb-8">
      <NuxtLink to="/statistiques" class="text-gray-600 hover:text-gray-900">
        ← Retour aux statistiques
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 mt-4">Familles avec paiements en attente</h1>
    </div>

    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div class="flex gap-4">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Rechercher par nom, email..."
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
        />
        <select
          v-model="filterType"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
        >
          <option value="all">Toutes</option>
          <option value="unpaid">Non payées</option>
          <option value="partial">Partiellement payées</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Chargement...</p>
    </div>

    <div v-else-if="filteredFamilies.length > 0" class="bg-white rounded-lg shadow-sm overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Famille</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Élèves</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendu</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payé</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reste</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taux</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="family in filteredFamilies" :key="family.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <div>
                <div v-for="responsible in family.responsibles" :key="responsible.id" class="text-gray-900">
                  {{ responsible.name }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              {{ family.responsibles[0]?.email || '' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
              {{ family.students_count }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              {{ formatCurrency(family.expected) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              {{ formatCurrency(family.paid) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
              {{ formatCurrency(family.remaining) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <div class="flex items-center">
                <div class="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                  <div 
                    class="h-2.5 rounded-full"
                    :class="family.payment_rate > 50 ? 'bg-green-600' : family.payment_rate > 0 ? 'bg-yellow-600' : 'bg-red-600'"
                    :style="`width: ${family.payment_rate}%`"
                  ></div>
                </div>
                <span class="text-xs">{{ family.payment_rate }}%</span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <NuxtLink :to="`/family/${family.id}`" class="text-gray-900 hover:text-gray-700 underline">
                Voir détails
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="bg-white rounded-lg shadow-sm p-8 text-center">
      <p class="text-gray-600">Aucune famille trouvée</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { statisticsService } from '~/services/statistics'

usePageTitle('Familles impayées')
definePageMeta({
  layout: 'auth',
  middleware: 'admin-director'
})

const unpaidFamilies = ref([])
const searchTerm = ref('')
const filterType = ref('all')
const loading = ref(true)

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const filteredFamilies = computed(() => {
  let families = unpaidFamilies.value
  
  // Filtrer par type
  if (filterType.value === 'unpaid') {
    families = families.filter(f => f.paid === 0)
  } else if (filterType.value === 'partial') {
    families = families.filter(f => f.paid > 0 && f.paid < f.expected)
  }
  
  // Filtrer par recherche
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    families = families.filter(family => 
      family.responsibles.some(r => 
        r.name.toLowerCase().includes(search) || 
        r.email.toLowerCase().includes(search)
      ) ||
      family.expected.toString().includes(search) ||
      family.paid.toString().includes(search)
    )
  }
  
  return families
})

const loadUnpaidFamilies = async () => {
  try {
    loading.value = true
    const schoolId = localStorage.getItem('current_school_id') || 1
    const response = await statisticsService.getUnpaidFamilies(schoolId)
    unpaidFamilies.value = response.data
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUnpaidFamilies()
})
</script>