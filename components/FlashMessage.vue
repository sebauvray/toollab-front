<script setup>
import { ref, watch } from 'vue'

const { flashMessage, clearFlashMessage } = useFlashMessage()
const isVisible = ref(false)

watch(flashMessage, (newMessage) => {
  if (newMessage) {
    isVisible.value = true
    setTimeout(() => {
      isVisible.value = false
      clearFlashMessage()
    }, 3000)
  }
})
</script>

<template>
  <div
      v-if="isVisible && flashMessage"
      class="fixed top-4 right-4 z-50 transition-all duration-300"
      :class="[
      flashMessage.type === 'success' 
        ? 'bg-green-500' 
        : 'bg-red-500',
      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
    ]"
  >
    <div class="text-white px-6 py-4 rounded-lg shadow-lg">
      {{ flashMessage.message }}
    </div>
  </div>
</template>