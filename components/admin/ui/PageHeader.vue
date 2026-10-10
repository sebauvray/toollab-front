<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  back: { type: String, default: '' },
  backLabel: { type: String, default: 'Retour' }
})
</script>

<template>
  <div class="mb-5 font-montserrat">
    <NuxtLink v-if="back" :to="back" class="text-xs text-gray-500 hover:text-default mb-2 inline-block">← {{ backLabel }}</NuxtLink>
    <div class="flex flex-wrap justify-between items-start gap-3">
      <div class="min-w-0">
        <h1 class="text-lg font-bold text-default">{{ title }}</h1>
        <p v-if="subtitle" class="text-xs text-gray-600 mt-0.5">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
