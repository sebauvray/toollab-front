<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from '#imports'
import LogoText from "~/components/Icons/LogoText.vue"
import Setting from "~/components/Icons/Setting.vue"
import schoolService from '~/services/school'
import { useAuth } from '~/composables/useAuth'
import { clearCurrentSchoolRoles } from '~/utils/schoolRoles'
import { useAdminCounters } from '~/composables/useAdminCounters'

const NAV = [
  {
    title: 'Plateforme',
    items: [
      { to: '/admin', label: 'Tableau de bord', exact: true, icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
      { to: '/admin/schools', label: 'Écoles', counter: 'schools_to_watch', counterLabel: 'écoles à surveiller', icon: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342' },
      { to: '/admin/users', label: 'Utilisateurs', counter: 'pending_invitations', counterLabel: 'invitations en attente', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' }
    ]
  },
  {
    title: 'Technique',
    items: [
      { to: '/admin/errors', label: 'Erreurs', counter: 'open_errors', counterLabel: 'erreurs ouvertes', counterTone: 'alert', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
      { to: '/admin/audit', label: 'Audit', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z' },
      { to: '/admin/database', label: 'Base de données', icon: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125' }
    ]
  }
]

const router = useRouter()
const { logout } = useAuth()
const user = ref(null)
const userSchools = ref([])
const showAccountMenu = ref(false)
const accountMenuRef = ref(null)
const { counters, refreshCounters } = useAdminCounters()
const sidebarOpen = ref(false)
const route = useRoute()
// Le tiroir se referme à chaque navigation
watch(() => route.fullPath, () => { sidebarOpen.value = false })
const totalAlerts = computed(() => (counters.value.open_errors || 0) + (counters.value.schools_to_watch || 0))

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
    refreshCounters()
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
    <!-- Mobile : la barre latérale devient un tiroir -->
    <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-black/30 lg:hidden" aria-hidden="true" @click="sidebarOpen = false"></div>
    <aside
      id="admin-sidebar"
      class="fixed inset-y-0 left-0 z-50 flex flex-col bg-white h-screen border-r border-[#E6EFF5] w-64 font-medium font-montserrat transition-transform lg:static lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'"
    >
      <div class="w-full flex flex-col items-center justify-center py-4 border-b border-[#E6EFF5]">
        <LogoText class="w-32" />
        <span class="text-[10px] font-semibold uppercase tracking-wider text-placeholder mt-1.5">Administration</span>
      </div>

      <nav class="flex flex-col flex-1 px-2 py-3 gap-y-4 overflow-y-auto" aria-label="Administration">
        <div v-for="group in NAV" :key="group.title">
          <p class="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-placeholder">{{ group.title }}</p>
          <div class="flex flex-col gap-y-0.5">
            <NuxtLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-x-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-blue transition-colors"
              :active-class="item.exact ? '' : 'bg-gray-100 !text-default font-semibold'"
              :exact-active-class="item.exact ? 'bg-gray-100 !text-default font-semibold' : ''"
            >
              <svg class="size-[18px] shrink-0 text-placeholder" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="flex-1">{{ item.label }}</span>
              <span
                v-if="item.counter && counters[item.counter]"
                class="min-w-[20px] px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-center tabular-nums"
                :class="item.counterTone === 'alert' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'"
                :aria-label="`${counters[item.counter]} ${item.counterLabel}`"
              >{{ counters[item.counter] }}</span>
            </NuxtLink>
          </div>
        </div>
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

    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <header class="lg:hidden flex items-center gap-3 h-14 px-4 bg-white border-b border-[#E6EFF5] font-montserrat shrink-0">
        <button
          type="button"
          class="inline-flex items-center justify-center w-9 h-9 -ml-2 rounded-lg text-default hover:bg-gray-100"
          aria-controls="admin-sidebar"
          :aria-expanded="sidebarOpen"
          aria-label="Ouvrir le menu"
          @click="sidebarOpen = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <LogoText class="w-24" />
        <span class="text-[10px] font-semibold uppercase tracking-wider text-placeholder">Admin</span>
        <span v-if="totalAlerts" class="ml-auto min-w-[20px] px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-center bg-red-50 text-red-700 tabular-nums" :aria-label="`${totalAlerts} point(s) à traiter`">{{ totalAlerts }}</span>
      </header>
      <div class="flex-1 overflow-auto">
        <slot />
      </div>
    </div>
  </div>
</template>
