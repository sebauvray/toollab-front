<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
  }, 300)
})
</script>

<template>
  <div v-if="isLoading" class="fixed inset-0 flex items-center justify-center bg-white z-50">
    <div class="flex flex-col items-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-default"></div>
      <p class="mt-4 text-default font-bold">Chargement...</p>
    </div>
  </div>

  <FlashMessage />

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>