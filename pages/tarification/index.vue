<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { usePageTitle } from '~/composables/usePageTitle'
import tarificationService from '~/services/tarification'
import Plus from '~/components/Icons/Plus.vue'
import Trash from '~/components/Icons/Trash.vue'
import EditIcon from '~/components/Icons/Edit.vue'
import ConfirmationModal from '~/components/modals/ConfirmationModal.vue'

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Tarification'
  },
  middleware: 'director'
})

usePageTitle('Tarification')

const { user } = useAuth()
const { setFlashMessage } = useFlashMessage()

const cursuses = ref([])
const selectedCursus = ref(null)
const isLoading = ref(true)
const isSaving = ref(false)

const showAddFamiliale = ref(false)
const showAddMultiCursus = ref(false)
const editingFamiliale = ref(null)
const editingMultiCursus = ref(null)

const showDeleteConfirmation = ref(false)
const deletingReductionId = ref(null)

const tarifForm = ref({
  prix: ''
})

const familialeForm = ref({
  nombre_eleves_min: '',
  mode: 'montant',
  montant_cible: '',
  pourcentage_reduction: ''
})

const multiCursusForm = ref({
  cursus_requis_id: '',
  pourcentage_reduction: ''
})

const availableCursusesForMultiCursus = computed(() => {
  if (!selectedCursus.value) return []

  const existingRequiredIds = selectedCursus.value.reductions_multi_cursus?.map(r => r.cursus_requis_id) || []

  const cursusesThatRequireThis = cursuses.value
      .filter(c => c.reductions_multi_cursus?.some(r => r.cursus_requis_id === selectedCursus.value.id))
      .map(c => c.id)

  return cursuses.value.filter(c =>
      c.id !== selectedCursus.value.id &&
      !existingRequiredIds.includes(c.id) &&
      !cursusesThatRequireThis.includes(c.id)
  )
})

const calculatedTarifApresReduction = computed(() => {
  if (!selectedCursus.value?.tarif?.prix || !familialeForm.value.pourcentage_reduction) {
    return 0
  }

  const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
  const pourcentage = parseFloat(familialeForm.value.pourcentage_reduction)

  if (familialeForm.value.mode === 'montant' && familialeForm.value.montant_cible) {
    return parseFloat(familialeForm.value.montant_cible)
  }

  const result = tarifBase * (1 - pourcentage / 100)
  return Math.round(result * 100) / 100
})

const calculateTarifWithReduction = (tarifBase, pourcentageReduction) => {
  const base = parseFloat(tarifBase)
  const pourcentage = parseFloat(pourcentageReduction)
  const result = base * (1 - pourcentage / 100)
  return Math.round(result * 100) / 100
}

const calculerPourcentageReduction = () => {
  if (!selectedCursus.value?.tarif?.prix || !familialeForm.value.montant_cible) return

  const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
  const montantCible = parseFloat(familialeForm.value.montant_cible)

  if (montantCible >= tarifBase) {
    familialeForm.value.pourcentage_reduction = ''
    return
  }

  const reduction = ((tarifBase - montantCible) / tarifBase) * 100
  familialeForm.value.pourcentage_reduction = Math.round(reduction * 100) / 100
}

const calculerMontantCible = () => {
  if (!selectedCursus.value?.tarif?.prix || !familialeForm.value.pourcentage_reduction) return

  const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
  const pourcentage = parseFloat(familialeForm.value.pourcentage_reduction)

  familialeForm.value.montant_cible = calculateTarifWithReduction(tarifBase, pourcentage)
}

const getTarifPrecedent = (nombreEleves) => {
  if (!selectedCursus.value?.tarif?.prix) {
    return 0
  }

  const tarifBase = parseFloat(selectedCursus.value.tarif.prix)

  if (!selectedCursus.value?.reductions_familiales || selectedCursus.value.reductions_familiales.length === 0) {
    return tarifBase
  }

  const reduction = selectedCursus.value.reductions_familiales.find(r => r.nombre_eleves_min === nombreEleves)

  if (!reduction) {
    return tarifBase
  }

  return calculateTarifWithReduction(tarifBase, reduction.pourcentage_reduction)
}

