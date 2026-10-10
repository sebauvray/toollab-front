<script setup>
import { computed, ref } from 'vue'

// Courbe d'une série dans le temps (aire légère, trait 2px), réticule et infobulle
// au survol, résumé textuel pour les lecteurs d'écran.
const props = defineProps({
  points: { type: Array, required: true }, // [{ label, value }] du plus ancien au plus récent
  label: { type: String, required: true },
  format: { type: Function, default: (v) => v.toLocaleString('fr-FR') },
  height: { type: Number, default: 140 },
  zeroBased: { type: Boolean, default: true }
})

const W = 600
const PAD_T = 8, PAD_B = 4
const hovered = ref(null)
const svgRef = ref(null)

const values = computed(() => props.points.map(p => p.value))
const range = computed(() => {
  const max = Math.max(...values.value)
  const min = props.zeroBased ? 0 : Math.min(...values.value)
  return { min, max: max === min ? min + 1 : max }
})
const x = (i) => (props.points.length < 2 ? W / 2 : (i / (props.points.length - 1)) * W)
const y = (v) => {
  const { min, max } = range.value
  return PAD_T + (1 - (v - min) / (max - min)) * (props.height - PAD_T - PAD_B)
}
const line = computed(() => props.points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' '))
const area = computed(() => `${line.value} L${x(props.points.length - 1)},${props.height} L0,${props.height} Z`)
const gridValues = computed(() => [range.value.max, (range.value.max + range.value.min) / 2])

const onMove = (e) => {
  const r = svgRef.value.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  hovered.value = Math.round(ratio * (props.points.length - 1))
}

const summary = computed(() => {
  const v = values.value
  if (!v.length) return props.label
  return `${props.label} : de ${props.format(v[0])} (${props.points[0].label}) à ${props.format(v.at(-1))} (${props.points.at(-1).label}), maximum ${props.format(Math.max(...v))}`
})
</script>

<template>
  <figure class="relative font-montserrat" :aria-label="summary" role="img">
    <div class="relative">
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${W} ${height}`"
        preserveAspectRatio="none"
        class="w-full block overflow-visible"
        :style="{ height: `${height}px` }"
        @mousemove="onMove"
        @mouseleave="hovered = null"
      >
        <line v-for="g in gridValues" :key="g" x1="0" :x2="W" :y1="y(g)" :y2="y(g)" stroke="#E6EFF5" stroke-width="1" vector-effect="non-scaling-stroke" />
        <path :d="area" fill="#343C6A" fill-opacity="0.08" />
        <path :d="line" fill="none" stroke="#343C6A" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        <line :x1="0" :x2="W" :y1="height" :y2="height" stroke="#D1D5DB" stroke-width="1" vector-effect="non-scaling-stroke" />
        <line v-if="hovered !== null" :x1="x(hovered)" :x2="x(hovered)" y1="0" :y2="height" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
      </svg>
      <!-- Le point est en HTML pour rester rond malgré l'étirement du SVG -->
      <div
        v-if="hovered !== null"
        class="absolute w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white pointer-events-none -translate-x-1/2 -translate-y-1/2"
        :style="{ left: `${(x(hovered) / W) * 100}%`, top: `${y(points[hovered].value)}px` }"
      ></div>
      <div
        v-if="hovered !== null"
        class="absolute -top-8 z-10 px-2 py-0.5 rounded-md bg-white border shadow-md text-[11px] whitespace-nowrap pointer-events-none -translate-x-1/2"
        :style="{ left: `${Math.min(Math.max((x(hovered) / W) * 100, 8), 92)}%` }"
      >
        <strong class="tabular-nums">{{ format(points[hovered].value) }}</strong> · {{ points[hovered].label }}
      </div>
      <span class="absolute left-0 text-[10px] text-gray-500 tabular-nums bg-white/80 pr-1" :style="{ top: `${y(range.max) - 6}px` }" aria-hidden="true">{{ format(range.max) }}</span>
    </div>
    <div class="flex justify-between text-[10px] text-gray-500 mt-1" aria-hidden="true">
      <span>{{ points[0]?.label }}</span><span>{{ points.at(-1)?.label }}</span>
    </div>
  </figure>
</template>
