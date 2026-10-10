<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from '#imports'
import schoolService from '~/services/school'
import adminDashboardService from '~/services/adminDashboard'
import SchoolQuickActions from '~/components/admin/SchoolQuickActions.vue'
import PageHeader from '~/components/admin/ui/PageHeader.vue'
import AdminCard from '~/components/admin/ui/AdminCard.vue'
import StatTile from '~/components/admin/ui/StatTile.vue'
import StatusBadge from '~/components/admin/ui/StatusBadge.vue'
import Tabs from '~/components/admin/ui/Tabs.vue'
import AlertBanner from '~/components/admin/ui/AlertBanner.vue'
import Skeleton from '~/components/admin/ui/Skeleton.vue'
import { SCHOOL_ALERTS, relativeDay } from '~/utils/schoolAlerts'
import { auditDetail, auditDotClass, shortLabel } from '~/utils/auditFormat'
import { useAdminCounters } from '~/composables/useAdminCounters'

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

// Indicateurs, équipe et journal de l'école
const overview = ref(null)
const audit = ref([])
const tab = ref('overview')
const { refreshCounters } = useAdminCounters()

const TABS = computed(() => [
  { value: 'overview', label: 'Aperçu' },
  { value: 'team', label: 'Équipe', count: overview.value?.staff.length ?? null },
  { value: 'features', label: 'Fonctionnalités' },
  { value: 'journal', label: 'Journal' }
])

const stats = computed(() => {
  const h = overview.value?.health
  if (!h) return []
  return [
    { label: 'Élèves', value: h.students },
    { label: 'Profs', value: h.teachers, sub: `${overview.value.staff.length} membre(s) d'équipe` },
    { label: 'Classes', value: h.classrooms },
    { label: 'Dernière activité', value: relativeDay(h.last_activity), sub: `${overview.value.active_staff_30d} connecté(s) sur 30 j` }
  ]
})

const fetchOverview = async () => {
  try {
    overview.value = await adminDashboardService.getSchoolOverview(schoolId.value)
  } catch (error) {
    console.error(error)
  }
}

const fetchAudit = async () => {
  try {
    const res = await adminDashboardService.getAuditLogs({ school_id: schoolId.value })
    audit.value = res.data ?? []
  } catch (error) {
    console.error(error)
  }
}

const onStatusUpdated = (res) => {
  refreshCounters()
  Object.assign(school.value, {
    access: res.access,
    suspended_at: res.suspended_at,
    suspension_reason: res.suspension_reason
  })
}

onMounted(() => {
  fetchSchool()
  fetchFeatures()
  fetchOverview()
  fetchAudit()
})
</script>

