<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from '#imports'
import schoolService from '~/services/school'
import adminDashboardService from '~/services/adminDashboard'
import SchoolQuickActions from '~/components/admin/SchoolQuickActions.vue'

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

// Fonctionnalités (feature flags) de l'école
const features = ref([])
const featureError = ref('')
const savingFeature = ref('')

const fetchFeatures = async () => {
  try {
    features.value = await adminDashboardService.getSchoolFeatures(schoolId.value)
  } catch (error) {
    console.error(error)
    featureError.value = 'Impossible de charger les fonctionnalités.'
  }
}

const toggleFeature = async (feature) => {
  savingFeature.value = feature.key
  featureError.value = ''
  try {
    features.value = await adminDashboardService.setSchoolFeature(schoolId.value, feature.key, !feature.enabled)
  } catch (error) {
    console.error(error)
    featureError.value = "La modification n'a pas pu être enregistrée."
  } finally {
    savingFeature.value = ''
  }
}

const onStatusUpdated = (res) => {
  Object.assign(school.value, {
    access: res.access,
    suspended_at: res.suspended_at,
    suspension_reason: res.suspension_reason
  })
}

onMounted(() => {
  fetchSchool()
  fetchFeatures()
})
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
        <div class="flex flex-wrap items-center gap-1.5">
          <SchoolQuickActions
            variant="bar"
            :school="{ id: school.id, name: school.name, access: school.access, has_director: !!school.director }"
            @updated="onStatusUpdated"
          />
          <NuxtLink
            :to="`/admin/schools/${school.id}/edit`"
            class="px-3 py-1.5 text-xs font-medium bg-default text-white rounded-lg hover:opacity-90 text-center"
          >
            Modifier l’école
          </NuxtLink>
        </div>
      </div>

      <div v-if="!school.access" class="bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs mb-5">
        <strong>École suspendue</strong>
        <template v-if="school.suspended_at"> depuis le {{ new Date(school.suspended_at).toLocaleDateString('fr-FR') }}</template>
        — son équipe n'a plus accès à Toollab.
        <template v-if="school.suspension_reason"> Motif : {{ school.suspension_reason }}</template>
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

        <section class="bg-white rounded-2xl border lg:col-span-2">
          <div class="px-5 py-3 border-b border-[#E6EFF5]">
            <h2 class="text-sm font-semibold">Fonctionnalités</h2>
            <p class="text-xs text-gray-600 mt-0.5">Activées ou désactivées pour cette école uniquement. Chaque changement est tracé dans l'audit.</p>
          </div>
          <div v-if="featureError" class="mx-5 mt-3 bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs">{{ featureError }}</div>
          <ul class="divide-y divide-[#E6EFF5]">
            <li v-for="feature in features" :key="feature.key" class="px-5 py-3 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="text-sm font-semibold" :id="`feature-${feature.key}`">{{ feature.label }}</div>
                <p class="text-xs text-gray-600 mt-0.5 max-w-2xl font-nunito">{{ feature.description }}</p>
                <p v-if="feature.enabled !== feature.default" class="text-[11px] text-amber-700 mt-1">
                  Différent de la valeur par défaut ({{ feature.default ? 'activée' : 'désactivée' }})
                </p>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="feature.enabled"
                :aria-labelledby="`feature-${feature.key}`"
                :disabled="savingFeature === feature.key"
                class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-default disabled:opacity-50"
                :class="feature.enabled ? 'bg-default' : 'bg-gray-300'"
                @click="toggleFeature(feature)"
              >
                <span
                  class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
                  :class="feature.enabled ? 'translate-x-4' : 'translate-x-0'"
                ></span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
