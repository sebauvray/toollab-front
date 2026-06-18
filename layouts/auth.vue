<script setup>
import LogoText from "~/components/Icons/LogoText.vue";
import Logo from "~/components/Icons/Logo.vue";
import Home from "~/components/Icons/Home.vue";
import Setting from "~/components/Icons/Setting.vue";
import Cursus from "~/components/Icons/Cursus.vue";
import NavLink from "~/components/navigation/NavLink.vue";
import FamilyTLB from "~/components/Icons/Family-TLB.vue";
import CurrencyEuro from "~/components/Icons/CurrencyEuro.vue";
import StudentTLB from "~/components/Icons/Student-TLB.vue";
import TeacherTLB from "~/components/Icons/Teacher-TLB.vue";
import ChartBar from "~/components/Icons/ChartBar.vue";
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from '#imports';
import userService from '~/services/user';
import schoolService from '~/services/school';
import { useSchoolYear } from '~/composables/useSchoolYear';
import { useAuth } from '~/composables/useAuth';
import {
  clearCurrentSchoolRoles,
  groupSchoolRoles,
  hasAnyRole,
  isTeacherOnly,
  SCHOOL_ROLES_UPDATED_EVENT,
  writeCurrentSchoolRoles
} from '~/utils/schoolRoles';

const router = useRouter();
const { logout } = useAuth();

const { years, currentYear, isReadOnly, load: loadYears, switchTo: switchYear, reset: resetYears } = useSchoolYear();
const showYearDropdown = ref(false);
const yearDropdownRef = ref(null);

const user = ref(null);
const schools = ref([]);
const selectedSchool = ref(null);
const showAccountMenu = ref(false);
const accountMenuRef = ref(null);
const isSidebarCollapsed = ref(false);

const initials = computed(() => {
  if (!user.value) return 'NA';

  const firstName = user.value.first_name || '';
  const lastName = user.value.last_name || '';

  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
});

const currentSchoolInitial = computed(() => {
  if (!selectedSchool.value || !selectedSchool.value.name) return '';
  return selectedSchool.value.name.charAt(0).toUpperCase();
});

const currentSchoolName = computed(() => {
  if (!selectedSchool.value) return '';
  return selectedSchool.value.name;
});

const currentSchoolLogo = computed(() => {
  if (!selectedSchool.value || !selectedSchool.value.logo) return '';
  return selectedSchool.value.logo;
});

const logoUrl = computed(() => {
  if (!currentSchoolLogo.value) return '';
  const runtimeConfig = useRuntimeConfig();
  return `${runtimeConfig.public.apiUrl}/storage/${currentSchoolLogo.value}`;
});

const isSuperAdmin = computed(() => !!user.value?.is_super_admin);
const currentRoles = computed(() => selectedSchool.value?.roles || []);
const hasAdminAccess = computed(() => isSuperAdmin.value || hasAnyRole(currentRoles.value, ['director', 'admin']));
const hasTeachingAccess = computed(() => hasAnyRole(currentRoles.value, ['teacher']));
const hasGeneralAccess = computed(() => isSuperAdmin.value || !isTeacherOnly(currentRoles.value));

const currentRole = computed(() => {
  if (isSuperAdmin.value) return 'Super-admin';
  return currentRoles.value.map(role => role.label).join(' · ');
});

