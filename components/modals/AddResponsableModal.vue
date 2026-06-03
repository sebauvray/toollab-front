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

const genderOptions = [
    {value: 'M', label: 'Homme'},
    {value: 'F', label: 'Femme'}
]

const formData = ref({
    firstname: '',
    lastname: '',
    phone: '',
    email: '',
    address: '',
    zipcode: '',
    city: '',
    birthdate: '',
    is_student: false,
    gender: '',
})

const handleSave = async () => {
    try {
        isSubmitting.value = true;
        error.value = '';

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

        const {setFlashMessage} = useFlashMessage();
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
        <div class="bg-white rounded-2xl px-6 pt-4 pb-5 w-[95vw] max-w-[50rem] max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-3">
                <h2 class="text-lg font-bold mx-auto">Ajouter un responsable</h2>
                <button @click="$emit('close')"
                        class="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-50">
                    <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="w-full h-px border rounded-xl bg-gray-200"></div>

            <div v-if="error" class="bg-red-100 text-red-800 p-2 rounded mt-3 mb-1.5">
                {{ error }}
            </div>

            <div class="text-lg font-bold pl-1.5 text-default mt-8 mb-5">Responsable</div>
            <div class="grid grid-cols-2 gap-5 ">
                <InputText v-model="formData.lastname" placeholder="Nom"/>
                <InputText v-model="formData.firstname" placeholder="Prénom"/>

            </div>

            <div class="grid grid-cols-2 gap-5 mt-8">
                <div class="text-sm font-semibold pl-1 text-default">Contact</div>
                <div class="text-sm font-semibold pl-1 text-default">Adresse</div>


                <InputText v-model="formData.phone" placeholder="Numéro de téléphone"/>
                <InputText v-model="formData.address" placeholder="Voie"/>
                <InputText v-model="formData.email" placeholder="Email"/>
                <InputText v-model="formData.zipcode" placeholder="Code postal"/>
                <div></div>
                <InputText v-model="formData.city" placeholder="Ville"/>


            </div>

            <div class="grid grid-cols-2 gap-5 mt-8">

                <div class="flex items-center justify-start gap-x-3">
                    <ToogleButton v-model="isEleve"/>
                    <div class="text-xs text-default">Le responsable est aussi élève</div>
                </div>

                <div class="min-h-12">
                    <DatePicker
                        v-show="isEleve"
                        v-model="formData.birthdate"
                        placeholder="Date de naissance"
                    />

                    <div v-show="isEleve" class="flex gap-3 mt-3">
                        <label v-for="option in genderOptions" :key="option.value" class="flex items-center gap-1.5">
                            <input
                                type="radio"
                                v-model="formData.gender"
                                :value="option.value"
                                class="accent-default border-gray-300 focus:ring-accent-default size-4"
                            >
                            <span class="text-xs">{{ option.label }}</span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="flex justify-center gap-x-2 mt-8">
                <CancelButton @click="$emit('close')" :disabled="isSubmitting">Annuler</CancelButton>
                <SaveButton @click="handleSave" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Création en cours...' : 'Enregistrer' }}
                </SaveButton>
            </div>
        </div>
    </div>
</template>