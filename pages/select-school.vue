<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from '#imports'
import LogoText from "~/components/Icons/LogoText.vue"
import schoolService from '~/services/school'
import authService from '~/services/auth'
import userService from '~/services/user'
import invitationsService from '~/services/invitations'
import { clearCurrentSchoolRoles, groupSchoolRoles, setActiveSchoolRole, writeCurrentSchoolRoles } from '~/utils/schoolRoles'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

usePageTitle('Sélection école')

const router = useRouter()
const route = useRoute()

const schools = ref([])
const isLoading = ref(true)
const errorMsg = ref('')
const user = ref(null)
const schoolRoles = ref({})
const pendingInvitations = ref([])
const invitationProcessing = ref(null)
const invitationError = ref('')

const isSuperAdmin = computed(() => !!user.value?.is_super_admin)

onMounted(async () => {
  if (process.client) {
    try {
      user.value = JSON.parse(localStorage.getItem('auth.user') || 'null')
      const [allSchools, rolesResponse, invitations] = await Promise.all([
        schoolService.getSchools(),
        userService.getUserRoles(user.value.id),
        invitationsService.getMine()
      ])
      schools.value = allSchools || []
      schoolRoles.value = groupSchoolRoles(rolesResponse?.roles?.schools || [])
      pendingInvitations.value = invitations || []
    } catch (e) {
      console.error(e)
      errorMsg.value = 'Erreur lors du chargement des écoles.'
    } finally {
      isLoading.value = false
    }
  }
})

const selectSchool = (school) => {
  localStorage.setItem('current_school_id', String(school.id))
  const roles = schoolRoles.value[school.id] || []
  writeCurrentSchoolRoles(roles)
  // Entrée dans l'école : on active le premier rôle (par priorité) par défaut.
  setActiveSchoolRole(roles[0]?.slug || '')
  const redirect = route.query.redirect || '/'
  router.push(redirect)
}

const refreshSchoolsAndRoles = async () => {
  const [allSchools, rolesResponse] = await Promise.all([
    schoolService.getSchools(),
    userService.getUserRoles(user.value.id)
  ])
  schools.value = allSchools || []
  schoolRoles.value = groupSchoolRoles(rolesResponse?.roles?.schools || [])
}

const acceptInvitation = async (invitation) => {
  if (invitationProcessing.value) return
  invitationError.value = ''
  invitationProcessing.value = invitation.school_id

  try {
    await invitationsService.accept(invitation.school_id)
    pendingInvitations.value = pendingInvitations.value.filter(item => item.school_id !== invitation.school_id)
    await refreshSchoolsAndRoles()

    const acceptedSchool = schools.value.find(school => Number(school.id) === Number(invitation.school_id))
    if (acceptedSchool) selectSchool(acceptedSchool)
  } catch (error) {
    invitationError.value = error.response?.data?.message || 'Impossible d\'accepter cette invitation.'
  } finally {
    invitationProcessing.value = null
  }
}

const declineInvitation = async (invitation) => {
  if (invitationProcessing.value) return
  invitationError.value = ''
  invitationProcessing.value = invitation.school_id

  try {
    await invitationsService.decline(invitation.school_id)
    pendingInvitations.value = pendingInvitations.value.filter(item => item.school_id !== invitation.school_id)
  } catch (error) {
    invitationError.value = error.response?.data?.message || 'Impossible de refuser cette invitation.'
  } finally {
    invitationProcessing.value = null
  }
}

const goToAdmin = () => {
  localStorage.removeItem('current_school_id')
  clearCurrentSchoolRoles()
  router.push('/admin')
}

const handleLogout = async () => {
  await authService.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex flex-col items-center justify-start w-full h-full min-h-screen font-nunito bg-gray-blue">
    <LogoText class="my-[5vh]" />
    <div class="flex flex-col items-center bg-white rounded-3xl border w-[85%] sm:w-[70%] lg:w-[50%] 2xl:w-[35%] shadow-xl p-6">
      <h2 class="text-default text-xl font-bold mb-1.5">Bienvenue {{ user?.first_name }}</h2>
      <p class="text-default/60 text-center mb-5">Sélectionnez l'école sur laquelle vous voulez travailler.</p>

      <div v-if="isLoading" class="py-6">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-default"></div>
      </div>

      <div v-else-if="errorMsg" class="w-full p-3 mb-3 text-white bg-red-500 rounded">
        {{ errorMsg }}
      </div>

      <div v-else class="w-full space-y-2">
        <div v-if="invitationError" class="p-3 mb-3 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg">
          {{ invitationError }}
        </div>

        <div
          v-for="invitation in pendingInvitations"
          :key="`invitation-${invitation.school_id}`"
          class="p-4 mb-3 border border-blue-200 bg-blue-50 rounded-lg"
        >
          <div class="font-semibold text-blue-950">
            Invitation de {{ invitation.school_name }}
          </div>
          <div v-if="invitation.roles?.length" class="mt-1 text-xs text-blue-800">
            Rôle{{ invitation.roles.length > 1 ? 's' : '' }} proposé{{ invitation.roles.length > 1 ? 's' : '' }} :
            {{ invitation.roles.join(' · ') }}
          </div>
          <div class="flex gap-2 mt-3">
            <button
              type="button"
              :disabled="invitationProcessing === invitation.school_id"
              class="px-3 py-1.5 text-sm font-semibold text-white bg-primary rounded-md disabled:opacity-60"
              @click="acceptInvitation(invitation)"
            >
              Accepter
            </button>
            <button
              type="button"
              :disabled="invitationProcessing === invitation.school_id"
              class="px-3 py-1.5 text-sm font-semibold text-blue-900 bg-white border border-blue-200 rounded-md disabled:opacity-60"
              @click="declineInvitation(invitation)"
            >
              Refuser
            </button>
          </div>
        </div>

        <button
          v-if="isSuperAdmin"
          @click="goToAdmin"
          class="w-full p-3 border-2 border-purple-300 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left flex items-center gap-2"
        >
          <span class="text-xl">🛡️</span>
          <div>
            <div class="font-bold text-purple-900">Administration Toollab</div>
            <div class="text-xs text-purple-700">Mode super-admin (gestion plateforme)</div>
          </div>
        </button>

        <button
          v-for="school in schools"
          :key="school.id"
          @click="selectSchool(school)"
          class="w-full p-3 border border-gray-300 hover:border-default hover:bg-gray-50 rounded-lg transition-colors text-left flex items-center gap-2"
        >
          <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
            {{ school.name?.charAt(0)?.toUpperCase() }}
          </div>
          <div>
            <div class="font-semibold">{{ school.name }}</div>
            <div class="text-xs text-gray-500">{{ school.city || school.country || '' }}</div>
            <div v-if="schoolRoles[school.id]?.length" class="text-xs text-gray-500">
              {{ schoolRoles[school.id].map(role => role.label).join(' · ') }}
            </div>
          </div>
        </button>

        <div v-if="!isSuperAdmin && schools.length === 0 && pendingInvitations.length === 0" class="text-center py-3 text-gray-500">
          Vous n'avez accès à aucune école.
        </div>

        <button
          @click="handleLogout"
          class="w-full mt-5 py-1.5 text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  </div>
</template>
