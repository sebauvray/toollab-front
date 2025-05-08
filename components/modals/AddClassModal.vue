<script setup>
import { ref } from 'vue'
import SelectGenre from "~/components/form/SelectGenre.vue"
import SaveButton from "~/components/form/SaveButton.vue"
import CancelButton from "~/components/form/CancelButton.vue"
import Cross from "~/components/Icons/Cross.vue"
import InputText from "~/components/form/InputText.vue"
import InputSelect from "~/components/form/InputSelect.vue"
import InputNumber from "~/components/form/InputNumber.vue"

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  cursusName: {
    type: String,
    default: ''
  },
  levelId: {
    type: Number,
    default: 1
  },
  levels: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save'])
const error = ref('')
const isSubmitting = ref(false)

const newClass = ref({
  name: '',
  gender: '',
  size: '',
  levelId: 1
})

// Formater les niveaux pour le composant InputSelect
const levelOptions = computed(() => {
  return props.levels.map(level => ({
    value: level.id,
    label: level.name
  }))
})

const handleSave = () => {
  if (!newClass.value.name || !newClass.value.gender || !newClass.value.size) {
    error.value = 'Tous les champs sont requis'
    return
  }

  try {
    isSubmitting.value = true
    error.value = ''

    const classData = {
      ...newClass.value,
      size: parseInt(newClass.value.size)
    }

    emit('save', classData)

    // Reset form
    newClass.value = {
      name: '',
      gender: '',
      size: '',
      levelId: 1
    }

    // Close modal
    emit('close')
  } catch (err) {
    console.error('Erreur lors de la création de la classe:', err)
    error.value = 'Une erreur est survenue lors de la création de la classe'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl px-8 pt-8 pb-10 w-[60rem] max-h-[95vh] h-[28rem] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold mx-auto">Ajouter une classe</h2>
        <button
            @click="$emit('close')"
            class="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50"
            aria-label="Fermer"
        >
          <Cross class="size-6"/>
        </button>
      </div>
      <div class="w-full h-px border rounded-xl bg-gray-200"></div>

      <div v-if="error" class="bg-red-100 text-red-800 p-3 rounded mt-4 mb-2">
        {{ error }}
      </div>

      <div class="mt-10">
        <div class="grid grid-cols-2 gap-10 mb-10">
          <div>
            <InputText
                v-model="newClass.name"
                placeholder="Nom de la classe"
            />
          </div>

          <div>
            <InputSelect
                v-model="newClass.levelId"
                :options="levelOptions"
                placeholder="Niveau"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-10 mb-4">
          <!-- Genre -->
          <div>
            <SelectGenre
                v-model="newClass.gender"
                placeholder="Genre"
            />
          </div>

          <div>
            <InputNumber
                v-model="newClass.size"
                placeholder="Effectif maximum"
                :min="1"
                :max="100"
            />
          </div>
        </div>
      </div>

      <div class="flex justify-center gap-x-3 mt-24">
        <CancelButton @click="$emit('close')" :disabled="isSubmitting">Annuler</CancelButton>
        <SaveButton @click="handleSave" :disabled="isSubmitting">
          {{ isSubmitting ? 'Création en cours...' : 'Enregistrer' }}
        </SaveButton>
      </div>
    </div>
  </div>
</template>