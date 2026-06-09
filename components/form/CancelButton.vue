<script setup>
const defaultClass = 'px-4 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'

defineProps({
  class: {
    type: String,
    default: defaultClass
  }
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  emit('click', event)
}
</script>

<template>
  <button
      type="button"
      :class
      @click="handleClick"
  >
    <slot />
  </button>
</template>