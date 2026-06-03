<script setup>
import { ref, onMounted } from 'vue'
import schoolService from '~/services/school'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Administration')

const schools = ref([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    schools.value = await schoolService.getSchools()
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="p-6">
    <h1 class="text-xl font-bold mb-1.5">Administration Toollab</h1>
    <p class="text-gray-600 mb-6">Vue plateforme — gestion globale des écoles.</p>

    <div v-if="isLoading" class="py-6 text-center">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-default mx-auto"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      <div class="bg-white p-5 rounded-lg border">
        <div class="text-2xl font-bold text-default">{{ schools.length }}</div>
        <div class="text-gray-500 mt-1">École{{ schools.length > 1 ? 's' : '' }} sur la plateforme</div>
      </div>
    </div>

    <div class="flex gap-3">
      <NuxtLink
        to="/admin/schools"
        class="px-4 py-2 bg-default text-white rounded-lg hover:opacity-90"
      >
        Gérer les écoles
      </NuxtLink>
      <NuxtLink
        to="/admin/schools/new"
        class="px-4 py-2 border border-default text-default rounded-lg hover:bg-gray-50"
      >
        + Créer une école
      </NuxtLink>
    </div>
  </div>
</template>
