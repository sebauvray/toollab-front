<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from '#imports'
import { useSchoolYear } from '~/composables/useSchoolYear'
import { usePageTitle } from '~/composables/usePageTitle.js'
import InputText from '~/components/form/InputText.vue'
import PlusLight from '~/components/Icons/PlusLight.vue'
import schoolYearService from '~/services/schoolYear'
import tarificationService from '~/services/tarification'

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
const { years, currentYear, load, switchTo } = useSchoolYear()

const showCreateModal = ref(false)
const isSubmitting = ref(false)
const wizardStep = ref(1)
const wiz = ref({ label: '' })
const wizSelected = ref(new Set())
const wizClassrooms = ref([])
const wizLoadingClasses = ref(false)
const wizClassesLoaded = ref(false)
const wizTarifs = ref([])
const wizTarifSelected = ref(new Set())
const wizLoadingTarifs = ref(false)
const wizTarifsLoaded = ref(false)
const genderColors = { Hommes: '#93C5FD', Femmes: '#FDA4AF', Enfants: '#FCD34D' }

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

const wizardSteps = computed(() => activeYear.value ? ['Libellé', 'Tarifs', 'Classes', 'Confirmation'] : ['Libellé'])
const isLastStep = computed(() => wizardStep.value >= wizardSteps.value.length)
const wizAllSelected = computed(() => wizClassrooms.value.length > 0 && wizClassrooms.value.every(c => wizSelected.value.has(c.id)))
const wizTarifAllSelected = computed(() => wizTarifs.value.length > 0 && wizTarifs.value.every(c => wizTarifSelected.value.has(c.id)))
const wizGrouped = computed(() => {
  const groups = {}
  for (const c of wizClassrooms.value) {
    const ck = c.cursus?.id ?? 'none'
    if (!groups[ck]) groups[ck] = { cursus_id: ck, cursus_name: c.cursus?.name ?? 'Sans cursus', items: [] }
    groups[ck].items.push(c)
  }
  return Object.values(groups)
})

const openCreate = () => {
  wizardStep.value = 1
  wiz.value = { label: '' }
  wizSelected.value = new Set()
  wizClassrooms.value = []
  wizClassesLoaded.value = false
  wizTarifs.value = []
  wizTarifSelected.value = new Set()
  wizTarifsLoaded.value = false
  showCreateModal.value = true
}

const loadWizTarifs = async () => {
  if (!activeYear.value || wizTarifsLoaded.value) return
  wizLoadingTarifs.value = true
  try {
    const res = await tarificationService.getCursusTarifs()
    wizTarifs.value = (res?.data?.cursuses || []).filter(c => c.tarif)
    wizTarifSelected.value = new Set(wizTarifs.value.map(c => c.id))
    wizTarifsLoaded.value = true
  } catch (e) {
    setFlashMessage({ type: 'error', message: 'Erreur de chargement des tarifs' })
  } finally {
    wizLoadingTarifs.value = false
  }
}

const loadWizClasses = async () => {
  if (!activeYear.value || wizClassesLoaded.value) return
  wizLoadingClasses.value = true
  try {
    const data = await schoolYearService.classroomsForReconduction(activeYear.value.id)
    wizClassrooms.value = data.classrooms || []
    wizSelected.value = new Set(wizClassrooms.value.map(c => c.id))
    wizClassesLoaded.value = true
  } catch (e) {
    setFlashMessage({ type: 'error', message: e?.response?.data?.message || 'Erreur de chargement des classes' })
  } finally {
    wizLoadingClasses.value = false
  }
}

const wizNext = () => {
  if (wizardStep.value === 1 && !wiz.value.label.trim()) return
  if (isLastStep.value) return
  wizardStep.value++
  const step = wizardSteps.value[wizardStep.value - 1]
  if (step === 'Tarifs') loadWizTarifs()
  if (step === 'Classes') loadWizClasses()
}
const wizPrev = () => { if (wizardStep.value > 1) wizardStep.value-- }
const wizToggle = (id) => {
  if (wizSelected.value.has(id)) wizSelected.value.delete(id); else wizSelected.value.add(id)
  wizSelected.value = new Set(wizSelected.value)
}
const wizToggleAll = () => {
  wizSelected.value = wizAllSelected.value ? new Set() : new Set(wizClassrooms.value.map(c => c.id))
}
const wizTarifToggle = (id) => {
  if (wizTarifSelected.value.has(id)) wizTarifSelected.value.delete(id); else wizTarifSelected.value.add(id)
  wizTarifSelected.value = new Set(wizTarifSelected.value)
}
const wizTarifToggleAll = () => {
  wizTarifSelected.value = wizTarifAllSelected.value ? new Set() : new Set(wizTarifs.value.map(c => c.id))
}

