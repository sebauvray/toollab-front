<script setup>
import { ref, watch } from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import InputText from '~/components/form/InputText.vue'
import SaveButton from '~/components/form/SaveButton.vue'
import CancelButton from '~/components/form/CancelButton.vue'
import { getErrorMessage } from '~/utils/errors'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  cursus: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['close', 'save'])

const name = ref('')
const error = ref('')
const fieldErrors = ref({})
const isSubmitting = ref(false)

const firstError = (field) => fieldErrors.value[field]?.[0] || ''

const resetForm = () => {
  name.value = props.cursus?.name || ''
  error.value = ''
  fieldErrors.value = {}
}

const setFieldError = (field, message) => {
  fieldErrors.value = {
    ...fieldErrors.value,
    [field]: [message]
  }
}

const handleSave = async () => {
  error.value = ''
  fieldErrors.value = {}

  const trimmedName = name.value.trim()

  if (!trimmedName) {
    setFieldError('name', 'Le nom du cursus est requis.')
    error.value = 'Veuillez corriger les champs indiqués.'
    return
  }

  try {
    isSubmitting.value = true

    await new Promise((resolve, reject) => {
      emit('save', { id: props.cursus.id, name: trimmedName }, { resolve, reject })
    })

    emit('close')
  } catch (err) {
    console.error('Erreur lors de la modification du cursus:', err)
    fieldErrors.value = err.response?.data?.errors || {}
    error.value = Object.keys(fieldErrors.value).length
      ? 'Veuillez corriger les champs indiqués.'
      : getErrorMessage(err, 'Une erreur est survenue lors de la modification du cursus')
  } finally {
    isSubmitting.value = false
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) resetForm()
})

watch(() => props.cursus, () => {
  if (props.isOpen) resetForm()
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-xl">
      <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between">
        <h2 class="text-base font-bold text-default font-montserrat">Modifier le cursus</h2>
        <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
            aria-label="Fermer"
        >
          <Cross class="size-4" />
        </button>
      </div>

      <div class="px-5 py-4 space-y-4">
        <div v-if="error" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg text-xs">
          {{ error }}
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Nom du cursus</h3>
          <InputText
              v-model="name"
              placeholder="Nom du cursus"
              required
          />
          <p v-if="firstError('name')" class="text-xs text-red-600 mt-1">{{ firstError('name') }}</p>
          <p class="text-[11px] text-placeholder mt-1.5">
            Seul le nom est modifiable. Le type de progression et les niveaux restent verrouillés après création.
          </p>
        </div>
      </div>

      <div class="px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5">
        <CancelButton @click="$emit('close')" :disabled="isSubmitting">Annuler</CancelButton>
        <SaveButton @click="handleSave" :disabled="isSubmitting">
          {{ isSubmitting ? 'Modification en cours...' : 'Enregistrer' }}
        </SaveButton>
      </div>
    </div>
  </div>
</template>
