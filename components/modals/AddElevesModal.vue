<script setup>
import { ref } from 'vue'
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
    isLoading.value = true
    emit('save', [...students.value])
    students.value = [getEmptyStudent()]
    emit('close')
  } catch (error) {
    console.error('Error saving students:', error)
  } finally {
    isLoading.value = false
  }
}

const genderOptions = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' }
]
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl px-8 pt-6 pb-10 w-[70rem] max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold mx-auto">Ajouter des élèves</h2>
        <button
            @click="$emit('close')"
            class="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50"
            aria-label="Fermer">
          <Cross class="size-6"/>
        </button>
      </div>
      <div class="w-full h-px border rounded-xl bg-gray-200"></div>

      <div v-for="(student, index) in students" :key="index" class="mt-8">
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex-1">
            <InputText
                v-model="student.lastname"
                placeholder="Nom"
                required
                aria-label="Nom de l'élève"/>
          </div>
          <div class="flex-1">
            <InputText
                v-model="student.firstname"
                placeholder="Prénom"
                required
                aria-label="Prénom de l'élève"/>
          </div>
          <div class="flex-1">
            <DatePicker
                v-model="student.birthdate"
                placeholder="Date de naissance"
                required
                aria-label="Date de naissance"/>
          </div>
          <div class="flex gap-4">
            <label v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
              <input
                  type="radio"
                  v-model="student.gender"
                  :value="option.value"
                  :name="'gender-' + index"
                  class="accent-default border-gray-300 focus:ring-accent-default size-4"
              >
              <span class="text-sm">{{ option.label }}</span>
            </label>
          </div>
          <div class="w-10 flex items-center justify-center">
            <button
                v-if="index > 0"
                @click="handleRemoveStudent(index)"
                class="text-gray-600 hover:text-gray-800 transition-colors"
                aria-label="Supprimer l'élève">
              <Trash class="size-5 hover:text-placeholder text-default"/>
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-center mt-6">
        <button
            @click="handleAddStudent"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            aria-label="Ajouter un nouvel élève">
         <PlusLight class="size-5"/>
          Ajouter un élève
        </button>
      </div>

      <div class="flex justify-center gap-x-3 mt-10">
        <CancelButton @click="$emit('close')" :disabled="isLoading">Annuler</CancelButton>
        <SaveButton @click="handleSave" :disabled="isLoading">
          {{ isLoading ? 'Enregistrement...' : 'Enregistrer' }}
        </SaveButton>
      </div>
    </div>
  </div>
</template>