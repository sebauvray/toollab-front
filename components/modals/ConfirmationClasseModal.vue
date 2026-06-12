<script setup>
import SaveButton from "~/components/form/SaveButton.vue"
import CancelButton from "~/components/form/CancelButton.vue"
import Cross from "~/components/Icons/Cross.vue";

defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

const handleSave = () => {
  emit('save')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md">
      <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between">
        <h2 class="text-base font-bold text-default font-montserrat">Inscription incomplète</h2>
        <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
            aria-label="Fermer">
          <Cross class="size-4"/>
        </button>
      </div>

      <div class="px-5 py-4 text-xs text-gray-600 leading-relaxed">
        Certains élèves n'ont encore aucune classe. Vous pourrez revenir compléter leurs inscriptions plus tard — continuer vers le paiement ?
      </div>

      <div class="px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5">
        <CancelButton @click="$emit('close')">Annuler</CancelButton>
        <SaveButton @click="handleSave">Continuer</SaveButton>
      </div>
    </div>
  </div>
</template>