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
const isMainTeacher = ref(false)
const yearClosed = ref(false)
const isLoading = ref(true)
const error = ref(null)

const activeTab = ref('students')

const OUTCOMES = [
  {value: 'passage', label: 'Passage', dot: 'bg-green-500', head: 'text-green-700', cellSel: 'bg-green-100 text-green-700 ring-1 ring-green-300', cellHover: 'hover:bg-green-50 hover:text-green-400'},
  {value: 'redoublement', label: 'Redoublement', dot: 'bg-amber-500', head: 'text-amber-700', cellSel: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300', cellHover: 'hover:bg-amber-50 hover:text-amber-400'},
  {value: 'fin_cursus', label: 'Fin de cursus', dot: 'bg-blue-500', head: 'text-blue-700', cellSel: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300', cellHover: 'hover:bg-blue-50 hover:text-blue-400'},
  {value: 'exclusion', label: 'Exclusion', dot: 'bg-red-500', head: 'text-red-700', cellSel: 'bg-red-100 text-red-700 ring-1 ring-red-300', cellHover: 'hover:bg-red-50 hover:text-red-400'}
]
const canEditOutcomes = computed(() => outcomesOpen.value && isMainTeacher.value && !yearClosed.value)
const decidedCount = computed(() => students.value.filter(s => s.outcome).length)

let outcomeSaveTimer = null
const doSaveOutcomes = async () => {
  if (!canEditOutcomes.value) return
  const decisions = students.value
      .filter(s => s.outcome)
      .map(s => ({student_id: s.student_id, outcome: s.outcome, commentaire: s.commentaire || null}))
  try {
    await teacherService.saveOutcomes(route.params.id, decisions)
  } catch (e) {
    setFlashMessage({type: 'error', message: e.response?.data?.message || 'Erreur d\'enregistrement'})
  }
}
const queueSaveOutcomes = () => {
  clearTimeout(outcomeSaveTimer)
  outcomeSaveTimer = setTimeout(doSaveOutcomes, 450)
}
const setOutcome = (s, val) => {
  if (!canEditOutcomes.value) return
  s.outcome = s.outcome === val ? '' : val
  queueSaveOutcomes()
}

const note = ref(null)
const noteInput = ref(null)
const openNote = (s, ev) => {
  if (!canEditOutcomes.value && !s.commentaire) return
  const r = ev.currentTarget.getBoundingClientRect()
  note.value = {s, top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 264)}
  nextTick(() => noteInput.value?.focus())
}
const closeNote = () => { note.value = null }
const commitNote = () => {
  if (note.value) { queueSaveOutcomes(); closeNote() }
}

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
      isMainTeacher.value = !!response.data.is_main_teacher
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
        <span
            v-if="isMainTeacher"
            class="ml-auto mb-1 inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Professeur principal
        </span>
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
        <div
            v-if="!isMainTeacher"
            class="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-xs text-amber-800"
        >
          <svg class="size-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Vous n'êtes pas le professeur principal de cette classe : vous pouvez suivre les décisions de fin d'année, mais leur saisie est réservée au professeur principal.</span>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span class="text-placeholder">{{ canEditOutcomes ? 'Clique la colonne voulue pour décider :' : 'Décisions de fin d\'année :' }}</span>
            <span v-for="o in OUTCOMES" :key="o.value" class="inline-flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full" :class="o.dot"></span>{{ o.label }}
            </span>
          </div>
          <span v-if="!canEditOutcomes && isMainTeacher" class="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200 shrink-0">Lecture seule</span>
        </div>

        <div v-if="students.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">Aucun élève inscrit dans cette classe.</div>
        <div v-else class="bg-white rounded-2xl border overflow-x-auto font-nunito">
          <table class="text-xs border-collapse w-full">
            <thead>
              <tr class="border-b border-[#E6EFF5]">
                <th class="sticky left-0 z-10 bg-white text-left font-semibold text-gray-700 px-3 py-2 min-w-[11rem] border-r border-[#E6EFF5] font-montserrat">
                  Élève <span class="font-normal text-placeholder">· {{ decidedCount }}/{{ students.length }}</span>
                </th>
                <th v-for="o in OUTCOMES" :key="o.value" :class="['px-3 py-2 text-center font-semibold border-l border-[#E6EFF5] whitespace-nowrap', o.head]">{{ o.label }}</th>
                <th class="px-2 py-2 text-center font-semibold text-gray-700 border-l border-[#E6EFF5]">Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in students" :key="s.student_id" class="border-b border-[#E6EFF5] last:border-b-0 hover:bg-gray-50">
                <td class="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-900 border-r border-[#E6EFF5] whitespace-nowrap font-montserrat">{{ s.last_name }} {{ s.first_name }}</td>
                <td v-for="o in OUTCOMES" :key="o.value" class="px-1.5 py-1.5 border-l border-[#E6EFF5]">
                  <button
                      type="button"
                      @click="setOutcome(s, o.value)"
                      :disabled="!canEditOutcomes"
                      :class="[
                        'w-full h-7 rounded-md text-sm font-bold flex items-center justify-center transition-colors',
                        s.outcome === o.value ? o.cellSel : (canEditOutcomes ? 'text-transparent cursor-pointer ' + o.cellHover : 'text-transparent cursor-default')
                      ]"
                  >✓</button>
                </td>
                <td class="px-2 py-1.5 text-center border-l border-[#E6EFF5]">
                  <button
                      type="button"
                      @click="openNote(s, $event)"
                      :disabled="(!canEditOutcomes || !s.outcome) && !s.commentaire"
                      :title="s.commentaire || ((canEditOutcomes && s.outcome) ? 'Ajouter une note' : '')"
                      :class="['relative inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors', s.commentaire ? 'text-amber-600 hover:bg-amber-50' : (canEditOutcomes && s.outcome ? 'text-gray-300 hover:text-gray-500 hover:bg-gray-50' : 'text-gray-200 cursor-default')]"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    <span v-if="s.commentaire" class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  </button>
                </td>
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
        v-if="note"
        class="fixed z-50 bg-white border border-[#E6EFF5] rounded-lg shadow-lg p-2 w-60 font-nunito"
        :style="{top: note.top + 'px', left: note.left + 'px'}"
    >
      <div class="text-[11px] text-placeholder mb-1">Note · {{ note.s.last_name }} {{ note.s.first_name }}</div>
      <textarea
          ref="noteInput"
          v-model="note.s.commentaire"
          :readonly="!canEditOutcomes"
          @blur="commitNote"
          rows="2"
          placeholder="Commentaire (optionnel)"
          class="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-400 resize-none"
      ></textarea>
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