const loadUserSchools = async () => {
  try {
    const [allSchools, rolesResponse] = await Promise.all([
      schoolService.getSchools(),
      userService.getUserRoles(user.value.id),
    ]);

    const roleMap = groupSchoolRoles(rolesResponse?.roles?.schools || []);

    schools.value = (allSchools || []).map((s) => ({
      id: s.id,
      name: s.name,
      logo: s.logo || null,
      roles: roleMap[s.id] || [],
    }));

    const savedSchoolId = localStorage.getItem('current_school_id');
    if (savedSchoolId) {
      const savedSchool = schools.value.find(s => s.id === parseInt(savedSchoolId, 10));
      if (savedSchool) {
        selectedSchool.value = savedSchool;
      } else if (schools.value.length > 0) {
        selectedSchool.value = schools.value[0];
        localStorage.setItem('current_school_id', String(schools.value[0].id));
      }
    } else if (schools.value.length === 1) {
      selectedSchool.value = schools.value[0];
      localStorage.setItem('current_school_id', String(schools.value[0].id));
    }

    if (selectedSchool.value) {
      writeCurrentSchoolRoles(selectedSchool.value.roles);
      try {
        await loadYears();
      } catch (e) {
        console.error('Erreur lors du chargement des années scolaires:', e);
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des écoles:', error);
  }
};

const selectSchool = (school) => {
  showAccountMenu.value = false;
  if (selectedSchool.value?.id === school.id) return;
  selectedSchool.value = school;
  localStorage.setItem('current_school_id', String(school.id));
  writeCurrentSchoolRoles(school.roles);
  resetYears();
  if (process.client) {
    window.location.reload();
  }
};

const selectYear = (yearId) => {
  showYearDropdown.value = false;
  switchYear(yearId);
};

const goToAdmin = () => {
  showAccountMenu.value = false;
  localStorage.removeItem('current_school_id');
  clearCurrentSchoolRoles();
  router.push('/admin');
};

const handleLogout = async () => {
  showAccountMenu.value = false;
  try {
    await logout();
    router.push('/login');
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
  }
};

const checkScreenSize = () => {
  if (window.innerWidth < 1280) {
    isSidebarCollapsed.value = true;
  } else {
    isSidebarCollapsed.value = false;
  }
};

const handleClickOutside = (event) => {
  if (showYearDropdown.value && yearDropdownRef.value && !yearDropdownRef.value.contains(event.target)) {
    showYearDropdown.value = false;
  }
  if (showAccountMenu.value && accountMenuRef.value && !accountMenuRef.value.contains(event.target)) {
    showAccountMenu.value = false;
  }
};

const handleSchoolRolesUpdated = (event) => {
  const updatedSchoolId = Number(event.detail?.schoolId);
  const updatedRoles = Array.isArray(event.detail?.roles) ? event.detail.roles : [];
  if (!updatedSchoolId) return;

  schools.value = schools.value.map(school =>
      school.id === updatedSchoolId ? {...school, roles: updatedRoles} : school
  );

  if (selectedSchool.value?.id === updatedSchoolId) {
    selectedSchool.value = {...selectedSchool.value, roles: updatedRoles};
    writeCurrentSchoolRoles(updatedRoles);
  }
};

onMounted(async () => {
  if (process.client) {
    const userJson = localStorage.getItem('auth.user');
    if (userJson) {
      try {
        user.value = JSON.parse(userJson);
        await loadUserSchools();
      } catch (e) {
        console.error('Erreur lors de la récupération des données utilisateur', e);
      }
    }

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener(SCHOOL_ROLES_UPDATED_EVENT, handleSchoolRolesUpdated);
    document.addEventListener('click', handleClickOutside);
  }
});

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('resize', checkScreenSize);
    window.removeEventListener(SCHOOL_ROLES_UPDATED_EVENT, handleSchoolRolesUpdated);
    document.removeEventListener('click', handleClickOutside);
  }
});
</script>

