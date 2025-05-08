<script setup>
import AuthGuard from '~/components/auth/AuthGuard.vue'
import SearchInput from "~/components/form/SearchInput.vue"

usePageTitle('Accueil')
definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Dashboard'
  }
})
</script>

<template>
  <AuthGuard>
    <div class="flex flex-col items-center justify-center w-full min-h-full">
      <div class="flex flex-col items-center gap-8 md:gap-12 w-full py-8 md:pt-20 font-montserrat">
        <h2 class="font-bold text-default text-4xl md:text-5xl">Recherche</h2>
        <SearchInput class="w-11/12 sm:w-2/3 lg:w-1/2" />
      </div>
      <div class="flex gap-x-4"></div>
    </div>
  </AuthGuard>
</template>