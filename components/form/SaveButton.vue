<script setup>
const defaultClass = 'bg-default hover:opacity-80 text-white px-5 py-1 rounded-md font-sans'

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