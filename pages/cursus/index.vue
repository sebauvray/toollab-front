<script setup>
import { ref, onMounted } from "vue"
import PlusLight from "~/components/Icons/PlusLight.vue"
import DataTable from "~/components/table/DataTable.vue"
import AddCursusModal from "~/components/modals/AddCursusModal.vue"
import PageContainer from "~/components/layout/PageContainer.vue";

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Cursus',
  }
})

const showAddCursusModal = ref(false)
const isLoading = ref(false)
const error = ref(null)

const cursus = ref([
  {
    id: 1,
    name: 'Arabe',
    levels: ['1er', '2eme', '3eme'],
    progression: 'levels',
    classCount: 6,
    type: 'Par niveaux'
  },
  {
    id: 2,
    name: 'Coran',
    levels: ['Débutant', 'Intermédiaire', 'Avancé'],
    progression: 'levels',
    classCount: 4,
    type: 'Par niveaux'
  },
  {
    id: 3,
    name: 'Éducation islamique',
    levels: ['Niveau unique'],
    progression: 'continu',
    classCount: 2,
    type: 'Continu'
  }
])

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  perPage: 10,
  total: cursus.value.length
})

const columns = [
  { key: 'name', label: 'Nom du cursus', width: '5' },
  { key: 'classCount', label: 'Nombre de classes', width: '3' },
  { key: 'type', label: 'Type de cursus', width: '3' }
]

const handlePageChange = (page) => {
  pagination.value.currentPage = page
}

const handleAddCursus = (newCursus) => {
  if (newCursus) {
    const newId = Math.max(...cursus.value.map(c => c.id)) + 1
    cursus.value.push({
      id: newId,
      name: newCursus.name,
      levels: newCursus.levels,
      progression: newCursus.progression,
      classCount: 0,
      type: newCursus.progression === 'levels' ? 'Par niveaux' : 'Continu'
    })

    pagination.value.total = cursus.value.length
  }
}

onMounted(() => {
  isLoading.value = true

  setTimeout(() => {
    isLoading.value = false
  }, 500)
})
</script>

<template>
  <PageContainer>
    <AddCursusModal
        :is-open="showAddCursusModal"
        @close="showAddCursusModal = false"
        @save="handleAddCursus"
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
        :items="cursus"
        :pagination="pagination"
        :loading="isLoading"
        @page-change="handlePageChange"
    >
      <template #default="{ item, isLastRow }">
        <NuxtLink
            :to="`/cursus/${item.name.toLowerCase()}`"
            class="grid py-1.5 px-4 hover:bg-gray-50 transition-colors cursor-pointer"
            :class="{ 'border-b border-[#E6EFF5]': !isLastRow }"
            :style="`grid-template-columns: repeat(11, minmax(0, 1fr))`"
        >
          <div class="col-span-5 inline-flex items-center justify-start gap-x-4 pl-1">
            <span>{{ item.name }}</span>
          </div>
          <div class="col-span-3 inline-flex items-center justify-start">
            {{ item.classCount }}
          </div>
          <div class="col-span-3 inline-flex items-center justify-start">
            <span class="px-4 py-1 rounded-md text-sm"
                  :class="item.progression === 'levels' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'">
              {{ item.type }}
            </span>
          </div>
        </NuxtLink>
      </template>
    </DataTable>
  </PageContainer>
</template>