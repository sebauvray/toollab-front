<script setup>
import { ref } from 'vue'
import InputText from "~/components/form/InputText.vue"
import SaveButton from "~/components/form/SaveButton.vue"
import CancelButton from "~/components/form/CancelButton.vue"
import PlusLight from "~/components/Icons/PlusLight.vue"
import Cross from "~/components/Icons/Cross.vue"
import Trash from "~/components/Icons/Trash.vue"
import ToogleCursus from "~/components/form/ToogleCursus.vue"

defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])
const isSubmitting = ref(false)
const error = ref('')

const currentCursus = ref({
  name: '',
  levels: [''],
  progression: 'levels'
})

const addLevel = () => {
  currentCursus.value.levels.push('')
}

const deleteLevel = (index) => {
  if (index > 0) {
    currentCursus.value.levels.splice(index, 1)
  }
}

const handleSave = () => {
  if (!currentCursus.value.name.trim()) {
    error.value = 'Le nom du cursus est requis'
    return
  }

  if (!currentCursus.value.levels[0].trim()) {
    error.value = 'Au moins un niveau doit être renseigné'
    return
  }

  try {
    isSubmitting.value = true
    error.value = ''

    const nonEmptyLevels = currentCursus.value.levels.filter(level => level.trim() !== '')

    const cursusToSave = {
      name: currentCursus.value.name,
      levels: nonEmptyLevels,
      progression: currentCursus.value.progression
    }

    emit('save', cursusToSave)

    currentCursus.value = {
      name: '',
      levels: [''],
      progression: 'levels'
    }

    emit('close')

  } catch (err) {
    console.error('Erreur lors de la création du cursus:', err)
    error.value = 'Une erreur est survenue lors de la création du cursus'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl px-8 pt-6 pb-10 w-[50rem] max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold mx-auto">Ajouter un cursus</h2>
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

      <div class="mt-8">
        <div class="grid grid-cols-2 gap-6 mb-8">
          <div class="flex flex-col gap-y-2">
            <div class="text-lg font-bold text-default mb-2 pl-2">Nom du cursus</div>
            <InputText
                v-model="currentCursus.name"
                placeholder="Nom du cursus"
                required
            />
          </div>
          <div class="flex flex-col justify-between">
            <div class="text-lg font-bold text-default mb-2 pl-2">Type de cursus</div>
            <ToogleCursus v-model="currentCursus.progression" />
          </div>
        </div>

        <div class="flex flex-col gap-y-4 mt-10">
          <div class="text-lg font-bold text-default mb-2 pl-2">Niveaux</div>

          <div v-for="(level, index) in currentCursus.levels" :key="index" class="flex items-center gap-x-2">
            <div class="flex-1">
              <div class="relative flex items-center">
                <InputText
                    v-model="currentCursus.levels[index]"
                    :placeholder="`Nom du niveau ${index + 1}`"
                />
                <button
                    v-if="index > 0"
                    @click="deleteLevel(index)"
                    class="absolute right-3 text-gray-500 hover:text-red-500 transition-colors"
                    type="button"
                >
                  <Trash class="size-5" />
                </button>
              </div>
            </div>
          </div>

          <button
              @click="addLevel"
              class="bg-white text-default border border-gray-300 mt-3 flex items-center justify-center gap-x-2 py-2 px-4 rounded-md hover:bg-gray-50 w-fit mx-auto"
          >
            <PlusLight class="size-5"/>
            <span>Ajouter un niveau</span>
          </button>
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