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
  <div class="p-4 xl:p-6">
    <div class="mb-4">
      <button
          @click="router.push('/annees-scolaires')"
          class="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1.5"
      >
        <span>←</span> Retour
      </button>
      <h1 class="text-lg font-bold text-default">Reconduire des classes</h1>
      <p class="text-xs text-gray-600 mt-0.5 max-w-3xl">
        Crée des copies vides (sans élèves) des classes sélectionnées dans l'année active.
        Les classes déjà reconduites sont grisées.
      </p>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-x-4 gap-y-2">
      <div>
        <label class="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Année source</label>
        <select v-model="sourceYearId" class="px-2 py-1.5 text-sm border border-gray-300 rounded-md min-w-[220px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
          <option :value="null" disabled>— sélectionner —</option>
          <option v-for="y in archivedYears" :key="y.id" :value="y.id">{{ y.label }} (clôturée)</option>
          <option v-for="y in years.filter(y => y.is_active)" :key="y.id" :value="y.id">{{ y.label }} (active — copie interne)</option>
        </select>
      </div>
      <div class="text-gray-400 text-base pb-1.5">→</div>
      <div>
        <label class="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Année cible</label>
        <div class="px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 min-w-[220px]">
          <span v-if="activeYear" class="text-default font-medium">{{ activeYear.label }}</span>
          <span v-else class="text-red-600 text-xs">Aucune année active</span>
        </div>
      </div>
      <div class="ml-auto">
        <button
            @click="submitReconduction"
            :disabled="!someSelected || !activeYear || reconducting"
            class="px-3 py-1.5 bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-opacity"
        >
          {{ reconducting ? 'Reconduction…' : `Reconduire ${selected.size} classe${selected.size > 1 ? 's' : ''}` }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-10 text-sm text-gray-500">Chargement…</div>

    <div v-else-if="!sourceYearId" class="text-center py-10 text-sm text-gray-500">
      Sélectionne une année source pour voir ses classes.
    </div>

    <div v-else-if="classrooms.length === 0" class="text-center py-10 text-sm text-gray-500">
      Aucune classe sur cette année.
    </div>

    <div v-else class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div class="flex items-center gap-x-2">
          <button
              @click="toggleAll"
              :disabled="selectableClassrooms.length === 0"
              class="px-2 py-1 rounded-md border border-gray-300 text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {{ allSelectableSelected ? 'Tout désélectionner' : 'Tout sélectionner' }}
          </button>
          <span class="text-gray-500">
            {{ selectableClassrooms.length }} sélectionnable{{ selectableClassrooms.length > 1 ? 's' : '' }} ·
            {{ classrooms.length - selectableClassrooms.length }} déjà reconduite{{ (classrooms.length - selectableClassrooms.length) > 1 ? 's' : '' }}
          </span>
        </div>
        <div class="flex items-center gap-x-3 text-xs text-gray-600">
          <span
              v-for="g in genderLabels"
              :key="g"
              class="inline-flex items-center gap-x-1"
          >
            <span class="inline-block w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: genderColors[g] }"></span>
            {{ g }}
          </span>
        </div>
      </div>

      <div v-for="group in groupedClassrooms" :key="group.cursus_id" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <span class="text-[10px] uppercase tracking-wide bg-gray-700 text-white px-1.5 py-0.5 rounded">Cursus</span>
          <h2 class="text-sm font-semibold text-gray-800">{{ group.cursus_name }}</h2>
          <span class="text-[11px] text-gray-500 ml-auto">
            {{ group.levels.reduce((n, l) => n + l.classrooms.length, 0) }} classe{{ group.levels.reduce((n, l) => n + l.classrooms.length, 0) > 1 ? 's' : '' }}
          </span>
        </div>

        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-2 py-1.5 w-8"></th>
              <th class="px-2 py-1.5 text-left">Genre</th>
              <th class="px-2 py-1.5 text-left">Niveau</th>
              <th class="px-2 py-1.5 text-left">Nom de la classe</th>
              <th class="px-2 py-1.5 text-left w-32">Effectif max</th>
              <th class="px-2 py-1.5 text-right w-28">État</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="lvl in group.levels" :key="lvl.level_id">
              <tr
                  v-for="c in lvl.classrooms"
                  :key="c.id"
                  :class="[
                    'transition-colors',
                    c.already_in_active_year
                      ? 'bg-gray-50/60 text-gray-400'
                      : selected.has(c.id)
                        ? 'bg-primary/5'
                        : 'hover:bg-gray-50'
                  ]"
              >
                <td class="px-2 py-1.5 text-center">
                  <input
                      type="checkbox"
                      :checked="selected.has(c.id)"
                      :disabled="c.already_in_active_year"
                      @change="toggle(c.id)"
                      class="cursor-pointer accent-primary disabled:cursor-not-allowed"
                  />
                </td>
                <td class="px-2 py-1.5">
                  <div class="inline-flex items-center gap-1.5">
                    <span
                        class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        :style="{ backgroundColor: genderColors[c.gender] || '#9CA3AF' }"
                    ></span>
                    <span class="text-xs">{{ c.gender }}</span>
                  </div>
                </td>
                <td class="px-2 py-1.5 text-xs text-gray-600">
                  {{ lvl.level_name }}
                </td>
                <td class="px-2 py-1.5">
                  <input
                      type="text"
                      v-model="names[c.id]"
                      :disabled="c.already_in_active_year"
                      :placeholder="c.name"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-transparent disabled:border-transparent disabled:text-gray-400"
                  />
                </td>
                <td class="px-2 py-1.5">
                  <input
                      type="number"
                      min="1"
                      max="999"
                      v-model.number="sizes[c.id]"
                      :disabled="c.already_in_active_year"
                      class="w-20 px-2 py-1 text-xs text-center border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-transparent disabled:border-transparent disabled:text-gray-400"
                  />
                </td>
                <td class="px-2 py-1.5 text-right">
                  <span
                      v-if="c.already_in_active_year"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clip-rule="evenodd"/>
                    </svg>
                    Reconduite
                  </span>
                  <span
                      v-else-if="selected.has(c.id)"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    Sélectionnée
                  </span>
                  <span
                      v-else
                      class="text-[11px] text-gray-400"
                  >
                    —
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
