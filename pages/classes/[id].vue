<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#imports'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import UpdateClassModal from '~/components/modals/UpdateClassModal.vue'
import StudentAttendancePanel from '~/components/suivi/StudentAttendancePanel.vue'
import ScheduleGrid from '~/components/schedule/ScheduleGrid.vue'
import Edit from '~/components/Icons/Edit.vue'
import { usePageTitle } from '~/composables/usePageTitle.js'
import suiviService from '~/services/suivi'
import classeService from '~/services/classe'
import cursusService from '~/services/cursus'

definePageMeta({
  layout: 'auth',
  middleware: 'permission',
  permission: 'classrooms.supervise',
  layoutData: { title: 'Suivi de classe' }
})

usePageTitle('Suivi de classe')

const route = useRoute()

const classroom = ref(null)
const students = ref([])
const dates = ref([])
const isLoading = ref(true)
const error = ref(null)
const activeTab = ref('attendance')

const genderColors = { Hommes: '#93C5FD', Femmes: '#FDA4AF', Enfants: '#FCD34D', Mixte: '#86EFAC' }
const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

const attMeta = {
  present: { glyph: '✓', cls: 'bg-green-100 text-green-700 border-green-300', label: 'Présent' },
  absent_justifie: { glyph: 'J', cls: 'bg-amber-100 text-amber-700 border-amber-300', label: 'Absent justifié' },
  absent_non_justifie: { glyph: '✗', cls: 'bg-red-100 text-red-700 border-red-300', label: 'Absent non justifié' }
}
const outcomeMeta = {
  passage: { label: 'Passage', dot: 'bg-green-500', chip: 'bg-green-100 text-green-700 ring-1 ring-green-300' },
  redoublement: { label: 'Redoublement', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' },
  fin_cursus: { label: 'Fin de cursus', dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' },
  exclusion: { label: 'Exclusion', dot: 'bg-red-500', chip: 'bg-red-100 text-red-700 ring-1 ring-red-300' }
}

const breadcrumbItems = computed(() => [
  { name: 'Classes', path: '/classes' },
  { name: classroom.value?.name || 'Classe', path: route.path }
])

const accent = computed(() => genderColors[classroom.value?.gender] || '#9CA3AF')
const decidedCount = computed(() => students.value.filter(s => s.outcome).length)

const gridSchedules = computed(() => (classroom.value?.schedules || []).map((s, i) => ({
  id: i,
  day: s.day,
  start_time: s.start_time,
  end_time: s.end_time,
  teacher_name: s.teacher,
  classroom: { name: classroom.value.name, gender: classroom.value.gender, cursus_name: classroom.value.cursus }
})))

const monthGroups = computed(() => {
  const groups = []
  let cur = null
  for (const d of dates.value) {
    const ym = d.slice(0, 7)
    if (!cur || cur.ym !== ym) {
      cur = { ym, label: `${monthNames[parseInt(d.slice(5, 7), 10) - 1]} ${d.slice(0, 4)}`, dates: [] }
      groups.push(cur)
    }
    cur.dates.push(d)
  }
  return groups
})

const AT_RISK_RATE = 70

const statsMap = computed(() => {
  const m = {}
  for (const s of students.value) {
    const st = { present: 0, aj: 0, anj: 0, marked: 0, streak: 0, rate: null }
    let streakOpen = true
    for (let i = dates.value.length - 1; i >= 0; i--) {
      const status = s.attendance[dates.value[i]]?.status
      if (!status) continue
      st.marked++
      if (status === 'present') { st.present++; streakOpen = false }
      else {
        if (status === 'absent_justifie') st.aj++
        else st.anj++
        if (streakOpen) st.streak++
      }
    }
    st.abs = st.aj + st.anj
    st.rate = st.marked ? Math.round((st.present / st.marked) * 100) : null
    st.atRisk = (st.rate !== null && st.rate < AT_RISK_RATE) || st.streak >= 2
    m[s.student_id] = st
  }
  return m
})

const classSummary = computed(() => {
  let present = 0, marked = 0, aj = 0, anj = 0, atRisk = 0
  for (const s of students.value) {
    const st = statsMap.value[s.student_id]
    present += st.present; marked += st.marked; aj += st.aj; anj += st.anj
    if (st.atRisk) atRisk++
  }
  return {
    rate: marked ? Math.round((present / marked) * 100) : null,
    aj, anj, abs: aj + anj, atRisk,
    lastDate: dates.value[dates.value.length - 1] || null
  }
})

const rateTone = (r) => r === null ? 'text-gray-300' : r < AT_RISK_RATE ? 'text-red-600' : r < 90 ? 'text-amber-600' : 'text-gray-700'

const query = ref('')
const riskOnly = ref(false)
const sortKey = ref('name')
const normalize = (v) => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const visibleStudents = computed(() => {
  const q = normalize(query.value)
  let list = students.value.filter(s => {
    if (riskOnly.value && !statsMap.value[s.student_id].atRisk) return false
    if (q && !normalize(`${s.last_name} ${s.first_name}`).includes(q) && !normalize(`${s.first_name} ${s.last_name}`).includes(q)) return false
    return true
  })
  if (sortKey.value === 'absences') {
    list = [...list].sort((a, b) => statsMap.value[b.student_id].abs - statsMap.value[a.student_id].abs || statsMap.value[b.student_id].anj - statsMap.value[a.student_id].anj)
  } else if (sortKey.value === 'rate') {
    const r = (s) => statsMap.value[s.student_id].rate ?? 101
    list = [...list].sort((a, b) => r(a) - r(b))
  }
  return list
})

const formatDay = (d) => d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '—'

const selectedStudentId = ref(null)
const selectedStudent = computed(() => students.value.find(s => s.student_id === selectedStudentId.value) || null)
const openStudent = (s) => { hoverTip.value = null; selectedStudentId.value = s.student_id }

const hoverTip = ref(null)
const onCellEnter = (c, ev) => {
  if (c && c.status === 'absent_justifie' && c.justification) {
    const r = ev.currentTarget.getBoundingClientRect()
    hoverTip.value = { text: c.justification, top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 220) }
  } else {
    hoverTip.value = null
  }
}
const onCellLeave = () => { hoverTip.value = null }

const fetchData = async () => {
  try {
    isLoading.value = true
    const data = await suiviService.classroomSuivi(route.params.id)
    classroom.value = data.classroom
    students.value = data.students || []
    dates.value = data.dates || []
  } catch (e) {
    console.error('Erreur suivi classe:', e)
    error.value = 'Impossible de charger le suivi de la classe'
  } finally {
    isLoading.value = false
  }
}

const { setFlashMessage } = useFlashMessage()
const showEditModal = ref(false)
const editClassData = ref(null)
const editLevels = ref([])
const isOpeningEdit = ref(false)

const openEditModal = async () => {
  if (isOpeningEdit.value) return
  isOpeningEdit.value = true
  try {
    const res = await classeService.getClassById(route.params.id)
    const full = res.data
    const cursusRes = await cursusService.getCursusById(full.cursus_id)
    editLevels.value = cursusRes.data?.cursus?.levels || []
    editClassData.value = full
    showEditModal.value = true
  } catch (e) {
    console.error('Erreur chargement classe:', e)
    setFlashMessage({ type: 'error', message: 'Impossible de charger les informations de la classe' })
  } finally {
    isOpeningEdit.value = false
  }
}

const handleUpdateClass = async (updatedClass, callbacks = null) => {
  try {
    const response = await classeService.updateClass(updatedClass.id, {
      name: updatedClass.name,
      cursus_id: editClassData.value.cursus_id,
      level_id: updatedClass.levelId,
      gender: updatedClass.gender,
      size: parseInt(updatedClass.size),
      type: editClassData.value.type,
      years: editClassData.value.years,
      telegram_link: updatedClass.telegram_link,
      main_teacher_id: updatedClass.main_teacher_id || null,
      schedules: updatedClass.schedules || []
    })
    if (response.status === 'success') {
      setFlashMessage({ type: 'success', message: response.message || 'Classe mise à jour' })
      showEditModal.value = false
      editClassData.value = null
      await fetchData()
      callbacks?.resolve?.()
    } else {
      setFlashMessage({ type: 'error', message: response.message || 'Erreur lors de la modification' })
      callbacks?.reject?.(new Error(response.message || 'Erreur lors de la modification'))
    }
  } catch (e) {
    setFlashMessage({ type: 'error', message: e?.response?.data?.message || 'Erreur lors de la modification' })
    callbacks?.reject?.(e)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <PageContainer>
    <BreadCrumb :custom-items="breadcrumbItems" />

    <div v-if="isLoading" class="py-10 text-center text-gray-500 text-xs">Chargement…</div>
    <div v-else-if="error" class="bg-red-50 text-red-700 p-2 rounded">{{ error }}</div>

    <template v-else>
      <div
          v-if="classroom"
          class="bg-white rounded-2xl border border-l-4 px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3"
          :style="{ borderLeftColor: accent }"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 font-montserrat" :style="{ backgroundColor: accent }">
            {{ (classroom.name || '?').slice(0, 2).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <h1 class="text-base font-bold text-default font-montserrat truncate">{{ classroom.name }}</h1>
            <p class="text-xs text-placeholder">{{ classroom.cursus }} · {{ classroom.level }} · {{ classroom.gender }} · {{ students.length }} élève{{ students.length > 1 ? 's' : '' }}</p>
            <div v-if="classroom.schedules?.length" class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-nunito">
              <span v-for="(s, i) in classroom.schedules" :key="i" class="inline-flex items-center gap-1">
                <svg class="w-3 h-3 shrink-0 text-placeholder" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 0114 0H3z"/></svg>
                <span class="font-medium" :class="s.teacher ? 'text-gray-800' : 'text-gray-400 italic'">{{ s.teacher || 'Prof. non assigné' }}</span>
                <span class="text-placeholder">· {{ s.day }} {{ s.start_time }}–{{ s.end_time }}</span>
              </span>
            </div>
          </div>
        </div>
        <button
            type="button"
            @click="openEditModal"
            :disabled="isOpeningEdit"
            class="inline-flex items-center gap-x-1.5 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-50"
        >
          <Edit class="size-3.5"/>
          <span>{{ isOpeningEdit ? 'Chargement…' : 'Modifier' }}</span>
        </button>
      </div>

      <div class="flex items-center gap-1 border-b border-[#E6EFF5] mb-4">
        <button type="button" @click="activeTab = 'attendance'" :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors', activeTab === 'attendance' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']">Émargement</button>
        <button type="button" @click="activeTab = 'planning'" :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors', activeTab === 'planning' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']">Planning</button>
        <button type="button" @click="activeTab = 'decisions'" :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors', activeTab === 'decisions' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']">Décisions</button>
      </div>

      <div v-if="activeTab === 'attendance'">
        <div v-if="students.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">Aucun élève inscrit dans cette classe.</div>
        <div v-else-if="dates.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">
          Aucune séance émargée pour le moment. Les colonnes apparaîtront dès que le professeur aura fait l'appel.
        </div>

        <template v-else>
          <div class="bg-white rounded-2xl border mb-3 grid grid-cols-2 md:grid-cols-4 font-nunito">
            <div class="px-4 py-3 border-b md:border-b-0 border-r border-[#E6EFF5]">
              <div class="text-[11px] uppercase tracking-wide text-placeholder font-montserrat">Assiduité de la classe</div>
              <div :class="['font-montserrat text-xl font-semibold tabular-nums mt-0.5', rateTone(classSummary.rate)]">{{ classSummary.rate !== null ? classSummary.rate + ' %' : '—' }}</div>
              <div class="text-[11px] text-placeholder">présences sur les séances pointées</div>
            </div>
            <div class="px-4 py-3 border-b md:border-b-0 md:border-r border-[#E6EFF5]">
              <div class="text-[11px] uppercase tracking-wide text-placeholder font-montserrat">Séances</div>
              <div class="font-montserrat text-xl font-semibold text-default tabular-nums mt-0.5">{{ dates.length }}</div>
              <div class="text-[11px] text-placeholder">dernière le {{ formatDay(classSummary.lastDate) }}</div>
            </div>
            <div class="px-4 py-3 border-r border-[#E6EFF5]">
              <div class="text-[11px] uppercase tracking-wide text-placeholder font-montserrat">Absences</div>
              <div class="font-montserrat text-xl font-semibold text-default tabular-nums mt-0.5">{{ classSummary.abs }}</div>
              <div class="text-[11px] text-placeholder">
                <span class="text-amber-700">{{ classSummary.aj }} justifiée{{ classSummary.aj > 1 ? 's' : '' }}</span> ·
                <span class="text-red-600">{{ classSummary.anj }} non justifiée{{ classSummary.anj > 1 ? 's' : '' }}</span>
              </div>
            </div>
            <button
                type="button"
                @click="riskOnly = !riskOnly"
                :disabled="!classSummary.atRisk && !riskOnly"
                :class="['px-4 py-3 text-left transition-colors rounded-br-2xl md:rounded-r-2xl md:rounded-bl-none', riskOnly ? 'bg-red-50' : classSummary.atRisk ? 'hover:bg-gray-50' : 'cursor-default']"
            >
              <div class="text-[11px] uppercase tracking-wide text-placeholder font-montserrat">À surveiller</div>
              <div :class="['font-montserrat text-xl font-semibold tabular-nums mt-0.5', classSummary.atRisk ? 'text-red-600' : 'text-gray-300']">{{ classSummary.atRisk }}</div>
              <div class="text-[11px] text-placeholder">{{ riskOnly ? 'filtre actif — cliquer pour tout afficher' : `assiduité < ${AT_RISK_RATE} % ou 2 absences d'affilée` }}</div>
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2 mb-3">
            <div class="relative">
              <svg class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-placeholder pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <input v-model="query" type="text" placeholder="Rechercher un élève…" class="pl-7 pr-2 py-1.5 text-xs border border-input-stroke rounded-lg focus:outline-none focus:border-default w-56" />
            </div>
            <div class="inline-flex rounded-lg border border-input-stroke divide-x divide-input-stroke overflow-hidden">
              <button type="button" @click="riskOnly = false" :class="['px-3 py-1.5 text-xs', !riskOnly ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50']">Tous ({{ students.length }})</button>
              <button type="button" @click="riskOnly = true" :class="['px-3 py-1.5 text-xs', riskOnly ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50']">À surveiller ({{ classSummary.atRisk }})</button>
            </div>
            <div class="relative">
              <select v-model="sortKey" class="pl-2 pr-7 py-1.5 text-xs border border-input-stroke rounded-lg bg-white focus:outline-none focus:border-default">
                <option value="name">Tri : nom</option>
                <option value="absences">Tri : plus d'absences</option>
                <option value="rate">Tri : assiduité la plus faible</option>
              </select>
              <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-placeholder pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
            <span class="ml-auto text-[11px] text-placeholder">Cliquer sur un élève pour voir sa fiche d'assiduité</span>
          </div>

          <div v-if="visibleStudents.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">Aucun élève ne correspond à ces critères.</div>
          <div v-else class="bg-white rounded-2xl border overflow-x-auto font-nunito">
            <table class="text-xs border-collapse min-w-full">
              <thead>
                <tr class="border-b border-[#E6EFF5]">
                  <th rowspan="2" class="sticky left-0 z-10 bg-white text-left font-semibold text-gray-700 px-3 py-2 min-w-[11rem] border-r border-[#E6EFF5] font-montserrat align-bottom">Élève</th>
                  <th v-for="g in monthGroups" :key="g.ym" :colspan="g.dates.length" class="px-2 py-1 text-center text-[10px] uppercase tracking-wide text-placeholder border-l border-[#E6EFF5]">{{ g.label }}</th>
                  <th rowspan="2" class="w-full"></th>
                  <th colspan="3" class="sticky right-0 z-10 bg-white px-2 py-1 text-center text-[10px] uppercase tracking-wide text-placeholder border-l border-[#E6EFF5]">Bilan</th>
                </tr>
                <tr class="border-b border-[#E6EFF5]">
                  <template v-for="g in monthGroups" :key="g.ym">
                    <th v-for="(d, i) in g.dates" :key="d" :class="['px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap', i === 0 ? 'border-l border-[#E6EFF5]' : '']">{{ d.slice(8, 10) }}/{{ d.slice(5, 7) }}</th>
                  </template>
                  <th class="sticky right-[6.5rem] z-10 bg-white w-12 min-w-[3rem] px-1 py-1.5 text-center font-semibold text-amber-700 border-l border-[#E6EFF5] font-montserrat">Just.</th>
                  <th class="sticky right-[3.5rem] z-10 bg-white w-12 min-w-[3rem] px-1 py-1.5 text-center font-semibold text-red-600 font-montserrat">Non j.</th>
                  <th class="sticky right-0 z-10 bg-white w-14 min-w-[3.5rem] px-1 py-1.5 text-center font-semibold text-gray-700 font-montserrat">Taux</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in visibleStudents" :key="s.student_id" @click="openStudent(s)" class="group border-b border-[#E6EFF5] last:border-b-0 cursor-pointer">
                  <td class="sticky left-0 z-10 bg-white group-hover:bg-gray-50 px-3 py-1.5 border-r border-[#E6EFF5] whitespace-nowrap font-montserrat">
                    <span class="inline-flex items-center gap-1.5">
                      <span class="font-medium text-gray-900 group-hover:underline underline-offset-2">{{ s.last_name }} {{ s.first_name }}</span>
                      <span v-if="statsMap[s.student_id].atRisk" class="h-1.5 w-1.5 rounded-full bg-red-500" aria-label="À surveiller"></span>
                    </span>
                  </td>
                  <template v-for="g in monthGroups" :key="g.ym">
                    <td v-for="(d, i) in g.dates" :key="d" :class="['px-2 py-1.5 text-center group-hover:bg-gray-50', i === 0 ? 'border-l border-[#E6EFF5]' : '']">
                      <span
                          v-if="s.attendance[d]"
                          :class="['relative inline-flex items-center justify-center w-5 h-5 rounded border text-[11px] font-bold', attMeta[s.attendance[d].status]?.cls]"
                          @mouseenter="onCellEnter(s.attendance[d], $event)"
                          @mouseleave="onCellLeave"
                      >
                        {{ attMeta[s.attendance[d].status]?.glyph }}
                        <span v-if="s.attendance[d].status === 'absent_justifie' && s.attendance[d].justification" class="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      </span>
                      <span v-else class="text-gray-300">–</span>
                    </td>
                  </template>
                  <td class="group-hover:bg-gray-50"></td>
                  <td class="sticky right-[6.5rem] z-10 bg-white group-hover:bg-gray-50 px-1 py-1.5 text-center tabular-nums border-l border-[#E6EFF5]" :class="statsMap[s.student_id].aj ? 'text-amber-700 font-semibold' : 'text-gray-300'">{{ statsMap[s.student_id].aj }}</td>
                  <td class="sticky right-[3.5rem] z-10 bg-white group-hover:bg-gray-50 px-1 py-1.5 text-center tabular-nums" :class="statsMap[s.student_id].anj ? 'text-red-600 font-semibold' : 'text-gray-300'">{{ statsMap[s.student_id].anj }}</td>
                  <td class="sticky right-0 z-10 bg-white group-hover:bg-gray-50 px-1 py-1.5 text-center tabular-nums font-semibold" :class="rateTone(statsMap[s.student_id].rate)">{{ statsMap[s.student_id].rate !== null ? statsMap[s.student_id].rate + '%' : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[11px] text-placeholder">
            <span v-for="(m, k) in attMeta" :key="k" class="inline-flex items-center gap-1.5">
              <span :class="['inline-flex items-center justify-center w-4 h-4 rounded border text-[10px] font-bold', m.cls]">{{ m.glyph }}</span>
              {{ m.label }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="inline-flex items-center justify-center w-4 h-4 rounded border border-gray-200 text-[10px] text-gray-300">–</span>
              Non pointé
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              Motif renseigné (survol pour le lire)
            </span>
          </div>
        </template>
      </div>

      <div v-else-if="activeTab === 'planning'">
        <div v-if="gridSchedules.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">Aucun créneau n'est défini pour cette classe.</div>
        <ScheduleGrid v-else :schedules="gridSchedules" />
      </div>

      <div v-else-if="activeTab === 'decisions'">
        <div class="mb-3 text-xs text-placeholder">Décisions de fin d'année · {{ decidedCount }}/{{ students.length }} décidés</div>
        <div v-if="students.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">Aucun élève inscrit dans cette classe.</div>
        <div v-else class="bg-white rounded-2xl border overflow-x-auto font-nunito">
          <table class="text-xs border-collapse w-full">
            <thead>
              <tr class="border-b border-[#E6EFF5]">
                <th class="sticky left-0 z-10 bg-white text-left font-semibold text-gray-700 px-3 py-2 min-w-[11rem] border-r border-[#E6EFF5] font-montserrat">Élève</th>
                <th class="px-3 py-2 text-left font-semibold text-gray-700 w-48">Décision</th>
                <th class="px-3 py-2 text-left font-semibold text-gray-700 border-l border-[#E6EFF5]">Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in students" :key="s.student_id" class="border-b border-[#E6EFF5] last:border-b-0 hover:bg-gray-50 align-top">
                <td class="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-900 border-r border-[#E6EFF5] whitespace-nowrap font-montserrat">{{ s.last_name }} {{ s.first_name }}</td>
                <td class="px-3 py-2">
                  <span v-if="s.outcome && outcomeMeta[s.outcome]" :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium', outcomeMeta[s.outcome].chip]">
                    <span class="h-1.5 w-1.5 rounded-full" :class="outcomeMeta[s.outcome].dot"></span>{{ outcomeMeta[s.outcome].label }}
                  </span>
                  <span v-else class="text-gray-300 text-[11px] italic">Non décidé</span>
                </td>
                <td class="px-3 py-2 border-l border-[#E6EFF5] text-gray-700">
                  <span v-if="s.commentaire">{{ s.commentaire }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div
        v-if="hoverTip"
        class="fixed z-40 bg-white border border-amber-200 rounded-lg shadow-md px-2.5 py-1.5 text-[11px] text-amber-800 max-w-[14rem] font-nunito pointer-events-none"
        :style="{ top: hoverTip.top + 'px', left: hoverTip.left + 'px' }"
    >
      <span class="font-semibold">Motif :</span> {{ hoverTip.text }}
    </div>

    <StudentAttendancePanel
        v-if="selectedStudent"
        :student="selectedStudent"
        :dates="dates"
        :classroom-name="classroom?.name || ''"
        @close="selectedStudentId = null"
    />

    <UpdateClassModal
        :is-open="showEditModal"
        :cursus-name="editClassData?.cursus || ''"
        :levels="editLevels"
        :class-data="editClassData"
        @close="showEditModal = false"
        @update="handleUpdateClass"
    />
  </PageContainer>
</template>
