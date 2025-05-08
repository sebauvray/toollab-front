<script setup>
import LogoText from "~/components/Icons/LogoText.vue"
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
  // Vérifier la validité du token côté serveur
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
  <div class="flex flex-col items-center justify-start w-full h-full min-h-screen font-nunito">
    <LogoText class="my-[5vh]"/>
    <div
        class="flex flex-col items-center justify-start bg-white rounded-3xl border w-[85%] sm:w-[70%] lg:w-[50%] 2xl:w-[35%] min-h-[50vh] shadow-xl">
      <form
          @submit.prevent="handleSubmit"
          class="w-[90%] sm:w-5/6 flex flex-col items-center justify-between mt-6 sm:mt-10 md:mt-12 mb-16 sm:mb-20 md:mb-24">
        <h2 class="text-default text-[32px] font-bold mb-4">Réinitialiser le mot de passe</h2>
        <p class="text-default/60 text-center mb-10">
          Veuillez créer un nouveau mot de passe pour votre compte.
        </p>

        <div v-if="message.text"
             :class="[
               'w-full p-4 mb-6 rounded text-white text-center',
               message.type === 'error' ? 'bg-red-500' : 'bg-green-500'
             ]">
          {{ message.text }}
        </div>

        <template v-if="isTokenValid">
          <div class="w-full mb-6">
            <InputText
                placeholder="Nouveau mot de passe"
                type="password"
                v-model="form.password"
                required
            />
          </div>

          <div class="w-full mb-10">
            <InputText
                placeholder="Confirmer le mot de passe"
                type="password"
                v-model="form.password_confirmation"
                required
            />
          </div>

          <div class="flex flex-col items-start justify-center w-full">
            <button
                type="submit"
                :disabled="isSubmitting"
                class="bg-default hover:bg-default/90 text-white w-4/5 mx-auto py-3 font-bold text-center rounded-10 text-xl disabled:opacity-70 disabled:cursor-not-allowed">
              <span v-if="isSubmitting">Réinitialisation en cours...</span>
              <span v-else>Réinitialiser le mot de passe</span>
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
        </template>
      </form>
    </div>
  </div>
</template>