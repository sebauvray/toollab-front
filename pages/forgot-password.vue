<script setup>
import Logo from "~/components/Icons/Logo.vue"
import InputText from "~/components/form/InputText.vue"
import {ref} from 'vue'
import {useRouter} from '#imports'

definePageMeta({
  layout: 'default',
  middleware: 'guest',
  meta: {
    guest: true
  }
})

usePageTitle('Réinitialisation du mot de passe')
const email = ref('')
const isSubmitting = ref(false)
const message = ref({type: '', text: ''})
const router = useRouter()

const handleSubmit = async () => {
  if (!email.value) {
    message.value = {type: 'error', text: 'Veuillez entrer votre adresse email'}
    return
  }

  try {
    isSubmitting.value = true
    message.value = {type: '', text: ''}

    const response = await fetch(`${useRuntimeConfig().public.apiUrl}/api/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({email: email.value})
    })

    const data = await response.json()

    if (response.ok) {
      const {setFlashMessage} = useFlashMessage();
      setFlashMessage({
        type: 'success',
        message: data.message || 'Un email de réinitialisation a été envoyé'
      });
      await router.push('/login');
    } else {
      message.value = {type: 'error', text: data.message || 'Une erreur est survenue'}
    }
  } catch (error) {
    console.error('Erreur:', error)
    message.value = {type: 'error', text: 'Une erreur est survenue lors de la demande'}
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
        <div class="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
          <Logo class="h-8 w-auto" />
          <span class="font-montserrat font-extrabold text-2xl text-primary tracking-tight">Toollab</span>
        </div>

        <h2 class="font-montserrat font-extrabold text-3xl text-default tracking-tight">Mot de passe oublié</h2>
        <p class="text-base text-placeholder mt-2 mb-10">
          Indiquez votre adresse email, nous vous enverrons un lien de réinitialisation.
        </p>

        <form @submit.prevent="handleSubmit" class="flex flex-col gap-y-6">
          <div
              v-if="message.text"
              :class="[
                'px-3.5 py-2.5 rounded-lg text-sm ring-1',
                message.type === 'error' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-green-50 text-green-700 ring-green-200'
              ]">
            {{ message.text }}
          </div>

          <InputText
              placeholder="Adresse email"
              type="email"
              v-model="email"
              required
          />

          <button
              type="submit"
              :disabled="isSubmitting"
              class="bg-default text-white w-full py-3 font-montserrat font-semibold text-base text-center rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
            <span v-if="isSubmitting">Envoi en cours…</span>
            <span v-else>Envoyer le lien</span>
          </button>

          <NuxtLink
              to="/login"
              class="inline-flex items-center justify-center gap-x-1.5 text-sm text-placeholder hover:text-default transition-colors"
          >
            <svg class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 18.5L4 12l6.5-6.5M4 12h16"/></svg>
            <span>Retour à la connexion</span>
          </NuxtLink>
        </form>
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
