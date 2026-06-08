<script setup>
import { ref, onMounted, computed } from 'vue'
import PageContainer from "~/components/layout/PageContainer.vue"
import BreadCrumb from "~/components/navigation/BreadCrumb.vue"
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue"
import Trash from "~/components/Icons/Trash.vue"
import classeService from '~/services/classe'
import { useSchoolYear } from '~/composables/useSchoolYear'
import { usePageTitle } from "~/composables/usePageTitle.js"

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Classes'
  },
  middleware: 'admin-director'
})

usePageTitle('Classes')

const breadcrumbItems = computed(() => [
  { name: 'Classes', path: '/classes' },
])

const isLoading = ref(true)
const error = ref(null)
const classes = ref([])
const showDeleteModal = ref(false)
const studentToRemove = ref(null)
const classroomToRemove = ref(null)
const { isReadOnly } = useSchoolYear()

const genderColors = {
  'Hommes': '#93C5FD',
  'Femmes': '#FDA4AF',
  'Enfants': '#FCD34D',
  'Mixte': '#86EFAC'
}

const viewMode = ref('detailed')
const setView = (v) => {
  viewMode.value = v
  if (process.client) localStorage.setItem('classes_view', v)
}

const currentSchoolId = computed(() => {
  return localStorage.getItem('current_school_id') || 1
})

const fetchClasses = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await classeService.getAdminClassrooms({
      school_id: currentSchoolId.value
    })

    if (response.status === 'success') {
      classes.value = response.data
    }
  } catch (err) {
    console.error('Erreur lors du chargement des classes:', err)
    error.value = 'Erreur lors du chargement des classes'
  } finally {
    isLoading.value = false
  }
}

const openDeleteModal = (student, classroom) => {
  studentToRemove.value = student
  classroomToRemove.value = classroom
  showDeleteModal.value = true
}

const handleDeleteStudent = async () => {
  try {
    const response = await classeService.removeStudentFromClass(
        classroomToRemove.value.id,
        studentToRemove.value.id
    )

    if (response.status === 'success') {
      const { setFlashMessage } = useFlashMessage()
      setFlashMessage({
        type: 'success',
        message: `${studentToRemove.value.first_name} ${studentToRemove.value.last_name} a été retiré de la classe`
      })

      await fetchClasses()
    }
  } catch (err) {
    console.error('Erreur lors de la suppression:', err)
    const { setFlashMessage } = useFlashMessage()
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la suppression de l\'élève'
    })
  } finally {
    showDeleteModal.value = false
    studentToRemove.value = null
    classroomToRemove.value = null
  }
}

const groupedClasses = computed(() => {
  const groups = {}

  classes.value.forEach(classroom => {
    const key = `${classroom.cursus_id}_${classroom.level_id}`
    if (!groups[key]) {
      groups[key] = {
        cursus: classroom.cursus,
        cursus_id: classroom.cursus_id,
        level: classroom.level,
        classrooms: []
      }
    }
    groups[key].classrooms.push(classroom)
  })

  return Object.values(groups)
})

onMounted(() => {
  if (process.client) {
    const saved = localStorage.getItem('classes_view')
    if (saved === 'list' || saved === 'detailed') viewMode.value = saved
  }
  fetchClasses()
})
</script>

