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
          <InputText v-model="form.last_name" placeholder="Nom"/>
          <InputText v-model="form.first_name" placeholder="Prénom"/>
        </div>
        <InputText v-model="form.email" placeholder="Email"/>
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
