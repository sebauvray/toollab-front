<script setup>
import AuthGuard from '~/components/auth/AuthGuard.vue'
import LogoText from "~/components/Icons/LogoText.vue"
import InputText from "~/components/form/InputText.vue"
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useRouter, useRoute } from '#imports'
import authService from '~/services/auth'
import schoolService from '~/services/school'

useHead({
  title: 'Connexion'
})

definePageMeta({
  layout: 'default',
  middleware: 'guest',
  meta: {
    guest: true
  }
})

const form = ref({
  email: '',
  password: '',
  remember: false
})

const formError = ref('')
const isSubmitting = ref(false)

const { login, error: authError, isLoading } = useAuth()

const router = useRouter()
const route = useRoute()

const handleSubmit = async () => {
  formError.value = ''
  isSubmitting.value = true

  try {
    if (!form.value.email || !form.value.password) {
      formError.value = 'Veuillez remplir tous les champs'
      isSubmitting.value = false
      return
    }

    const loginResponse = await authService.login({
      email: form.value.email,
      password: form.value.password,
      remember: form.value.remember
    })

    if (process.client) {
      localStorage.removeItem('current_school_id')
    }

    const schools = await schoolService.getSchools()
    const isSuperAdmin = !!loginResponse?.user?.is_super_admin
    const redirectPath = route.query.redirect

    if (Array.isArray(schools) && schools.length === 1) {
      localStorage.setItem('current_school_id', String(schools[0].id))
      router.push(redirectPath || '/')
    } else if (Array.isArray(schools) && schools.length > 1) {
      router.push({ path: '/select-school', query: redirectPath ? { redirect: redirectPath } : {} })
    } else if (isSuperAdmin) {
      router.push('/admin')
    } else {
      formError.value = 'Votre compte n\'est associé à aucune école. Contactez votre administrateur.'
      await authService.logout()
    }
  } catch (error) {
    console.error('Erreur de connexion:', error)
    if (error.response?.status === 500) {
      formError.value = 'Une erreur est survenue. Veuillez réessayer plus tard.'
    } else if (error.response?.status === 401 || error.response?.status === 422) {
      formError.value = error.response?.data?.message || 'Identifiants incorrects'
    } else if (error.response?.status === 429) {
      formError.value = 'Trop de tentatives de connexion. Veuillez réessayer plus tard.'
    } else {
      formError.value = 'Problème de connexion. Veuillez vérifier votre connexion internet et réessayer.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthGuard :requires-auth="false">
    <div class="flex flex-col items-center justify-start w-full h-full min-h-screen font-nunito">
      <LogoText class="my-[5vh]"/>
      <div
          class="flex flex-col items-center justify-start bg-white rounded-3xl border w-[85%] sm:w-[70%] lg:w-[50%] 2xl:w-[35%] min-h-[60vh] shadow-xl">
        <form
            @submit.prevent="handleSubmit"
            class="w-[90%] sm:w-5/6 flex flex-col items-center justify-between mt-5 sm:mt-8 md:mt-10 mb-12 sm:mb-16 md:mb-20">
          <h2 class="text-default text-[32px] font-bold mb-12">Identification</h2>

          <div v-if="formError" class="w-full p-3 mb-5 text-white bg-red-500 rounded">
            {{ formError }}
          </div>

          <div class="w-full mb-8">
            <InputText
                placeholder="Adresse email"
                type="email"
                v-model="form.email"
                required
            />
          </div>

          <div class="flex flex-col w-full">
            <div class="w-full mb-3">
              <InputText
                  placeholder="Mot de passe"
                  type="password"
                  v-model="form.password"
                  required
              />
            </div>

            <div class="flex items-start justify-between px-1">
              <label for="remember_me" class="text-default w-full mb-8">
                <input
                    type="checkbox"
                    class="rounded border-gray-300 accent-default text-default shadow-sm"
                    id="remember_me"
                    v-model="form.remember"
                    name="remember"
                >
                <span class="ml-1.5 opacity-60">Se souvenir de moi</span>
              </label>

              <div class="text-default/60 text-nowrap inline-flex items-start justify-start">
                <NuxtLink to="/forgot-password" class="hover:underline">Mot de passe oublié ?</NuxtLink>
              </div>
            </div>
          </div>
          <div class="flex flex-col items-start justify-center w-full">
            <button
                type="submit"
                :disabled="isSubmitting"
                class="bg-default hover:bg-default/90 text-white w-4/5 mx-auto py-2 font-bold text-center rounded-10 text-lg disabled:opacity-70 disabled:cursor-not-allowed">
              <span v-if="isSubmitting">Connexion en cours...</span>
              <span v-else>Connexion</span>
            </button>
            <div class="inline-flex items-center justify-center text-default font-semibold text-base gap-x-1 w-full mt-3">
              <span class="text-default/65">Intéressé par Toollab ?</span>
              <NuxtLink
                  to="/contact"
                  class="underline text-base text-default hover:text-default/80 opacity-100"
              >
                Contactez-nous
              </NuxtLink>
            </div>
          </div>
        </form>
      </div>
    </div>
  </AuthGuard>
</template>