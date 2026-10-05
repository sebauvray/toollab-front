<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  student: { type: Object, required: true },
  dates: { type: Array, required: true },
  classroomName: { type: String, default: '' }
})
const emit = defineEmits(['close'])

const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const dayNames = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

const statusMeta = {
  present: { label: 'Présent', chip: 'bg-green-50 text-green-700 ring-green-200', dot: 'bg-green-500' },
  absent_justifie: { label: 'Absence justifiée', chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  absent_non_justifie: { label: 'Absence non justifiée', chip: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' }
}

const outcomeMeta = {
  passage: { label: 'Passage', chip: 'bg-green-50 text-green-700 ring-green-200', dot: 'bg-green-500' },
  redoublement: { label: 'Redoublement', chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  fin_cursus: { label: 'Fin de cursus', chip: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  exclusion: { label: 'Exclusion', chip: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' }
}

const parseDate = (d) => {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day)
}
const formatShort = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
const formatLong = (d) => {
  const dt = parseDate(d)
  return `${dayNames[dt.getDay()]} ${dt.getDate()} ${monthNames[dt.getMonth()]}`
}

const att = computed(() => props.student.attendance || {})

const counts = computed(() => {
  const c = { present: 0, absent_justifie: 0, absent_non_justifie: 0, unmarked: 0 }
  for (const d of props.dates) {
    const s = att.value[d]?.status
    if (s && c[s] !== undefined) c[s]++
    else c.unmarked++
  }
  return c
})
const absences = computed(() => counts.value.absent_justifie + counts.value.absent_non_justifie)
const marked = computed(() => counts.value.present + absences.value)
const rate = computed(() => (marked.value ? Math.round((counts.value.present / marked.value) * 100) : null))

const rateClass = computed(() => {
  if (rate.value === null) return 'text-gray-300'
  if (rate.value < 70) return 'text-red-600'
  if (rate.value < 90) return 'text-amber-600'
  return 'text-green-700'
})

const currentStreak = computed(() => {
  let n = 0
  for (let i = props.dates.length - 1; i >= 0; i--) {
    const s = att.value[props.dates[i]]?.status
    if (!s) continue
    if (s === 'present') break
    n++
  }
  return n
})

const absenceHistory = computed(() => props.dates
  .filter(d => att.value[d] && att.value[d].status !== 'present')
  .map(d => ({ date: d, ...att.value[d] }))
  .reverse())

const lastAbsence = computed(() => absenceHistory.value[0]?.date || null)

const months = computed(() => {
  const groups = []
  let cur = null
  for (const d of props.dates) {
    const ym = d.slice(0, 7)
    if (!cur || cur.ym !== ym) {
      cur = { ym, label: `${monthNames[parseInt(d.slice(5, 7), 10) - 1]} ${d.slice(0, 4)}`, present: 0, aj: 0, anj: 0, total: 0 }
      groups.push(cur)
    }
    cur.total++
    const s = att.value[d]?.status
    if (s === 'present') cur.present++
    else if (s === 'absent_justifie') cur.aj++
    else if (s === 'absent_non_justifie') cur.anj++
  }
  return groups
})

const pct = (n, total) => (total ? (n / total) * 100 : 0)

const age = computed(() => {
  const b = props.student.birthdate
  if (!b) return null
  const birth = parseDate(b)
  if (isNaN(birth)) return null
  const now = new Date()
  let a = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) a--
  return a >= 0 ? a : null
})

const identityLine = computed(() => {
  const parts = []
  if (age.value !== null) parts.push(`${age.value} ans`)
  if (props.student.gender === 'M') parts.push('Garçon')
  else if (props.student.gender === 'F') parts.push('Fille')
  if (props.classroomName) parts.push(props.classroomName)
  return parts.join(' · ')
})

const initials = computed(() => `${(props.student.first_name || '').charAt(0)}${(props.student.last_name || '').charAt(0)}`.toUpperCase() || '?')

const onKey = (e) => { if (e.key === 'Escape') emit('close') }
onMounted(() => { if (process.client) window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { if (process.client) window.removeEventListener('keydown', onKey) })
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end">
    <div class="absolute inset-0 bg-black/20" @click="emit('close')"></div>

    <aside class="panel-slide relative h-full w-full max-w-md bg-white border-l shadow-xl flex flex-col font-nunito">
      <header class="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E6EFF5]">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold font-montserrat shrink-0">{{ initials }}</div>
          <div class="min-w-0">
            <h2 class="text-sm font-bold text-default font-montserrat truncate">{{ student.last_name?.toUpperCase() }} {{ student.first_name }}</h2>
            <p v-if="identityLine" class="text-xs text-placeholder truncate">{{ identityLine }}</p>
          </div>
        </div>
        <button type="button" @click="emit('close')" title="Fermer" class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:text-default hover:bg-gray-100 shrink-0">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div class="flex-1 overflow-y-auto">
        <section class="px-5 py-4 border-b border-[#E6EFF5]">
          <div class="flex items-end justify-between gap-3">
            <div>
              <div class="text-[11px] uppercase tracking-wide text-placeholder font-montserrat">Assiduité</div>
              <div :class="['font-montserrat text-xl font-semibold tabular-nums', rateClass]">{{ rate !== null ? rate + ' %' : '—' }}</div>
            </div>
            <div class="text-[11px] text-placeholder text-right">
              {{ marked }} séance{{ marked > 1 ? 's' : '' }} pointée{{ marked > 1 ? 's' : '' }} sur {{ dates.length }}
            </div>
          </div>
          <div v-if="dates.length" class="h-2 w-full rounded-full bg-gray-100 overflow-hidden flex mt-2">
            <div class="bg-green-500" :style="{ width: pct(counts.present, dates.length) + '%' }"></div>
            <div class="bg-amber-400" :style="{ width: pct(counts.absent_justifie, dates.length) + '%' }"></div>
            <div class="bg-red-500" :style="{ width: pct(counts.absent_non_justifie, dates.length) + '%' }"></div>
          </div>

          <div class="grid grid-cols-3 divide-x divide-[#E6EFF5] mt-3">
            <div class="pr-3">
              <div class="text-base font-semibold text-gray-900 tabular-nums">{{ counts.present }}</div>
              <div class="text-[11px] text-placeholder inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>Présences</div>
            </div>
            <div class="px-3">
              <div class="text-base font-semibold text-gray-900 tabular-nums">{{ counts.absent_justifie }}</div>
              <div class="text-[11px] text-placeholder inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>Justifiées</div>
            </div>
            <div class="pl-3">
              <div class="text-base font-semibold tabular-nums" :class="counts.absent_non_justifie ? 'text-red-600' : 'text-gray-900'">{{ counts.absent_non_justifie }}</div>
              <div class="text-[11px] text-placeholder inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>Non justifiées</div>
            </div>
          </div>

          <div v-if="currentStreak >= 2" class="mt-3 bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs">
            Absent{{ student.gender === 'F' ? 'e' : '' }} aux {{ currentStreak }} dernières séances pointées.
          </div>
          <div v-else-if="lastAbsence" class="mt-3 text-xs text-placeholder">
            Dernière absence : <span class="text-gray-800 font-medium">{{ formatLong(lastAbsence) }}</span>
          </div>
          <div v-else-if="marked" class="mt-3 text-xs text-green-700">Aucune absence cette année.</div>
        </section>

        <section v-if="months.length" class="px-5 py-4 border-b border-[#E6EFF5]">
          <h3 class="text-[11px] uppercase tracking-wide text-placeholder font-montserrat mb-2">Par mois</h3>
          <div class="space-y-2">
            <div v-for="m in months" :key="m.ym" class="flex items-center gap-3 text-xs">
              <span class="w-28 shrink-0 text-gray-700 capitalize">{{ m.label }}</span>
              <div class="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden flex">
                <div class="bg-green-500" :style="{ width: pct(m.present, m.total) + '%' }"></div>
                <div class="bg-amber-400" :style="{ width: pct(m.aj, m.total) + '%' }"></div>
                <div class="bg-red-500" :style="{ width: pct(m.anj, m.total) + '%' }"></div>
              </div>
              <span class="w-24 shrink-0 text-right tabular-nums text-placeholder">
                <span class="text-gray-800 font-medium">{{ m.present }}</span>/{{ m.total }}
                <span v-if="m.aj + m.anj" class="text-red-600"> · {{ m.aj + m.anj }} abs.</span>
              </span>
            </div>
          </div>
        </section>

        <section class="px-5 py-4 border-b border-[#E6EFF5]">
          <h3 class="text-[11px] uppercase tracking-wide text-placeholder font-montserrat mb-2">
            Absences <span v-if="absences" class="normal-case tracking-normal text-gray-500">({{ absences }})</span>
          </h3>
          <p v-if="!absenceHistory.length" class="text-xs text-placeholder">Aucune absence enregistrée.</p>
          <ul v-else class="divide-y divide-[#E6EFF5]">
            <li v-for="a in absenceHistory" :key="a.date" class="py-2 flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-xs font-medium text-gray-900">{{ formatLong(a.date) }}</div>
                <div v-if="a.justification" class="text-xs text-gray-600 mt-0.5 break-words">{{ a.justification }}</div>
                <div v-else-if="a.status === 'absent_justifie'" class="text-[11px] text-gray-400 italic mt-0.5">Motif non renseigné</div>
              </div>
              <span :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 shrink-0', statusMeta[a.status].chip]">
                <span class="h-1.5 w-1.5 rounded-full" :class="statusMeta[a.status].dot"></span>{{ a.status === 'absent_justifie' ? 'Justifiée' : 'Non justifiée' }}
              </span>
            </li>
          </ul>
        </section>

        <section v-if="student.outcome && outcomeMeta[student.outcome]" class="px-5 py-4 border-b border-[#E6EFF5]">
          <h3 class="text-[11px] uppercase tracking-wide text-placeholder font-montserrat mb-2">Décision de fin d'année</h3>
          <span :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ring-1', outcomeMeta[student.outcome].chip]">
            <span class="h-1.5 w-1.5 rounded-full" :class="outcomeMeta[student.outcome].dot"></span>{{ outcomeMeta[student.outcome].label }}
          </span>
          <p v-if="student.commentaire" class="text-xs text-gray-700 mt-1.5">{{ student.commentaire }}</p>
        </section>

        <section class="px-5 py-4">
          <h3 class="text-[11px] uppercase tracking-wide text-placeholder font-montserrat mb-2">Famille</h3>
          <p v-if="!student.responsibles?.length" class="text-xs text-placeholder">Aucun responsable renseigné.</p>
          <ul v-else class="divide-y divide-[#E6EFF5]">
            <li v-for="(r, i) in student.responsibles" :key="i" class="py-2">
              <div class="text-xs font-medium text-gray-900">{{ r.name }}</div>
              <div class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                <a v-if="r.phone" :href="`tel:${r.phone}`" class="text-blue-link hover:underline tabular-nums">{{ r.phone }}</a>
                <a v-if="r.email" :href="`mailto:${r.email}`" class="text-blue-link hover:underline truncate">{{ r.email }}</a>
              </div>
            </li>
          </ul>
          <p v-if="student.enrollment_date" class="text-[11px] text-placeholder mt-2">Inscrit{{ student.gender === 'F' ? 'e' : '' }} dans la classe le {{ formatShort(student.enrollment_date) }}</p>
        </section>
      </div>

      <footer v-if="student.family_id" class="px-5 py-3 border-t border-[#E6EFF5]">
        <NuxtLink :to="`/family/${student.family_id}`" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
          Ouvrir la fiche famille
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.panel-slide { animation: panel-slide 200ms ease-out; }
@keyframes panel-slide {
  from { transform: translateX(16px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .panel-slide { animation: none; }
}
</style>
