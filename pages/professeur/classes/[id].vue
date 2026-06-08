<script setup>
import {ref, computed, onMounted} from 'vue'
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

const DAY_TO_WEEKDAY = {Dimanche: 0, Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6}
const schedules = ref([])
const selectedScheduleId = ref(null)
const attendanceDate = ref('')
const attendance = ref([])
const attendanceLoaded = ref(false)
const isLoadingAttendance = ref(false)
const isSavingAttendance = ref(false)
const attendanceEditable = computed(() => !yearClosed.value)
const allPresent = computed(() => attendance.value.length > 0 && attendance.value.every(r => r.status === 'present'))
const attendanceStatuses = [
  {value: 'present', btn: 'Présent', label: 'Présent', active: 'bg-green-600 border-green-600 text-white', ring: 'ring-green-500/60', text: 'text-green-600'},
  {value: 'absent_justifie', btn: 'Justifié', label: 'Absent justifié', active: 'bg-amber-500 border-amber-500 text-white', ring: 'ring-amber-500/60', text: 'text-amber-600'},
  {value: 'absent_non_justifie', btn: 'Non justifié', label: 'Absent non justifié', active: 'bg-red-600 border-red-600 text-white', ring: 'ring-red-500/60', text: 'text-red-600'}
]
const statusOf = (v) => attendanceStatuses.find(s => s.value === v)
const initialsOf = (r) => ((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase()
const attendanceSummary = computed(() => {
  const s = {present: 0, absent_justifie: 0, absent_non_justifie: 0, unmarked: 0}
  attendance.value.forEach(r => r.status ? s[r.status]++ : s.unmarked++)
  return s
})
const selectedSchedule = computed(() => schedules.value.find(s => s.id === selectedScheduleId.value) || null)

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

const toDateStr = (d) => {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const parseDate = (str) => {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const nearestSessionDate = (weekday) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const diff = (d.getDay() - weekday + 7) % 7
  d.setDate(d.getDate() - diff)
  return toDateStr(d)
}

const sessionLabel = computed(() => {
  if (!attendanceDate.value) return ''
  const s = parseDate(attendanceDate.value).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})
  return s.charAt(0).toUpperCase() + s.slice(1)
})

const canGoNextSession = computed(() => {
  if (!attendanceDate.value) return false
  const next = parseDate(attendanceDate.value)
  next.setDate(next.getDate() + 7)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return next <= today
})

const ringOf = (status) => statusOf(status)?.ring || 'ring-transparent'

const fetchData = async () => {
  try {
    isLoading.value = true
    const response = await teacherService.classroomStudents(route.params.id)
    if (response.status === 'success') {
      classroom.value = response.data.classroom
      students.value = response.data.students.map(s => ({
        ...s,
        outcome: s.outcome || '',
        commentaire: s.commentaire || ''
      }))
      outcomesOpen.value = response.data.outcomes_open
      yearClosed.value = response.data.year_closed
      schedules.value = response.data.schedules || []
      if (schedules.value.length > 0) {
        selectedScheduleId.value = schedules.value[0].id
        attendanceDate.value = nearestSessionDate(DAY_TO_WEEKDAY[schedules.value[0].day] ?? 1)
      }
    }
  } catch (e) {
    console.error('Erreur récupération élèves:', e)
    error.value = 'Impossible de charger les élèves'
  } finally {
    isLoading.value = false
  }
}

const loadAttendance = async () => {
  if (!attendanceDate.value) return
  try {
    isLoadingAttendance.value = true
    const res = await teacherService.classroomAttendance(route.params.id, attendanceDate.value)
    if (res.status === 'success') {
      yearClosed.value = res.data.year_closed
      attendance.value = res.data.students.map(s => ({
        student_id: s.student_id,
        first_name: s.first_name,
        last_name: s.last_name,
        status: s.status || '',
        justification: s.justification || ''
      }))
      attendanceLoaded.value = true
    }
  } catch (e) {
    console.error('Erreur émargement:', e)
    setFlashMessage({type: 'error', message: 'Impossible de charger l\'émargement'})
  } finally {
    isLoadingAttendance.value = false
  }
}

const selectTab = (key) => {
  activeTab.value = key
  if (key === 'attendance' && !attendanceLoaded.value && schedules.value.length > 0) loadAttendance()
}

const selectCourse = (id) => {
  selectedScheduleId.value = id
  const sched = schedules.value.find(s => s.id === id)
  if (sched) {
    attendanceDate.value = nearestSessionDate(DAY_TO_WEEKDAY[sched.day] ?? 1)
    loadAttendance()
  }
}

const changeSession = (delta) => {
  const d = parseDate(attendanceDate.value)
  d.setDate(d.getDate() + delta * 7)
  attendanceDate.value = toDateStr(d)
  loadAttendance()
}

const setStatus = (row, status) => {
  if (!attendanceEditable.value) return
  row.status = status
  if (status !== 'absent_justifie') row.justification = ''
}

const toggleAllPresent = () => {
  if (!attendanceEditable.value) return
  const target = allPresent.value ? '' : 'present'
  attendance.value.forEach(r => {
    r.status = target
    r.justification = ''
  })
}

const saveAttendance = async () => {
  if (!attendanceEditable.value) return
  const records = attendance.value
      .filter(r => r.status)
      .map(r => ({
        student_id: r.student_id,
        status: r.status,
        justification: r.status === 'absent_justifie' ? (r.justification || null) : null
      }))

  if (records.length === 0) {
    setFlashMessage({type: 'error', message: 'Aucune présence saisie'})
    return
  }

  try {
    isSavingAttendance.value = true
    await teacherService.saveAttendance(route.params.id, attendanceDate.value, records)
    setFlashMessage({type: 'success', message: 'Émargement enregistré'})
  } catch (e) {
    setFlashMessage({type: 'error', message: e.response?.data?.message || 'Erreur lors de l\'enregistrement'})
  } finally {
    isSavingAttendance.value = false
  }
}

const handleSaveOutcomes = async () => {
  if (!canEditOutcomes.value) return

  const decisions = students.value
      .filter(s => s.outcome)
      .map(s => ({
        student_id: s.student_id,
        outcome: s.outcome,
        commentaire: s.commentaire || null
      }))

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
            :class="[
              'px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors',
              activeTab === t.key ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default'
            ]"
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
          <li v-if="students.length === 0" class="px-3 py-6 text-center text-xs text-gray-500">
            Aucun élève inscrit dans cette classe.
          </li>
        </ul>
      </div>

      <div v-else-if="activeTab === 'attendance'">
        <div v-if="schedules.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">
          Aucun créneau n'est défini pour cette classe.
        </div>

        <div v-else class="bg-white rounded-2xl border font-nunito overflow-hidden">
          <div class="border-b border-[#E6EFF5] px-4 py-3 font-montserrat">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex items-stretch gap-2.5 min-w-0">
                <span class="w-1 bg-primary rounded-r shrink-0"></span>
                <div class="min-w-0">
                  <div v-if="schedules.length > 1" class="flex flex-wrap gap-1 mb-1">
                    <button
                        v-for="sc in schedules"
                        :key="sc.id"
                        type="button"
                        @click="selectCourse(sc.id)"
                        :class="[
                          'px-2 py-0.5 rounded text-xs transition-colors',
                          selectedScheduleId === sc.id ? 'bg-primary/10 text-primary font-semibold' : 'text-placeholder hover:text-default'
                        ]"
                    >
                      {{ sc.day }} {{ sc.start_time }}–{{ sc.end_time }}
                    </button>
                  </div>
                  <p v-else-if="selectedSchedule" class="text-xs text-placeholder mb-0.5">
                    {{ selectedSchedule.day }} · {{ selectedSchedule.start_time }}–{{ selectedSchedule.end_time }}
                  </p>
                  <div class="flex items-center gap-2">
                    <button type="button" @click="changeSession(-1)" class="text-base leading-none text-placeholder hover:text-default" aria-label="Séance précédente">‹</button>
                    <span class="text-sm font-semibold text-default">{{ sessionLabel }}</span>
                    <button type="button" @click="changeSession(1)" :disabled="!canGoNextSession" class="text-base leading-none text-placeholder hover:text-default disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Séance suivante">›</button>
                  </div>
                </div>
              </div>
              <div v-if="attendanceEditable" class="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    @click="toggleAllPresent"
                    :aria-pressed="allPresent"
                    :class="[
                      'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 active:scale-95 inline-flex items-center gap-1.5',
                      allPresent ? 'bg-green-600 border-green-600 text-white' : 'border-default text-default hover:bg-gray-50'
                    ]"
                >
                  <svg v-if="allPresent" class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  Tout présent
                </button>
                <button
                    type="button"
                    @click="saveAttendance"
                    :disabled="isSavingAttendance"
                    class="px-4 py-1.5 rounded-lg bg-default text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {{ isSavingAttendance ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-xs">
              <span class="inline-flex items-center gap-1.5 text-green-600"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>{{ attendanceSummary.present }} présent{{ attendanceSummary.present > 1 ? 's' : '' }}</span>
              <span class="inline-flex items-center gap-1.5 text-amber-600"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{{ attendanceSummary.absent_justifie }} justifié{{ attendanceSummary.absent_justifie > 1 ? 's' : '' }}</span>
              <span class="inline-flex items-center gap-1.5 text-red-600"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>{{ attendanceSummary.absent_non_justifie }} non justifié{{ attendanceSummary.absent_non_justifie > 1 ? 's' : '' }}</span>
              <span v-if="attendanceSummary.unmarked" class="inline-flex items-center gap-1.5 text-placeholder"><span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>{{ attendanceSummary.unmarked }} non pointé{{ attendanceSummary.unmarked > 1 ? 's' : '' }}</span>
            </div>
          </div>

          <div v-if="!attendanceEditable" class="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-xs flex items-center gap-1.5">
            <svg class="size-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Année clôturée — émargement en lecture seule.
          </div>

          <div v-if="isLoadingAttendance" class="py-10 text-center text-xs text-placeholder">Chargement…</div>

          <template v-else>
            <div
                v-for="(r, i) in attendance"
                :key="r.student_id"
                :class="i < attendance.length - 1 ? 'border-b border-[#E6EFF5]' : ''"
            >
              <div class="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors">
                <div
                    class="size-8 rounded-full bg-primary text-white text-[11px] font-semibold inline-flex items-center justify-center shrink-0 ring-2 ring-offset-1"
                    :class="r.status ? ringOf(r.status) : 'ring-transparent'"
                >
                  {{ initialsOf(r) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-semibold text-gray-900 truncate font-montserrat">{{ r.last_name }} {{ r.first_name }}</div>
                  <div class="text-xs" :class="r.status ? statusOf(r.status).text : 'text-placeholder'">
                    {{ r.status ? statusOf(r.status).label : 'Non pointé' }}
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                      v-for="st in attendanceStatuses"
                      :key="st.value"
                      type="button"
                      @click="setStatus(r, st.value)"
                      :disabled="!attendanceEditable"
                      :aria-pressed="r.status === st.value"
                      :title="st.label"
                      :class="[
                        'px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-150 active:scale-95',
                        r.status === st.value ? st.active : 'border-input-stroke text-gray-500 hover:border-gray-400 hover:text-default',
                        !attendanceEditable ? 'cursor-not-allowed opacity-60' : ''
                      ]"
                  >
                    {{ st.btn }}
                  </button>
                </div>
              </div>
              <div v-if="r.status === 'absent_justifie'" class="pl-14 pr-4 pb-2">
                <input
                    v-model="r.justification"
                    :disabled="!attendanceEditable"
                    type="text"
                    placeholder="Motif / justificatif (optionnel)"
                    class="w-full border border-input-stroke rounded-lg px-2 py-1.5 text-sm focus:border-default focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
            <div v-if="attendance.length === 0" class="px-4 py-8 text-center text-xs text-placeholder">
              Aucun élève inscrit dans cette classe.
            </div>
          </template>
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
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0',
                decisionsCount === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:opacity-90 shadow-sm hover:shadow-md'
              ]"
          >
            <span v-if="decisionsCount > 0" class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded-full bg-white/25 text-xs font-bold">{{ decisionsCount }}</span>
            {{ isSavingOutcomes ? 'Enregistrement…' : decisionsCount === 0 ? 'Aucune décision saisie' : `Enregistrer ${decisionsCount > 1 ? 'les décisions' : 'la décision'}` }}
          </button>
        </div>

        <div v-if="yearClosed" class="mb-3 px-2 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs">
          Année clôturée — lecture seule
        </div>

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
                      :class="[
                        'inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium cursor-pointer transition-colors',
                        s.outcome === opt.value ? opt.selectedClass : opt.idleClass
                      ]"
                  >
                    <input type="radio" :name="`outcome-${s.student_id}`" :value="opt.value" v-model="s.outcome" class="hidden" />
                    {{ opt.label }}
                  </label>
                </div>
                <span
                    v-else-if="s.outcome"
                    :class="['inline-flex items-center px-2 py-1 rounded border text-xs font-medium', outcomeOptions.find(o => o.value === s.outcome)?.selectedClass]"
                >
                  {{ outcomeOptions.find(o => o.value === s.outcome)?.label }}
                </span>
                <span v-else class="text-xs text-gray-400">Aucune décision</span>
              </td>
              <td class="px-3 py-1.5">
                <input
                    v-if="canEditOutcomes"
                    v-model="s.commentaire"
                    type="text"
                    placeholder="Optionnel"
                    class="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-primary"
                />
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
  </PageContainer>
</template>
