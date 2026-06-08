<script setup>
import {ref, computed, onMounted, nextTick} from 'vue'
import {useRoute} from '#imports'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import {usePageTitle} from '~/composables/usePageTitle.js'
import teacherService from '~/services/teacher'

definePageMeta({
  layout: 'auth',
  layoutData: {title: 'Détail de classe'}
})

usePageTitle('Détail de classe')

const route = useRoute()
const {setFlashMessage} = useFlashMessage()

const classroom = ref(null)
const students = ref([])
const outcomesOpen = ref(false)
const yearClosed = ref(false)
const isLoading = ref(true)
const error = ref(null)

const activeTab = ref('students')

const isSavingOutcomes = ref(false)
const outcomeOptions = [
  {value: 'passage', label: 'Passage', selectedClass: 'bg-green-600 text-white border-green-600', idleClass: 'bg-white text-green-700 border-green-300 hover:bg-green-50'},
  {value: 'redoublement', label: 'Redoublement', selectedClass: 'bg-amber-500 text-white border-amber-500', idleClass: 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'},
  {value: 'fin_cursus', label: 'Fin de cursus', selectedClass: 'bg-blue-600 text-white border-blue-600', idleClass: 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'},
  {value: 'exclusion', label: 'Exclusion', selectedClass: 'bg-red-600 text-white border-red-600', idleClass: 'bg-white text-red-700 border-red-300 hover:bg-red-50'}
]
const canEditOutcomes = computed(() => outcomesOpen.value && !yearClosed.value)
const decisionsCount = computed(() => students.value.filter(s => s.outcome).length)

const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const CYCLE = ['', 'present', 'absent_justifie', 'absent_non_justifie']
const attMeta = {
  present: {glyph: '✓', cls: 'bg-green-100 text-green-700 border-green-300', label: 'Présent'},
  absent_justifie: {glyph: 'J', cls: 'bg-amber-100 text-amber-700 border-amber-300', label: 'Absent justifié'},
  absent_non_justifie: {glyph: '✗', cls: 'bg-red-100 text-red-700 border-red-300', label: 'Absent non justifié'}
}

const matDates = ref([])
const mat = ref([])
const matLoaded = ref(false)
const isLoadingMatrix = ref(false)
const savingCount = ref(0)
const sessionDateInput = ref(null)
const motif = ref(null)
const motifInput = ref(null)
const attendanceEditable = computed(() => !yearClosed.value)

let saveTimers = {}

const tabs = computed(() => {
  const t = [
    {key: 'students', label: 'Élèves'},
    {key: 'attendance', label: 'Émargement'}
  ]
  if (outcomesOpen.value) t.push({key: 'decisions', label: 'Décisions'})
  return t
})

const breadcrumbItems = computed(() => [
  {name: 'Mes classes', path: '/professeur/classes'},
  {name: classroom.value?.name || 'Classe', path: route.path}
])

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const monthGroups = computed(() => {
  const groups = []
  let cur = null
  for (const d of matDates.value) {
    const ym = d.slice(0, 7)
    if (!cur || cur.ym !== ym) {
      cur = {ym, label: `${monthNames[parseInt(d.slice(5, 7), 10) - 1]} ${d.slice(0, 4)}`, dates: []}
      groups.push(cur)
    }
    cur.dates.push(d)
  }
  return groups
})

const ratesMap = computed(() => {
  const m = {}
  for (const s of mat.value) {
    let marked = 0, present = 0
    for (const d of matDates.value) {
      const c = s.cells[d]
      if (c && c.status) { marked++; if (c.status === 'present') present++ }
    }
    m[s.student_id] = marked ? Math.round((present / marked) * 100) : null
  }
  return m
})

const cellTitle = (s, d) => {
  const c = s.cells[d]
  if (!c || !c.status) return attendanceEditable.value ? 'Cliquer pour pointer' : 'Non pointé'
  let t = attMeta[c.status]?.label
  if (c.status === 'absent_justifie' && c.justification) t += ` — ${c.justification}`
  return t
}

const fetchData = async () => {
  try {
    isLoading.value = true
    const response = await teacherService.classroomStudents(route.params.id)
    if (response.status === 'success') {
      classroom.value = response.data.classroom
      students.value = response.data.students.map(s => ({...s, outcome: s.outcome || '', commentaire: s.commentaire || ''}))
      outcomesOpen.value = response.data.outcomes_open
      yearClosed.value = response.data.year_closed
    }
  } catch (e) {
    console.error('Erreur récupération élèves:', e)
    error.value = 'Impossible de charger les élèves'
  } finally {
    isLoading.value = false
  }
}

const loadMatrix = async () => {
  try {
    isLoadingMatrix.value = true
    const res = await teacherService.classroomAttendanceMatrix(route.params.id)
    if (res.status === 'success') {
      yearClosed.value = res.data.year_closed
      matDates.value = res.data.dates || []
      mat.value = (res.data.students || []).map(s => {
        const cells = {}
        for (const d in (s.attendance || {})) {
          cells[d] = {status: s.attendance[d].status || '', justification: s.attendance[d].justification || ''}
        }
        return {student_id: s.student_id, first_name: s.first_name, last_name: s.last_name, cells}
      })
      matLoaded.value = true
    }
  } catch (e) {
    console.error('Erreur matrice émargement:', e)
    setFlashMessage({type: 'error', message: 'Impossible de charger l\'émargement'})
  } finally {
    isLoadingMatrix.value = false
  }
}

const selectTab = (key) => {
  activeTab.value = key
  if (key === 'attendance' && !matLoaded.value) loadMatrix()
}

const recordsFor = (d) => mat.value
    .filter(s => s.cells[d] && s.cells[d].status)
    .map(s => ({
      student_id: s.student_id,
      status: s.cells[d].status,
      justification: s.cells[d].status === 'absent_justifie' ? (s.cells[d].justification || null) : null
    }))

const doSaveDate = async (d) => {
  if (!attendanceEditable.value) return
  savingCount.value++
  try {
    await teacherService.saveAttendance(route.params.id, d, recordsFor(d))
  } catch (e) {
    setFlashMessage({type: 'error', message: e.response?.data?.message || 'Erreur d\'enregistrement'})
  } finally {
    savingCount.value--
  }
}

const autosaveDate = (d) => {
  clearTimeout(saveTimers[d])
  saveTimers[d] = setTimeout(() => doSaveDate(d), 450)
}

const openMotif = (s, d, ev) => {
  const r = ev.currentTarget.getBoundingClientRect()
  motif.value = {s, d, top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 240)}
  nextTick(() => motifInput.value?.focus())
}
const closeMotif = () => { motif.value = null }
const commitMotif = () => {
  if (motif.value) { autosaveDate(motif.value.d); closeMotif() }
}

const hoverTip = ref(null)
const onCellEnter = (s, d, ev) => {
  if (motif.value) return
  const c = s.cells[d]
  if (c && c.status === 'absent_justifie' && c.justification) {
    const r = ev.currentTarget.getBoundingClientRect()
    hoverTip.value = {text: c.justification, top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 220)}
  } else {
    hoverTip.value = null
  }
}
const onCellLeave = () => { hoverTip.value = null }

