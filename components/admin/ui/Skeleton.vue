<script setup>
defineProps({ lines: { type: Number, default: 3 }, height: { type: String, default: 'h-4' } })
</script>

<template>
  <div class="space-y-2 animate-pulse" aria-hidden="true">
    <div v-for="i in lines" :key="i" class="bg-gray-100 rounded" :class="height" :style="{ width: `${100 - ((i * 17) % 35)}%` }"></div>
  </div>
</template>
