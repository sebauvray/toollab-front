<script setup>
import { computed } from 'vue'

// Catalogue unique des statuts affichés dans l'administration.
const STATUSES = {
  active: { label: 'Active', cls: 'bg-green-50 text-green-700 ring-green-200' },
  suspended: { label: 'Suspendue', cls: 'bg-red-50 text-red-700 ring-red-200' },
  disabled: { label: 'Désactivé', cls: 'bg-red-50 text-red-700 ring-red-200' },
  resolved: { label: 'Résolue', cls: 'bg-green-50 text-green-700 ring-green-200' },
  open: { label: 'Ouverte', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  pending: { label: 'En attente', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  warning: { label: 'À surveiller', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  neutral: { label: '', cls: 'bg-gray-50 text-gray-700 ring-gray-200' },
  production: { label: 'production', cls: 'bg-green-50 text-green-700 ring-green-200' },
  local: { label: 'local', cls: 'bg-gray-50 text-gray-700 ring-gray-200' }
}

const props = defineProps({
  status: { type: String, required: true },
  label: { type: String, default: '' }
})
const s = computed(() => STATUSES[props.status] || STATUSES.neutral)
</script>

<template>
  <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 whitespace-nowrap" :class="s.cls">
    {{ label || s.label || status }}
  </span>
</template>
