<script setup>
import { defineProps, defineEmits, watch } from 'vue'
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

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = 'auto'
  }
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true" @click="handleCancel">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div
            class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
        >
          <div class="flex justify-between items-center px-6 py-4 border-b">
            <h3 class="text-lg font-medium text-gray-900" id="modal-headline">
              {{ title }}
            </h3>
            <button
                @click="handleCancel"
                class="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <Cross class="size-5" />
            </button>
          </div>

          <div class="px-6 py-4">
            <p class="text-gray-700">{{ message }}</p>
          </div>

          <div class="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
            <button
                @click="handleCancel"
                class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:text-sm"
            >
              {{ cancelButtonText }}
            </button>
            <button
                @click="handleConfirm"
                :class="`inline-flex justify-center rounded-md shadow-sm px-4 py-2 ${confirmButtonClass} text-base font-medium sm:text-sm`"
            >
              {{ confirmButtonText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>