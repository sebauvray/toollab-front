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

    if (editingFamiliale.value) {
      await tarificationService.updateReductionFamiliale(
          editingFamiliale.value.id,
          familialeForm.value
      )
      setFlashMessage({
        type: 'success',
        message: 'Réduction familiale mise à jour avec succès'
      })
    } else {
      await tarificationService.addReductionFamiliale(
          selectedCursus.value.id,
          familialeForm.value
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
  familialeForm.value = {
    nombre_eleves_min: reduction.nombre_eleves_min,
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
  <div class="p-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Liste des cursus -->
      <div class="lg:col-span-1 bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold mb-4">Cursus disponibles</h3>
        <div class="space-y-2">
          <button
              v-for="cursus in cursuses"
              :key="cursus.id"
              @click="selectCursus(cursus)"
              :class="[
              'w-full text-left px-4 py-3 rounded-lg border transition-all',
              selectedCursus?.id === cursus.id
                ? 'border-primary bg-primary bg-opacity-10'
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <div class="font-medium">{{ cursus.name }}</div>
            <div v-if="cursus.tarif" class="text-sm text-gray-600 mt-1">
              Tarif: {{ cursus.tarif.prix }}€
            </div>
          </button>
        </div>
      </div>

      <!-- Détails du cursus sélectionné -->
      <div class="lg:col-span-3">
        <div v-if="selectedCursus" class="space-y-6">
          <!-- Tarif de base -->
          <div class="bg-white rounded-lg shadow p-6">
            <h4 class="font-semibold text-lg mb-4">Tarif de base</h4>
            <form @submit.prevent="submitTarif" class="flex gap-3">
              <input
                  type="number"
                  step="0.01"
                  v-model="tarifForm.prix"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Prix en euros"
                  required
              />
              <button
                  type="submit"
                  :disabled="isSaving"
                  class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                Enregistrer
              </button>
            </form>
          </div>

          <!-- Réductions familiales -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-semibold text-lg">Réductions familiales</h4>
              <button
                  v-if="!showAddFamiliale"
                  @click="showAddFamiliale = true"
                  class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
              >
                <Plus class="w-4 h-4" />
                Ajouter
              </button>
            </div>

            <div v-if="selectedCursus.reductions_familiales?.length > 0" class="space-y-2 mb-4">
              <div
                  v-for="reduction in selectedCursus.reductions_familiales"
                  :key="reduction.id"
                  class="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
              >
                <span>
                  À partir de {{ reduction.nombre_eleves_min }} élèves:
                  <span class="font-semibold">-{{ reduction.pourcentage_reduction }}%</span>
                </span>
                <div class="flex gap-2">
                  <button
                      @click="editReductionFamiliale(reduction)"
                      class="p-1 text-primary hover:text-primary-dark"
                  >
                    <EditIcon class="w-4 h-4" />
                  </button>
                  <button
                      @click="deleteReductionFamiliale(reduction.id)"
                      class="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <form v-if="showAddFamiliale" @submit.prevent="submitReductionFamiliale" class="space-y-3">
              <input
                  type="number"
                  min="2"
                  v-model="familialeForm.nombre_eleves_min"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nombre d'élèves minimum"
                  required
              />
              <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  v-model="familialeForm.pourcentage_reduction"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Pourcentage de réduction"
                  required
              />
              <div class="flex gap-3">
                <button
                    type="submit"
                    :disabled="isSaving"
                    class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
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

          <!-- Réductions multi-cursus -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-semibold text-lg">Réductions multi-cursus</h4>
              <button
                  v-if="!showAddMultiCursus && availableCursusesForMultiCursus.length > 0"
                  @click="showAddMultiCursus = true"
                  class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
              >
                <Plus class="w-4 h-4" />
                Ajouter
              </button>
            </div>

            <div v-if="selectedCursus.reductions_multi_cursus?.length > 0" class="space-y-2 mb-4">
              <div
                  v-for="reduction in selectedCursus.reductions_multi_cursus"
                  :key="reduction.id"
                  class="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
              >
                <span>
                  Si inscrit aussi en {{ reduction.cursus_requis_nom }}:
                  <span class="font-semibold">-{{ reduction.pourcentage_reduction }}%</span>
                </span>
                <div class="flex gap-2">
                  <button
                      @click="editReductionMultiCursus(reduction)"
                      class="p-1 text-primary hover:text-primary-dark"
                  >
                    <EditIcon class="w-4 h-4" />
                  </button>
                  <button
                      @click="deleteReductionMultiCursus(reduction.id)"
                      class="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <form v-if="showAddMultiCursus" @submit.prevent="submitReductionMultiCursus" class="space-y-3">
              <select
                  v-if="!editingMultiCursus"
                  v-model="multiCursusForm.cursus_requis_id"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
              >
                <option value="">Sélectionner un cursus requis</option>
                <option
                    v-for="cursus in availableCursusesForMultiCursus"
                    :key="cursus.id"
                    :value="cursus.id"
                >
                  {{ cursus.name }}
                </option>
              </select>
              <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  v-model="multiCursusForm.pourcentage_reduction"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Pourcentage de réduction"
                  required
              />
              <div class="flex gap-3">
                <button
                    type="submit"
                    :disabled="isSaving"
                    class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
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

        <div v-else class="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Sélectionnez un cursus pour gérer sa tarification
        </div>
      </div>
    </div>
  </div>
</template>