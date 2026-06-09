<script setup>
import {computed} from 'vue'

const props = defineProps({
  schedules: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select'])

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const START_HOUR = 8
const END_HOUR = 22
const QUARTER_PX = 14

const GENDER_COLORS = {
  Hommes: '#93C5FD',
  Femmes: '#FDA4AF',
  Enfants: '#FCD34D',
  Mixte: '#86EFAC'
}

const hours = computed(() => {
  const out = []
  for (let h = START_HOUR; h <= END_HOUR; h++) out.push(h)
  return out
})

const totalHeight = computed(() => (END_HOUR - START_HOUR) * 4 * QUARTER_PX)

const toMinutes = (t) => {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const layoutDay = (items) => {
  const events = items
      .map(s => ({
        ...s,
        startMin: toMinutes(s.start_time),
        endMin: toMinutes(s.end_time),
        col: 0,
        cols: 1
      }))
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  let i = 0
  while (i < events.length) {
    let clusterEnd = events[i].endMin
    let j = i + 1
    while (j < events.length && events[j].startMin < clusterEnd) {
      clusterEnd = Math.max(clusterEnd, events[j].endMin)
      j++
    }
    const cluster = events.slice(i, j)
    const colEnds = []
    for (const ev of cluster) {
      let assigned = -1
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= ev.startMin) {
          assigned = c
          break
        }
      }
      if (assigned === -1) {
        assigned = colEnds.length
        colEnds.push(ev.endMin)
      } else {
        colEnds[assigned] = ev.endMin
      }
      ev.col = assigned
    }
    const totalCols = colEnds.length
    for (const ev of cluster) ev.cols = totalCols
    i = j
  }

  const BLOCK_GAP_PX = 2

  return events.map(ev => {
    const top = ((ev.startMin - START_HOUR * 60) / 15) * QUARTER_PX
    const rawHeight = ((ev.endMin - ev.startMin) / 15) * QUARTER_PX
    const height = Math.max(rawHeight - BLOCK_GAP_PX, QUARTER_PX * 2 - BLOCK_GAP_PX)
    return {
      ...ev,
      top,
      height,
      leftPct: (ev.col / ev.cols) * 100,
      widthPct: 100 / ev.cols
    }
  })
}

const schedulesByDay = computed(() => {
  const grouped = Object.fromEntries(DAYS.map(d => [d, []]))
  for (const s of props.schedules) {
    if (!grouped[s.day]) continue
    grouped[s.day].push(s)
  }
  for (const day of DAYS) grouped[day] = layoutDay(grouped[day])
  return grouped
})

const DAY_BASE_WIDTH = 140

const maxConcurrentByDay = computed(() => {
  const out = {}
  for (const day of DAYS) {
    const events = schedulesByDay.value[day]
    out[day] = events.reduce((m, e) => Math.max(m, e.cols), 1)
  }
  return out
})

const dayMinWidth = (day) => `${maxConcurrentByDay.value[day] * DAY_BASE_WIDTH}px`

const colorFor = (gender) => GENDER_COLORS[gender] || '#E5E7EB'

const teacherLabel = (s) => {
  if (s.teacher && s.teacher.first_name) return s.teacher.first_name
  return s.teacher_name || ''
}

const tooltipFor = (s) => {
  const parts = []
  if (s.classroom?.name) parts.push(s.classroom.name)
  if (s.classroom?.cursus_name) parts.push(s.classroom.cursus_name)
  if (teacherLabel(s)) parts.push(`Prof : ${teacherLabel(s)}`)
  parts.push(`${s.start_time} → ${s.end_time}`)
  if (s.classroom?.gender) parts.push(s.classroom.gender)
  return parts.join('\n')
}
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-x-auto overflow-y-clip">
    <div class="flex items-center gap-3 px-3 py-2 text-xs border-b border-gray-200">
      <div class="flex items-center gap-1">
        <span class="inline-block w-3.5 h-3.5 rounded-sm" :style="{backgroundColor: GENDER_COLORS.Femmes}"></span>
        <span class="font-medium text-gray-700">FEMMES</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="inline-block w-3.5 h-3.5 rounded-sm" :style="{backgroundColor: GENDER_COLORS.Enfants}"></span>
        <span class="font-medium text-gray-700">ENFANTS</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="inline-block w-3.5 h-3.5 rounded-sm" :style="{backgroundColor: GENDER_COLORS.Hommes}"></span>
        <span class="font-medium text-gray-700">HOMMES</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="inline-block w-3.5 h-3.5 rounded-sm" :style="{backgroundColor: GENDER_COLORS.Mixte}"></span>
        <span class="font-medium text-gray-700">MIXTE</span>
      </div>
    </div>

    <div class="flex min-w-[1200px]">
      <div class="w-16 shrink-0 border-r border-gray-200">
        <div class="h-8 border-b border-gray-200"></div>
        <div class="relative" :style="{height: totalHeight + 'px'}">
          <div
              v-for="h in hours"
              :key="h"
              class="absolute left-0 right-0 text-[10px] font-medium text-gray-600 px-1.5"
              :style="{top: ((h - START_HOUR) * 4 * QUARTER_PX) + 'px'}"
          >
            {{ String(h).padStart(2, '0') }}:00
          </div>
        </div>
      </div>

      <div
          v-for="day in DAYS"
          :key="day"
          class="flex-1 border-r border-gray-200 last:border-r-0"
          :style="{minWidth: dayMinWidth(day)}"
      >
        <div class="h-8 border-b border-gray-200 flex items-center justify-center text-xs font-bold uppercase text-gray-700 italic">
          {{ day }}
        </div>

        <div class="relative" :style="{height: totalHeight + 'px'}">
          <div
              v-for="h in hours.slice(0, -1)"
              :key="h"
              class="absolute left-0 right-0 border-t border-gray-100"
              :style="{top: ((h - START_HOUR) * 4 * QUARTER_PX) + 'px'}"
          ></div>
          <div
              v-for="h in hours.slice(0, -1)"
              :key="`half-${h}`"
              class="absolute left-0 right-0 border-t border-dashed border-gray-50"
              :style="{top: (((h - START_HOUR) * 4 + 2) * QUARTER_PX) + 'px'}"
          ></div>

          <div
              v-for="s in schedulesByDay[day]"
              :key="s.id"
              :title="tooltipFor(s)"
              :role="s.classroom?.id ? 'button' : null"
              :tabindex="s.classroom?.id ? 0 : null"
              class="absolute rounded-md px-1 py-1 text-[11px] leading-tight shadow-sm overflow-hidden transition focus:outline-none"
              :class="s.classroom?.id ? 'cursor-pointer hover:brightness-95 hover:shadow focus:ring-2 focus:ring-default/40' : 'cursor-default'"
              :style="{
                top: s.top + 'px',
                height: s.height + 'px',
                left: `calc(${s.leftPct}% + 2px)`,
                width: `calc(${s.widthPct}% - 4px)`,
                backgroundColor: colorFor(s.classroom?.gender)
              }"
              @click="s.classroom?.id && emit('select', s)"
              @keydown.enter.prevent="s.classroom?.id && emit('select', s)"
          >
            <div class="font-bold text-gray-900 truncate">{{ s.classroom?.name }}</div>
            <div class="text-gray-800 truncate">{{ teacherLabel(s) }}</div>
            <div class="text-gray-700 text-[10px] truncate">{{ s.start_time }}–{{ s.end_time }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


