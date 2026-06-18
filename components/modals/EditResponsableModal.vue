<script setup>
import {ref, watch} from 'vue'
import InputText from "~/components/form/InputText.vue";
import SaveButton from "~/components/form/SaveButton.vue";
import CancelButton from "~/components/form/CancelButton.vue";
import ToogleButton from "~/components/form/ToogleButton.vue";
import DatePicker from "~/components/form/DatePicker.vue";
import Cross from "~/components/Icons/Cross.vue";
import familyService from '~/services/family';
import { getErrorMessage } from '~/utils/errors';

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    },
    familyId: {
        type: Number,
        required: true
    },
    responsable: {
        type: Object,
        required: true
    }
})
const isEleve = ref(false);
const emit = defineEmits(['close', 'save'])
const isSubmitting = ref(false);
const error = ref('');
const fieldErrors = ref({});

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
    gender: ''
});

const editResponsable = ref({});

const resetErrors = () => {
    error.value = '';
    fieldErrors.value = {};
}

watch(
    () => [props.responsable, props.isOpen],
    ([newResponsable, open]) => {
        if (open && newResponsable) {
            resetErrors();
            editResponsable.value = { ...newResponsable };
            formData.value = {
                firstname: newResponsable.first_name || '',
                lastname: newResponsable.last_name || '',
                phone: newResponsable.phone || '',
                email: newResponsable.email || '',
                address: newResponsable.address || '',
                zipcode: newResponsable.zipcode || '',
                city: newResponsable.city || '',
                birthdate: newResponsable.birthdate || '',
                is_student: newResponsable.is_student || false,
                gender: newResponsable.gender || '',
            };
            isEleve.value = !!newResponsable.is_student;
        } else if (!open) {
            resetErrors();
        }
    },
    { immediate: true }
);

const handleSave = async () => {
    try {
        isSubmitting.value = true;
        resetErrors();

        const payload = {
            ...formData.value,
            is_student: isEleve.value
        };

        const response = await familyService.updateResponsible(props.familyId, props.responsable.id, payload);

        formData.value = {
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
        };
        resetErrors();

        emit('save', response.data);
        emit('close');

        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'success',
            message: response.message || 'Responsable mis à jour avec succès'
        });

    } catch (err) {
        fieldErrors.value = err.response?.data?.errors || {};
        error.value = Object.keys(fieldErrors.value).length
            ? 'Veuillez corriger les champs indiqués.'
            : getErrorMessage(err, 'Une erreur est survenue lors de la mise à jour du responsable');
        console.error('Erreur lors de la mise à jour du responsable:', err);
    } finally {
        isSubmitting.value = false;
    }
}

const firstError = (field) => fieldErrors.value[field]?.[0] || '';

watch(isEleve, (newValue) => {
    formData.value.is_student = newValue;
});
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3" @click.self="$emit('close')">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[88vh] flex flex-col">
            <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between shrink-0">
                <h2 class="text-base font-bold text-default font-montserrat">Modifier le responsable</h2>
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
                    <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Identité</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <InputText v-model="formData.lastname" placeholder="Nom"/>
                            <p v-if="firstError('lastname')" class="text-xs text-red-600 mt-1">{{ firstError('lastname') }}</p>
                        </div>
                        <div>
                            <InputText v-model="formData.firstname" placeholder="Prénom"/>
                            <p v-if="firstError('firstname')" class="text-xs text-red-600 mt-1">{{ firstError('firstname') }}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Contact</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <InputText v-model="formData.phone" placeholder="Numéro de téléphone"/>
                            <p v-if="firstError('phone')" class="text-xs text-red-600 mt-1">{{ firstError('phone') }}</p>
                        </div>
                        <div>
                            <InputText v-model="formData.email" placeholder="Email"/>
                            <p v-if="firstError('email')" class="text-xs text-red-600 mt-1">{{ firstError('email') }}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Adresse</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="col-span-2">
                            <InputText v-model="formData.address" placeholder="Voie"/>
                            <p v-if="firstError('address')" class="text-xs text-red-600 mt-1">{{ firstError('address') }}</p>
                        </div>
                        <div>
                            <InputText v-model="formData.zipcode" placeholder="Code postal"/>
                            <p v-if="firstError('zipcode')" class="text-xs text-red-600 mt-1">{{ firstError('zipcode') }}</p>
                        </div>
                        <div>
                            <InputText v-model="formData.city" placeholder="Ville"/>
                            <p v-if="firstError('city')" class="text-xs text-red-600 mt-1">{{ firstError('city') }}</p>
                        </div>
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
                        <div>
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
                            <p v-if="firstError('gender')" class="text-xs text-red-600 mt-1">{{ firstError('gender') }}</p>
                        </div>
                        <p v-if="firstError('birthdate')" class="text-xs text-red-600 sm:col-span-2">{{ firstError('birthdate') }}</p>
                    </div>
                </div>
            </div>

            <div class="px-5 py-3 border-t border-[#E6EFF5] flex items-center justify-end gap-x-1.5 shrink-0">
                <CancelButton @click="$emit('close')" :disabled="isSubmitting">Annuler</CancelButton>
                <SaveButton @click="handleSave" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Enregistrement…' : 'Enregistrer' }}
                </SaveButton>
            </div>
        </div>
    </div>
</template>
