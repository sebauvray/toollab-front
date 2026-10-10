<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { getImpersonation, restoreAdminSession } from '~/utils/impersonation'
import adminDashboardService from '~/services/adminDashboard'
import IconViewAs from '~/components/admin/IconViewAs.vue'

const info = ref(null)
const now = ref(Date.now())
const isStopping = ref(false)
let timer

onMounted(() => {
  info.value = getImpersonation()
  timer = setInterval(() => { now.value = Date.now() }, 30000)
})
onBeforeUnmount(() => clearInterval(timer))

const minutesLeft = computed(() => {
  if (!info.value?.expires_at) return null
  return Math.max(0, Math.round((new Date(info.value.expires_at).getTime() - now.value) / 60000))
})

const stop = async () => {
  isStopping.value = true
  try {
    await adminDashboardService.stopImpersonation()
  } catch (e) {
    console.error(e)
  } finally {
    restoreAdminSession()
  }
}
</script>

<template>
  <div v-if="info" class="fixed bottom-4 inset-x-4 z-[60] flex justify-center pointer-events-none">
    <div class="pointer-events-auto max-w-full rounded-2xl bg-amber-50 ring-1 ring-amber-300 text-amber-900 text-xs font-montserrat flex items-center gap-3 pl-3 pr-1.5 py-1.5 shadow-xl">
      <span class="truncate">
        <IconViewAs class="inline w-4 h-4 -mt-0.5 mr-1" />Connecté en tant que <strong>{{ info.target?.name }}</strong>
        <span class="hidden sm:inline">({{ info.target?.email }})</span>
        · lecture seule
        <span v-if="minutesLeft !== null" class="hidden md:inline">· expire dans {{ minutesLeft }} min</span>
      </span>
      <button
        class="px-3 py-1.5 rounded-lg bg-default text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
        :disabled="isStopping"
        @click="stop"
      >
        Revenir à mon compte
      </button>
    </div>
  </div>
</template>
