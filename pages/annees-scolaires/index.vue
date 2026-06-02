<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from '#imports'
import { useSchoolYear } from '~/composables/useSchoolYear'
import { usePageTitle } from '~/composables/usePageTitle.js'
import InputText from '~/components/form/InputText.vue'
import schoolYearService from '~/services/schoolYear'

const router = useRouter()

definePageMeta({
  layout: 'auth',
  middleware: 'admin-director',
  layoutData: {
    title: 'Années scolaires'
  }
})

usePageTitle('Années scolaires')

const { setFlashMessage } = useFlashMessage()
const { years, currentYear, load, create, switchTo } = useSchoolYear()

const showCreateModal = ref(false)
const isSubmitting = ref(false)
const newYear = ref({ label: '', clone_from_year_id: null })

const showCloseModal = ref(false)
const yearToClose = ref(null)
const isClosing = ref(false)

const sortedYears = computed(() => {
  return [...years.value].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1
    if (!a.is_active && b.is_active) return 1
    return (b.opened_at || '').localeCompare(a.opened_at || '')
  })
})

const activeYear = computed(() => years.value.find(y => y.is_active))
const hasArchivedYears = computed(() => years.value.some(y => !y.is_active))

const openCreate = () => {
  newYear.value = {
    label: '',
    clone_from_year_id: activeYear.value?.id || null,
  }
  showCreateModal.value = true
}

const submitCreate = async () => {
  if (!newYear.value.label.trim()) return
  isSubmitting.value = true
  try {
    await create({
      label: newYear.value.label.trim(),
      clone_from_year_id: newYear.value.clone_from_year_id,
    })
    showCreateModal.value = false
    setFlashMessage({ type: 'success', message: 'Année scolaire créée avec succès' })
  } catch (e) {
    const msg = e?.response?.data?.message || 'Erreur lors de la création'
    setFlashMessage({ type: 'error', message: msg })
  } finally {
    isSubmitting.value = false
  }
}

const openClose = (year) => {
  yearToClose.value = year
  showCloseModal.value = true
}

const togglingOutcomesId = ref(null)
const toggleOutcomes = async (year) => {
  if (togglingOutcomesId.value) return
  togglingOutcomesId.value = year.id
  try {
    await schoolYearService.toggleOutcomes(year.id, !year.outcomes_open)
    setFlashMessage({
      type: 'success',
      message: year.outcomes_open
          ? 'Saisie des décisions désactivée'
          : 'Saisie des décisions activée'
    })
    await load()
  } catch (e) {
    setFlashMessage({
      type: 'error',
      message: e?.response?.data?.message || 'Erreur lors de la bascule'
    })
  } finally {
    togglingOutcomesId.value = null
  }
}

const confirmClose = async () => {
  if (!yearToClose.value) return
  isClosing.value = true
  try {
    await schoolYearService.close(yearToClose.value.id)
    setFlashMessage({ type: 'success', message: 'Année clôturée' })
    showCloseModal.value = false
    yearToClose.value = null
    await load()
  } catch (e) {
    setFlashMessage({ type: 'error', message: e?.response?.data?.message || 'Erreur lors de la clôture' })
  } finally {
    isClosing.value = false
  }
}

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

onMounted(async () => {
  await load()
})
</script>

