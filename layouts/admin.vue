<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from '#imports'
import LogoText from "~/components/Icons/LogoText.vue"
import Logo from "~/components/Icons/Logo.vue"
import UserDropdown from "~/components/UserDropdown.vue"
import schoolService from '~/services/school'

const router = useRouter()
const user = ref(null)
const userSchools = ref([])
const showSwitchMenu = ref(false)

const initials = computed(() => {
  if (!user.value) return 'AD'
  const f = user.value.first_name || ''
  const l = user.value.last_name || ''
  return (f.charAt(0) + l.charAt(0)).toUpperCase()
})

onMounted(async () => {
  if (process.client) {
    try {
      user.value = JSON.parse(localStorage.getItem('auth.user') || 'null')
      localStorage.removeItem('current_school_id')
      const all = await schoolService.getSchools()
      userSchools.value = all || []
    } catch (e) {
      console.error(e)
    }
  }
})

const switchToSchool = (school) => {
  localStorage.setItem('current_school_id', String(school.id))
  showSwitchMenu.value = false
  router.push('/')
}

const goToSelectSchool = () => {
  router.push('/select-school')
}
</script>

<template>
  <div class="flex bg-gray-blue h-screen antialiased overflow-hidden font-nunito">
    <aside class="flex flex-col bg-white h-screen border-r w-64 font-medium font-montserrat">
      <div class="w-full flex items-center justify-center h-16 border-b">
        <LogoText class="w-36" />
      </div>

      <div class="px-4 py-3 bg-purple-50 border-b border-purple-200 flex items-center gap-2">
        <span class="text-xl">🛡️</span>
        <span class="text-sm font-bold text-purple-900">Administration</span>
      </div>

      <nav class="flex flex-col gap-y-1 mt-2 flex-1 px-2">
        <NuxtLink
          to="/admin"
          class="px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          active-class="bg-gray-100 text-default font-bold"
        >
          Tableau de bord
        </NuxtLink>
        <NuxtLink
          to="/admin/schools"
          class="px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          active-class="bg-gray-100 text-default font-bold"
        >
          Écoles
        </NuxtLink>
      </nav>

      <div class="px-3 pb-4 border-t pt-3">
        <button
          @click="showSwitchMenu = !showSwitchMenu"
          class="w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors text-left"
        >
          Basculer vers une école…
        </button>
        <div v-if="showSwitchMenu" class="mt-1 space-y-1 max-h-48 overflow-y-auto">
          <button
            v-for="s in userSchools"
            :key="s.id"
            @click="switchToSchool(s)"
            class="w-full px-3 py-2 text-sm text-left rounded hover:bg-gray-100"
          >
            {{ s.name }}
          </button>
          <button
            @click="goToSelectSchool"
            class="w-full px-3 py-2 text-xs text-left text-gray-500 underline"
          >
            Voir toutes les écoles…
          </button>
        </div>
      </div>
    </aside>

    <div class="flex flex-col flex-1 overflow-hidden">
      <div class="h-20 flex items-center justify-end pr-12 gap-x-10 flex-shrink-0 bg-white border-b">
        <UserDropdown :user="user" :initials="initials" />
      </div>
      <div class="flex-1 overflow-auto">
        <slot />
      </div>
    </div>
  </div>
</template>
