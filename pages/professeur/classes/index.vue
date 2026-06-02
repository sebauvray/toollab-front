<script setup>
import {ref, onMounted} from 'vue'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import {usePageTitle} from '~/composables/usePageTitle.js'
import teacherService from '~/services/teacher'

definePageMeta({
  layout: 'auth',
  layoutData: {title: 'Mes classes'}
})

usePageTitle('Mes classes')

const breadcrumbItems = [{name: 'Mes classes', path: '/professeur/classes'}]

const classrooms = ref([])
const isLoading = ref(true)
const error = ref(null)

const genderColors = {
  Hommes: '#93C5FD',
  Femmes: '#FDA4AF',
  Enfants: '#FCD34D',
  Mixte: '#86EFAC'
}

const fetchClasses = async () => {
  try {
    isLoading.value = true
    const response = await teacherService.myClassrooms()
    classrooms.value = response.data || []
  } catch (e) {
    console.error('Erreur récupération classes:', e)
    error.value = 'Impossible de charger vos classes'
  } finally {
    isLoading.value = false
  }
}

const formatSchedule = (s) => `${s.day} ${s.start_time}–${s.end_time}`

onMounted(() => fetchClasses())
</script>

<template>
  <PageContainer>
    <BreadCrumb :items="breadcrumbItems"/>

    <div v-if="isLoading" class="py-12 text-center text-gray-500 text-sm">
      Chargement…
    </div>
    <div v-else-if="error" class="bg-red-50 text-red-700 p-3 rounded">{{ error }}</div>
    <div v-else-if="classrooms.length === 0" class="py-12 text-center text-gray-500 text-sm">
      Aucune classe ne vous est attribuée pour cette année.
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
      <NuxtLink
          v-for="c in classrooms"
          :key="c.id"
          :to="`/professeur/classes/${c.id}`"
          class="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-400 hover:shadow-md transition-all"
      >
        <div
            class="px-4 py-3 text-white font-semibold"
            :style="{backgroundColor: genderColors[c.gender] || '#6B7280'}"
        >
          {{ c.name }}
        </div>
        <div class="p-4 space-y-2 text-sm">
          <div class="text-gray-600">
            <span class="font-medium">{{ c.cursus }}</span>
            <span v-if="c.level"> · {{ c.level }}</span>
          </div>
          <div class="text-gray-700">
            {{ c.student_count }} élève{{ c.student_count > 1 ? 's' : '' }}
            <span class="text-gray-400"> / {{ c.size }}</span>
          </div>
          <div class="pt-2 border-t border-gray-100 space-y-0.5">
            <div v-for="(s, idx) in c.schedules" :key="idx" class="text-xs text-gray-600">
              {{ formatSchedule(s) }}
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>
  </PageContainer>
</template>
