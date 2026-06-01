<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from '#imports'
import { usePageTitle } from '~/composables/usePageTitle.js'
import { useSchoolYear } from '~/composables/useSchoolYear'
import schoolYearService from '~/services/schoolYear'

definePageMeta({
  layout: 'auth',
  middleware: 'admin-director',
  layoutData: { title: 'Reconduire des classes' }
})

usePageTitle('Reconduire des classes')

const router = useRouter()
const { setFlashMessage } = useFlashMessage()
const { years, load: loadYears } = useSchoolYear()

const sourceYearId = ref(null)
const activeYear = ref(null)
const classrooms = ref([])
const sizes = ref({})
const names = ref({})
const selected = ref(new Set())
const loading = ref(false)
const reconducting = ref(false)

const archivedYears = computed(() => years.value.filter(y => !y.is_active))

const groupedClassrooms = computed(() => {
  const groups = {}
  for (const c of classrooms.value) {
    const cKey = c.cursus?.id ?? 'none'
    const cName = c.cursus?.name ?? 'Sans cursus'
    if (!groups[cKey]) groups[cKey] = { cursus_id: cKey, cursus_name: cName, levels: {} }

    const lKey = c.level?.id ?? 'none'
    const lName = c.level?.name ?? 'Sans niveau'
    const lOrder = c.level?.order ?? 999
    if (!groups[cKey].levels[lKey]) groups[cKey].levels[lKey] = { level_id: lKey, level_name: lName, order: lOrder, classrooms: [] }

    groups[cKey].levels[lKey].classrooms.push(c)
  }
  return Object.values(groups).map(g => ({
    ...g,
    levels: Object.values(g.levels).sort((a, b) => a.order - b.order),
  }))
})

const selectableClassrooms = computed(() => classrooms.value.filter(c => !c.already_in_active_year))
const allSelectableSelected = computed(() => selectableClassrooms.value.length > 0 && selectableClassrooms.value.every(c => selected.value.has(c.id)))
const someSelected = computed(() => selected.value.size > 0)

const genderColors = { Hommes: '#93C5FD', Femmes: '#FDA4AF', Enfants: '#FCD34D' }
const genderLabels = ['Hommes', 'Femmes', 'Enfants']

const loadClassrooms = async () => {
  if (!sourceYearId.value) { classrooms.value = []; return }
  loading.value = true
  try {
    const data = await schoolYearService.classroomsForReconduction(sourceYearId.value)
    classrooms.value = data.classrooms
    activeYear.value = data.active_year
    sizes.value = Object.fromEntries(classrooms.value.map(c => [c.id, c.size]))
    names.value = Object.fromEntries(classrooms.value.map(c => [c.id, c.name]))
    selected.value = new Set()
  } catch (e) {
    setFlashMessage({ type: 'error', message: e?.response?.data?.message || 'Erreur de chargement' })
  } finally {
    loading.value = false
  }
}

const toggle = (id) => {
  if (selected.value.has(id)) selected.value.delete(id); else selected.value.add(id)
  selected.value = new Set(selected.value)
}

const toggleAll = () => {
  if (allSelectableSelected.value) {
    selected.value = new Set()
  } else {
    selected.value = new Set(selectableClassrooms.value.map(c => c.id))
  }
}

const submitReconduction = async () => {
  if (!someSelected.value || !activeYear.value) return
  reconducting.value = true
  const ids = Array.from(selected.value)
  let ok = 0, ko = 0
  for (const id of ids) {
    try {
      const size = parseInt(sizes.value[id], 10)
      const name = (names.value[id] || '').trim()
      const payload = {}
      if (size > 0) payload.size = size
      if (name) payload.name = name
      await schoolYearService.reconductClassroom(id, payload)
      ok++
    } catch {
      ko++
    }
  }
  reconducting.value = false
  setFlashMessage({
    type: ko === 0 ? 'success' : 'error',
    message: ko === 0
      ? `${ok} classe(s) reconduite(s) vers ${activeYear.value.label}`
      : `${ok} OK, ${ko} échec(s) — vérifie les doublons`
  })
  await loadClassrooms()
}

watch(sourceYearId, loadClassrooms)

onMounted(async () => {
  await loadYears()
  activeYear.value = years.value.find(y => y.is_active) || null
  // Préselect : la dernière archivée
  const last = archivedYears.value[0]
  if (last) sourceYearId.value = last.id
})
</script>

