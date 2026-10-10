<script setup>
import { ref, computed, onMounted } from 'vue'
import adminDashboardService from '~/services/adminDashboard'
import SchoolQuickActions from '~/components/admin/SchoolQuickActions.vue'
import { auditDetail, auditDotClass, shortLabel } from '~/utils/auditFormat'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Administration')

const data = ref(null)
const isLoading = ref(true)
const errorMsg = ref('')
const schoolFilter = ref('all')

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

const ALERTS = {
  inactive: { label: 'Inactive', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  onboarding: { label: 'Onboarding incomplet', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  no_director: { label: 'Sans directeur', cls: 'bg-red-50 text-red-700 ring-red-200' }
}

const kpis = computed(() => {
  const k = data.value?.kpis
  if (!k) return []
  const delta = k.signups_this_month - k.signups_last_month
  return [
    { value: k.schools_total, label: 'Écoles', sub: `${k.schools_active} actives · ${k.schools_suspended} suspendues` },
    { value: k.users_total, label: 'Utilisateurs', sub: `${k.users_by_role.director} dir. · ${k.users_by_role.teacher} profs · ${k.users_by_role.student} élèves · ${k.users_by_role.responsible} parents` },
    { value: k.active_7d, label: 'Actifs sur 7 jours', sub: `${k.active_30d} sur 30 jours` },
    { value: k.signups_this_month, label: 'Inscriptions ce mois', sub: `${delta >= 0 ? '+' : ''}${delta} vs mois dernier` }
  ]
})

const filteredSchools = computed(() => {
  const list = data.value?.schools ?? []
  return schoolFilter.value === 'alerts' ? list.filter(s => s.alerts.length) : list
})

const schoolsWithAlerts = computed(() => (data.value?.schools ?? []).filter(s => s.alerts.length).length)

const relative = (date) => {
  if (!date) return 'Jamais'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 30) return `Il y a ${days} j`
  return new Date(date).toLocaleDateString('fr-FR')
}

const onSchoolUpdated = (school, res) => {
  school.access = res.access
  data.value.kpis.schools_active += res.access ? 1 : -1
  data.value.kpis.schools_suspended += res.access ? -1 : 1
}
</script>

<template>
  <div class="p-6 max-w-6xl font-montserrat">
    <div class="flex flex-wrap justify-between items-start gap-3 mb-6">
      <div>
        <h1 class="text-lg font-bold mb-1.5">Administration Toollab</h1>
        <p class="text-gray-600">Vue plateforme — gestion globale des écoles.</p>
      </div>
      <div class="flex gap-3">
        <NuxtLink to="/admin/schools" class="px-3 py-1.5 text-xs font-medium bg-default text-white rounded-lg hover:opacity-90">
          Gérer les écoles
        </NuxtLink>
        <NuxtLink to="/admin/schools/new" class="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          + Créer une école
        </NuxtLink>
      </div>
    </div>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs mb-5">
      {{ errorMsg }}
    </div>

    <div v-if="isLoading" class="py-6 text-center">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-default mx-auto"></div>
    </div>

    <template v-else-if="data">
      <!-- KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div v-for="kpi in kpis" :key="kpi.label" class="bg-white p-5 rounded-2xl border">
          <div class="text-xl font-bold text-default">{{ kpi.value }}</div>
          <div class="text-sm font-medium mt-1">{{ kpi.label }}</div>
          <div class="text-xs text-gray-500 mt-0.5">{{ kpi.sub }}</div>
        </div>
      </div>

      <!-- Santé des écoles -->
      <div class="bg-white rounded-2xl border mb-6">
        <div class="flex flex-wrap justify-between items-center gap-2 p-4 border-b border-[#E6EFF5]">
          <h2 class="font-bold">Santé des écoles</h2>
          <div class="inline-flex rounded-lg border border-input-stroke divide-x divide-input-stroke overflow-hidden" role="group" aria-label="Filtre des écoles">
            <button
              class="px-3 py-1.5 text-xs transition-colors"
              :class="schoolFilter === 'all' ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
              :aria-pressed="schoolFilter === 'all'"
              @click="schoolFilter = 'all'"
            >Toutes ({{ data.schools.length }})</button>
            <button
              class="px-3 py-1.5 text-xs transition-colors"
              :class="schoolFilter === 'alerts' ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
              :aria-pressed="schoolFilter === 'alerts'"
              @click="schoolFilter = 'alerts'"
            >À surveiller ({{ schoolsWithAlerts }})</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-[#E6EFF5] text-left text-xs font-semibold text-gray-600">
              <tr>
                <th class="px-4 py-2">École</th>
                <th class="px-4 py-2 text-right">Élèves</th>
                <th class="px-4 py-2 text-right">Profs</th>
                <th class="px-4 py-2 text-right">Classes</th>
                <th class="px-4 py-2">Dernière activité</th>
                <th class="px-4 py-2">Signaux</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredSchools.length">
                <td colspan="7" class="px-4 py-6 text-center text-gray-500">Rien à signaler.</td>
              </tr>
              <tr v-for="school in filteredSchools" :key="school.id" class="border-b border-[#E6EFF5] last:border-0 hover:bg-gray-50 font-nunito">
                <td class="px-4 py-2">
                  <NuxtLink :to="`/admin/schools/${school.id}`" class="font-medium hover:underline">{{ school.name }}</NuxtLink>
                  <div class="text-xs text-gray-500">
                    {{ school.city || '—' }}
                    <span v-if="!school.access" class="ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-red-50 text-red-700 ring-red-200">suspendue</span>
                  </div>
                </td>
                <td class="px-4 py-2 text-right">{{ school.students }}</td>
                <td class="px-4 py-2 text-right">{{ school.teachers }}</td>
                <td class="px-4 py-2 text-right">{{ school.classrooms }}</td>
                <td class="px-4 py-2 whitespace-nowrap">{{ relative(school.last_activity) }}</td>
                <td class="px-4 py-2">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="a in school.alerts" :key="a" class="px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1" :class="ALERTS[a].cls">
                      {{ ALERTS[a].label }}
                    </span>
                  </div>
                </td>
                <td class="px-2 py-2 text-right">
                  <SchoolQuickActions
                    :school="{ ...school, has_director: !school.alerts.includes('no_director') }"
                    @updated="res => onSchoolUpdated(school, res)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- À traiter -->
        <div class="bg-white rounded-2xl border">
          <div class="p-4 border-b border-[#E6EFF5]">
            <h2 class="font-bold">À traiter</h2>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ data.todo.pending_invitations_count }} invitation(s) en attente ·
              {{ data.todo.expired_tokens_count }} lien(s) d'invitation expiré(s)
            </p>
          </div>
          <div class="p-4 space-y-5 text-sm">
            <div>
              <div class="flex justify-between items-baseline mb-2">
                <h3 class="text-xs font-semibold uppercase text-gray-500">Invitations non acceptées depuis plus de 3 jours</h3>
                <NuxtLink to="/admin/users?status=pending" class="text-xs text-default hover:underline">Tout voir →</NuxtLink>
              </div>
              <p v-if="!data.todo.pending_invitations.length" class="text-gray-500">Aucune.</p>
              <ul v-else class="divide-y">
                <li v-for="inv in data.todo.pending_invitations" :key="`${inv.user_id}-${inv.created_at}`" class="py-1.5 flex justify-between gap-3">
                  <NuxtLink :to="`/admin/users?user=${inv.user_id}`" class="truncate hover:underline">{{ inv.email }} <span class="text-gray-500">· {{ inv.role }}<template v-if="inv.school"> · {{ inv.school }}</template></span></NuxtLink>
                  <span class="text-xs text-gray-500 whitespace-nowrap">{{ relative(inv.created_at) }}</span>
                </li>
              </ul>
            </div>
            <div>
              <div class="flex justify-between items-baseline mb-2">
                <h3 class="text-xs font-semibold uppercase text-gray-500">Anciens staff sans affectation</h3>
                <NuxtLink to="/admin/users?status=no_assignment" class="text-xs text-default hover:underline">Tout voir →</NuxtLink>
              </div>
              <p v-if="!data.todo.unassigned_users.length" class="text-gray-500">Aucun.</p>
              <ul v-else class="divide-y">
                <li v-for="u in data.todo.unassigned_users" :key="u.id" class="py-1.5 flex justify-between gap-3">
                  <NuxtLink :to="`/admin/users?user=${u.id}`" class="truncate hover:underline">{{ u.first_name }} {{ u.last_name }} <span class="text-gray-500">· {{ u.email }}</span></NuxtLink>
                  <span class="text-xs text-gray-500 whitespace-nowrap">{{ relative(u.created_at) }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Système -->
        <div class="bg-white rounded-2xl border">
          <div class="p-4 border-b border-[#E6EFF5] flex justify-between items-center">
            <h2 class="font-bold">Système</h2>
            <span class="px-2 py-0.5 rounded text-xs font-medium"
              :class="data.system.environment === 'production' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'">
              {{ data.system.environment }}
            </span>
          </div>
          <dl class="p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt class="text-gray-500">Version</dt>
            <dd class="font-mono text-xs">{{ data.system.version || '—' }}<template v-if="data.system.commit"> ({{ data.system.commit.slice(0, 7) }})</template></dd>
            <dt class="text-gray-500">Base de données</dt>
            <dd>
              <span :class="data.system.database.ok ? 'text-green-600' : 'text-red-600'">●</span>
              {{ data.system.database.ok ? `OK · ${data.system.database.latency_ms} ms` : 'Erreur' }}
            </dd>
            <dt class="text-gray-500">Migrations en attente</dt>
            <dd :class="data.system.migrations_pending.length ? 'text-red-600 font-medium' : ''">
              {{ data.system.migrations_pending.length }}
            </dd>
            <dt class="text-gray-500">File d'attente</dt>
            <dd>
              {{ data.system.queue.connection }} ·
              {{ data.system.queue.jobs_waiting ?? '—' }} en attente ·
              <span :class="data.system.queue.jobs_failed ? 'text-red-600 font-medium' : ''">{{ data.system.queue.jobs_failed ?? '—' }} en échec</span>
            </dd>
            <dt class="text-gray-500">Mail</dt>
            <dd>{{ data.system.mail }}</dd>
            <dt class="text-gray-500">PHP / Laravel</dt>
            <dd class="font-mono text-xs">{{ data.system.php }} / {{ data.system.laravel }}</dd>
            <dt class="text-gray-500">Debug</dt>
            <dd :class="data.system.debug && data.system.environment === 'production' ? 'text-red-600 font-medium' : ''">
              {{ data.system.debug ? 'activé' : 'désactivé' }}
            </dd>
          </dl>
          <div v-if="data.system.migrations_pending.length" class="px-4 pb-4">
            <h3 class="text-xs font-semibold uppercase text-gray-500 mb-1">Migrations non jouées</h3>
            <ul class="font-mono text-xs text-red-700 space-y-0.5">
              <li v-for="m in data.system.migrations_pending" :key="m">{{ m }}</li>
            </ul>
          </div>
          <div v-if="data.system.queue.last_failed.length" class="px-4 pb-4">
            <h3 class="text-xs font-semibold uppercase text-gray-500 mb-1">Derniers jobs en échec</h3>
            <ul class="space-y-1.5">
              <li v-for="j in data.system.queue.last_failed" :key="j.id" class="text-xs">
                <span class="text-gray-500">{{ relative(j.failed_at) }} · {{ j.queue }}</span>
                <div class="font-mono text-red-700 truncate">{{ j.exception }}</div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Activité récente -->
      <div class="bg-white rounded-2xl border mt-6">
        <div class="px-4 py-3 border-b border-[#E6EFF5] flex justify-between items-baseline">
          <h2 class="font-bold">Activité récente</h2>
          <NuxtLink to="/admin/audit" class="text-xs text-blue-link hover:underline">Journal complet</NuxtLink>
        </div>
        <p v-if="!data.activity.length" class="px-4 py-6 text-center text-xs text-gray-600">Aucune action enregistrée pour l'instant.</p>
        <ul v-else class="divide-y divide-[#E6EFF5] font-nunito text-sm">
          <li v-for="log in data.activity" :key="log.id" class="px-4 py-2 flex gap-3">
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
      </div>
    </template>
  </div>
</template>
