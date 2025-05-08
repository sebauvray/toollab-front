<script setup>

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Famille'
  }
})
</script>

<template>
  <div class="grid grid-cols-3 mt-6 px-6 font-montserrat w-full gap-x-4">
    <section class="col-span-2 bg-white rounded-lg p-4">
      <h2 class="font-bold text-2xl mb-6">Mode de paiement</h2>
    </section>
    <section class="col-span-1 bg-white rounded-lg p-6">
      <h2 class="font-bold text-2xl mb-6">Paiement</h2>

      <div class="flex items-center justify-between font-nunito px-4 font-light">
        <div>Arabe</div>
        <div>x3</div>
        <div>270€</div>
      </div>
      <div class="flex items-center justify-between font-nunito px-4 font-light">
        <div>Coran</div>
        <div>x1</div>
        <div>150€</div>
      </div>

      <div class="my-3 border border-gray-200 mx-4"></div>

      <div class="grid grid-cols-4 auto-cols-fr auto-rows-fr w-full font-nunito px-4 font-light">
        <div class="font-semibold">Sous-total</div>
        <div class="inline-flex items-center justify-center">-</div>
        <div class="inline-flex items-center justify-center">-</div>
        <div class="inline-flex items-center justify-end">960€</div>
      </div>
      <div class="grid grid-cols-4 auto-cols-fr auto-rows-fr w-full font-nunito px-4 font-light">
        <div class="font-semibold">Réductions</div>
        <div class="inline-flex items-center justify-center">-</div>
        <div class="inline-flex items-center justify-center">-</div>
        <div class="inline-flex items-center justify-end">-90€</div>
      </div>

      <div class="grid grid-cols-4 auto-cols-fr auto-rows-fr w-full font-nunito px-4 font-light mt-6">
        <div class="font-semibold">Total</div>
        <div class="inline-flex items-center justify-center"></div>
        <div class="inline-flex items-center justify-center"></div>
        <div class="inline-flex items-center justify-end">870€</div>
      </div>

      <div class="my-3 border border-gray-200 mx-4"></div>

      <div class="bg-gray-50 border mx-1 p-3 rounded-lg font-nunito">
        <div class="flex items-center justify-between">
          <div class="font-semibold">Payé</div>
          <div>450€</div>
        </div>

        <div class="pl-6 flex flex-col gap-y-1 mt-3">
          <div class="grid grid-cols-3 w-full">
            <div class="font-semibold">CB</div>
            <div class="inline-flex items-center justify-center"></div>
            <div class="inline-flex items-center justify-end">100€</div>
          </div>

          <div class="grid grid-cols-3 w-full">
            <div class="font-semibold">Espece</div>
            <div class="inline-flex items-center justify-center"></div>
            <div class="inline-flex items-center justify-end">50€</div>
          </div>

          <div class="grid grid-cols-3 w-full">
            <div class="font-semibold">Cheques</div>
            <div class="inline-flex items-center justify-center"></div>
            <div class="inline-flex items-center justify-end">300€</div>
          </div>

          <div class="grid grid-cols-3 w-full">
            <div class="font-semibold">dont</div>
            <div class="inline-flex items-center justify-center">x2</div>
            <div class="inline-flex items-center justify-end">150€</div>
          </div>
        </div>
      </div>

      <div class="my-3 border border-gray-200 mx-4"></div>

      <div class="flex items-center justify-between text-xl mx-4">
        <div class="font-bold">Reste à payer</div>
        <div>420€</div>
      </div>
    </section>
  </div>
</template>