<template>
  <div class="p-8">
    <div class="mb-6">
      <button @click="router.push('/annees-scolaires')" class="text-sm text-gray-500 hover:text-gray-700 mb-2">← Retour</button>
      <h1 class="text-2xl font-bold text-default">Reconduire des classes</h1>
      <p class="text-sm text-gray-600 mt-1">
        Crée des copies vides (sans élèves) des classes sélectionnées dans l'année active.
        Les classes déjà reconduites sont marquées et ne peuvent pas être sélectionnées.
      </p>
    </div>

    <div class="bg-white border rounded-lg p-4 mb-6 flex flex-wrap items-end gap-x-6 gap-y-3">
      <div>
        <label class="block text-xs uppercase text-gray-500 mb-1">Année source</label>
        <select v-model="sourceYearId" class="px-3 py-2 border rounded-md min-w-[220px]">
          <option :value="null" disabled>— sélectionner —</option>
          <option v-for="y in archivedYears" :key="y.id" :value="y.id">{{ y.label }} (clôturée)</option>
          <option v-for="y in years.filter(y => y.is_active)" :key="y.id" :value="y.id">{{ y.label }} (active — pour copie interne)</option>
        </select>
      </div>
      <div class="text-gray-400 text-2xl pb-1">→</div>
      <div>
        <label class="block text-xs uppercase text-gray-500 mb-1">Année cible</label>
        <div class="px-3 py-2 border rounded-md bg-gray-50 min-w-[220px]">
          <span v-if="activeYear" class="text-default font-medium">{{ activeYear.label }}</span>
          <span v-else class="text-red-600 text-sm">Aucune année active</span>
        </div>
      </div>
      <div class="ml-auto">
        <button
            @click="submitReconduction"
            :disabled="!someSelected || !activeYear || reconducting"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          {{ reconducting ? 'Reconduction...' : `Reconduire ${selected.size} classe(s)` }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">Chargement...</div>

    <div v-else-if="!sourceYearId" class="text-center py-12 text-gray-500">
      Sélectionne une année source pour voir ses classes.
    </div>

    <div v-else-if="classrooms.length === 0" class="text-center py-12 text-gray-500">
      Aucune classe sur cette année.
    </div>

    <div v-else>
      <div class="flex items-center justify-between flex-wrap gap-3 mb-4 text-sm">
        <div class="flex items-center gap-x-3">
          <button
              @click="toggleAll"
              :disabled="selectableClassrooms.length === 0"
              class="px-3 py-1 rounded border text-xs hover:bg-gray-50 disabled:opacity-40"
          >
            {{ allSelectableSelected ? 'Tout désélectionner' : 'Tout sélectionner' }}
          </button>
          <span class="text-gray-500">
            {{ selectableClassrooms.length }} sélectionnable(s),
            {{ classrooms.length - selectableClassrooms.length }} déjà reconduite(s)
          </span>
        </div>
        <div class="flex items-center gap-x-3 text-xs text-gray-600">
          <span
              v-for="g in genderLabels"
              :key="g"
              class="inline-flex items-center gap-x-1.5"
          >
            <span class="inline-block w-3 h-3 rounded-full" :style="{ backgroundColor: genderColors[g] }"></span>
            {{ g }}
          </span>
        </div>
      </div>

      <div v-for="group in groupedClassrooms" :key="group.cursus_id" class="mb-6">
        <h2 class="text-lg font-semibold text-default mb-2 flex items-center gap-x-2">
          <span class="text-xs uppercase bg-gray-700 text-white px-2 py-1 rounded">Cursus</span>
          {{ group.cursus_name }}
        </h2>

        <div v-for="lvl in group.levels" :key="lvl.level_id" class="mb-4">
          <h3 class="text-sm font-medium text-gray-600 mb-2 pl-2 border-l-4 border-primary">{{ lvl.level_name }}</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pl-3">
            <div
                v-for="c in lvl.classrooms"
                :key="c.id"
                :class="[
                  'rounded-lg border overflow-hidden transition-all',
                  c.already_in_active_year
                    ? 'border-gray-200 bg-gray-50 opacity-60'
                    : selected.has(c.id)
                      ? 'border-primary shadow-sm ring-1 ring-primary/30 bg-white'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                ]"
            >
              <!-- header : checkbox + pastille + gender + badge déjà reconduite -->
              <div
                  class="px-3 py-2 flex items-center gap-x-2 text-xs uppercase tracking-wide font-semibold text-default"
                  :style="{ backgroundColor: (genderColors[c.gender] || '#E5E7EB') + '40' }"
              >
                <input
                    type="checkbox"
                    :checked="selected.has(c.id)"
                    :disabled="c.already_in_active_year"
                    @change="toggle(c.id)"
                    class="flex-shrink-0 w-4 h-4 cursor-pointer"
                />
                <span
                    class="inline-block w-3 h-3 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: genderColors[c.gender] || '#9CA3AF' }"
                ></span>
                <span class="flex-1">{{ c.gender }}</span>
                <span
                    v-if="c.already_in_active_year"
                    class="text-xs text-emerald-700 font-semibold flex items-center gap-x-1 flex-shrink-0 normal-case tracking-normal"
                >
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clip-rule="evenodd"/>
                  </svg>
                  Reconduite
                </span>
              </div>

              <!-- corps : nom éditable + taille éditable -->
              <div class="px-3 py-3 flex flex-col gap-y-3">
                <div class="flex flex-col gap-y-1">
                  <label class="text-xs text-gray-500 uppercase tracking-wide">Nom de la classe</label>
                  <input
                      type="text"
                      v-model="names[c.id]"
                      :disabled="c.already_in_active_year"
                      :placeholder="c.name"
                      class="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div class="flex items-end justify-between gap-x-3">
                  <div class="flex flex-col gap-y-1 flex-1">
                    <label class="text-xs text-gray-500 uppercase tracking-wide">Nombre max d'élèves</label>
                    <input
                        type="number"
                        min="1"
                        max="999"
                        v-model.number="sizes[c.id]"
                        :disabled="c.already_in_active_year"
                        class="w-20 px-2 py-1.5 text-sm text-center font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
