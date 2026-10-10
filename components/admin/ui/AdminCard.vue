<script setup>
// Conteneur standard de l'administration : en-tête facultatif, lien « Tout voir ».
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  to: { type: String, default: '' },
  linkLabel: { type: String, default: 'Tout voir' },
  padded: { type: Boolean, default: true }
})
</script>

<template>
  <section class="bg-white rounded-2xl border border-[#E6EFF5] font-montserrat">
    <header v-if="title || $slots.actions" class="flex flex-wrap justify-between items-center gap-2 px-5 py-3 border-b border-[#E6EFF5]">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-default">{{ title }}</h2>
        <p v-if="subtitle" class="text-xs text-gray-600 mt-0.5">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-3">
        <slot name="actions" />
        <NuxtLink v-if="to" :to="to" class="text-xs text-blue-link hover:underline whitespace-nowrap">{{ linkLabel }}</NuxtLink>
      </div>
    </header>
    <div :class="padded ? 'p-5' : ''">
      <slot />
    </div>
  </section>
</template>
