<script setup>
import LogoText from "~/components/Icons/LogoText.vue";
import Logo from "~/components/Icons/Logo.vue";
import Home from "~/components/Icons/Home.vue";
import Setting from "~/components/Icons/Setting.vue";
import Cursus from "~/components/Icons/Cursus.vue";
import NavLink from "~/components/navigation/NavLink.vue";
import FamilyTLB from "~/components/Icons/Family-TLB.vue";
import UserDropdown from "~/components/UserDropdown.vue";
import CurrencyEuro from "~/components/Icons/CurrencyEuro.vue";
import StudentTLB from "~/components/Icons/Student-TLB.vue";
import TeacherTLB from "~/components/Icons/Teacher-TLB.vue";
import ChartBar from "~/components/Icons/ChartBar.vue";
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from '#imports';
import userService from '~/services/user';
import schoolService from '~/services/school';
import { useSchoolYear } from '~/composables/useSchoolYear';

const router = useRouter();

const { years, currentYear, isReadOnly, load: loadYears, switchTo: switchYear, reset: resetYears } = useSchoolYear();
const showYearDropdown = ref(false);
const yearDropdownRef = ref(null);

const user = ref(null);
const schools = ref([]);
const selectedSchool = ref(null);
const showSchoolDropdown = ref(false);
const schoolDropdownRef = ref(null);
const hasAdminAccess = ref(false);
const isTeacher = ref(false);
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

const checkAdminAccess = () => {
  if (isSuperAdmin.value) {
    hasAdminAccess.value = true;
    isTeacher.value = false;
    return;
  }
  if (selectedSchool.value && schools.value.length > 0) {
    const currentSchoolRole = schools.value.find(s => s.id === selectedSchool.value.id);
    if (currentSchoolRole) {
      hasAdminAccess.value = currentSchoolRole.role === 'Directeur' || currentSchoolRole.role === 'Administrateur';
      isTeacher.value = currentSchoolRole.role === 'Professeur';
    }
  }
};

