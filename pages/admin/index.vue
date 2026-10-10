<script setup>
import { ref, computed, onMounted } from 'vue'
import adminDashboardService from '~/services/adminDashboard'
import SchoolQuickActions from '~/components/admin/SchoolQuickActions.vue'
import HourlyBars from '~/components/admin/HourlyBars.vue'
import PageHeader from '~/components/admin/ui/PageHeader.vue'
import AdminCard from '~/components/admin/ui/AdminCard.vue'
import StatTile from '~/components/admin/ui/StatTile.vue'
import StatusBadge from '~/components/admin/ui/StatusBadge.vue'
import AlertBanner from '~/components/admin/ui/AlertBanner.vue'
import Skeleton from '~/components/admin/ui/Skeleton.vue'
import TrendChart from '~/components/admin/ui/TrendChart.vue'
import { formatBytes, formatDelta } from '~/utils/adminFormat'
import { auditDetail, auditDotClass, shortLabel } from '~/utils/auditFormat'
import { SCHOOL_ALERTS, needsAttention, relativeDay as relative } from '~/utils/schoolAlerts'
import { useAdminCounters } from '~/composables/useAdminCounters'
import { NuxtLink } from '#components'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Administration')

const data = ref(null)
const isLoading = ref(true)
const errorMsg = ref('')
const showDetails = ref(false)
const { refreshCounters } = useAdminCounters()

onMounted(async () => {
  try {
    data.value = await adminDashboardService.getDashboard()
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Erreur lors du chargement du tableau de bord.'
  } finally {
    isLoading.value = false
  }
})

const fmtDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const growth = (series) => (series?.length ? series.at(-1) - series[0] : null)

// Bandeau « À traiter » : chaque point mène à la page filtrée correspondante
const attention = computed(() => {
  const d = data.value
  if (!d) return []
  const items = [
    { n: d.schools.filter(needsAttention).length, label: 'école(s) à surveiller', to: '/admin/schools?filter=alerts', tone: 'warning' },
    { n: d.system.errors.open, label: 'erreur(s) ouverte(s)', to: '/admin/errors', tone: 'error' },
    { n: d.todo.pending_invitations_count, label: "invitation(s) d'équipe en attente", to: '/admin/users?status=pending', tone: 'warning' },
    { n: d.todo.unassigned_users_count, label: 'ancien(s) staff sans affectation', to: '/admin/users?status=no_assignment', tone: 'neutral' },
    { n: d.system.migrations_pending.length, label: 'migration(s) non jouée(s)', to: '', tone: 'error' },
    { n: d.system.queue.jobs_failed || 0, label: 'job(s) en échec', to: '', tone: 'error' }
  ]
  return items.filter(i => i.n > 0)
})
const TONE_DOT = { error: 'bg-red-500', warning: 'bg-amber-500', neutral: 'bg-gray-400' }

const kpis = computed(() => {
  const d = data.value
  if (!d) return []
  const k = d.kpis
  const t = d.trends
  const staff = k.users_by_role.director + k.users_by_role.teacher
  return [
    { label: 'Écoles actives', value: k.schools_active, delta: growth(t.schools), trend: t.schools, sub: k.schools_suspended ? `${k.schools_suspended} suspendue(s)` : '', to: '/admin/schools' },
    { label: 'Équipes', value: staff, delta: growth(t.staff), trend: t.staff, sub: `${k.users_by_role.director} dir. · ${k.users_by_role.teacher} profs`, to: '/admin/users' },
    { label: 'Élèves inscrits', value: k.users_by_role.student.toLocaleString('fr-FR'), sub: 'en classe active' },
    { label: 'Actifs sur 7 jours', value: k.active_7d, sub: `${k.active_30d} sur 30 jours`, polarity: 'neutral' }
  ]
})

// La courbe des connexions ne démarre qu'à la mise en place du compteur
const loginPoints = computed(() => {
  const t = data.value?.trends
  if (!t?.logins_since) return []
  return t.dates
    .map((date, i) => ({ date, label: fmtDay(date), value: t.unique_users[i] }))
    .filter(p => p.date >= t.logins_since)
})
const loginsTotal = computed(() => loginPoints.value.reduce((a, p) => a + p.value, 0))

const schoolsToWatch = computed(() => (data.value?.schools ?? [])
  .filter(needsAttention)
  .sort((a, b) => b.alerts.length - a.alerts.length || a.name.localeCompare(b.name))
  .slice(0, 5))

const onSchoolUpdated = (school, res) => {
  school.access = res.access
  data.value.kpis.schools_active += res.access ? 1 : -1
  data.value.kpis.schools_suspended += res.access ? -1 : 1
  refreshCounters()
}
</script>

