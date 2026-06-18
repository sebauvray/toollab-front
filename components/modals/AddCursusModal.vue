<script setup>
import { ref, watch } from 'vue'
import InputText from "~/components/form/InputText.vue"
import InputNumber from "~/components/form/InputNumber.vue"
import SaveButton from "~/components/form/SaveButton.vue"
import CancelButton from "~/components/form/CancelButton.vue"
import Cross from "~/components/Icons/Cross.vue"
import ToogleCursus from "~/components/form/ToogleCursus.vue"
import { getErrorMessage } from "~/utils/errors"

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])
const isSubmitting = ref(false)
const error = ref('')
const fieldErrors = ref({})

const currentCursus = ref({
  name: '',
  levels_count: 1,
  progression: 'levels'
})

const resetForm = () => {
  currentCursus.value = {
    name: '',
    levels_count: 1,
    progression: 'levels'
  }
  error.value = ''
  fieldErrors.value = {}
}

const setFieldError = (field, message) => {
  fieldErrors.value = {
    ...fieldErrors.value,
    [field]: [message]
  }
}

const firstError = (field) => fieldErrors.value[field]?.[0] || ''

const handleSave = async () => {
  error.value = ''
  fieldErrors.value = {}

  if (!currentCursus.value.name.trim()) {
    setFieldError('name', 'Le nom du cursus est requis.')
    error.value = 'Veuillez corriger les champs indiqués.'
    return
  }

  if (currentCursus.value.progression === 'levels' && (!currentCursus.value.levels_count || currentCursus.value.levels_count < 1)) {
    setFieldError('levels_count', 'Le nombre de niveaux doit être au moins de 1.')
    error.value = 'Veuillez corriger les champs indiqués.'
    return
  }

  if (currentCursus.value.progression === 'levels' && (!currentCursus.value.levels_count || currentCursus.value.levels_count > 20)) {
    setFieldError('levels_count', 'Le cursus ne peut pas avoir plus de 20 niveaux.')
    error.value = 'Veuillez corriger les champs indiqués.'
    return
  }

  try {
    isSubmitting.value = true

    const cursusToSave = {
      name: currentCursus.value.name,
      levels_count: currentCursus.value.progression === 'levels' ? currentCursus.value.levels_count : 0,
      progression: currentCursus.value.progression
    }

    await new Promise((resolve, reject) => {
      emit('save', cursusToSave, { resolve, reject })
    })

    resetForm()
    emit('close')
  } catch (err) {
    console.error('Erreur lors de la création du cursus:', err)
    fieldErrors.value = err.response?.data?.errors || {}
    error.value = Object.keys(fieldErrors.value).length
      ? 'Veuillez corriger les champs indiqués.'
      : getErrorMessage(err, 'Une erreur est survenue lors de la création du cursus')
  } finally {
    isSubmitting.value = false
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) resetForm()
  else {
    error.value = ''
    fieldErrors.value = {}
  }
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-xl">
      <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between">
        <h2 class="text-base font-bold text-default font-montserrat">Ajouter un cursus</h2>
        <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
            aria-label="Fermer"
        >
          <Cross class="size-4"/>
        </button>
      </div>

      <div class="px-5 py-4 space-y-4">
        <div v-if="error" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg text-xs">
          {{ error }}
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Cursus</h3>
          <InputText
              v-model="currentCursus.name"
              placeholder="Nom du cursus"
              required
          />
          <p v-if="firstError('name')" class="text-xs text-red-600 mt-1">{{ firstError('name') }}</p>
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Progression</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <ToogleCursus v-model="currentCursus.progression" />
            <InputNumber
                v-if="currentCursus.progression === 'levels'"
                v-model="currentCursus.levels_count"
                placeholder="Nombre de niveaux"
                :min="1"
                :max="20"
            />
          </div>
          <p v-if="firstError('levels_count')" class="text-xs text-red-600 mt-1">{{ firstError('levels_count') }}</p>
          <p class="text-[11px] text-placeholder mt-1.5">
            {{ currentCursus.progression === 'levels' ? 'Les élèves progressent de niveau en niveau d\'une année sur l\'autre.' : 'Cursus sans niveaux : les élèves restent dans le même groupe.' }}
          </p>
        </div>
      </div>

      <div class="px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5">
        <CancelButton @click="$emit('close')" :disabled="isSubmitting">Annuler</CancelButton>
        <SaveButton @click="handleSave" :disabled="isSubmitting">
          {{ isSubmitting ? 'Création en cours…' : 'Enregistrer' }}
        </SaveButton>
      </div>
    </div>
  </div>
</template>
