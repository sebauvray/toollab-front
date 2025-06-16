<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { usePageTitle } from '~/composables/usePageTitle'
import tarificationService from '~/services/tarification'
import Plus from '~/components/Icons/Plus.vue'
import Trash from '~/components/Icons/Trash.vue'
import EditIcon from '~/components/Icons/Edit.vue'

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

const calculerPourcentageReduction = () => {
  if (!selectedCursus.value?.tarif?.prix || !familialeForm.value.montant_cible) return

  const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
  const montantCible = parseFloat(familialeForm.value.montant_cible)

  if (montantCible >= tarifBase) {
    familialeForm.value.pourcentage_reduction = ''
    return
  }

  const reduction = ((tarifBase - montantCible) / tarifBase) * 100
  familialeForm.value.pourcentage_reduction = reduction.toFixed(2)
}

const calculerMontantCible = () => {
  if (!selectedCursus.value?.tarif?.prix || !familialeForm.value.pourcentage_reduction) return

  const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
  const pourcentage = parseFloat(familialeForm.value.pourcentage_reduction)

  const montantCible = tarifBase * (1 - pourcentage / 100)
  familialeForm.value.montant_cible = montantCible.toFixed(2)
}

const getTarifPrecedent = (nombreEleves) => {
  if (!selectedCursus.value?.tarif?.prix) {
    return 0
  }

  const tarifBase = parseFloat(selectedCursus.value.tarif.prix)

  if (!selectedCursus.value?.reductions_familiales || selectedCursus.value.reductions_familiales.length === 0) {
    return tarifBase
  }

  const reductionsApplicables = selectedCursus.value.reductions_familiales
      .filter(r => r.nombre_eleves_min < nombreEleves)
      .sort((a, b) => b.nombre_eleves_min - a.nombre_eleves_min)

  if (reductionsApplicables.length === 0) {
    return tarifBase
  }

  const pourcentageReduction = parseFloat(reductionsApplicables[0].pourcentage_reduction)
  return tarifBase * (1 - pourcentageReduction / 100)
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
    console.error('Erreur:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors du chargement des données'
    })
  } finally {
    isLoading.value = false
  }
}

const selectCursus = (cursus) => {
  selectedCursus.value = cursus
  tarifForm.value.prix = cursus.tarif?.prix || ''
  resetForms()
}

const resetForms = () => {
  showAddFamiliale.value = false
  showAddMultiCursus.value = false
  editingFamiliale.value = null
  editingMultiCursus.value = null
  familialeForm.value = {
    nombre_eleves_min: '',
    mode: 'montant',
    montant_cible: '',
    pourcentage_reduction: ''
  }
  multiCursusForm.value = {
    cursus_requis_id: '',
    pourcentage_reduction: ''
  }
}

const submitTarif = async () => {
  try {
    isSaving.value = true
    await tarificationService.updateTarif(selectedCursus.value.id, tarifForm.value.prix)
    setFlashMessage({
      type: 'success',
      message: 'Tarif mis à jour avec succès'
    })
    await fetchCursuses()
  } catch (error) {
    console.error('Erreur:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la mise à jour du tarif'
    })
  } finally {
    isSaving.value = false
  }
}

const submitReductionFamiliale = async () => {
  try {
    isSaving.value = true

    const dataToSend = {
      nombre_eleves_min: familialeForm.value.nombre_eleves_min,
      pourcentage_reduction: familialeForm.value.pourcentage_reduction
    }

    if (editingFamiliale.value) {
      await tarificationService.updateReductionFamiliale(
          editingFamiliale.value.id,
          dataToSend
      )
      setFlashMessage({
        type: 'success',
        message: 'Réduction familiale mise à jour avec succès'
      })
    } else {
      await tarificationService.addReductionFamiliale(
          selectedCursus.value.id,
          dataToSend
      )
      setFlashMessage({
        type: 'success',
        message: 'Réduction familiale ajoutée avec succès'
      })
    }

    await fetchCursuses()
    resetForms()
  } catch (error) {
    console.error('Erreur:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de l\'enregistrement de la réduction'
    })
  } finally {
    isSaving.value = false
  }
}

