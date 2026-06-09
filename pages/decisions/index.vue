<script setup>
import { ref, computed, onMounted } from 'vue'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import { usePageTitle } from '~/composables/usePageTitle.js'
import { useSchoolYear } from '~/composables/useSchoolYear'
import suiviService from '~/services/suivi'
import schoolYearService from '~/services/schoolYear'

definePageMeta({
  layout: 'auth',
  middleware: 'admin-director',
  layoutData: { title: 'Suivi des décisions' }
})

usePageTitle('Suivi des décisions')

const { setFlashMessage } = useFlashMessage()
const { activeYear, currentYear, years, load } = useSchoolYear()

const items = ref([])
const isLoading = ref(true)
const query = ref('')
const fCursus = ref('')
const fClasse = ref('')
const activeOutcomes = ref(new Set())
const sortKey = ref('default')
const sortDir = ref('asc')
const togglingOutcomes = ref(false)

const breadcrumbItems = [
  { name: 'Classes', path: '/classes' },
  { name: 'Vue d\'ensemble des décisions', path: '/decisions' }
]

const OUTCOME_KEYS = ['passage', 'redoublement', 'fin_cursus', 'exclusion', 'none']
const SORT_ORDER = { none: 0, redoublement: 1, exclusion: 2, fin_cursus: 3, passage: 4 }