const fetchCursuses = async () => {
  try {
    isLoading.value = true
    const response = await tarificationService.getCursusTarifs()

    if (response.status === 'success') {
      cursuses.value = response.data.cursuses
      if (cursuses.value.length > 0 && !selectedCursus.value) {
        selectCursus(cursuses.value[0])
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des cursus:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la récupération des cursus'
    })
  } finally {
    isLoading.value = false
  }
}

const selectCursus = (cursus) => {
  selectedCursus.value = cursus
  tarifForm.value.prix = cursus.tarif ? cursus.tarif.prix : ''

  showAddFamiliale.value = false
  showAddMultiCursus.value = false
  editingFamiliale.value = null
  editingMultiCursus.value = null
  resetFamilialeForm()
  resetMultiCursusForm()
}

const updateTarif = async () => {
  if (!selectedCursus.value || !tarifForm.value.prix) return

  try {
    isSaving.value = true
    const response = await tarificationService.updateTarif(
        selectedCursus.value.id,
        tarifForm.value.prix
    )

    if (response.status === 'success') {
      const index = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
      if (index !== -1) {
        if (!cursuses.value[index].tarif) {
          cursuses.value[index].tarif = {}
        }
        cursuses.value[index].tarif.prix = response.data.tarif.prix
      }
      if (!selectedCursus.value.tarif) {
        selectedCursus.value.tarif = {}
      }
      selectedCursus.value.tarif.prix = response.data.tarif.prix

      setFlashMessage({
        type: 'success',
        message: 'Tarif mis à jour avec succès'
      })
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du tarif:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la mise à jour du tarif'
    })
  } finally {
    isSaving.value = false
  }
}

const addReductionFamiliale = async () => {
  if (!selectedCursus.value || !familialeForm.value.nombre_eleves_min || !familialeForm.value.pourcentage_reduction) {
    return
  }

  try {
    isSaving.value = true
    const response = await tarificationService.addReductionFamiliale(
        selectedCursus.value.id,
        {
          nombre_eleves_min: parseInt(familialeForm.value.nombre_eleves_min),
          pourcentage_reduction: parseFloat(familialeForm.value.pourcentage_reduction)
        }
    )

    if (response.status === 'success' && response.data.reduction) {
      if (!selectedCursus.value.reductions_familiales) {
        selectedCursus.value.reductions_familiales = []
      }

      selectedCursus.value.reductions_familiales.push(response.data.reduction)
      selectedCursus.value.reductions_familiales.sort((a, b) => a.nombre_eleves_min - b.nombre_eleves_min)

      const index = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
      if (index !== -1) {
        if (!cursuses.value[index].reductions_familiales) {
          cursuses.value[index].reductions_familiales = []
        }
        cursuses.value[index].reductions_familiales = [...selectedCursus.value.reductions_familiales]
      }

      showAddFamiliale.value = false
      editingFamiliale.value = null
      resetFamilialeForm()

      setFlashMessage({
        type: 'success',
        message: 'Réduction familiale ajoutée avec succès'
      })
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la réduction familiale:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de l\'ajout de la réduction familiale'
    })
  } finally {
    isSaving.value = false
    showAddFamiliale.value = false
  }
}

const updateReductionFamiliale = async () => {
  if (!editingFamiliale.value) return

  try {
    isSaving.value = true
    const response = await tarificationService.updateReductionFamiliale(
        editingFamiliale.value.id,
        {
          nombre_eleves_min: parseInt(familialeForm.value.nombre_eleves_min),
          pourcentage_reduction: parseFloat(familialeForm.value.pourcentage_reduction)
        }
    )

    if (response.status === 'success') {
      const index = selectedCursus.value.reductions_familiales.findIndex(r => r.id === editingFamiliale.value.id)
      if (index !== -1) {
        selectedCursus.value.reductions_familiales[index] = response.data.reduction
      }

      const cursusIndex = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
      if (cursusIndex !== -1) {
        cursuses.value[cursusIndex].reductions_familiales = [...selectedCursus.value.reductions_familiales]
      }

      showAddFamiliale.value = false
      editingFamiliale.value = null
      resetFamilialeForm()

      setFlashMessage({
        type: 'success',
        message: 'Réduction familiale mise à jour avec succès'
      })
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réduction familiale:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la mise à jour de la réduction familiale'
    })
  } finally {
    isSaving.value = false
    showAddFamiliale.value = false
  }
}

