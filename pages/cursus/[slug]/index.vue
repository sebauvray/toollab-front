<script setup>
import { ref, onMounted, computed } from "vue";
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";
import PlusLight from "~/components/Icons/PlusLight.vue";
import DataTable from "~/components/table/DataTable.vue";
import AddClassModal from "~/components/modals/AddClassModal.vue";
import PageContainer from "~/components/layout/PageContainer.vue";
import { useRoute } from '#imports';

const route = useRoute();
const isLoading = ref(true);
const error = ref(null);
const showAddClassModal = ref(false);

const cursus = ref({
  id: 1,
  name: route.params.slug ? route.params.slug.charAt(0).toUpperCase() + route.params.slug.slice(1) : '',
  levels: [
    { id: 1, name: '1ère année' },
    { id: 2, name: '2ème année' },
    { id: 3, name: '3ème année' }
  ],
  progression: 'levels'
});

const allClasses = ref([
  {
    id: 1,
    name: '1A',
    levelId: 1,
    level: '1ère année',
    gender: 'Hommes',
    color: '#93C5FD',
    size: 30,
    studentCount: 25
  },
  {
    id: 2,
    name: '1B',
    levelId: 1,
    level: '1ère année',
    gender: 'Femmes',
    color: '#FDA4AF',
    size: 25,
    studentCount: 18
  },
  {
    id: 3,
    name: '2A',
    levelId: 2,
    level: '2ème année',
    gender: 'Enfants',
    color: '#FCD34D',
    size: 20,
    studentCount: 15
  },
  {
    id: 4,
    name: '3A',
    levelId: 3,
    level: '3ème année',
    gender: 'Hommes',
    color: '#93C5FD',
    size: 22,
    studentCount: 20
  }
]);

const genderColors = {
  'Hommes': '#93C5FD',
  'Femmes': '#FDA4AF',
  'Enfants': '#FCD34D',
  'Mixte': '#86EFAC'
};

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  perPage: 10,
  total: 0
});

const columns = [
  { key: 'name', label: 'Nom de la classe', width: '3' },
  { key: 'level', label: 'Niveau', width: '3' },
  { key: 'gender', label: 'Genre', width: '2' },
  { key: 'size', label: 'Capacité', width: '2' },
  { key: 'studentCount', label: 'Élèves inscrits', width: '2' },
];

const handlePageChange = (page) => {
  pagination.value.currentPage = page;
};

const handleAddClass = (newClass) => {
  const selectedLevel = cursus.value.levels.find(l => l.id === newClass.levelId);

  const newClassObj = {
    id: Math.max(...allClasses.value.map(c => c.id)) + 1,
    name: newClass.name,
    levelId: newClass.levelId,
    level: selectedLevel ? selectedLevel.name : '',
    gender: newClass.gender.charAt(0).toUpperCase() + newClass.gender.slice(1),
    color: genderColors[newClass.gender.charAt(0).toUpperCase() + newClass.gender.slice(1)] || '#86EFAC',
    size: newClass.size,
    studentCount: 0
  };

  allClasses.value.push(newClassObj);
  pagination.value.total = allClasses.value.length;

  // Notification de succès
  const { setFlashMessage } = useFlashMessage();
  setFlashMessage({
    type: 'success',
    message: `La classe ${newClass.name} a été ajoutée avec succès`
  });
};

onMounted(() => {
  isLoading.value = true;

  setTimeout(() => {
    pagination.value.total = allClasses.value.length;
    isLoading.value = false;
  }, 500);
});

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Cursus',
  }
});
</script>

<template>
  <PageContainer>
    <BreadCrumb/>

    <button
        @click="showAddClassModal = true"
        class="bg-default text-white px-5 py-2 w-fit rounded-lg hover:opacity-90 inline-flex items-center justify-between gap-x-2 ml-auto">
      <PlusLight class="size-4"/>
      <span>Ajouter une classe</span>
    </button>

    <AddClassModal
        :is-open="showAddClassModal"
        :cursus-name="cursus.name"
        :levels="cursus.levels"
        @close="showAddClassModal = false"
        @save="handleAddClass"
    />

    <div v-if="isLoading" class="flex justify-center py-10">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-default"></div>
    </div>

    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
      {{ error }}
    </div>

    <div v-else>
      <DataTable
          :columns="columns"
          :items="allClasses"
          :pagination="pagination"
          :loading="isLoading"
          @page-change="handlePageChange"
      >
        <template #default="{ item, isLastRow }">
          <div
              class="grid py-3 px-4 hover:bg-gray-50 transition-colors cursor-pointer"
              :class="{ 'border-b border-[#E6EFF5]': !isLastRow }"
              :style="`grid-template-columns: repeat(12, minmax(0, 1fr))`"
          >
            <div class="col-span-3 inline-flex items-center">
              <div class="size-4 rounded-full mr-3" :style="`background-color: ${item.color}`"></div>
              <span class="font-medium">{{ item.name }}</span>
            </div>
            <div class="col-span-3 inline-flex items-center">
              {{ item.level }}
            </div>
            <div class="col-span-2 inline-flex items-center">
              {{ item.gender }}
            </div>
            <div class="col-span-2 inline-flex items-center">
              {{ item.size }} places
            </div>
            <div class="col-span-2 inline-flex items-center">
              <div class="relative w-full h-5 bg-gray-200 rounded-full">
                <div
                    class="absolute top-0 left-0 h-full rounded-full"
                    :style="`width: ${Math.min(100, (item.studentCount / item.size) * 100)}%; background-color: ${item.color}`"
                ></div>
                <div class="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs font-semibold">
                  {{ item.studentCount }}/{{ item.size }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </DataTable>
    </div>
  </PageContainer>
</template>