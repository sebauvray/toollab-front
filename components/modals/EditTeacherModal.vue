<script setup>
import {ref, watch} from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import InputText from '~/components/form/InputText.vue'
import { getErrorMessage } from '~/utils/errors'

const props = defineProps({
  isOpen: {type: Boolean, required: true},
  teacher: {type: Object, default: null}
})

const emit = defineEmits(['close', 'save'])

const form = ref({first_name: '', last_name: '', email: ''})
const error = ref('')
const fieldErrors = ref({})
const isSubmitting = ref(false)

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

watch(() => [props.teacher, props.isOpen], ([t, isOpen]) => {
  if (t && isOpen) {
    form.value = {
      first_name: t.first_name || '',
      last_name: t.last_name || '',
      email: t.email || ''
    }
    resetErrors()
  }
  if (!isOpen) resetErrors()
}, {immediate: true})

const handleSubmit = async () => {
  resetErrors()
  if (!form.value.first_name || !form.value.last_name || !form.value.email) {
    if (!form.value.last_name) setFieldError('last_name', 'Le nom est requis.')
    if (!form.value.first_name) setFieldError('first_name', 'Le prénom est requis.')
    if (!form.value.email) setFieldError('email', 'L’email est requis.')
    error.value = 'Veuillez corriger les champs indiqués.'
    return
  }
  try {
    isSubmitting.value = true
    await new Promise((resolve, reject) => {
      emit('save', {...form.value}, { resolve, reject })
    })
  } catch (err) {
    fieldErrors.value = err.response?.data?.errors || {}
    error.value = Object.keys(fieldErrors.value).length
        ? 'Veuillez corriger les champs indiqués.'
        : getErrorMessage(err, 'Une erreur est survenue lors de la mise à jour du professeur')
  } finally {
    isSubmitting.value = false
  }
}

const setError = (msg) => {
  error.value = msg
}

const setErrors = (errors = {}, fallback = 'Une erreur est survenue lors de la mise à jour du professeur') => {
  fieldErrors.value = errors
  error.value = Object.keys(errors).length ? 'Veuillez corriger les champs indiqués.' : fallback
}

defineExpose({setError, setErrors})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md">
      <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between">
        <h2 class="text-base font-bold text-default font-montserrat">Modifier le professeur</h2>
        <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
            aria-label="Fermer"
        >
          <Cross class="size-4"/>
        </button>
      </div>

      <div class="px-5 py-4 space-y-3">
        <div v-if="error" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg text-xs">
          {{ error }}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <InputText v-model="form.last_name" placeholder="Nom"/>
            <p v-if="firstError('last_name')" class="text-xs text-red-600 mt-1">{{ firstError('last_name') }}</p>
          </div>
          <div>
            <InputText v-model="form.first_name" placeholder="Prénom"/>
            <p v-if="firstError('first_name')" class="text-xs text-red-600 mt-1">{{ firstError('first_name') }}</p>
          </div>
        </div>
        <div>
          <InputText v-model="form.email" placeholder="Email"/>
          <p v-if="firstError('email')" class="text-xs text-red-600 mt-1">{{ firstError('email') }}</p>
        </div>
      </div>

      <div class="px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5">
        <button
            type="button"
            @click="$emit('close')"
            :disabled="isSubmitting"
            class="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
            type="button"
            @click="handleSubmit"
            :disabled="isSubmitting"
            class="px-3 py-1.5 text-xs bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
        >
          {{ isSubmitting ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>
</template>
