<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from '#imports'
import adminDashboardService from '~/services/adminDashboard'
import { useFlashMessage } from '~/composables/useFlashMessage'

// Actions rapides super-admin sur une école : ouvrir, contacter le directeur, suspendre/réactiver.
// variant « menu » (ligne de tableau, bouton ⋯) ou « bar » (fiche école, boutons visibles).
const props = defineProps({
  school: { type: Object, required: true }, // { id, name, access, has_director? }
  variant: { type: String, default: 'menu' }
})
const emit = defineEmits(['updated'])

const router = useRouter()
const { setFlashMessage } = useFlashMessage()

const menuOpen = ref(false)
const menuRef = ref(null)
const triggerRef = ref(null)
const panelRef = ref(null)
const menuStyle = ref({})

// Le menu est téléporté dans <body> en position fixe : un conteneur en
// overflow-hidden/auto (tableau) ne peut plus le rogner.
const MENU_WIDTH = 224
const toggleMenu = async () => {
  if (menuOpen.value) {
    menuOpen.value = false
    return
  }
  // Invisible le temps de mesurer sa hauteur et de le placer
  menuStyle.value = { visibility: 'hidden', top: '0px', left: '0px', width: `${MENU_WIDTH}px` }
  menuOpen.value = true
  await nextTick()
  const r = triggerRef.value.getBoundingClientRect()
  const h = panelRef.value?.offsetHeight || 160
  const openUp = r.bottom + 4 + h > window.innerHeight && r.top - 4 - h > 0
  menuStyle.value = {
    top: `${openUp ? r.top - 4 - h : r.bottom + 4}px`,
    left: `${Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))}px`,
    width: `${MENU_WIDTH}px`
  }
}
const closeMenu = () => { menuOpen.value = false }
const modal = ref('') // 'suspend' | 'reactivate' | 'contact'
const isSaving = ref(false)
const errorMsg = ref('')

const reason = ref('')
const notifyDirector = ref(true)
const subject = ref('')
const message = ref('')

const hasDirector = () => props.school.has_director !== false

const openModal = async (name) => {
  menuOpen.value = false
  errorMsg.value = ''
  reason.value = ''
  notifyDirector.value = hasDirector()
  subject.value = `Toollab — ${props.school.name}`
  message.value = ''
  modal.value = name
  await nextTick()
  document.querySelector('[data-quick-action-autofocus]')?.focus()
}

const openSchool = () => {
  menuOpen.value = false
  localStorage.setItem('current_school_id', String(props.school.id))
  router.push('/')
}

const submit = async () => {
  isSaving.value = true
  errorMsg.value = ''
  try {
    if (modal.value === 'suspend') {
      const res = await adminDashboardService.suspendSchool(props.school.id, reason.value.trim(), notifyDirector.value)
      emit('updated', res)
      setFlashMessage({ type: 'success', message: `${props.school.name} est suspendue${res.director_notified ? ', le directeur a été prévenu' : ''}.` })
    } else if (modal.value === 'reactivate') {
      const res = await adminDashboardService.reactivateSchool(props.school.id, notifyDirector.value)
      emit('updated', res)
      setFlashMessage({ type: 'success', message: `${props.school.name} est réactivée.` })
    } else {
      const res = await adminDashboardService.contactDirector(props.school.id, subject.value.trim(), message.value.trim())
      setFlashMessage({ type: 'success', message: res.message })
    }
    modal.value = ''
  } catch (e) {
    errorMsg.value = e.response?.data?.message || "L'action n'a pas pu aboutir."
  } finally {
    isSaving.value = false
  }
}

const onClickOutside = (e) => {
  if (!menuOpen.value) return
  if (menuRef.value?.contains(e.target) || panelRef.value?.contains(e.target)) return
  menuOpen.value = false
}
const onKey = (e) => {
  if (e.key !== 'Escape') return
  if (modal.value) modal.value = ''
  else menuOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKey)
  // Position figée à l'ouverture : on ferme plutôt que de laisser le menu flotter
  window.addEventListener('scroll', closeMenu, true)
  window.addEventListener('resize', closeMenu)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', closeMenu, true)
  window.removeEventListener('resize', closeMenu)
})

const canSubmit = () => {
  if (modal.value === 'suspend') return reason.value.trim().length >= 3
  if (modal.value === 'contact') return subject.value.trim().length >= 3 && message.value.trim().length >= 3
  return true
}
</script>