const loadUserSchools = async () => {
  try {
    const [allSchools, rolesResponse] = await Promise.all([
      schoolService.getSchools(),
      userService.getUserRoles(user.value.id),
    ]);

    const roleMap = {};
    if (rolesResponse?.roles?.schools) {
      rolesResponse.roles.schools.forEach((r) => {
        roleMap[r.context.id] = r.role;
      });
    }

    schools.value = (allSchools || []).map((s) => ({
      id: s.id,
      name: s.name,
      logo: s.logo || null,
      role: roleMap[s.id] || (isSuperAdmin.value ? 'Super-admin' : null),
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

    checkAdminAccess();

    if (selectedSchool.value) {
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
  selectedSchool.value = school;
  showSchoolDropdown.value = false;
  localStorage.setItem('current_school_id', String(school.id));
  resetYears();
  checkAdminAccess();
  if (process.client) {
    window.location.reload();
  }
};

const selectYear = (yearId) => {
  showYearDropdown.value = false;
  switchYear(yearId);
};

const goToAdmin = () => {
  showSchoolDropdown.value = false;
  localStorage.removeItem('current_school_id');
  router.push('/admin');
};

const checkScreenSize = () => {
  if (window.innerWidth < 1024) {
    isSidebarCollapsed.value = true;
  } else {
    isSidebarCollapsed.value = false;
  }
};

const handleClickOutside = (event) => {
  if (showYearDropdown.value && yearDropdownRef.value && !yearDropdownRef.value.contains(event.target)) {
    showYearDropdown.value = false;
  }
  if (showSchoolDropdown.value && schoolDropdownRef.value && !schoolDropdownRef.value.contains(event.target)) {
    showSchoolDropdown.value = false;
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
    document.addEventListener('click', handleClickOutside);
  }
});

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('resize', checkScreenSize);
    document.removeEventListener('click', handleClickOutside);
  }
});
</script>

<template>
  <div class="flex bg-gray-blue h-screen antialiased overflow-hidden">
    <aside class="flex flex-col bg-white h-screen border-r font-medium font-montserrat transition-all duration-300"
           :class="isSidebarCollapsed ? 'w-20' : 'w-64'">
      <div class="w-full flex items-center justify-center h-16">
        <Logo v-if="isSidebarCollapsed" class="w-8 h-8" />
        <LogoText v-else class="w-36" />
      </div>
      <nav class="inline-flex flex-col gap-y-2 mt-2 flex-1">
        <NavLink to="/" :icon="Home" text="Accueil" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="!isTeacher" to="/family" :icon="FamilyTLB" text="Familles" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/cursus" :icon="Cursus" text="Cursus" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/classes" :icon="StudentTLB" text="Classes" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/professeurs" :icon="TeacherTLB" text="Professeurs" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/tarification" :icon="CurrencyEuro" text="Tarification" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="hasAdminAccess" to="/statistiques" :icon="ChartBar" text="Statistiques" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="isTeacher" to="/professeur/classes" :icon="StudentTLB" text="Mes classes" :collapsed="isSidebarCollapsed" />
        <NavLink v-if="isTeacher" to="/professeur/planning" :icon="Cursus" text="Mon planning" :collapsed="isSidebarCollapsed" />
      </nav>

      <div class="mb-4" :class="isSidebarCollapsed ? 'px-2' : 'px-4'">
        <div v-if="schools.length <= 1 && !isSuperAdmin && currentSchoolName" class="flex items-center gap-x-2 py-2"
             :class="isSidebarCollapsed ? 'justify-center' : ''">
          <div v-if="currentSchoolLogo" class="w-10 h-10 flex-shrink-0">
            <img :src="logoUrl" alt="Logo" class="w-full h-full object-contain rounded-full" />
          </div>
          <div v-else class="w-10 h-10 flex items-center justify-center rounded-full bg-primary flex-shrink-0">
            <span class="text-white text-sm font-semibold">{{ currentSchoolInitial }}</span>
          </div>
          <div v-if="!isSidebarCollapsed" class="text-base text-gray-800 truncate">{{ currentSchoolName }}</div>
        </div>

        <div v-else-if="schools.length > 1 || isSuperAdmin" class="relative" ref="schoolDropdownRef">
          <button
              @click="showSchoolDropdown = !showSchoolDropdown"
              class="w-full flex items-center gap-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              :class="isSidebarCollapsed ? 'justify-center px-2' : ''"
          >
            <div v-if="currentSchoolLogo" class="w-10 h-10 flex-shrink-0">
              <img :src="logoUrl" alt="Logo" class="w-full h-full object-contain rounded-full" />
            </div>
            <div v-else class="w-10 h-10 flex items-center justify-center rounded-full bg-primary flex-shrink-0">
              <span class="text-white text-sm font-semibold">{{ currentSchoolInitial }}</span>
            </div>
            <div v-if="!isSidebarCollapsed" class="flex-1 min-w-0 text-left">
              <div class="text-base text-gray-800 truncate">{{ currentSchoolName }}</div>
            </div>
            <svg v-if="!isSidebarCollapsed" class="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          <div
              v-if="showSchoolDropdown"
              class="absolute bottom-full mb-1 bg-white border rounded-lg shadow-lg z-50 overflow-hidden"
              :class="isSidebarCollapsed ? 'left-full ml-2 bottom-0 mb-0' : 'left-0 right-0'"
          >
            <div class="max-h-64 overflow-y-auto" :class="isSidebarCollapsed ? 'w-64' : ''">
              <button
                  v-if="isSuperAdmin"
                  @click="goToAdmin"
                  class="w-full flex items-center gap-x-2 px-3 py-2 hover:bg-purple-50 transition-colors border-b"
              >
                <div class="w-9 h-9 flex items-center justify-center rounded-full bg-purple-600 flex-shrink-0">
                  <span class="text-white text-sm">🛡</span>
                </div>
                <div class="flex-1 min-w-0 text-left">
                  <div class="text-sm font-bold text-purple-900 truncate">Administration Toollab</div>
                  <div class="text-xs text-purple-700 truncate">Mode plateforme</div>
                </div>
              </button>
              <button
                  v-for="school in schools"
                  :key="school.id"
                  @click="selectSchool(school)"
                  class="w-full flex items-center gap-x-2 px-3 py-2 hover:bg-gray-100 transition-colors"
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
                  <div class="text-base text-gray-800 truncate">{{ school.name }}</div>
                  <div
                      class="text-sm truncate"
                      :class="school.role === 'Super-admin' ? 'text-gray-400 italic' : 'text-gray-500'"
                  >{{ school.role || '—' }}</div>
                </div>
                <svg
                    v-if="selectedSchool?.id === school.id"
                    class="w-4 h-4 text-primary flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
    </aside>
    <div class="flex flex-col flex-1 overflow-hidden">
      <div class="h-20 flex items-center justify-end pr-12 gap-x-10 flex-shrink-0">
        <div class="flex items-center gap-x-4">
          <div v-if="years.length > 0" class="relative" ref="yearDropdownRef">
            <button
                @click="showYearDropdown = !showYearDropdown"
                class="inline-flex items-center gap-x-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition-colors text-sm"
                :class="isReadOnly ? 'border-amber-400 text-amber-700' : 'text-gray-700'"
            >
              <span class="font-medium">{{ currentYear?.label || 'Année' }}</span>
              <span v-if="isReadOnly" class="text-xs uppercase tracking-wide">archivée</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    class="w-full flex items-center justify-between gap-x-2 px-3 py-2 hover:bg-gray-100 transition-colors text-left"
                    :class="{ 'bg-gray-50': currentYear?.id === year.id }"
                >
                  <span class="flex flex-col">
                    <span class="text-sm text-gray-800">{{ year.label }}</span>
                    <span class="text-xs text-gray-500">
                      <template v-if="year.is_active">Année active</template>
                      <template v-else-if="year.closed_at">Clôturée — lecture seule</template>
                      <template v-else>Lecture seule</template>
                    </span>
                  </span>
                  <svg
                      v-if="currentYear?.id === year.id"
                      class="w-4 h-4 text-primary flex-shrink-0"
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
                  class="flex items-center gap-x-2 px-3 py-2 border-t bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-700"
              >
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Gérer les années scolaires</span>
              </NuxtLink>
            </div>
          </div>
          <NuxtLink to="/settings"
                    class="inline-flex items-center justify-center rounded-full bg-white border p-2.5 hover:bg-gray-100 transition-colors duration-200">
            <Setting class="size-6 text-primary cursor-pointer" />
          </NuxtLink>
          <UserDropdown :user="user" :initials="initials" />
        </div>
      </div>

      <div v-if="isReadOnly" class="bg-amber-50 border-y border-amber-200 text-amber-800 text-sm px-6 py-2 flex items-center gap-x-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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