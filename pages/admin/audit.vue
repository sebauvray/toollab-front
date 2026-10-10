<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from '#imports'
import adminDashboardService from '~/services/adminDashboard'
import { relativeTime } from '~/utils/adminFormat'
import PageHeader from '~/components/admin/ui/PageHeader.vue'
import Tabs from '~/components/admin/ui/Tabs.vue'
import AlertBanner from '~/components/admin/ui/AlertBanner.vue'
import { AUDIT_CATEGORIES, auditDetail, auditDotClass, shortLabel } from '~/utils/auditFormat'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Admin · Audit')

const route = useRoute()
const router = useRouter()

const tab = ref(route.query.tab === 'impersonations' ? 'impersonations' : 'actions')

// Actions sensibles
const category = ref(route.query.action || '')
const q = ref(route.query.q || '')
const userId = ref(route.query.user_id || '')
const schoolId = ref(route.query.school_id || '')
const page = ref(1)
const logs = ref({ data: [], total: 0, last_page: 1, from: 0, to: 0 })

// Sessions « en tant que »
const sessions = ref([])

const isLoading = ref(true)
const errorMsg = ref('')

const fetchLogs = async () => {
  isLoading.value = true
  errorMsg.value = ''
  router.replace({ query: { tab: undefined, action: category.value || undefined, q: q.value || undefined, user_id: userId.value || undefined, school_id: schoolId.value || undefined } })
  try {
    logs.value = await adminDashboardService.getAuditLogs({
      action: category.value || undefined,
      q: q.value || undefined,
      user_id: userId.value || undefined,
      school_id: schoolId.value || undefined,
      page: page.value
    })
  } catch (e) {
    console.error(e)
    errorMsg.value = "Erreur lors du chargement du journal."
  } finally {
    isLoading.value = false
  }
}

const fetchSessions = async () => {
  isLoading.value = true
  errorMsg.value = ''
  router.replace({ query: { tab: 'impersonations' } })
  try {
    sessions.value = await adminDashboardService.getImpersonations()
  } catch (e) {
    console.error(e)
    errorMsg.value = "Erreur lors du chargement des sessions."
  } finally {
    isLoading.value = false
  }
}

const load = () => (tab.value === 'actions' ? fetchLogs() : fetchSessions())

let debounce
watch(q, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => { page.value = 1; fetchLogs() }, 300)
})
watch(category, () => { page.value = 1; fetchLogs() })
watch(tab, load)
onMounted(load)

const goToPage = (p) => { page.value = p; fetchLogs() }
const clearUser = () => { userId.value = ''; page.value = 1; fetchLogs() }
const clearSchool = () => { schoolId.value = ''; page.value = 1; fetchLogs() }

