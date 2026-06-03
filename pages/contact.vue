<script setup>
import LogoText from "~/components/Icons/LogoText.vue";
import InputText from "~/components/form/InputText.vue";

usePageTitle('Contact')
definePageMeta({
  layout: 'default'
})

</script>
<template>
  <div class="flex flex-col items-center justify-start w-full h-full min-h-screen font-nunito">
    <LogoText class="my-[5vh]"/>
    <div
        class="flex flex-col items-center justify-start bg-white rounded-3xl border w-[85%] sm:w-[70%] lg:w-[50%] 2xl:w-[35%] min-h-[60vh] shadow-xl">
      <div
          class="w-[90%] sm:w-5/6 flex flex-col items-center justify-between mt-5 sm:mt-8 md:mt-10 mb-20 sm:mb-28 md:mb-24">
        <div class="flex flex-col items-center justify-center w-full mb-4">
          <h2 class="text-default text-[32px] font-bold mb-1">Intéressé par Toollab ?</h2>
          <h3 class="text-default/80 text-[18px] font-semibold mb-2">Contactez-nous</h3>
        </div>


        <div class="flex flex-col w-full gap-y-5 mb-10 ">
          <InputText placeholder="Email" type="email"/>
          <InputText placeholder="Nom de l'établissement"/>
        </div>
        <div class="flex flex-col items-start justify-center w-full">
          <button type="submit"
                  class="bg-default hover:bg-default/90 w-4/5 text-white mx-auto py-2 font-bold text-center rounded-10 text-lg">
            Envoyer
          </button>
          <div class="inline-flex items-center justify-center text-default font-semibold text-base gap-x-1 w-full mt-3">
            <span class="text-default/65">Vous avez déjà un compte ?</span>
            <NuxtLink
                to="/login"
                class="underline text-base text-default hover:text-default/90 opacity-100"
            >
              Connexion
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>