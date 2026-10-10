<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import adminDashboardService from '~/services/adminDashboard'
import SchoolQuickActions from '~/components/admin/SchoolQuickActions.vue'
import PageHeader from '~/components/admin/ui/PageHeader.vue'
import SegmentedControl from '~/components/admin/ui/SegmentedControl.vue'
import StatusBadge from '~/components/admin/ui/StatusBadge.vue'
import AlertBanner from '~/components/admin/ui/AlertBanner.vue'
import Skeleton from '~/components/admin/ui/Skeleton.vue'
import { SCHOOL_ALERTS, needsAttention, relativeDay } from '~/utils/schoolAlerts'
import { useAdminCounters } from '~/composables/useAdminCounters'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Admin · Écoles')

const route = useRoute()
const router = useRouter()
const { refreshCounters } = useAdminCounters()

const schools = ref([])
const isLoading = ref(true)
const errorMsg = ref('')
const q = ref('')
const filter = ref(['alerts', 'suspended'].includes(route.query.filter) ? route.query.filter : 'all')
watch(filter, (v) => router.replace({ query: v === 'all' ? {} : { filter: v } }))

onMounted(async () => {
  try {
    schools.value = await adminDashboardService.getSchoolsHealth()
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Erreur lors du chargement des écoles.'
  } finally {
    isLoading.value = false
  }
})

const normalize = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filtered = computed(() => {
  const term = normalize(q.value.trim())
  return schools.value
    .filter(s => filter.value === 'all' || (filter.value === 'alerts' ? needsAttention(s) : !s.access))
    .filter(s => !term || normalize(s.name).includes(term) || normalize(s.city).includes(term) || String(s.id) === term)
})

const filterOptions = computed(() => [
  { value: 'all', label: 'Toutes', count: schools.value.length },
  { value: 'alerts', label: 'À surveiller', count: schools.value.filter(needsAttention).length },
  { value: 'suspended', label: 'Suspendues', count: schools.value.filter(s => !s.access).length }
])

const onUpdated = (school, res) => {
  school.access = res.access
  refreshCounters()
}
</script>

<template>
  <div class="p-4 sm:p-6 max-w-6xl font-montserrat">
    <PageHeader title="Écoles" :subtitle="`${schools.length} école${schools.length > 1 ? 's' : ''} sur la plateforme`">
      <template #actions>
        <NuxtLink to="/admin/schools/new" class="px-3 py-1.5 text-xs font-medium bg-default text-white rounded-lg hover:opacity-90">
          Créer une école
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <input
        v-model="q"
        type="search"
        aria-label="Rechercher une école"
        placeholder="Nom, ville ou ID…"
        class="flex-1 min-w-[220px] max-w-sm px-3 py-1.5 text-sm border border-input-stroke rounded-lg bg-white"
      />
      <SegmentedControl v-model="filter" :options="filterOptions" label="Filtrer les écoles" />
    </div>

    <AlertBanner v-if="errorMsg" class="mb-4">{{ errorMsg }}</AlertBanner>

    <div class="bg-white rounded-2xl border border-[#E6EFF5] overflow-hidden">
      <div v-if="isLoading" class="p-5"><Skeleton :lines="6" /></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-sm">
          <thead class="border-b border-[#E6EFF5] text-left text-xs font-semibold text-gray-600">
            <tr>
              <th class="px-4 py-2.5">École</th>
              <th class="px-4 py-2.5 text-right">Élèves</th>
              <th class="px-4 py-2.5 text-right">Profs</th>
              <th class="px-4 py-2.5 text-right">Classes</th>
              <th class="px-4 py-2.5">Dernière activité</th>
              <th class="px-4 py-2.5">Signaux</th>
              <th class="px-2 py-2.5"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="font-nunito divide-y divide-[#E6EFF5]">
            <tr v-if="!filtered.length">
              <td colspan="7" class="px-4 py-8 text-center text-xs text-gray-600">
                {{ q ? 'Aucune école ne correspond à cette recherche.' : filter === 'all' ? 'Aucune école.' : 'Rien à signaler.' }}
              </td>
            </tr>
            <tr v-for="school in filtered" :key="school.id" class="hover:bg-gray-50">
              <td class="px-4 py-2.5">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 font-montserrat" aria-hidden="true">
                    {{ school.name?.charAt(0)?.toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <NuxtLink :to="`/admin/schools/${school.id}`" class="font-semibold text-default hover:underline">{{ school.name }}</NuxtLink>
                    <div class="text-xs text-gray-500 flex items-center gap-1.5">
                      {{ school.city || '—' }}
                      <StatusBadge v-if="!school.access" status="suspended" />
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-2.5 text-right tabular-nums">{{ school.students }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums">{{ school.teachers }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums">{{ school.classrooms }}</td>
              <td class="px-4 py-2.5 whitespace-nowrap">{{ relativeDay(school.last_activity) }}</td>
              <td class="px-4 py-2.5">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="a in school.alerts"
                    :key="a"
                    class="px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1"
                    :class="SCHOOL_ALERTS[a].cls"
                    :title="SCHOOL_ALERTS[a].hint"
                  >{{ SCHOOL_ALERTS[a].label }}</span>
                </div>
              </td>
              <td class="px-2 py-2.5 text-right">
                <SchoolQuickActions
                  :school="{ ...school, has_director: !school.alerts.includes('no_director') }"
                  @updated="res => onUpdated(school, res)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
