<script setup>
import { ref } from 'vue'
import { useRouter } from '#imports'
import schoolService from '~/services/school'
import InputText from "~/components/form/InputText.vue"
import { getErrorMessage } from '~/utils/errors'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Admin · Créer école')

const router = useRouter()
const { setFlashMessage } = useFlashMessage()
const isSubmitting = ref(false)
const errors = ref({})

const form = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  zipcode: '',
  city: '',
  country: 'France',
  access: true,
  director_first_name: '',
  director_last_name: '',
  director_email: '',
})

const handleSubmit = async () => {
  errors.value = {}
  isSubmitting.value = true
  try {
    const school = await schoolService.createSchool(form.value)
    setFlashMessage({
      type: 'success',
      message: school.invitation_sent
        ? 'École créée. Un email d\'invitation a été envoyé au directeur.'
        : 'École créée. Le directeur existant a été rattaché à cette école.'
    })
    router.push('/admin/schools')
  } catch (e) {
    console.error(e)
    if (e.response?.status === 422) {
      errors.value = e.response.data?.errors || {}
      setFlashMessage({ type: 'error', message: getErrorMessage(e, 'Veuillez corriger les erreurs.') })
    } else {
      setFlashMessage({
        type: 'error',
        message: getErrorMessage(e, 'Erreur lors de la création.')
      })
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-3xl">
    <NuxtLink to="/admin/schools" class="text-xs text-gray-500 hover:text-default mb-3 inline-block">
      ← Retour aux écoles
    </NuxtLink>
    <h1 class="text-lg font-bold mb-5">Créer une école</h1>

    <form @submit.prevent="handleSubmit" class="bg-white rounded-lg border p-5 space-y-5">
      <div v-if="Object.keys(errors).length" class="bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs space-y-0.5">
        <p v-for="(msgs, field) in errors" :key="field">{{ msgs[0] }}</p>
      </div>

      <div>
        <h2 class="text-sm font-semibold mb-2">Informations école</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <InputText v-model="form.name" placeholder="Nom de l'école" required />
            <p v-if="errors.name" class="text-xs text-red-500 mt-1">{{ errors.name[0] }}</p>
          </div>
          <InputText v-model="form.email" placeholder="Email établissement (optionnel)" type="email" />
          <InputText v-model="form.phone" placeholder="Téléphone (optionnel)" />
          <div>
            <InputText v-model="form.address" placeholder="Adresse" required />
            <p v-if="errors.address" class="text-xs text-red-500 mt-1">{{ errors.address[0] }}</p>
          </div>
          <InputText v-model="form.zipcode" placeholder="Code postal" />
          <InputText v-model="form.city" placeholder="Ville" />
          <InputText v-model="form.country" placeholder="Pays" />
        </div>
      </div>

      <div class="border-t pt-5">
        <h2 class="text-sm font-semibold mb-1">Directeur·ice</h2>
        <p class="text-xs text-gray-600 mb-3">Un email d'invitation lui sera envoyé pour qu'il/elle définisse son mot de passe.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <InputText v-model="form.director_last_name" placeholder="Nom" required />
            <p v-if="errors.director_last_name" class="text-xs text-red-500 mt-1">{{ errors.director_last_name[0] }}</p>
          </div>
          <div>
            <InputText v-model="form.director_first_name" placeholder="Prénom" required />
            <p v-if="errors.director_first_name" class="text-xs text-red-500 mt-1">{{ errors.director_first_name[0] }}</p>
          </div>
          <div class="md:col-span-2">
            <InputText v-model="form.director_email" placeholder="Email" type="email" required />
            <p v-if="errors.director_email" class="text-xs text-red-500 mt-1">{{ errors.director_email[0] }}</p>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t pt-5">
        <NuxtLink to="/admin/schools" class="px-3 py-1.5 border rounded-lg hover:bg-gray-50">
          Annuler
        </NuxtLink>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="px-4 py-1.5 bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {{ isSubmitting ? 'Création...' : 'Créer l\'école' }}
        </button>
      </div>
    </form>
  </div>
</template>
