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
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl px-8 pt-6 pb-10 w-[30rem] max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold mx-auto">Inscription incomplète</h2>
        <button
            @click="$emit('close')"
            class="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50"
            aria-label="Fermer">
          <Cross class="size-6"/>
        </button>
      </div>
      <div class="w-full h-px border rounded-xl bg-gray-200"></div>

      <div class="text-2xl text-center mt-8 mb-6">Certains élèves n'ont aucune affectation, êtes-vous sûr de vouloir continuer ?</div>
      <div class="flex justify-center gap-x-3 mt-10">
        <CancelButton @click="$emit('close')">Annuler</CancelButton>
        <SaveButton @click="handleSave">
          Valider
        </SaveButton>
      </div>
    </div>
  </div>
</template>