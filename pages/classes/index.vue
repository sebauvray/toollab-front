<script setup>
import { ref, onMounted, computed } from 'vue'
import PageContainer from "~/components/layout/PageContainer.vue"
import BreadCrumb from "~/components/navigation/BreadCrumb.vue"
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue"
import Trash from "~/components/Icons/Trash.vue"
import classeService from '~/services/classe'
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

const genderColors = {
  'Hommes': '#93C5FD',
  'Femmes': '#FDA4AF',
  'Enfants': '#FCD34D'
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
        level: classroom.level,
        classrooms: []
      }
    }
    groups[key].classrooms.push(classroom)
  })

  return Object.values(groups)
})

onMounted(() => {
  fetchClasses()
})
</script>

<template>
  <PageContainer>
    <BreadCrumb :items="breadcrumbItems" />

    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-600">{{ error }}</p>
    </div>

    <div v-else-if="classes.length === 0" class="text-center py-12">
      <p class="text-gray-500">Aucune classe trouvée</p>
    </div>

    <div v-else class="space-y-6 pb-8">
      <div v-for="group in groupedClasses" :key="`${group.cursus}_${group.level}`" class="space-y-3">
        <h2 class="text-lg font-semibold text-gray-800">
          {{ group.cursus }} - {{ group.level }}
        </h2>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          <div
              v-for="classroom in group.classrooms"
              :key="classroom.id"
              class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div
                class="px-3 py-2 text-white font-medium text-sm"
                :style="{ backgroundColor: genderColors[classroom.gender] || '#6B7280' }"
            >
              {{ classroom.name }}
            </div>

            <div class="p-3">
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-gray-600 font-nunito">Élèves</span>
                <span class="font-medium text-sm">{{ classroom.student_count }}/{{ classroom.size }}</span>
              </div>

              <div class="space-y-1">
                <div
                    v-for="student in classroom.students"
                    :key="student.id"
                    class="flex justify-between items-center py-1.5 px-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors group font-nunito"
                >
                  <span class="text-xs text-gray-700 truncate flex-1 mr-2">{{ student.full_name }}</span>
                  <button
                      @click="openDeleteModal(student, classroom)"
                      class="text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                      title="Retirer de la classe"
                  >
                    <Trash class="w-3.5 h-3.5" />
                  </button>
                </div>

                <div v-if="classroom.students.length === 0" class="text-center py-3 text-gray-400 text-xs">
                  Aucun élève inscrit
                </div>
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