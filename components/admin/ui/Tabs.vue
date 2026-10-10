<script setup>
// Onglets de section (les filtres utilisent SegmentedControl).
defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true }, // [{ value, label, count? }]
  label: { type: String, required: true }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex gap-5 border-b border-[#E6EFF5] text-sm font-montserrat overflow-x-auto" role="tablist" :aria-label="label">
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === t.value"
      class="pb-2 -mb-px border-b-2 whitespace-nowrap transition-colors"
      :class="modelValue === t.value ? 'border-default text-default font-semibold' : 'border-transparent text-gray-600 hover:text-default'"
      @click="$emit('update:modelValue', t.value)"
    >
      {{ t.label }}<span v-if="t.count" class="ml-1 text-xs text-gray-500 tabular-nums">{{ t.count }}</span>
    </button>
  </div>
</template>