<template>
  <div class="font-montserrat">
    <!-- Variante ligne de tableau : menu ⋯ -->
    <div v-if="variant === 'menu'" ref="menuRef" class="relative inline-block text-left">
      <button
        ref="triggerRef"
        type="button"
        class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:text-default hover:bg-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-default"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        :aria-label="`Actions pour ${school.name}`"
        title="Actions"
        @click.stop="toggleMenu"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="19" cy="12" r="1.75" /></svg>
      </button>
      <Teleport to="body">
      <div
        v-if="menuOpen"
        ref="panelRef"
        role="menu"
        class="fixed z-50 bg-white rounded-lg border shadow-xl py-1 text-xs font-montserrat text-left"
        :style="menuStyle"
      >
        <button role="menuitem" class="w-full text-left px-3 py-2 hover:bg-gray-50" @click="openSchool">Ouvrir l'école</button>
        <button
          role="menuitem"
          class="w-full text-left px-3 py-2 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-white"
          :disabled="!hasDirector()"
          @click="openModal('contact')"
        >
          Contacter le directeur
          <span v-if="!hasDirector()" class="block text-[11px] text-gray-400">Aucun directeur en poste</span>
        </button>
        <div class="my-1 border-t border-[#E6EFF5]"></div>
        <button v-if="school.access" role="menuitem" class="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50" @click="openModal('suspend')">Suspendre l'école…</button>
        <button v-else role="menuitem" class="w-full text-left px-3 py-2 hover:bg-gray-50" @click="openModal('reactivate')">Réactiver l'école…</button>
      </div>
      </Teleport>
    </div>

    <!-- Variante fiche école : boutons -->
    <div v-else class="flex flex-wrap gap-1.5">
      <button
        type="button"
        class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        :disabled="!hasDirector()"
        :title="hasDirector() ? '' : 'Aucun directeur en poste'"
        @click="openModal('contact')"
      >Contacter le directeur</button>
      <button
        v-if="school.access"
        type="button"
        class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
        @click="openModal('suspend')"
      >Suspendre</button>
      <button
        v-else
        type="button"
        class="px-3 py-1.5 text-xs font-medium rounded-lg bg-default text-white hover:opacity-90"
        @click="openModal('reactivate')"
      >Réactiver</button>
    </div>

    <!-- Modales -->
    <div v-if="modal" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" @click.self="modal = ''">
      <form
        class="bg-white rounded-2xl shadow-xl w-full p-5"
        :class="modal === 'contact' ? 'max-w-lg' : 'max-w-md'"
        role="dialog"
        aria-modal="true"
        @submit.prevent="submit"
      >
        <template v-if="modal === 'suspend'">
          <h2 class="text-base font-bold mb-1">Suspendre {{ school.name }}</h2>
          <p class="text-xs text-gray-600 mb-4">
            Toute l'équipe de l'école perd immédiatement l'accès. Les données sont conservées et l'école peut être réactivée à tout moment.
          </p>
          <label for="qa-reason" class="block text-xs font-semibold text-gray-700 mb-1">Motif</label>
          <input
            id="qa-reason"
            v-model="reason"
            data-quick-action-autofocus
            type="text"
            required
            minlength="3"
            maxlength="500"
            placeholder="Ex. : abonnement impayé depuis 2 mois"
            class="w-full px-3 py-1.5 text-sm border border-input-stroke rounded-lg mb-3"
          />
        </template>

        <template v-else-if="modal === 'reactivate'">
          <h2 class="text-base font-bold mb-1">Réactiver {{ school.name }}</h2>
          <p class="text-xs text-gray-600 mb-4">L'équipe de l'école retrouve immédiatement son accès.</p>
        </template>

        <template v-else>
          <h2 class="text-base font-bold mb-1">Contacter le directeur</h2>
          <p class="text-xs text-gray-600 mb-4">
            Envoyé depuis Toollab au directeur de {{ school.name }}. Ses réponses arriveront directement dans votre boîte mail.
          </p>
          <label for="qa-subject" class="block text-xs font-semibold text-gray-700 mb-1">Objet</label>
          <input
            id="qa-subject"
            v-model="subject"
            type="text"
            required
            minlength="3"
            maxlength="150"
            class="w-full px-3 py-1.5 text-sm border border-input-stroke rounded-lg mb-3"
          />
          <label for="qa-message" class="block text-xs font-semibold text-gray-700 mb-1">Message</label>
          <textarea
            id="qa-message"
            v-model="message"
            data-quick-action-autofocus
            required
            minlength="3"
            maxlength="5000"
            rows="7"
            class="w-full px-3 py-1.5 text-sm border border-input-stroke rounded-lg mb-3 font-nunito"
          ></textarea>
        </template>

        <label v-if="modal !== 'contact' && hasDirector()" class="flex items-center gap-2 text-xs text-gray-700 mb-3 cursor-pointer">
          <input v-model="notifyDirector" type="checkbox" />
          Prévenir le directeur par e-mail
        </label>

        <p v-if="errorMsg" class="bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs mb-3">{{ errorMsg }}</p>

        <div class="flex justify-end gap-2">
          <button type="button" class="px-4 py-1.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50" @click="modal = ''">Annuler</button>
          <button
            type="submit"
            class="px-4 py-1.5 text-sm rounded-lg text-white hover:opacity-90 disabled:opacity-50"
            :class="modal === 'suspend' ? 'bg-red-600' : 'bg-default'"
            :disabled="isSaving || !canSubmit()"
          >
            {{ modal === 'suspend' ? 'Suspendre' : modal === 'reactivate' ? 'Réactiver' : 'Envoyer' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
