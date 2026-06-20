<script setup>
import { ref, onMounted, computed } from "vue"
import PlusLight from "~/components/Icons/PlusLight.vue"
import DataTable from "~/components/table/DataTable.vue"
import AddCursusModal from "~/components/modals/AddCursusModal.vue"
import UpdateCursusNameModal from "~/components/modals/UpdateCursusNameModal.vue"
import PageContainer from "~/components/layout/PageContainer.vue"
import cursusService from '~/services/cursus'
import Edit from "~/components/Icons/Edit.vue"
import Trash from "~/components/Icons/Trash.vue"
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue";
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";
import {usePageTitle} from "~/composables/usePageTitle.js";
import { useSchoolYear } from "~/composables/useSchoolYear";
import { getErrorMessage } from "~/utils/errors";

const { isReadOnly } = useSchoolYear();

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Cursus'
  },
  middleware: 'admin-director'
})

usePageTitle('Cursus')

const showAddCursusModal = ref(false)
const isLoading = ref(true)
const error = ref(null)
const cursusList = ref([])
const showDeleteModal = ref(false)
const cursusToDelete = ref(null)
const showEditModal = ref(false)
const cursusToEdit = ref(null)

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  perPage: 10,
  total: 0
})

const { loadPerPage, savePerPage } = useTablePerPage('cursus_per_page')

const columns = [
  { key: 'name', label: 'Nom du cursus', width: '5' },
  { key: 'classCount', label: 'Nombre de classes', width: '2' },
  { key: 'levelCount', label: 'Nombre de niveaux', width: '2' },
  { key: 'type', label: 'Type de cursus', width: '2' },
  { key: 'actions', label: '', width: '1' }
]

const breadcrumbItems = computed(() => [
    { name: 'Cursus', path: '/cursus' },
]);

