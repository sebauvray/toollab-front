<script setup>
import Logo from "~/components/Icons/Logo.vue"
import InputText from "~/components/form/InputText.vue"
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from '#imports'

definePageMeta({
  layout: 'default',
  middleware: 'guest',
  meta: {
    guest: true
  }
})

useHead({
  title: 'Réinitialisation du mot de passe'
})

const route = useRoute()
const router = useRouter()

const form = ref({
  password: '',
  password_confirmation: ''
})

const token = computed(() => route.query.token)
const email = computed(() => route.query.email)

const isSubmitting = ref(false)
const message = ref({ type: '', text: '' })
const passwordsMatch = computed(() => form.value.password === form.value.password_confirmation)
const isTokenValid = ref(false)

onMounted(async () => {
  if (token.value && email.value) {
    try {
      const response = await fetch(`${useRuntimeConfig().public.apiUrl}/api/check-reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          token: token.value,
          email: email.value
        })
      })

      const data = await response.json()
      isTokenValid.value = response.ok

      if (!response.ok) {
        message.value = { type: 'error', text: data.message || 'Lien de réinitialisation invalide ou expiré' }
      }
    } catch (error) {
      console.error('Erreur de vérification du token:', error)
      message.value = { type: 'error', text: 'Une erreur est survenue lors de la vérification du lien' }
    }
  } else {
    message.value = { type: 'error', text: 'Lien de réinitialisation incomplet' }
  }
})

const handleSubmit = async () => {
  if (!form.value.password || !form.value.password_confirmation) {
    message.value = { type: 'error', text: 'Veuillez remplir tous les champs' }
    return
  }

  if (!passwordsMatch.value) {
    message.value = { type: 'error', text: 'Les mots de passe ne correspondent pas' }
    return
  }

  if (form.value.password.length < 8) {
    message.value = { type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères' }
    return
  }

  if (!isTokenValid.value) {
    message.value = { type: 'error', text: 'Le lien de réinitialisation est invalide ou a expiré' }
    return
  }

  try {
    isSubmitting.value = true
    message.value = { type: '', text: '' }

    const response = await fetch(`${useRuntimeConfig().public.apiUrl}/api/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        token: token.value,
        email: email.value,
        password: form.value.password,
        password_confirmation: form.value.password_confirmation
      })
    })

    const data = await response.json()

    if (response.ok) {
      const { setFlashMessage } = useFlashMessage()
      setFlashMessage({
        type: 'success',
        message: data.message || 'Votre mot de passe a été réinitialisé avec succès'
      })

      router.push('/login')
    } else {
      message.value = { type: 'error', text: data.message || 'Une erreur est survenue' }
    }
  } catch (error) {
    console.error('Erreur:', error)
    message.value = { type: 'error', text: 'Une erreur est survenue lors de la réinitialisation' }
  } finally {
    isSubmitting.value = false
  }
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

        <h2 class="font-montserrat font-extrabold text-3xl text-default tracking-tight">Nouveau mot de passe</h2>
        <p class="text-base text-placeholder mt-2 mb-10">Choisissez un nouveau mot de passe pour votre compte.</p>

        <div
            v-if="message.text"
            :class="[
              'px-3.5 py-2.5 rounded-lg text-sm ring-1 mb-6',
              message.type === 'error' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-green-50 text-green-700 ring-green-200'
            ]"
        >
          {{ message.text }}
        </div>

        <form v-if="isTokenValid" @submit.prevent="handleSubmit" class="flex flex-col gap-y-6">
          <InputText
              placeholder="Nouveau mot de passe"
              type="password"
              v-model="form.password"
              required
          />
          <InputText
              placeholder="Confirmer le mot de passe"
              type="password"
              v-model="form.password_confirmation"
              required
          />

          <button
              type="submit"
              :disabled="isSubmitting"
              class="bg-default text-white w-full py-3 font-montserrat font-semibold text-base text-center rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            <span v-if="isSubmitting">Réinitialisation en cours…</span>
            <span v-else>Réinitialiser le mot de passe</span>
          </button>
        </form>

        <div class="mt-8 text-center">
          <NuxtLink to="/login" class="text-sm text-placeholder hover:text-default transition-colors">
            Retour à la connexion
          </NuxtLink>
        </div>
      </div>
    </div>
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
