<script setup>
defineProps({
  tone: { type: String, default: 'error' } // error | warning | info
})
const TONES = {
  error: 'bg-red-50 text-red-700 ring-red-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  info: 'bg-gray-50 text-gray-700 ring-gray-200'
}
</script>

<template>
  <div class="ring-1 rounded-lg px-3 py-2 text-xs" :class="TONES[tone]" :role="tone === 'error' ? 'alert' : 'status'">
    <slot />
  </div>
</template>
