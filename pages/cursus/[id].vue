<template>
  <PageContainer>
    <BreadCrumb :custom-items="breadcrumbItems" />

    <button
        @click="showAddClassModal = true"
        :disabled="isReadOnly"
        :title="isReadOnly ? 'Année scolaire en lecture seule' : ''"
        class="bg-default text-white px-3 py-1.5 text-sm w-fit rounded-lg hover:opacity-90 inline-flex items-center justify-between gap-x-1.5 ml-auto disabled:opacity-40 disabled:cursor-not-allowed">
      <PlusLight class="size-3.5"/>
      <span>Ajouter une classe</span>
    </button>

    <AddClassModal
        :is-open="showAddClassModal"
        :cursus-name="cursus.name"
        :levels="cursus.levels"
        @close="showAddClassModal = false"
        @save="handleAddClass"
    />

    <UpdateClassModal
        :is-open="showUpdateClassModal"
        :cursus-name="cursus.name"
        :levels="cursus.levels"
        :class-data="selectedClass"
        @close="showUpdateClassModal = false"
        @update="handleUpdateClass"
    />

    <ConfirmationModal
        :is-open="showDeleteModal"
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer la classe et dissocier tous les élèves liés à cette classe ?"
        confirm-button-text="Supprimer"
        cancel-button-text="Annuler"
        @confirm="handleDeleteClass"
        @cancel="showDeleteModal = false"
    />

    <div v-if="isLoading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-default"></div>
    </div>

    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded relative">
      {{ error }}
    </div>

    <div v-else>
      <DataTable
          :columns="columns"
          :items="classes"
          :pagination="pagination"
          :loading="isLoading"
          @page-change="handlePageChange"
          @per-page-change="handlePerPageChange"
      >
        <template #default="{ item, isLastRow }">
          <div
              :id="`class-${item.id}`"
              class="grid py-1 px-3 hover:bg-gray-50 transition-colors scroll-mt-24"
              :class="{ 'border-b border-[#E6EFF5]': !isLastRow }"
              :style="`grid-template-columns: repeat(12, minmax(0, 1fr))`"
          >
            <div class="col-span-3 inline-flex items-center justify-start gap-x-3 pl-1">
              <div
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: genderColors[item.gender] }"
              ></div>
              <span>{{ item.name }}</span>
            </div>
            <div class="col-span-3 inline-flex items-center justify-start">
              {{ item.level?.name || 'Sans niveau' }}
            </div>
            <div class="col-span-2 inline-flex items-center justify-start">
              <span
                  class="px-2 py-1 rounded-full text-xs font-medium w-20 text-center"
                  :style="{ backgroundColor: genderColors[item.gender], color: '#000' }"
              >
                {{ item.gender }}
              </span>
            </div>
            <div class="col-span-2 inline-flex items-center justify-start">
              <div class="relative w-full h-5 bg-gray-200 rounded-full">
                <div
                    class="absolute top-0 left-0 h-full rounded-full"
                    :style="`width: ${Math.min(100, ((item.studentCount || 0) / item.size) * 100)}%; background-color: ${genderColors[item.gender]}`"
                ></div>
                <div class="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs font-semibold">
                  {{ item.studentCount || 0 }}/{{ item.size }}
                </div>
              </div>
            </div>
            <div class="col-span-2 inline-flex items-center justify-end gap-x-1.5 pr-3" v-if="!isReadOnly">
              <button
                  @click="openUpdateModal(item)"
                  class="text-gray-500 hover:text-blue-600 transition-colors"
                  title="Modifier cette classe"
              >
                <Edit class="size-4" />
              </button>
              <button
                  @click="openDeleteModal(item)"
                  class="text-red-500 hover:text-red-700 transition-colors"
                  title="Supprimer cette classe"
              >
                <Trash class="size-4" />
              </button>
            </div>
          </div>
        </template>
      </DataTable>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";
import PlusLight from "~/components/Icons/PlusLight.vue";
import Edit from "~/components/Icons/Edit.vue";
import Trash from "~/components/Icons/Trash.vue";
import DataTable from "~/components/table/DataTable.vue";
import AddClassModal from "~/components/modals/AddClassModal.vue";
import UpdateClassModal from "~/components/modals/UpdateClassModal.vue";
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue";
import PageContainer from "~/components/layout/PageContainer.vue";
import cursusService from "~/services/cursus";
import classeService from "~/services/classe";
import {usePageTitle, useRoute} from '#imports';
import { useSchoolYear } from "~/composables/useSchoolYear";

const { isReadOnly } = useSchoolYear();

const route = useRoute();
const isLoading = ref(true);
const error = ref(null);
const showAddClassModal = ref(false);
const showUpdateClassModal = ref(false);
const showDeleteModal = ref(false);
const selectedClass = ref(null);
const classToDelete = ref(null);

const cursus = ref({
  id: parseInt(route.params.id),
  name: '',
  levels: [],
  progression: 'levels'
});

usePageTitle('Cursus')

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

const { loadPerPage, savePerPage } = useTablePerPage('cursus_classes_per_page');

