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
      class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-input-stroke rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-60 disabled:cursor-wait font-nunito"
  >
    <img src="/excel.png" alt="" class="w-4 h-4 object-contain shrink-0" />
    {{ loading ? 'Export…' : label }}
  </button>
</template>