<template>
  <PageContainer>
    <BreadCrumb :custom-items="breadcrumbItems" />

    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-600">{{ error }}</p>
    </div>

    <div v-else-if="classes.length === 0" class="text-center py-10">
      <p class="text-gray-500">Aucune classe trouvée</p>
    </div>

    <div v-else>
      <div class="flex items-center justify-between gap-2 mb-4">
        <div class="inline-flex items-center gap-0.5 p-1 bg-white border border-gray-200 rounded-lg">
          <button
              type="button"
              @click="setView('detailed')"
              title="Vue détaillée"
              aria-label="Vue détaillée"
              :class="['flex items-center justify-center w-7 h-7 rounded-md transition-colors', viewMode === 'detailed' ? 'bg-default text-white' : 'text-gray-400 hover:text-default hover:bg-gray-100']"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z"/></svg>
          </button>
          <button
              type="button"
              @click="setView('list')"
              title="Vue liste"
              aria-label="Vue liste"
              :class="['flex items-center justify-center w-7 h-7 rounded-md transition-colors', viewMode === 'list' ? 'bg-default text-white' : 'text-gray-400 hover:text-default hover:bg-gray-100']"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4h14v2H3V4zm0 5h14v2H3V9zm0 5h14v2H3v-2z"/></svg>
          </button>
        </div>
        <NuxtLink to="/decisions" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-default bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Vue d'ensemble des décisions
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </div>

      <div v-if="viewMode === 'detailed'" class="space-y-5 pb-6">
      <div v-for="group in groupedClasses" :key="`${group.cursus}_${group.level}`" class="space-y-2">
        <NuxtLink
            :to="`/cursus/${group.cursus_id}`"
            class="inline-block text-base font-semibold text-gray-800 hover:text-primary hover:underline underline-offset-4 decoration-2 transition-colors"
        >
          {{ group.cursus }} - {{ group.level }}
        </NuxtLink>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
          <div
              v-for="classroom in group.classrooms"
              :key="classroom.id"
              class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div
                class="px-2 py-1.5 text-white font-medium text-xs"
                :style="{ backgroundColor: genderColors[classroom.gender] || '#6B7280' }"
            >
              <NuxtLink
                  :to="`/cursus/${classroom.cursus_id}#class-${classroom.id}`"
                  class="hover:underline underline-offset-4 decoration-2 decoration-white/80"
              >
                {{ classroom.name }}
              </NuxtLink>
            </div>

            <div class="p-2">
              <div class="flex justify-between items-center mb-1.5">
                <span class="text-xs text-gray-600 font-nunito">Élèves</span>
                <span class="font-medium text-xs">{{ classroom.student_count }}/{{ classroom.size }}</span>
              </div>

              <div class="space-y-1">
                <div
                    v-for="student in classroom.students"
                    :key="student.id"
                    class="flex justify-between items-center py-1 px-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors group/row font-nunito"
                >
                  <NuxtLink
                      :to="`/family/${student.family_id}`"
                      class="text-xs text-gray-700 hover:text-primary hover:underline underline-offset-2 truncate flex-1 mr-1.5 transition-colors"
                  >
                    {{ student.full_name }}
                  </NuxtLink>
                  <button
                      v-if="!isReadOnly"
                      @click="openDeleteModal(student, classroom)"
                      class="text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover/row:opacity-100 p-0.5"
                      title="Retirer de la classe"
                  >
                    <Trash class="w-3.5 h-3.5" />
                  </button>
                </div>

                <div v-if="classroom.students.length === 0" class="text-center py-2 text-gray-400 text-xs">
                  Aucun élève inscrit
                </div>
              </div>

              <NuxtLink
                  :to="`/classes/${classroom.id}`"
                  class="mt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-default hover:text-primary border-t border-[#E6EFF5] pt-1.5 transition-colors font-nunito"
              >
                Suivi · émargement &amp; décisions
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div v-else class="space-y-5 pb-6">
        <div v-for="group in groupedClasses" :key="`list-${group.cursus}_${group.level}`">
          <h2 class="text-sm font-semibold text-gray-800 mb-1.5 font-montserrat">{{ group.cursus }} · {{ group.level }}</h2>
          <div class="bg-white rounded-2xl border overflow-hidden">
            <div
                v-for="(classroom, i) in group.classrooms"
                :key="classroom.id"
                class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 border-l-4 hover:bg-gray-50 transition-colors"
                :class="i < group.classrooms.length - 1 ? 'border-b border-[#E6EFF5]' : ''"
                :style="{ borderLeftColor: genderColors[classroom.gender] || '#9CA3AF' }"
            >
              <NuxtLink :to="`/classes/${classroom.id}`" class="min-w-[10rem] flex-1">
                <div class="text-sm font-medium text-gray-900 font-montserrat">{{ classroom.name }}</div>
                <div class="text-[11px] text-placeholder">{{ classroom.gender }}</div>
              </NuxtLink>
              <div class="text-xs text-gray-600 w-24 shrink-0">{{ classroom.student_count }} élève{{ classroom.student_count > 1 ? 's' : '' }}</div>
              <div class="text-xs w-32">
                <span v-if="classroom.student_count > 0 && classroom.decided_count >= classroom.student_count" class="text-green-700 font-medium">{{ classroom.decided_count }}/{{ classroom.student_count }} décidés ✓</span>
                <span v-else-if="classroom.decided_count > 0" class="text-amber-700">{{ classroom.decided_count }}/{{ classroom.student_count }} décidés</span>
                <span v-else class="text-gray-400">{{ classroom.decided_count }}/{{ classroom.student_count }} décidés</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <NuxtLink :to="`/classes/${classroom.id}`" class="px-2.5 py-1 rounded-lg text-xs font-medium bg-default text-white hover:opacity-90 transition-opacity">Émargement</NuxtLink>
                <NuxtLink :to="`/classes/${classroom.id}?tab=decisions`" class="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-300 text-default hover:bg-gray-50 transition-colors">Décisions</NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmationModal
        v-if="showDeleteModal"
        :is-open="showDeleteModal"
        title="Retirer l'élève de la classe"
        :message="`Êtes-vous sûr de vouloir retirer ${studentToRemove?.first_name} ${studentToRemove?.last_name} de la classe ${classroomToRemove?.name} ?`"
        confirm-text="Retirer"
        cancel-text="Annuler"
        @confirm="handleDeleteStudent"
        @cancel="showDeleteModal = false"
    />
  </PageContainer>
</template>