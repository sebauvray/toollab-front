<template>
  <div>
    <PageContainer>
      <ClientOnly>
        <BreadCrumb />
      </ClientOnly>
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Recherche de chèques</h1>

      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="flex gap-4">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Rechercher par numéro de chèque..."
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
            @input="handleSearch"
          />
          <div class="relative" ref="bankDropdownRef">
            <input
              v-model="bankDisplay"
              type="text"
              readonly
              placeholder="Filtrer par banque"
              class="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:border-gray-900 pr-10 min-w-[200px]"
              @click="showBankDropdown = !showBankDropdown"
            />
            <svg class="absolute right-3 top-3 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <div v-if="showBankDropdown" class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              <div 
                @click="selectAllBanks"
                class="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200"
              >
                <div class="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    :checked="selectedBanks.length === availableBanks.length"
                    class="custom-checkbox"
                  />
                  <span class="font-medium">Toutes les banques</span>
                </div>
              </div>
              <div 
                v-for="bank in availableBanks" 
                :key="bank"
                @click="toggleBank(bank)"
                class="px-4 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <div class="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    :checked="selectedBanks.includes(bank)"
                    class="custom-checkbox"
                  />
                  <span>{{ bank }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        :columns="columns"
        :items="cheques"
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
            <div class="col-span-2 font-medium">
              {{ item.details?.numero || '-' }}
            </div>
            <div class="col-span-2 text-green-600 font-medium">
              {{ formatCurrency(item.amount) }}
            </div>
            <div class="col-span-2">
              {{ item.details?.banque || '-' }}
            </div>
            <div class="col-span-3">
              <div v-if="item.family?.responsibles && item.family.responsibles.length > 0" class="text-gray-900">
                {{ item.family.responsibles[0].name || '-' }}
              </div>
              <div v-else class="text-gray-400">-</div>
            </div>
            <div class="col-span-2 text-sm text-gray-600">
              {{ (item.family?.responsibles && item.family.responsibles.length > 0 && item.family.responsibles[0].phone) || '-' }}
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

usePageTitle('Recherche de chèques')
definePageMeta({
  layout: 'auth',
  middleware: 'admin-director'
})

const cheques = ref([])
const searchTerm = ref('')
const selectedBanks = ref([])
const availableBanks = ref([])
const loading = ref(true)
const showBankDropdown = ref(false)
const bankDropdownRef = ref(null)
const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  perPage: 10,
  total: 0
})

const columns = [
  { key: 'numero', label: 'N° Chèque', width: '2' },
  { key: 'amount', label: 'Montant', width: '2' },
  { key: 'bank', label: 'Banque', width: '2' },
  { key: 'responsable', label: 'Nom du responsable', width: '3' },
  { key: 'phone', label: 'Téléphone', width: '2' },
  { key: 'actions', label: 'Actions', width: '1' }
]

const bankDisplay = computed(() => {
  if (selectedBanks.value.length === 0) return 'Aucune banque sélectionnée'
  if (selectedBanks.value.length === availableBanks.value.length) return 'Toutes les banques'
  if (selectedBanks.value.length === 1) return selectedBanks.value[0]
  return `${selectedBanks.value.length} banques sélectionnées`
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const loadAvailableBanks = async () => {
  try {
    const schoolId = localStorage.getItem('current_school_id') || 1
    const response = await statisticsService.getAvailableBanks(schoolId)
    
    // La réponse contient directement le tableau dans response.data
    if (response && response.data && Array.isArray(response.data)) {
      availableBanks.value = response.data
      selectedBanks.value = [...response.data]
    } else {
      throw new Error('Format de réponse inattendu')
    }
  } catch (error) {
    console.error('Erreur lors du chargement des banques:', error)
    // Utiliser des banques par défaut en cas d'erreur
    availableBanks.value = ['BNP Paribas', 'Crédit Agricole', 'Société Générale', 'LCL', 'CIC', 'Crédit Mutuel', 'La Banque Postale', 'Caisse d\'Épargne']
    selectedBanks.value = [...availableBanks.value]
  }
}

const loadCheques = async (page = 1) => {
  try {
    loading.value = true
    const schoolId = localStorage.getItem('current_school_id') || 1
    
    const params = {
      page: page,
      per_page: pagination.value.perPage,
      payment_type: 'cheque'
    }
    
    if (searchTerm.value) {
      params.search = searchTerm.value
    }
    
    if (selectedBanks.value.length === 0) {
      cheques.value = []
      pagination.value = {
        currentPage: 1,
        totalPages: 0,
        perPage: pagination.value.perPage,
        total: 0
      }
      loading.value = false
      return
    }
    
    if (selectedBanks.value.length < availableBanks.value.length) {
      params.banks = selectedBanks.value.join(',')
    }
    
    const response = await statisticsService.searchPaymentsPaginated(schoolId, params)
    
    if (response.status === 'success') {
      cheques.value = response.data.items
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
  loadCheques(page)
}

const handleSearch = () => {
  pagination.value.currentPage = 1
  loadCheques(1)
}

const selectAllBanks = () => {
  if (selectedBanks.value.length === availableBanks.value.length) {
    selectedBanks.value = []
  } else {
    selectedBanks.value = [...availableBanks.value]
  }
  showBankDropdown.value = false
  handleSearch()
}

const toggleBank = (bank) => {
  const index = selectedBanks.value.indexOf(bank)
  if (index > -1) {
    selectedBanks.value.splice(index, 1)
  } else {
    selectedBanks.value.push(bank)
  }
  handleSearch()
}

// Gérer le clic en dehors du dropdown
const handleClickOutside = (event) => {
  if (bankDropdownRef.value && !bankDropdownRef.value.contains(event.target)) {
    showBankDropdown.value = false
  }
}

onMounted(async () => {
  await loadAvailableBanks()
  await loadCheques()
  
  // Ajouter un petit délai pour éviter les conflits d'événements
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* Styles pour les checkboxes noires */
.custom-checkbox {
  width: 1rem;
  height: 1rem;
  color: #000;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: #fff;
  flex-shrink: 0;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  cursor: pointer;
}

.custom-checkbox:checked {
  background-color: #000;
  border-color: #000;
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
}

.custom-checkbox:focus {
  outline: none;
  box-shadow: none;
  border-color: #000;
}

.custom-checkbox:focus-visible {
  outline: none;
  box-shadow: none;
}

/* Forcer le style pour TOUTES les checkboxes de cette page */
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