const STATUS = {
  active: { label: 'En cours', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  ended: { label: 'Terminée', cls: 'bg-gray-50 text-gray-600 ring-gray-200' },
  expired: { label: 'Expirée', cls: 'bg-gray-50 text-gray-500 ring-gray-200' }
}

const fmt = (d) => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const duration = (r) => {
  const end = r.ended_at || (r.status === 'expired' ? r.expires_at : null)
  if (!end) return '—'
  return `${Math.round((new Date(end) - new Date(r.started_at)) / 60000)} min`
}

const name = (u) => u ? `${u.first_name} ${u.last_name}` : 'Utilisateur supprimé'
</script>

<template>
  <div class="p-4 sm:p-6 max-w-6xl font-montserrat">
    <PageHeader title="Journal d'audit" subtitle="Actions sensibles sur la plateforme et sessions du support." />

    <Tabs
      v-model="tab"
      :tabs="[{ value: 'actions', label: 'Actions sensibles' }, { value: 'impersonations', label: 'Sessions « en tant que »' }]"
      label="Sections du journal"
      class="mb-4"
    />

    <AlertBanner v-if="errorMsg" class="mb-4">{{ errorMsg }}</AlertBanner>

    <!-- Actions sensibles -->
    <template v-if="tab === 'actions'">
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <input
          v-model="q"
          type="search"
          aria-label="Rechercher une personne"
          placeholder="Acteur ou personne concernée…"
          class="flex-1 min-w-[220px] px-3 py-1.5 text-sm border border-input-stroke rounded-lg bg-white"
        />
        <div class="inline-flex flex-wrap rounded-lg border border-input-stroke divide-x divide-input-stroke overflow-hidden" role="group" aria-label="Catégorie">
          <button
            v-for="c in AUDIT_CATEGORIES"
            :key="c.value"
            class="px-3 py-1.5 text-xs transition-colors"
            :class="category === c.value ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
            :aria-pressed="category === c.value"
            @click="category = c.value"
          >{{ c.label }}</button>
        </div>
      </div>

      <div v-if="userId" class="mb-3 text-xs text-gray-700 flex items-center gap-2">
        Filtré sur l'utilisateur #{{ userId }}
        <button class="text-blue-link hover:underline" @click="clearUser">Retirer le filtre</button>
      </div>
      <div v-if="schoolId" class="mb-3 text-xs text-gray-700 flex items-center gap-2">
        Filtré sur l'école #{{ schoolId }}
        <button class="text-blue-link hover:underline" @click="clearSchool">Retirer le filtre</button>
      </div>

      <div class="bg-white rounded-2xl border border-[#E6EFF5] overflow-hidden">
        <ul class="divide-y divide-[#E6EFF5] font-nunito text-sm" :class="{ 'opacity-50': isLoading }">
          <li v-if="!isLoading && !logs.data.length" class="px-4 py-6 text-center text-xs text-gray-600">Aucune action enregistrée.</li>
          <li v-for="log in logs.data" :key="log.id" class="px-4 py-2.5 flex gap-3">
            <span class="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" :class="auditDotClass(log.action)" aria-hidden="true"></span>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-baseline gap-x-1.5">
                <span class="font-semibold">{{ log.action_label }}</span>
                <template v-if="log.subject_label">
                  <span class="text-gray-500">—</span>
                  <NuxtLink
                    v-if="log.subject_type === 'user'"
                    :to="`/admin/users?population=all&user=${log.subject_id}`"
                    class="hover:underline"
                  >{{ shortLabel(log.subject_label) }}</NuxtLink>
                  <span v-else>{{ log.subject_label }}</span>
                </template>
                <span v-if="log.school" class="text-xs text-gray-500">· {{ log.school }}</span>
              </div>
              <div v-if="auditDetail(log)" class="text-xs text-gray-700 mt-0.5">{{ auditDetail(log) }}</div>
              <div class="text-xs text-gray-500 mt-0.5">
                par
                <NuxtLink v-if="log.actor_id" :to="`/admin/users?population=all&user=${log.actor_id}`" class="hover:underline">{{ shortLabel(log.actor_label) }}</NuxtLink>
                <span v-else>lien public (jeton)</span>
                <span v-if="log.impersonated" class="ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-amber-50 text-amber-700 ring-amber-200">via le support</span>
              </div>
            </div>
            <time class="text-xs text-gray-500 whitespace-nowrap" :datetime="log.created_at">{{ relativeTime(log.created_at) }}</time>
          </li>
        </ul>
        <div class="flex justify-between items-center px-4 py-2 border-t border-[#E6EFF5] text-xs">
          <span class="text-gray-600">
            <template v-if="logs.total">{{ logs.from }}–{{ logs.to }} sur {{ logs.total }}</template>
            <template v-else>0 entrée</template>
          </span>
          <div v-if="logs.last_page > 1" class="flex gap-1.5">
            <button class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" :disabled="page <= 1" @click="goToPage(page - 1)">Précédent</button>
            <button class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" :disabled="page >= logs.last_page" @click="goToPage(page + 1)">Suivant</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Sessions « en tant que » -->
    <div v-else class="bg-white rounded-2xl border border-[#E6EFF5] overflow-x-auto">
      <table class="w-full">
        <thead class="border-b border-[#E6EFF5] text-left text-xs font-semibold text-gray-600">
          <tr>
            <th class="px-4 py-2.5">Début</th>
            <th class="px-4 py-2.5">Admin</th>
            <th class="px-4 py-2.5">Vu en tant que</th>
            <th class="px-4 py-2.5">Motif</th>
            <th class="px-4 py-2.5">Durée</th>
            <th class="px-4 py-2.5 text-right">Écritures bloquées</th>
            <th class="px-4 py-2.5">Statut</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#E6EFF5] font-nunito text-sm" :class="{ 'opacity-50': isLoading }">
          <tr v-if="!isLoading && !sessions.length">
            <td colspan="7" class="px-4 py-6 text-center text-xs text-gray-600">Aucune session enregistrée.</td>
          </tr>
          <tr v-for="r in sessions" :key="r.id" class="align-top">
            <td class="px-4 py-2 whitespace-nowrap">{{ fmt(r.started_at) }}</td>
            <td class="px-4 py-2">
              {{ name(r.admin) }}
              <div class="text-xs text-gray-500">{{ r.ip_address }}</div>
            </td>
            <td class="px-4 py-2">
              {{ name(r.target) }}
              <div class="text-xs text-gray-500">{{ r.target?.email }}</div>
            </td>
            <td class="px-4 py-2 max-w-xs">{{ r.reason }}</td>
            <td class="px-4 py-2 whitespace-nowrap">{{ duration(r) }}</td>
            <td class="px-4 py-2 text-right" :class="r.blocked_writes ? 'text-red-700 font-semibold' : 'text-gray-500'">{{ r.blocked_writes }}</td>
            <td class="px-4 py-2">
              <span class="px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1" :class="STATUS[r.status].cls">{{ STATUS[r.status].label }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
