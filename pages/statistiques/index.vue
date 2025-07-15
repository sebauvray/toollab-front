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
      <div v-else class="flex flex-col gap-3">
        <!-- Cartes de statistiques principales -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <!-- Inscriptions -->
          <NuxtLink to="/classes" class="block relative">
            <div class="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-all hover:shadow-md cursor-pointer">
              <div class="absolute top-3 right-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </div>
              <div class="flex items-start gap-3">
                <div class="p-2 bg-blue-50 rounded">
                  <IconUsers class="w-6 h-6 text-blue-600" />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-500">Total des inscrits</p>
                  <p class="text-xl font-bold text-gray-900 mt-1">{{ stats.enrollments?.total || 0 }}</p>
                </div>
              </div>
            <div class="mt-2 space-y-0.5">
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Hommes</span>
                <span class="font-medium">{{ stats.enrollments?.men || 0 }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Femmes</span>
                <span class="font-medium">{{ stats.enrollments?.women || 0 }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Enfants</span>
                <span class="font-medium">{{ stats.enrollments?.children || 0 }}</span>
              </div>
            </div>
            </div>
          </NuxtLink>

          <!-- Reste à payer -->
          <NuxtLink to="/statistiques/impayees" class="block relative">
            <div class="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-all hover:shadow-md cursor-pointer">
              <div class="absolute top-3 right-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </div>
              <div class="flex items-start gap-3">
                <div class="p-2 bg-red-50 rounded">
                  <IconNotification class="w-6 h-6 text-red-600" />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-500">Reste à payer</p>
                  <p class="text-xl font-bold text-gray-900 mt-1">{{ formatCurrency(stats.payments?.remaining || 0) }}</p>
                </div>
              </div>
              <div class="mt-2 space-y-0.5">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-600">Montant attendu</span>
                  <span class="font-medium">{{ formatCurrency(stats.payments?.expected || 0) }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-gray-600">Familles impayées</span>
                  <span class="font-medium text-red-600">{{ stats.families?.unpaid_count || 0 }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-gray-600">Taux de recouvrement</span>
                  <span class="font-medium">{{ stats.payments?.payment_rate || 0 }}%</span>
                </div>
              </div>
            </div>
          </NuxtLink>

          <!-- Classes -->
          <NuxtLink to="/cursus" class="block relative">
            <div class="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-all hover:shadow-md cursor-pointer">
              <div class="absolute top-3 right-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </div>
              <div class="flex items-start gap-3">
                <div class="p-2 bg-purple-50 rounded">
                  <IconClassroom class="w-6 h-6 text-purple-600" />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-500">Total des classes</p>
                  <p class="text-xl font-bold text-gray-900 mt-1">{{ stats.classes?.total || 0 }}</p>
                </div>
              </div>
            <div class="mt-2 space-y-0.5">
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Complètes</span>
                <span class="font-medium text-green-600">{{ stats.classes?.complete || 0 }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Partielles</span>
                <span class="font-medium text-yellow-600">{{ stats.classes?.partial || 0 }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Vides</span>
                <span class="font-medium text-red-600">{{ stats.classes?.empty || 0 }}</span>
              </div>
            </div>
            </div>
          </NuxtLink>

          <!-- Familles -->
          <NuxtLink to="/family" class="block relative">
            <div class="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-all hover:shadow-md cursor-pointer">
              <div class="absolute top-3 right-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </div>
              <div class="flex items-start gap-3">
                <div class="p-2 bg-amber-50 rounded">
                  <IconFamily class="w-6 h-6 text-amber-600" />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-500">Total des familles</p>
                  <p class="text-xl font-bold text-gray-900 mt-1">{{ stats.families?.total || 0 }}</p>
                </div>
              </div>
            <div class="mt-2 space-y-0.5">
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Payées</span>
                <span class="font-medium text-green-600">{{ stats.families?.paid_count || 0 }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Partiellement payées</span>
                <span class="font-medium text-yellow-600">{{ stats.families?.partially_paid_count || 0 }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Non payées</span>
                <span class="font-medium text-red-600">{{ stats.families?.unpaid_count || 0 }}</span>
              </div>
            </div>
            </div>
          </NuxtLink>
        </div>

        <!-- Détails des paiements -->
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-base font-semibold text-gray-900 mb-2">Répartition des paiements</h2>
          
          <!-- Montant total payé -->
          <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 mb-4 border border-green-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="p-3 bg-green-600 rounded-lg shadow-md">
                  <IconCash class="w-8 h-8 text-white" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-600">Montant total payé</p>
                  <p class="text-3xl font-bold text-gray-900">{{ formatCurrency(stats.payments?.total_amount || 0) }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-2xl font-bold text-green-600">{{ stats.payments?.payment_rate || 0 }}%</p>
                <p class="text-sm text-gray-600">Taux de recouvrement</p>
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
            <NuxtLink to="/statistiques/cheques" class="block relative">
              <div class="text-center p-3 bg-blue-50 rounded hover:bg-blue-100 transition-colors cursor-pointer">
                <div class="absolute top-2 right-2">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </div>
                <IconCheck class="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p class="text-xs text-gray-600">Chèques</p>
                <p class="text-lg font-bold text-gray-900">{{ formatCurrency(stats.payments?.by_type?.cheque?.amount || 0) }}</p>
                <p class="text-xs text-gray-500">{{ stats.payments?.by_type?.cheque?.count || 0 }} chèques</p>
              </div>
            </NuxtLink>
            <div class="text-center p-3 bg-yellow-50 rounded">
              <IconCash class="w-6 h-6 text-yellow-600 mx-auto mb-1" />
              <p class="text-xs text-gray-600">Espèces</p>
              <p class="text-lg font-bold text-gray-900">{{ formatCurrency(stats.payments?.by_type?.espece?.amount || 0) }}</p>
              <p class="text-xs text-gray-500">{{ stats.payments?.by_type?.espece?.count || 0 }} paiements</p>
            </div>
            <div class="text-center p-3 bg-purple-50 rounded">
              <IconCard class="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <p class="text-xs text-gray-600">Cartes</p>
              <p class="text-lg font-bold text-gray-900">{{ formatCurrency(stats.payments?.by_type?.carte?.amount || 0) }}</p>
              <p class="text-xs text-gray-500">{{ stats.payments?.by_type?.carte?.count || 0 }} paiements</p>
            </div>
            <div class="text-center p-3 bg-orange-50 rounded">
              <IconGift class="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <p class="text-xs text-gray-600">Exonérations</p>
              <p class="text-lg font-bold text-gray-900">{{ formatCurrency(stats.payments?.by_type?.exoneration?.amount || 0) }}</p>
              <p class="text-xs text-gray-500">{{ stats.payments?.by_type?.exoneration?.count || 0 }} exonérations</p>
            </div>
          </div>
        </div>

        <!-- Graphiques -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Graphique répartition par genre -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h2 class="text-base font-semibold text-gray-900 mb-2">Répartition par genre</h2>
            <div style="position: relative; height: 250px;">
              <canvas ref="genderChart"></canvas>
            </div>
          </div>

          <!-- Graphique taux de remplissage -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h2 class="text-base font-semibold text-gray-900 mb-2">Taux de remplissage par cursus</h2>
            <div style="position: relative; height: 250px;">
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
import { useAuth } from '~/composables/useAuth.js'
import { usePageTitle } from '~/composables/usePageTitle.js'
import { statisticsService } from '~/services/statistics.js'
import Chart from 'chart.js/auto'
import IconUsers from '~/components/Icons/IconUsers.vue'
import IconMoney from '~/components/Icons/IconMoney.vue'
import IconClassroom from '~/components/Icons/IconClassroom.vue'
import IconFamily from '~/components/Icons/IconFamily.vue'
import IconCheck from '~/components/Icons/Check-TLB.vue'
import IconCash from '~/components/Icons/IconCash.vue'
import IconCard from '~/components/Icons/IconCard.vue'
import IconGift from '~/components/Icons/IconGift.vue'
import IconNotification from '~/components/Icons/Notification.vue'

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
  if (!ctx || !stats.value.cursus) return

  const labels = stats.value.cursus.map(c => c.name)
  const enrolled = stats.value.cursus.map(c => c.enrolled_students)
  const available = stats.value.cursus.map(c => c.available_places)

  fillRateChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Élèves inscrits',
          data: enrolled,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        },
        {
          label: 'Places disponibles',
          data: available,
          backgroundColor: 'rgba(229, 231, 235, 0.8)',
          borderColor: 'rgb(209, 213, 219)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: {
            font: {
              size: 11
            }
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            stepSize: 10,
            font: {
              size: 11
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: {
              size: 11
            },
            usePointStyle: true,
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const cursusData = stats.value.cursus[context.dataIndex]
              if (context.datasetIndex === 0) {
                return `Taux: ${cursusData.fill_rate}%`
              }
              return ''
            }
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