const outcomeMeta = {
  passage: { label: 'Passage', dot: 'bg-green-500', chip: 'bg-green-50 text-green-700 ring-1 ring-green-200', chipOn: 'bg-green-600 text-white ring-2 ring-green-600' },
  redoublement: { label: 'Redoublement', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', chipOn: 'bg-amber-600 text-white ring-2 ring-amber-600' },
  fin_cursus: { label: 'Fin de cursus', dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', chipOn: 'bg-blue-600 text-white ring-2 ring-blue-600' },
  exclusion: { label: 'Exclusion', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 ring-1 ring-red-200', chipOn: 'bg-red-600 text-white ring-2 ring-red-600' },
  none: { label: 'Non décidé', dot: 'bg-gray-300', chip: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200', chipOn: 'bg-gray-600 text-white ring-2 ring-gray-600' }
}

const normalize = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const fullName = (i) => `${i.last_name || ''} ${i.first_name || ''}`
const levelNum = (i) => {
  const m = (i.level || '').match(/\d+/)
  return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY
}

const cursusOptions = computed(() => [...new Set(items.value.map(i => i.cursus).filter(Boolean))].sort())
const classeOptions = computed(() => [...new Set(
  items.value.filter(i => !fCursus.value || i.cursus === fCursus.value).map(i => i.classroom_name).filter(Boolean)
)].sort())

const searchedItems = computed(() => {
  const q = normalize(query.value)
  return items.value.filter(i => {
    if (fCursus.value && i.cursus !== fCursus.value) return false
    if (fClasse.value && i.classroom_name !== fClasse.value) return false
    if (q && !normalize(fullName(i)).includes(q)) return false
    return true
  })
})

const total = computed(() => searchedItems.value.length)
const decidedCount = computed(() => searchedItems.value.filter(i => i.outcome).length)
const undecidedCount = computed(() => total.value - decidedCount.value)
const progressPct = computed(() => total.value ? Math.round((decidedCount.value / total.value) * 100) : 0)
const healthTone = computed(() => progressPct.value >= 90 ? 'green' : progressPct.value >= 50 ? 'amber' : 'red')
const healthClass = computed(() => ({
  green: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200'
}[healthTone.value]))
const undecidedClassesCount = computed(() => new Set(searchedItems.value.filter(i => !i.outcome).map(i => i.classroom_id)).size)

const chipCounts = computed(() => {
  const c = { passage: 0, redoublement: 0, fin_cursus: 0, exclusion: 0, none: 0 }
  for (const i of searchedItems.value) c[i.outcome || 'none']++
  return c
})

const segments = computed(() => {
  const base = total.value
  if (!base) return []
  const segs = OUTCOME_KEYS
    .map(key => ({ key, count: chipCounts.value[key], pct: Math.round((chipCounts.value[key] / base) * 100) }))
    .filter(s => s.count > 0)
  if (segs.length) {
    const sumOthers = segs.slice(0, -1).reduce((a, s) => a + s.pct, 0)
    segs[segs.length - 1].pct = Math.max(0, 100 - sumOthers)
  }
  return segs
})

const filteredItems = computed(() => {
  let list = searchedItems.value
  if (activeOutcomes.value.size) {
    list = list.filter(i => (i.outcome && activeOutcomes.value.has(i.outcome)) || (!i.outcome && activeOutcomes.value.has('none')))
  }
  const dir = sortDir.value === 'desc' ? -1 : 1
  const byName = (a, b) => normalize(fullName(a)).localeCompare(normalize(fullName(b)), 'fr')
  const byOutcome = (a, b) => SORT_ORDER[a.outcome || 'none'] - SORT_ORDER[b.outcome || 'none']
  const arr = [...list]
  if (sortKey.value === 'default') {
    arr.sort((a, b) => byOutcome(a, b) || byName(a, b))
  } else if (sortKey.value === 'nom') {
    arr.sort((a, b) => byName(a, b) * dir)
  } else if (sortKey.value === 'cursus') {
    arr.sort((a, b) => ((a.cursus || '\uffff').localeCompare(b.cursus || '\uffff', 'fr') || byName(a, b)) * dir)
  } else if (sortKey.value === 'classroom') {
    arr.sort((a, b) => ((a.classroom_name || '\uffff').localeCompare(b.classroom_name || '\uffff', 'fr') || byName(a, b)) * dir)
  } else if (sortKey.value === 'teacher') {
    arr.sort((a, b) => ((normalize(a.teacher) || '\uffff').localeCompare(normalize(b.teacher) || '\uffff', 'fr') || byName(a, b)) * dir)
  } else if (sortKey.value === 'level') {
    arr.sort((a, b) => ((levelNum(a) - levelNum(b)) || byName(a, b)) * dir)
  } else if (sortKey.value === 'outcome') {
    arr.sort((a, b) => (byOutcome(a, b) || byName(a, b)) * dir)
  }
  return arr
})

const resultsCount = computed(() => filteredItems.value.length)
const hasActiveFilter = computed(() => !!query.value || !!fCursus.value || !!fClasse.value || activeOutcomes.value.size > 0 || sortKey.value !== 'default')

const toggleOutcome = (key) => {
  const s = new Set(activeOutcomes.value)
  s.has(key) ? s.delete(key) : s.add(key)
  activeOutcomes.value = s
}

const toggleSort = (key) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDir.value = 'asc' }
}

const resetFilters = () => {
  query.value = ''
  fCursus.value = ''
  fClasse.value = ''
  activeOutcomes.value = new Set()
  sortKey.value = 'default'
  sortDir.value = 'asc'
}

const fetchData = async () => {
  try {
    isLoading.value = true
    const data = await suiviService.outcomesOverview()
    items.value = data.items || []
  } catch (e) {
    setFlashMessage({ type: 'error', message: 'Impossible de charger les décisions' })
  } finally {
    isLoading.value = false
  }
}

const canToggleOutcomes = computed(() => !!activeYear.value && (!currentYear.value || currentYear.value.id === activeYear.value.id))

const toggleDecisions = async () => {
  if (togglingOutcomes.value || !activeYear.value) return
  togglingOutcomes.value = true
  const wasOpen = activeYear.value.outcomes_open
  try {
    await schoolYearService.toggleOutcomes(activeYear.value.id, !wasOpen)
    setFlashMessage({ type: 'success', message: wasOpen ? 'Saisie des décisions fermée' : 'Saisie des décisions ouverte' })
    await load()
  } catch (e) {
    setFlashMessage({ type: 'error', message: e?.response?.data?.message || 'Erreur lors de la bascule' })
  } finally {
    togglingOutcomes.value = false
  }
}

onMounted(() => {
  if (!years.value.length) load()
  fetchData()
})
</script>

<template>
  <PageContainer>
    <BreadCrumb :custom-items="breadcrumbItems" />
    <p class="text-xs text-placeholder mb-3 max-w-3xl">
      Vue de synthèse — les décisions se saisissent dans l'émargement du professeur et à la clôture de l'année. Vous pilotez ci-dessous l'ouverture de la saisie.
    </p>

    <div v-if="canToggleOutcomes" class="bg-white rounded-2xl border px-4 py-2.5 mb-3 flex items-center justify-between gap-3 font-nunito">
      <div class="min-w-0">
        <div class="text-xs font-semibold text-default font-montserrat">Saisie des décisions par les professeurs</div>
        <div class="text-[11px] text-placeholder mt-0.5">
          {{ activeYear.outcomes_open ? 'Ouverte — les professeurs peuvent saisir les décisions de leurs classes.' : 'Fermée — la saisie est verrouillée pour les professeurs.' }}
        </div>
      </div>
      <button
          type="button"
          @click="toggleDecisions"
          :disabled="togglingOutcomes"
          :class="['flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors shrink-0', activeYear.outcomes_open ? 'bg-green-50 border-green-300 hover:bg-green-100' : 'bg-gray-50 border-gray-300 hover:bg-gray-100', togglingOutcomes ? 'opacity-60 cursor-wait' : '']"
      >
        <span :class="['relative inline-block w-10 h-5 rounded-full transition-colors', activeYear.outcomes_open ? 'bg-green-500' : 'bg-gray-300']">
          <span :class="['absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all', activeYear.outcomes_open ? 'left-[1.375rem]' : 'left-0.5']"></span>
        </span>
        <span :class="['text-xs font-medium', activeYear.outcomes_open ? 'text-green-800' : 'text-gray-700']">{{ activeYear.outcomes_open ? 'Ouverte' : 'Fermée' }}</span>
      </button>
    </div>

    <div v-if="isLoading" class="py-10 text-center text-xs text-placeholder">Chargement…</div>

    <template v-else>
      <div class="bg-white rounded-2xl border p-4 mb-3 flex flex-col md:flex-row font-nunito">
        <div class="md:w-72 md:pr-6 md:border-r md:border-[#E6EFF5] shrink-0">
          <div class="flex items-center justify-between gap-2">
            <div>
              <span class="font-montserrat text-xl font-semibold text-default tabular-nums">{{ decidedCount }}</span>
              <span class="text-sm text-placeholder"> / {{ total }}</span>
            </div>
            <span :class="['inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums', healthClass]">{{ progressPct }}%</span>
          </div>
          <div class="text-[11px] uppercase tracking-wide text-placeholder mt-0.5 font-montserrat">décisions prises</div>

          <div class="h-2 w-full rounded-full bg-gray-100 overflow-hidden flex mt-2">
            <div
                v-for="seg in segments"
                :key="seg.key"
                :class="outcomeMeta[seg.key].dot"
                :style="{ width: seg.pct + '%' }"
                :title="`${outcomeMeta[seg.key].label} · ${seg.count} (${seg.pct}%)`"
            ></div>
          </div>
          <div class="text-[11px] text-placeholder mt-1">
            {{ progressPct }}% traité · {{ undecidedCount }} restante{{ undecidedCount > 1 ? 's' : '' }} sur {{ undecidedClassesCount }} classe{{ undecidedClassesCount > 1 ? 's' : '' }}
          </div>
        </div>

        <div class="flex-1 md:pl-6 mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#E6EFF5]">
          <div class="text-[11px] uppercase tracking-wide text-placeholder mb-1.5 font-montserrat">Répartition (cliquer pour filtrer)</div>
          <div class="flex flex-wrap gap-1.5">
            <button
                v-for="k in OUTCOME_KEYS"
                :key="k"
                type="button"
                @click="toggleOutcome(k)"
                :class="[
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition hover:opacity-100',
                  activeOutcomes.has(k) ? outcomeMeta[k].chipOn + ' font-semibold shadow-sm' : outcomeMeta[k].chip + ' font-medium',
                  activeOutcomes.size && !activeOutcomes.has(k) ? 'opacity-40' : ''
                ]"
            >
              <svg v-if="activeOutcomes.has(k)" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span v-else class="h-1.5 w-1.5 rounded-full" :class="outcomeMeta[k].dot"></span>
              <span class="font-semibold tabular-nums">{{ chipCounts[k] }}</span>
              {{ outcomeMeta[k].label }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 mb-3">
        <div class="relative">
          <svg class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-placeholder pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
              v-model="query"
              type="text"
              placeholder="Rechercher un élève…"
              class="pl-7 pr-2 py-1.5 text-xs border border-input-stroke rounded-lg focus:outline-none focus:border-default w-56"
          />
        </div>
        <select v-model="fCursus" @change="fClasse = ''" class="px-2 py-1.5 text-xs border border-input-stroke rounded-lg focus:outline-none focus:border-default min-w-[10rem]">
          <option value="">Tous les cursus</option>
          <option v-for="c in cursusOptions" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="fClasse" class="px-2 py-1.5 text-xs border border-input-stroke rounded-lg focus:outline-none focus:border-default min-w-[10rem]">
          <option value="">Toutes les classes</option>
          <option v-for="c in classeOptions" :key="c" :value="c">{{ c }}</option>
        </select>
        <div class="ml-auto flex items-center gap-3">
          <span class="text-[11px] text-placeholder">{{ resultsCount }} résultat{{ resultsCount > 1 ? 's' : '' }}</span>
          <button v-if="hasActiveFilter" type="button" @click="resetFilters" class="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Réinitialiser</button>
        </div>
      </div>

      <div class="bg-white rounded-2xl border overflow-hidden font-nunito">
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 border-b border-[#E6EFF5] font-montserrat">
              <tr>
                <th @click="toggleSort('nom')" class="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap">
                  Élève <span v-if="sortKey === 'nom'" class="text-default">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('cursus')" class="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap">
                  Cursus <span v-if="sortKey === 'cursus'" class="text-default">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('level')" class="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap">
                  Niveau <span v-if="sortKey === 'level'" class="text-default">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('classroom')" class="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap">
                  Classe <span v-if="sortKey === 'classroom'" class="text-default">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('teacher')" class="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap">
                  Professeur <span v-if="sortKey === 'teacher'" class="text-default">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('outcome')" class="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap w-40">
                  Décision <span v-if="sortKey === 'outcome'" class="text-default">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th class="px-3 py-2 text-left font-semibold text-gray-600">Note</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E6EFF5]">
              <tr v-for="i in filteredItems" :key="`${i.student_id}-${i.classroom_id}`" class="hover:bg-gray-50">
                <td class="px-3 py-1.5 whitespace-nowrap"><span class="font-medium text-gray-900">{{ i.last_name }}</span> {{ i.first_name }}</td>
                <td class="px-3 py-1.5 text-gray-600">{{ i.cursus || '—' }}</td>
                <td class="px-3 py-1.5 text-gray-600">{{ i.level || '—' }}</td>
                <td class="px-3 py-1.5 text-gray-600">{{ i.classroom_name || '—' }}</td>
                <td class="px-3 py-1.5 text-gray-600 whitespace-nowrap">{{ i.teacher || '—' }}</td>
                <td class="px-3 py-1.5">
                  <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium', outcomeMeta[i.outcome || 'none'].chip]">
                    <span class="h-1.5 w-1.5 rounded-full" :class="outcomeMeta[i.outcome || 'none'].dot"></span>
                    {{ outcomeMeta[i.outcome || 'none'].label }}
                  </span>
                </td>
                <td class="px-3 py-1.5 text-gray-600">
                  <span v-if="i.commentaire" :title="i.commentaire" class="block max-w-[20rem] truncate">{{ i.commentaire }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>
              </tr>
              <tr v-if="resultsCount === 0">
                <td colspan="7" class="px-3 py-6 text-center text-placeholder">
                  {{ hasActiveFilter ? 'Aucun élève ne correspond aux filtres.' : 'Aucun élève actif cette année.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
