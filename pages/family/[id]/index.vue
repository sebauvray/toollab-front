<script setup>
import { computed, onMounted, ref } from 'vue'
import SaveButton from "~/components/form/SaveButton.vue"
import CommentEmpty from "~/components/Icons/Comment-Empty.vue"
import HomeTLB from "~/components/Icons/Home-TLB.vue"
import MailTLB from "~/components/Icons/Mail-TLB.vue"
import PaiementEmpty from "~/components/Icons/Paiement-Empty.vue"
import PhoneTLB from "~/components/Icons/Phone-TLB.vue"
import ResponsableTLB from "~/components/Icons/Responsable-TLB.vue"
import UserFemaleTLB from "~/components/Icons/UserFemale-TLB.vue"
import UserMaleTLB from "~/components/Icons/UserMale-TLB.vue"
import AddElevesModal from "~/components/modals/AddElevesModal.vue"
import EditElevesModal from "~/components/modals/EditElevesModal.vue"
import AddNewResponsableModal from "~/components/modals/AddNewResponsableModal.vue"
import EditResponsableModal from "~/components/modals/EditResponsableModal.vue"
import familyService from '~/services/family'
import userService from '~/services/user'
import paiementService from '~/services/paiement'
import {formatShortDateFr} from '~/utils/dateFormatter'
import EditIcon from "~/components/Icons/Edit.vue";
import Trash from "~/components/Icons/Trash.vue";
import axios from "axios";
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue";
import {usePageTitle} from "~/composables/usePageTitle.js";
import { useSchoolYear } from "~/composables/useSchoolYear";

const { isReadOnly } = useSchoolYear();

usePageTitle('Famille')
const route = useRoute();
const breadcrumbItems = computed(() => [
    { name: 'Familles', path: '/family' },
    { name: family.value.responsibles[0].first_name + ' ' + family.value.responsibles[0].last_name || 'Chargement...', path: null },
]);
const loading = ref(true);
const error = ref(null);
const family = ref(null);
const selectedResponsible = ref(null);

const showAddStudentsModal = ref(false);
const showEditStudentsModal = ref(false);
const selectedStudent = ref(null);
const showAddNewResponsableModal = ref(false);
const showEditResponsableModal = ref(false);
const isEditing = ref(false);
const contactInfo = ref({
    name: '',
    phone: '',
    email: '',
    street: '',
    zipcode: '',
    city: ''
});

const editForm = ref({...contactInfo.value});
const comments = ref([]);
const newComment = ref('');
const commentsContainer = ref(null);
const isDropdownOpen = ref(false);

const detailsPaiement = ref(null);
const isPaiementLoading = ref(true);
const paiementError = ref(null);
const deletedStudent = ref(null);
const showDeleteStudentsModal = ref(false);

const GENDER_COLORS = { M: '#93C5FD', F: '#FDA4AF' };
const initials = (p) => ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase();
const personColor = (p) => GENDER_COLORS[p?.gender] || '#343C6A';

