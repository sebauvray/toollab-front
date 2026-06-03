<script setup>
import { ref } from 'vue'
import InputText from "~/components/form/InputText.vue"
import InputNumber from "~/components/form/InputNumber.vue"
import SaveButton from "~/components/form/SaveButton.vue"
import CancelButton from "~/components/form/CancelButton.vue"
import Cross from "~/components/Icons/Cross.vue"
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
  levels_count: 1,
  progression: 'levels'
})

const handleSave = () => {
  if (!currentCursus.value.name.trim()) {
    error.value = 'Le nom du cursus est requis'
    return
  }

  if (currentCursus.value.progression === 'levels' && (!currentCursus.value.levels_count || currentCursus.value.levels_count < 1)) {
    error.value = 'Le nombre de niveaux doit être au moins de 1'
    return
  }

  if (currentCursus.value.progression === 'levels' && (!currentCursus.value.levels_count || currentCursus.value.levels_count > 20)) {
        error.value = 'Le cursus ne peut pas avoir plus de 20 niveaux'
        return
  }

  try {
    isSubmitting.value = true
    error.value = ''

    const cursusToSave = {
      name: currentCursus.value.name,
      levels_count: currentCursus.value.progression === 'levels' ? currentCursus.value.levels_count : 0,
      progression: currentCursus.value.progression
    }

    emit('save', cursusToSave)

    currentCursus.value = {
      name: '',
      levels_count: 1,
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
    <div class="bg-white rounded-2xl px-6 pt-5 pb-8 w-[50rem] max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-lg font-bold mx-auto">Ajouter un cursus</h2>
        <button
            @click="$emit('close')"
            class="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-50"
            aria-label="Fermer"
        >
          <Cross class="size-4"/>
        </button>
      </div>
      <div class="w-full h-px border rounded-xl bg-gray-200"></div>

      <div v-if="error" class="bg-red-100 text-red-800 p-2 rounded mt-3 mb-1.5">
        {{ error }}
      </div>

      <div class="mt-6">
        <div class="grid grid-cols-2 gap-5 mb-6">
          <div class="flex flex-col gap-y-1.5">
            <div class="text-sm font-semibold text-default mb-1 pl-1">Nom du cursus</div>
            <InputText
                v-model="currentCursus.name"
                placeholder="Nom du cursus"
                required
            />
          </div>
          <div class="flex flex-col justify-between">
            <div class="text-sm font-semibold text-default mb-1 pl-1">Type de cursus</div>
            <ToogleCursus v-model="currentCursus.progression" />
          </div>
        </div>

        <div v-if="currentCursus.progression === 'levels'" class="flex flex-col gap-y-3 mt-8">
          <div class="text-sm font-semibold text-default mb-1 pl-1">Nombre de niveaux</div>
          <div class="w-1/2">
            <InputNumber
                v-model="currentCursus.levels_count"
                placeholder="Nombre de niveaux"
                :min="1"
                :max="20"
            />
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