<template>
  <div class="flex bg-gray-blue h-screen antialiased overflow-hidden">
    <aside class="flex flex-col bg-white h-screen border-r font-medium font-montserrat transition-all duration-300"
           :class="isSidebarCollapsed ? 'w-16' : 'w-52'">
      <div class="w-full flex items-center justify-center h-16">
        <Logo v-if="isSidebarCollapsed" class="w-6 h-6" />
        <LogoText v-else class="w-36" />
      </div>
      <nav class="inline-flex flex-col gap-y-1.5 mt-1.5 flex-1">
        <NavLink v-if="hasGeneralAccess" to="/" :icon="Home" text="Accueil" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasGeneralAccess" to="/family" :icon="FamilyTLB" text="Familles" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/cursus" :icon="Cursus" text="Cursus" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/classes" :icon="StudentTLB" text="Classes" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/professeurs" :icon="TeacherTLB" text="Professeurs" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/tarification" :icon="CurrencyEuro" text="Tarification" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/statistiques" :icon="ChartBar" text="Statistiques" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasTeachingAccess" to="/professeur/classes" :icon="StudentTLB" text="Mes classes" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasTeachingAccess" to="/professeur/planning" :icon="Cursus" text="Mon planning" :collapsed="isSidebarCollapsed" />
      </nav>

      <div class="mb-3" :class="isSidebarCollapsed ? 'px-1.5' : 'px-3'">
        <div v-if="user" class="relative" ref="accountMenuRef">
          <button
              @click="showAccountMenu = !showAccountMenu"
              class="w-full flex items-center gap-x-1.5 px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              :class="isSidebarCollapsed ? 'justify-center px-1.5' : ''"
              :title="isSidebarCollapsed ? `${user.first_name} ${user.last_name} — ${currentSchoolName}` : ''"
          >
            <div v-if="currentSchoolLogo" class="w-8 h-8 flex-shrink-0">
              <img :src="logoUrl" alt="Logo" class="w-full h-full object-contain rounded-full" />
            </div>
            <div v-else class="w-8 h-8 flex items-center justify-center rounded-full bg-primary flex-shrink-0">
              <span class="text-white text-xs font-semibold">{{ currentSchoolInitial || initials }}</span>
            </div>
            <div v-if="!isSidebarCollapsed" class="flex-1 min-w-0 text-left">
              <div class="text-sm text-gray-800 truncate">{{ currentSchoolName || `${user.first_name} ${user.last_name}` }}</div>
            </div>
            <svg v-if="!isSidebarCollapsed" class="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            </svg>
          </button>

          <div
              v-if="showAccountMenu"
              class="absolute bottom-full mb-1 bg-white border rounded-lg shadow-lg z-50 overflow-hidden"
              :class="isSidebarCollapsed ? 'left-full ml-1.5 bottom-0 mb-0 w-64' : 'left-0 right-0'"
          >
            <div class="flex items-center gap-x-1.5 px-2 py-2 border-b">
              <div class="w-9 h-9 flex items-center justify-center rounded-full bg-primary flex-shrink-0">
                <span class="text-white text-xs font-semibold">{{ initials }}</span>
              </div>
              <div class="flex-1 min-w-0 text-left">
                <div class="text-sm text-gray-800 truncate">{{ user.first_name }} {{ user.last_name }}</div>
                <div class="text-xs text-gray-500 truncate">
                  <span v-if="currentRole">{{ currentRole }}</span>
                  <span v-if="currentRole && user.email"> · </span>
                  <span v-if="user.email">{{ user.email }}</span>
                </div>
              </div>
            </div>

            <div v-if="schools.length > 1 || isSuperAdmin" class="max-h-64 overflow-y-auto border-b">
              <button
                  v-if="isSuperAdmin"
                  @click="goToAdmin"
                  class="w-full flex items-center gap-x-1.5 px-2 py-1.5 hover:bg-purple-50 transition-colors"
              >
                <div class="w-9 h-9 flex items-center justify-center rounded-full bg-purple-600 flex-shrink-0">
                  <span class="text-white text-xs">🛡</span>
                </div>
                <div class="flex-1 min-w-0 text-left">
                  <div class="text-xs font-bold text-purple-900 truncate">Administration Toollab</div>
                  <div class="text-xs text-purple-700 truncate">Mode plateforme</div>
                </div>
              </button>
              <button
                  v-for="school in schools"
                  :key="school.id"
                  @click="selectSchool(school)"
                  class="w-full flex items-center gap-x-1.5 px-2 py-1.5 hover:bg-gray-100 transition-colors"
                  :class="{ 'bg-gray-50': selectedSchool?.id === school.id }"
              >
                <div v-if="school.logo" class="w-9 h-9 flex-shrink-0">
                  <img
                    :src="`${useRuntimeConfig().public.apiUrl}/storage/${school.logo}`"
                    alt="Logo"
                    class="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div v-else class="w-9 h-9 flex items-center justify-center rounded-full bg-primary flex-shrink-0">
                  <span class="text-white text-xs font-semibold">{{
                      school.name.charAt(0).toUpperCase()
                    }}</span>
                </div>
                <div class="flex-1 min-w-0 text-left">
                  <div class="text-sm text-gray-800 truncate">{{ school.name }}</div>
                  <div class="text-xs truncate text-gray-500">
                    {{ school.roles.length ? school.roles.map(role => role.label).join(' · ') : (isSuperAdmin ? 'Super-admin' : '—') }}
                  </div>
                </div>
                <svg
                    v-if="selectedSchool?.id === school.id"
                    class="w-3.5 h-3.5 text-primary flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <div class="py-1">
              <NuxtLink
                  to="/settings"
                  @click="showAccountMenu = false"
                  class="flex items-center gap-x-1.5 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Setting class="size-4 text-gray-500" />
                <span>Paramètres</span>
              </NuxtLink>
              <button
                  @click="handleLogout"
                  class="w-full flex items-center gap-x-1.5 px-2 py-1.5 text-xs text-red-600 hover:bg-gray-100 transition-colors"
              >
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div class="h-16 flex items-center justify-end pr-3 sm:pr-8 flex-shrink-0">
        <div class="flex items-center gap-x-3">
          <div v-if="years.length > 0" class="relative" ref="yearDropdownRef">
            <button
                @click="showYearDropdown = !showYearDropdown"
                class="inline-flex items-center gap-x-1.5 px-2 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 transition-colors text-xs"
                :class="isReadOnly ? 'border-amber-400 text-amber-700' : 'text-gray-700'"
            >
              <span class="font-medium">{{ currentYear?.label || 'Année' }}</span>
              <span v-if="isReadOnly" class="text-xs uppercase tracking-wide">archivée</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div
                v-if="showYearDropdown"
                class="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <div class="max-h-72 overflow-y-auto">
                <button
                    v-for="year in years"
                    :key="year.id"
                    @click="selectYear(year.id)"
                    class="w-full flex items-center justify-between gap-x-1.5 px-2 py-1.5 hover:bg-gray-100 transition-colors text-left"
                    :class="{ 'bg-gray-50': currentYear?.id === year.id }"
                >
                  <span class="flex flex-col">
                    <span class="text-xs text-gray-800">{{ year.label }}</span>
                    <span class="text-xs text-gray-500">
                      <template v-if="year.is_active">Année active</template>
                      <template v-else-if="year.closed_at">Clôturée — lecture seule</template>
                      <template v-else>Lecture seule</template>
                    </span>
                  </span>
                  <svg
                      v-if="currentYear?.id === year.id"
                      class="w-3.5 h-3.5 text-primary flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
              <NuxtLink
                  v-if="hasAdminAccess"
                  to="/annees-scolaires"
                  @click="showYearDropdown = false"
                  class="flex items-center gap-x-1.5 px-2 py-1.5 border-t bg-gray-50 hover:bg-gray-100 transition-colors text-xs text-gray-700"
              >
                <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Gérer les années scolaires</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isReadOnly" class="bg-amber-50 border-y border-amber-200 text-amber-800 text-xs px-5 py-1.5 flex items-center gap-x-1.5">
        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Vous consultez l'année <strong>{{ currentYear?.label }}</strong> en lecture seule. Toute modification est désactivée.</span>
      </div>

      <div class="flex-1 overflow-auto overscroll-contain">
        <slot />
      </div>
    </div>
  </div>
</template>
