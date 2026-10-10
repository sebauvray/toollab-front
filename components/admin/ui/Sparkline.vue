<script setup>
import { computed } from 'vue'

// Mini-courbe décorative (la valeur et la variation sont données en texte à côté).
const props = defineProps({ values: { type: Array, required: true } })
const W = 80, H = 28
const path = computed(() => {
  const v = props.values
  const min = Math.min(...v), max = Math.max(...v)
  const span = max - min || 1
  return v.map((y, i) => `${i ? 'L' : 'M'}${(i / (v.length - 1)) * W},${H - 2 - ((y - min) / span) * (H - 4)}`).join(' ')
})
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
    <path :d="path" fill="none" stroke="#343C6A" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
  </svg>
</template>