const finalizeCreate = async () => {
  if (!wiz.value.label.trim()) return
  isSubmitting.value = true
  const sourceYearId = activeYear.value?.id || null
  const cursusIds = Array.from(wizTarifSelected.value)
  const classIds = Array.from(wizSelected.value)
  try {
    const created = await schoolYearService.create({
      label: wiz.value.label.trim(),
      clone_from_year_id: (cursusIds.length && sourceYearId) ? sourceYearId : null,
      clone_cursus_ids: cursusIds.length ? cursusIds : undefined,
    })
    for (const id of classIds) {
      try { await schoolYearService.reconductClassroom(id, {}) } catch { /* échec ponctuel (doublon) ignoré pour ne pas bloquer le reste */ }
    }
    if (created?.id) {
      switchTo(created.id)
    } else {
      await load()
      showCreateModal.value = false
    }
  } catch (e) {
    setFlashMessage({ type: 'error', message: e?.response?.data?.message || 'Erreur lors de la création' })
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
  <div class="p-6">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-lg font-bold text-default">Années scolaires</h1>
      <div class="flex items-center gap-x-1.5">
        <button
            v-if="hasArchivedYears"
            @click="router.push('/annees-scolaires/reconduire')"
            class="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Reconduire des classes
        </button>
        <button
            @click="openCreate"
            class="bg-default text-white px-3 py-1.5 text-sm rounded-lg hover:opacity-90 inline-flex items-center gap-x-1.5 transition-opacity"
        >
          <PlusLight class="size-3.5"/>
          <span>Ouvrir une nouvelle année</span>
        </button>
      </div>
    </div>

    <p class="text-xs text-gray-600 mb-5">
      Ouvrir une nouvelle année clôture l'année active. Les cursus et niveaux restent permanents,
      les classes ne sont pas reconduites automatiquement, et les tarifs peuvent être recopiés
      depuis une année précédente. La colonne « Décisions » ouvre ou ferme la saisie des résultats
      de fin d'année (passage, redoublement…) par les professeurs.
    </p>

    <div class="bg-white rounded-2xl border overflow-hidden font-nunito">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[#E6EFF5]">
            <th class="px-4 py-2.5 text-left text-xs font-montserrat font-semibold text-gray-500">Année</th>
            <th class="px-4 py-2.5 text-left text-xs font-montserrat font-semibold text-gray-500">Ouverte le</th>
            <th class="px-4 py-2.5 text-left text-xs font-montserrat font-semibold text-gray-500">Clôturée le</th>
            <th class="px-4 py-2.5 text-left text-xs font-montserrat font-semibold text-gray-500">Décisions</th>
            <th class="px-4 py-2.5 text-left text-xs font-montserrat font-semibold text-gray-500">État</th>
            <th class="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          <tr
              v-for="year in sortedYears"
              :key="year.id"
              class="border-b border-[#E6EFF5] last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <td class="px-4 py-2.5">
              <button @click="switchTo(year.id)" class="inline-flex items-center gap-x-2 text-left">
                <span class="font-medium font-montserrat text-default">{{ year.label }}</span>
                <span
                    v-if="currentYear?.id === year.id"
                    class="px-1.5 py-0.5 text-[11px] rounded bg-gray-100 text-gray-500"
                >Vue actuelle</span>
              </button>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-600">{{ formatDate(year.opened_at) }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-600">{{ formatDate(year.closed_at) }}</td>
            <td class="px-4 py-2.5">
              <button
                  v-if="year.is_active"
                  type="button"
                  @click.stop="toggleOutcomes(year)"
                  :disabled="togglingOutcomesId === year.id"
                  :class="[
                    'inline-flex items-center gap-1.5',
                    togglingOutcomesId === year.id ? 'opacity-60 cursor-wait' : ''
                  ]"
              >
                <span
                    :class="[
                      'relative inline-block w-8 h-4 rounded-full transition-colors',
                      year.outcomes_open ? 'bg-green-500' : 'bg-gray-300'
                    ]"
                >
                  <span
                      :class="[
                        'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all',
                        year.outcomes_open ? 'left-[1.125rem]' : 'left-0.5'
                      ]"
                  ></span>
                </span>
                <span :class="['text-xs', year.outcomes_open ? 'text-green-700' : 'text-gray-500']">
                  {{ year.outcomes_open ? 'Saisie ouverte' : 'Saisie fermée' }}
                </span>
              </button>
              <span v-else class="text-xs text-gray-400">–</span>
            </td>
            <td class="px-4 py-2.5">
              <span
                  v-if="year.is_active"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 ring-1 ring-green-300"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Active
              </span>
              <span
                  v-else
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 ring-1 ring-gray-300"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                Archivée
              </span>
            </td>
            <td class="px-4 py-2.5 text-right">
              <button
                  v-if="year.is_active"
                  @click.stop="openClose(year)"
                  class="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
              >Clôturer</button>
            </td>
          </tr>
          <tr v-if="sortedYears.length === 0">
            <td colspan="6" class="px-4 py-6 text-center text-gray-500 text-xs">
              Aucune année scolaire — créez la première.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-3">
        <div class="bg-white rounded-2xl shadow-xl max-w-xl w-full flex flex-col max-h-[90vh]">
          <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5]">
            <h2 class="text-base font-bold text-default mb-3">Ouvrir une nouvelle année</h2>
            <div class="flex items-center gap-2">
              <template v-for="(label, i) in wizardSteps" :key="label">
                <div class="flex items-center gap-1.5 shrink-0">
                  <span
                      :class="[
                        'w-5 h-5 rounded-full text-[11px] font-semibold inline-flex items-center justify-center',
                        wizardStep >= i + 1 ? 'bg-default text-white' : 'bg-gray-200 text-gray-500'
                      ]"
                  >
                    <svg v-if="wizardStep > i + 1" class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                    <span v-else>{{ i + 1 }}</span>
                  </span>
                  <span :class="['text-xs whitespace-nowrap', wizardStep >= i + 1 ? 'text-default font-medium' : 'text-gray-400']">{{ label }}</span>
                </div>
                <div v-if="i < wizardSteps.length - 1" class="flex-1 h-px" :class="wizardStep > i + 1 ? 'bg-default' : 'bg-gray-200'"></div>
              </template>
            </div>
          </div>

          <div class="px-5 py-4 overflow-y-auto">
            <div v-if="wizardStep === 1" class="space-y-2">
              <p class="text-xs text-gray-600">L'année active sera clôturée et passera en lecture seule.</p>
              <InputText v-model="wiz.label" placeholder="Libellé (ex : 2026-2027)" required />
            </div>

            <div v-else-if="wizardSteps[wizardStep - 1] === 'Tarifs'" class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-medium text-default">Reconduire les tarifs ?</p>
                  <p class="text-xs text-gray-600 mt-0.5">Sélectionne les cursus dont les tarifs et réductions de <span class="font-medium">{{ activeYear?.label }}</span> seront repris. Décoche ceux à repartir de zéro.</p>
                </div>
                <button v-if="wizTarifs.length" type="button" @click="wizTarifToggleAll" class="text-xs px-2 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 shrink-0">
                  {{ wizTarifAllSelected ? 'Tout décocher' : 'Tout cocher' }}
                </button>
              </div>

              <div v-if="wizLoadingTarifs" class="py-6 text-center text-xs text-gray-500">Chargement…</div>
              <div v-else-if="wizTarifs.length === 0" class="py-6 text-center text-xs text-gray-500">Aucun tarif configuré sur l'année active.</div>
              <div v-else class="border border-[#E6EFF5] rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                <label
                    v-for="c in wizTarifs"
                    :key="c.id"
                    class="flex items-center gap-2 px-3 py-2 text-xs border-b border-[#E6EFF5] last:border-b-0 cursor-pointer hover:bg-gray-50"
                >
                  <input type="checkbox" :checked="wizTarifSelected.has(c.id)" @change="wizTarifToggle(c.id)" class="accent-default cursor-pointer" />
                  <span class="font-medium text-gray-800 flex-1 min-w-0 truncate">{{ c.name }}</span>
                  <span v-if="(c.reductions_familiales?.length || 0) + (c.reductions_multi_cursus?.length || 0) > 0" class="text-[11px] text-gray-400">
                    {{ (c.reductions_familiales?.length || 0) + (c.reductions_multi_cursus?.length || 0) }} réduc.
                  </span>
                  <span class="font-semibold text-default shrink-0">{{ c.tarif.prix }} €</span>
                </label>
              </div>
            </div>

            <div v-else-if="wizardSteps[wizardStep - 1] === 'Classes'" class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-medium text-default">Reconduire les classes ?</p>
                  <p class="text-xs text-gray-600 mt-0.5">Copies vides (sans élèves) des classes de <span class="font-medium">{{ activeYear?.label }}</span>. Décoche celles à ne pas reporter.</p>
                </div>
                <button v-if="wizClassrooms.length" type="button" @click="wizToggleAll" class="text-xs px-2 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 shrink-0">
                  {{ wizAllSelected ? 'Tout décocher' : 'Tout cocher' }}
                </button>
              </div>

              <div v-if="wizLoadingClasses" class="py-6 text-center text-xs text-gray-500">Chargement…</div>
              <div v-else-if="wizClassrooms.length === 0" class="py-6 text-center text-xs text-gray-500">Aucune classe sur l'année active.</div>
              <div v-else class="space-y-2.5 max-h-[40vh] overflow-y-auto">
                <div v-for="group in wizGrouped" :key="group.cursus_id" class="border border-[#E6EFF5] rounded-lg overflow-hidden">
                  <div class="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-700">{{ group.cursus_name }}</div>
                  <label
                      v-for="c in group.items"
                      :key="c.id"
                      class="flex items-center gap-2 px-3 py-1.5 text-xs border-t border-[#E6EFF5] cursor-pointer hover:bg-gray-50"
                  >
                    <input type="checkbox" :checked="wizSelected.has(c.id)" @change="wizToggle(c.id)" class="accent-default cursor-pointer" />
                    <span class="inline-block w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: genderColors[c.gender] || '#9CA3AF' }"></span>
                    <span class="font-medium text-gray-800">{{ c.name }}</span>
                    <span v-if="c.level?.name" class="text-gray-400">· {{ c.level.name }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div v-else-if="wizardSteps[wizardStep - 1] === 'Confirmation'" class="space-y-3">
              <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <p class="font-semibold mb-1 inline-flex items-center gap-1.5">
                  <svg class="size-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                  Action irréversible
                </p>
                <p>Créer cette année va <strong>clôturer définitivement {{ activeYear?.label }}</strong>. Impossible de revenir en arrière : toutes ses données (inscriptions, paiements, classes…) resteront <strong>accessibles en lecture seule</strong>.</p>
              </div>
              <div class="rounded-lg border border-[#E6EFF5] divide-y divide-[#E6EFF5] text-xs">
                <div class="flex items-center justify-between px-3 py-2"><span class="text-gray-500">Nouvelle année</span><span class="font-semibold text-default">{{ wiz.label || '—' }}</span></div>
                <div class="flex items-center justify-between px-3 py-2"><span class="text-gray-500">Tarifs reconduits</span><span class="font-medium text-gray-800">{{ wizTarifSelected.size }} / {{ wizTarifs.length }} cursus</span></div>
                <div class="flex items-center justify-between px-3 py-2"><span class="text-gray-500">Classes reconduites</span><span class="font-medium text-gray-800">{{ wizSelected.size }} / {{ wizClassrooms.length }}</span></div>
              </div>
            </div>
          </div>

          <div class="px-5 py-3 border-t border-[#E6EFF5] flex items-center justify-between gap-2">
            <button
                v-if="wizardStep > 1"
                type="button"
                @click="wizPrev"
                :disabled="isSubmitting"
                class="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >← Précédent</button>
            <span v-else></span>
            <div class="flex items-center gap-2">
              <button type="button" @click="showCreateModal = false" :disabled="isSubmitting" class="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 hover:bg-gray-100 rounded-lg disabled:opacity-50">Annuler</button>
              <button
                  v-if="!isLastStep"
                  type="button"
                  @click="wizNext"
                  :disabled="wizardStep === 1 && !wiz.label.trim()"
                  class="px-4 py-1.5 text-xs bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >Suivant →</button>
              <button
                  v-else
                  type="button"
                  @click="finalizeCreate"
                  :disabled="isSubmitting || !wiz.label.trim()"
                  class="px-4 py-1.5 text-xs bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >{{ isSubmitting ? 'Création…' : 'Créer l\'année' }}</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showCloseModal" class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-3">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-5">
          <h2 class="text-base font-bold text-default mb-2">Clôturer {{ yearToClose?.label }} ?</h2>
          <p class="text-xs text-gray-600 mb-3">
            L'année passera en lecture seule. L'historique (inscriptions, paiements, classes)
            restera consultable. Aucune modification ne sera plus possible sur cette année.
          </p>
          <p class="text-xs text-gray-600 mb-5">
            Pour réinscrire les élèves, ouvrez une nouvelle année après la clôture.
          </p>
          <div class="flex justify-end gap-x-1.5">
            <button @click="showCloseModal = false; yearToClose = null" :disabled="isClosing" class="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 hover:bg-gray-100 rounded-lg">
              Annuler
            </button>
            <button @click="confirmClose" :disabled="isClosing" class="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:opacity-90 text-xs disabled:opacity-50">
              {{ isClosing ? 'Clôture...' : 'Confirmer la clôture' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
