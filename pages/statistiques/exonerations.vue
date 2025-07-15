<template>
  <div>
    <PageContainer>
      <ClientOnly>
        <BreadCrumb />
      </ClientOnly>
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Exonérations</h1>

      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="flex gap-4">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Rechercher par nom ou téléphone..."
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
            @input="debounceSearch"
          />
          <div class="relative" ref="filterDropdownRef">
            <input
              v-model="filterDisplay"
              type="text"
              readonly
              placeholder="Type d'exonération"
              class="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:border-gray-900 pr-10 min-w-[200px]"
              @click="showFilterDropdown = !showFilterDropdown"
            />
            <svg class="absolute right-3 top-3 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <div v-if="showFilterDropdown" class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              <div 
                @click="selectAllTypes"
                class="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200"
              >
                <div class="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    :checked="selectedTypes.length === availableTypes.length"
                    class="custom-checkbox"
                  />
                  <span class="font-medium">Tous les types</span>
                </div>
              </div>
              <div 
                v-for="type in availableTypes" 
                :key="type.value"
                @click="toggleType(type.value)"
                class="px-4 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <div class="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    :checked="selectedTypes.includes(type.value)"
                    class="custom-checkbox"
                  />
                  <span>{{ type.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        :columns="columns"
        :items="exonerations"
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
            <div class="col-span-2">
              <div v-if="item.family?.responsibles && item.family.responsibles.length > 0" class="text-gray-900">
                {{ item.family.responsibles[0].name || '-' }}
              </div>
              <div v-else class="text-gray-400">-</div>
            </div>
            <div class="col-span-2 text-sm text-gray-600">
              {{ (item.family?.responsibles && item.family.responsibles.length > 0 && item.family.responsibles[0].phone) || '-' }}
            </div>
            <div class="col-span-2">
              <span class="font-medium text-orange-600">{{ formatCurrency(item.amount) }}</span>
            </div>
            <div class="col-span-2">
              <div v-if="item.exoneration_type === 'complete'" class="flex items-center gap-2">
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                  Complète
                </span>
                <span class="text-xs text-gray-500">(100%)</span>
              </div>
              <div v-else class="flex items-center gap-2">
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  Partielle
                </span>
                <span class="text-xs text-gray-500">
                  ({{ item.percentage }}% - {{ formatCurrency(item.total_expected) }} total)
                </span>
              </div>
            </div>
            <div class="col-span-3 text-sm text-gray-600 pr-4">
              <div v-if="item.comment">
                <p 
                  :class="{ 'line-clamp-2': !item.showFullComment }"
                  class="whitespace-pre-wrap break-words"
                >
                  {{ item.comment }}
                </p>
                <button 
                  v-if="item.comment.length > 150"
                  @click="toggleComment(item)"
                  class="text-xs text-gray-900 hover:text-gray-700 underline mt-1"
                >
                  {{ item.showFullComment ? 'Voir moins' : 'Voir plus' }}
                </button>
              </div>
              <span v-else class="text-gray-400">-</span>
            </div>
            <div class="col-span-1">
              <NuxtLink 
                v-if="item.family?.id"
                :to="`/family/${item.family.id}/paiement`"
                class="text-gray-900 hover:text-gray-700 underline text-sm"
              >
                Voir
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

usePageTitle('Exonérations')
definePageMeta({
  layout: 'auth',
  middleware: 'admin-director'
})

const exonerations = ref([])
const expandedComments = ref(new Set())
const searchTerm = ref('')
const selectedTypes = ref(['complete', 'partial'])
const availableTypes = [
  { value: 'complete', label: 'Exonérations complètes' },
  { value: 'partial', label: 'Exonérations partielles' }
]
const loading = ref(true)
const showFilterDropdown = ref(false)
const filterDropdownRef = ref(null)
const searchTimeout = ref(null)
const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  perPage: 10,
  total: 0
})

const filterDisplay = computed(() => {
  if (selectedTypes.value.length === 0) return 'Aucune sélection'
  if (selectedTypes.value.length === availableTypes.length) return 'Toutes les exonérations'
  if (selectedTypes.value.length === 1) {
    const type = availableTypes.find(t => t.value === selectedTypes.value[0])
    return type ? type.label : ''
  }
  return `${selectedTypes.value.length} types sélectionnés`
})