const submitReductionMultiCursus = async () => {
  try {
    isSaving.value = true

    if (editingMultiCursus.value) {
      await tarificationService.updateReductionMultiCursus(
          editingMultiCursus.value.id,
          { pourcentage_reduction: multiCursusForm.value.pourcentage_reduction }
      )
      setFlashMessage({
        type: 'success',
        message: 'Réduction multi-cursus mise à jour avec succès'
      })
    } else {
      await tarificationService.addReductionMultiCursus(
          selectedCursus.value.id,
          multiCursusForm.value
      )
      setFlashMessage({
        type: 'success',
        message: 'Réduction multi-cursus ajoutée avec succès'
      })
    }

    await fetchCursuses()
    resetForms()
  } catch (error) {
    console.error('Erreur:', error)
    if (error.response?.data?.message?.includes('dépendance circulaire')) {
      setFlashMessage({
        type: 'error',
        message: error.response.data.message
      })
    } else {
      setFlashMessage({
        type: 'error',
        message: 'Erreur lors de l\'enregistrement de la réduction'
      })
    }
  } finally {
    isSaving.value = false
  }
}

const deleteReductionFamiliale = async (reductionId) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette réduction ?')) return

  try {
    await tarificationService.deleteReductionFamiliale(reductionId)
    setFlashMessage({
      type: 'success',
      message: 'Réduction supprimée avec succès'
    })
    await fetchCursuses()
  } catch (error) {
    console.error('Erreur:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la suppression'
    })
  }
}

const deleteReductionMultiCursus = async (reductionId) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette réduction ?')) return

  try {
    await tarificationService.deleteReductionMultiCursus(reductionId)
    setFlashMessage({
      type: 'success',
      message: 'Réduction supprimée avec succès'
    })
    await fetchCursuses()
  } catch (error) {
    console.error('Erreur:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la suppression'
    })
  }
}

const editReductionFamiliale = (reduction) => {
  editingFamiliale.value = reduction
  const tarifPrecedent = getTarifPrecedent(reduction.nombre_eleves_min)
  const montantCible = tarifPrecedent * (1 - reduction.pourcentage_reduction / 100)

  familialeForm.value = {
    nombre_eleves_min: reduction.nombre_eleves_min,
    mode: 'montant',
    montant_cible: montantCible.toFixed(2),
    pourcentage_reduction: reduction.pourcentage_reduction
  }
  showAddFamiliale.value = true
}

const editReductionMultiCursus = (reduction) => {
  editingMultiCursus.value = reduction
  multiCursusForm.value = {
    cursus_requis_id: reduction.cursus_requis_id,
    pourcentage_reduction: reduction.pourcentage_reduction
  }
  showAddMultiCursus.value = true
}

onMounted(() => {
  fetchCursuses()
})
</script>

