<script setup>
import { onMounted, ref } from 'vue'
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
import AddResponsableModal from "~/components/modals/AddResponsableModal.vue"
import familyService from '~/services/family'
import userService from '~/services/user'
import { formatDateTimeFr, formatShortDateFr } from '~/utils/dateFormatter'
import EditIcon from "~/components/Icons/Edit.vue";


const route = useRoute();
const loading = ref(true);
const error = ref(null);
const family = ref(null);
const selectedResponsible = ref(null);

const showAddStudentsModal = ref(false);
const showEditStudentsModal = ref(false);
const selectedStudent = ref(null);
const showAddResponsableModal = ref(false);
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

        callbacks?.resolve?.();} catch (err) {
        console.error('Erreur lors de l\'ajout des élèves:', err);
        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de l\'ajout des élèves'
        });
  callbacks?.reject?.(err);
    }
};

const handleAddResponsable = async (newResponsable) => {
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
        await fetchFamilyDetails(); // pour mettre à jour l'affichage
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
});

definePageMeta({
    layout: 'auth',
    layoutData: {
        title: 'Famille'
    }
});
</script>

<template>
    <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="w-12 h-12 rounded-full border-b-2 animate-spin border-default"></div>
    </div>

    <div v-else-if="error" class="p-6 m-10 text-red-700 bg-red-100 rounded-lg">
        {{ error }}
    </div>

    <div v-else class="flex flex-col px-10 pt-3 w-full font-montserrat">
        <div class="flex justify-end">
            <div class="flex">
                <button
                    @click="showAddResponsableModal = true"
                    class=" mx-2 inline-flex gap-x-2 justify-between items-center px-4 py-2 text-white text-sm rounded-lg bg-default w-fit hover:opacity-90">
                    Ajouter un responsable
                </button>
            </div>
            <div class="flex">
                <button
                    @click="showAddStudentsModal = true"
                    class=" mx-2 inline-flex gap-x-2 justify-between items-center px-4 py-2 text-white text-sm rounded-lg bg-default w-fit hover:opacity-90">
                    Ajouter un élève
                </button>
            </div>
            <NuxtLink
                :to="{
              name: 'family-id-classes',
              params: { id: $route.params.id }
            }"
                class=" mx-2 inline-flex gap-x-2 justify-between items-center px-4 py-2 rounded-lg bg-yellow-tlb text-default font-bold w-fit hover:opacity-90">
                <span>Choix des classes</span>
            </NuxtLink>
        </div>
        <div class="grid gap-y-6">
            <div class="grid grid-cols-3 gap-x-12 mt-2 w-full">
                <div class="flex relative flex-col col-span-1 gap-y-6 px-10 py-4 bg-white rounded-3xl border">
                    <div class="flex items-center px-20 py-2 mx-auto text-xl font-bold text-center rounded-xl bg-gray-light font-montserrat hover:cursor-pointer"
                         @click="isDropdownOpen = !isDropdownOpen">
                        <div class="mr-4">
                            {{ contactInfo.name }}
                        </div>
                        <svg
                            class="size-5 text-placeholder mt-1"
                            :class="{ 'rotate-180': isDropdownOpen }"
                            viewBox="0 0 12 12"
                            fill="currentColor"
                        >
                            <path d="M2 4 L6 8 L10 4 Z" />
                        </svg>
                    </div>
                    <div
                        v-if="isDropdownOpen"
                        class="absolute z-10 mt-14 ml-10 w-64 bg-white border rounded-lg shadow-lg"
                    >
                        <ul>
                            <li
                                v-for="responsible in family.responsibles"
                                :key="responsible.id"
                                @click="selectResponsible(responsible); isDropdownOpen = false"
                                class="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                                {{ responsible.first_name }} {{ responsible.last_name }}
                            </li>
                        </ul>
                    </div>
                    <div class="flex flex-col gap-y-0.5 justify-center text-default">
                        <div class="ml-auto font-sans text-sm text-black cursor-pointer" v-if="!isEditing">
                            <button
                                class="underline"
                                @click="handleEdit"
                            >
                                Modifier
                            </button>
                        </div>
                        <div class="mb-1 text-base font-bold">Contact</div>
                        <div class="inline-flex gap-x-2 items-center mb-1 text-xs font-medium">
                            <PhoneTLB />
                            <template v-if="!isEditing">
                                <span>{{ contactInfo.phone }}</span>
                            </template>
                            <input
                                v-else
                                v-model="editForm.phone"
                                type="tel"
                                class="p-1 w-full rounded border focus:border-default focus:ring-0 focus:outline-none"
                            >
                        </div>
                        <div class="inline-flex gap-x-2 items-center text-xs font-medium">
                            <MailTLB />
                            <template v-if="!isEditing">
                                <span>{{ contactInfo.email }}</span>
                            </template>
                            <input
                                v-else
                                v-model="editForm.email"
                                type="email"
                                class="p-1 w-full rounded border focus:border-default focus:ring-0 focus:outline-none"
                                disabled
                            >
                        </div>
                    </div>

                    <div class="w-full border rounded-xl bg-[#d9d9D9]"></div>
                    <div class="flex flex-col gap-y-0.5 justify-center">
                        <div class="mb-1 text-base font-bold">Adresse</div>

                        <template v-if="!isEditing">
                            <div class="inline-flex gap-x-2 items-center text-xs font-medium font-montserrat text-default">
                                <HomeTLB />
                                <span>{{ contactInfo.street }}</span>
                            </div>
                            <div class="pl-6 text-xs font-medium font-montserrat text-default">
                                {{ contactInfo.zipcode }} {{ contactInfo.city }}
                            </div>
                        </template>

                        <template v-else>
                            <div class="inline-flex gap-x-2 items-center mb-2 text-xs font-medium font-montserrat text-default">
                                <HomeTLB />
                                <input
                                    v-model="editForm.street"
                                    type="text"
                                    placeholder="Voie"
                                    class="p-1 w-full rounded border focus:border-default focus:ring-0 focus:outline-none"
                                >
                            </div>
                            <div class="grid grid-cols-2 gap-x-2 pl-6">
                                <input
                                    v-model="editForm.zipcode"
                                    type="text"
                                    placeholder="Code postal"
                                    class="p-1 w-full text-xs rounded border focus:border-default focus:ring-0 focus:outline-none"
                                >
                                <input
                                    v-model="editForm.city"
                                    type="text"
                                    placeholder="Ville"
                                    class="p-1 w-full text-xs rounded border focus:border-default focus:ring-0 focus:outline-none"
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
                <div class="grid grid-rows-5 w-full py-2 px-10 col-span-2 bg-white rounded-2xl divide-y border divide-[#E6EFF5] relative">
                    <div class="grid grid-cols-12 font-bold font-montserrat">
                        <div class="inline-flex col-span-5 justify-start items-center pl-10">Élève</div>
                        <div class="inline-flex col-span-3 justify-start items-center">Classe</div>
                        <div class="inline-flex col-span-3 justify-start items-center">Date de naissance</div>
                        <div class="inline-flex col-span-1 justify-start items-center">-</div>
                    </div>

                    <template v-if="family.students && family.students.length > 0">
                        <div v-for="(student, index) in family.students" :key="student.id" class="grid grid-cols-12 py-2 font-nunito">
                            <div class="inline-flex col-span-5 gap-x-2 justify-start items-center pl-1">
                                <div class="inline-flex gap-x-3 items-center">
                                    <ResponsableTLB v-if="student.is_responsible" />
                                    <UserFemaleTLB v-if="student.gender === 'F'" />
                                    <UserMaleTLB v-else />
                                </div>
                                <span>{{ student.first_name }} {{ student.last_name }} </span>
                            </div>
                            <div class="col-span-3 flex">
                                <div class="inline-flex justify-start items-center mx-1 bg-teal-500 rounded-lg px-2" v-for="classroom in student.classrooms">
                                    {{ classroom ? classroom.name : '-' }}
                                </div>
                            </div>
                            <div class="inline-flex col-span-3 justify-start items-center">
                                {{ formatShortDateFr(student.birthdate) }}
                            </div>
                            <div class="col-span-1">
                                <button
                                    @click="selectedStudent = student; showEditStudentsModal = true" class="p-1.5 text-gray-600 hover:text-gray-900"
                                >
                                    <EditIcon class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </template>
                    <div v-else class="col-span-12 py-10 text-center text-gray-500">
                        Aucun élève enregistré pour cette famille.
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-x-12 w-full h-[23rem] mt-2">
                <div class="flex flex-col col-span-1 gap-y-6 py-4 bg-white rounded-3xl border">
                    <div class="px-10 text-2xl font-bold font-montserrat">Paiements</div>
                    <div class="inline-flex flex-col gap-y-4 justify-center items-center w-full">
                        <PaiementEmpty width="250" height="200" />
                        <div class="text-base font-medium font-montserrat text-placeholder">Aucun paiement</div>
                    </div>
                </div>
                <div class="flex flex-col col-span-1 bg-white py-4 px-10 rounded-3xl border text-default h-[23rem]">
                    <div class="mb-6 text-2xl font-bold font-montserrat">Commentaires</div>
                    <div class="overflow-hidden flex-1 mb-4">
                        <div
                            v-if="comments.length"
                            ref="commentsContainer"
                            class="flex overflow-y-auto flex-col gap-y-6 pr-1 h-full"
                        >
                            <div
                                v-for="comment in comments"
                                :key="comment.id"
                                class="flex flex-col gap-y-2 px-6 py-2 w-full rounded-lg shadow-sm bg-gray-light"
                            >
                                <div class="flex justify-between items-center text-xs font-montserrat">
                                    <div class="font-bold">{{ comment.author }}</div>
                                    <div class="font-bold">{{ comment.author }}</div>
                                    <div class="font-light">{{ comment.date }}</div>
                                </div>
                                <div class="text-xs font-montserrat">{{ comment.content }}</div>
                            </div>
                        </div>
                        <div v-else class="flex flex-col gap-y-4 justify-center items-center h-full">
                            <CommentEmpty width="200" height="200" />
                            <div class="text-base font-medium font-montserrat text-placeholder">
                                Aucun commentaire
                            </div>
                        </div>
                    </div>

                    <form @submit.prevent="handleCommentSubmit" class="flex gap-x-4 items-center">
                    <textarea
                        v-model="newComment"
                        placeholder="Écrivez votre commentaire..."
                        rows="3"
                        class="flex-1 p-3 text-xs rounded-lg border resize-none font-montserrat focus:outline-none focus:ring-1 focus:ring-default"
                    ></textarea>
                        <button
                            type="submit"
                            class="px-5 py-2 text-sm text-white rounded-lg transition-opacity bg-default hover:opacity-90 font-nunito"
                        >
                            Ajouter
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
    <AddResponsableModal
        :is-open="showAddResponsableModal"
        @close="showAddResponsableModal = false"
        @save="handleAddResponsable"
    />
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
</template>