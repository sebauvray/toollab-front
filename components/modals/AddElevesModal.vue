<script setup>
import {ref} from 'vue'
import InputText from "~/components/form/InputText.vue"
import SaveButton from "~/components/form/SaveButton.vue"
import CancelButton from "~/components/form/CancelButton.vue"
import DatePicker from "~/components/form/DatePicker.vue"
import PlusLight from "~/components/Icons/PlusLight.vue";
import Cross from "~/components/Icons/Cross.vue";
import Trash from "~/components/Icons/Trash.vue";

defineProps({
    isOpen: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['close', 'save'])
const isLoading = ref(false)
const error = ref('');

const getEmptyStudent = () => ({
    firstname: '',
    lastname: '',
    birthdate: '',
    gender: 'M'
})

const students = ref([getEmptyStudent()])

const handleAddStudent = () => {
    students.value.push(getEmptyStudent())
}

const handleRemoveStudent = (index) => {
    students.value.splice(index, 1)
}

const handleSave = async () => {
    try {
        error.value = '';
        isLoading.value = true;

        await new Promise((resolve, reject) => {
            emit('save', [...students.value], { resolve, reject })
        });

        students.value = [getEmptyStudent()];
        handleClose();

    } catch (err) {
        error.value = err.response?.data?.message || err.message || 'Une erreur est survenue';
    } finally {
        isLoading.value = false;
    }
}

const handleClose = () => {
    error.value = '';
    emit('close');
}

const genderOptions = [
    {value: 'M', label: 'Homme'},
    {value: 'F', label: 'Femme'}
]
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col">
            <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between shrink-0">
                <h2 class="text-base font-bold text-default font-montserrat">Ajouter des élèves</h2>
                <button
                    @click="handleClose"
                    class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
                    aria-label="Fermer">
                    <Cross class="size-4"/>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <div v-if="error" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg text-xs">
                    {{ error }}
                </div>

                <div class="rounded-xl border border-[#E6EFF5] divide-y divide-[#E6EFF5]">
                    <div v-for="(student, index) in students" :key="index" class="px-4 py-3">
                        <div class="flex items-center justify-between mb-2.5">
                            <h4 class="text-[11px] font-montserrat font-semibold text-gray-500">Élève {{ index + 1 }}</h4>
                            <button
                                v-if="students.length > 1"
                                @click="handleRemoveStudent(index)"
                                class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                aria-label="Retirer cet élève">
                                <Trash class="size-3.5"/>
                            </button>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2.5 items-center">
                            <InputText
                                v-model="student.lastname"
                                placeholder="Nom"
                                required
                                aria-label="Nom de l'élève"/>
                            <InputText
                                v-model="student.firstname"
                                placeholder="Prénom"
                                required
                                aria-label="Prénom de l'élève"/>
                            <DatePicker
                                v-model="student.birthdate"
                                placeholder="Date de naissance"
                                required
                                aria-label="Date de naissance"/>
                            <div class="inline-flex rounded-lg border border-input-stroke overflow-hidden divide-x divide-input-stroke shrink-0">
                                <button
                                    v-for="option in genderOptions"
                                    :key="option.value"
                                    type="button"
                                    @click="student.gender = option.value"
                                    :class="[
                                        'px-3 py-1.5 text-xs font-medium transition-colors',
                                        student.gender === option.value ? 'bg-default text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                                    ]"
                                >{{ option.label }}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    @click="handleAddStudent"
                    class="inline-flex items-center gap-x-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-xs hover:bg-gray-50 transition-colors"
                    aria-label="Ajouter un nouvel élève">
                    <PlusLight class="size-3.5"/>
                    <span>Ajouter un autre élève</span>
                </button>
            </div>

            <div class="px-5 py-3 border-t border-[#E6EFF5] flex items-center justify-end gap-x-1.5 shrink-0">
                <CancelButton @click="handleClose" :disabled="isLoading">Annuler</CancelButton>
                <SaveButton @click="handleSave" :disabled="isLoading">
                    {{ isLoading ? 'Enregistrement…' : `Enregistrer ${students.length > 1 ? students.length + ' élèves' : "l'élève"}` }}
                </SaveButton>
            </div>
        </div>
    </div>
</template>
