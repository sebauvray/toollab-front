<script setup>
import PlusLight from "~/components/Icons/PlusLight.vue";
import ResponsableTLB from "~/components/Icons/Responsable-TLB.vue";
import { ref, onMounted } from "vue";
import AddResponsableModal from "~/components/modals/AddResponsableModal.vue";
import Tag from "~/components/Tag.vue";
import familyService from "~/services/family.js";
import { formatDateFr } from "~/utils/dateFormatter.js";
import DataTable from "~/components/table/DataTable.vue";
import PageContainer from "~/components/layout/PageContainer.vue";

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Famille'
  }
})

const showAddResponsableModal = ref(false);
const families = ref([]);
const isLoading = ref(true);
const error = ref(null);
const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  perPage: 10,
  total: 0
});

const columns = [
  { key: 'nom', label: 'Nom du responsable', width: '5' },
  { key: 'nombreEleves', label: 'Nombre d\'élèves', width: '2' },
  { key: 'status', label: 'Règlement', width: '2' },
  { key: 'dateInscription', label: 'Date d\'inscription', width: '3' }
];

const fetchFamilies = async (page = 1) => {
  try {
    isLoading.value = true;
    error.value = null;

    const response = await familyService.getFamilies({
      page: page,
      per_page: pagination.value.perPage
    });

    if (response.status === 'success') {
      families.value = response.data.items.map(item => ({
        ...item,
        dateInscriptionFormatee: formatDateFr(item.dateInscription, {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      pagination.value = {
        currentPage: response.data.pagination.current_page,
        totalPages: response.data.pagination.total_pages,
        perPage: response.data.pagination.per_page,
        total: response.data.pagination.total
      };
    } else {
      error.value = 'Erreur lors de la récupération des familles';
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des familles:', err);
    error.value = 'Une erreur est survenue lors du chargement des données';
  } finally {
    isLoading.value = false;
  }
};

const handlePageChange = (page) => {
  fetchFamilies(page);
};

const handleAddResponsable = async (newResponsable) => {
  try {
    if (newResponsable && newResponsable.family_id) {
      navigateTo(`/family/${newResponsable.family_id}`);
    } else {
      await fetchFamilies(pagination.value.currentPage);
    }
  } catch (error) {
    console.error('Erreur lors de la redirection vers la famille:', error);
  }
};

onMounted(() => {
  fetchFamilies();
});
</script>

<template>
  <PageContainer>
    <AddResponsableModal
        :is-open="showAddResponsableModal"
        @close="showAddResponsableModal = false"
        @save="handleAddResponsable"
    />

    <button
        @click="showAddResponsableModal = true"
        class="bg-default text-white px-5 py-2 w-fit rounded-lg hover:opacity-90 inline-flex items-center justify-between gap-x-2 ml-auto">
      <PlusLight class="size-4"/>
      <span>Créer une famille</span>
    </button>

    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
      {{ error }}
    </div>

    <DataTable
        :columns="columns"
        :items="families"
        :pagination="pagination"
        :loading="isLoading"
        @page-change="handlePageChange"
    >
      <template #default="{ item, isLastRow }">
        <NuxtLink
            :to="`/family/${item.id}`"
            class="grid py-1.5 px-4 hover:bg-gray-50 transition-colors cursor-pointer"
            :class="{ 'border-b border-[#E6EFF5]': !isLastRow }"
            :style="`grid-template-columns: repeat(12, minmax(0, 1fr))`"
        >
          <div class="col-span-5 inline-flex items-center justify-start gap-x-4 pl-1">
            <ResponsableTLB />
            <span>{{ item.nom }}</span>
          </div>
          <div class="col-span-2 inline-flex items-center justify-start">
            {{ item.nombreEleves }}
          </div>
          <div class="col-span-2 inline-flex items-center justify-start">
            <Tag :status="item.status" />
          </div>
          <div class="col-span-3 inline-flex items-center justify-start">
            {{ item.dateInscriptionFormatee || item.dateInscription }}
          </div>
        </NuxtLink>
      </template>
    </DataTable>
  </PageContainer>
</template>