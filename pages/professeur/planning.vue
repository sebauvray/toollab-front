<script setup>
import {ref, onMounted} from 'vue'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import ScheduleGrid from '~/components/schedule/ScheduleGrid.vue'
import {usePageTitle} from '~/composables/usePageTitle.js'
import teacherService from '~/services/teacher'

definePageMeta({
  layout: 'auth',
  layoutData: {title: 'Mon planning'}
})

usePageTitle('Mon planning')

const breadcrumbItems = [{name: 'Mon planning', path: '/professeur/planning'}]

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

const openClassroom = (s) => {
  if (s?.classroom?.id) navigateTo(`/professeur/classes/${s.classroom.id}`)
}

onMounted(() => fetchSchedules())
</script>

<template>
  <PageContainer>
    <BreadCrumb :custom-items="breadcrumbItems"/>

    <div v-if="isLoading" class="py-10 text-center text-gray-500 text-xs">
      Chargement…
    </div>
    <div v-else-if="schedules.length === 0" class="py-10 text-center text-gray-500 text-xs">
      Aucun créneau ne vous est attribué pour cette année.
    </div>
    <ScheduleGrid v-else :schedules="schedules" @select="openClassroom"/>
  </PageContainer>
</template>