<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-default">Années scolaires</h1>
      <div class="flex items-center gap-x-2">
        <button
            v-if="hasArchivedYears"
            @click="router.push('/annees-scolaires/reconduire')"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Reconduire des classes
        </button>
        <button
            @click="openCreate"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          Ouvrir une nouvelle année
        </button>
      </div>
    </div>

    <p class="text-sm text-gray-600 mb-6">
      Ouvrir une nouvelle année clôture l'année active. Les cursus et niveaux restent permanents.
      Les classes ne sont pas reconduites automatiquement. Vous pouvez recopier les tarifs et réductions
      depuis une année précédente.
    </p>

    <div
        v-if="activeYear"
        class="bg-white rounded-lg border p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div class="flex-1">
        <h3 class="font-semibold text-default mb-1">Décisions de fin d'année · {{ activeYear.label }}</h3>
        <p class="text-sm text-gray-600">
          Quand cette option est activée, chaque professeur peut saisir, pour ses élèves,
          le résultat de fin d'année (passage, redoublement, exclusion, fin de cursus).
          Désactivez-la une fois les décisions rendues.
        </p>
      </div>
      <button
          type="button"
          @click="toggleOutcomes(activeYear)"
          :disabled="togglingOutcomesId === activeYear.id"
          :class="[
            'flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors shrink-0',
            activeYear.outcomes_open
              ? 'bg-green-50 border-green-300 hover:bg-green-100'
              : 'bg-gray-50 border-gray-300 hover:bg-gray-100',
            togglingOutcomesId === activeYear.id ? 'opacity-60 cursor-wait' : ''
          ]"
      >
        <span
            :class="[
              'relative inline-block w-10 h-5 rounded-full transition-colors',
              activeYear.outcomes_open ? 'bg-green-500' : 'bg-gray-300'
            ]"
        >
          <span
              :class="[
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                activeYear.outcomes_open ? 'left-[1.375rem]' : 'left-0.5'
              ]"
          ></span>
        </span>
        <span
            :class="[
              'text-sm font-medium',
              activeYear.outcomes_open ? 'text-green-800' : 'text-gray-700'
            ]"
        >
          Saisie {{ activeYear.outcomes_open ? 'activée' : 'désactivée' }}
        </span>
      </button>
    </div>

    <div class="bg-white rounded-lg border overflow-hidden">
      <div class="grid grid-cols-12 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
        <div class="col-span-4">Libellé</div>
        <div class="col-span-3">Ouverte le</div>
        <div class="col-span-3">Clôturée le</div>
        <div class="col-span-2 text-right">État</div>
      </div>
      <div v-for="year in sortedYears" :key="year.id"
           class="grid grid-cols-12 px-4 py-3 border-t items-center hover:bg-gray-50">
        <div class="col-span-4">
          <button @click="switchTo(year.id)" class="text-left">
            <span class="font-medium" :class="currentYear?.id === year.id ? 'text-primary' : 'text-default'">{{ year.label }}</span>
            <span v-if="currentYear?.id === year.id" class="ml-2 text-xs text-primary">(vue actuelle)</span>
          </button>
        </div>
        <div class="col-span-3 text-sm text-gray-600">{{ formatDate(year.opened_at) }}</div>
        <div class="col-span-3 text-sm text-gray-600">{{ formatDate(year.closed_at) }}</div>
        <div class="col-span-2 flex items-center justify-end gap-x-2">
          <button
              v-if="year.is_active"
              @click.stop="openClose(year)"
              class="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
          >Clôturer</button>
          <span v-if="year.is_active" class="inline-block px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">Active</span>
          <span v-else class="inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">Archivée</span>
        </div>
      </div>
      <div v-if="sortedYears.length === 0" class="px-4 py-8 text-center text-gray-500 text-sm">
        Aucune année scolaire — créez la première.
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 class="text-xl font-bold text-default mb-4">Ouvrir une nouvelle année</h2>
          <p class="text-sm text-gray-600 mb-4">
            L'année actuellement active sera clôturée et passera en lecture seule.
          </p>
          <div class="space-y-4">
            <InputText
                v-model="newYear.label"
                placeholder="Libellé (ex : 2025-2026)"
                required
            />
            <div class="flex items-center gap-x-2">
              <input
                  id="clone_tarifs"
                  type="checkbox"
                  :checked="!!newYear.clone_from_year_id"
                  @change="newYear.clone_from_year_id = $event.target.checked ? (activeYear?.id || null) : null"
              />
              <label for="clone_tarifs" class="text-sm text-gray-700">
                Recopier les tarifs et réductions depuis l'année active
              </label>
            </div>
          </div>
          <div class="flex justify-end gap-x-2 mt-6">
            <button
                @click="showCreateModal = false"
                class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                :disabled="isSubmitting"
            >
              Annuler
            </button>
            <button
                @click="submitCreate"
                :disabled="isSubmitting || !newYear.label.trim()"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 text-sm disabled:opacity-50"
            >
              {{ isSubmitting ? 'Création...' : 'Créer l\'année' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showCloseModal" class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 class="text-xl font-bold text-default mb-3">Clôturer {{ yearToClose?.label }} ?</h2>
          <p class="text-sm text-gray-600 mb-4">
            L'année passera en lecture seule. L'historique (inscriptions, paiements, classes)
            restera consultable. Aucune modification ne sera plus possible sur cette année.
          </p>
          <p class="text-sm text-gray-600 mb-6">
            Pour réinscrire les élèves, ouvrez une nouvelle année après la clôture.
          </p>
          <div class="flex justify-end gap-x-2">
            <button @click="showCloseModal = false; yearToClose = null" :disabled="isClosing" class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
              Annuler
            </button>
            <button @click="confirmClose" :disabled="isClosing" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 text-sm disabled:opacity-50">
              {{ isClosing ? 'Clôture...' : 'Confirmer la clôture' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
