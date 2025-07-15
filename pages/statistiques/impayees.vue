<template>
  <div>
    <PageContainer>
      <ClientOnly>
        <BreadCrumb />
      </ClientOnly>
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Familles avec paiements en attente</h1>

      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="flex gap-4">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Rechercher par nom, téléphone..."
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
            @input="handleSearch"
          />
          <div class="relative" ref="filterDropdownRef">
            <input
              v-model="filterTypeDisplay"
              type="text"
              readonly
              placeholder="Filtrer par statut"
              class="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:border-gray-900 pr-10"
              @click="showFilterDropdown = !showFilterDropdown"
            />
            <svg class="absolute right-3 top-3 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <div v-if="showFilterDropdown" class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              <div 
                v-for="option in filterOptions" 
                :key="option.value"
                @click="selectFilter(option)"
                class="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                :class="{ 'bg-gray-50': filterType === option.value }"
              >
                {{ option.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        :columns="columns"
        :items="unpaidFamilies"
        :pagination="pagination"
        :loading="loading"
        @page-change="handlePageChange"
      >
        <template #default="{ item, isLastRow }">
          <div 
            class="grid py-1.5 px-4 hover:bg-gray-50 transition-colors font-nunito"
            :class="{ 'border-b border-[#E6EFF5]': !isLastRow }"
            :style="`grid-template-columns: repeat(12, minmax(0, 1fr))`"
          >
            <div class="col-span-3">
              <div v-for="responsible in item.responsibles" :key="responsible.id" class="text-gray-900">
                {{ responsible.name }}
              </div>
            </div>
            <div class="col-span-2 text-sm text-gray-600">
              {{ item.responsibles[0]?.phone || '-' }}
            </div>
            <div class="col-span-1 text-center">
              {{ item.students_count }}
            </div>
            <div class="col-span-2">
              {{ formatCurrency(item.expected) }}
            </div>
            <div class="col-span-2">
              {{ formatCurrency(item.paid) }}
            </div>
            <div class="col-span-1 font-medium text-red-600">
              {{ formatCurrency(item.remaining) }}
            </div>
            <div class="col-span-1">
              <NuxtLink :to="`/family/${item.id}/paiement`" class="text-gray-900 hover:text-gray-700 underline">
                Paiement
              </NuxtLink>
            </div>
          </div>
        </template>
      </DataTable>
    </PageContainer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { statisticsService } from '~/services/statistics'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import DataTable from '~/components/table/DataTable.vue'
import PageContainer from '~/components/layout/PageContainer.vue'

usePageTitle('Familles impayées')
definePageMeta({
  layout: 'auth',
  middleware: 'admin-director'
})

const unpaidFamilies = ref([])
const searchTerm = ref('')
const filterType = ref('all')
const loading = ref(true)
const showFilterDropdown = ref(false)
const filterDropdownRef = ref(null)
const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  perPage: 10,
  total: 0
})

const filterOptions = [
  { value: 'all', label: 'Toutes les familles' },
  { value: 'unpaid', label: 'Non payées' },
  { value: 'partial', label: 'Partiellement payées' }
]

const filterTypeDisplay = computed(() => {
  const option = filterOptions.find(opt => opt.value === filterType.value)
  return option ? option.label : ''
})

const columns = [
  { key: 'responsables', label: 'Nom du responsable', width: '3' },
  { key: 'phone', label: 'Téléphone', width: '2' },
  { key: 'students_count', label: 'Élèves', width: '1' },
  { key: 'expected', label: 'Attendu', width: '2' },
  { key: 'paid', label: 'Payé', width: '2' },
  { key: 'remaining', label: 'Reste', width: '1' },
  { key: 'actions', label: 'Actions', width: '1' }
]

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const loadUnpaidFamilies = async (page = 1) => {
  try {
    loading.value = true
    const schoolId = localStorage.getItem('current_school_id') || 1
    
    const params = {
      page: page,
      per_page: pagination.value.perPage
    }
    
    if (searchTerm.value) {
      params.search = searchTerm.value
    }
    
    if (filterType.value !== 'all') {
      params.filter = filterType.value
    }
    
    const response = await statisticsService.getUnpaidFamilies(schoolId, params)
    
    if (response.status === 'success') {
      unpaidFamilies.value = response.data.items
      pagination.value = {
        currentPage: response.data.pagination.current_page,
        totalPages: response.data.pagination.total_pages,
        perPage: response.data.pagination.per_page,
        total: response.data.pagination.total
      }
    }
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page) => {
  loadUnpaidFamilies(page)
}

const handleSearch = () => {
  pagination.value.currentPage = 1
  loadUnpaidFamilies(1)
}

const handleFilter = () => {
  pagination.value.currentPage = 1
  loadUnpaidFamilies(1)
}

const selectFilter = (option) => {
  filterType.value = option.value
  showFilterDropdown.value = false
  handleFilter()
}

// Gérer le clic en dehors du dropdown
const handleClickOutside = (event) => {
  if (filterDropdownRef.value && !filterDropdownRef.value.contains(event.target)) {
    showFilterDropdown.value = false
  }
}

onMounted(() => {
  loadUnpaidFamilies()
  // Ajouter un petit délai pour éviter les conflits d'événements
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>