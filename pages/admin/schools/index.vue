<script setup>
import { ref, onMounted } from 'vue'
import schoolService from '~/services/school'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Admin · Écoles')

const schools = ref([])
const isLoading = ref(true)
const errorMsg = ref('')

const fetchSchools = async () => {
  isLoading.value = true
  errorMsg.value = ''
  try {
    schools.value = await schoolService.getSchools()
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Erreur lors du chargement des écoles.'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchSchools)
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-5">
      <div>
        <h1 class="text-lg font-bold">Écoles</h1>
        <p class="text-gray-600 text-xs">{{ schools.length }} école{{ schools.length > 1 ? 's' : '' }} sur la plateforme</p>
      </div>
      <NuxtLink
        to="/admin/schools/new"
        class="px-3 py-1.5 bg-default text-white rounded-lg hover:opacity-90"
      >
        + Créer une école
      </NuxtLink>
    </div>

    <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-5">
      {{ errorMsg }}
    </div>

    <div v-if="isLoading" class="py-6 text-center">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-default mx-auto"></div>
    </div>

    <div v-else class="bg-white rounded-lg border">
      <table class="w-full">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-5 py-2 text-xs font-bold text-gray-600 uppercase">École</th>
            <th class="text-left px-5 py-2 text-xs font-bold text-gray-600 uppercase">Ville</th>
            <th class="text-left px-5 py-2 text-xs font-bold text-gray-600 uppercase">Email</th>
            <th class="text-left px-5 py-2 text-xs font-bold text-gray-600 uppercase">Actif</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="school in schools" :key="school.id" class="border-b last:border-b-0 hover:bg-gray-50">
            <td class="px-5 py-3">
              <div class="flex items-center gap-2">
                <div class="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                  {{ school.name?.charAt(0)?.toUpperCase() }}
                </div>
                <div>
                  <div class="font-semibold">{{ school.name }}</div>
                  <div class="text-xs text-gray-500">ID #{{ school.id }}</div>
                </div>
              </div>
            </td>
            <td class="px-5 py-3">{{ school.city || '—' }}</td>
            <td class="px-5 py-3">{{ school.email || '—' }}</td>
            <td class="px-5 py-3">
              <span :class="school.access ? 'text-green-600' : 'text-red-600'" class="text-xs font-bold">
                {{ school.access ? 'Actif' : 'Désactivé' }}
              </span>
            </td>
          </tr>
          <tr v-if="schools.length === 0">
            <td colspan="4" class="text-center py-10 text-gray-500">Aucune école.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