const fetchCursus = async (page = 1) => {
  try {
    isLoading.value = true
    error.value = null

    const response = await cursusService.getCursus({
      page: page,
      per_page: pagination.value.perPage
    })

    if (response.status === 'success') {
      cursusList.value = response.data.items.map(item => ({
        ...item,
        levelCount: item.levels ? item.levels.length : 0
      }))

      pagination.value = {
        currentPage: response.data.pagination.current_page,
        totalPages: response.data.pagination.total_pages,
        perPage: response.data.pagination.per_page,
        total: response.data.pagination.total
      }
    } else {
      error.value = 'Erreur lors de la récupération des cursus'
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des cursus:', err)
    error.value = 'Une erreur est survenue lors du chargement des données'
  } finally {
    isLoading.value = false
  }
}

const handlePageChange = (page) => {
  fetchCursus(page)
}

const handlePerPageChange = (perPage) => {
  savePerPage(perPage)
  pagination.value.perPage = perPage
  fetchCursus(1)
}

const handleAddCursus = async (newCursus, deferred = null) => {
  try {
    isLoading.value = true

    const response = await cursusService.createCursus({
      name: newCursus.name,
      progression: newCursus.progression,
      levels_count: newCursus.levels_count
    })

    if (response.status === 'success') {
      const { setFlashMessage } = useFlashMessage()
      setFlashMessage({
        type: 'success',
        message: response.message || 'Cursus créé avec succès'
      })

      await fetchCursus(pagination.value.currentPage)
      deferred?.resolve()
    } else {
      error.value = response.message || 'Une erreur est survenue lors de la création du cursus'
      deferred?.reject(new Error(error.value))
    }
  } catch (err) {
    console.error('Erreur lors de la création du cursus:', err)
    error.value = getErrorMessage(err, 'Une erreur est survenue lors de la création du cursus')
    deferred?.reject(err)
  } finally {
    isLoading.value = false
  }
}

const openEditModal = (cursus) => {
  cursusToEdit.value = cursus
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  cursusToEdit.value = null
}

const handleUpdateCursus = async (updatedCursus, deferred = null) => {
  try {
    isLoading.value = true

    const response = await cursusService.updateCursus(updatedCursus.id, {
      name: updatedCursus.name
    })

    if (response.status === 'success') {
      const { setFlashMessage } = useFlashMessage()
      setFlashMessage({
        type: 'success',
        message: response.message || 'Cursus modifié avec succès'
      })

      await fetchCursus(pagination.value.currentPage)
      deferred?.resolve()
    } else {
      error.value = response.message || 'Une erreur est survenue lors de la modification du cursus'
      deferred?.reject(new Error(error.value))
    }
  } catch (err) {
    console.error('Erreur lors de la modification du cursus:', err)
    error.value = getErrorMessage(err, 'Une erreur est survenue lors de la modification du cursus')
    deferred?.reject(err)
  } finally {
    isLoading.value = false
  }
}

const openDeleteModal = (cursus) => {
  cursusToDelete.value = cursus
  showDeleteModal.value = true
}

const handleDeleteCursus = async () => {
  try {
    isLoading.value = true

    const response = await cursusService.deleteCursus(cursusToDelete.value.id)

    if (response.status === 'success') {
      const { setFlashMessage } = useFlashMessage()
      setFlashMessage({
        type: 'success',
        message: response.message || 'Cursus supprimé avec succès'
      })

      await fetchCursus(pagination.value.currentPage)
    } else {
      error.value = response.message || 'Une erreur est survenue lors de la suppression du cursus'
    }
  } catch (err) {
    console.error('Erreur lors de la suppression du cursus:', err)
    error.value = getErrorMessage(err, 'Une erreur est survenue lors de la suppression du cursus')
  } finally {
    isLoading.value = false
    showDeleteModal.value = false
    cursusToDelete.value = null
  }
}

const handleRowClick = (cursus) => {
  navigateTo(`/cursus/${cursus.id}`)
}

onMounted(() => {
  pagination.value.perPage = loadPerPage()
  fetchCursus()
})
</script>

<template>
  <PageContainer>
      <BreadCrumb :custom-items="breadcrumbItems" />

      <AddCursusModal
        :is-open="showAddCursusModal"
        @close="showAddCursusModal = false"
        @save="handleAddCursus"
    />

    <UpdateCursusNameModal
        :is-open="showEditModal"
        :cursus="cursusToEdit"
        @close="closeEditModal"
        @save="handleUpdateCursus"
    />

    <ConfirmationModal
        :is-open="showDeleteModal"
        title="Supprimer le cursus"
        message="Attention ! Supprimer ce cursus entraînera également la suppression de toutes les classes associées et la désinscription des élèves de ces classes. Cette action est irréversible. Souhaitez-vous continuer ?"
        confirm-button-text="Supprimer"
        @confirm="handleDeleteCursus"
        @cancel="showDeleteModal = false"
    />

    <button
        @click="showAddCursusModal = true"
        :disabled="isReadOnly"
        :title="isReadOnly ? 'Année scolaire en lecture seule' : ''"
        class="bg-default text-white px-3 py-1.5 text-sm w-fit rounded-lg hover:opacity-90 inline-flex items-center justify-between gap-x-1.5 ml-auto disabled:opacity-40 disabled:cursor-not-allowed">
      <PlusLight class="size-3.5"/>
      <span>Créer un cursus</span>
    </button>

    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded relative">
      {{ error }}
    </div>

    <DataTable
        :columns="columns"
        :items="cursusList"
        :pagination="pagination"
        :loading="isLoading"
        @page-change="handlePageChange"
        @per-page-change="handlePerPageChange"
    >
      <template #default="{ item, isLastRow }">
        <div
            @click="handleRowClick(item)"
            class="grid py-1 px-3 hover:bg-gray-50 transition-colors cursor-pointer"
            :class="{ 'border-b border-[#E6EFF5]': !isLastRow }"
            :style="`grid-template-columns: repeat(12, minmax(0, 1fr))`"
        >
          <div class="col-span-5 inline-flex items-center justify-start gap-x-3 pl-1">
            <span>{{ item.name }}</span>
          </div>
          <div class="col-span-2 inline-flex items-center justify-start">
            {{ item.classCount }}
          </div>
          <div class="col-span-2 inline-flex items-center justify-start">
            {{ item.levelCount }}
          </div>
          <div class="col-span-2 inline-flex items-center justify-start">
            <span class="px-3 py-1 rounded-md text-xs"
                  :class="item.progression === 'levels' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'">
              {{ item.type }}
            </span>
          </div>
          <div class="col-span-1 inline-flex items-center justify-center gap-x-1" v-if="!isReadOnly">
            <button
                @click.stop="openEditModal(item)"
                class="text-gray-500 hover:text-blue-600 transition-colors"
                title="Modifier ce cursus"
            >
              <Edit class="size-4" />
            </button>
            <button
                @click.stop="openDeleteModal(item)"
                class="text-gray-500 hover:text-red-600 transition-colors"
                title="Supprimer ce cursus"
            >
              <Trash class="size-4" />
            </button>
          </div>
        </div>
      </template>
    </DataTable>
  </PageContainer>
</template>
