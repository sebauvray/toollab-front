<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from '#imports'
import adminDashboardService from '~/services/adminDashboard'
import HourlyBars from '~/components/admin/HourlyBars.vue'
import { relativeTime, fullDate } from '~/utils/adminFormat'
import PageHeader from '~/components/admin/ui/PageHeader.vue'
import SegmentedControl from '~/components/admin/ui/SegmentedControl.vue'
import AlertBanner from '~/components/admin/ui/AlertBanner.vue'
import StatusBadge from '~/components/admin/ui/StatusBadge.vue'
import { useAdminCounters } from '~/composables/useAdminCounters'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Admin · Erreurs')

const route = useRoute()
const router = useRouter()

const status = ref(route.query.status || 'open')
const category = ref(route.query.category || '')
const page = ref(1)
const results = ref({ data: [], total: 0, last_page: 1, from: 0, to: 0 })
const isLoading = ref(true)
const errorMsg = ref('')

const selectedId = ref(route.query.id ? Number(route.query.id) : null)
const detail = ref(null)
const isLoadingDetail = ref(false)
const isSaving = ref(false)
const summary = ref(null)
const { refreshCounters } = useAdminCounters()
const fetchSummary = async () => {
  try {
    summary.value = await adminDashboardService.getErrorsSummary()
  } catch (e) {
    console.error(e)
  }
}

const STATUSES = [
  { value: 'open', label: 'Ouvertes' },
  { value: 'resolved', label: 'Résolues' },
  { value: 'all', label: 'Toutes' }
]
const CATEGORIES = [
  { value: '', label: 'Toutes' },
  { value: 'http', label: 'Requêtes' },
  { value: 'mail', label: 'E-mails' },
  { value: 'job', label: 'Tâches de fond' },
  { value: 'console', label: 'Console' }
]
const CATEGORY_LABEL = { http: 'Requête', mail: 'E-mail', job: 'Tâche de fond', console: 'Console' }

const shortClass = (c) => c.split('\\').pop()

const syncUrl = () => router.replace({
  query: {
    status: status.value !== 'open' ? status.value : undefined,
    category: category.value || undefined,
    id: selectedId.value || undefined
  }
})

const fetchErrors = async () => {
  isLoading.value = true
  errorMsg.value = ''
  syncUrl()
  try {
    results.value = await adminDashboardService.getErrors({
      status: status.value,
      category: category.value || undefined,
      page: page.value
    })
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Erreur lors du chargement des erreurs.'
  } finally {
    isLoading.value = false
  }
}

const loadDetail = async () => {
  syncUrl()
  if (!selectedId.value) {
    detail.value = null
    return
  }
  isLoadingDetail.value = true
  try {
    detail.value = await adminDashboardService.getError(selectedId.value)
  } catch (e) {
    console.error(e)
    detail.value = null
  } finally {
    isLoadingDetail.value = false
  }
}

const toggleResolved = async () => {
  isSaving.value = true
  try {
    const res = await adminDashboardService.setErrorResolved(detail.value.id, !detail.value.resolved_at)
    detail.value.resolved_at = res.resolved_at
    fetchSummary()
    refreshCounters()
    await fetchErrors()
  } catch (e) {
    console.error(e)
  } finally {
    isSaving.value = false
  }
}

watch([status, category], () => { page.value = 1; fetchErrors() })
watch(selectedId, loadDetail)
const goToPage = (p) => { page.value = p; fetchErrors() }

