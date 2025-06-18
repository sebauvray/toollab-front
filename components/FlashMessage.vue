<script setup>
import { ref, watch } from 'vue'

const { flashMessage, clearFlashMessage } = useFlashMessage()
const isVisible = ref(false)
const showProgress = ref(false)

watch(flashMessage, (newMessage) => {
  if (newMessage) {
    isVisible.value = true
    showProgress.value = true
    setTimeout(() => {
      isVisible.value = false
      showProgress.value = false
      clearFlashMessage()
    }, 3000)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
        v-if="isVisible && flashMessage"
        class="fixed top-4 right-4 z-[9999] transition-all duration-500 ease-out transform"
        :class="isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'"
    >
      <div
          class="relative overflow-hidden rounded-xl shadow-xl backdrop-blur-sm border max-w-sm"
          :class="[
          flashMessage.type === 'success'
            ? 'bg-white/90 border-emerald-200/50 shadow-emerald-500/20'
            : 'bg-white/90 border-red-200/50 shadow-red-500/20'
        ]"
      >
        <div class="flex items-center gap-3 p-4">
          <div
              class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              :class="[
              flashMessage.type === 'success'
                ? 'bg-emerald-500 shadow-md shadow-emerald-500/30'
                : 'bg-red-500 shadow-md shadow-red-500/30'
            ]"
          >
            <svg
                v-if="flashMessage.type === 'success'"
                class="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <svg
                v-else
                class="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <div class="flex-1 min-w-0">
            <p
                class="text-sm font-medium leading-5"
                :class="[
                flashMessage.type === 'success'
                  ? 'text-emerald-900'
                  : 'text-red-900'
              ]"
            >
              {{ flashMessage.message }}
            </p>
          </div>

          <button
              @click="isVisible = false; showProgress = false; clearFlashMessage()"
              class="flex-shrink-0 p-1 rounded-full transition-colors duration-200 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2"
              :class="[
              flashMessage.type === 'success'
                ? 'text-emerald-600 hover:text-emerald-800 focus:ring-emerald-500'
                : 'text-red-600 hover:text-red-800 focus:ring-red-500'
            ]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="absolute bottom-0 left-0 h-0.5 w-full bg-black/10">
          <div
              v-if="showProgress"
              class="h-full countdown-bar"
              :class="[
                flashMessage.type === 'success'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                  : 'bg-gradient-to-r from-red-500 to-rose-600'
              ]"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.countdown-bar {
  width: 100%;
  animation: countdown 3s linear forwards;
}

@keyframes countdown {
  0% { width: 100%; }
  100% { width: 0%; }
}
</style>