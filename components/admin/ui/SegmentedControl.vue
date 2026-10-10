<script setup>
// Contrôle segmenté (pas de pastilles arrondies, cf. design system).
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true }, // [{ value, label, count? }]
  label: { type: String, required: true }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="inline-flex flex-wrap rounded-lg border border-input-stroke divide-x divide-input-stroke overflow-hidden font-montserrat" role="group" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="px-3 py-1.5 text-xs transition-colors"
      :class="modelValue === o.value ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
      :aria-pressed="modelValue === o.value"
      @click="$emit('update:modelValue', o.value)"
    >
      {{ o.label }}<span v-if="o.count !== undefined && o.count !== null" class="tabular-nums" :class="modelValue === o.value ? 'text-white/70' : 'text-gray-500'"> {{ o.count }}</span>
    </button>
  </div>
</template>
