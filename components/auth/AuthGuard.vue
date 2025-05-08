<!-- components/auth/AuthGuard.vue -->
<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  requiresAuth: {
    type: Boolean,
    default: true
  }
});

const isAuthenticated = ref(false);
const isAuthChecked = ref(false);

onMounted(() => {
  const token = localStorage.getItem('auth.token');
  isAuthenticated.value = !!token;
  isAuthChecked.value = true;
});
</script>

<template>
  <div>
    <div v-if="requiresAuth && !isAuthChecked" class="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div class="flex flex-col items-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-default"></div>
        <p class="mt-4 text-default font-bold">Chargement...</p>
      </div>
    </div>

    <slot v-if="!requiresAuth || (isAuthChecked && isAuthenticated)" />
  </div>
</template>