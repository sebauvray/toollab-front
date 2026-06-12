<script setup>
import { ref, watch, computed } from 'vue'
import InputText from "~/components/form/InputText.vue"
import SaveButton from "~/components/form/SaveButton.vue"
import CancelButton from "~/components/form/CancelButton.vue"
import DatePicker from "~/components/form/DatePicker.vue"
import Cross from "~/components/Icons/Cross.vue"

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

const genderOptions = [
    { value: 'M', label: 'Homme' },
    { value: 'F', label: 'Femme' }
]

const editStudent = ref({})
watch(
    () => [props.student, props.isOpen],
    ([newStudent, open]) => {
        if (open && newStudent) {
            editStudent.value = { ...newStudent };
        }
    },
    { immediate: true }
);

const handleSave = async () => {
    try {
        isLoading.value = true
        emit('save', { ...editStudent.value })
        emit('close')
    } catch (error) {
        console.error('Error saving student:', error)
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

            <div class="px-5 py-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputText
                        v-model="editStudent.last_name"
                        placeholder="Nom"
                        required
                        aria-label="Nom de l'élève"/>
                    <InputText
                        v-model="editStudent.first_name"
                        placeholder="Prénom"
                        required
                        aria-label="Prénom de l'élève"/>
                    <DatePicker
                        v-model="editStudent.birthdate"
                        placeholder="Date de naissance"
                        required
                        aria-label="Date de naissance"/>
                    <div class="inline-flex rounded-lg border border-input-stroke overflow-hidden divide-x divide-input-stroke w-fit self-center">
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