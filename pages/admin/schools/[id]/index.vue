<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from '#imports'
import schoolService from '~/services/school'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Admin · Détail école')

const route = useRoute()
const school = ref(null)
const isLoading = ref(true)
const errorMsg = ref('')

const schoolId = computed(() => Number(route.params.id))
const logoUrl = computed(() => {
  if (!school.value?.logo) return ''
  return `${useRuntimeConfig().public.apiUrl}/storage/${school.value.logo}`
})

const vatModeLabels = {
  association: 'Association exonérée — art. 261, 7-1° du CGI',
  enseignement: 'Enseignement exonéré — art. 261, 4-4° du CGI',
  franchise: 'Franchise en base — art. 293 B du CGI',
  assujetti: 'Assujetti à la TVA (20 %)'
}

const displayValue = (value) => value || 'Non renseigné'

const fetchSchool = async () => {
  if (!Number.isInteger(schoolId.value) || schoolId.value <= 0) {
    errorMsg.value = 'École introuvable.'
    isLoading.value = false
    return
  }

  try {
    school.value = await schoolService.getSchool(schoolId.value)
  } catch (error) {
    console.error(error)
    errorMsg.value = error.response?.status === 404
      ? 'École introuvable.'
      : 'Erreur lors du chargement de l’école.'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchSchool)
</script>

<template>
  <div class="p-6 max-w-5xl">
    <NuxtLink to="/admin/schools" class="text-xs text-gray-500 hover:text-default mb-3 inline-block">
      ← Retour aux écoles
    </NuxtLink>

    <div v-if="isLoading" class="py-12 text-center">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-default mx-auto"></div>
    </div>

    <div v-else-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
      {{ errorMsg }}
    </div>

    <template v-else-if="school">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div class="flex items-center gap-3">
          <img
            v-if="logoUrl"
            :src="logoUrl"
            :alt="`Logo de ${school.name}`"
            class="w-14 h-14 rounded-xl border object-cover"
          />
          <div v-else class="w-14 h-14 rounded-xl bg-primary text-white flex items-center justify-center text-xl font-bold">
            {{ school.name?.charAt(0)?.toUpperCase() }}
          </div>
          <div>
            <h1 class="text-lg font-bold">{{ school.name }}</h1>
            <p class="text-xs text-gray-500">École #{{ school.id }}</p>
          </div>
        </div>
        <NuxtLink
          :to="`/admin/schools/${school.id}/edit`"
          class="px-4 py-2 bg-default text-white text-sm rounded-lg hover:opacity-90 text-center"
        >
          Modifier l’école
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section class="bg-white rounded-lg border p-5">
          <h2 class="text-sm font-semibold mb-4">Informations de l’établissement</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt class="text-xs text-gray-500">Nom</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.name) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Statut</dt>
              <dd class="mt-1">
                <span :class="school.access ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'" class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold">
                  {{ school.access ? 'Actif' : 'Désactivé' }}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Email</dt>
              <dd class="mt-1 font-medium break-words">{{ displayValue(school.email) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Téléphone</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.phone) }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs text-gray-500">Adresse</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.address) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Code postal</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.zipcode) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Ville</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.city) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Pays</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.country) }}</dd>
            </div>
          </dl>
        </section>

        <section class="bg-white rounded-lg border p-5">
          <h2 class="text-sm font-semibold mb-4">Directeur·ice</h2>
          <dl v-if="school.director" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt class="text-xs text-gray-500">Nom</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.director.last_name) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Prénom</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.director.first_name) }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs text-gray-500">Email</dt>
              <dd class="mt-1 font-medium break-words">{{ displayValue(school.director.email) }}</dd>
            </div>
          </dl>
          <p v-else class="text-sm text-gray-500">Aucun directeur rattaché à cette école.</p>
        </section>

        <section class="bg-white rounded-lg border p-5 lg:col-span-2">
          <h2 class="text-sm font-semibold mb-4">Informations de facturation</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt class="text-xs text-gray-500">SIRET ou RNA</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.siret) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Régime de TVA</dt>
              <dd class="mt-1 font-medium">{{ school.vat_mode ? vatModeLabels[school.vat_mode] : 'Non renseigné' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">N° TVA intracommunautaire</dt>
              <dd class="mt-1 font-medium">{{ displayValue(school.vat_number) }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </template>
  </div>
</template>