const studentAge = (student) => {
    if (!student.birthdate) return null;
    const birth = new Date(student.birthdate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age;
};

const enrolledCount = computed(() =>
    (family.value?.students || []).filter(st => st.classrooms?.length > 0).length
);

const pctPaye = computed(() => {
    const d = detailsPaiement.value;
    if (!d || d.montant_total <= 0) return 100;
    return Math.min(100, Math.round((d.montant_paye / d.montant_total) * 100));
});

const statutPaiement = computed(() => {
    const d = detailsPaiement.value;
    if (!d) return null;
    if (d.montant_total <= 0) return {label: 'Exonérée', chip: 'bg-blue-100 text-blue-700 ring-blue-300', dot: 'bg-blue-500', bar: 'bg-blue-400'};
    if (d.reste_a_payer <= 0) return {label: 'Payé', chip: 'bg-green-100 text-green-700 ring-green-300', dot: 'bg-green-500', bar: 'bg-green-500'};
    if (d.montant_paye === 0) return {label: 'Incomplet', chip: 'bg-red-100 text-red-700 ring-red-300', dot: 'bg-red-500', bar: 'bg-red-400'};
    return {label: 'Partiellement payé', chip: 'bg-amber-100 text-amber-700 ring-amber-300', dot: 'bg-amber-500', bar: 'bg-amber-400'};
});

const typesIcons = {
    espece: '<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    carte: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10.5h18"/>',
    cheque: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10.5h8M7 14h5"/>',
    exoneration: '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/>'
};

const fetchFamilyDetails = async () => {
    try {
        loading.value = true;
        error.value = null;

        const response = await familyService.getFamily(route.params.id);
        family.value = response.data.family;

        if (family.value.responsibles && family.value.responsibles.length > 0) {
            selectedResponsible.value = family.value.responsibles[0];
            updateContactInfo();
        }

        comments.value = family.value.comments || [];
    } catch (err) {
        console.error('Erreur lors de la récupération des détails de la famille:', err);
        error.value = 'Impossible de charger les détails de la famille';
    } finally {
        loading.value = false;
    }
};

const fetchPaiementDetails = async () => {
    try {
        isPaiementLoading.value = true;
        paiementError.value = null;
        const response = await paiementService.getDetailsPaiement(route.params.id);
        if (response.status === 'success') {
            detailsPaiement.value = response.data;
        }
    } catch (err) {
        console.error('Erreur lors du chargement des détails de paiement:', err);
        paiementError.value = err;
    } finally {
        isPaiementLoading.value = false;
    }
};

const updateContactInfo = () => {
    if (selectedResponsible.value) {
        contactInfo.value = {
            name: `${selectedResponsible.value.first_name} ${selectedResponsible.value.last_name}`,
            phone: selectedResponsible.value.phone || '',
            email: selectedResponsible.value.email || '',
            street: selectedResponsible.value.address || '',
            zipcode: selectedResponsible.value.zipcode || '',
            city: selectedResponsible.value.city || ''
        };
        editForm.value = {...contactInfo.value};
    }
};

const selectResponsible = (responsible) => {
    selectedResponsible.value = responsible;
    updateContactInfo();
    isEditing.value = false;
};

const handleDeleteStudent = async () => {
    try {

        await familyService.deleteStudent(route.params.id, deletedStudent.value.id);

        await fetchFamilyDetails();

        const { setFlashMessage } = useFlashMessage();
        setFlashMessage({
            type: 'success',
            message: 'Élève supprimé avec succès'
        });
        showDeleteStudentsModal.value = false
    } catch (err) {
        console.error("❌ Erreur suppression élève :", err);

        const { setFlashMessage } = useFlashMessage();
        setFlashMessage({
            type: 'error',
            message: "Erreur lors de la suppression de l'élève"
        });
    }
};



const handleEdit = () => {
    isEditing.value = true;
    editForm.value = {...contactInfo.value};
};

const handleSave = async () => {
    try {
        if (!selectedResponsible.value) return;

        await userService.updateUserInfo(selectedResponsible.value.id, {
            phone: editForm.value.phone,
            address: editForm.value.street,
            zipcode: editForm.value.zipcode,
            city: editForm.value.city
        });

        contactInfo.value = {...editForm.value};
        selectedResponsible.value = {
            ...selectedResponsible.value,
            phone: editForm.value.phone,
            address: editForm.value.street,
            zipcode: editForm.value.zipcode,
            city: editForm.value.city
        };

        isEditing.value = false;

        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'success',
            message: 'Informations mises à jour avec succès'
        });

    } catch (err) {
        console.error('Erreur lors de la mise à jour des informations:', err);
        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de la mise à jour des informations'
        });
    }
};

const handleCommentSubmit = async () => {
    if (newComment.value.trim()) {
        try {
            const response = await familyService.addComment(route.params.id, newComment.value.trim());
            comments.value.push(response.comment);
            newComment.value = '';
            scrollToBottom();

        } catch (err) {
            console.error('Erreur lors de l\'ajout du commentaire:', err);
        }
    }
};

const handleAddStudents = async (newStudents, callbacks) => {
    try {
        const response = await familyService.addStudents(route.params.id, newStudents);
        await fetchFamilyDetails();

        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'success',
            message: 'Élèves ajoutés avec succès'
        });

        showAddStudentsModal.value = false;

        callbacks?.resolve?.();
    } catch (err) {
        console.error('Erreur lors de l\'ajout des élèves:', err);
        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de l\'ajout des élèves'
        });
        callbacks?.reject?.(err);
    }
};

