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
    <div class="p-5 border-b border-gray-200">
      <h3 class="text-base font-semibold">Récapitulatif des tarifs</h3>
    </div>

    <div v-if="isLoading" class="p-5 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p class="mt-1.5 text-gray-500">Calcul des tarifs en cours...</p>
    </div>

    <div v-else-if="error" class="p-5">
      <div class="bg-red-50 border border-red-200 rounded-lg p-3">
        <p class="text-red-700">{{ error }}</p>
      </div>
    </div>

    <div v-else-if="tarifDetails" class="p-5 space-y-5">
      <div v-for="eleve in tarifDetails.details_par_eleve" :key="eleve.student_id" class="border-b border-gray-100 pb-3 last:border-0">
        <h4 class="font-medium text-gray-900 mb-2">{{ eleve.student_name }}</h4>

        <div v-for="cursus in eleve.cursus" :key="cursus.cursus_id" class="ml-3 mb-2">
          <div class="flex justify-between items-start mb-1.5">
            <span class="text-gray-700">{{ cursus.cursus_name }}</span>
            <span class="text-gray-900 font-medium">{{ formatPrice(cursus.prix_base) }}</span>
          </div>

          <div v-if="cursus.reductions.length > 0" class="ml-3 space-y-1">
            <div v-for="(reduction, index) in cursus.reductions" :key="index" class="flex justify-between text-xs">
              <span class="text-gray-600">
                <span v-if="reduction.type === 'familiale'">Réduction familiale</span>
                <span v-else-if="reduction.type === 'multi_cursus'">Réduction multi-cursus</span>
                ({{ reduction.pourcentage }}%)
              </span>
              <span class="text-green-600">-{{ formatPrice(reduction.montant) }}</span>
            </div>
          </div>

          <div class="flex justify-between items-center mt-1.5 pt-1.5 border-t border-gray-100">
            <span class="text-xs text-gray-600">Sous-total {{ cursus.cursus_name }}</span>
            <span class="font-medium text-gray-900">{{ formatPrice(cursus.prix_final) }}</span>
          </div>
        </div>
      </div>

      <div class="border-t-2 border-gray-200 pt-3">
        <div class="flex justify-between items-center">
          <span class="text-base font-semibold">Total à payer</span>
          <span class="text-xl font-bold text-primary">{{ formatPrice(tarifDetails.total_famille) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>