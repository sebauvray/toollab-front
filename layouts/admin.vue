<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from '#imports'
import LogoText from "~/components/Icons/LogoText.vue"
import Setting from "~/components/Icons/Setting.vue"
import schoolService from '~/services/school'
import { useAuth } from '~/composables/useAuth'
import { clearCurrentSchoolRoles } from '~/utils/schoolRoles'

const router = useRouter()
const { logout } = useAuth()
const user = ref(null)
const userSchools = ref([])
const showAccountMenu = ref(false)
const accountMenuRef = ref(null)

const initials = computed(() => {
  if (!user.value) return 'AD'
  const f = user.value.first_name || ''
  const l = user.value.last_name || ''
  return (f.charAt(0) + l.charAt(0)).toUpperCase()
})

const handleClickOutside = (event) => {
  if (showAccountMenu.value && accountMenuRef.value && !accountMenuRef.value.contains(event.target)) {
    showAccountMenu.value = false
  }
}

onMounted(async () => {
  if (process.client) {
    try {
      user.value = JSON.parse(localStorage.getItem('auth.user') || 'null')
      localStorage.removeItem('current_school_id')
      clearCurrentSchoolRoles()
      const all = await schoolService.getSchools()
      userSchools.value = all || []
    } catch (e) {
      console.error(e)
    }
    document.addEventListener('click', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  if (process.client) {
    document.removeEventListener('click', handleClickOutside)
  }
})

const switchToSchool = (school) => {
  localStorage.setItem('current_school_id', String(school.id))
  showAccountMenu.value = false
  router.push('/')
}

const goToSelectSchool = () => {
  showAccountMenu.value = false
  router.push('/select-school')
}

const handleLogout = async () => {
  showAccountMenu.value = false
  try {
    await logout()
    router.push('/login')
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
  }
}
</script>

<template>
  <div class="flex bg-gray-blue h-screen antialiased overflow-hidden font-nunito">
    <aside class="flex flex-col bg-white h-screen border-r w-64 font-medium font-montserrat">
      <div class="w-full flex items-center justify-center h-16 border-b">
        <LogoText class="w-36" />
      </div>

      <div class="px-3 py-2 bg-purple-50 border-b border-purple-200 flex items-center gap-1.5">
        <span class="text-lg">🛡️</span>
        <span class="text-xs font-bold text-purple-900">Administration</span>
      </div>

      <nav class="flex flex-col gap-y-1 mt-1.5 flex-1 px-1.5">
        <NuxtLink
          to="/admin"
          class="px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          active-class="bg-gray-100 text-default font-bold"
        >
          Tableau de bord
        </NuxtLink>
        <NuxtLink
          to="/admin/schools"
          class="px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          active-class="bg-gray-100 text-default font-bold"
        >
          Écoles
        </NuxtLink>
      </nav>

      <div class="mb-3 px-3">
        <div v-if="user" class="relative" ref="accountMenuRef">
          <button
              @click="showAccountMenu = !showAccountMenu"
              class="w-full flex items-center gap-x-2 px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <div class="w-8 h-8 flex items-center justify-center rounded-full bg-primary flex-shrink-0">
              <span class="text-white text-xs font-semibold font-montserrat">{{ initials }}</span>
            </div>
            <div class="flex-1 min-w-0 text-left">
              <div class="text-sm text-gray-800 truncate">{{ user.first_name }} {{ user.last_name }}</div>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            </svg>
          </button>

          <div
              v-if="showAccountMenu"
              class="absolute bottom-full mb-2 left-0 w-72 max-w-[calc(100vw-1.5rem)] bg-white border border-[#E6EFF5] rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <!-- Profil -->
            <div class="flex items-center gap-x-3 px-4 py-3.5 border-b border-[#E6EFF5]">
              <div class="w-10 h-10 flex items-center justify-center rounded-full bg-primary flex-shrink-0">
                <span class="text-white text-sm font-semibold font-montserrat">{{ initials }}</span>
              </div>
              <div class="flex-1 min-w-0 text-left">
                <div class="text-sm font-semibold text-default font-montserrat truncate">{{ user.first_name }} {{ user.last_name }}</div>
                <div v-if="user.email" class="text-xs text-placeholder truncate">{{ user.email }}</div>
              </div>
            </div>

            <!-- Établissements -->
            <div class="py-2 max-h-72 overflow-y-auto border-b border-[#E6EFF5]">
              <p class="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-placeholder">Basculer vers une école</p>
              <div class="px-1.5 space-y-0.5">
                <button
                    v-for="school in userSchools"
                    :key="school.id"
                    @click="switchToSchool(school)"
                    class="w-full flex items-center gap-x-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-blue transition-colors"
                >
                  <div v-if="school.logo" class="w-9 h-9 flex-shrink-0">
                    <img
                      :src="`${useRuntimeConfig().public.apiUrl}/storage/${school.logo}`"
                      alt="Logo"
                      class="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div v-else class="w-9 h-9 flex items-center justify-center rounded-lg bg-primary flex-shrink-0">
                    <span class="text-white text-sm font-semibold">{{ school.name.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0 text-left">
                    <div class="text-sm font-medium text-default truncate">{{ school.name }}</div>
                  </div>
                </button>
                <button
                    @click="goToSelectSchool"
                    class="w-full text-left px-2.5 py-2 rounded-lg text-xs text-placeholder hover:bg-gray-blue transition-colors"
                >
                  Voir toutes les écoles…
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="p-1.5">
              <NuxtLink
                  to="/settings"
                  @click="showAccountMenu = false"
                  class="flex items-center gap-x-2.5 px-2.5 py-2 rounded-lg text-sm text-default hover:bg-gray-blue transition-colors"
              >
                <Setting class="size-[18px] text-placeholder" />
                <span>Paramètres</span>
              </NuxtLink>
              <button
                  @click="handleLogout"
                  class="w-full flex items-center gap-x-2.5 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg class="size-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <div class="flex flex-col flex-1 overflow-hidden">
      <div class="flex-1 overflow-auto">
        <slot />
      </div>
    </div>
  </div>
</template>
