<script setup>
import Logo from "~/components/Icons/Logo.vue"
import InputText from "~/components/form/InputText.vue"
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue"
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useAuth } from '~/composables/useAuth'
import userService from '~/services/user'
import { getSchoolRoles, setActiveSchoolRole, writeCurrentSchoolRoles } from '~/utils/schoolRoles'

definePageMeta({
  layout: 'default'
})

useHead({
  title: 'Passation de direction'
})

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()

const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')

const state = ref('loading')
const invitation = ref(null)
const message = ref({ type: '', text: '' })
const fieldErrors = ref({})
const isSubmitting = ref(false)
const showDeclineModal = ref(false)
const acceptedSchoolId = ref(null)
const isEnteringSchool = ref(false)

const form = ref({
  first_name: '',
  last_name: '',
  password: '',
  password_confirmation: ''
})

const firstError = (field) => fieldErrors.value[field]?.[0] || ''

const clearFieldError = (field) => {
  if (!fieldErrors.value[field]) return
  const { [field]: _, ...rest } = fieldErrors.value
  fieldErrors.value = rest
}

watch(() => form.value.first_name, () => clearFieldError('first_name'))
watch(() => form.value.last_name, () => clearFieldError('last_name'))
watch(() => [form.value.password, form.value.password_confirmation], () => clearFieldError('password'))

const isLoggedInAsInvitee = computed(() =>
    !!user.value?.email && !!invitation.value?.email
    && user.value.email.toLowerCase() === invitation.value.email.toLowerCase())

const isLoggedInAsOther = computed(() => !!user.value?.email && !isLoggedInAsInvitee.value)

