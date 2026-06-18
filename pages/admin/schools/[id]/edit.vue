<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from '#imports'
import InputSelect from '~/components/form/InputSelect.vue'
import InputText from '~/components/form/InputText.vue'
import schoolService from '~/services/school'
import { getErrorMessage } from '~/utils/errors'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Admin · Modifier école')

const route = useRoute()
const router = useRouter()
const { setFlashMessage } = useFlashMessage()
const schoolId = computed(() => Number(route.params.id))
const school = ref(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMsg = ref('')
const errors = ref({})

const form = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  zipcode: '',
  city: '',
  country: '',
  access: true,
  siret: '',
  vat_mode: '',
  vat_number: ''
})

const vatModes = [
  { value: '', label: 'Non renseigné' },
  { value: 'association', label: 'Association exonérée — art. 261, 7-1° du CGI' },
  { value: 'enseignement', label: 'Enseignement exonéré — art. 261, 4-4° du CGI' },
  { value: 'franchise', label: 'Franchise en base — art. 293 B du CGI' },
  { value: 'assujetti', label: 'Assujetti à la TVA (20 %)' }
]

const fetchSchool = async () => {
  if (!Number.isInteger(schoolId.value) || schoolId.value <= 0) {
    errorMsg.value = 'École introuvable.'
    isLoading.value = false
    return
  }

  try {
    school.value = await schoolService.getSchool(schoolId.value)
    form.value = {
      name: school.value.name || '',
      email: school.value.email || '',
      phone: school.value.phone || '',
      address: school.value.address || '',
      zipcode: school.value.zipcode || '',
      city: school.value.city || '',
      country: school.value.country || '',
      access: Boolean(school.value.access),
      siret: school.value.siret || '',
      vat_mode: school.value.vat_mode || '',
      vat_number: school.value.vat_number || ''
    }
  } catch (error) {
    console.error(error)
    errorMsg.value = error.response?.status === 404
      ? 'École introuvable.'
      : 'Erreur lors du chargement de l’école.'
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async () => {
  errors.value = {}
  isSubmitting.value = true

  try {
    await schoolService.updateSchool(schoolId.value, form.value)
    setFlashMessage({ type: 'success', message: 'École mise à jour avec succès.' })
    await router.push(`/admin/schools/${schoolId.value}`)
  } catch (error) {
    console.error(error)
    if (error.response?.status === 422) {
      errors.value = error.response.data?.errors || {}
    }
    setFlashMessage({
      type: 'error',
      message: getErrorMessage(error, 'Erreur lors de la modification de l’école.')
    })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchSchool)
</script>

<template>
  <div class="p-6 max-w-3xl">
    <NuxtLink :to="`/admin/schools/${schoolId}`" class="text-xs text-gray-500 hover:text-default mb-3 inline-block">
      ← Retour à la fiche école
    </NuxtLink>

    <div v-if="isLoading" class="py-12 text-center">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-default mx-auto"></div>
    </div>

    <div v-else-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
      {{ errorMsg }}
    </div>

    <template v-else-if="school">
      <h1 class="text-lg font-bold mb-5">Modifier {{ school.name }}</h1>

      <form class="bg-white rounded-lg border p-5 space-y-5" @submit.prevent="handleSubmit">
        <div v-if="Object.keys(errors).length" class="bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs space-y-0.5">
          <p v-for="(messages, field) in errors" :key="field">{{ messages[0] }}</p>
        </div>

        <section>
          <h2 class="text-sm font-semibold mb-3">Informations de l’établissement</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputText v-model="form.name" placeholder="Nom de l’école" required :error="errors.name?.[0]" />
            <InputText v-model="form.email" placeholder="Email établissement" type="email" :error="errors.email?.[0]" />
            <InputText v-model="form.phone" placeholder="Téléphone" :error="errors.phone?.[0]" />
            <div class="md:col-span-2">
              <InputText v-model="form.address" placeholder="Adresse" required :error="errors.address?.[0]" />
            </div>
            <InputText v-model="form.zipcode" placeholder="Code postal" :error="errors.zipcode?.[0]" />
            <InputText v-model="form.city" placeholder="Ville" :error="errors.city?.[0]" />
            <InputText v-model="form.country" placeholder="Pays" :error="errors.country?.[0]" />
            <label class="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer">
              <input v-model="form.access" type="checkbox" class="rounded border-gray-300 text-default focus:ring-default" />
              École active
            </label>
          </div>
        </section>

        <section class="border-t pt-5">
          <h2 class="text-sm font-semibold mb-3">Informations de facturation</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputText v-model="form.siret" placeholder="SIRET ou n° RNA" :error="errors.siret?.[0]" />
            <InputSelect v-model="form.vat_mode" placeholder="Régime de TVA" :options="vatModes" :error="errors.vat_mode?.[0]" />
            <div v-if="form.vat_mode === 'assujetti'" class="md:col-span-2">
              <InputText v-model="form.vat_number" placeholder="N° TVA intracommunautaire" :error="errors.vat_number?.[0]" />
            </div>
          </div>
        </section>

        <div class="flex justify-end gap-2 border-t pt-5">
          <NuxtLink :to="`/admin/schools/${schoolId}`" class="px-3 py-1.5 border rounded-lg hover:bg-gray-50">
            Annuler
          </NuxtLink>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-4 py-1.5 bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {{ isSubmitting ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
