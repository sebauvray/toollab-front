<script setup>
import { ref, onMounted } from 'vue'
import tarificationService from '~/services/tarification'

const props = defineProps({
  familyId: {
    type: Number,
    required: true
  },
  inscriptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['tarifCalculated'])

const isLoading = ref(true)
const tarifDetails = ref(null)
const error = ref(null)

const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

const calculerTarifs = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await tarificationService.calculerTarifs(
        props.familyId,
        props.inscriptions
    )

    if (response.status === 'success') {
      tarifDetails.value = response.data
      emit('tarifCalculated', response.data.total_famille)
    }
  } catch (err) {
    console.error('Erreur lors du calcul des tarifs:', err)
    error.value = 'Impossible de calculer les tarifs. Veuillez réessayer.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  calculerTarifs()
})
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <div class="p-6 border-b border-gray-200">
      <h3 class="text-lg font-semibold">Récapitulatif des tarifs</h3>
    </div>

    <div v-if="isLoading" class="p-6 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p class="mt-2 text-gray-500">Calcul des tarifs en cours...</p>
    </div>

    <div v-else-if="error" class="p-6">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-700">{{ error }}</p>
      </div>
    </div>

    <div v-else-if="tarifDetails" class="p-6 space-y-6">
      <div v-for="eleve in tarifDetails.details_par_eleve" :key="eleve.student_id" class="border-b border-gray-100 pb-4 last:border-0">
        <h4 class="font-medium text-gray-900 mb-3">{{ eleve.student_name }}</h4>

        <div v-for="cursus in eleve.cursus" :key="cursus.cursus_id" class="ml-4 mb-3">
          <div class="flex justify-between items-start mb-2">
            <span class="text-gray-700">{{ cursus.cursus_name }}</span>
            <span class="text-gray-900 font-medium">{{ formatPrice(cursus.prix_base) }}</span>
          </div>

          <div v-if="cursus.reductions.length > 0" class="ml-4 space-y-1">
            <div v-for="(reduction, index) in cursus.reductions" :key="index" class="flex justify-between text-sm">
              <span class="text-gray-600">
                <span v-if="reduction.type === 'familiale'">Réduction familiale</span>
                <span v-else-if="reduction.type === 'multi_cursus'">Réduction multi-cursus</span>
                ({{ reduction.pourcentage }}%)
              </span>
              <span class="text-green-600">-{{ formatPrice(reduction.montant) }}</span>
            </div>
          </div>

          <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
            <span class="text-sm text-gray-600">Sous-total {{ cursus.cursus_name }}</span>
            <span class="font-medium text-gray-900">{{ formatPrice(cursus.prix_final) }}</span>
          </div>
        </div>
      </div>

      <div class="border-t-2 border-gray-200 pt-4">
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">Total à payer</span>
          <span class="text-2xl font-bold text-primary">{{ formatPrice(tarifDetails.total_famille) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>