<script setup>
import {ref, onMounted, computed} from 'vue'
import HomeTLB from "~/components/Icons/Home-TLB.vue"
import PhoneTLB from "~/components/Icons/Phone-TLB.vue"
import MailTLB from "~/components/Icons/Mail-TLB.vue"
import UserMaleTLB from "~/components/Icons/UserMale-TLB.vue"
import UserFemaleTLB from "~/components/Icons/UserFemale-TLB.vue"
import PaiementEmpty from "~/components/Icons/Paiement-Empty.vue"
import CommentEmpty from "~/components/Icons/Comment-Empty.vue"
import ResponsableTLB from "~/components/Icons/Responsable-TLB.vue"
import PlusLight from "~/components/Icons/PlusLight.vue"
import AddResponsableModal from "~/components/modals/AddResponsableModal.vue";
import SaveButton from "~/components/form/SaveButton.vue";
import AddElevesModal from "~/components/modals/AddElevesModal.vue";
import familyService from '~/services/family';
import userService from '~/services/user';
import { formatDateTimeFr } from '~/utils/dateFormatter';


const route = useRoute();
const loading = ref(true);
const error = ref(null);
const family = ref(null);
const selectedResponsible = ref(null);

const showAddStudentsModal = ref(false);
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

    const { setFlashMessage } = useFlashMessage();
    setFlashMessage({
      type: 'success',
      message: 'Informations mises à jour avec succès'
    });

  } catch (err) {
    console.error('Erreur lors de la mise à jour des informations:', err);
    const { setFlashMessage } = useFlashMessage();
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
      comments.value.unshift(response.data.comment);
      newComment.value = '';
      scrollToBottom();

    } catch (err) {
      console.error('Erreur lors de l\'ajout du commentaire:', err);
    }
  }
};

const handleAddStudents = async (newStudents) => {
  try {
    const response = await familyService.addStudents(route.params.id, newStudents);
    fetchFamilyDetails();

    const { setFlashMessage } = useFlashMessage();
    setFlashMessage({
      type: 'success',
      message: 'Élèves ajoutés avec succès'
    });

  } catch (err) {
    console.error('Erreur lors de l\'ajout des élèves:', err);
    const { setFlashMessage } = useFlashMessage();
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de l\'ajout des élèves'
    });
  }
};