const confirmDeleteReductionFamiliale = (reductionId) => {
  deletingReductionId.value = reductionId
  showDeleteConfirmation.value = true
}

const deleteReductionFamiliale = async () => {
  if (!deletingReductionId.value) return

  try {
    isSaving.value = true
    const response = await tarificationService.deleteReductionFamiliale(deletingReductionId.value)

    if (response.status === 'success') {
      selectedCursus.value.reductions_familiales = selectedCursus.value.reductions_familiales.filter(
          r => r.id !== deletingReductionId.value
      )

      const index = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
      if (index !== -1) {
        cursuses.value[index].reductions_familiales = [...selectedCursus.value.reductions_familiales]
      }

      setFlashMessage({
        type: 'success',
        message: 'Réduction familiale supprimée avec succès'
      })
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la réduction familiale:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la suppression de la réduction familiale'
    })
  } finally {
    isSaving.value = false
    showDeleteConfirmation.value = false
    deletingReductionId.value = null
  }
}

const editReductionFamiliale = (reduction) => {
  editingFamiliale.value = reduction
  familialeForm.value.nombre_eleves_min = reduction.nombre_eleves_min.toString()
  familialeForm.value.pourcentage_reduction = reduction.pourcentage_reduction.toString()
  familialeForm.value.mode = 'pourcentage'

  const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
  familialeForm.value.montant_cible = calculateTarifWithReduction(tarifBase, reduction.pourcentage_reduction)

  showAddFamiliale.value = true
}

const resetFamilialeForm = () => {
  familialeForm.value = {
    nombre_eleves_min: '',
    mode: 'montant',
    montant_cible: '',
    pourcentage_reduction: ''
  }
}

const addReductionMultiCursus = async () => {
  if (!selectedCursus.value || !multiCursusForm.value.cursus_requis_id || !multiCursusForm.value.pourcentage_reduction) {
    return
  }

  try {
    isSaving.value = true
    const response = await tarificationService.addReductionMultiCursus(
        selectedCursus.value.id,
        {
          cursus_requis_id: parseInt(multiCursusForm.value.cursus_requis_id),
          pourcentage_reduction: parseFloat(multiCursusForm.value.pourcentage_reduction)
        }
    )

    if (response.status === 'success') {
      if (!selectedCursus.value.reductions_multi_cursus) {
        selectedCursus.value.reductions_multi_cursus = []
      }
      selectedCursus.value.reductions_multi_cursus.push(response.data.reduction)

      const index = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
      if (index !== -1) {
        cursuses.value[index].reductions_multi_cursus = [...selectedCursus.value.reductions_multi_cursus]
      }

      showAddMultiCursus.value = false
      resetMultiCursusForm()

      setFlashMessage({
        type: 'success',
        message: 'Réduction multi-cursus ajoutée avec succès'
      })
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la réduction multi-cursus:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de l\'ajout de la réduction multi-cursus'
    })
  } finally {
    isSaving.value = false
  }
}

const updateReductionMultiCursus = async () => {
  if (!editingMultiCursus.value) return

  try {
    isSaving.value = true
    const response = await tarificationService.updateReductionMultiCursus(
        editingMultiCursus.value.id,
        {
          cursus_requis_id: parseInt(multiCursusForm.value.cursus_requis_id),
          pourcentage_reduction: parseFloat(multiCursusForm.value.pourcentage_reduction)
        }
    )

    if (response.status === 'success') {
      const index = selectedCursus.value.reductions_multi_cursus.findIndex(r => r.id === editingMultiCursus.value.id)
      if (index !== -1) {
        selectedCursus.value.reductions_multi_cursus[index] = response.data.reduction
      }

      const cursusIndex = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
      if (cursusIndex !== -1) {
        cursuses.value[cursusIndex].reductions_multi_cursus = [...selectedCursus.value.reductions_multi_cursus]
      }

      showAddMultiCursus.value = false
      editingMultiCursus.value = null
      resetMultiCursusForm()

      setFlashMessage({
        type: 'success',
        message: 'Réduction multi-cursus mise à jour avec succès'
      })
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réduction multi-cursus:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la mise à jour de la réduction multi-cursus'
    })
  } finally {
    isSaving.value = false
  }
}

