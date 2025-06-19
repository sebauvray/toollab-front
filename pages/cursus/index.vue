<script setup>
import { ref, onMounted } from "vue"
import PlusLight from "~/components/Icons/PlusLight.vue"
import DataTable from "~/components/table/DataTable.vue"
import AddCursusModal from "~/components/modals/AddCursusModal.vue"
import PageContainer from "~/components/layout/PageContainer.vue"
import cursusService from '~/services/cursus'
import Trash from "~/components/Icons/Trash.vue"
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue";

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Cursus',
  },
  middleware: 'admin-director'
})

const showAddCursusModal = ref(false)
const isLoading = ref(true)
const error = ref(null)
const cursusList = ref([])
const showDeleteModal = ref(false)
const cursusToDelete = ref(null)

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  perPage: 10,
  total: 0
})

const columns = [
  { key: 'name', label: 'Nom du cursus', width: '5' },
  { key: 'classCount', label: 'Nombre de classes', width: '2' },
  { key: 'levelCount', label: 'Nombre de niveaux', width: '2' },
  { key: 'type', label: 'Type de cursus', width: '2' },
  { key: 'actions', label: '', width: '1' }
]

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

const handleAddCursus = async (newCursus) => {
  try {
    isLoading.value = true

    const response = await cursusService.createCursus({
      name: newCursus.name,
      progression: newCursus.progression,
      levels_count: newCursus.levels_count,
      school_id: localStorage.getItem('current_school_id') || 1
    })

    if (response.status === 'success') {
      const { setFlashMessage } = useFlashMessage()
      setFlashMessage({
        type: 'success',
        message: response.message || 'Cursus créé avec succès'
      })

      await fetchCursus(pagination.value.currentPage)
    } else {
      error.value = response.message || 'Une erreur est survenue lors de la création du cursus'
    }
  } catch (err) {
    console.error('Erreur lors de la création du cursus:', err)
    error.value = 'Une erreur est survenue lors de la création du cursus'
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
    error.value = err.response?.data?.message || 'Une erreur est survenue lors de la suppression du cursus'
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
  fetchCursus()
})
</script>

<template>
  <PageContainer>
    <AddCursusModal
        :is-open="showAddCursusModal"
        @close="showAddCursusModal = false"
        @save="handleAddCursus"
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
        class="bg-default text-white px-5 py-2 w-fit rounded-lg hover:opacity-90 inline-flex items-center justify-between gap-x-2 ml-auto">
      <PlusLight class="size-4"/>
      <span>Créer un cursus</span>
    </button>

    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
      {{ error }}
    </div>

    <DataTable
        :columns="columns"
        :items="cursusList"
        :pagination="pagination"
        :loading="isLoading"
        @page-change="handlePageChange"
    >
      <template #default="{ item, isLastRow }">
        <div
            @click="handleRowClick(item)"
            class="grid py-1.5 px-4 hover:bg-gray-50 transition-colors cursor-pointer"
            :class="{ 'border-b border-[#E6EFF5]': !isLastRow }"
            :style="`grid-template-columns: repeat(12, minmax(0, 1fr))`"
        >
          <div class="col-span-5 inline-flex items-center justify-start gap-x-4 pl-1">
            <span>{{ item.name }}</span>
          </div>
          <div class="col-span-2 inline-flex items-center justify-start">
            {{ item.classCount }}
          </div>
          <div class="col-span-2 inline-flex items-center justify-start">
            {{ item.levelCount }}
          </div>
          <div class="col-span-2 inline-flex items-center justify-start">
            <span class="px-4 py-1 rounded-md text-sm"
                  :class="item.progression === 'levels' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'">
              {{ item.type }}
            </span>
          </div>
          <div class="col-span-1 inline-flex items-center justify-center">
            <button
                @click.stop="openDeleteModal(item)"
                class="text-gray-500 hover:text-red-600 transition-colors"
                title="Supprimer ce cursus"
            >
              <Trash class="size-5" />
            </button>
          </div>
        </div>
      </template>
    </DataTable>
  </PageContainer>
</template>