<script setup>
import {ref, watch} from 'vue'
import InputText from "~/components/form/InputText.vue";
import SaveButton from "~/components/form/SaveButton.vue";
import CancelButton from "~/components/form/CancelButton.vue";
import ToogleButton from "~/components/form/ToogleButton.vue";
import DatePicker from "~/components/form/DatePicker.vue";
import familyService from '~/services/family';

defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const isEleve = ref(false);
const emit = defineEmits(['close', 'save'])
const isSubmitting = ref(false);
const error = ref('');

const formData = ref({
  firstname: '',
  lastname: '',
  phone: '',
  email: '',
  address: '',
  zipcode: '',
  city: '',
  birthdate: '',
  is_student: false
})

const handleSave = async () => {
  try {
    isSubmitting.value = true;
    error.value = '';

    if (!formData.value.firstname || !formData.value.lastname || !formData.value.email) {
      error.value = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    const payload = {
      ...formData.value,
      is_student: isEleve.value
    };

    const response = await familyService.createFamily(payload);

    formData.value = {
      firstname: '',
      lastname: '',
      phone: '',
      email: '',
      address: '',
      zipcode: '',
      city: '',
      birthdate: ''
    };

    emit('save', response.data);
    emit('close');

    const { setFlashMessage } = useFlashMessage();
    setFlashMessage({
      type: 'success',
      message: response.message || 'Famille créée avec succès'
    });

  } catch (err) {
    error.value = err.response?.data?.message || 'Une erreur est survenue lors de la création de la famille';
    console.error('Erreur lors de la création de la famille:', err);
  } finally {
    isSubmitting.value = false;
  }
}

watch(isEleve, (newValue) => {
  formData.value.is_student = newValue;
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl px-12 pt-6 pb-10 w-[50rem] max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold mx-auto">Ajouter un responsable</h2>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50">
          <svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="w-full h-px border rounded-xl bg-gray-200"></div>

      <div v-if="error" class="bg-red-100 text-red-800 p-3 rounded mt-4 mb-2">
        {{ error }}
      </div>

      <div class="text-xl font-bold pl-2 text-default mt-10 mb-6">Responsable</div>
      <div class="grid grid-cols-2 gap-6 ">
        <InputText v-model="formData.lastname" placeholder="Nom"/>
        <InputText v-model="formData.firstname" placeholder="Prénom"/>

      </div>

      <div class="grid grid-cols-2 gap-6 mt-10">
        <div class="text-lg font-bold pl-2 text-default">Contact</div>
        <div class="text-lg font-bold pl-2 text-default">Adresse</div>


        <InputText v-model="formData.phone" placeholder="Numéro de téléphone"/>
        <InputText v-model="formData.address" placeholder="Voie"/>
        <InputText v-model="formData.email" placeholder="Email"/>
        <InputText v-model="formData.zipcode" placeholder="Code postal"/>
        <div></div>
        <InputText v-model="formData.city" placeholder="Ville"/>


      </div>

      <div class="grid grid-cols-2 gap-6 mt-10">

        <div class="flex items-center justify-start gap-x-4">
          <ToogleButton v-model="isEleve"/>
          <div  class="text-sm text-default">Le responsable est aussi élève</div>
        </div>

        <div class="min-h-12">
          <DatePicker
              v-show="isEleve"
              v-model="formData.birthdate"
              placeholder="Date de naissance"
          />
        </div>
      </div>

      <div class="flex justify-center gap-x-3 mt-10">
        <CancelButton @click="$emit('close')" :disabled="isSubmitting">Annuler</CancelButton>
        <SaveButton @click="handleSave" :disabled="isSubmitting">
          {{ isSubmitting ? 'Création en cours...' : 'Enregistrer' }}
        </SaveButton>
      </div>
    </div>
  </div>
</template>