<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from '#imports'
import adminDashboardService from '~/services/adminDashboard'
import schoolService from '~/services/school'
import { enterImpersonation } from '~/utils/impersonation'
import IconViewAs from '~/components/admin/IconViewAs.vue'
import { roleDotClass, isStaffRole, relativeTime, groupMemberships } from '~/utils/adminFormat'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Admin · Utilisateurs')

const route = useRoute()
const router = useRouter()

const q = ref(route.query.q || '')
const role = ref(route.query.role || '')
const schoolId = ref(route.query.school_id || '')
const population = ref(route.query.population || 'staff')
const status = ref(route.query.status || '')
const sort = ref(route.query.sort || 'last_login')
const dir = ref(route.query.dir || '')
const page = ref(Number(route.query.page) || 1)
const selectedUserId = ref(route.query.user ? Number(route.query.user) : null)

const results = ref({ data: [], total: 0, last_page: 1, from: 0, to: 0 })
const schools = ref([])
const isLoading = ref(true)
const errorMsg = ref('')

const ROLES = [
  { slug: 'director', label: 'Directeur' },
  { slug: 'admin', label: 'Administrateur' },
  { slug: 'registar', label: 'Resp. inscriptions' },
  { slug: 'teacher', label: 'Professeur' },
  { slug: 'responsible', label: 'Responsable (parent)' },
  { slug: 'student', label: 'Élève' }
]

const POPULATIONS = [
  { value: 'staff', label: 'Équipes' },
  { value: 'families', label: 'Familles' },
  { value: 'all', label: 'Tous' }
]

// Les statuts n'ont de sens que pour les équipes (seules à pouvoir se connecter)
const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'never_logged', label: 'Jamais connectés' },
  { value: 'no_assignment', label: 'Sans affectation' },
  { value: 'pending', label: 'Invitation en attente' },
  { value: 'no_access', label: 'Accès coupé' }
]

// Avec une seule école (ou un filtre école), le nom d'école n'apporte rien sur chaque ligne
const singleSchool = computed(() => schools.value.length <= 1 || !!schoolId.value)

const syncUrl = () => {
  router.replace({
    query: {
      q: q.value || undefined,
      role: role.value || undefined,
      school_id: schoolId.value || undefined,
      population: population.value !== 'staff' ? population.value : undefined,
      status: status.value || undefined,
      sort: sort.value !== 'last_login' ? sort.value : undefined,
      dir: dir.value || undefined,
      page: page.value > 1 ? page.value : undefined,
      user: selectedUserId.value || undefined
    }
  })
}

const fetchUsers = async () => {
  isLoading.value = true
  errorMsg.value = ''
  syncUrl()
  try {
    results.value = await adminDashboardService.searchUsers({
      q: q.value || undefined,
      role: role.value || undefined,
      school_id: schoolId.value || undefined,
      population: population.value,
      status: population.value === 'families' ? undefined : (status.value || undefined),
      sort: sort.value,
      dir: dir.value || undefined,
      page: page.value
    })
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Erreur lors de la recherche.'
  } finally {
    isLoading.value = false
  }
}

let debounce
watch(q, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => { page.value = 1; fetchUsers() }, 300)
})
watch([role, schoolId, status, population], () => { page.value = 1; fetchUsers() })
watch(selectedUserId, syncUrl)

const goToPage = (p) => { page.value = p; fetchUsers() }

// Tri : un clic choisit la colonne (sens par défaut), un second inverse
const DEFAULT_DIR = { last_login: 'desc', name: 'asc', created: 'desc' }
const toggleSort = (col) => {
  if (sort.value === col) {
    dir.value = (dir.value || DEFAULT_DIR[col]) === 'asc' ? 'desc' : 'asc'
  } else {
    sort.value = col
    dir.value = ''
  }
  page.value = 1
  fetchUsers()
}
const sortIcon = (col) => {
  if (sort.value !== col) return '↕'
  return (dir.value || DEFAULT_DIR[col]) === 'asc' ? '↑' : '↓'
}
const ariaSort = (col) => sort.value !== col ? 'none' : ((dir.value || DEFAULT_DIR[col]) === 'asc' ? 'ascending' : 'descending')

onMounted(async () => {
  fetchUsers()
  try {
    schools.value = await schoolService.getSchools()
  } catch (e) {
    console.error(e)
  }
})

// Se connecter en tant que (lecture seule)
const impersonateTarget = ref(null)
const impersonateReason = ref('')
const impersonateError = ref('')
const isImpersonating = ref(false)

const askImpersonate = (u) => {
  impersonateTarget.value = u
  impersonateReason.value = ''
  impersonateError.value = ''
}

const confirmImpersonate = async () => {
  isImpersonating.value = true
  impersonateError.value = ''
  try {
    const data = await adminDashboardService.impersonate(impersonateTarget.value.id, impersonateReason.value.trim())
    enterImpersonation(data)
  } catch (e) {
    impersonateError.value = e.response?.data?.message || 'Impossible de démarrer la session.'
    isImpersonating.value = false
  }
}

