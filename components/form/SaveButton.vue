<script setup>
const defaultClass = 'bg-default hover:opacity-90 text-white px-4 py-1.5 text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed'

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