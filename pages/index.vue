<script setup>
import {ref, onMounted} from 'vue'
import AuthGuard from '~/components/auth/AuthGuard.vue'
import SearchInput from "~/components/form/SearchInput.vue"
import {useAuth} from '~/composables/useAuth'
import userService from '~/services/user'

usePageTitle('Accueil')
useSeoMeta({
  description: 'Plateforme de gestion des inscriptions pour écoles et instituts. Gérez facilement vos élèves, classes et paiements.',
  ogTitle: 'Toollab - Gestion des inscriptions',
  ogDescription: 'Gérez facilement les inscriptions de votre école ou institut avec Toollab.'
})

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Dashboard'
  }
})

const {user} = useAuth()
const resolved = ref(false)
const isTeacher = ref(false)

if (process.client) {
  const cachedRole = localStorage.getItem('current_school_role')
  if (cachedRole === 'Professeur') {
    isTeacher.value = true
    navigateTo('/professeur/classes')
  } else if (cachedRole) {
    resolved.value = true
  }
}

onMounted(async () => {
  if (!process.client || !user.value || isTeacher.value || resolved.value) return
  try {
    const schoolId = parseInt(localStorage.getItem('current_school_id') || '0', 10)
    if (!schoolId) return
    const response = await userService.getUserRoles(user.value.id)
    const current = response.roles?.schools?.find(s => s.context?.id === schoolId)
    if (current?.role === 'Professeur') {
      isTeacher.value = true
      localStorage.setItem('current_school_role', 'Professeur')
      navigateTo('/professeur/classes')
      return
    }
  } catch (e) {
    console.error('Erreur détection rôle prof:', e)
  } finally {
    resolved.value = true
  }
})
</script>

<template>
  <AuthGuard>
    <ClientOnly>
      <div v-if="resolved && !isTeacher" class="flex flex-col items-center justify-center w-full min-h-full">
        <div class="flex flex-col items-center gap-6 md:gap-10 w-full py-6 md:pt-16 font-montserrat">
          <h2 class="font-bold text-default text-2xl md:text-3xl">Recherche</h2>
          <SearchInput class="w-11/12 sm:w-2/3 lg:w-1/2" />
        </div>
        <div class="flex gap-x-3"></div>
      </div>
    </ClientOnly>
  </AuthGuard>
</template>