const deleteReductionMultiCursus = async (reductionId) => {
  try {
    isSaving.value = true
    const response = await tarificationService.deleteReductionMultiCursus(reductionId)

    if (response.status === 'success') {
      selectedCursus.value.reductions_multi_cursus = selectedCursus.value.reductions_multi_cursus.filter(
          r => r.id !== reductionId
      )

      const index = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
      if (index !== -1) {
        cursuses.value[index].reductions_multi_cursus = [...selectedCursus.value.reductions_multi_cursus]
      }

      setFlashMessage({
        type: 'success',
        message: 'Réduction multi-cursus supprimée avec succès'
      })
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la réduction multi-cursus:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la suppression de la réduction multi-cursus'
    })
  } finally {
    isSaving.value = false
  }
}

const editReductionMultiCursus = (reduction) => {
  editingMultiCursus.value = reduction
  multiCursusForm.value.cursus_requis_id = reduction.cursus_requis_id.toString()
  multiCursusForm.value.pourcentage_reduction = reduction.pourcentage_reduction.toString()
  showAddMultiCursus.value = true
}

const resetMultiCursusForm = () => {
  multiCursusForm.value = {
    cursus_requis_id: '',
    pourcentage_reduction: ''
  }
}

const getCursusRequiredName = (cursusRequiredId) => {
  const cursus = cursuses.value.find(c => c.id === cursusRequiredId)
  return cursus ? cursus.name : 'Cursus inconnu'
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

onMounted(() => {
  fetchCursuses()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex flex-col lg:flex-row gap-6">
        <div class="lg:w-1/4">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="p-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold">Cursus disponibles</h2>
            </div>
            <div class="p-4">
              <div class="space-y-2">
                <button
                    v-for="cursus in cursuses"
                    :key="cursus.id"
                    @click="selectCursus(cursus)"
                    :class="[
                      'w-full text-left px-3 py-2 rounded-md transition-colors',
                      selectedCursus?.id === cursus.id
                        ? 'bg-black text-white'
                        : 'hover:bg-gray-100'
                    ]"
                >
                  {{ cursus.name }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:w-3/4">
          <div v-if="selectedCursus" class="space-y-6">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-xl font-semibold mb-4">Tarif de base - {{ selectedCursus.name }}</h2>
              <div class="flex items-center gap-4">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
                  <input
                      v-model="tarifForm.prix"
                      type="number"
                      step="0.01"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                </div>
                <button
                    @click="updateTarif"
                    :disabled="isSaving"
                    class="mt-6 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Réductions familiales</h2>
                <button
                    @click="showAddFamiliale = true; editingFamiliale = null; resetFamilialeForm()"
                    class="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md hover:bg-gray-800"
                >
                  <Plus class="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              <div v-if="selectedCursus.reductions_familiales?.length > 0" class="space-y-3">
                <div
                    v-for="(reduction, index) in selectedCursus.reductions_familiales"
                    :key="reduction.id || `temp-${index}`"
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p class="font-medium">À partir de {{ reduction.nombre_eleves_min }} élèves</p>
                    <p class="text-sm text-gray-600">Réduction : {{ reduction.pourcentage_reduction }}%</p>
                    <p class="text-sm text-gray-600">
                      Tarif après réduction : {{ formatPrice(getTarifPrecedent(reduction.nombre_eleves_min)) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                        @click="editReductionFamiliale(reduction)"
                        class="p-1.5 text-gray-600 hover:text-gray-900"
                    >
                      <EditIcon class="w-4 h-4" />
                    </button>
                    <button
                        @click="confirmDeleteReductionFamiliale(reduction.id)"
                        class="p-1.5 text-gray-600 hover:text-red-600"
                    >
                      <Trash class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                Aucune réduction familiale configurée
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Réductions multi-cursus</h2>
                <button
                    @click="showAddMultiCursus = true; editingMultiCursus = null; resetMultiCursusForm()"
                    :disabled="availableCursusesForMultiCursus.length === 0"
                    class="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus class="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              <div v-if="selectedCursus.reductions_multi_cursus?.length > 0" class="space-y-3">
                <div
                    v-for="(reduction, index) in selectedCursus.reductions_multi_cursus"
                    :key="reduction.id || `temp-multi-${index}`"
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p class="font-medium">Si inscrit à : {{ getCursusRequiredName(reduction.cursus_requis_id) }}</p>
                    <p class="text-sm text-gray-600">Réduction : {{ reduction.pourcentage_reduction }}%</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                        @click="editReductionMultiCursus(reduction)"
                        class="p-1.5 text-gray-600 hover:text-gray-900"
                    >
                      <EditIcon class="w-4 h-4" />
                    </button>
                    <button
                        @click="deleteReductionMultiCursus(reduction.id)"
                        class="p-1.5 text-gray-600 hover:text-red-600"
                    >
                      <Trash class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                Aucune réduction multi-cursus configurée
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddFamiliale" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">
          {{ editingFamiliale ? 'Modifier' : 'Ajouter' }} une réduction familiale
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre d'élèves minimum</label>
            <input
                v-model="familialeForm.nombre_eleves_min"
                type="number"
                min="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mode de calcul</label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                    v-model="familialeForm.mode"
                    type="radio"
                    value="montant"
                    class="mr-2"
                />
                Montant
              </label>
              <label class="flex items-center">
                <input
                    v-model="familialeForm.mode"
                    type="radio"
                    value="pourcentage"
                    class="mr-2"
                />
                Pourcentage
              </label>
            </div>
          </div>

          <div v-if="familialeForm.mode === 'montant'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Montant après reduction (€)</label>
            <input
                v-model="familialeForm.montant_cible"
                @input="calculerPourcentageReduction"
                type="number"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>

          <div v-if="familialeForm.mode === 'pourcentage'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Pourcentage de réduction (%)</label>
            <input
                v-model="familialeForm.pourcentage_reduction"
                @input="calculerMontantCible"
                type="number"
                step="0.01"
                min="0"
                max="100"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>

          <div v-if="familialeForm.pourcentage_reduction" class="bg-gray-50 p-3 rounded-md">
            <p class="text-sm text-gray-600">
              Réduction : {{ familialeForm.pourcentage_reduction }}%
            </p>
            <p class="text-sm text-gray-600">
              Tarif après réduction : {{ formatPrice(calculatedTarifApresReduction) }}
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button
              @click="showAddFamiliale = false; editingFamiliale = null; resetFamilialeForm()"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
              @click="editingFamiliale ? updateReductionFamiliale() : addReductionFamiliale()"
              :disabled="isSaving || !familialeForm.nombre_eleves_min || !familialeForm.pourcentage_reduction"
              class="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ editingFamiliale ? 'Modifier' : 'Ajouter' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAddMultiCursus" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">
          {{ editingMultiCursus ? 'Modifier' : 'Ajouter' }} une réduction multi-cursus
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Si l'élève est inscrit à</label>
            <select
                v-model="multiCursusForm.cursus_requis_id"
                :disabled="editingMultiCursus !== null"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="">Sélectionnez un cursus</option>
              <option
                  v-for="cursus in availableCursusesForMultiCursus"
                  :key="cursus.id"
                  :value="cursus.id"
              >
                {{ cursus.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Pourcentage de réduction (%)</label>
            <input
                v-model="multiCursusForm.pourcentage_reduction"
                type="number"
                step="0.01"
                min="0"
                max="100"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button
              @click="showAddMultiCursus = false; editingMultiCursus = null; resetMultiCursusForm()"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
              @click="editingMultiCursus ? updateReductionMultiCursus() : addReductionMultiCursus()"
              :disabled="isSaving || !multiCursusForm.cursus_requis_id || !multiCursusForm.pourcentage_reduction"
              class="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ editingMultiCursus ? 'Modifier' : 'Ajouter' }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmationModal
        :is-open="showDeleteConfirmation"
        title="Supprimer la réduction"
        message="Êtes-vous sûr de vouloir supprimer cette réduction familiale ?"
        confirm-button-text="Supprimer"
        cancel-button-text="Annuler"
        confirm-button-class="bg-red-600 hover:bg-red-700 text-white"
        @confirm="deleteReductionFamiliale"
        @cancel="showDeleteConfirmation = false; deletingReductionId = null"
    />
  </div>
</template>