<template>
  <div class="p-6">
    <div class="flex gap-6">
      <div class="w-64 bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-4 border-b">
          <h3 class="font-semibold text-gray-900">Cursus</h3>
        </div>
        <div class="p-4">
          <div v-if="isLoading" class="space-y-2">
            <div class="h-10 bg-gray-100 animate-pulse rounded"></div>
            <div class="h-10 bg-gray-100 animate-pulse rounded"></div>
          </div>
          <div v-else class="space-y-2">
            <button
                v-for="cursus in cursuses"
                :key="cursus.id"
                @click="selectCursus(cursus)"
                :class="[
                  'w-full text-left px-4 py-2 rounded-lg transition-colors',
                  selectedCursus?.id === cursus.id
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100'
                ]"
            >
              {{ cursus.name }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1">
        <div v-if="selectedCursus" class="space-y-6">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-semibold mb-4">Tarif de base</h3>
            <form @submit.prevent="submitTarif" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Prix (€)
                </label>
                <input
                    type="number"
                    v-model="tarifForm.prix"
                    step="0.01"
                    min="0"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <button
                  type="submit"
                  :disabled="isSaving"
                  class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
              >
                {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </form>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">Réductions familiales</h3>
              <button
                  v-if="!showAddFamiliale"
                  @click="showAddFamiliale = true"
                  class="inline-flex items-center gap-2 px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                <Plus class="size-4" />
                Ajouter
              </button>
            </div>

            <div v-if="selectedCursus.reductions_familiales?.length > 0" class="space-y-3 mb-4">
              <div
                  v-for="reduction in selectedCursus.reductions_familiales"
                  :key="reduction.id"
                  class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <span class="font-medium">À partir de {{ reduction.nombre_eleves_min }} élèves</span>
                  <div class="text-sm text-gray-600 mt-1">
                    <span v-if="selectedCursus.tarif?.prix">
                      {{ parseFloat(getTarifPrecedent(reduction.nombre_eleves_min)).toFixed(2) }} € →
                      {{ (getTarifPrecedent(reduction.nombre_eleves_min) * (1 - reduction.pourcentage_reduction / 100)).toFixed(2) }} €
                    </span>
                    <span class="text-green-600 ml-2">(-{{ reduction.pourcentage_reduction }}%)</span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button
                      @click="editReductionFamiliale(reduction)"
                      class="p-2 text-gray-600 hover:text-primary transition-colors"
                  >
                    <EditIcon class="size-5" />
                  </button>
                  <button
                      @click="deleteReductionFamiliale(reduction.id)"
                      class="p-2 text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <Trash class="size-5" />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="showAddFamiliale" class="mt-4 p-4 bg-gray-50 rounded-lg">
              <form @submit.prevent="submitReductionFamiliale" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Nombre d'élèves minimum
                  </label>
                  <input
                      type="number"
                      v-model="familialeForm.nombre_eleves_min"
                      min="2"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Type de réduction
                  </label>
                  <div class="flex gap-4">
                    <label class="flex items-center">
                      <input
                          type="radio"
                          v-model="familialeForm.mode"
                          value="montant"
                          class="mr-2"
                      />
                      Montant fixe
                    </label>
                    <label class="flex items-center">
                      <input
                          type="radio"
                          v-model="familialeForm.mode"
                          value="pourcentage"
                          class="mr-2"
                      />
                      Pourcentage
                    </label>
                  </div>
                </div>

                <div class="space-y-3">
                  <div v-if="selectedCursus.tarif?.prix" class="text-sm text-gray-600">
                    Tarif précédent : {{ parseFloat(getTarifPrecedent(familialeForm.nombre_eleves_min) || 0).toFixed(2) }} €
                  </div>

                  <div v-if="familialeForm.mode === 'montant'">
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Nouveau tarif (€)
                    </label>
                    <input
                        type="number"
                        v-model="familialeForm.montant_cible"
                        @input="calculerPourcentageReduction"
                        step="0.01"
                        min="0"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                    <div v-if="familialeForm.pourcentage_reduction" class="mt-2 text-sm text-gray-600">
                      Réduction calculée : {{ familialeForm.pourcentage_reduction }}%
                    </div>
                  </div>

                  <div v-else>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Pourcentage de réduction (%)
                    </label>
                    <input
                        type="number"
                        v-model="familialeForm.pourcentage_reduction"
                        @input="calculerMontantCible"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    />
                    <div v-if="familialeForm.montant_cible && selectedCursus.tarif?.prix" class="mt-2 text-sm text-gray-600">
                      Nouveau tarif : {{ familialeForm.montant_cible }} €
                    </div>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button
                      type="submit"
                      :disabled="isSaving"
                      class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {{ editingFamiliale ? 'Modifier' : 'Ajouter' }}
                  </button>
                  <button
                      type="button"
                      @click="resetForms"
                      class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">Réductions multi-cursus</h3>
              <button
                  v-if="!showAddMultiCursus && availableCursusesForMultiCursus.length > 0"
                  @click="showAddMultiCursus = true"
                  class="inline-flex items-center gap-2 px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                <Plus class="size-4" />
                Ajouter
              </button>
            </div>

            <div v-if="selectedCursus.reductions_multi_cursus?.length > 0" class="space-y-3 mb-4">
              <div
                  v-for="reduction in selectedCursus.reductions_multi_cursus"
                  :key="reduction.id"
                  class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <span class="font-medium">Si inscrit à : {{ reduction.cursus_requis_name }}</span>
                  <span class="text-sm text-green-600 ml-2">-{{ reduction.pourcentage_reduction }}%</span>
                </div>
                <div class="flex gap-2">
                  <button
                      @click="editReductionMultiCursus(reduction)"
                      class="p-2 text-gray-600 hover:text-primary transition-colors"
                  >
                    <EditIcon class="size-5" />
                  </button>
                  <button
                      @click="deleteReductionMultiCursus(reduction.id)"
                      class="p-2 text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <Trash class="size-5" />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="showAddMultiCursus" class="mt-4 p-4 bg-gray-50 rounded-lg">
              <form @submit.prevent="submitReductionMultiCursus" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Cursus requis
                  </label>
                  <select
                      v-model="multiCursusForm.cursus_requis_id"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="">Sélectionner un cursus</option>
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
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Pourcentage de réduction (%)
                  </label>
                  <input
                      type="number"
                      v-model="multiCursusForm.pourcentage_reduction"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <div class="flex gap-2">
                  <button
                      type="submit"
                      :disabled="isSaving"
                      class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {{ editingMultiCursus ? 'Modifier' : 'Ajouter' }}
                  </button>
                  <button
                      type="button"
                      @click="resetForms"
                      class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div v-else class="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Sélectionnez un cursus pour gérer sa tarification
        </div>
      </div>
    </div>
  </div>
</template>