<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from '#imports'
import LogoText from "~/components/Icons/LogoText.vue"
import schoolService from '~/services/school'
import authService from '~/services/auth'

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

const isSuperAdmin = computed(() => !!user.value?.is_super_admin)

onMounted(async () => {
  if (process.client) {
    try {
      user.value = JSON.parse(localStorage.getItem('auth.user') || 'null')
      schools.value = await schoolService.getSchools()
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
  const redirect = route.query.redirect || '/'
  router.push(redirect)
}

const goToAdmin = () => {
  localStorage.removeItem('current_school_id')
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
          </div>
        </button>

        <div v-if="!isSuperAdmin && schools.length === 0" class="text-center py-3 text-gray-500">
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
