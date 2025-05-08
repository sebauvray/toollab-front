<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useRouter } from '#imports';

const props = defineProps({
  initials: {
    type: String,
    default: 'US'
  }
});

const isOpen = ref(false);
const dropdownRef = ref(null);
const router = useRouter();
const { logout } = useAuth();

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const handleLogout = async () => {
  try {
    await logout();
    router.push('/login');
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
  }
};

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <button
        @click="toggleDropdown"
        class="inline-flex items-center justify-center rounded-full text-center bg-gray-light p-2.5 uppercase text-lg text-primary hover:bg-gray-200 transition-colors"
    >
      <span class="size-7">{{ initials }}</span>
    </button>

    <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-50"
        style="margin-top: 0.5rem;"
    >
      <div class="py-1">
        <button
            @click="handleLogout"
            class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </div>
  </div>
</template>