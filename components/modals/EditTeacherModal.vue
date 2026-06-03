<script setup>
import {ref, watch} from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import InputText from '~/components/form/InputText.vue'

const props = defineProps({
  isOpen: {type: Boolean, required: true},
  teacher: {type: Object, default: null}
})

const emit = defineEmits(['close', 'save'])

const form = ref({first_name: '', last_name: '', email: ''})
const error = ref('')
const isSubmitting = ref(false)

watch(() => props.teacher, (t) => {
  if (t) {
    form.value = {
      first_name: t.first_name || '',
      last_name: t.last_name || '',
      email: t.email || ''
    }
  }
}, {immediate: true})

const handleSubmit = async () => {
  error.value = ''
  if (!form.value.first_name || !form.value.last_name || !form.value.email) {
    error.value = 'Tous les champs sont obligatoires'
    return
  }
  try {
    isSubmitting.value = true
    await emit('save', {...form.value})
  } finally {
    isSubmitting.value = false
  }
}

const setError = (msg) => {
  error.value = msg
}

defineExpose({setError})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl px-5 pt-3 pb-4 w-[95vw] max-w-[32rem] max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-lg font-bold mx-auto">Modifier le professeur</h2>
        <button
            @click="$emit('close')"
            class="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-50"
            aria-label="Fermer"
        >
          <Cross class="size-4"/>
        </button>
      </div>
      <div class="w-full h-px bg-gray-200 mb-3"></div>

      <div v-if="error" class="bg-red-100 text-red-800 p-2 rounded mb-2 text-xs">
        {{ error }}
      </div>

      <div class="space-y-3">
        <InputText v-model="form.first_name" placeholder="Prénom"/>
        <InputText v-model="form.last_name" placeholder="Nom"/>
        <InputText v-model="form.email" placeholder="Email"/>
      </div>

      <div class="flex justify-end gap-2 mt-5">
        <button
            type="button"
            @click="$emit('close')"
            :disabled="isSubmitting"
            class="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
            type="button"
            @click="handleSubmit"
            :disabled="isSubmitting"
            class="px-4 py-1.5 bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {{ isSubmitting ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>
</template>