const cycleCell = (s, d, ev) => {
  if (!attendanceEditable.value) return
  const cur = s.cells[d]?.status || ''
  const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length]
  if (!s.cells[d]) s.cells[d] = {status: '', justification: ''}
  s.cells[d].status = next
  if (next === 'absent_justifie') openMotif(s, d, ev)
  else closeMotif()
  autosaveDate(d)
}

const pickSession = () => {
  if (sessionDateInput.value) {
    sessionDateInput.value.value = toDateStr(new Date())
    sessionDateInput.value.showPicker ? sessionDateInput.value.showPicker() : sessionDateInput.value.focus()
  }
}
const onAddSession = (ev) => {
  const d = ev.target.value
  if (!d || matDates.value.includes(d)) return
  matDates.value = [...matDates.value, d].sort()
  mat.value.forEach(s => { s.cells[d] = {status: '', justification: ''} })
}

const handleSaveOutcomes = async () => {
  if (!canEditOutcomes.value) return
  const decisions = students.value
      .filter(s => s.outcome)
      .map(s => ({student_id: s.student_id, outcome: s.outcome, commentaire: s.commentaire || null}))
  if (decisions.length === 0) {
    setFlashMessage({type: 'error', message: 'Aucune décision à enregistrer'})
    return
  }
  try {
    isSavingOutcomes.value = true
    await teacherService.saveOutcomes(route.params.id, decisions)
    setFlashMessage({type: 'success', message: 'Décisions enregistrées'})
    await fetchData()
  } catch (e) {
    setFlashMessage({type: 'error', message: e.response?.data?.message || 'Erreur lors de l\'enregistrement'})
  } finally {
    isSavingOutcomes.value = false
  }
}

onMounted(() => fetchData())
</script>