const columns = [
  { key: 'responsable', label: 'Nom du responsable', width: '2' },
  { key: 'phone', label: 'Téléphone', width: '2' },
  { key: 'amount', label: 'Montant exonéré', width: '2' },
  { key: 'type', label: 'Type', width: '2' },
  { key: 'comment', label: 'Commentaire', width: '3' },
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

const loadExonerations = async (page = 1) => {
  try {
    loading.value = true
    const schoolId = localStorage.getItem('current_school_id') || 1
    
    const params = {
      page: page,
      per_page: pagination.value.perPage,
      payment_type: 'exoneration'
    }
    
    if (searchTerm.value) {
      params.search = searchTerm.value
    }
    
    if (selectedTypes.value.length === 0) {
      exonerations.value = []
      pagination.value = {
        currentPage: 1,
        totalPages: 0,
        perPage: pagination.value.perPage,
        total: 0
      }
      loading.value = false
      return
    }
    
    // Si tous les types sont sélectionnés, pas besoin de filtre
    // Si seulement certains types, on filtre côté client
    if (selectedTypes.value.length < availableTypes.length) {
      params.filter_types = selectedTypes.value.join(',')
    }
    
    const response = await statisticsService.searchPaymentsPaginated(schoolId, params)
    
    if (response.status === 'success') {
      let filteredItems = response.data.items.map(item => {
        const isComplete = item.amount >= item.total_expected
        return {
          ...item,
          exoneration_type: isComplete ? 'complete' : 'partial',
          percentage: item.total_expected > 0 ? Math.round((item.amount / item.total_expected) * 100) : 0,
          total_expected: item.total_expected || 0,
          comment: item.details?.justification || '',
          showFullComment: expandedComments.value.has(item.id)
        }
      })
      
      // Filtrer côté client si nécessaire
      if (selectedTypes.value.length < availableTypes.length) {
        filteredItems = filteredItems.filter(item => selectedTypes.value.includes(item.exoneration_type))
      }
      
      exonerations.value = filteredItems
      
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
  loadExonerations(page)
}

const handleSearch = () => {
  pagination.value.currentPage = 1
  expandedComments.value.clear()
  loadExonerations(1)
}

const debounceSearch = () => {
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    handleSearch()
  }, 300)
}

const selectAllTypes = () => {
  if (selectedTypes.value.length === availableTypes.length) {
    selectedTypes.value = []
  } else {
    selectedTypes.value = availableTypes.map(t => t.value)
  }
  handleSearch()
}

const toggleType = (type) => {
  const index = selectedTypes.value.indexOf(type)
  if (index > -1) {
    selectedTypes.value.splice(index, 1)
  } else {
    selectedTypes.value.push(type)
  }
  handleSearch()
}

const toggleComment = (item) => {
  if (expandedComments.value.has(item.id)) {
    expandedComments.value.delete(item.id)
  } else {
    expandedComments.value.add(item.id)
  }
  item.showFullComment = !item.showFullComment
}

const handleClickOutside = (event) => {
  if (filterDropdownRef.value && !filterDropdownRef.value.contains(event.target)) {
    showFilterDropdown.value = false
  }
}

onMounted(() => {
  loadExonerations()
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  clearTimeout(searchTimeout.value)
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.custom-checkbox {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  width: 1rem !important;
  height: 1rem !important;
  border: 1px solid #d1d5db !important;
  border-radius: 0.25rem !important;
  background-color: #fff !important;
  cursor: pointer !important;
  position: relative !important;
}

.custom-checkbox:checked {
  background-color: #000 !important;
  border-color: #000 !important;
}

.custom-checkbox:checked::after {
  content: '' !important;
  position: absolute !important;
  left: 0.125rem !important;
  top: 0.125rem !important;
  width: 0.75rem !important;
  height: 0.75rem !important;
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e") !important;
  background-size: contain !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}

input[type="checkbox"] {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  width: 1rem !important;
  height: 1rem !important;
  border: 1px solid #d1d5db !important;
  border-radius: 0.25rem !important;
  background-color: #fff !important;
  cursor: pointer !important;
  position: relative !important;
}

input[type="checkbox"]:checked {
  background-color: #000 !important;
  border-color: #000 !important;
}

input[type="checkbox"]:checked::after {
  content: '' !important;
  position: absolute !important;
  left: 0.125rem !important;
  top: 0.125rem !important;
  width: 0.75rem !important;
  height: 0.75rem !important;
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e") !important;
  background-size: contain !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}
</style>