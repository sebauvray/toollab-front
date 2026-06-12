<script setup>
import {ref, watch} from 'vue'
import InputText from "~/components/form/InputText.vue";
import SaveButton from "~/components/form/SaveButton.vue";
import CancelButton from "~/components/form/CancelButton.vue";
import ToogleButton from "~/components/form/ToogleButton.vue";
import DatePicker from "~/components/form/DatePicker.vue";
import Cross from "~/components/Icons/Cross.vue";
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
    <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3" @click.self="$emit('close')">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[88vh] flex flex-col">
            <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between shrink-0">
                <h2 class="text-base font-bold text-default font-montserrat">Créer une famille</h2>
                <button
                    @click="$emit('close')"
                    class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
                    aria-label="Fermer">
                    <Cross class="size-4"/>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <div v-if="error" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg text-xs">
                    {{ error }}
                </div>

                <div>
                    <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Responsable de la famille</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <InputText v-model="formData.lastname" placeholder="Nom"/>
                        <InputText v-model="formData.firstname" placeholder="Prénom"/>
                    </div>
                </div>

                <div>
                    <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Contact</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <InputText v-model="formData.phone" placeholder="Numéro de téléphone"/>
                        <InputText v-model="formData.email" placeholder="Email"/>
                    </div>
                </div>

                <div>
                    <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Adresse</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="col-span-2">
                            <InputText v-model="formData.address" placeholder="Voie"/>
                        </div>
                        <InputText v-model="formData.zipcode" placeholder="Code postal"/>
                        <InputText v-model="formData.city" placeholder="Ville"/>
                    </div>
                </div>

                <div class="rounded-xl border border-[#E6EFF5] px-4 py-3">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <p class="text-xs font-montserrat font-semibold text-default">Le responsable est aussi élève</p>
                            <p class="text-[11px] text-placeholder mt-0.5">Il pourra être inscrit dans une classe comme les autres élèves de la famille.</p>
                        </div>
                        <ToogleButton v-model="isEleve"/>
                    </div>

                    <div v-if="isEleve" class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center mt-3 pt-3 border-t border-[#E6EFF5]">
                        <DatePicker
                            v-model="formData.birthdate"
                            placeholder="Date de naissance"
                        />
                        <div class="inline-flex rounded-lg border border-input-stroke overflow-hidden divide-x divide-input-stroke">
                            <button
                                v-for="option in genderOptions"
                                :key="option.value"
                                type="button"
                                @click="formData.gender = option.value"
                                :class="[
                                    'px-3 py-1.5 text-xs font-medium transition-colors',
                                    formData.gender === option.value ? 'bg-default text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                                ]"
                            >{{ option.label }}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="px-5 py-3 border-t border-[#E6EFF5] flex items-center justify-end gap-x-1.5 shrink-0">
                <CancelButton @click="$emit('close')" :disabled="isSubmitting">Annuler</CancelButton>
                <SaveButton @click="handleSave" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Création en cours…' : 'Créer la famille' }}
                </SaveButton>
            </div>
        </div>
    </div>
</template>