<template>
  <PageContainer>
    <BreadCrumb :custom-items="breadcrumbItems" />

    <div v-if="isLoading" class="py-10 text-center text-gray-500 text-xs">Chargement…</div>
    <div v-else-if="error" class="bg-red-50 text-red-700 p-2 rounded">{{ error }}</div>

    <template v-else>
      <div class="flex items-center gap-1 border-b border-[#E6EFF5] mb-4">
        <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            @click="selectTab(t.key)"
            :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors', activeTab === t.key ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']"
        >
          {{ t.label }}
        </button>
      </div>

      <div v-if="activeTab === 'students'">
        <p class="text-xs text-gray-500 mb-2">{{ students.length }} élève{{ students.length > 1 ? 's' : '' }}</p>
        <ul class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          <li v-for="(s, i) in students" :key="s.student_id" class="flex items-center gap-2 px-3 py-1.5 text-xs">
            <span class="w-5 text-gray-400 tabular-nums">{{ i + 1 }}</span>
            <span class="font-medium text-gray-900 truncate">{{ s.last_name }} {{ s.first_name }}</span>
          </li>
          <li v-if="students.length === 0" class="px-3 py-6 text-center text-xs text-gray-500">Aucun élève inscrit dans cette classe.</li>
        </ul>
      </div>

      <div v-else-if="activeTab === 'attendance'">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span class="text-placeholder">Clique une case pour pointer (présent → justifié → absent → vide) :</span>
            <span v-for="(m, k) in attMeta" :key="k" class="inline-flex items-center gap-1.5">
              <span :class="['inline-flex items-center justify-center w-5 h-5 rounded border text-[11px] font-bold', m.cls]">{{ m.glyph }}</span>
              {{ m.label }}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span v-if="savingCount > 0" class="text-[11px] text-placeholder">Enregistrement…</span>
            <button
                v-if="attendanceEditable"
                type="button"
                @click="pickSession"
                class="px-3 py-1.5 rounded-lg bg-default text-white text-xs font-medium hover:opacity-90 inline-flex items-center gap-1"
            >
              <span class="text-sm leading-none">+</span> Séance
            </button>
            <input ref="sessionDateInput" type="date" class="sr-only" @change="onAddSession" />
          </div>
        </div>

        <div v-if="isLoadingMatrix" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">Chargement…</div>
        <div v-else-if="mat.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">Aucun élève inscrit dans cette classe.</div>
        <div v-else-if="matDates.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">
          Aucune séance émargée. Clique sur <strong>« + Séance »</strong> pour faire l'appel d'aujourd'hui.
        </div>
        <div v-else class="bg-white rounded-2xl border overflow-x-auto font-nunito">
          <table class="text-xs border-collapse">
            <thead>
              <tr class="border-b border-[#E6EFF5]">
                <th rowspan="2" class="sticky left-0 z-10 bg-white text-left font-semibold text-gray-700 px-3 py-2 min-w-[11rem] border-r border-[#E6EFF5] font-montserrat align-bottom">Élève</th>
                <th v-for="g in monthGroups" :key="g.ym" :colspan="g.dates.length" class="px-2 py-1 text-center text-[10px] uppercase tracking-wide text-placeholder border-l border-[#E6EFF5]">{{ g.label }}</th>
                <th rowspan="2" class="px-2 py-2 text-center font-semibold text-gray-700 border-l border-[#E6EFF5] align-bottom">Taux</th>
              </tr>
              <tr class="border-b border-[#E6EFF5]">
                <template v-for="g in monthGroups" :key="g.ym">
                  <th v-for="(d, i) in g.dates" :key="d" :title="d" :class="['px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap', i === 0 ? 'border-l border-[#E6EFF5]' : '']">{{ d.slice(8, 10) }}/{{ d.slice(5, 7) }}</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in mat" :key="s.student_id" class="border-b border-[#E6EFF5] last:border-b-0 hover:bg-gray-50">
                <td class="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-900 border-r border-[#E6EFF5] whitespace-nowrap font-montserrat">{{ s.last_name }} {{ s.first_name }}</td>
                <template v-for="g in monthGroups" :key="g.ym">
                  <td v-for="(d, i) in g.dates" :key="d" :class="['px-1.5 py-1.5 text-center', i === 0 ? 'border-l border-[#E6EFF5]' : '']">
                    <button
                        type="button"
                        @click="cycleCell(s, d, $event)"
                        @mouseenter="onCellEnter(s, d, $event)"
                        @mouseleave="onCellLeave"
                        :disabled="!attendanceEditable"
                        :title="cellTitle(s, d)"
                        :class="[
                          'inline-flex items-center justify-center w-6 h-6 rounded border text-[11px] font-bold transition-colors relative',
                          s.cells[d] && s.cells[d].status ? attMeta[s.cells[d].status].cls : 'border-dashed border-gray-200 text-gray-300',
                          attendanceEditable ? 'cursor-pointer hover:border-gray-400' : 'cursor-default'
                        ]"
                    >
                      {{ s.cells[d] && s.cells[d].status ? attMeta[s.cells[d].status].glyph : '–' }}
                      <span v-if="s.cells[d] && s.cells[d].status === 'absent_justifie' && s.cells[d].justification" class="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    </button>
                  </td>
                </template>
                <td class="px-2 py-1.5 text-center border-l border-[#E6EFF5] font-semibold" :class="ratesMap[s.student_id] === null ? 'text-gray-300' : ratesMap[s.student_id] < 70 ? 'text-amber-600' : 'text-gray-700'">{{ ratesMap[s.student_id] !== null ? ratesMap[s.student_id] + '%' : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="activeTab === 'decisions'">
        <div class="flex items-center justify-between gap-3 mb-3">
          <p class="text-xs text-gray-500">{{ students.length }} élève{{ students.length > 1 ? 's' : '' }}</p>
          <button
              v-if="canEditOutcomes && students.length > 0"
              type="button"
              @click="handleSaveOutcomes"
              :disabled="isSavingOutcomes || decisionsCount === 0"
              :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0', decisionsCount === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-default text-white hover:opacity-90']"
          >
            <span v-if="decisionsCount > 0" class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded-full bg-white/25 text-xs font-bold">{{ decisionsCount }}</span>
            {{ isSavingOutcomes ? 'Enregistrement…' : decisionsCount === 0 ? 'Aucune décision saisie' : `Enregistrer ${decisionsCount > 1 ? 'les décisions' : 'la décision'}` }}
          </button>
        </div>

        <div v-if="yearClosed" class="mb-3 px-2 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs">Année clôturée — lecture seule</div>

        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table class="min-w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Élève</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-2/5">Décision</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commentaire</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
            <tr v-for="s in students" :key="s.student_id">
              <td class="px-3 py-1.5 text-xs text-gray-900 font-medium">{{ s.last_name }} {{ s.first_name }}</td>
              <td class="px-3 py-1.5">
                <div v-if="canEditOutcomes" class="flex flex-wrap gap-1.5">
                  <label
                      v-for="opt in outcomeOptions"
                      :key="opt.value"
                      :class="['inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium cursor-pointer transition-colors', s.outcome === opt.value ? opt.selectedClass : opt.idleClass]"
                  >
                    <input type="radio" :name="`outcome-${s.student_id}`" :value="opt.value" v-model="s.outcome" class="hidden" />
                    {{ opt.label }}
                  </label>
                </div>
                <span v-else-if="s.outcome" :class="['inline-flex items-center px-2 py-1 rounded border text-xs font-medium', outcomeOptions.find(o => o.value === s.outcome)?.selectedClass]">{{ outcomeOptions.find(o => o.value === s.outcome)?.label }}</span>
                <span v-else class="text-xs text-gray-400">Aucune décision</span>
              </td>
              <td class="px-3 py-1.5">
                <input v-if="canEditOutcomes" v-model="s.commentaire" type="text" placeholder="Optionnel" class="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-primary" />
                <span v-else class="text-xs text-gray-600">{{ s.commentaire || '—' }}</span>
              </td>
            </tr>
            <tr v-if="students.length === 0">
              <td colspan="3" class="px-3 py-6 text-center text-xs text-gray-500">Aucun élève inscrit dans cette classe.</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div
        v-if="motif"
        class="fixed z-50 bg-white border border-[#E6EFF5] rounded-lg shadow-lg p-2 w-56 font-nunito"
        :style="{top: motif.top + 'px', left: motif.left + 'px'}"
    >
      <div class="text-[11px] text-placeholder mb-1">Motif · {{ motif.s.last_name }} {{ motif.s.first_name }} · {{ motif.d.slice(8, 10) }}/{{ motif.d.slice(5, 7) }}</div>
      <input
          ref="motifInput"
          v-model="motif.s.cells[motif.d].justification"
          @keydown.enter="commitMotif"
          @blur="commitMotif"
          type="text"
          placeholder="Motif (optionnel)"
          class="w-full border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"
      />
    </div>

    <div
        v-if="hoverTip"
        class="fixed z-40 bg-white border border-amber-200 rounded-lg shadow-md px-2.5 py-1.5 text-[11px] text-amber-800 max-w-[14rem] font-nunito pointer-events-none"
        :style="{top: hoverTip.top + 'px', left: hoverTip.left + 'px'}"
    >
      <span class="font-semibold">Motif :</span> {{ hoverTip.text }}
    </div>
  </PageContainer>
</template>