const columns = [
  { key: 'name', label: 'Nom de la classe', width: '3' },
  { key: 'level', label: 'Niveau', width: '3' },
  { key: 'gender', label: 'Genre', width: '2' },
  { key: 'studentCount', label: 'Élèves inscrits', width: '2' },
  { key: 'actions', label: '', width: '2' },
];

const breadcrumbItems = computed(() => [
  { name: 'Cursus', path: '/cursus' },
  { name: cursus.value.name || 'Chargement...', path: null },
]);

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
        progression: cursusData.progression || 'levels'
      };

      await fetchClasses();
    } else {
      error.value = response.message || 'Erreur lors du chargement du cursus';
    }
  } catch (err) {
    console.error('Erreur lors du chargement du cursus:', err);
    error.value = 'Erreur lors du chargement du cursus';
  } finally {
    isLoading.value = false;
  }
};

const fetchClasses = async (page = 1) => {
  try {
    const response = await cursusService.getClassesByCursus(cursus.value.id, {
      page: page,
      per_page: pagination.value.perPage
    });

    if (response.status === 'success') {
      classes.value = response.data.items.map(classroom => ({
        ...classroom,
        studentCount: classroom.student_count
      })) || [];

      pagination.value = {
        currentPage: response.data.pagination?.current_page || 1,
        totalPages: response.data.pagination?.total_pages || 1,
        perPage: response.data.pagination?.per_page || 10,
        total: response.data.pagination?.total || 0
      };
    }
  } catch (err) {
    console.error('Erreur lors du chargement des classes:', err);
  }
};

const handlePageChange = (page) => {
  fetchClasses(page);
};

const handlePerPageChange = (perPage) => {
  savePerPage(perPage);
  pagination.value.perPage = perPage;
  fetchClasses(1);
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
      school_id: localStorage.getItem('current_school_id') || 1,
      telegram_link: newClass.telegram_link,
      main_teacher_id: newClass.main_teacher_id || null,
      schedules: newClass.schedules || []
    };

    const response = await classeService.createClass(classData);

    if (response.status === 'success') {
      const { setFlashMessage } = useFlashMessage();
      setFlashMessage({
        type: 'success',
        message: response.message || `La classe ${newClass.name} a été ajoutée avec succès`
      });

      showAddClassModal.value = false;
      await fetchClasses();
    } else {
      error.value = response.message || 'Une erreur est survenue lors de la création de la classe';
    }
  } catch (err) {
    console.error('Erreur lors de la création de la classe:', err);
    error.value = 'Une erreur est survenue lors de la création de la classe';
  }
};

const openUpdateModal = (classItem) => {
  selectedClass.value = { ...classItem };
  showUpdateClassModal.value = true;
};

const handleUpdateClass = async (updatedClass) => {
  try {
    const classData = {
      name: updatedClass.name,
      cursus_id: cursus.value.id,
      level_id: updatedClass.levelId,
      gender: updatedClass.gender,
      size: parseInt(updatedClass.size),
      type: cursus.value.name,
      telegram_link: updatedClass.telegram_link,
      main_teacher_id: updatedClass.main_teacher_id || null,
      schedules: updatedClass.schedules || []
    };

    const response = await classeService.updateClass(updatedClass.id, classData);

    if (response.status === 'success') {
      const { setFlashMessage } = useFlashMessage();
      setFlashMessage({
        type: 'success',
        message: response.message || `La classe ${updatedClass.name} a été modifiée avec succès`
      });

      showUpdateClassModal.value = false;
      selectedClass.value = null;
      await fetchClasses();
    } else {
      error.value = response.message || 'Une erreur est survenue lors de la modification de la classe';
    }
  } catch (err) {
    console.error('Erreur lors de la modification de la classe:', err);
    error.value = 'Une erreur est survenue lors de la modification de la classe';
  }
};

const openDeleteModal = (classItem) => {
  classToDelete.value = classItem;
  showDeleteModal.value = true;
};

const handleDeleteClass = async () => {
  if (!classToDelete.value) return;

  try {
    const response = await classeService.deleteClass(classToDelete.value.id);

    if (response.status === 'success') {
      const { setFlashMessage } = useFlashMessage();
      setFlashMessage({
        type: 'success',
        message: response.message || `La classe ${classToDelete.value.name} a été supprimée avec succès`
      });

      showDeleteModal.value = false;
      classToDelete.value = null;
      await fetchClasses();
    } else {
      error.value = response.message || 'Une erreur est survenue lors de la suppression de la classe';
    }
  } catch (err) {
    console.error('Erreur lors de la suppression de la classe:', err);
    error.value = 'Une erreur est survenue lors de la suppression de la classe';
  }
};

const openModalFromHash = async () => {
  if (isReadOnly.value) return
  const match = (route.hash || '').match(/^#class-(\d+)$/)
  if (!match) return

  const classId = parseInt(match[1], 10)
  try {
    const response = await classeService.getClassById(classId)
    if (response.status === 'success' && response.data) {
      selectedClass.value = response.data
      showUpdateClassModal.value = true
    }
  } catch (err) {
    console.error('Erreur ouverture classe depuis hash:', err)
  }
}

onMounted(async () => {
  pagination.value.perPage = loadPerPage();
  await fetchCursus();
  await openModalFromHash();
});

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Cursus',
  }
});
</script>