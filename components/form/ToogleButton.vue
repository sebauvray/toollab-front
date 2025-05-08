<script setup>
const modelValue = defineModel()
</script>

<template>
  <button
      type="button"
      class="relative inline-flex h-6 w-11 items-center rounded-full"
      :class="modelValue ? 'bg-default' : 'bg-gray-200'"
      @click="modelValue = !modelValue"
  >
    <span
        class="inline-block h-4 w-4 transform rounded-full bg-white transition duration-200"
        :class="modelValue ? 'translate-x-6' : 'translate-x-1'"
    />
  </button>
</template>