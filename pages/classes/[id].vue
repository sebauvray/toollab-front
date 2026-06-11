<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#imports'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import UpdateClassModal from '~/components/modals/UpdateClassModal.vue'
import Edit from '~/components/Icons/Edit.vue'
import { usePageTitle } from '~/composables/usePageTitle.js'
import suiviService from '~/services/suivi'
import classeService from '~/services/classe'
import cursusService from '~/services/cursus'

definePageMeta({
  layout: 'auth',
  middleware: 'admin-director',
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

const ratesMap = computed(() => {
  const m = {}
  for (const s of students.value) {
    let marked = 0, present = 0
    for (const d of dates.value) {
      const c = s.attendance[d]
      if (c) { marked++; if (c.status === 'present') present++ }
    }
    m[s.student_id] = marked ? Math.round((present / marked) * 100) : null
  }
  return m
})

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

const handleUpdateClass = async (updatedClass) => {
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
    } else {
      setFlashMessage({ type: 'error', message: response.message || 'Erreur lors de la modification' })
    }
  } catch (e) {
    setFlashMessage({ type: 'error', message: e?.response?.data?.message || 'Erreur lors de la modification' })
  }
}

onMounted(() => {
  if (route.query.tab === 'decisions') activeTab.value = 'decisions'
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
        <button type="button" @click="activeTab = 'decisions'" :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors', activeTab === 'decisions' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']">Décisions</button>
      </div>

      <div v-if="activeTab === 'attendance'">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 text-xs">
          <span class="text-placeholder">Légende :</span>
          <span v-for="(m, k) in attMeta" :key="k" class="inline-flex items-center gap-1.5">
            <span :class="['inline-flex items-center justify-center w-5 h-5 rounded border text-[11px] font-bold', m.cls]">{{ m.glyph }}</span>
            {{ m.label }}
          </span>
          <span class="inline-flex items-center gap-1.5 text-gray-400">
            <span class="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-200 text-[11px]">–</span>
            Non pointé
          </span>
          <span class="inline-flex items-center gap-1.5 text-gray-400">
            <span class="relative inline-flex items-center justify-center w-5 h-5 rounded border border-amber-300 bg-amber-100 text-[11px] font-bold text-amber-700">J<span class="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-500"></span></span>
            Motif renseigné (survol = détail)
          </span>
        </div>

        <div v-if="students.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">Aucun élève inscrit dans cette classe.</div>
        <div v-else-if="dates.length === 0" class="bg-white rounded-2xl border py-10 text-center text-xs text-placeholder">
          Aucune séance émargée pour le moment. Les colonnes apparaîtront dès que le professeur aura fait l'appel.
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
              <tr v-for="s in students" :key="s.student_id" class="border-b border-[#E6EFF5] hover:bg-gray-50">
                <td class="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-900 border-r border-[#E6EFF5] whitespace-nowrap font-montserrat">{{ s.last_name }} {{ s.first_name }}</td>
                <template v-for="g in monthGroups" :key="g.ym">
                  <td v-for="(d, i) in g.dates" :key="d" :class="['px-2 py-1.5 text-center', i === 0 ? 'border-l border-[#E6EFF5]' : '']">
                    <span
                        v-if="s.attendance[d]"
                        :class="['relative inline-flex items-center justify-center w-5 h-5 rounded border text-[11px] font-bold', attMeta[s.attendance[d].status]?.cls, s.attendance[d].status === 'absent_justifie' && s.attendance[d].justification ? 'cursor-help' : 'cursor-default']"
                        @mouseenter="onCellEnter(s.attendance[d], $event)"
                        @mouseleave="onCellLeave"
                    >
                      {{ attMeta[s.attendance[d].status]?.glyph }}
                      <span v-if="s.attendance[d].status === 'absent_justifie' && s.attendance[d].justification" class="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    </span>
                    <span v-else class="text-gray-300">–</span>
                  </td>
                </template>
                <td class="px-2 py-1.5 text-center border-l border-[#E6EFF5] font-semibold" :class="ratesMap[s.student_id] === null ? 'text-gray-300' : ratesMap[s.student_id] < 70 ? 'text-amber-600' : 'text-gray-700'">{{ ratesMap[s.student_id] !== null ? ratesMap[s.student_id] + '%' : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
