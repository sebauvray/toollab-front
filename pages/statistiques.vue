<template>
  <div>
    <div class="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
      
      <!-- Error state -->
      <div v-else-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-600">{{ errorMessage }}</p>
      </div>
      
      <!-- Content -->
      <div v-else class="flex flex-col gap-6">
        <!-- Cartes de statistiques principales -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <!-- Inscriptions -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total des inscrits</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.enrollments?.total || 0 }}</p>
              </div>
              <IconUsers class="w-12 h-12 text-gray-700" />
            </div>
            <div class="mt-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Hommes</span>
                <span class="font-medium">{{ stats.enrollments?.men || 0 }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Femmes</span>
                <span class="font-medium">{{ stats.enrollments?.women || 0 }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Enfants</span>
                <span class="font-medium">{{ stats.enrollments?.children || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- Montant payé -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Montant payé</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{{ formatCurrency(stats.payments?.total_amount || 0) }}</p>
              </div>
              <IconMoney class="w-12 h-12 text-gray-700" />
            </div>
            <div class="mt-4">
              <p class="text-sm text-gray-600">{{ stats.payments?.payment_rate || 0 }}% des paiements</p>
            </div>
          </div>

          <!-- Reste à payer -->
          <div class="block">
            <div class="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Reste à payer</p>
                  <p class="text-3xl font-bold text-red-600 mt-2">{{ formatCurrency(stats.payments?.remaining || 0) }}</p>
                </div>
                <IconMoney class="w-12 h-12 text-red-600" />
              </div>
              <div class="mt-4">
                <p class="text-sm text-gray-600">Montant attendu: {{ formatCurrency(stats.payments?.expected || 0) }}</p>
              </div>
            </div>
          </div>

          <!-- Classes -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total des classes</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.classes?.total || 0 }}</p>
              </div>
              <IconClassroom class="w-12 h-12 text-gray-700" />
            </div>
            <div class="mt-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Complètes</span>
                <span class="font-medium text-green-600">{{ stats.classes?.complete || 0 }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Partielles</span>
                <span class="font-medium text-yellow-600">{{ stats.classes?.partial || 0 }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Vides</span>
                <span class="font-medium text-red-600">{{ stats.classes?.empty || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- Familles -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total des familles</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.families?.total || 0 }}</p>
              </div>
              <IconFamily class="w-12 h-12 text-gray-700" />
            </div>
            <div class="mt-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Payées</span>
                <span class="font-medium text-green-600">{{ stats.families?.paid_count || 0 }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Partiellement payées</span>
                <span class="font-medium text-yellow-600">{{ stats.families?.partially_paid_count || 0 }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Non payées</span>
                <span class="font-medium text-red-600">{{ stats.families?.unpaid_count || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Détails des paiements -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Répartition des paiements</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="block">
              <div class="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                <IconCheck class="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p class="text-sm text-gray-600">Chèques</p>
                <p class="text-xl font-bold text-gray-900">{{ formatCurrency(stats.payments?.by_type?.cheque?.amount || 0) }}</p>
                <p class="text-xs text-gray-600">{{ stats.payments?.by_type?.cheque?.count || 0 }} chèques</p>
              </div>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <IconCash class="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p class="text-sm text-gray-600">Espèces</p>
              <p class="text-xl font-bold text-gray-900">{{ formatCurrency(stats.payments?.by_type?.espece?.amount || 0) }}</p>
              <p class="text-xs text-gray-600">{{ stats.payments?.by_type?.espece?.count || 0 }} paiements</p>
            </div>
            <div class="text-center p-4 bg-purple-50 rounded-lg">
              <IconCard class="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p class="text-sm text-gray-600">Cartes</p>
              <p class="text-xl font-bold text-gray-900">{{ formatCurrency(stats.payments?.by_type?.carte?.amount || 0) }}</p>
              <p class="text-xs text-gray-600">{{ stats.payments?.by_type?.carte?.count || 0 }} paiements</p>
            </div>
            <div class="text-center p-4 bg-orange-50 rounded-lg">
              <IconGift class="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p class="text-sm text-gray-600">Exonérations</p>
              <p class="text-xl font-bold text-gray-900">{{ formatCurrency(stats.payments?.by_type?.exoneration?.amount || 0) }}</p>
              <p class="text-xs text-gray-600">{{ stats.payments?.by_type?.exoneration?.count || 0 }} exonérations</p>
            </div>
          </div>
        </div>

        <!-- Graphiques -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Graphique répartition par genre -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Répartition par genre</h2>
            <div style="position: relative; height: 300px;">
              <canvas ref="genderChart"></canvas>
            </div>
          </div>

          <!-- Graphique taux de remplissage -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Taux de remplissage des classes</h2>
            <div style="position: relative; height: 300px;">
              <canvas ref="fillRateChart"></canvas>
            </div>
          </div>
        </div>


      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { usePageTitle } from '~/composables/usePageTitle'
import { statisticsService } from '~/services/statistics'
import Chart from 'chart.js/auto'
import IconUsers from '~/components/Icons/IconUsers.vue'
import IconMoney from '~/components/Icons/IconMoney.vue'
import IconClassroom from '~/components/Icons/IconClassroom.vue'
import IconFamily from '~/components/Icons/IconFamily.vue'
import IconCheck from '~/components/Icons/Check-TLB.vue'
import IconCash from '~/components/Icons/IconCash.vue'
import IconCard from '~/components/Icons/IconCard.vue'
import IconGift from '~/components/Icons/IconGift.vue'

usePageTitle('Statistiques')

definePageMeta({
  layout: 'auth',
  middleware: 'admin-director'
})

const { user } = useAuth()
const stats = ref({})
const unpaidFamilies = ref([])
const genderChart = ref(null)
const fillRateChart = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

let genderChartInstance = null
let fillRateChartInstance = null

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const loadStatistics = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    
    const schoolId = localStorage.getItem('current_school_id') || 1
    
    const [overviewResponse, unpaidResponse] = await Promise.all([
      statisticsService.getOverview(schoolId),
      statisticsService.getUnpaidFamilies(schoolId)
    ])


    stats.value = overviewResponse.data
    unpaidFamilies.value = unpaidResponse.data

    await nextTick()
    
    // Delay to ensure DOM is ready
    setTimeout(() => {
      createGenderChart()
      createFillRateChart()
    }, 100)
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Erreur lors du chargement des statistiques'
  } finally {
    isLoading.value = false
  }
}

const createGenderChart = () => {
  if (genderChartInstance) {
    genderChartInstance.destroy()
  }

  const ctx = genderChart.value?.getContext('2d')
  if (!ctx) return

  const data = [
    stats.value.enrollments?.men || 0,
    stats.value.enrollments?.women || 0,
    stats.value.enrollments?.children || 0
  ]

  genderChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Hommes', 'Femmes', 'Enfants'],
      datasets: [{
        data: data,
        backgroundColor: [
          '#93C5FD',
          '#FDA4AF',
          '#FCD34D'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0
              return context.label + ': ' + context.parsed + ' (' + percentage + '%)'
            }
          }
        }
      }
    }
  })
}

const createFillRateChart = () => {
  if (fillRateChartInstance) {
    fillRateChartInstance.destroy()
  }

  const ctx = fillRateChart.value?.getContext('2d')
  if (!ctx) return

  const data = [
    stats.value.classes?.complete || 0,
    stats.value.classes?.partial || 0,
    stats.value.classes?.empty || 0
  ]

  fillRateChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Complètes', 'Partielles', 'Vides'],
      datasets: [{
        label: 'Nombre de classes',
        data: data,
        backgroundColor: [
          'rgb(31, 41, 55)',
          'rgb(156, 163, 175)',
          'rgb(229, 231, 235)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  })
}

onMounted(() => {
  loadStatistics()
})
</script>