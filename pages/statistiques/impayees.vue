<template>
  <div>
    <PageContainer>
      <ClientOnly>
        <BreadCrumb />
      </ClientOnly>
      <div class="flex justify-end mb-3">
        <ExportButton :loading="exportingCsv" @click="exportCsv" />
      </div>

      <div class="bg-white rounded-lg shadow-sm p-5 mb-5">
        <div class="flex gap-3">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Rechercher par nom, téléphone..."
            class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
            @input="handleSearch"
          />
          <div class="relative" ref="filterDropdownRef">
            <input
              v-model="filterTypeDisplay"
              type="text"
              readonly
              placeholder="Filtrer par statut"
              class="px-3 py-1.5 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:border-gray-900 pr-8"
              @click="showFilterDropdown = !showFilterDropdown"
            />
            <svg class="absolute right-3 top-3 w-3.5 h-3.5 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <div v-if="showFilterDropdown" class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              <div 
                v-for="option in filterOptions" 
                :key="option.value"
                @click="selectFilter(option)"
                class="px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
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
        @per-page-change="handlePerPageChange"
      >
        <template #default="{ item, isLastRow }">
          <div 
            class="grid py-1 px-3 hover:bg-gray-50 transition-colors font-nunito"
            :class="{ 'border-b border-[#E6EFF5]': !isLastRow }"
            :style="`grid-template-columns: repeat(12, minmax(0, 1fr))`"
          >
            <div class="col-span-3">
              <div v-for="responsible in item.responsibles" :key="responsible.id" class="text-gray-900">
                {{ responsible.name }}
              </div>
            </div>
            <div class="col-span-2 text-xs text-gray-600">
              {{ item.responsibles[0]?.phone || '-' }}
            </div>
            <div class="col-span-1 text-center">
              {{ item.students_count }}
            </div>
            <div class="col-span-2">
              {{ formatCurrency(item.expected) }}
            </div>
            <div class="col-span-2 text-green-600 font-medium">
              {{ formatCurrency(item.paid) }}
            </div>
            <div class="col-span-1 font-medium text-red-600">
              {{ formatCurrency(item.remaining) }}
            </div>
            <div class="col-span-1 flex justify-end">
              <NuxtLink
                :to="`/family/${item.id}/paiement`"
                title="Voir le paiement"
                class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:text-default hover:bg-gray-100 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.04 12.32a1 1 0 010-.64C3.42 7.51 7.36 4.5 12 4.5s8.57 3.01 9.96 7.18c.07.21.07.43 0 .64C20.58 16.49 16.64 19.5 12 19.5s-8.57-3.01-9.96-7.18z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
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
import { saveExport } from '~/utils/download'
import { getCurrentSchoolId } from '~/utils/schoolContext'
import { getErrorMessage } from '~/utils/errors'
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

const { loadPerPage, savePerPage } = useTablePerPage('impayees_per_page')

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
  { key: 'actions', label: '', width: '1' }
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
    const schoolId = getCurrentSchoolId()
    
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

const exportingCsv = ref(false)
const exportCsv = async () => {
  if (exportingCsv.value) return
  exportingCsv.value = true
  try {
    const schoolId = getCurrentSchoolId()
    const params = {}
    if (searchTerm.value) params.search = searchTerm.value
    if (filterType.value !== 'all') params.filter = filterType.value
    const blob = await statisticsService.exportUnpaidFamilies(schoolId, params)
    saveExport(blob, 'familles_impayees')
  } catch (e) {
    const { setFlashMessage } = useFlashMessage()
    setFlashMessage({ type: 'error', message: getErrorMessage(e, 'Échec de l\'export') })
  } finally {
    exportingCsv.value = false
  }
}

const handlePerPageChange = (perPage) => {
  savePerPage(perPage)
  pagination.value.perPage = perPage
  loadUnpaidFamilies(1)
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
  pagination.value.perPage = loadPerPage()
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
