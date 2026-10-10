<script setup>
import { computed, ref } from 'vue'

// Histogramme des 24 dernières heures (une seule série) : barres fines posées sur
// la ligne de base, infobulle au survol, résumé textuel pour les lecteurs d'écran.
const props = defineProps({
  values: { type: Array, required: true }, // 24 compteurs, du plus ancien au plus récent
  label: { type: String, default: 'Erreurs par heure sur 24 h' },
  height: { type: Number, default: 40 }
})

const hovered = ref(null)
const max = computed(() => Math.max(1, ...props.values))
const total = computed(() => props.values.reduce((a, b) => a + b, 0))

const hourLabel = (index) => {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() - (23 - index))
  const end = new Date(d.getTime() + 3600000)
  const fmt = (x) => x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${fmt(d)}–${fmt(end)}`
}

const peak = computed(() => {
  const i = props.values.indexOf(Math.max(...props.values))
  return total.value ? `pic de ${props.values[i]} entre ${hourLabel(i)}` : 'aucune'
})
</script>

<template>
  <div class="relative" role="img" :aria-label="`${label} : ${total} au total, ${peak}`">
    <div class="flex items-end gap-[2px] border-b border-gray-300" :style="{ height: `${height}px` }">
      <div
        v-for="(v, i) in values"
        :key="i"
        class="relative flex-1 h-full flex items-end cursor-default"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
      >
        <div
          class="w-full rounded-t-[2px] transition-colors"
          :class="v ? (hovered === i ? 'bg-default' : 'bg-gray-500') : 'bg-transparent'"
          :style="{ height: v ? `${Math.max(2, (v / max) * height)}px` : '0px' }"
        ></div>
      </div>
    </div>
    <div class="flex justify-between text-[10px] text-gray-500 mt-0.5" aria-hidden="true">
      <span>-24 h</span><span>maintenant</span>
    </div>
    <div
      v-if="hovered !== null"
      class="absolute -top-7 z-10 px-2 py-0.5 rounded-md bg-white border shadow-md text-[11px] whitespace-nowrap pointer-events-none"
      :style="{ left: `${Math.min(Math.max((hovered / 23) * 100, 10), 80)}%`, transform: 'translateX(-50%)' }"
    >
      <strong>{{ values[hovered] }}</strong> erreur{{ values[hovered] > 1 ? 's' : '' }} · {{ hourLabel(hovered) }}
    </div>
  </div>
</template>