const roleNames = (roles) => roles.filter(m => !m.pending).map(m => m.role).join(', ')
const pendingRoles = (roles) => roles.filter(m => m.pending)
const mainSlug = (roles) => (roles.find(m => m.slug === 'director') || roles.find(m => isStaffRole(m.slug)) || roles[0])?.slug

const openSchool = (id) => {
  localStorage.setItem('current_school_id', String(id))
  router.push('/')
}
</script>

<template>
  <div class="p-4 sm:p-6 max-w-6xl font-montserrat">
    <div class="mb-4">
      <h1 class="text-lg font-bold">Utilisateurs</h1>
      <p class="text-gray-600 text-xs">Recherche globale, toutes écoles confondues.</p>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-3">
      <input
        v-model="q"
        type="search"
        aria-label="Rechercher un utilisateur"
        placeholder="Nom, prénom, email ou ID…"
        class="flex-1 min-w-[240px] px-3 py-1.5 text-sm border border-input-stroke rounded-lg bg-white"
        autofocus
      />
      <div class="relative">
        <select v-model="role" aria-label="Filtrer par rôle" class="pl-3 pr-8 py-1.5 text-sm border border-input-stroke rounded-lg bg-white">
          <option value="">Tous les rôles</option>
          <option v-for="r in ROLES" :key="r.slug" :value="r.slug">{{ r.label }}</option>
        </select>
        <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
      <div v-if="schools.length > 1" class="relative">
        <select v-model="schoolId" aria-label="Filtrer par école" class="pl-3 pr-8 py-1.5 text-sm border border-input-stroke rounded-lg bg-white">
          <option value="">Toutes les écoles</option>
          <option v-for="s in schools" :key="s.id" :value="String(s.id)">{{ s.name }}</option>
        </select>
        <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="inline-flex rounded-lg border border-input-stroke divide-x divide-input-stroke overflow-hidden" role="group" aria-label="Population">
        <button
          v-for="p in POPULATIONS"
          :key="p.value"
          class="px-3 py-1.5 text-xs transition-colors"
          :class="population === p.value ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
          :aria-pressed="population === p.value"
          @click="population = p.value"
        >{{ p.label }}</button>
      </div>
      <div
        v-if="population !== 'families'"
        class="inline-flex rounded-lg border border-input-stroke divide-x divide-input-stroke overflow-hidden"
        role="group"
        aria-label="Statut"
      >
        <button
          v-for="st in STATUSES"
          :key="st.value"
          class="px-3 py-1.5 text-xs transition-colors"
          :class="status === st.value ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
          :aria-pressed="status === st.value"
          @click="status = st.value"
        >{{ st.label }}</button>
      </div>
    </div>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs mb-4">
      {{ errorMsg }}
    </div>

    <div class="bg-white rounded-2xl border border-[#E6EFF5] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full table-fixed min-w-[720px]" :class="{ 'opacity-50': isLoading }">
          <colgroup>
            <col class="w-[38%]" />
            <col />
            <col class="w-40" />
            <col class="w-12" />
          </colgroup>
          <thead class="border-b border-[#E6EFF5] text-left text-xs font-semibold text-gray-600">
            <tr>
              <th class="px-4 py-2.5" :aria-sort="ariaSort('name')">
                <button class="inline-flex items-center gap-1 hover:text-default outline-none focus-visible:underline" @click="toggleSort('name')">
                  Utilisateur <span aria-hidden="true" class="text-gray-400">{{ sortIcon('name') }}</span>
                </button>
              </th>
              <th class="px-4 py-2.5">Rattachements</th>
              <th class="px-4 py-2.5" :aria-sort="ariaSort('last_login')">
                <button class="inline-flex items-center gap-1 hover:text-default outline-none focus-visible:underline" @click="toggleSort('last_login')">
                  Dernière connexion <span aria-hidden="true" class="text-gray-400">{{ sortIcon('last_login') }}</span>
                </button>
              </th>
              <th class="px-2 py-2.5"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="font-nunito text-sm divide-y divide-[#E6EFF5]">
            <tr v-if="!isLoading && !results.data.length">
              <td colspan="4" class="px-4 py-6 text-center text-xs text-gray-600">Aucun utilisateur trouvé.</td>
            </tr>
            <tr
              v-for="u in results.data"
              :key="u.id"
              class="align-top hover:bg-gray-50 cursor-pointer transition-colors"
              :class="{ 'bg-gray-50': selectedUserId === u.id }"
              @click="selectedUserId = u.id"
            >
              <td class="px-4 py-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <button
                    class="font-semibold text-left truncate hover:underline outline-none focus-visible:underline"
                    @click.stop="selectedUserId = u.id"
                  >{{ u.first_name }} {{ u.last_name }}</button>
                  <span v-if="u.is_super_admin" class="px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-violet-50 text-violet-700 ring-violet-200">super-admin</span>
                  <span v-if="!u.access" class="px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-red-50 text-red-700 ring-red-200">accès coupé</span>
                </div>
                <div class="text-xs text-gray-600 truncate">
                  <template v-if="u.email">{{ u.email }}</template>
                  <span v-else class="italic">Compte élève · pas d'email</span>
                  · #{{ u.id }}
                </div>
              </td>
              <td class="px-4 py-2 text-xs text-gray-700">
                <span v-if="u.is_former_staff" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-gray-50 text-gray-600 ring-gray-200">
                  Sans affectation · ancien staff
                </span>
                <span v-else-if="!u.memberships.length" class="text-gray-400">—</span>
                <div v-for="g in groupMemberships(u.memberships)" :key="g.school_id ?? 'none'" class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <template v-if="roleNames(g.roles)">
                    <span class="h-1.5 w-1.5 rounded-full" :class="roleDotClass(mainSlug(g.roles))" aria-hidden="true"></span>
                    <span>{{ roleNames(g.roles) }}</span>
                  </template>
                  <span
                    v-for="(m, i) in pendingRoles(g.roles)"
                    :key="`p${i}`"
                    class="px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-amber-50 text-amber-700 ring-amber-200"
                  >{{ m.role }} · invitation en attente</span>
                  <span v-if="g.school && !singleSchool" class="text-gray-500">— {{ g.school }}</span>
                </div>
              </td>
              <td class="px-4 py-2">
                <div :class="u.last_login_at ? '' : 'text-gray-500'">
                  {{ !u.is_staff && !u.is_former_staff && !u.is_super_admin ? '—' : relativeTime(u.last_login_at) }}
                </div>
                <div class="text-xs text-gray-500">créé le {{ new Date(u.created_at).toLocaleDateString('fr-FR') }}</div>
              </td>
              <td class="px-2 py-2 text-right">
                <button
                  v-if="u.can_impersonate"
                  class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:text-default hover:bg-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-default"
                  :title="`Se connecter en tant que ${u.first_name} ${u.last_name}`"
                  :aria-label="`Se connecter en tant que ${u.first_name} ${u.last_name}`"
                  @click.stop="askImpersonate(u)"
                >
                  <IconViewAs class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex justify-between items-center px-4 py-2 border-t border-[#E6EFF5] text-xs">
        <span class="text-gray-600">
          <template v-if="results.total">{{ results.from }}–{{ results.to }} sur {{ results.total }}</template>
          <template v-else>0 résultat</template>
        </span>
        <div v-if="results.last_page > 1" class="flex gap-1.5">
          <button class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" :disabled="page <= 1" @click="goToPage(page - 1)">Précédent</button>
          <button class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" :disabled="page >= results.last_page" @click="goToPage(page + 1)">Suivant</button>
        </div>
      </div>
    </div>

    <AdminUserPanel
      v-if="selectedUserId"
      :user-id="selectedUserId"
      :single-school="schools.length <= 1"
      @close="selectedUserId = null"
      @open-user="id => selectedUserId = id"
      @open-school="openSchool"
      @impersonate="askImpersonate"
      @updated="res => { const row = results.data.find(r => r.id === res.id); if (row) Object.assign(row, { access: res.access, can_impersonate: res.access && row.is_staff && !row.is_super_admin }) }"
    />

    <!-- Modale : motif obligatoire -->
    <div v-if="impersonateTarget" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" @click.self="impersonateTarget = null">
      <form class="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 font-montserrat" @submit.prevent="confirmImpersonate">
        <h2 class="text-base font-bold mb-1">Se connecter en tant que {{ impersonateTarget.first_name }} {{ impersonateTarget.last_name }}</h2>
        <p class="text-xs text-gray-600 mb-4">
          Session en <strong>lecture seule</strong> de 60 minutes. Aucune modification ne sera possible.
          La session et son motif sont enregistrés dans le journal d'audit.
        </p>
        <label class="block text-xs font-semibold text-gray-700 mb-1" for="imp-reason">Motif</label>
        <input
          id="imp-reason"
          v-model="impersonateReason"
          type="text"
          required
          minlength="3"
          maxlength="255"
          placeholder="Ex. : ticket #42, bulletin qui ne s'affiche pas"
          class="w-full px-3 py-1.5 text-sm border border-input-stroke rounded-lg mb-3"
          autofocus
        />
        <p v-if="impersonateError" class="bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs mb-3">{{ impersonateError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="px-4 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50" @click="impersonateTarget = null">Annuler</button>
          <button
            type="submit"
            class="px-4 py-1.5 text-sm bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            :disabled="isImpersonating || impersonateReason.trim().length < 3"
          >
            Se connecter en lecture seule
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
