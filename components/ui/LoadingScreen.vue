<script setup>
const props = defineProps({
  message: {
    type: String,
    default: 'Chargement...'
  },
  fullScreen: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <div
      :class="[
      'flex items-center justify-center bg-white z-40',
      fullScreen ? 'fixed inset-0' : 'w-full h-full min-h-40'
    ]"
  >
    <div class="flex flex-col items-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-default"></div>
      <p class="mt-4 text-default font-bold">{{ message }}</p>
    </div>
  </div>
</template>