const handleAddNewResponsable = async (newResponsable) => {
    try {
        if (newResponsable && newResponsable.user) {
            const response = await familyService.addResponsible(route.params.id, newResponsable.user.id);
            await fetchFamilyDetails();

            const {setFlashMessage} = useFlashMessage();
            setFlashMessage({
                type: 'success',
                message: 'Responsable ajouté avec succès'
            });
        }
    } catch (err) {
        console.error('Erreur lors de l\'ajout du responsable:', err);
        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de l\'ajout du responsable'
        });
    }
};

const handleEditResponsable = async (updatedResponsable) => {
    try {
        const currentSelectedId = selectedResponsible.value?.id;

        await fetchFamilyDetails();

        if (currentSelectedId && family.value.responsibles) {
            const updatedResponsible = family.value.responsibles.find(
                resp => resp.id === currentSelectedId
            );

            if (updatedResponsible) {
                selectedResponsible.value = updatedResponsible;
                updateContactInfo();
            }
        }

        const { setFlashMessage } = useFlashMessage();
        setFlashMessage({
            type: 'success',
            message: 'Responsable mis à jour avec succès'
        });
    } catch (err) {
        console.error('Erreur lors de la mise à jour du responsable:', err);
        const { setFlashMessage } = useFlashMessage();
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de la mise à jour du responsable'
        });
    }
};

const handleEditStudent = async (updatedStudent) => {
    try {
        await familyService.updateStudent(route.params.id, updatedStudent.id, updatedStudent);
        await fetchFamilyDetails();
        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'success',
            message: 'Élève mis à jour avec succès'
        });
    } catch (err) {
        console.error("Erreur lors de la mise à jour de l'élève:", err);
        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'error',
            message: "Erreur lors de la mise à jour de l'élève"
        });
    }
};

const scrollToBottom = () => {
    nextTick(() => {
        if (commentsContainer.value) {
            commentsContainer.value.scrollTop = commentsContainer.value.scrollHeight;
        }
    });
};

onMounted(() => {
    fetchFamilyDetails();
    fetchPaiementDetails();
});

definePageMeta({
    layout: 'auth',
    layoutData: {
        title: 'Famille'
    }
});
</script>

