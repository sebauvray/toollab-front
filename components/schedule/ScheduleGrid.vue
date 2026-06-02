<script setup>
import {computed} from 'vue'

const props = defineProps({
  schedules: {
    type: Array,
    default: () => []
  }
})

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const START_HOUR = 7
const END_HOUR = 23
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

const schedulesByDay = computed(() => {
  const grouped = Object.fromEntries(DAYS.map(d => [d, []]))
  for (const s of props.schedules) {
    if (!grouped[s.day]) continue
    const startMin = toMinutes(s.start_time)
    const endMin = toMinutes(s.end_time)
    const top = ((startMin - START_HOUR * 60) / 15) * QUARTER_PX
    const height = Math.max(((endMin - startMin) / 15) * QUARTER_PX, QUARTER_PX * 2)
    grouped[s.day].push({...s, top, height})
  }
  return grouped
})

const colorFor = (gender) => GENDER_COLORS[gender] || '#E5E7EB'

const teacherLabel = (s) => {
  if (s.teacher && s.teacher.first_name) return s.teacher.first_name
  return s.teacher_name || ''
}
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-x-auto">
    <div class="flex min-w-[1200px]">
      <div class="w-16 shrink-0 border-r border-gray-200">
        <div class="h-8 border-b border-gray-200"></div>
        <div class="relative" :style="{height: totalHeight + 'px'}">
          <div
              v-for="h in hours"
              :key="h"
              class="absolute left-0 right-0 text-[10px] font-medium text-gray-600 px-2"
              :style="{top: ((h - START_HOUR) * 4 * QUARTER_PX) + 'px'}"
          >
            {{ String(h).padStart(2, '0') }}:00
          </div>
        </div>
      </div>

      <div
          v-for="day in DAYS"
          :key="day"
          class="flex-1 min-w-[140px] border-r border-gray-200 last:border-r-0"
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
              class="absolute left-1 right-1 rounded-md px-1.5 py-1 text-[11px] leading-tight shadow-sm overflow-hidden"
              :style="{top: s.top + 'px', height: s.height + 'px', backgroundColor: colorFor(s.classroom?.gender)}"
          >
            <div class="font-bold text-gray-900 truncate">{{ s.classroom?.name }}</div>
            <div class="text-gray-800 truncate">{{ teacherLabel(s) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4 px-4 py-3 text-xs border-t border-gray-200">
      <div class="flex items-center gap-1.5">
        <span class="inline-block w-4 h-4 rounded-sm" :style="{backgroundColor: GENDER_COLORS.Femmes}"></span>
        <span class="font-medium text-gray-700">FEMMES</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="inline-block w-4 h-4 rounded-sm" :style="{backgroundColor: GENDER_COLORS.Enfants}"></span>
        <span class="font-medium text-gray-700">ENFANTS</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="inline-block w-4 h-4 rounded-sm" :style="{backgroundColor: GENDER_COLORS.Hommes}"></span>
        <span class="font-medium text-gray-700">HOMMES</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="inline-block w-4 h-4 rounded-sm" :style="{backgroundColor: GENDER_COLORS.Mixte}"></span>
        <span class="font-medium text-gray-700">MIXTE</span>
      </div>
    </div>
  </div>
</template>