<template>
  <div class="p-4 sm:p-6 max-w-6xl font-montserrat">
    <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de la plateforme Toollab.">
      <template #actions>
        <NuxtLink to="/admin/schools/new" class="px-3 py-1.5 text-xs font-medium bg-default text-white rounded-lg hover:opacity-90">
          Créer une école
        </NuxtLink>
      </template>
    </PageHeader>

    <AlertBanner v-if="errorMsg" class="mb-5">{{ errorMsg }}</AlertBanner>

    <div v-if="isLoading" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="i in 4" :key="i" class="bg-white rounded-2xl border border-[#E6EFF5] p-5"><Skeleton :lines="3" /></div>
      </div>
      <div class="bg-white rounded-2xl border border-[#E6EFF5] p-5"><Skeleton :lines="6" /></div>
    </div>

    <template v-else-if="data">
      <!-- À traiter -->
      <section class="bg-white rounded-2xl border border-[#E6EFF5] mb-4" aria-labelledby="attention-title">
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
          <h2 id="attention-title" class="text-sm font-semibold">À traiter</h2>
          <p v-if="!attention.length" class="text-xs text-gray-600 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-green-600" aria-hidden="true"></span>
            Tout est en ordre.
          </p>
          <component
            :is="item.to ? NuxtLink : 'span'"
            v-for="item in attention"
            :key="item.label"
            :to="item.to || undefined"
            class="flex items-center gap-1.5 text-xs text-gray-700"
            :class="item.to ? 'hover:text-default hover:underline' : ''"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="TONE_DOT[item.tone]" aria-hidden="true"></span>
            <strong class="tabular-nums text-default">{{ item.n }}</strong> {{ item.label }}
          </component>
        </div>
      </section>

      <!-- Indicateurs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatTile v-for="kpi in kpis" :key="kpi.label" v-bind="kpi" />
      </div>

      <!-- Activité -->
      <AdminCard
        title="Utilisateurs connectés par jour"
        :subtitle="loginPoints.length ? `${loginsTotal.toLocaleString('fr-FR')} connexion${loginsTotal > 1 ? 's' : ''} distincte${loginsTotal > 1 ? 's' : ''} sur la période` : ''"
        class="mb-4"
      >
        <TrendChart
          v-if="loginPoints.length >= 2"
          :points="loginPoints"
          label="Utilisateurs connectés par jour"
          :height="140"
        />
        <p v-else class="text-xs text-gray-600">
          Le comptage des connexions vient d'être mis en place : la courbe apparaîtra dès demain et couvrira 30 jours au fil du temps.
        </p>
      </AdminCard>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <!-- Écoles à surveiller -->
        <AdminCard title="Écoles à surveiller" to="/admin/schools?filter=alerts" :padded="false">
          <p v-if="!schoolsToWatch.length" class="px-5 py-6 text-center text-xs text-gray-600">Aucune école à surveiller.</p>
          <ul v-else class="divide-y divide-[#E6EFF5] font-nunito">
            <li v-for="school in schoolsToWatch" :key="school.id" class="px-5 py-2.5 flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <NuxtLink :to="`/admin/schools/${school.id}`" class="text-sm font-semibold hover:underline">{{ school.name }}</NuxtLink>
                <div class="flex flex-wrap items-center gap-1 mt-0.5">
                  <span
                    v-for="a in school.alerts"
                    :key="a"
                    class="px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1"
                    :class="SCHOOL_ALERTS[a].cls"
                    :title="SCHOOL_ALERTS[a].hint"
                  >{{ SCHOOL_ALERTS[a].label }}</span>
                  <span class="text-[11px] text-gray-500 ml-1">activité : {{ relative(school.last_activity).toLowerCase() }}</span>
                </div>
              </div>
              <SchoolQuickActions
                :school="{ ...school, has_director: !school.alerts.includes('no_director') }"
                @updated="res => onSchoolUpdated(school, res)"
              />
            </li>
          </ul>
        </AdminCard>

        <!-- Santé technique -->
        <AdminCard title="Santé technique" :padded="false">
          <template #actions>
            <StatusBadge :status="data.system.environment === 'production' ? 'production' : 'local'" :label="data.system.environment" />
          </template>
          <div class="px-5 pt-4">
            <div class="flex justify-between items-baseline mb-2">
              <h3 class="text-xs font-semibold text-gray-600">Erreurs serveur sur 24 h</h3>
              <NuxtLink to="/admin/errors" class="text-xs text-blue-link hover:underline">Voir les erreurs</NuxtLink>
            </div>
            <dl class="grid grid-cols-3 gap-2 mb-3">
              <div>
                <dt class="text-[11px] text-gray-500">Sur 24 h</dt>
                <dd class="text-lg font-bold tabular-nums">{{ data.system.errors.last_24h }}</dd>
              </div>
              <div>
                <dt class="text-[11px] text-gray-500">Ouvertes</dt>
                <dd class="text-lg font-bold tabular-nums" :class="data.system.errors.open ? 'text-red-700' : ''">{{ data.system.errors.open }}</dd>
              </div>
              <div>
                <dt class="text-[11px] text-gray-500">E-mails en échec (7 j)</dt>
                <dd class="text-lg font-bold tabular-nums">
                  <NuxtLink v-if="data.system.errors.mail_failures_7d" to="/admin/errors?category=mail" class="text-red-700 hover:underline">{{ data.system.errors.mail_failures_7d }}</NuxtLink>
                  <template v-else>0</template>
                </dd>
              </div>
            </dl>
            <HourlyBars :values="data.system.errors.hourly" />
          </div>

          <dl class="px-5 py-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm font-nunito">
            <dt class="text-gray-500">Base de données</dt>
            <dd class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full" :class="data.system.database.ok ? 'bg-green-600' : 'bg-red-600'" aria-hidden="true"></span>
              {{ data.system.database.ok ? `OK · ${data.system.database.latency_ms} ms` : 'Injoignable' }}
            </dd>
            <dt class="text-gray-500">Taille</dt>
            <dd>
              <NuxtLink v-if="data.system.database_size" to="/admin/database" class="hover:underline tabular-nums">
                {{ formatBytes(data.system.database_size.total_bytes) }}
                <span v-if="data.system.database_size.size_30d !== null" class="text-xs text-gray-500">
                  {{ formatDelta(data.system.database_size.size_30d, formatBytes) }} sur 30 j
                </span>
              </NuxtLink>
              <template v-else>—</template>
            </dd>
            <dt class="text-gray-500">File d'attente</dt>
            <dd>
              {{ data.system.queue.jobs_waiting ?? '—' }} en attente ·
              <span :class="data.system.queue.jobs_failed ? 'text-red-700 font-semibold' : ''">{{ data.system.queue.jobs_failed ?? '—' }} en échec</span>
            </dd>
            <dt class="text-gray-500">Migrations</dt>
            <dd :class="data.system.migrations_pending.length ? 'text-red-700 font-semibold' : ''">
              {{ data.system.migrations_pending.length ? `${data.system.migrations_pending.length} non jouée(s)` : 'À jour' }}
            </dd>
          </dl>

          <div class="border-t border-[#E6EFF5]">
            <button
              type="button"
              class="w-full flex justify-between items-center px-5 py-2.5 text-xs text-gray-600 hover:text-default"
              :aria-expanded="showDetails"
              @click="showDetails = !showDetails"
            >
              Détails techniques
              <svg class="w-3.5 h-3.5 transition-transform" :class="showDetails ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div v-if="showDetails" class="px-5 pb-4 space-y-3 text-xs">
              <dl class="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
                <dt class="text-gray-500">Version</dt>
                <dd class="font-mono">{{ data.system.version || '—' }}<template v-if="data.system.commit"> ({{ data.system.commit.slice(0, 7) }})</template></dd>
                <dt class="text-gray-500">PHP / Laravel</dt>
                <dd class="font-mono">{{ data.system.php }} / {{ data.system.laravel }}</dd>
                <dt class="text-gray-500">File / Mail</dt>
                <dd class="font-mono">{{ data.system.queue.connection }} / {{ data.system.mail }}</dd>
                <dt class="text-gray-500">Debug</dt>
                <dd :class="data.system.debug && data.system.environment === 'production' ? 'text-red-700 font-semibold' : ''">{{ data.system.debug ? 'activé' : 'désactivé' }}</dd>
              </dl>
              <div v-if="data.system.migrations_pending.length">
                <h3 class="font-semibold text-gray-600 mb-1">Migrations non jouées</h3>
                <ul class="font-mono text-red-700 space-y-0.5">
                  <li v-for="m in data.system.migrations_pending" :key="m">{{ m }}</li>
                </ul>
              </div>
              <div v-if="data.system.queue.last_failed.length">
                <h3 class="font-semibold text-gray-600 mb-1">Derniers jobs en échec</h3>
                <ul class="space-y-1.5">
                  <li v-for="j in data.system.queue.last_failed" :key="j.id">
                    <span class="text-gray-500">{{ relative(j.failed_at) }} · {{ j.queue }}</span>
                    <div class="font-mono text-red-700 truncate">{{ j.exception }}</div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      <!-- Activité récente -->
      <AdminCard title="Activité récente" to="/admin/audit" link-label="Journal complet" :padded="false">
        <p v-if="!data.activity.length" class="px-5 py-6 text-center text-xs text-gray-600">Aucune action enregistrée pour l'instant.</p>
        <ul v-else class="divide-y divide-[#E6EFF5] font-nunito text-sm">
          <li v-for="log in data.activity.slice(0, 8)" :key="log.id" class="px-5 py-2 flex gap-3">
            <span class="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" :class="auditDotClass(log.action)" aria-hidden="true"></span>
            <div class="flex-1 min-w-0">
              <span class="font-semibold">{{ log.action_label }}</span>
              <template v-if="log.subject_label"> — {{ shortLabel(log.subject_label) }}</template>
              <span v-if="log.school" class="text-xs text-gray-500"> · {{ log.school }}</span>
              <div class="text-xs text-gray-500 truncate">
                <template v-if="auditDetail(log)">{{ auditDetail(log) }} · </template>par {{ log.actor_id ? shortLabel(log.actor_label) : 'lien public' }}
              </div>
            </div>
            <time class="text-xs text-gray-500 whitespace-nowrap" :datetime="log.created_at">{{ relative(log.created_at) }}</time>
          </li>
        </ul>
      </AdminCard>
    </template>
  </div>
</template>
