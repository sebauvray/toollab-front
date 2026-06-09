<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  label: { type: String, default: 'Exporter' }
})
defineEmits(['click'])
</script>

<template>
  <button
      type="button"
      :disabled="loading"
      @click="$emit('click')"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-default bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-wait"
  >
    <img src="/excel.png" alt="" class="w-4 h-4 object-contain shrink-0" />
    {{ loading ? 'Export…' : label }}
  </button>
</template>
