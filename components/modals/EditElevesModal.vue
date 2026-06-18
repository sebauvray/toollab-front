<script setup>
import { ref, watch, computed } from 'vue'
import InputText from "~/components/form/InputText.vue"
import SaveButton from "~/components/form/SaveButton.vue"
import CancelButton from "~/components/form/CancelButton.vue"
import DatePicker from "~/components/form/DatePicker.vue"
import Cross from "~/components/Icons/Cross.vue"
import { getErrorMessage } from "~/utils/errors"

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    },
    student: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'save'])
const isLoading = ref(false)
const error = ref('')
const fieldErrors = ref({})

const genderOptions = [
    { value: 'M', label: 'Homme' },
    { value: 'F', label: 'Femme' }
]

const editStudent = ref({})

const resetErrors = () => {
    error.value = ''
    fieldErrors.value = {}
}

const setFieldError = (field, message) => {
    fieldErrors.value = {
        ...fieldErrors.value,
        [field]: [message]
    }
}

const firstError = (...fields) => {
    for (const field of fields) {
        const message = fieldErrors.value[field]?.[0]
        if (message) return message
    }
    return ''
}

watch(
    () => [props.student, props.isOpen],
    ([newStudent, open]) => {
        if (open && newStudent) {
            editStudent.value = { ...newStudent };
            resetErrors()
        }
        if (!open) resetErrors()
    },
    { immediate: true }
);

const handleSave = async () => {
    try {
        resetErrors()
        if (!editStudent.value.last_name) setFieldError('last_name', 'Le nom est requis.')
        if (!editStudent.value.first_name) setFieldError('first_name', 'Le prénom est requis.')
        if (!editStudent.value.birthdate) setFieldError('birthdate', 'La date de naissance est requise.')
        if (!editStudent.value.gender) setFieldError('gender', 'Le genre est requis.')

        if (Object.keys(fieldErrors.value).length) {
            error.value = 'Veuillez corriger les champs indiqués.'
            return
        }

        isLoading.value = true
        await new Promise((resolve, reject) => {
            emit('save', { ...editStudent.value }, { resolve, reject })
        })
        emit('close')
    } catch (err) {
        console.error('Erreur lors de la modification de l’élève:', err)
        fieldErrors.value = err.response?.data?.errors || {}
        error.value = Object.keys(fieldErrors.value).length
            ? 'Veuillez corriger les champs indiqués.'
            : getErrorMessage(err, 'Une erreur est survenue lors de la modification de l’élève')
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <div v-if="isOpen && student" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3" @click.self="$emit('close')">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between">
                <h2 class="text-base font-bold text-default font-montserrat">Modifier l'élève</h2>
                <button
                    @click="$emit('close')"
                    class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
                    aria-label="Fermer">
                    <Cross class="size-4"/>
                </button>
            </div>

            <div class="px-5 py-4 space-y-3">
                <div v-if="error" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg text-xs">
                    {{ error }}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <InputText
                            v-model="editStudent.last_name"
                            placeholder="Nom"
                            required
                            aria-label="Nom de l'élève"/>
                        <p v-if="firstError('last_name', 'lastname')" class="text-xs text-red-600 mt-1">{{ firstError('last_name', 'lastname') }}</p>
                    </div>
                    <div>
                        <InputText
                            v-model="editStudent.first_name"
                            placeholder="Prénom"
                            required
                            aria-label="Prénom de l'élève"/>
                        <p v-if="firstError('first_name', 'firstname')" class="text-xs text-red-600 mt-1">{{ firstError('first_name', 'firstname') }}</p>
                    </div>
                    <div>
                        <DatePicker
                            v-model="editStudent.birthdate"
                            placeholder="Date de naissance"
                            required
                            aria-label="Date de naissance"/>
                        <p v-if="firstError('birthdate')" class="text-xs text-red-600 mt-1">{{ firstError('birthdate') }}</p>
                    </div>
                    <div>
                        <div class="inline-flex rounded-lg border border-input-stroke overflow-hidden divide-x divide-input-stroke w-fit">
                            <button
                                v-for="option in genderOptions"
                                :key="option.value"
                                type="button"
                                @click="editStudent.gender = option.value"
                                :class="[
                                    'px-3 py-1.5 text-xs font-medium transition-colors',
                                    editStudent.gender === option.value ? 'bg-default text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                                ]"
                            >{{ option.label }}</button>
                        </div>
                        <p v-if="firstError('gender')" class="text-xs text-red-600 mt-1">{{ firstError('gender') }}</p>
                    </div>
                </div>
            </div>

            <div class="px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5">
                <CancelButton @click="$emit('close')" :disabled="isLoading">Annuler</CancelButton>
                <SaveButton @click="handleSave" :disabled="isLoading">
                    {{ isLoading ? 'Enregistrement…' : 'Enregistrer' }}
                </SaveButton>
            </div>
        </div>
    </div>
</template>
