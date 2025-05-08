<script setup>
import LogoText from "~/components/Icons/LogoText.vue"
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
  <div class="flex flex-col items-center justify-start w-full h-full min-h-screen font-nunito">
    <LogoText class="my-[5vh]"/>
    <div
        class="flex flex-col items-center justify-start bg-white rounded-3xl border w-[85%] sm:w-[70%] lg:w-[50%] 2xl:w-[35%] min-h-[50vh] shadow-xl">
      <form
          @submit.prevent="handleSubmit"
          class="w-[90%] sm:w-5/6 flex flex-col items-center justify-between mt-6 sm:mt-10 md:mt-12 mb-16 sm:mb-20 md:mb-24">
        <h2 class="text-default text-[32px] font-bold mb-4">Mot de passe oublié</h2>
        <p class="text-default/60 text-center mb-10">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        <div v-if="message.text"
             :class="[
               'w-full p-4 mb-6 rounded text-white text-center',
               message.type === 'error' ? 'bg-red-500' : 'bg-green-500'
             ]">
          {{ message.text }}
        </div>

        <div class="w-full mb-10">
          <InputText
              placeholder="Adresse email"
              type="email"
              v-model="email"
              required
          />
        </div>

        <div class="flex flex-col items-start justify-center w-full">
          <button
              type="submit"
              :disabled="isSubmitting"
              class="bg-default hover:bg-default/90 text-white w-4/5 mx-auto py-3 font-bold text-center rounded-10 text-xl disabled:opacity-70 disabled:cursor-not-allowed">
            <span v-if="isSubmitting">Envoi en cours...</span>
            <span v-else>Envoyer le lien</span>
          </button>
          <div class="inline-flex items-center justify-center w-full mt-4">
            <NuxtLink
                to="/login"
                class="text-default hover:text-default/80"
            >
              Retour à la connexion
            </NuxtLink>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>