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
    <div v-if="isOpen && student" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl px-6 pt-5 pb-8 w-[95vw] max-w-[70rem] max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-3">
                <h2 class="text-lg font-bold mx-auto">Modifier l'élève</h2>
                <button
                    @click="$emit('close')"
                    class="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-50"
                    aria-label="Fermer">
                    <Cross class="size-4"/>
                </button>
            </div>
            <div class="w-full h-px border rounded-xl bg-gray-200"></div>

            <div class="mt-6">
                <div class="flex flex-wrap gap-3 items-center">
                    <div class="flex-1">
                        <InputText
                            v-model="editStudent.last_name"
                            placeholder="Nom"
                            required
                            aria-label="Nom de l'élève"/>
                    </div>
                    <div class="flex-1">
                        <InputText
                            v-model="editStudent.first_name"
                            placeholder="Prénom"
                            required
                            aria-label="Prénom de l'élève"/>
                    </div>
                    <div class="flex-1">
                        <DatePicker
                            v-model="editStudent.birthdate"
                            placeholder="Date de naissance"
                            required
                            aria-label="Date de naissance"/>
                    </div>
                    <div class="flex gap-3">
                        <label v-for="option in genderOptions" :key="option.value" class="flex items-center gap-1.5">
                            <input
                                type="radio"
                                v-model="editStudent.gender"
                                :value="option.value"
                                name="gender"
                                class="accent-default border-gray-300 focus:ring-accent-default size-4"
                            >
                            <span class="text-xs">{{ option.label }}</span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="flex justify-center gap-x-2 mt-8">
                <CancelButton @click="$emit('close')" :disabled="isLoading">Annuler</CancelButton>
                <SaveButton @click="handleSave" :disabled="isLoading">
                    {{ isLoading ? 'Enregistrement...' : 'Enregistrer' }}
                </SaveButton>
            </div>
        </div>
    </div>
</template>