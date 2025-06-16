<script setup>
import LogoText from "~/components/Icons/LogoText.vue";
import Home from "~/components/Icons/Home.vue";
import Setting from "~/components/Icons/Setting.vue";
import Cursus from "~/components/Icons/Cursus.vue";
import NavLink from "~/components/navigation/NavLink.vue";
import FamilyTLB from "~/components/Icons/Family-TLB.vue";
import UserDropdown from "~/components/UserDropdown.vue";
import CurrencyEuro from "~/components/Icons/CurrencyEuro.vue";
import {ref, computed, onMounted} from 'vue';
import userService from '~/services/user';
import schoolService from '~/services/school';

const user = ref(null);
const schools = ref([]);
const selectedSchool = ref(null);
const showSchoolDropdown = ref(false);
const isDirector = ref(false);

const initials = computed(() => {
  if (!user.value) return 'NA';

  const firstName = user.value.first_name || '';
  const lastName = user.value.last_name || '';

  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
});

const currentSchoolInitial = computed(() => {
  if (!selectedSchool.value) return 'I';
  return selectedSchool.value.name.charAt(0).toUpperCase();
});

const currentSchoolName = computed(() => {
  if (!selectedSchool.value) return 'Nom de l\'Institut';
  return selectedSchool.value.name;
});

const checkIfDirector = () => {
  if (selectedSchool.value && schools.value.length > 0) {
    const currentSchoolRole = schools.value.find(s => s.id === selectedSchool.value.id);
    isDirector.value = currentSchoolRole?.role === 'Directeur';
  }
};

const loadUserSchools = async () => {
  try {
    if (user.value) {
      const response = await userService.getUserRoles(user.value.id);
      const userRoles = response.roles;

      if (userRoles.schools && userRoles.schools.length > 0) {
        const schoolPromises = userRoles.schools.map(async (schoolRole) => {
          const schoolData = await schoolService.getSchool(schoolRole.context.id);
          return {
            id: schoolData.id,
            name: schoolData.name,
            role: schoolRole.role
          };
        });

        schools.value = await Promise.all(schoolPromises);

        if (schools.value.length > 0) {
          const savedSchoolId = localStorage.getItem('current_school_id');

          if (savedSchoolId) {
            const savedSchool = schools.value.find(s => s.id === parseInt(savedSchoolId));
            if (savedSchool) {
              selectedSchool.value = savedSchool;
            } else {
              selectedSchool.value = schools.value[0];
              localStorage.setItem('current_school_id', schools.value[0].id);
            }
          } else {
            selectedSchool.value = schools.value[0];
            localStorage.setItem('current_school_id', schools.value[0].id);
          }

          checkIfDirector();
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des écoles:', error);
  }
};

const selectSchool = (school) => {
  selectedSchool.value = school;
  showSchoolDropdown.value = false;
  localStorage.setItem('current_school_id', school.id);
  checkIfDirector();
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
  }
});
</script>

<template>
  <div class="flex bg-gray-blue min-h-screen antialiased">
    <aside class="flex flex-col bg-white w-64 min-h-full border-r font-medium font-montserrat">
      <div class="w-full flex items-center justify-center h-20">
        <LogoText class="w-44"/>
      </div>
      <nav class="inline-flex flex-col gap-y-4 mt-4">
        <NavLink to="/" :icon="Home" text="Accueil"/>
        <NavLink to="/cursus" :icon="Cursus" text="Cursus"/>
        <NavLink to="/family" :icon="FamilyTLB" text="Familles"/>
        <NavLink v-if="isDirector" to="/tarification" :icon="CurrencyEuro" text="Tarification"/>
      </nav>

      <div class="mt-auto mb-6 px-6">
        <div v-if="schools.length <= 1" class="flex items-center gap-x-3 py-3">
          <div class="w-8 h-8 flex items-center justify-center rounded-full bg-primary">
            <span class="text-white text-sm font-semibold">{{ currentSchoolInitial }}</span>
          </div>
          <span class="text-sm text-gray-800">{{ currentSchoolName }}</span>
        </div>

        <div v-else class="relative">
          <button
              @click="showSchoolDropdown = !showSchoolDropdown"
              class="w-full flex items-center gap-x-3 py-3 px-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="w-8 h-8 flex items-center justify-center rounded-full bg-primary">
              <span class="text-white text-sm font-semibold">{{ currentSchoolInitial }}</span>
            </div>
            <span class="text-sm text-gray-800 flex-1 text-left">{{ currentSchoolName }}</span>
            <svg
                class="w-4 h-4 text-gray-500 transition-transform"
                :class="{ 'rotate-180': showSchoolDropdown }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
              v-if="showSchoolDropdown"
              class="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          >
            <div class="max-h-64 overflow-y-auto">
              <button
                  v-for="school in schools"
                  :key="school.id"
                  @click="selectSchool(school)"
                  class="w-full flex items-center gap-x-3 px-4 py-3 hover:bg-gray-100 transition-colors"
                  :class="{ 'bg-gray-50': selectedSchool?.id === school.id }"
              >
                <div class="w-8 h-8 flex items-center justify-center rounded-full bg-primary">
                  <span class="text-white text-sm font-semibold">{{ school.name.charAt(0).toUpperCase() }}</span>
                </div>
                <div class="flex-1">
                  <div class="text-sm text-gray-800">{{ school.name }}</div>
                  <div class="text-xs text-gray-500">{{ school.role }}</div>
                </div>
                <svg
                    v-if="selectedSchool?.id === school.id"
                    class="w-4 h-4 text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
    <div class="flex flex-col w-full overflow-x-hidden">
      <div class="bg-white h-20 border-b flex items-center justify-between px-12 gap-x-10">
        <h1 class="font-black capitalize text-2xl">
          {{ $route.meta.title }}
        </h1>
        <div class="flex items-center gap-x-5">
          <NuxtLink to="/settings">
            <Setting class="cursor-pointer"/>
          </NuxtLink>
          <UserDropdown :user="user" :initials="initials"/>
        </div>
      </div>
      <div class="relative h-full">
        <slot/>
      </div>
    </div>
  </div>
</template>