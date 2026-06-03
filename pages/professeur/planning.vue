<script setup>
import {ref, onMounted} from 'vue'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import ScheduleGrid from '~/components/schedule/ScheduleGrid.vue'
import {usePageTitle} from '~/composables/usePageTitle.js'
import {useSchoolYear} from '~/composables/useSchoolYear'
import teacherService from '~/services/teacher'

definePageMeta({
  layout: 'auth',
  layoutData: {title: 'Mon planning'}
})

usePageTitle('Mon planning')

const breadcrumbItems = [{name: 'Mon planning', path: '/professeur/planning'}]

const {currentYear} = useSchoolYear()
const schedules = ref([])
const isLoading = ref(true)

const fetchSchedules = async () => {
  try {
    isLoading.value = true
    const response = await teacherService.mySchedules()
    schedules.value = response.data || []
  } catch (e) {
    console.error('Erreur récupération planning:', e)
    schedules.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchSchedules())
</script>

<template>
  <PageContainer>
    <BreadCrumb :items="breadcrumbItems"/>

    <div class="mb-3">
      <h1 class="text-xl font-bold text-gray-900">Mon planning</h1>
      <p v-if="currentYear" class="text-xs text-gray-600">{{ currentYear.label }}</p>
    </div>

    <div v-if="isLoading" class="py-10 text-center text-gray-500 text-xs">
      Chargement…
    </div>
    <div v-else-if="schedules.length === 0" class="py-10 text-center text-gray-500 text-xs">
      Aucun créneau ne vous est attribué pour cette année.
    </div>
    <ScheduleGrid v-else :schedules="schedules"/>
  </PageContainer>
</template>
