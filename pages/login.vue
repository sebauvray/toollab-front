<script setup>
import AuthGuard from '~/components/auth/AuthGuard.vue'
import Logo from "~/components/Icons/Logo.vue"
import InputText from "~/components/form/InputText.vue"
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useRouter, useRoute } from '#imports'
import authService from '~/services/auth'
import schoolService from '~/services/school'
import userService from '~/services/user'
import { clearCurrentSchoolRoles, getSchoolRoles, setActiveSchoolRole, writeCurrentSchoolRoles } from '~/utils/schoolRoles'

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
  password: ''
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

    const loginResponse = await login({
      email: form.value.email,
      password: form.value.password
    })

    if (process.client) {
      localStorage.removeItem('current_school_id')
      clearCurrentSchoolRoles()
    }

    const isSuperAdmin = !!loginResponse?.user?.is_super_admin
    const redirectPath = route.query.redirect
    const rolesResponse = await userService.getUserRoles(loginResponse.user.id)
    const schoolRoleEntries = rolesResponse?.roles?.schools || []

    let mySchools = []
    if (isSuperAdmin) {
      const schoolIds = [...new Set(schoolRoleEntries.map(role => Number(role.context.id)))]
      mySchools = schoolIds.map(id => ({ id }))
    } else {
      const schools = await schoolService.getSchools()
      mySchools = Array.isArray(schools) ? schools : []
    }

    if (isSuperAdmin && mySchools.length === 0) {
      router.push('/admin')
    } else if (mySchools.length === 1) {
      localStorage.setItem('current_school_id', String(mySchools[0].id))
      const schoolRolesList = getSchoolRoles(schoolRoleEntries, mySchools[0].id)
      writeCurrentSchoolRoles(schoolRolesList)
      // Connexion directe (1 école) : on entre sur le premier rôle par défaut.
      setActiveSchoolRole(schoolRolesList[0]?.slug || '')
      router.push(redirectPath || '/')
    } else if (mySchools.length > 1) {
      router.push({ path: '/select-school', query: redirectPath ? { redirect: redirectPath } : {} })
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

          <h2 class="font-montserrat font-extrabold text-3xl text-default tracking-tight">Connexion</h2>
          <p class="text-base text-placeholder mt-2 mb-10">Accédez à l'espace de votre établissement.</p>

          <form @submit.prevent="handleSubmit" class="flex flex-col gap-y-6">
            <div v-if="formError" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3.5 py-2.5 rounded-lg text-sm">
              {{ formError }}
            </div>

            <InputText
                placeholder="Adresse email"
                type="email"
                v-model="form.email"
                required
            />

            <div>
              <InputText
                  placeholder="Mot de passe"
                  type="password"
                  v-model="form.password"
                  required
              />
              <div class="flex justify-end mt-2">
                <NuxtLink to="/forgot-password" class="text-sm text-placeholder hover:text-default transition-colors">
                  Mot de passe oublié ?
                </NuxtLink>
              </div>
            </div>

            <button
                type="submit"
                :disabled="isSubmitting"
                class="bg-default text-white w-full py-3 font-montserrat font-semibold text-base text-center rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
              <span v-if="isSubmitting">Connexion en cours…</span>
              <span v-else>Se connecter</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </AuthGuard>
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