<template>
    <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="w-8 h-8 rounded-full border-b-2 animate-spin border-default"></div>
    </div>

    <div v-else-if="error" class="p-3 m-6 text-red-700 bg-red-100 rounded-lg">
        {{ error }}
    </div>

    <div v-else class="flex flex-col px-6 pt-1.5 pb-6 w-full font-montserrat">
        <BreadCrumb :custom-items="breadcrumbItems" />

        <div class="flex flex-wrap justify-end gap-1.5 my-2">
            <button
                @click="showAddNewResponsableModal = true"
                :disabled="isReadOnly"
                :title="isReadOnly ? 'Année scolaire en lecture seule' : ''"
                class="inline-flex items-center px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Ajouter un responsable
            </button>
            <button
                @click="showAddStudentsModal = true"
                :disabled="isReadOnly"
                :title="isReadOnly ? 'Année scolaire en lecture seule' : ''"
                class="inline-flex items-center px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Ajouter des élèves
            </button>
            <NuxtLink
                v-if="!isReadOnly"
                :to="{ name: 'family-id-classes', params: { id: $route.params.id } }"
                class="inline-flex items-center gap-x-1.5 px-3 py-1.5 rounded-lg bg-default text-white font-semibold text-xs hover:opacity-90 transition-opacity">
                <span>Choix des classes</span>
                <svg class="size-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 5.5L20 12l-6.5 6.5M20 12H4"/></svg>
            </NuxtLink>
        </div>

        <div class="grid gap-3">
            <section class="bg-white rounded-2xl border p-4 flex flex-col lg:flex-row gap-4">
                <div class="flex flex-1 flex-wrap gap-x-10 gap-y-4">
                    <div
                        v-for="responsible in family.responsibles"
                        :key="responsible.id"
                        class="flex items-start gap-3 min-w-0"
                    >
                        <span class="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {{ initials(responsible) }}
                        </span>
                        <span class="min-w-0">
                            <span class="flex items-center gap-1">
                                <span class="text-sm font-bold text-default truncate">{{ responsible.first_name }} {{ responsible.last_name }}</span>
                                <button
                                    v-if="!isReadOnly"
                                    @click="selectResponsible(responsible); showEditResponsableModal = true"
                                    class="inline-flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-default hover:bg-gray-100 transition-colors shrink-0"
                                    title="Modifier ce responsable"
                                >
                                    <EditIcon class="size-3" />
                                </button>
                            </span>
                            <span class="block text-[11px] font-nunito text-placeholder mb-1.5">Responsable de la famille</span>
                            <span class="block space-y-1 font-nunito text-xs">
                                <span class="flex items-center gap-2">
                                    <PhoneTLB class="shrink-0" />
                                    <span class="text-gray-800 font-medium">{{ responsible.phone || '—' }}</span>
                                </span>
                                <span class="flex items-center gap-2 min-w-0">
                                    <MailTLB class="shrink-0" />
                                    <span class="text-gray-800 font-medium truncate">{{ responsible.email || '—' }}</span>
                                    <span v-if="responsible.email?.endsWith('@corriger.com')" class="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-red-100 text-red-700 ring-1 ring-red-300">À corriger</span>
                                </span>
                                <span class="flex items-start gap-2">
                                    <HomeTLB class="shrink-0 mt-0.5" />
                                    <span class="text-gray-800 font-medium">
                                        {{ responsible.address || '—' }}<template v-if="responsible.zipcode || responsible.city"> · <span class="text-gray-600">{{ responsible.zipcode }} {{ responsible.city }}</span></template>
                                    </span>
                                </span>
                            </span>
                        </span>
                    </div>
                </div>

                <div class="lg:border-l border-t lg:border-t-0 border-[#E6EFF5] lg:pl-5 pt-3 lg:pt-0 flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 shrink-0 font-nunito">
                    <span class="text-right">
                        <span class="font-montserrat font-bold text-lg text-default tabular-nums">{{ family.students?.length || 0 }}</span>
                        <span class="text-xs text-placeholder ml-1">élève{{ (family.students?.length || 0) > 1 ? 's' : '' }}</span>
                    </span>
                    <span class="text-right text-xs text-placeholder">
                        <span class="font-semibold text-default tabular-nums">{{ enrolledCount }}/{{ family.students?.length || 0 }}</span> inscrit{{ enrolledCount > 1 ? 's' : '' }}
                    </span>
                    <span v-if="statutPaiement && detailsPaiement && (detailsPaiement.montant_total > 0 || detailsPaiement.montant_paye > 0)" :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] ring-1', statutPaiement.chip]">
                        <span :class="['w-1.5 h-1.5 rounded-full', statutPaiement.dot]"></span>
                        {{ statutPaiement.label }}
                    </span>
                </div>
            </section>

            <section class="bg-white rounded-2xl border p-4">
                    <div class="flex items-baseline justify-between mb-2">
                        <h2 class="text-sm font-bold text-default">Élèves</h2>
                        <span class="text-[11px] text-placeholder font-nunito">{{ family.students?.length || 0 }} élève{{ (family.students?.length || 0) > 1 ? 's' : '' }}</span>
                    </div>

                    <template v-if="family.students && family.students.length > 0">
                        <div class="rounded-xl border border-[#E6EFF5] divide-y divide-[#E6EFF5] font-nunito overflow-hidden">
                            <div
                                v-for="student in family.students"
                                :key="student.id"
                                class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50/70 transition-colors"
                            >
                                <span
                                    class="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                    :style="{ backgroundColor: personColor(student) }"
                                >{{ initials(student) }}</span>

                                <span class="w-44 shrink-0 min-w-0">
                                    <span class="block text-xs font-montserrat font-semibold text-default truncate">{{ student.first_name }} {{ student.last_name }}</span>
                                    <span class="block text-[11px] text-placeholder">
                                        {{ formatShortDateFr(student.birthdate) }}<template v-if="studentAge(student) !== null"> · {{ studentAge(student) }} ans</template>
                                    </span>
                                </span>

                                <span v-if="student.is_responsible" class="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-100 text-purple-700 ring-1 ring-purple-300">Responsable</span>

                                <span class="flex-1 min-w-0 flex flex-wrap items-center gap-1">
                                    <span
                                        v-for="classroom in student.classrooms"
                                        :key="classroom.id"
                                        class="px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-gray-blue text-gray-700 ring-1 ring-[#E6EFF5]"
                                    >{{ classroom.name }}</span>
                                    <span v-if="!student.classrooms?.length" class="text-[11px] text-placeholder italic">Non inscrit</span>
                                </span>

                                <span class="flex items-center shrink-0" v-if="!isReadOnly">
                                    <button
                                        @click="selectedStudent = student; showEditStudentsModal = true"
                                        class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-default hover:bg-gray-100 transition-colors"
                                        title="Modifier"
                                    >
                                        <EditIcon class="size-3.5" />
                                    </button>
                                    <button
                                        v-if="!student.is_responsible"
                                        @click="deletedStudent = student; showDeleteStudentsModal = true"
                                        class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash class="size-3.5" />
                                    </button>
                                </span>
                            </div>
                        </div>
                    </template>
                    <div v-else class="rounded-xl border border-[#E6EFF5] py-12 text-center text-placeholder text-xs font-nunito">
                        Aucun élève enregistré pour cette famille.
                    </div>
                </section>

            <div class="grid lg:grid-cols-2 gap-3 w-full items-stretch">

                <section class="bg-white rounded-2xl border p-4 flex flex-col h-80">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-sm font-bold text-default">Paiement</h2>
                        <NuxtLink
                            :to="`/family/${route.params.id}/paiement`"
                            class="inline-flex items-center gap-x-1 px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 text-[11px] hover:bg-gray-50 transition-colors"
                        >
                            <span>Voir le paiement</span>
                            <svg class="size-2.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 5.5L20 12l-6.5 6.5M20 12H4"/></svg>
                        </NuxtLink>
                    </div>

                    <div v-if="isPaiementLoading" class="flex justify-center py-6">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-default"></div>
                    </div>

                    <div v-else-if="paiementError" class="rounded-xl border border-[#E6EFF5] flex-1 flex items-center justify-center text-xs text-red-500 font-nunito">
                        Erreur de chargement du paiement
                    </div>

                    <div
                        v-else-if="detailsPaiement && (detailsPaiement.montant_total > 0 || detailsPaiement.montant_paye > 0)"
                        class="space-y-2.5 overflow-y-auto flex-1"
                    >
                        <div class="rounded-xl border border-[#E6EFF5] px-3 py-2.5 font-nunito">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs text-placeholder">Total annuel <span class="font-montserrat font-bold text-default text-base ml-1">{{ Math.round(detailsPaiement.montant_total) }}€</span></span>
                                <span v-if="statutPaiement" :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] ring-1', statutPaiement.chip]">
                                    <span :class="['w-1.5 h-1.5 rounded-full', statutPaiement.dot]"></span>
                                    {{ statutPaiement.label }}
                                </span>
                            </div>
                            <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                    :class="['h-full rounded-full transition-all duration-700 ease-out', statutPaiement?.bar]"
                                    :style="{ width: pctPaye + '%' }"
                                ></div>
                            </div>
                            <div class="flex justify-between mt-1.5 text-[11px] text-placeholder">
                                <span>Encaissé : <span class="font-semibold text-default">{{ Math.round(detailsPaiement.montant_paye) }}€</span></span>
                                <span>Reste à payer : <span :class="['font-semibold', detailsPaiement.reste_a_payer <= 0 ? 'text-green-600' : 'text-default']">{{ Math.round(Math.max(0, detailsPaiement.reste_a_payer)) }}€</span></span>
                            </div>
                        </div>

                        <div v-if="detailsPaiement.details" class="rounded-xl border border-[#E6EFF5] divide-y divide-[#E6EFF5] font-nunito text-xs">
                            <div v-if="detailsPaiement.details.espece > 0" class="flex items-center justify-between px-3 py-2">
                                <span class="flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons.espece"></svg>
                                    </span>
                                    <span class="text-xs font-medium text-gray-700">Espèces</span>
                                </span>
                                <span class="font-medium text-gray-800 tabular-nums">{{ Math.round(detailsPaiement.details.espece) }}€</span>
                            </div>
                            <div v-if="detailsPaiement.details.carte > 0" class="flex items-center justify-between px-3 py-2">
                                <span class="flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons.carte"></svg>
                                    </span>
                                    <span class="text-xs font-medium text-gray-700">Carte</span>
                                </span>
                                <span class="font-medium text-gray-800 tabular-nums">{{ Math.round(detailsPaiement.details.carte) }}€</span>
                            </div>
                            <div v-if="detailsPaiement.details.cheque > 0" class="flex items-center justify-between px-3 py-2">
                                <span class="flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons.cheque"></svg>
                                    </span>
                                    <span class="text-xs font-medium text-gray-700">Chèques</span>
                                    <span class="text-gray-500">× {{ detailsPaiement.details.cheques?.length || 0 }}</span>
                                </span>
                                <span class="font-medium text-gray-800 tabular-nums">{{ Math.round(detailsPaiement.details.cheque) }}€</span>
                            </div>
                            <div v-if="detailsPaiement.details.exoneration > 0" class="flex items-center justify-between px-3 py-2">
                                <span class="flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons.exoneration"></svg>
                                    </span>
                                    <span class="text-xs font-medium text-gray-700">Exonération</span>
                                </span>
                                <span class="font-medium text-gray-800 tabular-nums">{{ Math.round(detailsPaiement.details.exoneration) }}€</span>
                            </div>
                        </div>
                    </div>

                    <div v-else class="rounded-xl border border-[#E6EFF5] flex-1 flex flex-col items-center justify-center gap-y-2">
                        <PaiementEmpty width="140" height="112" />
                        <div class="text-xs font-medium text-placeholder">Aucun paiement pour cette année</div>
                    </div>
                </section>

                <section class="bg-white rounded-2xl border p-4 flex flex-col h-80">
                    <div class="flex items-baseline justify-between mb-2">
                        <h2 class="text-sm font-bold text-default">Commentaires</h2>
                        <span v-if="comments.length" class="text-[11px] text-placeholder font-nunito">{{ comments.length }}</span>
                    </div>
                    <div class="overflow-hidden flex-1 mb-2">
                        <div
                            v-if="comments.length"
                            ref="commentsContainer"
                            class="overflow-y-auto h-full rounded-xl border border-[#E6EFF5] divide-y divide-[#E6EFF5] font-nunito"
                        >
                            <div
                                v-for="comment in comments"
                                :key="comment.id"
                                class="px-3 py-2"
                            >
                                <div class="flex justify-between items-baseline gap-2">
                                    <span class="text-xs font-montserrat font-semibold text-default truncate">{{ comment.author }}</span>
                                    <span class="text-[10px] text-placeholder shrink-0">{{ comment.date }}</span>
                                </div>
                                <p class="text-xs text-gray-700 mt-0.5">{{ comment.content }}</p>
                            </div>
                        </div>
                        <div v-else class="flex flex-col gap-y-2 justify-center items-center h-full rounded-xl border border-[#E6EFF5]">
                            <CommentEmpty width="110" height="110" />
                            <div class="text-xs font-medium text-placeholder">Aucun commentaire</div>
                        </div>
                    </div>

                    <form v-if="!isReadOnly" @submit.prevent="handleCommentSubmit" class="flex gap-x-1.5 items-end font-nunito">
                        <textarea
                            v-model="newComment"
                            placeholder="Écrire un commentaire…"
                            rows="1"
                            class="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-input-stroke resize-none focus:outline-none focus:border-default"
                        ></textarea>
                        <button
                            type="submit"
                            class="px-3 py-1.5 text-xs text-white rounded-lg transition-opacity bg-default hover:opacity-90 font-montserrat font-medium"
                        >
                            Ajouter
                        </button>
                    </form>
                </section>
            </div>
        </div>
    </div>
    <AddElevesModal
        :is-open="showAddStudentsModal"
        @close="showAddStudentsModal = false"
        @save="handleAddStudents"
    />
    <EditElevesModal
        :is-open="showEditStudentsModal"
        :student="selectedStudent"
        @close="showEditStudentsModal = false"
        @save="handleEditStudent"
    />
    <AddNewResponsableModal
        :is-open="showAddNewResponsableModal"
        :family-id="Number(route.params.id)"
        @close="showAddNewResponsableModal = false"
        @save="fetchFamilyDetails"
    />

    <EditResponsableModal
        :is-open="showEditResponsableModal"
        :family-id="Number(route.params.id)"
        :responsable="selectedResponsible"
        @close="showEditResponsableModal = false"
        @save="handleEditResponsable"
    />

    <ConfirmationModal
        :is-open="showDeleteStudentsModal"
        title="Supprimer l'élève"
        message="Cette action supprimera définitivement l'élève ainsi que toutes ses informations associées (coordonnées, rôles, etc.). Cette action est irréversible. Souhaitez-vous continuer ?"
        confirm-button-text="Supprimer"
        @confirm="handleDeleteStudent"
        @cancel="showDeleteStudentsModal = false"
    />
</template>
