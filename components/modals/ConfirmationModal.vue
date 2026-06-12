<script setup>
import { defineProps, defineEmits, watch, ref, onMounted, onBeforeUnmount } from 'vue'
import Cross from "~/components/Icons/Cross.vue"

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: 'Confirmation'
  },
  message: {
    type: String,
    required: true
  },
  confirmButtonText: {
    type: String,
    default: 'Confirmer'
  },
  cancelButtonText: {
    type: String,
    default: 'Annuler'
  },
  confirmButtonClass: {
    type: String,
    default: 'bg-red-600 hover:bg-red-700 text-white'
  }
})

const emit = defineEmits(['confirm', 'cancel'])
const isBrowser = ref(false)

onMounted(() => {
  isBrowser.value = true
  updateOverflow()
})

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}

const updateOverflow = () => {
  if (isBrowser.value) {
    if (props.isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
  }
}

// Ne pas utiliser immediate: true pour éviter l'exécution lors du rendu initial
watch(() => props.isOpen, () => {
  updateOverflow()
})

// Nettoyer le style du document lors du démontage du composant
onBeforeUnmount(() => {
  if (isBrowser.value) {
    document.body.style.overflow = 'auto'
  }
})
</script>

<template>
  <!-- Utiliser v-if avec isBrowser pour s'assurer que Teleport ne s'exécute que côté client -->
  <Teleport to="body" v-if="isBrowser && isOpen">
    <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3" @click.self="handleCancel">
      <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-md font-nunito"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
      >
        <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between">
          <h3 class="text-base font-bold text-default font-montserrat" id="modal-headline">
            {{ title }}
          </h3>
          <button
              @click="handleCancel"
              class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
              aria-label="Fermer"
          >
            <Cross class="size-4" />
          </button>
        </div>

        <div class="px-5 py-4">
          <p class="text-xs text-gray-600 leading-relaxed">{{ message }}</p>
        </div>

        <div class="px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5">
          <button
              @click="handleCancel"
              class="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {{ cancelButtonText }}
          </button>
          <button
              @click="handleConfirm"
              :class="`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${confirmButtonClass}`"
          >
            {{ confirmButtonText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>