const onKey = (e) => { if (e.key === 'Escape') selectedId.value = null }
onMounted(() => {
  fetchSummary()
  fetchErrors()
  loadDetail()
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="p-6 max-w-6xl font-montserrat">
    <PageHeader title="Erreurs serveur" subtitle="Exceptions non gérées de l'API, regroupées par origine. Historique horaire conservé 7 jours." />

    <div v-if="summary" class="bg-white rounded-2xl border border-[#E6EFF5] p-5 mb-4 grid grid-cols-1 md:grid-cols-[auto,1fr] gap-x-8 gap-y-4 items-end">
      <dl class="grid grid-cols-3 gap-x-6">
        <div>
          <dt class="text-xs text-gray-600">Sur 24 h</dt>
          <dd class="text-xl font-bold tabular-nums">{{ summary.last_24h }}</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-600">Ouvertes</dt>
          <dd class="text-xl font-bold tabular-nums" :class="summary.open ? 'text-red-700' : ''">{{ summary.open }}</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-600">E-mails (7 j)</dt>
          <dd class="text-xl font-bold tabular-nums">{{ summary.mail_failures_7d }}</dd>
        </div>
      </dl>
      <HourlyBars :values="summary.hourly" :height="48" />
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <SegmentedControl v-model="status" :options="STATUSES" label="Statut" />
      <SegmentedControl v-model="category" :options="CATEGORIES" label="Catégorie" />
    </div>

    <AlertBanner v-if="errorMsg" class="mb-4">{{ errorMsg }}</AlertBanner>

    <div class="bg-white rounded-2xl border border-[#E6EFF5] overflow-hidden">
      <ul class="divide-y divide-[#E6EFF5] font-nunito text-sm" :class="{ 'opacity-50': isLoading }">
        <li v-if="!isLoading && !results.data.length" class="px-4 py-6 text-center text-xs text-gray-600">
          {{ status === 'open' ? 'Aucune erreur ouverte.' : 'Aucune erreur.' }}
        </li>
        <li v-for="err in results.data" :key="err.id">
          <button
            class="w-full text-left px-4 py-2.5 flex gap-3 hover:bg-gray-50 transition-colors outline-none focus-visible:bg-gray-50"
            :class="{ 'bg-gray-50': selectedId === err.id }"
            @click="selectedId = err.id"
          >
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-baseline gap-x-1.5">
                <span class="font-semibold">{{ shortClass(err.exception_class) }}</span>
                <span class="text-xs text-gray-500">{{ CATEGORY_LABEL[err.category] }} · {{ err.context }}</span>
                <StatusBadge v-if="err.resolved_at" status="resolved" />
              </div>
              <div class="text-xs text-gray-700 truncate">{{ err.message || '(sans message)' }}</div>
              <div class="text-xs text-gray-500 font-mono truncate">{{ err.file }}:{{ err.line }}</div>
            </div>
            <div class="text-right shrink-0">
              <div class="font-semibold tabular-nums">{{ err.occurrences }}×</div>
              <div class="text-xs text-gray-500 tabular-nums">{{ err.last_24h }} sur 24 h</div>
              <div class="text-xs text-gray-500">{{ relativeTime(err.last_seen_at) }}</div>
            </div>
          </button>
        </li>
      </ul>
      <div class="flex justify-between items-center px-4 py-2 border-t border-[#E6EFF5] text-xs">
        <span class="text-gray-600">
          <template v-if="results.total">{{ results.from }}–{{ results.to }} sur {{ results.total }}</template>
          <template v-else>0 erreur</template>
        </span>
        <div v-if="results.last_page > 1" class="flex gap-1.5">
          <button class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" :disabled="page <= 1" @click="goToPage(page - 1)">Précédent</button>
          <button class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" :disabled="page >= results.last_page" @click="goToPage(page + 1)">Suivant</button>
        </div>
      </div>
    </div>

    <!-- Détail -->
    <div v-if="selectedId" class="fixed inset-0 z-40 flex justify-end">
      <div class="absolute inset-0 bg-black/20" @click="selectedId = null"></div>
      <aside class="relative w-full max-w-2xl h-full bg-white shadow-xl overflow-y-auto" role="dialog" aria-modal="true" aria-label="Détail de l'erreur">
        <div class="sticky top-0 bg-white border-b border-[#E6EFF5] px-5 py-3 flex justify-between items-center z-10">
          <span class="text-xs text-gray-600">Détail de l'erreur</span>
          <button
            class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:text-default hover:bg-gray-100"
            aria-label="Fermer"
            title="Fermer"
            @click="selectedId = null"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div v-if="isLoadingDetail" class="py-10 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-default mx-auto"></div>
        </div>
        <div v-else-if="detail" class="px-5 py-4 space-y-5 text-sm">
          <div>
            <h2 class="text-base font-bold break-all">{{ shortClass(detail.exception_class) }}</h2>
            <p class="text-xs text-gray-500 font-mono break-all">{{ detail.exception_class }}</p>
            <p class="mt-2 font-nunito break-words">{{ detail.message || '(sans message)' }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <button
              class="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50"
              :class="detail.resolved_at ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-default text-white hover:opacity-90'"
              :disabled="isSaving"
              @click="toggleResolved"
            >{{ detail.resolved_at ? 'Rouvrir' : 'Marquer comme résolue' }}</button>
            <span v-if="detail.resolved_at" class="text-xs text-gray-600">Résolue le {{ fullDate(detail.resolved_at) }} — rouverte automatiquement si elle réapparaît.</span>
          </div>

          <dl class="grid grid-cols-2 gap-3 font-nunito">
            <div><dt class="text-xs text-gray-600">Occurrences</dt><dd class="tabular-nums">{{ detail.occurrences }}</dd></div>
            <div><dt class="text-xs text-gray-600">Type</dt><dd>{{ CATEGORY_LABEL[detail.category] }}</dd></div>
            <div><dt class="text-xs text-gray-600">Première fois</dt><dd>{{ fullDate(detail.first_seen_at) }}</dd></div>
            <div><dt class="text-xs text-gray-600">Dernière fois</dt><dd>{{ fullDate(detail.last_seen_at) }}</dd></div>
            <div class="col-span-2"><dt class="text-xs text-gray-600">Origine</dt><dd class="font-mono text-xs break-all">{{ detail.context }} — {{ detail.file }}:{{ detail.line }}</dd></div>
            <div v-if="detail.last_user"><dt class="text-xs text-gray-600">Dernier utilisateur</dt><dd>
              <NuxtLink :to="`/admin/users?population=all&user=${detail.last_user.id}`" class="hover:underline">{{ detail.last_user.first_name }} {{ detail.last_user.last_name }}</NuxtLink>
            </dd></div>
            <div v-if="detail.last_school"><dt class="text-xs text-gray-600">Dernière école</dt><dd>{{ detail.last_school }}</dd></div>
          </dl>

          <section>
            <h3 class="text-xs font-semibold uppercase text-gray-600 mb-3">Occurrences sur 24 h</h3>
            <HourlyBars :values="detail.hourly" label="Occurrences de cette erreur par heure sur 24 h" />
          </section>

          <section>
            <h3 class="text-xs font-semibold uppercase text-gray-600 mb-2">Trace (dernière occurrence)</h3>
            <pre class="text-[11px] leading-relaxed bg-gray-50 ring-1 ring-[#E6EFF5] rounded-lg p-3 overflow-x-auto whitespace-pre font-mono">{{ detail.last_trace }}</pre>
          </section>
        </div>
      </aside>
    </div>
  </div>
</template>
