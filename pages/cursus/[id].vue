<script setup>
import { ref, onMounted, computed } from "vue";
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";
import PlusLight from "~/components/Icons/PlusLight.vue";
import DataTable from "~/components/table/DataTable.vue";
import AddClassModal from "~/components/modals/AddClassModal.vue";
import PageContainer from "~/components/layout/PageContainer.vue";
import cursusService from "~/services/cursus";
import classeService from "~/services/classe";
import { useRoute } from '#imports';

const route = useRoute();
const isLoading = ref(true);
const error = ref(null);
const showAddClassModal = ref(false);

const cursus = ref({
  id: parseInt(route.params.id),
  name: '',
  levels: [],
  progression: 'levels'
});

const classes = ref([]);

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

const fetchCursus = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    const response = await cursusService.getCursusById(route.params.id);

    if (response.status === 'success') {
      const cursusData = response.data.cursus;
      cursus.value = {
        id: cursusData.id,
        name: cursusData.name,
        levels: cursusData.levels || [],
        progression: cursusData.progression
      };


      await fetchClasses();
    } else {
      error.value = 'Erreur lors de la récupération du cursus';
    }
  } catch (err) {
    console.error('Erreur lors de la récupération du cursus:', err);
    error.value = 'Une erreur est survenue lors du chargement des données';
  } finally {
    isLoading.value = false;
  }
};

const fetchClasses = async (page = pagination.value.currentPage) => {
  try {
    const response = await classeService.getClasses({
      cursus_id: route.params.id,
      page: page,
      per_page: pagination.value.perPage
    });

    if (response.status === 'success') {
      classes.value = response.data.items.map(classroom => {
        const levelName = classroom.level?.name || 'Sans niveau';

        return {
          id: classroom.id,
          name: classroom.name,
          levelId: classroom.level_id,
          level: levelName,
          gender: classroom.gender,
          color: genderColors[classroom.gender] || '#86EFAC',
          size: classroom.size,
          studentCount: classroom.student_count || 0
        };
      });

      pagination.value = {
        currentPage: response.data.pagination.current_page,
        totalPages: response.data.pagination.total_pages,
        perPage: response.data.pagination.per_page,
        total: response.data.pagination.total
      };
    } else {
      console.error('Erreur lors de la récupération des classes:', response);
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des classes:', err);
  }
};

const handlePageChange = (page) => {
  fetchClasses(page);
};

const handleAddClass = async (newClass) => {
  try {
    const classData = {
      name: newClass.name,
      cursus_id: cursus.value.id,
      level_id: newClass.levelId,
      gender: newClass.gender,
      size: parseInt(newClass.size),
      type: cursus.value.name,
      school_id: localStorage.getItem('current_school_id') || 1
    };


    const response = await classeService.createClass(classData);

    if (response.status === 'success') {
      const { setFlashMessage } = useFlashMessage();
      setFlashMessage({
        type: 'success',
        message: response.message || `La classe ${newClass.name} a été ajoutée avec succès`
      });

      await fetchClasses();
    } else {
      error.value = response.message || 'Une erreur est survenue lors de la création de la classe';
    }
  } catch (err) {
    console.error('Erreur lors de la création de la classe:', err);
    if (err.response) {
      console.error('Détails de la réponse:', err.response.data);
    }
    error.value = 'Une erreur est survenue lors de la création de la classe';
  }
};

onMounted(() => {
  fetchCursus();
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
          :items="classes"
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