<template>
  <div class="p-4 sm:p-6 max-w-6xl font-montserrat">
    <div v-if="isLoading" class="space-y-4">
      <Skeleton :lines="2" height="h-6" />
      <div class="bg-white rounded-2xl border border-[#E6EFF5] p-5"><Skeleton :lines="5" /></div>
    </div>

    <template v-else-if="errorMsg">
      <PageHeader title="École" back="/admin/schools" back-label="Écoles" />
      <AlertBanner>{{ errorMsg }}</AlertBanner>
    </template>

    <template v-else-if="school">
      <NuxtLink to="/admin/schools" class="text-xs text-gray-500 hover:text-default mb-2 inline-block">← Écoles</NuxtLink>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div class="flex items-center gap-3 min-w-0">
          <img v-if="logoUrl" :src="logoUrl" :alt="`Logo de ${school.name}`" class="w-12 h-12 rounded-xl border border-[#E6EFF5] object-cover" />
          <div v-else class="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center text-lg font-bold shrink-0" aria-hidden="true">
            {{ school.name?.charAt(0)?.toUpperCase() }}
          </div>
          <div class="min-w-0">
            <h1 class="text-lg font-bold text-default flex items-center gap-2">
              <span class="truncate">{{ school.name }}</span>
              <StatusBadge :status="school.access ? 'active' : 'suspended'" />
            </h1>
            <div class="text-xs text-gray-500 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>#{{ school.id }}<template v-if="school.city"> · {{ school.city }}</template></span>
              <span
                v-for="a in (overview?.health?.alerts ?? [])"
                :key="a"
                class="px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1"
                :class="SCHOOL_ALERTS[a].cls"
                :title="SCHOOL_ALERTS[a].hint"
              >{{ SCHOOL_ALERTS[a].label }}</span>
            </div>
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

      <AlertBanner v-if="!school.access" class="mb-4">
        <strong>École suspendue</strong>
        <template v-if="school.suspended_at"> depuis le {{ new Date(school.suspended_at).toLocaleDateString('fr-FR') }}</template>
        — son équipe n'a plus accès à Toollab.
        <template v-if="school.suspension_reason"> Motif : {{ school.suspension_reason }}</template>
      </AlertBanner>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <template v-if="stats.length">
          <StatTile v-for="s in stats" :key="s.label" v-bind="s" />
        </template>
        <div v-else v-for="i in 4" :key="i" class="bg-white rounded-2xl border border-[#E6EFF5] p-5"><Skeleton :lines="2" /></div>
      </div>

      <Tabs v-model="tab" :tabs="TABS" label="Sections de la fiche école" class="mb-4" />

      <!-- Aperçu -->
      <div v-if="tab === 'overview'" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminCard title="Établissement" class="lg:col-span-2">
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm font-nunito">
            <div>
              <dt class="text-xs text-gray-500">Email</dt>
              <dd class="mt-0.5 break-words">{{ displayValue(school.email) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Téléphone</dt>
              <dd class="mt-0.5">{{ displayValue(school.phone) }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs text-gray-500">Adresse</dt>
              <dd class="mt-0.5">
                {{ displayValue(school.address) }}<template v-if="school.zipcode || school.city">, {{ [school.zipcode, school.city].filter(Boolean).join(' ') }}</template><template v-if="school.country"> · {{ school.country }}</template>
              </dd>
            </div>
          </dl>
          <h3 class="text-xs font-semibold text-gray-600 mt-5 mb-2">Facturation</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm font-nunito">
            <div>
              <dt class="text-xs text-gray-500">SIRET ou RNA</dt>
              <dd class="mt-0.5">{{ displayValue(school.siret) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Régime de TVA</dt>
              <dd class="mt-0.5">{{ school.vat_mode ? vatModeLabels[school.vat_mode] : 'Non renseigné' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">N° TVA intracommunautaire</dt>
              <dd class="mt-0.5">{{ displayValue(school.vat_number) }}</dd>
            </div>
          </dl>
        </AdminCard>

        <AdminCard title="Direction">
          <div v-if="school.director" class="text-sm font-nunito">
            <div class="font-semibold">{{ school.director.first_name }} {{ school.director.last_name }}</div>
            <div class="text-gray-600 break-words">{{ school.director.email }}</div>
          </div>
          <p v-else class="text-sm text-gray-600">Aucun directeur en poste.</p>
        </AdminCard>
      </div>

      <!-- Équipe -->
      <AdminCard v-else-if="tab === 'team'" title="Équipe" subtitle="Membres avec un rôle dans l'école, invitations comprises." :padded="false">
        <p v-if="!overview?.staff.length" class="px-5 py-6 text-center text-xs text-gray-600">Aucun membre d'équipe.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-sm">
            <thead class="border-b border-[#E6EFF5] text-left text-xs font-semibold text-gray-600">
              <tr>
                <th class="px-5 py-2.5">Membre</th>
                <th class="px-5 py-2.5">Rôles</th>
                <th class="px-5 py-2.5">Dernière connexion</th>
              </tr>
            </thead>
            <tbody class="font-nunito divide-y divide-[#E6EFF5]">
              <tr v-for="m in overview.staff" :key="m.id" class="hover:bg-gray-50">
                <td class="px-5 py-2.5">
                  <NuxtLink :to="`/admin/users?user=${m.id}`" class="font-semibold hover:underline">{{ m.first_name }} {{ m.last_name }}</NuxtLink>
                  <div class="text-xs text-gray-500">{{ m.email }}</div>
                </td>
                <td class="px-5 py-2.5">
                  <span class="text-gray-700">{{ m.roles.join(', ') }}</span>
                  <StatusBadge v-if="m.pending" status="pending" label="Invitation en attente" class="ml-1.5" />
                  <StatusBadge v-if="!m.access" status="disabled" class="ml-1.5" />
                </td>
                <td class="px-5 py-2.5 whitespace-nowrap text-gray-700">{{ relativeDay(m.last_login_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminCard>

      <!-- Fonctionnalités -->
      <AdminCard
        v-else-if="tab === 'features'"
        title="Fonctionnalités"
        subtitle="Activées ou désactivées pour cette école uniquement. Chaque changement est tracé dans l'audit."
        :padded="false"
      >
        <AlertBanner v-if="featureError" class="mx-5 mt-3">{{ featureError }}</AlertBanner>
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
      </AdminCard>

      <!-- Journal -->
      <AdminCard v-else title="Journal" :to="`/admin/audit?school_id=${school.id}`" link-label="Journal complet" :padded="false">
        <p v-if="!audit.length" class="px-5 py-6 text-center text-xs text-gray-600">Aucune action enregistrée pour cette école.</p>
        <ul v-else class="divide-y divide-[#E6EFF5] font-nunito text-sm">
          <li v-for="log in audit.slice(0, 15)" :key="log.id" class="px-5 py-2 flex gap-3">
            <span class="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" :class="auditDotClass(log.action)" aria-hidden="true"></span>
            <div class="flex-1 min-w-0">
              <span class="font-semibold">{{ log.action_label }}</span>
              <template v-if="log.subject_label"> — {{ shortLabel(log.subject_label) }}</template>
              <div class="text-xs text-gray-500 truncate">
                <template v-if="auditDetail(log)">{{ auditDetail(log) }} · </template>par {{ log.actor_id ? shortLabel(log.actor_label) : 'lien public' }}
              </div>
            </div>
            <time class="text-xs text-gray-500 whitespace-nowrap" :datetime="log.created_at">{{ relativeDay(log.created_at) }}</time>
          </li>
        </ul>
      </AdminCard>
    </template>
  </div>
</template>
