<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import adminDashboardService from '~/services/adminDashboard'
import IconViewAs from '~/components/admin/IconViewAs.vue'
import { roleDotClass, relativeTime, groupMemberships } from '~/utils/adminFormat'
import { auditDetail, auditDotClass, shortLabel } from '~/utils/auditFormat'

const props = defineProps({
  userId: { type: Number, required: true },
  singleSchool: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'impersonate', 'open-user', 'open-school', 'updated'])

const user = ref(null)
const history = ref([])
const historyTotal = ref(0)
const isLoading = ref(true)
const errorMsg = ref('')

const load = async () => {
  isLoading.value = true
  errorMsg.value = ''
  try {
    const [u, logs] = await Promise.all([
      adminDashboardService.getUser(props.userId),
      adminDashboardService.getAuditLogs({ user_id: props.userId })
    ])
    user.value = u
    history.value = logs.data.slice(0, 8)
    historyTotal.value = logs.total
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Impossible de charger la fiche.'
  } finally {
    isLoading.value = false
  }
}

watch(() => props.userId, load)
onMounted(load)

const onKey = (e) => { if (e.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

const name = (u) => u ? `${u.first_name} ${u.last_name}` : 'Utilisateur supprimé'

// Désactivation du compte (formulaire inline, pas de modale dans le panneau)
const accessForm = ref(false)
const disableReason = ref('')
const accessError = ref('')
const isSavingAccess = ref(false)

watch(() => props.userId, () => { accessForm.value = false })

const submitAccess = async () => {
  isSavingAccess.value = true
  accessError.value = ''
  try {
    const res = user.value.access
      ? await adminDashboardService.disableUser(user.value.id, disableReason.value.trim())
      : await adminDashboardService.enableUser(user.value.id)
    Object.assign(user.value, res, { can_impersonate: res.access && user.value.is_staff && !user.value.is_super_admin })
    accessForm.value = false
    disableReason.value = ''
    emit('updated', res)
    const logs = await adminDashboardService.getAuditLogs({ user_id: user.value.id })
    history.value = logs.data.slice(0, 8)
    historyTotal.value = logs.total
  } catch (e) {
    accessError.value = e.response?.data?.message || "L'action n'a pas pu aboutir."
  } finally {
    isSavingAccess.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex justify-end">
    <div class="absolute inset-0 bg-black/20" @click="emit('close')"></div>

    <aside
      class="relative w-full max-w-md h-full bg-white shadow-xl overflow-y-auto font-montserrat"
      role="dialog"
      aria-modal="true"
      :aria-label="user ? `Fiche de ${name(user)}` : 'Fiche utilisateur'"
    >
      <div class="sticky top-0 bg-white border-b border-[#E6EFF5] px-5 py-3 flex justify-between items-center">
        <span class="text-xs text-gray-600">Fiche utilisateur</span>
        <button
          class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:text-default hover:bg-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-default"
          aria-label="Fermer"
          title="Fermer"
          @click="emit('close')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div v-if="isLoading" class="py-10 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-default mx-auto"></div>
      </div>
      <div v-else-if="errorMsg" class="m-5 bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs">{{ errorMsg }}</div>

      <div v-else-if="user" class="px-5 py-4 space-y-5 text-sm">
        <!-- En-tête -->
        <div>
          <h2 class="text-base font-bold">
            {{ name(user) }}
            <span v-if="user.is_super_admin" class="ml-1 align-middle px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-violet-50 text-violet-700 ring-violet-200">super-admin</span>
            <span v-if="!user.access" class="ml-1 align-middle px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-red-50 text-red-700 ring-red-200">accès coupé</span>
          </h2>
          <p class="text-xs text-gray-600 font-nunito">
            <template v-if="user.email">{{ user.email }}</template>
            <span v-else class="italic">Compte élève · pas d'email</span>
            · #{{ user.id }}
          </p>
          <dl class="grid grid-cols-2 gap-3 mt-3 font-nunito">
            <div>
              <dt class="text-xs text-gray-600">Dernière connexion</dt>
              <dd>{{ relativeTime(user.last_login_at) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-600">Compte créé</dt>
              <dd>{{ new Date(user.created_at).toLocaleDateString('fr-FR') }}</dd>
            </div>
          </dl>
          <div v-if="!user.access" class="mt-3 bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs">
            <strong>Compte désactivé</strong>
            <template v-if="user.disabled_at"> le {{ new Date(user.disabled_at).toLocaleDateString('fr-FR') }}</template>
            — connexion impossible.
            <template v-if="user.disabled_reason"> Motif : {{ user.disabled_reason }}</template>
          </div>
          <div v-if="user.can_impersonate" class="mt-4">
            <button
              class="w-full inline-flex items-center justify-center gap-2 px-4 py-1.5 text-sm bg-default text-white rounded-lg hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-default"
              @click="emit('impersonate', user)"
            >
              <IconViewAs class="w-4 h-4" />
              Se connecter en tant que {{ user.first_name }}
            </button>
            <p class="mt-1.5 text-xs text-gray-600 text-center">Lecture seule · 60 min · enregistré dans l'audit</p>
          </div>
          <p v-else-if="user.is_former_staff" class="mt-4 text-xs text-gray-700 bg-gray-50 ring-1 ring-gray-200 rounded-lg px-3 py-2">
            Ancien membre d'une équipe, sans affectation : il peut se connecter mais ne voit aucune école.
          </p>
          <p v-else-if="!user.is_staff && !user.is_super_admin" class="mt-4 text-xs text-gray-700 bg-gray-50 ring-1 ring-gray-200 rounded-lg px-3 py-2">
            Compte famille : pas d'accès à l'outil.
          </p>
        </div>

        <!-- Rattachements -->
        <section>
          <h3 class="text-xs font-semibold uppercase text-gray-600 mb-2">Rattachements</h3>
          <p v-if="!user.memberships.length" class="text-xs text-gray-600">Aucune affectation.</p>
          <div v-for="g in groupMemberships(user.memberships)" :key="g.school_id ?? 'none'" class="mb-2">
            <button
              v-if="g.school_id && !singleSchool"
              class="text-xs text-gray-600 hover:underline mb-1"
              @click="emit('open-school', g.school_id)"
            >{{ g.school }} →</button>
            <ul class="font-nunito space-y-1">
              <li v-for="(m, i) in g.roles" :key="i" class="flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 rounded-full" :class="roleDotClass(m.slug)" aria-hidden="true"></span>
                {{ m.role }}
                <span v-if="m.pending" class="px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-amber-50 text-amber-700 ring-amber-200">invitation en attente</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- Famille -->
        <section v-if="user.families.length">
          <h3 class="text-xs font-semibold uppercase text-gray-600 mb-2">Famille</h3>
          <div v-for="f in user.families" :key="f.id" class="rounded-lg ring-1 ring-[#E6EFF5] divide-y divide-[#E6EFF5] mb-2 font-nunito">
            <button
              v-for="m in f.members"
              :key="m.id"
              class="w-full flex justify-between items-center px-3 py-1.5 text-left hover:bg-gray-50 disabled:hover:bg-transparent"
              :disabled="m.id === user.id"
              @click="emit('open-user', m.id)"
            >
              <span :class="m.id === user.id ? 'font-medium' : ''">{{ m.first_name }} {{ m.last_name }}</span>
              <span class="text-xs text-gray-600">{{ m.role }}</span>
            </button>
          </div>
        </section>

        <!-- Classes -->
        <section v-if="user.classrooms_enrolled.length || user.classrooms_taught.length">
          <h3 class="text-xs font-semibold uppercase text-gray-600 mb-2">Classes</h3>
          <ul class="space-y-1 font-nunito">
            <li v-for="c in user.classrooms_taught" :key="`t${c.id}`">
              {{ c.name }} <span class="text-xs text-gray-600">· {{ c.is_main ? 'professeur principal' : 'enseigne' }}</span>
            </li>
            <li v-for="c in user.classrooms_enrolled" :key="`e${c.id}`">
              {{ c.name }} <span class="text-xs text-gray-600">· élève ({{ c.status }})</span>
            </li>
          </ul>
        </section>

        <!-- Connexions -->
        <section>
          <h3 class="text-xs font-semibold uppercase text-gray-600 mb-2">Sessions récentes</h3>
          <p v-if="!user.sessions.length" class="text-gray-600">Aucune session.</p>
          <ul v-else class="space-y-1 font-nunito">
            <li v-for="(t, i) in user.sessions" :key="i" class="flex justify-between gap-3">
              <span>
                {{ relativeTime(t.created_at) }}
                <span v-if="t.impersonation" class="ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium ring-1 bg-amber-50 text-amber-700 ring-amber-200">support</span>
              </span>
              <span class="text-xs text-gray-600">
                utilisée {{ relativeTime(t.last_used_at).toLowerCase() }}
              </span>
            </li>
          </ul>
        </section>

        <!-- Historique (journal d'audit : ce que la personne a fait ou subi) -->
        <section>
          <div class="flex justify-between items-baseline mb-2">
            <h3 class="text-xs font-semibold uppercase text-gray-600">Historique</h3>
            <NuxtLink v-if="historyTotal > history.length" :to="`/admin/audit?user_id=${user.id}`" class="text-xs text-blue-link hover:underline">
              Tout voir ({{ historyTotal }})
            </NuxtLink>
          </div>
          <p v-if="!history.length" class="text-xs text-gray-600">Aucune action enregistrée.</p>
          <ul v-else class="space-y-2 font-nunito">
            <li v-for="log in history" :key="log.id" class="flex gap-2 text-xs">
              <span class="mt-1 h-1.5 w-1.5 rounded-full shrink-0" :class="auditDotClass(log.action)" aria-hidden="true"></span>
              <div class="min-w-0">
                <div>
                  <strong>{{ log.action_label }}</strong>
                  <template v-if="log.subject_id !== user.id && log.subject_label"> — {{ shortLabel(log.subject_label) }}</template>
                  <span class="text-gray-500"> · {{ relativeTime(log.created_at).toLowerCase() }}</span>
                </div>
                <div class="text-gray-600">
                  <template v-if="auditDetail(log)">{{ auditDetail(log) }} · </template>
                  par {{ log.actor_id === user.id ? 'lui-même' : (log.actor_id ? shortLabel(log.actor_label) : 'lien public') }}
                </div>
              </div>
            </li>
          </ul>
        </section>

        <!-- Compte : désactivation / réactivation -->
        <section v-if="!user.is_super_admin" class="pt-4 border-t border-[#E6EFF5]">
          <h3 class="text-xs font-semibold uppercase text-gray-600 mb-2">Compte</h3>
          <template v-if="!accessForm">
            <button
              v-if="user.access"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
              @click="accessForm = true"
            >Désactiver le compte…</button>
            <button
              v-else
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              @click="accessForm = true"
            >Réactiver le compte…</button>
          </template>
          <form v-else class="space-y-2" @submit.prevent="submitAccess">
            <p class="text-xs text-gray-700">
              <template v-if="user.access">
                La personne ne pourra plus se connecter et ses sessions en cours sont coupées immédiatement. Ses rôles et ses données restent intacts.
              </template>
              <template v-else>La personne pourra de nouveau se connecter avec ses identifiants.</template>
            </p>
            <template v-if="user.access">
              <label for="disable-reason" class="block text-xs font-semibold text-gray-700">Motif</label>
              <input
                id="disable-reason"
                v-model="disableReason"
                type="text"
                required
                minlength="3"
                maxlength="500"
                placeholder="Ex. : compte compromis, départ de l'école"
                class="w-full px-3 py-1.5 text-sm border border-input-stroke rounded-lg"
                autofocus
              />
            </template>
            <p v-if="accessError" class="bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs">{{ accessError }}</p>
            <div class="flex gap-1.5">
              <button
                type="submit"
                class="px-3 py-1.5 text-xs font-medium rounded-lg text-white hover:opacity-90 disabled:opacity-50"
                :class="user.access ? 'bg-red-600' : 'bg-default'"
                :disabled="isSavingAccess || (user.access && disableReason.trim().length < 3)"
              >{{ user.access ? 'Désactiver' : 'Réactiver' }}</button>
              <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50" @click="accessForm = false">Annuler</button>
            </div>
          </form>
        </section>
      </div>
    </aside>
  </div>
</template>
