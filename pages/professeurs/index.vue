<script setup>
import {ref, computed, onMounted} from 'vue'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import InputText from '~/components/form/InputText.vue'
import ConfirmationModal from '~/components/modals/ConfirmationModal.vue'
import EditTeacherModal from '~/components/modals/EditTeacherModal.vue'
import ScheduleGrid from '~/components/schedule/ScheduleGrid.vue'
import Edit from '~/components/Icons/Edit.vue'
import Trash from '~/components/Icons/Trash.vue'
import {usePageTitle} from '~/composables/usePageTitle.js'
import {useSchoolYear} from '~/composables/useSchoolYear'
import userService from '~/services/user'
import staffService from '~/services/staff'
import scheduleService from '~/services/schedule'

definePageMeta({
  layout: 'auth',
  layoutData: {title: 'Professeurs'},
  middleware: 'admin-director'
})

usePageTitle('Professeurs')

const breadcrumbItems = [{name: 'Professeurs', path: '/professeurs'}]

const {isReadOnly, currentYear} = useSchoolYear()
const {setFlashMessage} = useFlashMessage()

const activeTab = ref('list')
const teachers = ref([])
const schedules = ref([])
const isLoadingTeachers = ref(true)
const isLoadingSchedules = ref(false)
const isSubmitting = ref(false)
const selectedTeacherFilter = ref('')

const inviteForm = ref({first_name: '', last_name: '', email: ''})
const inviteError = ref('')

const showRemoveModal = ref(false)
const teacherToRemove = ref(null)
const showEditModal = ref(false)
const teacherToEdit = ref(null)
const editModalRef = ref(null)

const schoolId = computed(() => {
  if (process.client) return parseInt(localStorage.getItem('current_school_id') || '0', 10)
  return 0
})

const fetchTeachers = async () => {
  try {
    isLoadingTeachers.value = true
    const response = await userService.listTeachers()
    teachers.value = response.data || []
  } catch (err) {
    console.error('Erreur récupération profs:', err)
    teachers.value = []
  } finally {
    isLoadingTeachers.value = false
  }
}

const fetchSchedules = async () => {
  try {
    isLoadingSchedules.value = true
    const params = {}
    if (selectedTeacherFilter.value) params.teacher_id = selectedTeacherFilter.value
    const response = await scheduleService.listSchedules(params)
    schedules.value = response.data || []
  } catch (err) {
    console.error('Erreur récupération créneaux:', err)
    schedules.value = []
  } finally {
    isLoadingSchedules.value = false
  }
}

const openClassroom = (s) => {
  if (s?.classroom?.id) navigateTo(`/classes/${s.classroom.id}`)
}

const handleInvite = async () => {
  inviteError.value = ''
  const {first_name, last_name, email} = inviteForm.value
  if (!first_name || !last_name || !email) {
    inviteError.value = 'Tous les champs sont obligatoires'
    return
  }

  try {
    isSubmitting.value = true
    const response = await staffService.createStaffUser({
      first_name,
      last_name,
      email,
      role: 'teacher',
      school_id: schoolId.value
    })

    setFlashMessage({
      type: 'success',
      message: response.message || 'Invitation envoyée'
    })
    inviteForm.value = {first_name: '', last_name: '', email: ''}
    await fetchTeachers()
  } catch (err) {
    inviteError.value = err.response?.data?.message || 'Erreur lors de l\'invitation'
  } finally {
    isSubmitting.value = false
  }
}

const openEditModal = (teacher) => {
  teacherToEdit.value = teacher
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  teacherToEdit.value = null
}

const handleEditSave = async (data) => {
  if (!teacherToEdit.value) return
  try {
    await userService.updateUser(teacherToEdit.value.id, data)
    setFlashMessage({type: 'success', message: 'Professeur mis à jour'})
    closeEditModal()
    await fetchTeachers()
  } catch (err) {
    const msg = err.response?.data?.message
        || err.response?.data?.errors?.email?.[0]
        || 'Erreur lors de la mise à jour'
    editModalRef.value?.setError(msg)
  }
}

const openRemoveModal = (teacher) => {
  teacherToRemove.value = teacher
  showRemoveModal.value = true
}

const closeRemoveModal = () => {
  showRemoveModal.value = false
  teacherToRemove.value = null
}

const handleRemove = async () => {
  if (!teacherToRemove.value) return
  try {
    await staffService.removeUserRole({
      user_id: teacherToRemove.value.id,
      school_id: schoolId.value,
      role_name: 'Professeur'
    })
    setFlashMessage({type: 'success', message: 'Professeur retiré'})
    await fetchTeachers()
  } catch (err) {
    setFlashMessage({
      type: 'error',
      message: err.response?.data?.message || 'Erreur lors du retrait'
    })
  } finally {
    closeRemoveModal()
  }
}