const callApi = async (path, body) => {
  const response = await fetch(`${useRuntimeConfig().public.apiUrl}/api/director-handover/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ token: token.value, ...body })
  })

  let data = {}
  try {
    data = await response.json()
  } catch {
    data = {}
  }

  return { ok: response.ok, status: response.status, data }
}

const errorText = (result, fallback) => {
  if (result.status === 429) return 'Trop de tentatives. Veuillez réessayer dans une minute.'
  if (result.status >= 500) return fallback
  return result.data?.message || fallback
}

onMounted(async () => {
  if (!token.value) {
    state.value = 'invalid'
    message.value = { type: 'error', text: 'Lien de passation incomplet.' }
    return
  }

  try {
    const result = await callApi('check', {})
    if (!result.ok) {
      state.value = 'invalid'
      message.value = { type: 'error', text: errorText(result, 'Le lien de passation est invalide ou a expiré.') }
      return
    }
    invitation.value = result.data.data
    state.value = 'ready'
  } catch (error) {
    console.error('Erreur de vérification de la passation:', error)
    state.value = 'invalid'
    message.value = { type: 'error', text: 'Une erreur est survenue lors de la vérification du lien.' }
  }
})

const validateLocally = () => {
  const errors = {}
  if (invitation.value.requires_password) {
    if (invitation.value.requires_profile) {
      if (!form.value.first_name.trim()) errors.first_name = ['Le prénom est requis.']
      if (!form.value.last_name.trim()) errors.last_name = ['Le nom est requis.']
    }
    if (form.value.password.length < 8) errors.password = ['Le mot de passe doit contenir au moins 8 caractères.']
    else if (form.value.password !== form.value.password_confirmation) errors.password = ['Les mots de passe ne correspondent pas.']
  }
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleAccept = async () => {
  message.value = { type: '', text: '' }
  if (!validateLocally()) return

  try {
    isSubmitting.value = true
    const body = invitation.value.requires_password ? { ...form.value } : {}
    const result = await callApi('accept', body)

    if (!result.ok) {
      fieldErrors.value = result.status === 422 ? (result.data?.errors || {}) : {}
      if (!Object.keys(fieldErrors.value).length) {
        message.value = { type: 'error', text: errorText(result, 'Une erreur est survenue lors de l\'acceptation.') }
      }
      if (result.status === 404 || result.status === 409) {
        state.value = 'invalid'
      }
      return
    }

    acceptedSchoolId.value = result.data?.data?.school_id
    state.value = 'accepted'

    if (isLoggedInAsInvitee.value && !invitation.value.requires_password) {
      isEnteringSchool.value = true
      await enterSchoolAsDirector()
    }
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de la passation:', error)
    message.value = { type: 'error', text: 'Une erreur est survenue lors de l\'acceptation.' }
  } finally {
    isSubmitting.value = false
  }
}

const enterSchoolAsDirector = async () => {
  try {
    const rolesResponse = await userService.getUserRoles(user.value.id)
    const roles = getSchoolRoles(rolesResponse?.roles?.schools || [], acceptedSchoolId.value)
    localStorage.setItem('current_school_id', String(acceptedSchoolId.value))
    localStorage.removeItem('current_school_year_id')
    writeCurrentSchoolRoles(roles)
    setActiveSchoolRole('director')
    window.location.href = '/'
  } catch (error) {
    console.error('Erreur lors de l\'entrée dans l\'établissement:', error)
    isEnteringSchool.value = false
  }
}

const handleDecline = async () => {
  showDeclineModal.value = false
  message.value = { type: '', text: '' }

  try {
    isSubmitting.value = true
    const result = await callApi('decline', {})
    if (!result.ok) {
      message.value = { type: 'error', text: errorText(result, 'Une erreur est survenue lors du refus.') }
      if (result.status === 404) state.value = 'invalid'
      return
    }
    state.value = 'declined'
  } catch (error) {
    console.error('Erreur lors du refus de la passation:', error)
    message.value = { type: 'error', text: 'Une erreur est survenue lors du refus.' }
  } finally {
    isSubmitting.value = false
  }
}

const goToLogin = async () => {
  if (user.value) {
    await logout()
  }
  router.push('/login')
}
</script>

<template>
  <div class="flex w-full min-h-screen font-nunito">

    <div class="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden bg-gray-blue border-r border-[#E6EFF5]">
      <div class="absolute inset-0 panel-mesh" aria-hidden="true"></div>
      <div class="absolute inset-0 panel-grid" aria-hidden="true"></div>

      <div class="relative z-10 flex items-center gap-4">
        <Logo class="h-14 w-auto logo-pop" />
        <h1 class="font-montserrat font-extrabold text-6xl text-primary tracking-tight leading-none" aria-label="Toollab">
          <span
              v-for="(letter, i) in 'Toollab'"
              :key="i"
              class="inline-block letter-in"
              :style="{ animationDelay: (350 + i * 110) + 'ms' }"
          >{{ letter }}</span>
        </h1>
      </div>
      <p class="relative z-10 baseline-in font-nunito text-placeholder mt-6 text-base">
        La gestion de votre institut, enfin simple.
      </p>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center relative bg-gray-blue lg:bg-white px-5 py-12">
      <div class="absolute inset-0 panel-mesh lg:hidden" aria-hidden="true"></div>
      <div class="absolute inset-0 panel-grid lg:hidden" aria-hidden="true"></div>
      <div class="relative w-full max-w-md login-form bg-white rounded-2xl border border-[#E6EFF5] shadow-sm p-6 sm:p-8 lg:bg-transparent lg:border-0 lg:shadow-none lg:rounded-none lg:p-0">
        <div class="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
          <Logo class="h-9 w-auto logo-pop" />
          <span class="font-montserrat font-extrabold text-3xl text-primary tracking-tight" aria-label="Toollab">
            <span
                v-for="(letter, i) in 'Toollab'"
                :key="i"
                class="inline-block letter-in"
                :style="{ animationDelay: (250 + i * 80) + 'ms' }"
            >{{ letter }}</span>
          </span>
        </div>

        <h2 class="font-montserrat font-extrabold text-3xl text-default tracking-tight">Passation de direction</h2>

        <div v-if="state === 'loading'" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <template v-else-if="state === 'ready'">
          <p class="text-base text-placeholder mt-2 mb-8">
            <strong class="text-default font-semibold">{{ invitation.from_name }}</strong>
            vous propose de reprendre la direction de
            <strong class="text-default font-semibold">{{ invitation.school_name }}</strong>.
          </p>

          <div
              v-if="message.text"
              class="px-3.5 py-2.5 rounded-lg text-sm ring-1 mb-6 bg-red-50 text-red-700 ring-red-200"
          >
            {{ message.text }}
          </div>

          <div class="rounded-lg bg-gray-blue ring-1 ring-[#E6EFF5] px-3.5 py-2.5 text-sm text-placeholder mb-6">
            Invitation adressée à <span class="text-default font-medium">{{ invitation.email }}</span>.
            En acceptant, ce compte devient directeur de l'établissement avec l'ensemble des droits de gestion.
          </div>

          <div
              v-if="isLoggedInAsOther"
              class="px-3.5 py-2.5 rounded-lg text-sm ring-1 mb-6 bg-amber-50 text-amber-800 ring-amber-200"
          >
            Vous êtes connecté avec un autre compte ({{ user.email }}). L'acceptation concerne uniquement {{ invitation.email }}.
          </div>

          <form novalidate @submit.prevent="handleAccept" class="flex flex-col gap-y-6">
            <template v-if="invitation.requires_password">
              <p class="text-sm text-placeholder -mb-2">
                {{ invitation.has_account ? 'Finalisez votre compte Toollab pour accepter.' : 'Créez votre compte Toollab pour accepter.' }}
              </p>
              <template v-if="invitation.requires_profile">
                <div>
                  <InputText placeholder="Prénom" v-model="form.first_name" :error="firstError('first_name')" required />
                </div>
                <div>
                  <InputText placeholder="Nom" v-model="form.last_name" :error="firstError('last_name')" required />
                </div>
              </template>
              <div>
                <InputText placeholder="Mot de passe" type="password" v-model="form.password" :error="firstError('password')" required />
              </div>
              <InputText placeholder="Confirmer le mot de passe" type="password" v-model="form.password_confirmation" required />
            </template>

            <button
                type="submit"
                :disabled="isSubmitting"
                class="bg-default text-white w-full py-3 font-montserrat font-semibold text-base text-center rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
              <span v-if="isSubmitting">Validation en cours…</span>
              <span v-else>Accepter et devenir directeur</span>
            </button>
          </form>

          <div class="mt-4 text-center">
            <button
                type="button"
                :disabled="isSubmitting"
                @click="showDeclineModal = true"
                class="text-sm text-placeholder hover:text-red-600 transition-colors disabled:opacity-60"
            >
              Refuser l'invitation
            </button>
          </div>
        </template>

        <template v-else-if="state === 'accepted'">
          <div class="px-3.5 py-2.5 rounded-lg text-sm ring-1 mt-6 mb-8 bg-green-50 text-green-700 ring-green-200">
            Vous êtes désormais directeur de <strong>{{ invitation.school_name }}</strong>.
          </div>
          <p class="text-base text-placeholder mb-8">
            <template v-if="isEnteringSchool">Redirection vers votre établissement…</template>
            <template v-else>Connectez-vous avec <span class="text-default font-medium">{{ invitation.email }}</span> pour accéder à l'établissement.</template>
          </p>
          <button
              v-if="!isEnteringSchool"
              type="button"
              @click="goToLogin"
              class="bg-default text-white w-full py-3 font-montserrat font-semibold text-base text-center rounded-lg hover:opacity-90 transition-opacity">
            {{ user ? 'Se déconnecter et se connecter' : 'Se connecter' }}
          </button>
        </template>

        <template v-else-if="state === 'declined'">
          <div class="px-3.5 py-2.5 rounded-lg text-sm ring-1 mt-6 mb-8 bg-green-50 text-green-700 ring-green-200">
            L'invitation a été refusée. {{ invitation.from_name }} en a été informé(e).
          </div>
        </template>

        <template v-else>
          <div class="px-3.5 py-2.5 rounded-lg text-sm ring-1 mt-6 mb-8 bg-red-50 text-red-700 ring-red-200">
            {{ message.text || 'Le lien de passation est invalide ou a expiré.' }}
          </div>
          <p class="text-sm text-placeholder">
            Si vous pensez qu'il s'agit d'une erreur, demandez au directeur de l'établissement de vous renvoyer l'invitation.
          </p>
        </template>

        <div v-if="state !== 'accepted'" class="mt-8 text-center">
          <NuxtLink to="/login" class="text-sm text-placeholder hover:text-default transition-colors">
            Retour à la connexion
          </NuxtLink>
        </div>
      </div>
    </div>

    <ConfirmationModal
        :is-open="showDeclineModal"
        title="Refuser l'invitation"
        message="Refuser de reprendre la direction de cet établissement ? Le lien ne pourra plus être utilisé."
        confirm-button-text="Refuser"
        cancel-button-text="Retour"
        @confirm="handleDecline"
        @cancel="showDeclineModal = false"
    />
  </div>
</template>

<style scoped>
.panel-mesh {
  background:
    radial-gradient(34rem 24rem at 18% 8%, rgba(52, 60, 106, 0.08), transparent 60%),
    radial-gradient(30rem 20rem at 88% 92%, rgba(254, 170, 9, 0.10), transparent 55%);
}

.panel-grid {
  background-image:
    linear-gradient(rgba(52, 60, 106, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(52, 60, 106, 0.05) 1px, transparent 1px);
  background-size: 2.5rem 2.5rem;
  mask-image: radial-gradient(42rem 30rem at 50% 50%, black 30%, transparent 78%);
  -webkit-mask-image: radial-gradient(42rem 30rem at 50% 50%, black 30%, transparent 78%);
}

.login-form :deep(input) {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    font-size: 1rem;
}

.letter-in {
  opacity: 0;
  animation: letter-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes letter-in {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-pop {
  opacity: 0;
  animation: logo-pop 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
}

@keyframes logo-pop {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.baseline-in {
  opacity: 0;
  animation: baseline-in 0.7s ease 1.35s forwards;
}

@keyframes baseline-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .letter-in,
  .logo-pop,
  .baseline-in {
    opacity: 1;
    animation: none;
    transform: none;
  }
}
</style>
