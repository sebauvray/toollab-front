<script setup>
import { computed } from 'vue'
import Sparkline from './Sparkline.vue'
import { NuxtLink } from '#components'

// Indicateur : valeur, libellé, variation sur la période et mini-courbe.
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  sub: { type: String, default: '' },
  delta: { type: Number, default: null }, // variation absolue sur la période
  deltaLabel: { type: String, default: 'sur 30 j' },
  // up = une hausse est bonne, down = une hausse est mauvaise, neutral = pas de jugement
  polarity: { type: String, default: 'up' },
  trend: { type: Array, default: null },
  to: { type: String, default: '' }
})

const deltaClass = computed(() => {
  if (!props.delta || props.polarity === 'neutral') return 'text-gray-600'
  const good = props.polarity === 'up' ? props.delta > 0 : props.delta < 0
  return good ? 'text-green-700' : 'text-red-700'
})
const deltaText = computed(() => {
  if (props.delta === null) return ''
  if (props.delta === 0) return '='
  return `${props.delta > 0 ? '▲ +' : '▼ '}${props.delta.toLocaleString('fr-FR')}`
})
</script>

<template>
  <component
    :is="to ? NuxtLink : 'div'"
    :to="to || undefined"
    class="block bg-white p-5 rounded-2xl border border-[#E6EFF5] font-montserrat"
    :class="to ? 'hover:border-gray-300 transition-colors' : ''"
  >
    <div class="text-xs font-medium text-gray-600">{{ label }}</div>
    <div class="flex items-end justify-between gap-3 mt-1">
      <div class="text-xl font-bold text-default tabular-nums leading-tight">{{ value }}</div>
      <Sparkline v-if="trend && trend.length > 1" :values="trend" class="w-20 h-7 shrink-0" />
    </div>
    <div class="text-xs mt-1 flex flex-wrap gap-x-1.5">
      <span v-if="deltaText" class="font-semibold tabular-nums" :class="deltaClass">{{ deltaText }}</span>
      <span v-if="deltaText" class="text-gray-500">{{ deltaLabel }}</span>
      <span v-if="sub" class="text-gray-500">{{ deltaText ? '· ' : '' }}{{ sub }}</span>
    </div>
  </component>
</template>