const onTabChange = async (tab) => {
  activeTab.value = tab
  if (tab === 'planning' && schedules.value.length === 0) {
    await fetchSchedules()
  }
}

const onFilterChange = async () => {
  await fetchSchedules()
}


onMounted(() => {
  fetchTeachers()
})
</script>

<template>
  <PageContainer>
    <BreadCrumb :items="breadcrumbItems"/>

    <div class="flex gap-1.5 border-b border-gray-200 mb-5">
      <button
          type="button"
          @click="onTabChange('list')"
          :class="[
            'px-3 py-1.5 text-xs font-medium border-b-2 transition-colors',
            activeTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
      >
        Liste des professeurs
      </button>
      <button
          type="button"
          @click="onTabChange('planning')"
          :class="[
            'px-3 py-1.5 text-xs font-medium border-b-2 transition-colors',
            activeTab === 'planning'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
      >
        Planning
      </button>
    </div>

    <section v-if="activeTab === 'list'">
      <div v-if="!isReadOnly" class="bg-white rounded-lg border border-gray-200 p-5 mb-5">
        <h2 class="text-base font-semibold mb-1.5">Inviter un professeur</h2>
        <p class="text-xs text-gray-600 mb-3">
          Un email d'invitation sera envoyé pour définir un mot de passe.
        </p>

        <div v-if="inviteError" class="bg-red-50 text-red-700 px-2 py-1.5 rounded mb-2 text-xs">
          {{ inviteError }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InputText v-model="inviteForm.first_name" placeholder="Prénom"/>
          <InputText v-model="inviteForm.last_name" placeholder="Nom"/>
          <InputText v-model="inviteForm.email" placeholder="Email"/>
          <button
              type="button"
              @click="handleInvite"
              :disabled="isSubmitting"
              class="px-3 py-1.5 text-sm bg-default text-white rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {{ isSubmitting ? 'Envoi…' : 'Inviter' }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-200">
          <h2 class="text-base font-semibold">Professeurs ({{ teachers.length }})</h2>
        </div>

        <div v-if="isLoadingTeachers" class="py-6 text-center text-gray-500 text-xs">
          Chargement…
        </div>
        <div v-else-if="teachers.length === 0" class="py-6 text-center text-gray-500 text-xs">
          Aucun professeur. Invite ton premier prof avec le formulaire ci-dessus.
        </div>
        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
          <tr>
            <th class="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
            <th class="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th class="px-5 py-2 w-12"></th>
          </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="t in teachers" :key="t.id">
            <td class="px-5 py-2 text-xs text-gray-900 font-medium">
              {{ t.first_name }} {{ t.last_name }}
            </td>
            <td class="px-5 py-2 text-xs text-gray-600">{{ t.email }}</td>
            <td class="px-5 py-2 text-right">
              <div class="inline-flex items-center gap-2">
                <button
                    v-if="!isReadOnly"
                    type="button"
                    @click="openEditModal(t)"
                    class="text-gray-400 hover:text-primary transition-colors"
                    title="Modifier ce professeur"
                >
                  <Edit class="size-4"/>
                </button>
                <button
                    v-if="!isReadOnly"
                    type="button"
                    @click="openRemoveModal(t)"
                    class="text-red-500 hover:text-red-700 transition-colors"
                    title="Retirer ce professeur"
                >
                  <Trash class="size-4"/>
                </button>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="activeTab === 'planning'">
      <div class="flex items-end justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 class="text-base font-semibold">Planning</h2>
          <p v-if="currentYear" class="text-xs text-gray-600">{{ currentYear.label }}</p>
        </div>
        <div class="flex items-end gap-2">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Filtrer par professeur</label>
            <select
                v-model="selectedTeacherFilter"
                @change="onFilterChange"
                class="px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white"
            >
              <option value="">Tous les professeurs</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">
                {{ t.first_name }} {{ t.last_name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="isLoadingSchedules" class="py-10 text-center text-gray-500 text-xs">
        Chargement du planning…
      </div>
      <ScheduleGrid v-else :schedules="schedules" @select="openClassroom"/>
    </section>

    <ConfirmationModal
        :is-open="showRemoveModal"
        title="Retirer ce professeur"
        :message="teacherToRemove ? `Êtes-vous sûr de vouloir retirer ${teacherToRemove.first_name} ${teacherToRemove.last_name} de l'école ?` : ''"
        confirm-button-text="Retirer"
        cancel-button-text="Annuler"
        @confirm="handleRemove"
        @cancel="closeRemoveModal"
    />

    <EditTeacherModal
        ref="editModalRef"
        :is-open="showEditModal"
        :teacher="teacherToEdit"
        @close="closeEditModal"
        @save="handleEditSave"
    />
  </PageContainer>
</template>
