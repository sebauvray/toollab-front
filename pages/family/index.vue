<script setup>
import PlusLight from "~/components/Icons/PlusLight.vue";
import ResponsableTLB from "~/components/Icons/Responsable-TLB.vue";
import Search from "~/components/Icons/Search.vue";
import { ref, onMounted, onUnmounted, computed } from "vue";
import AddResponsableModal from "~/components/modals/AddResponsableModal.vue";
import Tag from "~/components/Tag.vue";
import familyService from "~/services/family.js";
import { formatDateFr } from "~/utils/dateFormatter.js";
import DataTable from "~/components/table/DataTable.vue";
import PageContainer from "~/components/layout/PageContainer.vue";
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";
import {usePageTitle} from "~/composables/usePageTitle.js";
import { useSchoolYear } from "~/composables/useSchoolYear";
import { saveExport } from "~/utils/download";

const { isReadOnly } = useSchoolYear();

definePageMeta({
    layout: 'auth',
    layoutData: {
        title: 'Familles'
    }
})

usePageTitle('Famille')

const showAddResponsableModal = ref(false);
const families = ref([]);
const isLoading = ref(true);
const error = ref(null);
const searchQuery = ref('');
const searchTimeout = ref(null);
const sort = ref({
    key: 'created_at',
    direction: 'desc'
});
const paymentStatus = ref('all');
const pagination = ref({
    currentPage: 1,
    totalPages: 1,
    perPage: 10,
    total: 0
});

const { loadPerPage, savePerPage } = useTablePerPage('families_per_page');

const columns = [
    { key: 'nom', label: 'Nom du responsable', width: '7', sortable: true },
    { key: 'nombreEleves', label: 'Nombre d\'élèves', width: '3', sortKey: 'nombreEleves', sortable: true },
    { key: 'status', label: 'Règlement', width: '2', sortable: true }
];

const breadcrumbItems = computed(() => [
    { name: 'Familles', path: '/family' },
]);

const fetchFamilies = async (page = 1) => {
    try {
        isLoading.value = true;
        error.value = null;

        const params = {
            page: page,
            per_page: pagination.value.perPage,
            sort_by: sort.value.key,
            sort_direction: sort.value.direction
        };

        if (searchQuery.value.trim()) {
            params.search = searchQuery.value.trim();
        }

        if (paymentStatus.value !== 'all') {
            params.payment_status = paymentStatus.value;
        }

        const response = await familyService.getFamilies(params);

        if (response.status === 'success') {
            families.value = response.data.items;

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

const handlePerPageChange = (perPage) => {
    savePerPage(perPage);
    pagination.value.perPage = perPage;
    fetchFamilies(1);
};

const handleSortChange = (nextSort) => {
    sort.value = nextSort;
    fetchFamilies(1);
};

const handleStatusFilterChange = (event) => {
    paymentStatus.value = event.target.value;
    fetchFamilies(1);
};

const handleSearch = (event) => {
    searchQuery.value = event.target.value;

    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
    }

    searchTimeout.value = setTimeout(() => {
        fetchFamilies(1);
    }, 300);
};

const canExport = ref(false);
const exportingStudents = ref(false);
const exportStudents = async () => {
    if (exportingStudents.value) return;
    exportingStudents.value = true;
    try {
        const blob = await familyService.exportStudents();
        saveExport(blob, 'eleves');
    } catch (e) {
        const { setFlashMessage } = useFlashMessage();
        setFlashMessage({ type: 'error', message: 'Échec de l\'export des élèves' });
    } finally {
        exportingStudents.value = false;
    }
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
    if (process.client) {
        const role = localStorage.getItem('current_school_role');
        canExport.value = ['Directeur', 'Administrateur', 'Super-admin'].includes(role);
    }
    pagination.value.perPage = loadPerPage();
    fetchFamilies();
});

onUnmounted(() => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
    }
});
</script>

<template>
    <PageContainer>
        <BreadCrumb :custom-items="breadcrumbItems" />

        <AddResponsableModal
            :is-open="showAddResponsableModal"
            @close="showAddResponsableModal = false"
            @save="handleAddResponsable"
        />

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div class="relative w-full sm:w-[28rem] font-nunito">
                <Search
                    class="absolute left-5 top-1/2 transform -translate-y-1/2 size-4 text-placeholder"
                />
                <input
                    type="text"
                    placeholder="Rechercher un responsable..."
                    :value="searchQuery"
                    @input="handleSearch"
                    class="w-full placeholder:text-placeholder border focus:ring-1 focus:ring-primary focus:outline-none border-input-stroke bg-white rounded-10 pl-12 py-2"
                />
            </div>

            <select
                :value="paymentStatus"
                @change="handleStatusFilterChange"
                class="w-full sm:w-52 border border-input-stroke bg-white rounded-10 px-3 py-2 text-sm font-nunito focus:ring-1 focus:ring-primary focus:outline-none"
            >
                <option value="all">Tous les règlements</option>
                <option value="no_enrollment">Aucune inscription</option>
                <option value="incomplete">Incomplet</option>
                <option value="pending">Partiellement payé</option>
                <option value="paid">Payé</option>
                <option value="exempted">Exonéré</option>
            </select>

            <div class="flex items-center gap-2 w-fit">
                <ExportButton v-if="canExport" :loading="exportingStudents" @click="exportStudents" />
                <button
                    @click="showAddResponsableModal = true"
                    :disabled="isReadOnly"
                    :title="isReadOnly ? 'Année scolaire en lecture seule' : ''"
                    class="bg-default text-white px-3 py-1.5 text-sm w-fit rounded-lg hover:opacity-90 inline-flex items-center justify-between gap-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                    <PlusLight class="size-3.5"/>
                    <span>Créer une famille</span>
                </button>
            </div>
        </div>

        <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded relative">
            {{ error }}
        </div>

        <DataTable
            :columns="columns"
            :items="families"
            :pagination="pagination"
            :loading="isLoading"
            :sort="sort"
            @page-change="handlePageChange"
            @per-page-change="handlePerPageChange"
            @sort-change="handleSortChange"
        >
            <template #default="{ item, isLastRow }">
                <NuxtLink
                    :to="`/family/${item.id}`"
                    class="grid py-1 px-3 hover:bg-gray-50 transition-colors cursor-pointer font-nunito"
                    :class="{ 'border-b border-[#E6EFF5]': !isLastRow }"
                    :style="`grid-template-columns: repeat(12, minmax(0, 1fr))`"
                >
                    <div class="col-span-7 inline-flex items-center justify-start gap-x-3 pl-1">
                        <ResponsableTLB />
                        <span>{{ item.nom }}</span>
                    </div>
                    <div class="col-span-3 inline-flex items-center justify-start">
                        {{ item.nombreEleves }}
                    </div>
                    <div class="col-span-2 inline-flex items-center justify-start">
                        <Tag :status="item.status" />
                    </div>
                </NuxtLink>
            </template>
        </DataTable>
    </PageContainer>
</template>
