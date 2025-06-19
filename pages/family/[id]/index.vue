<script setup>
import {onMounted, ref} from 'vue'
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

const route = useRoute();
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
        console.log('👤 Student à supprimer :', deletedStudent.value);
        console.log('🏠 ID de la famille :', route.params.id);

        // ✅ Appel API avec uniquement les IDs
        await familyService.deleteStudent(route.params.id, deletedStudent.value.id);

        // ✅ Rechargement des infos famille
        await fetchFamilyDetails();

        // ✅ Message succès
        const { setFlashMessage } = useFlashMessage();
        setFlashMessage({
            type: 'success',
            message: 'Élève supprimé avec succès'
        });
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
    <div v-if="loading" class="flex justify-center items-center py-16">
        <div class="w-10 h-10 rounded-full border-b-2 animate-spin border-default"></div>
    </div>

    <div v-else-if="error" class="p-4 m-8 text-red-700 bg-red-100 rounded-lg">
        {{ error }}
    </div>

    <div v-else class="flex flex-col px-8 pt-2 w-full font-montserrat">
        <div class="flex justify-end my-2">
            <div class="flex">
                <button
                    @click="showAddNewResponsableModal = true"
                    class="mx-1 inline-flex gap-x-2 justify-between items-center px-4 py-2 text-white text-sm rounded-lg bg-default w-fit hover:opacity-90">
                    Ajouter un responsable
                </button>
            </div>
            <div class="flex">
                <button
                    @click="showAddStudentsModal = true"
                    class="mx-1 inline-flex gap-x-2 justify-between items-center px-4 py-2 text-white text-sm rounded-lg bg-default w-fit hover:opacity-90">
                    Ajouter des élèves
                </button>
            </div>
            <NuxtLink
                :to="{
              name: 'family-id-classes',
              params: { id: $route.params.id }
            }"
                class="mx-1 inline-flex gap-x-2 justify-between items-center px-4 py-2 rounded-lg bg-yellow-tlb text-default font-semibold text-sm w-fit hover:opacity-90">
                <span>Choix des classes</span>
            </NuxtLink>
        </div>
        <div class="grid gap-y-4">
            <div class="grid grid-cols-3 gap-x-8 mt-1 w-full">
                <div class="flex relative flex-col col-span-1 gap-y-4 px-6 py-3 bg-white rounded-2xl border">
                    <div
                        class="flex items-center px-12 py-1.5 mx-auto text-lg font-bold text-center rounded-lg bg-gray-light font-montserrat hover:cursor-pointer"
                        @click="isDropdownOpen = !isDropdownOpen">
                        <div class="mr-3">
                            {{ contactInfo.name }}
                        </div>
                        <svg
                            class="size-4 text-placeholder mt-0.5"
                            :class="{ 'rotate-180': isDropdownOpen }"
                            viewBox="0 0 12 12"
                            fill="currentColor"
                        >
                            <path d="M2 4 L6 8 L10 4 Z"/>
                        </svg>
                    </div>
                    <div
                        v-if="isDropdownOpen"
                        class="absolute z-10 mt-12 ml-6 w-52 bg-white border rounded-lg shadow-lg"
                    >
                        <ul>
                            <li
                                v-for="responsible in family.responsibles"
                                :key="responsible.id"
                                @click="selectResponsible(responsible); isDropdownOpen = false"
                                class="px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-sm"
                            >
                                {{ responsible.first_name }} {{ responsible.last_name }}
                            </li>
                        </ul>
                    </div>
                    <div class="flex flex-col gap-y-0.5 justify-center text-default">
                        <div class="ml-auto font-sans text-xs text-black cursor-pointer" v-if="!isEditing">
                            <button
                                class="underline"
                                @click="showEditResponsableModal = true"
                            >
                                Modifier
                            </button>
                        </div>
                        <div class="mb-0.5 text-sm font-bold">Contact</div>
                        <div class="inline-flex gap-x-1.5 items-center mb-0.5 text-xs font-medium">
                            <PhoneTLB/>
                            <template v-if="!isEditing">
                                <span>{{ contactInfo.phone }}</span>
                            </template>
                            <input
                                v-else
                                v-model="editForm.phone"
                                type="tel"
                                class="px-1 py-0.5 w-full text-xs rounded border focus:border-default focus:ring-0 focus:outline-none"
                            >
                        </div>
                        <div class="inline-flex gap-x-1.5 items-center text-xs font-medium">
                            <MailTLB/>
                            <template v-if="!isEditing">
                                <span>{{ contactInfo.email }}</span>
                            </template>
                            <input
                                v-else
                                v-model="editForm.email"
                                type="email"
                                class="px-1 py-0.5 w-full text-xs rounded border focus:border-default focus:ring-0 focus:outline-none"
                                disabled
                            >
                        </div>
                    </div>

                    <div class="w-full border rounded-lg bg-[#d9d9D9]"></div>
                    <div class="flex flex-col gap-y-0.5 justify-center">
                        <div class="mb-0.5 text-sm font-bold">Adresse</div>

                        <template v-if="!isEditing">
                            <div
                                class="inline-flex gap-x-1.5 items-center text-xs font-medium font-montserrat text-default">
                                <HomeTLB/>
                                <span>{{ contactInfo.street }}</span>
                            </div>
                            <div class="pl-4 text-xs font-medium font-montserrat text-default">
                                {{ contactInfo.zipcode }} {{ contactInfo.city }}
                            </div>
                        </template>

                        <template v-else>
                            <div
                                class="inline-flex gap-x-1.5 items-center mb-1.5 text-xs font-medium font-montserrat text-default">
                                <HomeTLB/>
                                <input
                                    v-model="editForm.street"
                                    type="text"
                                    placeholder="Voie"
                                    class="px-1 py-0.5 w-full text-xs rounded border focus:border-default focus:ring-0 focus:outline-none"
                                >
                            </div>
                            <div class="grid grid-cols-2 gap-x-1.5 pl-4">
                                <input
                                    v-model="editForm.zipcode"
                                    type="text"
                                    placeholder="Code postal"
                                    class="px-1 py-0.5 w-full text-xs rounded border focus:border-default focus:ring-0 focus:outline-none"
                                >
                                <input
                                    v-model="editForm.city"
                                    type="text"
                                    placeholder="Ville"
                                    class="px-1 py-0.5 w-full text-xs rounded border focus:border-default focus:ring-0 focus:outline-none"
                                >
                            </div>
                        </template>
                    </div>

                    <div class="flex justify-center" v-if="isEditing">
                        <SaveButton
                            @click="handleSave"
                        >
                            Enregistrer
                        </SaveButton>
                    </div>
                </div>
                <div class="w-full py-1.5 px-6 col-span-2 bg-white rounded-xl border">
                    <div class="grid grid-cols-12 py-1.5 font-bold text-sm font-montserrat border-b border-[#E6EFF5]">
                        <div class="inline-flex col-span-5 justify-start items-center pl-6">Élève</div>
                        <div class="inline-flex col-span-3 justify-start items-center">Classe</div>
                        <div class="inline-flex col-span-3 justify-start items-center">Date de naissance</div>
                        <div class="inline-flex col-span-1 justify-start items-center">-</div>
                    </div>

                    <template v-if="family.students && family.students.length > 0">
                        <div v-for="(student, index) in family.students" :key="student.id"
                             class="grid grid-cols-12 py-1.5 text-sm font-nunito border-b border-[#E6EFF5] last:border-b-0">
                            <div class="inline-flex col-span-5 gap-x-1.5 justify-start items-center pl-0.5">
                                <div class="inline-flex gap-x-2 items-center">
                                    <ResponsableTLB v-if="student.is_responsible"/>
                                    <UserFemaleTLB v-if="student.gender === 'F'"/>
                                    <UserMaleTLB v-else/>
                                </div>
                                <span>{{ student.first_name }} {{ student.last_name }} </span>
                            </div>
                            <div class="col-span-3 flex">
                                <div
                                    class="inline-flex justify-start font-bold text-gray-700 items-center rounded-lg text-sm"
                                    v-for="(classroom, index) in student.classrooms">
                                    {{ classroom ? classroom.name : '-' }}
                                    <span v-if="student.classrooms.length !== index+1" class="mx-0.5"> - </span>
                                </div>
                            </div>
                            <div class="inline-flex col-span-3 justify-start items-center text-sm">
                                {{ formatShortDateFr(student.birthdate) }}
                            </div>
                            <div class="col-span-1">
                                <button
                                    @click="selectedStudent = student; showEditStudentsModal = true"
                                    class="p-1.5 text-gray-600 hover:text-gray-900"
                                >
                                    <EditIcon class="w-4 h-4"/>
                                </button>
                                <button v-if="!student.is_responsible"
                                        @click="deletedStudent = student; showDeleteStudentsModal = true"
                                        class="p-1.5 text-gray-600 hover:text-red-600"
                                >
                                    <Trash class="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    </template>
                    <template v-if="showDeleteStudentsModal">
                        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div class="bg-white p-4 rounded-lg shadow-md w-80">
                                <p>
                                    Cette action supprimera définitivement l'élève ainsi que toutes ses informations associées (coordonnées, rôles, etc.).
                                    <br>
                                    Es-tu sûr de vouloir continuer ?
                                </p>
                                <div class="mt-4 flex justify-end gap-2">
                                    <button @click="showDeleteStudentsModal = false"
                                            class="px-3 py-1 bg-gray-200 rounded">Annuler
                                    </button>
                                    <button @click="handleDeleteStudent() ; showDeleteStudentsModal = false"
                                            class="px-3 py-1 bg-red-600 text-white rounded">Supprimer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </template>


                    <div v-else class="py-24 text-center text-gray-500 text-sm">
                        Aucun élève enregistré pour cette famille.
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-x-8 w-full h-80 mt-1">
                <div class="flex flex-col col-span-1 gap-y-4 py-3 bg-white rounded-2xl border">
                    <div class="px-6 text-xl font-bold font-montserrat">Paiements</div>

                    <div v-if="isPaiementLoading" class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-default"></div>
                    </div>

                    <div v-else-if="paiementError"
                         class="inline-flex flex-col gap-y-3 justify-center items-center w-full">
                        <PaiementEmpty width="200" height="160"/>
                        <div class="text-sm font-medium font-montserrat text-red-500">Erreur de chargement</div>
                    </div>

                    <div
                        v-else-if="detailsPaiement && (detailsPaiement.montant_total > 0 || detailsPaiement.montant_paye > 0)"
                        class="px-6 space-y-3">
                        <div class="space-y-2">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Total à payer</span>
                                <span class="font-medium">{{ Math.round(detailsPaiement.montant_total) }}€</span>
                            </div>

                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Payé</span>
                                <span class="font-medium text-green-600">{{
                                        Math.round(detailsPaiement.montant_paye)
                                    }}€</span>
                            </div>

                            <div class="border-t border-gray-200 pt-2">
                                <div class="flex justify-between text-base">
                                    <span class="font-semibold text-gray-800">Reste à payer</span>
                                    <span :class="[
                                        'font-bold',
                                        detailsPaiement.reste_a_payer === 0 ? 'text-green-600' :
                                        detailsPaiement.reste_a_payer < 0 ? 'text-orange-500' : 'text-red-600'
                                    ]">
                                        {{ Math.round(detailsPaiement.reste_a_payer) }}€
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div v-if="detailsPaiement.details" class="space-y-1">
                            <div v-if="detailsPaiement.details.espece > 0" class="flex justify-between text-sm">
                                <span class="text-gray-500">💵 Espèces</span>
                                <span>{{ Math.round(detailsPaiement.details.espece) }}€</span>
                            </div>

                            <div v-if="detailsPaiement.details.carte > 0" class="flex justify-between text-sm">
                                <span class="text-gray-500">💳 CB</span>
                                <span>{{ Math.round(detailsPaiement.details.carte) }}€</span>
                            </div>

                            <div v-if="detailsPaiement.details.cheque > 0" class="flex justify-between text-sm">
                                <span class="text-gray-500">🧾 Chèques ({{
                                        detailsPaiement.details.cheques?.length || 0
                                    }})</span>
                                <span>{{ Math.round(detailsPaiement.details.cheque) }}€</span>
                            </div>

                            <div v-if="detailsPaiement.details.exoneration > 0" class="flex justify-between text-sm">
                                <span class="text-gray-500">✋ Exonération</span>
                                <span>{{ Math.round(detailsPaiement.details.exoneration) }}€</span>
                            </div>
                        </div>

                        <NuxtLink
                            :to="`/family/${route.params.id}/paiement`"
                            class="block text-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                            Voir détails
                        </NuxtLink>
                    </div>

                    <div v-else class="inline-flex flex-col gap-y-3 justify-center items-center w-full">
                        <PaiementEmpty width="200" height="160"/>
                        <div class="text-sm font-medium font-montserrat text-placeholder">Aucun paiement</div>
                    </div>
                </div>
                <div class="flex flex-col col-span-1 bg-white py-3 px-6 rounded-2xl border text-default h-80">
                    <div class="mb-4 text-xl font-bold font-montserrat">Commentaires</div>
                    <div class="overflow-hidden flex-1 mb-3">
                        <div
                            v-if="comments.length"
                            ref="commentsContainer"
                            class="flex overflow-y-auto flex-col gap-y-4 pr-1 h-full"
                        >
                            <div
                                v-for="comment in comments"
                                :key="comment.id"
                                class="flex flex-col gap-y-1.5 px-4 py-1.5 w-full rounded-lg shadow-sm bg-gray-light"
                            >
                                <div class="flex justify-between items-center text-xs font-montserrat">
                                    <div class="font-bold">{{ comment.author }}</div>
                                    <div class="font-light">{{ comment.date }}</div>
                                </div>
                                <div class="text-xs font-montserrat">{{ comment.content }}</div>
                            </div>
                        </div>
                        <div v-else class="flex flex-col gap-y-3 justify-center items-center h-full">
                            <CommentEmpty width="160" height="160"/>
                            <div class="text-sm font-medium font-montserrat text-placeholder">
                                Aucun commentaire
                            </div>
                        </div>
                    </div>

                    <form @submit.prevent="handleCommentSubmit" class="flex gap-x-3 items-center">
                    <textarea
                        v-model="newComment"
                        placeholder="Écrivez votre commentaire..."
                        rows="2"
                        class="flex-1 p-2 text-xs rounded-lg border resize-none font-montserrat focus:outline-none focus:ring-1 focus:ring-default"
                    ></textarea>
                        <button
                            type="submit"
                            class="px-4 py-1.5 text-xs text-white rounded-lg transition-opacity bg-default hover:opacity-90 font-nunito"
                        >
                            Ajouter
                        </button>
                    </form>
                </div>
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
        :family-id="route.params.id"
        @close="showAddNewResponsableModal = false"
    />
    <EditResponsableModal
        :is-open="showEditResponsableModal"
        :family-id="route.params.id"
        :responsable="selectedResponsible"
        @close="showEditResponsableModal = false"
    />
</template>