const handleAddResponsable = async (newResponsable) => {
  try {
    if (newResponsable && newResponsable.user) {
      const response = await familyService.addResponsible(route.params.id, newResponsable.user.id);
      fetchFamilyDetails();

      const { setFlashMessage } = useFlashMessage();
      setFlashMessage({
        type: 'success',
        message: 'Responsable ajouté avec succès'
      });
    }
  } catch (err) {
    console.error('Erreur lors de l\'ajout du responsable:', err);
    const { setFlashMessage } = useFlashMessage();
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de l\'ajout du responsable'
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
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-default"></div>
  </div>

  <div v-else-if="error" class="p-6 bg-red-100 text-red-700 rounded-lg m-10">
    {{ error }}
  </div>

  <div v-else class="flex flex-col w-full pt-3 px-10 font-montserrat">
    <NuxtLink
        :to="{
          name: 'family-id-classes',
          params: { id: $route.params.id }
        }"
        class="bg-default text-white px-4 py-2 w-fit rounded-lg hover:opacity-90 inline-flex items-center justify-between gap-x-2 ml-auto">
      <span>Choix des classes</span>
    </NuxtLink>

    <div class="grid grid-cols-3 gap-x-20 w-full mt-2">
      <div class="flex flex-col gap-y-6 col-span-1 bg-white py-4 px-10 border rounded-3xl relative">
        <div class="bg-gray-light mr-auto pl-6 pr-8 font-bold font-montserrat text-xl text-center py-2 rounded-xl">
          {{ contactInfo.name }}
        </div>

        <button
            @click="showAddResponsableModal = true"
            class="absolute right-3 top-6 inline-flex items-center justify-center hover:opacity-80 rounded-full hover:bg-gray-50 p-1"
        >
          <PlusLight class="size-6"/>
        </button>

        <AddResponsableModal
            :is-open="showAddResponsableModal"
            @close="showAddResponsableModal = false"
            @save="handleAddResponsable"
        />

        <div class="flex flex-col justify-center gap-y-0.5 text-default">
          <div class="text-black ml-auto text-sm font-sans cursor-pointer" v-if="!isEditing">
            <button
                class="underline"
                @click="handleEdit"
            >
              Modifier
            </button>
          </div>
          <div class="font-bold text-base mb-1">Contact</div>
          <div class="inline-flex items-center gap-x-2 text-xs mb-1 font-medium">
            <PhoneTLB/>
            <template v-if="!isEditing">
              <span>{{ contactInfo.phone }}</span>
            </template>
            <input
                v-else
                v-model="editForm.phone"
                type="tel"
                class="w-full p-1 border rounded focus:border-default focus:ring-0 focus:outline-none"
            >
          </div>
          <div class="inline-flex items-center gap-x-2 text-xs font-medium">
            <MailTLB/>
            <template v-if="!isEditing">
              <span>{{ contactInfo.email }}</span>
            </template>
            <input
                v-else
                v-model="editForm.email"
                type="email"
                class="w-full p-1 border rounded focus:border-default focus:ring-0 focus:outline-none"
                disabled
            >
          </div>
        </div>

        <div class="w-full border rounded-xl bg-[#d9d9D9]"></div>
        <div class="flex flex-col justify-center gap-y-0.5">
          <div class="font-bold text-base mb-1">Adresse</div>

          <!-- Affichage de l'adresse quand on n'est pas en mode édition -->
          <template v-if="!isEditing">
            <div class="inline-flex items-center gap-x-2 font-montserrat text-xs text-default font-medium">
              <HomeTLB/>
              <span>{{ contactInfo.street }}</span>
            </div>
            <div class="pl-6 font-montserrat text-xs text-default font-medium">
              {{ contactInfo.zipcode }} {{ contactInfo.city }}
            </div>
          </template>

          <!-- Formulaire d'édition pour l'adresse -->
          <template v-else>
            <div class="inline-flex items-center gap-x-2 font-montserrat text-xs text-default font-medium mb-2">
              <HomeTLB/>
              <input
                  v-model="editForm.street"
                  type="text"
                  placeholder="Voie"
                  class="w-full p-1 border rounded focus:border-default focus:ring-0 focus:outline-none"
              >
            </div>
            <div class="grid grid-cols-2 gap-x-2 pl-6">
              <input
                  v-model="editForm.zipcode"
                  type="text"
                  placeholder="Code postal"
                  class="w-full p-1 border rounded focus:border-default focus:ring-0 focus:outline-none text-xs"
              >
              <input
                  v-model="editForm.city"
                  type="text"
                  placeholder="Ville"
                  class="w-full p-1 border rounded focus:border-default focus:ring-0 focus:outline-none text-xs"
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

        <div v-if="family.responsibles && family.responsibles.length > 1" class="mt-4">
          <div class="font-bold text-base mb-2">Autres responsables</div>
          <div
              v-for="responsible in family.responsibles"
              :key="responsible.id"
              @click="selectResponsible(responsible)"
              class="cursor-pointer p-2 hover:bg-gray-50 rounded flex items-center gap-2"
              :class="{'bg-gray-100': selectedResponsible && selectedResponsible.id === responsible.id}"
          >
            <ResponsableTLB class="size-5" />
            <span>{{ responsible.first_name }} {{ responsible.last_name }}</span>
          </div>
        </div>
      </div>

      <AddElevesModal
          :is-open="showAddStudentsModal"
          @close="showAddStudentsModal = false"
          @save="handleAddStudents"
      />

      <div class="grid grid-rows-5 w-full py-4 px-10 col-span-2 bg-white rounded-2xl divide-y border divide-[#E6EFF5] relative">
        <div class="grid grid-cols-12 font-bold font-montserrat">
          <div class="col-span-7 inline-flex items-center justify-start pl-10">Élève</div>
          <div class="col-span-2 inline-flex items-center justify-start">Classe</div>
          <div class="col-span-3 inline-flex items-center justify-start">Date d'inscription</div>
          <button
              @click="showAddStudentsModal = true"
              class="absolute right-4 top-8 inline-flex items-center justify-center hover:opacity-80 rounded-full hover:bg-gray-50 p-1"
          >
            <PlusLight class="size-6"/>
          </button>
        </div>

        <template v-if="family.students && family.students.length > 0">
          <div v-for="(student, index) in family.students" :key="student.id" class="grid grid-cols-12 font-nunito py-4">
            <div class="col-span-7 inline-flex items-center justify-start gap-x-2 pl-1">
              <div class="inline-flex items-center gap-x-3">
                <ResponsableTLB v-if="student.is_responsible" />
                <component :is="student.gender === 'F' ? UserFemaleTLB : UserMaleTLB" />
              </div>
              <span>{{ student.first_name }} {{ student.last_name }} </span>
            </div>
            <div class="col-span-2 inline-flex items-center justify-start">
              {{ student.classroom ? student.classroom.name : '-' }}
            </div>
            <div class="col-span-3 inline-flex items-center justify-start">
              {{ formatDateTimeFr(student.created_at) }}
            </div>
          </div>
        </template>

        <div v-else class="col-span-12 py-10 text-center text-gray-500">
          Aucun élève enregistré pour cette famille.
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-x-20 w-full h-[23rem] mt-2">
      <div class="flex flex-col gap-y-6 col-span-1 bg-white py-4 border rounded-3xl">
        <div class="font-bold text-2xl font-montserrat px-10">Paiements</div>
        <div class="inline-flex flex-col items-center justify-center gap-y-4 w-full">
          <PaiementEmpty width="250" height="200"/>
          <div class="font-montserrat text-base text-placeholder font-medium">Aucun paiement</div>
        </div>
      </div>
        <div class="flex flex-col col-span-1 bg-white py-4 px-10 rounded-3xl border text-default h-[23rem]">
            <div class="font-bold text-2xl font-montserrat mb-6">Commentaires</div>
            <div class="flex-1 overflow-hidden mb-4">
                <div
                    v-if="comments.length"
                    ref="commentsContainer"
                    class="flex flex-col gap-y-6 overflow-y-auto h-full pr-1"
                >
                    <div
                        v-for="comment in comments"
                        :key="comment.id"
                        class="bg-gray-light w-full flex flex-col gap-y-2 px-6 py-2 shadow-sm rounded-lg"
                    >
                        <div class="flex items-center justify-between font-montserrat text-xs">
                            <div class="font-bold">{{ comment.author }}</div>
                            <div class="font-light">{{ comment.date }}</div>
                        </div>
                        <div class="text-xs font-montserrat">{{ comment.content }}</div>
                    </div>
                </div>
                <div v-else class="flex flex-col items-center justify-center gap-y-4 h-full">
                    <CommentEmpty width="200" height="200" />
                    <div class="font-montserrat text-base text-placeholder font-medium">
                        Aucun commentaire
                    </div>
                </div>
            </div>

            <form @submit.prevent="handleCommentSubmit" class="flex gap-x-4 items-center">
                <textarea
                    v-model="newComment"
                    placeholder="Écrivez votre commentaire..."
                    rows="3"
                    class="flex-1 p-3 text-xs font-montserrat border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-default"
                ></textarea>
                <button
                    type="submit"
                    class="px-5 py-2 bg-default text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-nunito"
                >
                    Ajouter
                </button>
            </form>
        </div>
    </div>
  </div>
</template>